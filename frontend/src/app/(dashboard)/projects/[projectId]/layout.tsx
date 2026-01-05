"use client";

import { use } from "react";
import { useSidebarStore } from "@/stores";
import { Sidebar, Header } from "@/components/layout";
import { cn } from "@/lib/utils";

interface ProjectLayoutProps {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}

export default function ProjectLayout({ children, params }: ProjectLayoutProps) {
  const { projectId } = use(params);
  const { isCollapsed } = useSidebarStore();
  
  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <Sidebar projectId={projectId} />
      
      {/* Header */}
      <Header projectId={projectId} />
      
      {/* Main Content */}
      <main
        className={cn(
          "pt-16 min-h-screen transition-all duration-300",
          isCollapsed ? "pl-[72px]" : "pl-[260px]"
        )}
      >
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}

