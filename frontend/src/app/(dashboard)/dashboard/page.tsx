"use client";

import { redirect } from "next/navigation";

export default function DashboardPage() {
  // For now, redirect to default project
  // In production, this would show a project selection screen or the last viewed project
  redirect("/projects/1/mentions");
}

