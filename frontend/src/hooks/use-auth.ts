import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api/services";
import { useAuthStore } from "@/stores";
import { tokenManager } from "@/lib/api";

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
      router.push("/dashboard");
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
