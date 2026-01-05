import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Project } from "@/types";

interface ProjectState {
  currentProjectId: string | null;
  projects: Project[];
  isLoading: boolean;
  
  setCurrentProjectId: (id: string | null) => void;
  setProjects: (projects: Project[]) => void;
  addProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  removeProject: (id: string) => void;
  setLoading: (loading: boolean) => void;
  
  // Computed
  getCurrentProject: () => Project | undefined;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      currentProjectId: null,
      projects: [],
      isLoading: false,
      
      setCurrentProjectId: (id) => set({ currentProjectId: id }),
      
      setProjects: (projects) => set({ projects }),
      
      addProject: (project) => set((state) => ({ 
        projects: [...state.projects, project] 
      })),
      
      updateProject: (id, updates) => set((state) => ({
        projects: state.projects.map((p) => 
          p.id === id ? { ...p, ...updates } : p
        ),
      })),
      
      removeProject: (id) => set((state) => ({
        projects: state.projects.filter((p) => p.id !== id),
        currentProjectId: state.currentProjectId === id ? null : state.currentProjectId,
      })),
      
      setLoading: (loading) => set({ isLoading: loading }),
      
      getCurrentProject: () => {
        const { projects, currentProjectId } = get();
        return projects.find((p) => p.id === currentProjectId);
      },
    }),
    {
      name: "senti-project",
      partialize: (state) => ({ currentProjectId: state.currentProjectId }),
    }
  )
);

