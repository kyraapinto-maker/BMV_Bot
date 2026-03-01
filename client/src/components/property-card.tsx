import { Clock, MapPin, ExternalLink, Sparkles, Phone } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { type Property } from "@shared/schema";
import { useCreateCall } from "@/hooks/use-calls";

interface PropertyCardProps {
  property: Property;
}

export function PropertyCard({ property }: PropertyCardProps) {
  const { mutate: initiateCall, isPending } = useCreateCall();

  const formattedPrice = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
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
          </div>
          {property.needsWork && (
            <Badge variant="secondary" className="bg-orange-500/10 text-orange-700 hover:bg-orange-500/20 border-orange-500/20 shrink-0 font-semibold shadow-none">
              <Sparkles className="w-3 h-3 mr-1" />
              Needs Work
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-5 pt-0 flex-1 space-y-4">
        <div className="flex items-end justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground font-medium">Asking Price</p>
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
        <Button 
          variant="outline" 
          size="icon" 
          className="shrink-0 rounded-xl"
          asChild
        >
          <a href={property.link} target="_blank" rel="noopener noreferrer" aria-label="View listing">
            <ExternalLink className="w-4 h-4" />
          </a>
        </Button>
        <Button 
          className="flex-1 w-full rounded-xl shadow-md shadow-primary/20 transition-all active:scale-[0.98]"
          onClick={() => initiateCall(property.id)}
          disabled={isPending}
        >
          {isPending ? (
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
      </CardFooter>
    </Card>
  );
}
