"use client";

import {
  ChevronDown,
  FileSpreadsheet,
  FileText,
  Mail,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from "@/hooks";

interface QuickActionsProps {
  onDeletePreviousProjects: () => void;
  isDeletePreviousPending: boolean;
  projectsCount: number;
}

export function QuickActions({
  onDeletePreviousProjects,
  isDeletePreviousPending,
  projectsCount,
}: QuickActionsProps) {
  const { t } = useTranslation();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">{t("header.quickActions")}</span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem>
          <FileText className="h-4 w-4 mr-2" />
          {t("header.generatePDF")}
        </DropdownMenuItem>
        <DropdownMenuItem>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          {t("header.exportExcel")}
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Mail className="h-4 w-4 mr-2" />
          {t("header.scheduleReport")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive"
          onClick={onDeletePreviousProjects}
          disabled={isDeletePreviousPending || projectsCount <= 1}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          {t("header.deleteOldProjects", {
            defaultValue: "Delete old projects",
          })}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
