"use client";

import { motion } from "framer-motion";
import { Database, FileText, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import type { ExcelExportType } from "../hooks/use-excel-config";

interface ExcelExportTypeCardProps {
  value: ExcelExportType;
  onChange: (v: ExcelExportType) => void;
  t: (key: string, options?: Record<string, unknown>) => string;
}

export function ExcelExportTypeCard({
  value,
  onChange,
  t,
}: ExcelExportTypeCardProps) {
  const options = [
    {
      id: "current" as const,
      icon: Filter,
      title: t("reportsPage.excel.types.current.title"),
      description: t("reportsPage.excel.types.current.description"),
    },
    {
      id: "full" as const,
      icon: Database,
      title: t("reportsPage.excel.types.full.title"),
      description: t("reportsPage.excel.types.full.description"),
    },
    {
      id: "summary" as const,
      icon: FileText,
      title: t("reportsPage.excel.types.summary.title"),
      description: t("reportsPage.excel.types.summary.description"),
    },
  ];

  return (
    <Card className="glass">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">
          {t("reportsPage.excel.exportType")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <RadioGroup value={value} onValueChange={(v) => onChange(v as ExcelExportType)}>
          <div className="space-y-3">
            {options.map((option, index) => (
              <motion.div
                key={option.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.07 }}
              >
                <label
                  className={cn(
                    "flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-all",
                    value === option.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/30"
                  )}
                >
                  <RadioGroupItem value={option.id} className="mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <option.icon className="h-4 w-4 text-primary" />
                      <span className="font-medium">{option.title}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {option.description}
                    </p>
                  </div>
                </label>
              </motion.div>
            ))}
          </div>
        </RadioGroup>
      </CardContent>
    </Card>
  );
}
