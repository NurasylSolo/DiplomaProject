"use client";

import { useRouter } from "next/navigation";
import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks";

interface Project {
  id: string;
  name: string;
  color: string;
}

interface ProjectSelectorProps {
  projects: Project[];
  currentProject: Project;
  isRefreshPending: boolean;
  isDeletePending: boolean;
  onRefresh: () => void;
  onDelete: () => void;
}

export function ProjectSelector({
  projects,
  currentProject,
  isRefreshPending,
  isDeletePending,
  onRefresh,
  onDelete,
}: ProjectSelectorProps) {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <>
      <Select
        value={currentProject.id}
        onValueChange={(value) => router.push(`/projects/${value}/mentions`)}
      >
        <SelectTrigger className="w-[200px] h-9 border-0 bg-muted/50 hover:bg-muted">
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: currentProject.color }}
            />
            <SelectValue>{currentProject.name}</SelectValue>
          </div>
        </SelectTrigger>
        <SelectContent>
          {projects.map((project) => (
            <SelectItem key={project.id} value={project.id}>
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: project.color }}
                />
                {project.name}
              </div>
            </SelectItem>
          ))}
          <DropdownMenuSeparator />
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={() => router.push("/projects/new")}
          >
            <Plus className="h-4 w-4 mr-2" />
            {t("header.newProject")}
          </Button>
        </SelectContent>
      </Select>

      <Button
        variant="ghost"
        size="icon"
        title={t("header.refreshProject", {
          defaultValue: "Refresh project data",
        })}
        onClick={onRefresh}
        disabled={isRefreshPending || projects.length === 0}
      >
        <RefreshCw
          className={cn("h-4 w-4", isRefreshPending && "animate-spin")}
        />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        title={t("header.deleteCurrentProject", {
          defaultValue: "Delete current project",
        })}
        onClick={onDelete}
        disabled={isDeletePending || projects.length === 0}
      >
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </>
  );
}
