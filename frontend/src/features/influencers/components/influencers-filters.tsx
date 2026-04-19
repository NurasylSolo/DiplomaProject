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

interface InfluencersFiltersProps {
  search: string;
  setSearch: (v: string) => void;
  platform: string;
  setPlatform: (v: string) => void;
  uniquePlatforms: string[];
}

export function InfluencersFilters({
  search,
  setSearch,
  platform,
  setPlatform,
  uniquePlatforms,
}: InfluencersFiltersProps) {
  const { t } = useTranslation();
  return (
    <Card className="glass">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("influencersPage.filters.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={platform} onValueChange={setPlatform}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder={t("influencersPage.filters.platform")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {t("influencersPage.filters.allPlatforms")}
              </SelectItem>
              {uniquePlatforms.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
