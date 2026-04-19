"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/hooks";

export function HeaderSearch() {
  const { t } = useTranslation();
  const [focused, setFocused] = useState(false);

  return (
    <div className="hidden sm:block relative">
      <motion.div animate={{ width: focused ? 320 : 240 }} className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t("header.search")}
          className="pl-9 h-9 bg-muted/50 border-0 focus-visible:ring-1"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          ⌘K
        </kbd>
      </motion.div>
    </div>
  );
}
