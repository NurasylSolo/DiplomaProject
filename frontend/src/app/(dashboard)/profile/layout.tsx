"use client";

import { useSidebarStore } from "@/stores";
import { Sidebar, Header } from "@/components/layout";
import { cn } from "@/lib/utils";

interface ProfileLayoutProps {
  children: React.ReactNode;
}

export default function ProfileLayout({ children }: ProfileLayoutProps) {
  const { isCollapsed } = useSidebarStore();
  
  // Using a default project ID for the sidebar when in profile pages
  const defaultProjectId = "1";
  
  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <Sidebar projectId={defaultProjectId} />
      
      {/* Header */}
      <Header projectId={defaultProjectId} />
      
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









