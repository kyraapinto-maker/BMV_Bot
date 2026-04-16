import { Eye, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth, useStopImpersonate } from "@/hooks/use-auth";

export function ImpersonationBanner() {
  const { data: user } = useAuth();
  const stop = useStopImpersonate();

  if (!user?.impersonating) return null;

  return (
    <div className="w-full bg-amber-500 text-white px-4 py-2 flex items-center justify-between gap-4 text-sm font-medium z-50">
      <div className="flex items-center gap-2">
        <Eye className="w-4 h-4 shrink-0" />
        <span>
          Viewing as <strong>{user.impersonating.email}</strong>
        </span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 text-white hover:bg-amber-600 hover:text-white gap-1.5 shrink-0"
        onClick={() => stop.mutate()}
        disabled={stop.isPending}
        data-testid="button-stop-impersonate"
      >
        <X className="w-3.5 h-3.5" />
        Stop viewing
      </Button>
    </div>
  );
}
