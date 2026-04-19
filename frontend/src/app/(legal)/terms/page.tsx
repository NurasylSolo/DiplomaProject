"use client";

import { LegalPage } from "../_components/legal-page";

const SECTIONS_COUNT = 8;

export default function TermsOfServicePage() {
  return <LegalPage rootKey="legal.terms" sectionsCount={SECTIONS_COUNT} />;
}
