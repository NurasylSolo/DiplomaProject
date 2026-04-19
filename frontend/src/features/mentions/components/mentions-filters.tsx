"use client";

import { useState, useCallback } from "react";
import type { DateRange } from "react-day-picker";
import { 
  Calendar as CalendarIcon, 
  ChevronDown, 
  Save,
  RotateCcw,
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { SOURCE_TYPES, SENTIMENT_TYPES, DATE_RANGE_PRESETS } from "@/lib/constants";
import { useMentionsFilterStore } from "@/stores";
import { useTranslation } from "@/hooks";

interface MentionsFiltersProps {
  projectId: string;
}

export function MentionsFilters({ projectId }: MentionsFiltersProps) {
  const { t } = useTranslation();
  const {
    filters,
    setDateRange,
    toggleSource,
    toggleSentiment,
    setInfluenceRange,
    setAuthor,
    resetFilters,
    getActiveFiltersCount,
  } = useMentionsFilterStore();

  const activeFiltersCount = getActiveFiltersCount();
  
  // Safe defaults for hydration
  const sources = filters?.sources ?? [];
  const sentiments = filters?.sentiments ?? [];
  const influenceRange = filters?.influenceRange ?? [0, 10];
  const author = filters?.author ?? "";
  const dateRange = filters?.dateRange ?? { from: undefined, to: undefined, preset: "all" };
  
  const handleDatePresetChange = (preset: string) => {
    if (preset === "all") {
      setDateRange({ from: undefined, to: undefined, preset: "all" });
      return;
    }
    if (preset === "custom") {
      setDateRange({ ...dateRange, preset: "custom" });
      return;
    }

    const to = new Date();
    to.setHours(23, 59, 59, 999);
    let from = new Date();
    
    switch (preset) {
      case "today":
        from.setHours(0, 0, 0, 0);
        break;
      case "yesterday": {
        from = new Date(Date.now() - 24 * 60 * 60 * 1000);
        from.setHours(0, 0, 0, 0);
        const yesterdayEnd = new Date(from);
        yesterdayEnd.setHours(23, 59, 59, 999);
        setDateRange({ from, to: yesterdayEnd, preset });
        return;
      }
      case "7days":
        from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        from.setHours(0, 0, 0, 0);
        break;
      case "30days":
        from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        from.setHours(0, 0, 0, 0);
        break;
      case "90days":
        from = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        from.setHours(0, 0, 0, 0);
        break;
      default:
        break;
    }
    
    setDateRange({ from, to, preset });
  };

  const handleCustomRangeSelect = useCallback(
    (range: DateRange | undefined) => {
      if (!range) {
        setDateRange({ from: undefined, to: undefined, preset: "custom" });
        return;
      }
      let from = range.from;
      let to = range.to;
      if (from && to && to < from) {
        [from, to] = [to, from];
      }
      setDateRange({ from, to, preset: "custom" });
    },
    [setDateRange]
  );

  const customRangeValue: DateRange | undefined =
    dateRange.preset === "custom" && (dateRange.from || dateRange.to)
      ? { from: dateRange.from, to: dateRange.to }
      : undefined;
  
  return (
    <div className="w-[280px] space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm">{t("mentions.filters.title")}</h3>
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="text-xs px-1.5">
              {activeFiltersCount}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <Save className="h-3.5 w-3.5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7"
            onClick={resetFilters}
            disabled={activeFiltersCount === 0}
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      
      <ScrollArea className="h-[calc(100vh-220px)] pr-4">
        <div className="space-y-6">
          {/* Date Range */}
          <FilterSection title={t("mentions.filters.dateRange")} defaultOpen>
            <div className="space-y-3">
              <Select
                value={dateRange.preset}
                onValueChange={handleDatePresetChange}
              >
                <SelectTrigger className="h-9">
                  <SelectValue
                    placeholder={t("mentions.filters.selectRange", {
                      defaultValue: "Select range",
                    })}
                  />
                </SelectTrigger>
                <SelectContent>
                  {DATE_RANGE_PRESETS.map((preset) => (
                    <SelectItem key={preset.id} value={preset.id}>
                      {t(`mentions.filters.presets.${preset.id}`, {
                        defaultValue: preset.label,
                      })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {dateRange.preset === "custom" ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                      {dateRange.from && dateRange.to ? (
                        `${format(dateRange.from, "MMM dd, yyyy")} – ${format(dateRange.to, "MMM dd, yyyy")}`
                      ) : dateRange.from ? (
                        `${t("mentions.filters.from")} ${format(dateRange.from, "MMM dd, yyyy")}`
                      ) : dateRange.to ? (
                        `${t("mentions.filters.to")} ${format(dateRange.to, "MMM dd, yyyy")}`
                      ) : (
                        <span className="text-muted-foreground">
                          {t("mentions.filters.selectDateRange", {
                            defaultValue: "Select date range",
                          })}
                        </span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="range"
                      selected={customRangeValue}
                      onSelect={handleCustomRangeSelect}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              ) : (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {dateRange.preset === "all" ? (
                    <span>
                      {t("mentions.filters.allInDatabase", {
                        defaultValue: "All mentions in database",
                      })}
                    </span>
                  ) : dateRange.from && dateRange.to ? (
                    <span>
                      {format(dateRange.from, "MMM dd")} –{" "}
                      {format(dateRange.to, "MMM dd")}
                    </span>
                  ) : null}
                </div>
              )}
            </div>
          </FilterSection>

          {/* Sources */}
          <FilterSection
            title={t("mentions.filters.sources")}
            badge={sources.length}
            defaultOpen
          >
            <div className="space-y-2">
              {Object.values(SOURCE_TYPES).slice(0, 8).map((source) => (
                <label
                  key={source.id}
                  className="flex items-center gap-2 cursor-pointer group"
                >
                  <Checkbox
                    checked={sources.includes(source.id)}
                    onCheckedChange={() => toggleSource(source.id)}
                  />
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: source.color }}
                  />
                  <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                    {t(`mentions.filters.sourceTypes.${source.id}`, {
                      defaultValue: source.label,
                    })}
                  </span>
                </label>
              ))}
              <Button variant="ghost" size="sm" className="w-full text-xs mt-1">
                {t("mentions.filters.showAll")}
              </Button>
            </div>
          </FilterSection>

          {/* Sentiment */}
          <FilterSection
            title={t("mentions.filters.sentiment")}
            badge={sentiments.length}
          >
            <div className="flex flex-wrap gap-2">
              {Object.values(SENTIMENT_TYPES).map((sentiment) => (
                <button
                  key={sentiment.id}
                  onClick={() => toggleSentiment(sentiment.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                    "border",
                    sentiments.includes(sentiment.id)
                      ? sentiment.id === "positive"
                        ? "bg-green-500/20 border-green-500/50 text-green-600 dark:text-green-400"
                        : sentiment.id === "negative"
                          ? "bg-red-500/20 border-red-500/50 text-red-600 dark:text-red-400"
                          : "bg-gray-500/20 border-gray-500/50 text-gray-600 dark:text-gray-400"
                      : "border-border hover:border-primary/50 text-muted-foreground"
                  )}
                >
                  {t(`mentions.sentiment.${sentiment.id}`, {
                    defaultValue: sentiment.label,
                  })}
                </button>
              ))}
            </div>
          </FilterSection>
          
          {/* Influence Score */}
          <FilterSection title={t("mentions.filters.influenceScore")}>
            <div className="space-y-4 pt-2">
              <Slider
                value={influenceRange}
                onValueChange={(value) =>
                  setInfluenceRange(value as [number, number])
                }
                max={10}
                step={1}
                className="w-full"
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {t("mentions.filters.min")}: {influenceRange[0]}
                </span>
                <span>
                  {t("mentions.filters.max")}: {influenceRange[1]}
                </span>
              </div>
            </div>
          </FilterSection>

          {/* Author */}
          <FilterSection title={t("mentions.filters.author")}>
            <Input
              placeholder={t("mentions.filters.searchByAuthor")}
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="h-9"
            />
          </FilterSection>

          {/* Saved Filters */}
          <FilterSection title={t("mentions.filters.savedFilters")}>
            <div className="space-y-2">
              <div className="p-2 rounded-lg border border-dashed border-border hover:border-primary/50 cursor-pointer transition-colors">
                <p className="text-xs text-center text-muted-foreground">
                  {t("mentions.filters.noSavedFilters")}
                </p>
              </div>
              <Button variant="outline" size="sm" className="w-full">
                <Save className="h-3.5 w-3.5 mr-2" />
                {t("mentions.filters.saveFilter")}
              </Button>
            </div>
          </FilterSection>
        </div>
      </ScrollArea>
    </div>
  );
}

// Filter Section Component
interface FilterSectionProps {
  title: string;
  badge?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function FilterSection({ title, badge, defaultOpen = false, children }: FilterSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button className="flex items-center justify-between w-full py-2 text-sm font-medium hover:text-primary transition-colors">
          <span className="flex items-center gap-2">
            {title}
            {badge !== undefined && badge > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                {badge}
              </Badge>
            )}
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform",
              isOpen && "rotate-180"
            )}
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}
