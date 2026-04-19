"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";

interface ReportsHeaderProps {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  actions?: React.ReactNode;
}

/**
 * Shared header for the four report pages: icon + title + subtitle on the
 * left, free-form action slot on the right.
 */
export function ReportsHeader({
  icon: Icon,
  title,
  subtitle,
  actions,
}: ReportsHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
          <Icon className="h-7 w-7 text-primary" />
          {title}
        </h1>
        <p className="text-muted-foreground mt-1">{subtitle}</p>
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

export { Button as ReportsHeaderButton };
