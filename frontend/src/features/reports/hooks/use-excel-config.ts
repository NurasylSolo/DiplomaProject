"use client";

import { useState } from "react";
import { EXCEL_SHEET_PRESETS } from "../utils/section-presets";

export type ExcelExportType = "current" | "full" | "summary";

export function useExcelConfig() {
  const [exportType, setExportType] = useState<ExcelExportType>("current");
  const [sheets, setSheets] = useState(
    EXCEL_SHEET_PRESETS.map((s) => ({ ...s, checked: s.defaultChecked }))
  );

  const toggleSheet = (id: string) => {
    setSheets((prev) =>
      prev.map((s) => (s.id === id ? { ...s, checked: !s.checked } : s))
    );
  };

  const enabledIds = sheets.filter((s) => s.checked).map((s) => s.id);

  const toRequestConfig = () => ({
    sections: enabledIds,
    // We persist the export type so the backend can later honour
    // current-filter vs full-dataset when generating the workbook.
    description: exportType,
  });

  return {
    exportType,
    setExportType,
    sheets,
    enabledIds,
    toggleSheet,
    toRequestConfig,
  };
}
