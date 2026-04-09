import {
  Clock,
  MapPin,
  ExternalLink,
  Sparkles,
  Phone,
  PhoneCall,
  Trash2,
  Loader2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { type Property } from "@shared/schema";
import { useCreateCall } from "@/hooks/use-calls";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { api, buildUrl } from "@shared/routes";

interface PropertyCardProps {
  property: Property;
  hasBeenCalled?: boolean;
}

export function PropertyCard({ property, hasBeenCalled = false }: PropertyCardProps) {
  const { toast } = useToast();
  const { mutate: initiateCall, isPending: isCalling } = useCreateCall();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest(
        "DELETE",
        buildUrl(api.properties.delete.path, { id: property.id }),
      );
    },
    onSuccess: () => {
      toast({
        title: "Property removed",
        description: "The listing has been taken off your dashboard.",
      });
      queryClient.invalidateQueries({ queryKey: [api.properties.list.path] });
    },
  });

  const formattedPrice = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(property.price);

  return (
    <Card className="flex flex-col h-full overflow-hidden hover-elevate transition-all duration-300 border-border/50 shadow-sm shadow-black/5 hover:shadow-md hover:border-primary/20 group bg-card">
      <CardHeader className="p-5 pb-4 space-y-3">
        <div className="flex justify-between items-start gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium">
              <MapPin className="w-4 h-4 text-primary/70" />
              {property.postcode}
            </div>
            <h3 className="font-bold text-lg font-display leading-tight text-foreground line-clamp-2 group-hover:text-primary transition-colors">
              {property.address}
            </h3>
            {property.num_beds !== null && property.num_beds !== undefined && (
              <p className="text-sm text-muted-foreground font-medium">
                {property.num_beds} Bedrooms
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1.5 items-end shrink-0">
            {hasBeenCalled && (
              <Badge
                variant="secondary"
                className="bg-green-500/10 text-green-700 hover:bg-green-500/20 border-green-500/20 font-semibold shadow-none"
                data-testid={`badge-called-${property.id}`}
              >
                <PhoneCall className="w-3 h-3 mr-1" />
                Called
              </Badge>
            )}
            {property.needsWork && (
              <Badge
                variant="secondary"
                className="bg-orange-500/10 text-orange-700 hover:bg-orange-500/20 border-orange-500/20 font-semibold shadow-none"
              >
                <Sparkles className="w-3 h-3 mr-1" />
                Needs Work
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5 pt-0 flex-1 space-y-4">
        <div className="flex items-end justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground font-medium">
              Asking Price
            </p>
            <p className="text-2xl font-bold font-display text-foreground tracking-tight">
              {formattedPrice}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 p-3 rounded-xl bg-secondary/50 border border-border/40">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">
            {property.daysOnMarket} days on market
          </span>
        </div>
      </CardContent>

      <CardFooter className="p-5 pt-4 border-t border-border/40 bg-muted/20 gap-3">
        <div className="flex gap-2 w-full">
          <Button
            variant="outline"
            size="icon"
            className="shrink-0 rounded-xl"
            asChild
          >
            <a
              href={property.link}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View listing"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="shrink-0 rounded-xl hover:bg-destructive/5 hover:text-destructive transition-colors"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
            aria-label="Remove property"
          >
            {deleteMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </Button>

          <Button
            className="flex-1 rounded-xl shadow-md shadow-primary/20 transition-all active:scale-[0.98]"
            onClick={() => initiateCall(property.uniqueIndex!)}
            disabled={isCalling}
          >
            {isCalling ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                <span>Connecting...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 font-semibold">
                <Phone className="w-4 h-4" />
                <span>Call Agency</span>
              </div>
            )}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
