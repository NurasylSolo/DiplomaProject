"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Palette } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ACCENT_COLORS, REPORT_LANGUAGES } from "../utils/section-presets";

interface PdfAdditionalOptionsProps {
  language: string;
  setLanguage: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  accentColor: string;
  setAccentColor: (v: string) => void;
  t: (key: string, options?: Record<string, unknown>) => string;
}

export function PdfAdditionalOptions({
  language,
  setLanguage,
  description,
  setDescription,
  accentColor,
  setAccentColor,
  t,
}: PdfAdditionalOptionsProps) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="glass">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium">
                {t("reportsPage.pdf.options.title", {
                  defaultValue: "Additional Options",
                })}
              </CardTitle>
              {open ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-6 pt-0">
            <div className="space-y-2">
              <Label>{t("reportsPage.pdf.options.language")}</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_LANGUAGES.map((l) => (
                    <SelectItem key={l.code} value={l.code}>
                      {l.flag} {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("reportsPage.pdf.options.description")}</Label>
              <Textarea
                placeholder={t("reportsPage.pdf.options.descriptionPlaceholder")}
                className="resize-none"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                {t("reportsPage.pdf.options.accentColor")}
              </Label>
              <div className="flex items-center gap-3">
                {ACCENT_COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setAccentColor(color.value)}
                    className={cn(
                      "w-8 h-8 rounded-full transition-all",
                      accentColor === color.value &&
                        "ring-2 ring-offset-2 ring-offset-background ring-foreground"
                    )}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
