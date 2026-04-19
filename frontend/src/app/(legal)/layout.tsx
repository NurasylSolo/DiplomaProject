"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LanguageDropdown } from "@/components/ui/language-dropdown";
import { useTranslation } from "@/hooks";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
          <Link
            href="/"
            className="flex items-center gap-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="font-display text-base font-bold">
              Senti<span className="text-primary">News</span>
            </span>
          </Link>

          <div className="flex items-center gap-1">
            <LanguageDropdown />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        {children}
      </main>

      <footer className="border-t border-border mt-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div>© {new Date().getFullYear()} SentiNews. {t("landing.footer.copyright")}</div>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              {t("landing.footer.privacy")}
            </Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">
              {t("landing.footer.terms")}
            </Link>
            <Link href="/login" className="hover:text-foreground transition-colors">
              {t("legal.backToApp")}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
