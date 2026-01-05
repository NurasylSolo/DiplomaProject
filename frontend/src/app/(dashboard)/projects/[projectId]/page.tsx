"use client";

import { use } from "react";
import { redirect } from "next/navigation";

interface ProjectPageProps {
  params: Promise<{ projectId: string }>;
}

export default function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = use(params);
  // Redirect to mentions by default
  redirect(`/projects/${projectId}/mentions`);
}

