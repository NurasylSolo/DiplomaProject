"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSidebarStore, useProjectStore } from "@/stores";
import { Sidebar, Header } from "@/components/layout";
import { cn } from "@/lib/utils";
import { useUser, useProjects } from "@/hooks";
import { tokenManager } from "@/lib/api";

interface ProjectLayoutProps {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}

export default function ProjectLayout({ children, params }: ProjectLayoutProps) {
  const { projectId } = use(params);
  const { isCollapsed } = useSidebarStore();
  const { setCurrentProjectId } = useProjectStore();
  const router = useRouter();
  
  const { data: user, isLoading: userLoading, isError } = useUser();
  useProjects();
  
  useEffect(() => {
    if (!tokenManager.isAuthenticated()) {
      router.push("/login");
    }
  }, [router]);
  
  useEffect(() => {
    if (isError) {
      router.push("/login");
    }
  }, [isError, router]);
  
  useEffect(() => {
    setCurrentProjectId(projectId);
  }, [projectId, setCurrentProjectId]);
  
  if (!tokenManager.isAuthenticated() || userLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-background">
      <Sidebar projectId={projectId} />
      <Header projectId={projectId} />
      <main
        className={cn(
          "pt-16 min-h-screen transition-all duration-300",
          // Mobile: full width (sidebar is an off-canvas drawer).
          // Desktop (lg+): offset by the persistent sidebar width.
          isCollapsed ? "lg:pl-[72px]" : "lg:pl-[260px]"
        )}
      >
        <div className="p-4 sm:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}

