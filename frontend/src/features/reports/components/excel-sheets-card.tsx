"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { SectionPreset } from "../utils/section-presets";

interface ExcelSheetsCardProps {
  sheets: (SectionPreset & { checked: boolean })[];
  onToggle: (id: string) => void;
  t: (key: string, options?: Record<string, unknown>) => string;
}

export function ExcelSheetsCard({ sheets, onToggle, t }: ExcelSheetsCardProps) {
  return (
    <Card className="glass">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">
          {t("reportsPage.excel.includeSheets")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid sm:grid-cols-2 gap-3">
          {sheets.map((sheet) => (
            <label
              key={sheet.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                sheet.checked
                  ? "border-primary/30 bg-primary/5"
                  : "border-border hover:border-primary/20"
              )}
            >
              <Checkbox
                checked={sheet.checked}
                onCheckedChange={() => onToggle(sheet.id)}
              />
              <span className="text-sm">
                {t(`reportsPage.excel.sheets.${sheet.i18nKey}`, {
                  defaultValue: sheet.i18nKey,
                })}
              </span>
            </label>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
