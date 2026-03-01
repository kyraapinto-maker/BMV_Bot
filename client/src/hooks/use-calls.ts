import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useCalls() {
  return useQuery({
    queryKey: [api.calls.list.path],
    queryFn: async () => {
      const res = await fetch(api.calls.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch calls");
      const data = await res.json();
      return api.calls.list.responses[200].parse(data);
    },
  });
}

export function useCreateCall() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (propertyId: number) => {
      const url = buildUrl(api.calls.create.path, { id: propertyId });
      const res = await fetch(url, {
        method: api.calls.create.method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error("Property not found");
        }
        throw new Error("Failed to initiate call");
      }
      
      const data = await res.json();
      return api.calls.create.responses[201].parse(data);
    },
    onSuccess: () => {
      toast({
        title: "Call Initiated",
        description: "The AI agent is now dialing the agency.",
      });
      // Invalidate both lists since a new call affects call history
      // and potentially the status on the dashboard
      queryClient.invalidateQueries({ queryKey: [api.calls.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.properties.list.path] });
    },
    onError: (error) => {
      toast({
        title: "Failed to initiate call",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  });
}
