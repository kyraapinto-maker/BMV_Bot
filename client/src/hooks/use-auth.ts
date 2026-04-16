import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, getQueryFn } from "@/lib/queryClient";

export interface AuthUser {
  id: string;
  email: string;
  isAdmin?: boolean;
  impersonating?: { id: string; email: string } | null;
}

export function useAuth() {
  return useQuery<AuthUser | null>({
    queryKey: ["/api/auth/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useLogin() {
  return useMutation({
    mutationFn: (data: { email: string; password: string }) =>
      apiRequest("POST", "/api/auth/login", data).then((r) => r.json()),
    onSuccess: (user: AuthUser) => {
      queryClient.setQueryData(["/api/auth/me"], user);
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: (data: { email: string; password: string }) =>
      apiRequest("POST", "/api/auth/register", data).then((r) => r.json()),
    onSuccess: (user: AuthUser) => {
      queryClient.setQueryData(["/api/auth/me"], user);
    },
  });
}

export function useLogout() {
  return useMutation({
    mutationFn: () => apiRequest("POST", "/api/auth/logout").then((r) => r.json()),
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/me"], null);
      queryClient.clear();
    },
  });
}

export function useImpersonate() {
  return useMutation({
    mutationFn: (userId: string) =>
      apiRequest("POST", `/api/admin/impersonate/${userId}`).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });
}

export function useStopImpersonate() {
  return useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/admin/stop-impersonate").then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });
}

export function useAdminUsers() {
  return useQuery<{ id: string; email: string }[]>({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: false,
    staleTime: 60 * 1000,
  });
}
