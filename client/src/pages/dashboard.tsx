import { useProperties } from "@/hooks/use-properties";
import { useCallAll } from "@/hooks/use-calls";
import { PropertyCard } from "@/components/property-card";
import { Building, Sparkles, PhoneForwarded, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { data: properties, isLoading, error } = useProperties();
  const callAll = useCallAll();

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 text-primary rounded-lg">
                <Sparkles className="w-5 h-5" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold font-display text-foreground">
                Opportunities
              </h1>
            </div>
            <p className="text-muted-foreground text-lg max-w-2xl">
              Properties stuck on the market that require modernization. Review and instruct the AI to call agencies.
            </p>
          </div>

          {properties && properties.length > 0 && (
            <Button
              onClick={() => callAll.mutate()}
              disabled={callAll.isPending}
              size="lg"
              className="shrink-0 gap-2"
              data-testid="button-call-all"
            >
              {callAll.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <PhoneForwarded className="w-4 h-4" />
              )}
              {callAll.isPending ? "Calling…" : "Call All Agencies"}
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-3/4" />
              </div>
              <Skeleton className="h-10 w-1/2" />
              <Skeleton className="h-12 w-full rounded-xl" />
              <div className="flex gap-3 pt-4 border-t">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <Skeleton className="h-10 flex-1 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="p-8 text-center bg-destructive/5 rounded-2xl border border-destructive/20 text-destructive">
          <p className="font-semibold">Failed to load properties.</p>
          <p className="text-sm mt-1 opacity-80">Please check your connection or try again later.</p>
        </div>
      ) : !properties?.length ? (
        <div className="flex flex-col items-center justify-center p-16 bg-card border border-border/50 rounded-3xl shadow-sm">
          <div className="bg-muted p-4 rounded-full mb-4">
            <Building className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-bold text-foreground">No opportunities found</h3>
          <p className="text-muted-foreground mt-2 text-center max-w-sm">
            We couldn't find any properties matching your criteria at the moment. The scraper might still be running.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {properties.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      )}
    </div>
  );
}
