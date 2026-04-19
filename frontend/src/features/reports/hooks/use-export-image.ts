"use client";

import { useCallback, useRef, useState } from "react";
import { toPng } from "html-to-image";

interface UseExportImageOptions {
  /** Background colour applied while rasterising — important for transparent
   *  blocks since most card UIs use semi-transparent fills. */
  backgroundColor?: string;
  /** Increase for retina-quality output. 2 is a good default. */
  pixelRatio?: number;
}

/**
 * Generic hook around `html-to-image.toPng`. Returns a ref to attach to
 * the DOM node you want to export, plus an `exportPng(filename)` helper
 * and a `share()` helper that prefers the Web Share API and falls back
 * to copying the data URL to the clipboard.
 */
export function useExportImage<T extends HTMLElement = HTMLDivElement>(
  options: UseExportImageOptions = {}
) {
  const ref = useRef<T | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const renderPng = useCallback(async (): Promise<string | null> => {
    if (!ref.current) return null;
    return toPng(ref.current, {
      backgroundColor: options.backgroundColor,
      pixelRatio: options.pixelRatio ?? 2,
      cacheBust: true,
      // `html-to-image` will refuse to inline cross-origin <img>'s by
      // default — favicon URLs we use are CORS-friendly so this stays on.
    });
  }, [options.backgroundColor, options.pixelRatio]);

  const exportPng = useCallback(
    async (filename: string): Promise<boolean> => {
      try {
        setIsExporting(true);
        const dataUrl = await renderPng();
        if (!dataUrl) return false;
        // Trigger a download via a temporary <a>.
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return true;
      } catch (err) {
        console.error("[useExportImage] exportPng failed", err);
        return false;
      } finally {
        setIsExporting(false);
      }
    },
    [renderPng]
  );

  const share = useCallback(
    async (filename: string, title?: string): Promise<"shared" | "copied" | "failed"> => {
      try {
        const dataUrl = await renderPng();
        if (!dataUrl) return "failed";
        // Web Share API path (mobile / Safari / modern Chrome).
        const navAny = navigator as Navigator & {
          share?: (data: ShareData) => Promise<void>;
          canShare?: (data: ShareData) => boolean;
        };
        if (navAny.share) {
          const blob = await (await fetch(dataUrl)).blob();
          const file = new File([blob], filename, { type: "image/png" });
          if (!navAny.canShare || navAny.canShare({ files: [file] })) {
            await navAny.share({ title, files: [file] });
            return "shared";
          }
        }
        // Fallback: copy current page link to clipboard so the user can paste.
        await navigator.clipboard.writeText(window.location.href);
        return "copied";
      } catch (err) {
        console.error("[useExportImage] share failed", err);
        return "failed";
      }
    },
    [renderPng]
  );

  return { ref, exportPng, share, isExporting };
}
