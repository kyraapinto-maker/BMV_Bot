import { useState } from "react";
import { Search, Plus, Building, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { api, buildUrl } from "@shared/routes";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Property } from "@shared/schema";

export default function Sourcing() {
  const [postcode, setPostcode] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<Partial<Property>[]>([]);
  const { toast } = useToast();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postcode) return;

    setIsSearching(true);
    try {
      console.log(
        "https://czf7lucz4pn37ehngkrlcmarye0dxccr.lambda-url.us-east-1.on.aws/?" +
          `?postcode=${encodeURIComponent(postcode)}`,
      );
      const res = await fetch(
        "https://czf7lucz4pn37ehngkrlcmarye0dxccr.lambda-url.us-east-1.on.aws/" +
          `?postcode=${encodeURIComponent(postcode)}`,
      );
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      console.log(data);
      setResults(data);
    } catch (error) {
      toast({
        title: "Search failed",
        description: "Could not source properties for this postcode.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleAdd = async (property: Partial<Property>) => {
    try {
      await apiRequest("POST", api.properties.create.path, property);
      queryClient.invalidateQueries({ queryKey: [api.properties.list.path] });
      toast({
        title: "Property added",
        description: "Listing has been added to your dashboard.",
      });
    } catch (error) {
      toast({
        title: "Failed to add",
        description: "Could not add this property to your dashboard.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold font-display text-foreground">
          Sourcing
        </h1>
        <p className="text-muted-foreground text-lg">
          Search by postcode to find new opportunities to add to your dashboard.
        </p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-4 max-w-md">
        <Input
          placeholder="Enter postcode (e.g. E1 6AN)"
          value={postcode}
          onChange={(e) => setPostcode(e.target.value)}
          className="h-11"
        />
        <Button type="submit" size="lg" disabled={isSearching} className="h-11">
          {isSearching ? (
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
          ) : (
            <Search className="w-5 h-5 mr-2" />
          )}
          Source
        </Button>
      </form>

      {results.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {results.map((prop, idx) => (
            <Card
              key={idx}
              className="overflow-hidden border-border/50 hover-elevate transition-all duration-300"
            >
              <CardHeader className="bg-muted/30 pb-3">
                <div className="flex justify-between items-start gap-2">
                  <Badge
                    variant="secondary"
                    className="bg-primary/10 text-primary border-none font-semibold"
                  >
                    Potential
                  </Badge>
                  <span className="text-xl font-bold text-foreground">
                    £{prop.price?.toLocaleString()}
                  </span>
                </div>
                <CardTitle className="text-lg font-bold leading-tight mt-2">
                  {prop.address}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Building className="w-4 h-4" />
                  <span>{prop.daysOnMarket} days on market</span>
                </div>
                <Button
                  onClick={() => handleAdd(prop)}
                  className="w-full h-11 rounded-xl"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Add to Dashboard
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
