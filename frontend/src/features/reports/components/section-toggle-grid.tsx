"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { SectionPreset } from "../utils/section-presets";

interface SectionToggleGridProps {
  title: string;
  sections: (SectionPreset & { checked: boolean })[];
  /** i18n base for label translation: `${i18nBase}.${section.i18nKey}`. */
  i18nBase: string;
  /** Translator function — passed in to keep this component framework-agnostic. */
  t: (key: string, options?: Record<string, unknown>) => string;
  onToggle: (id: string) => void;
}

export function SectionToggleGrid({
  title,
  sections,
  i18nBase,
  t,
  onToggle,
}: SectionToggleGridProps) {
  return (
    <Card className="glass">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid sm:grid-cols-2 gap-3">
          {sections.map((section, index) => (
            <motion.div
              key={section.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index * 0.03, 0.3) }}
            >
              <label
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all",
                  section.checked
                    ? "border-primary/30 bg-primary/5"
                    : "border-border hover:border-primary/20"
                )}
              >
                <span className="text-sm">
                  {t(`${i18nBase}.${section.i18nKey}`, {
                    defaultValue: section.i18nKey,
                  })}
                </span>
                <Switch
                  checked={section.checked}
                  onCheckedChange={() => onToggle(section.id)}
                />
              </label>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
