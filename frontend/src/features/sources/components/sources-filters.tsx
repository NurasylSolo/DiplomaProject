"use client";

import { Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/hooks";
import { SOURCE_TYPE_OPTIONS } from "../types";

interface SourcesFiltersProps {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  typeFilter: string;
  setTypeFilter: (v: string) => void;
  activeFilter: string;
  setActiveFilter: (v: string) => void;
  trustedFilter: string;
  setTrustedFilter: (v: string) => void;
  countryFilter: string;
  setCountryFilter: (v: string) => void;
  languageFilter: string;
  setLanguageFilter: (v: string) => void;
  uniqueTypes: string[];
  uniqueCountries: string[];
  uniqueLanguages: string[];
}

export function SourcesFilters({
  searchQuery,
  setSearchQuery,
  typeFilter,
  setTypeFilter,
  activeFilter,
  setActiveFilter,
  trustedFilter,
  setTrustedFilter,
  countryFilter,
  setCountryFilter,
  languageFilter,
  setLanguageFilter,
  uniqueTypes,
  uniqueCountries,
  uniqueLanguages,
}: SourcesFiltersProps) {
  const { t } = useTranslation();
  return (
    <Card className="glass">
      <CardContent className="p-4">
        <div className="grid md:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("sources.filters.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger>
              <SelectValue placeholder={t("sources.filters.type")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("sources.filters.allTypes")}</SelectItem>
              {(uniqueTypes.length ? uniqueTypes : SOURCE_TYPE_OPTIONS).map((tp) => (
                <SelectItem key={tp} value={tp}>
                  {tp}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={activeFilter} onValueChange={setActiveFilter}>
            <SelectTrigger>
              <SelectValue placeholder={t("sources.filters.status")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("sources.filters.allStatus")}</SelectItem>
              <SelectItem value="active">{t("sources.filters.activeOnly")}</SelectItem>
              <SelectItem value="inactive">{t("sources.filters.inactiveOnly")}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={trustedFilter} onValueChange={setTrustedFilter}>
            <SelectTrigger>
              <SelectValue placeholder={t("sources.filters.trust")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("sources.filters.allTrust")}</SelectItem>
              <SelectItem value="trusted">{t("sources.filters.trustedOnly")}</SelectItem>
              <SelectItem value="untrusted">{t("sources.filters.untrustedOnly")}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={countryFilter} onValueChange={setCountryFilter}>
            <SelectTrigger>
              <SelectValue placeholder={t("sources.filters.country")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("sources.filters.allCountries")}</SelectItem>
              {uniqueCountries.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={languageFilter} onValueChange={setLanguageFilter}>
            <SelectTrigger>
              <SelectValue placeholder={t("sources.filters.language")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("sources.filters.allLanguages")}</SelectItem>
              {uniqueLanguages.map((l) => (
                <SelectItem key={l} value={l}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
