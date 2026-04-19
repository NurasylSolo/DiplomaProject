"use client";

import { useTranslation } from "@/hooks";
import type { TFunction } from "i18next";

type SectionDef = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

interface Props {
  /** i18n root key, e.g. "legal.privacy" or "legal.terms" */
  rootKey: string;
  /** Number of sections to render (lookup keys: <root>.sections.0.title …) */
  sectionsCount: number;
}

function getSection(t: TFunction, rootKey: string, idx: number): SectionDef {
  const base = `${rootKey}.sections.${idx}`;
  const title = t(`${base}.title`, { defaultValue: "" });

  // i18next "returnObjects" gives us proper arrays.
  const paragraphsRaw = t(`${base}.paragraphs`, { returnObjects: true, defaultValue: [] });
  const bulletsRaw = t(`${base}.bullets`, { returnObjects: true, defaultValue: [] });

  const paragraphs = Array.isArray(paragraphsRaw) ? (paragraphsRaw as string[]) : [];
  const bullets = Array.isArray(bulletsRaw) ? (bulletsRaw as string[]) : [];

  return { title, paragraphs, bullets };
}

export function LegalPage({ rootKey, sectionsCount }: Props) {
  const { t } = useTranslation();
  const sections = Array.from({ length: sectionsCount }, (_, i) =>
    getSection(t, rootKey, i)
  );

  return (
    <article className="space-y-10">
      <header className="space-y-3 border-b border-border pb-8">
        <p className="text-xs uppercase tracking-wider text-primary font-medium">
          {t(`${rootKey}.eyebrow`)}
        </p>
        <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">
          {t(`${rootKey}.title`)}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t(`${rootKey}.lastUpdated`)}
        </p>
        <p className="text-base text-muted-foreground max-w-3xl pt-2">
          {t(`${rootKey}.intro`)}
        </p>
      </header>

      <div className="space-y-10">
        {sections.map((s, i) => (
          <section key={i} className="space-y-3">
            <h2 className="font-display text-xl sm:text-2xl font-semibold">
              <span className="text-muted-foreground mr-2">{i + 1}.</span>
              {s.title}
            </h2>

            {(s.paragraphs ?? []).map((p, idx) => (
              <p key={idx} className="text-base leading-relaxed text-muted-foreground">
                {p}
              </p>
            ))}

            {(s.bullets ?? []).length > 0 && (
              <ul className="list-disc pl-6 space-y-1.5 text-base text-muted-foreground marker:text-primary">
                {(s.bullets ?? []).map((b, idx) => (
                  <li key={idx}>{b}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      <footer className="rounded-xl border border-border bg-muted/30 p-6 mt-12">
        <h3 className="font-display text-lg font-semibold mb-2">
          {t(`${rootKey}.contact.title`)}
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          {t(`${rootKey}.contact.body`)}
        </p>
        <p className="text-sm">
          <span className="text-muted-foreground">Email: </span>
          <a
            href="mailto:nurasylkairkhanov@gmail.com"
            className="text-primary hover:text-primary/80"
          >
            nurasylkairkhanov@gmail.com
          </a>
        </p>
        <p className="text-xs text-muted-foreground mt-4">
          {t(`${rootKey}.contact.authors`)}
        </p>
      </footer>
    </article>
  );
}
