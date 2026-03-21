"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useProjects } from "@/hooks";
import { tokenManager } from "@/lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const { data: projects, isLoading } = useProjects();

  useEffect(() => {
    if (!tokenManager.isAuthenticated()) {
      router.push("/login");
      return;
    }

    if (!isLoading && projects) {
      if (projects.length > 0) {
        router.push(`/projects/${projects[0].id}/mentions`);
      } else {
        router.push("/projects/new");
      }
    }
  }, [projects, isLoading, router]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}
