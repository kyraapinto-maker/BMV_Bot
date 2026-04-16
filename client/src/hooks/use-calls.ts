import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export function useCalls() {
  return useQuery({
    queryKey: [api.calls.list.path],
    queryFn: async () => {
      const res = await fetch(api.calls.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch calls");
      const data = await res.json();
      return api.calls.list.responses[200].parse(data);
    },
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
  });
}

export function useCreateCall() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ uniqueIndex, questions }: { uniqueIndex: string; questions?: string }) => {
      const url = buildUrl(api.calls.create.path, { unique_index: uniqueIndex });
      const res = await fetch(url, {
        method: api.calls.create.method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ questions: questions?.trim() || undefined }),
      });
      
      if (!res.ok) {
        let message = "Failed to initiate call";
        try {
          const body = await res.json();
          if (body?.message) message = body.message;
        } catch {}
        throw new Error(message);
      }
      
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Call Initiated",
        description: "The AI agent is now dialing the agency.",
      });
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

export function useCallAll() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const res = await apiRequest(api.calls.callAll.method, api.calls.callAll.path);
      if (!res.ok) {
        let message = "Something went wrong. Please try again.";
        try {
          const body = await res.json();
          if (body?.message) message = body.message;
        } catch {}
        throw new Error(message);
      }
      return res.json() as Promise<{ initiated: number; errors: number }>;
    },
    onSuccess: (data) => {
      toast({
        title: "Calls Initiated",
        description: `${data.initiated} call${data.initiated !== 1 ? "s" : ""} started${data.errors > 0 ? `, ${data.errors} failed` : ""}.`,
      });
      queryClient.invalidateQueries({ queryKey: [api.calls.list.path] });
    },
    onError: (error) => {
      toast({
        title: "Failed to initiate calls",
        description: error instanceof Error ? error.message : "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });
}
