"use client";

import { useTranslation as useI18nTranslation } from "react-i18next";

export function useTranslation(namespace?: string) {
  const { t, i18n } = useI18nTranslation(namespace || "common");

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return {
    t,
    i18n,
    changeLanguage,
    currentLanguage: i18n.language,
  };
}

