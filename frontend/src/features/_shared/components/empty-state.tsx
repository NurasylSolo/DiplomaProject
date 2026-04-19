import * as React from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: React.ReactNode;
  message: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

/**
 * Single empty/no-data state used across analysis / comparison / sources /
 * topics. Was duplicated 5+ times with the same markup.
 */
export function EmptyState({ icon, title, message, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "py-10 text-center text-sm text-muted-foreground space-y-2",
        className
      )}
    >
      {icon ? <div className="flex justify-center">{icon}</div> : null}
      {title ? <p className="font-medium text-foreground">{title}</p> : null}
      <p>{message}</p>
      {action ? <div className="pt-2">{action}</div> : null}
    </div>
  );
}
