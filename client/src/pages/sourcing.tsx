import { useState, useEffect } from "react";
import { Search, Plus, Building, Loader2, LayoutDashboard, CheckCircle2, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { api } from "@shared/routes";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Property } from "@shared/schema";

const SESSION_KEY_POSTCODE = "sourcing_postcode";
const SESSION_KEY_RESULTS = "sourcing_results";
const SESSION_KEY_ADDED = "sourcing_added";

function readSession<T>(key: string, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export default function Sourcing() {
  const [postcode, setPostcode] = useState<string>(() => readSession(SESSION_KEY_POSTCODE, ""));
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<Partial<Property>[]>(() => readSession(SESSION_KEY_RESULTS, []));
  const [addedIndices, setAddedIndices] = useState<Set<number>>(
    () => new Set<number>(readSession<number[]>(SESSION_KEY_ADDED, []))
  );
  const [isAddingAll, setIsAddingAll] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    sessionStorage.setItem(SESSION_KEY_POSTCODE, JSON.stringify(postcode));
  }, [postcode]);

  useEffect(() => {
    sessionStorage.setItem(SESSION_KEY_RESULTS, JSON.stringify(results));
  }, [results]);

  useEffect(() => {
    sessionStorage.setItem(SESSION_KEY_ADDED, JSON.stringify([...addedIndices]));
  }, [addedIndices]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postcode) return;
    setIsSearching(true);
    setAddedIndices(new Set());
    try {
      const res = await fetch(
        "https://tiui4gsyaup4x2zong3evcnzvm0hposx.lambda-url.us-east-1.on.aws/" +
          `?postcode=${encodeURIComponent(postcode)}`,
      );
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setResults(data);
    } catch {
      toast({
        title: "Search failed",
        description: "Could not source properties for this postcode.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const addProperty = async (property: Partial<Property>): Promise<boolean> => {
    try {
      await apiRequest("POST", api.properties.create.path, property);
      return true;
    } catch {
      return false;
    }
  };

  const handleAdd = async (property: Partial<Property>, idx: number) => {
    const ok = await addProperty(property);
    if (ok) {
      setAddedIndices((prev) => new Set(prev).add(idx));
      queryClient.invalidateQueries({ queryKey: [api.properties.list.path] });
      toast({ title: "Property added", description: "Listing has been added to your dashboard." });
    } else {
      toast({ title: "Failed to add", description: "Could not add this property.", variant: "destructive" });
    }
  };

  const handleAddAll = async () => {
    setIsAddingAll(true);
    const unadded = results
      .map((prop, idx) => ({ prop, idx }))
      .filter(({ idx }) => !addedIndices.has(idx));

    const results2 = await Promise.all(unadded.map(({ prop }) => addProperty(prop)));

    const newAdded = new Set(addedIndices);
    let successCount = 0;
    unadded.forEach(({ idx }, i) => {
      if (results2[i]) {
        newAdded.add(idx);
        successCount++;
      }
    });

    setAddedIndices(newAdded);
    queryClient.invalidateQueries({ queryKey: [api.properties.list.path] });
    setIsAddingAll(false);

    if (successCount > 0) {
      toast({
        title: "Properties added",
        description: `${successCount} listing${successCount !== 1 ? "s" : ""} added to your dashboard.`,
      });
    } else {
      toast({ title: "Nothing to add", description: "All properties are already on your dashboard." });
    }
  };

  const allAdded = results.length > 0 && addedIndices.size === results.length;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold font-display text-foreground">Sourcing</h1>
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
          data-testid="input-postcode"
        />
        <Button type="submit" size="lg" disabled={isSearching} className="h-11" data-testid="button-source">
          {isSearching ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Search className="w-5 h-5 mr-2" />}
          Source
        </Button>
      </form>

      {results.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground font-medium">
              {results.length} propert{results.length !== 1 ? "ies" : "y"} found
              {addedIndices.size > 0 && ` · ${addedIndices.size} added`}
            </p>
            <Button
              onClick={handleAddAll}
              disabled={isAddingAll || allAdded}
              size="lg"
              className="gap-2"
              data-testid="button-add-all"
            >
              {isAddingAll ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : allAdded ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <LayoutDashboard className="w-4 h-4" />
              )}
              {isAddingAll ? "Adding…" : allAdded ? "All Added" : "Add All to Dashboard"}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {results.map((prop, idx) => {
              const added = addedIndices.has(idx);
              return (
                <Card
                  key={idx}
                  className={`overflow-hidden border-border/50 hover-elevate transition-all duration-300 ${added ? "opacity-60" : ""}`}
                  data-testid={`card-sourced-${idx}`}
                >
                  <CardHeader className="bg-muted/30 pb-3">
                    <div className="flex justify-between items-start gap-2">
                      {added ? (
                        <Badge variant="secondary" className="bg-green-500/10 text-green-700 border-green-500/20 font-semibold">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Added
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-primary/10 text-primary border-none font-semibold">
                          Potential
                        </Badge>
                      )}
                      <span className="text-xl font-bold text-foreground">
                        £{typeof prop.price === "number" ? prop.price.toLocaleString() : prop.price}
                      </span>
                    </div>
                    <CardTitle className="text-lg font-bold leading-tight mt-2">{prop.address}</CardTitle>
                    {prop.num_beds != null && (
                      <p className="text-sm text-muted-foreground font-medium mt-0.5">{prop.num_beds} bedrooms</p>
                    )}
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Building className="w-4 h-4" />
                      <span>{prop.daysOnMarket} days on market</span>
                    </div>
                    <div className="flex gap-2">
                      {prop.link && (
                        <Button
                          variant="outline"
                          size="icon"
                          className="shrink-0 rounded-xl"
                          asChild
                          data-testid={`button-link-${idx}`}
                        >
                          <a href={prop.link} target="_blank" rel="noopener noreferrer" aria-label="View listing">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </Button>
                      )}
                      <Button
                        onClick={() => handleAdd(prop, idx)}
                        disabled={added}
                        variant={added ? "secondary" : "default"}
                        className="flex-1 h-11 rounded-xl"
                        data-testid={`button-add-${idx}`}
                      >
                        {added ? (
                          <>
                            <CheckCircle2 className="w-5 h-5 mr-2" />
                            Added
                          </>
                        ) : (
                          <>
                            <Plus className="w-5 h-5 mr-2" />
                            Add to Dashboard
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
