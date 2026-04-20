import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api/services";
import { useAuthStore } from "@/stores";
import { tokenManager } from "@/lib/api";
import type { User } from "@/types";

export function useUser() {
  const { setUser, setLoading } = useAuthStore();

  return useQuery({
    queryKey: ["user", "me"],
    queryFn: async () => {
      const user = await authApi.getMe();
      setUser(user);
      setLoading(false);
      return user;
    },
    enabled: tokenManager.isAuthenticated(),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useLogin() {
  const { setUser } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      setUser(data.user);
      queryClient.invalidateQueries({ queryKey: ["user"] });
      router.push("/dashboard");
    },
  });
}

export function useRegister() {
  const { setUser } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.register,
    onSuccess: (data) => {
      setUser(data.user);
      queryClient.invalidateQueries({ queryKey: ["user"] });
      // New email accounts must verify before getting into the dashboard.
      if (data.user && data.user.emailVerified === false) {
        router.push(`/verify-email?email=${encodeURIComponent(data.user.email)}`);
      } else {
        router.push("/dashboard");
      }
    },
  });
}

export function useLogout() {
  const { logout } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.logout,
    onMutate: () => {
      // Instant client-side logout for responsive UX even if backend is slow.
      logout();
      queryClient.clear();
      router.replace("/login");
    },
    onSuccess: () => {
      // no-op: already redirected in onMutate
    },
    onError: () => {
      // no-op: local logout is already completed
    },
  });
}

// ---------------------------------------------------------------------------
// Profile dashboard hooks
// ---------------------------------------------------------------------------

/** Aggregated KPI counters for the profile page (cached 5 min).
 *  We explicitly refetchOnMount so navigating back to /profile after creating
 *  a new project surfaces the updated counts immediately, not in 5 min. */
export function useUserStats() {
  return useQuery({
    queryKey: ["user", "stats"],
    queryFn: () => authApi.getStats(),
    enabled: tokenManager.isAuthenticated(),
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    staleTime: 60 * 1000,
  });
}

/** Recent activity feed (projects + reports + crawl jobs).
 *  Refetches on mount + when window regains focus so newly finished
 *  ingestion runs show up without a manual refresh. */
export function useUserActivity(limit = 10) {
  return useQuery({
    queryKey: ["user", "activity", limit],
    queryFn: () => authApi.getActivity(limit),
    enabled: tokenManager.isAuthenticated(),
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    staleTime: 30 * 1000,
  });
}

/** Upload a new avatar — invalidates user/stats so the new image surfaces
 *  everywhere it's rendered (header, sidebar, profile, settings). */
export function useUploadAvatar() {
  const queryClient = useQueryClient();
  const { setUser } = useAuthStore();

  return useMutation({
    mutationFn: (file: File) => authApi.uploadAvatar(file),
    onSuccess: (user: User) => {
      setUser(user);
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });
}

export function useDeleteAvatar() {
  const queryClient = useQueryClient();
  const { setUser } = useAuthStore();

  return useMutation({
    mutationFn: () => authApi.deleteAvatar(),
    onSuccess: (user: User) => {
      setUser(user);
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });
}
