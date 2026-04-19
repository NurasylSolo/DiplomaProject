import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  setUser: (user: User | null) => void;
  setAuthenticated: (authenticated: boolean) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
  
  // Helpers
  hasRole: (role: User["role"]) => boolean;
  hasPermission: (permission: string) => boolean;
}

const ROLE_HIERARCHY: Record<User["role"], number> = {
  admin: 4,
  manager: 3,
  analyst: 2,
  viewer: 1,
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setAuthenticated: (authenticated) => set({ isAuthenticated: authenticated }),
      setLoading: (loading) => set({ isLoading: loading }),
      
      logout: () => {
        set({ user: null, isAuthenticated: false });
        // Tokens are cleared by `authApi.logout` separately. Below we wipe
        // every other piece of session-bound data so a re-login starts
        // fresh and a stale "current project" / sidebar state from a
        // previous user can't leak through. We deliberately leave
        // `i18nextLng` and `senti-theme` alone — those are user UI prefs.
        if (typeof window !== "undefined") {
          try {
            const PURGE_KEYS = [
              "senti-project", // zustand persist for current project
              "senti-sidebar", // zustand persist for sidebar collapse
            ];
            PURGE_KEYS.forEach((k) => window.localStorage.removeItem(k));
          } catch {
            // ignore — quota / private mode
          }
        }
      },
      
      hasRole: (role) => {
        const { user } = get();
        if (!user) return false;
        return ROLE_HIERARCHY[user.role] >= ROLE_HIERARCHY[role];
      },
      
      hasPermission: (permission) => {
        const { user } = get();
        if (!user) return false;
        
        // Admin has all permissions
        if (user.role === "admin") return true;
        
        // Define permission mappings
        const permissions: Record<User["role"], string[]> = {
          admin: ["*"],
          manager: ["manage_project", "analyze", "view", "export", "invite"],
          analyst: ["analyze", "view", "export"],
          viewer: ["view"],
        };
        
        return permissions[user.role]?.includes(permission) ?? false;
      },
    }),
    {
      name: "senti-auth",
      partialize: (state) => ({ 
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

