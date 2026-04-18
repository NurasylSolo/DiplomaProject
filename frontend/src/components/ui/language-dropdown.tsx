"use client";

import { Globe, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks";
import { supportedLanguages } from "@/lib/i18n";

interface LanguageDropdownProps {
  align?: "start" | "center" | "end";
  className?: string;
}

export function LanguageDropdown({ align = "end", className }: LanguageDropdownProps) {
  const { t, changeLanguage, currentLanguage } = useTranslation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("relative", className)}
          aria-label={t("header.language")}
          title={t("header.language")}
        >
          <Globe className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-48">
        <DropdownMenuLabel>{t("header.language")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {supportedLanguages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => changeLanguage(lang.code)}
            className={cn(
              "flex items-center gap-2",
              currentLanguage === lang.code && "bg-accent"
            )}
          >
            <span className="text-lg">{lang.flag}</span>
            <span>{lang.name}</span>
            {currentLanguage === lang.code && <Check className="h-4 w-4 ml-auto" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
