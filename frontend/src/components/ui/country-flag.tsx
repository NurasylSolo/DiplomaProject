"use client";

import Image from "next/image";
import { useState } from "react";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";

interface CountryFlagProps {
  code: string | null | undefined;
  size?: number;
  className?: string;
}

/**
 * Renders a country flag as a PNG from flagcdn.com.
 * Avoids the "regional indicator letters" fallback that Windows shows for
 * emoji flags (US/UK/RU/etc. look like duplicated text on Windows).
 */
export function CountryFlag({ code, size = 20, className }: CountryFlagProps) {
  const [errored, setErrored] = useState(false);
  const normalized = (code || "").toUpperCase();

  if (!normalized || normalized === "XX" || errored) {
    return (
      <Globe
        className={cn("inline-block text-muted-foreground", className)}
        style={{ width: size, height: size }}
        aria-label="Unknown country"
      />
    );
  }

  return (
    <Image
      src={`https://flagcdn.com/w40/${normalized.toLowerCase()}.png`}
      width={size}
      height={Math.round((size * 3) / 4)}
      alt={normalized}
      className={cn("inline-block rounded-sm object-cover shadow-sm", className)}
      style={{ width: size, height: "auto" }}
      onError={() => setErrored(true)}
      unoptimized
    />
  );
}
