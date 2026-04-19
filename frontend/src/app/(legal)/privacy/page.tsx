"use client";

import { LegalPage } from "../_components/legal-page";

const SECTIONS_COUNT = 9;

export default function PrivacyPolicyPage() {
  return <LegalPage rootKey="legal.privacy" sectionsCount={SECTIONS_COUNT} />;
}
