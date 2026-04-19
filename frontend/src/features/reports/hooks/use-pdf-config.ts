"use client";

import { useState } from "react";
import { PDF_SECTION_PRESETS } from "../utils/section-presets";

/**
 * State container for the PDF configuration page: which sections are
 * enabled, accent color, language and free-form description. Returns
 * a `toRequestConfig` helper that maps the local state into the shape
 * the backend expects under `report.config`.
 */
export function usePdfConfig() {
  const [sections, setSections] = useState(
    PDF_SECTION_PRESETS.map((s) => ({ ...s, checked: s.defaultChecked }))
  );
  const [accentColor, setAccentColor] = useState("#0d9488");
  const [language, setLanguage] = useState("en");
  const [description, setDescription] = useState("");

  const toggleSection = (id: string) => {
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, checked: !s.checked } : s))
    );
  };

  const enabledIds = sections.filter((s) => s.checked).map((s) => s.id);

  const toRequestConfig = () => ({
    sections: enabledIds,
    accent_color: accentColor,
    language,
    description: description.trim() || undefined,
  });

  return {
    sections,
    enabledIds,
    accentColor,
    setAccentColor,
    language,
    setLanguage,
    description,
    setDescription,
    toggleSection,
    toRequestConfig,
  };
}
