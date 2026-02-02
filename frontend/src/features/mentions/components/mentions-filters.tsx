"use client";

import { useState } from "react";
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
  const dateRange = filters?.dateRange ?? { from: undefined, to: undefined, preset: "7days" };
  
  const handleDatePresetChange = (preset: string) => {
    let from = new Date();
    const to = new Date();
    
    switch (preset) {
      case "today":
        from = new Date();
        from.setHours(0, 0, 0, 0);
        break;
      case "yesterday":
        from = new Date(Date.now() - 24 * 60 * 60 * 1000);
        from.setHours(0, 0, 0, 0);
        break;
      case "7days":
        from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30days":
        from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "90days":
        from = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        break;
    }
    
    setDateRange({ from, to, preset });
  };
  
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
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent>
                  {DATE_RANGE_PRESETS.map((preset) => (
                    <SelectItem key={preset.id} value={preset.id}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <div className="grid grid-cols-2 gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                      {dateRange.from ? (
                        format(dateRange.from, "MMM dd")
                      ) : (
                        <span className="text-muted-foreground">{t("mentions.filters.from")}</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateRange.from}
                      onSelect={(date) => setDateRange({ ...dateRange, from: date, preset: "custom" })}
                    />
                  </PopoverContent>
                </Popover>
                
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                      {dateRange.to ? (
                        format(dateRange.to, "MMM dd")
                      ) : (
                        <span className="text-muted-foreground">{t("mentions.filters.to")}</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateRange.to}
                      onSelect={(date) => setDateRange({ ...dateRange, to: date, preset: "custom" })}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </FilterSection>
          
          {/* Sources */}
          <FilterSection title={t("mentions.filters.sources")} badge={sources.length} defaultOpen>
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
                    {source.label}
                  </span>
                </label>
              ))}
              <Button variant="ghost" size="sm" className="w-full text-xs mt-1">
                {t("mentions.filters.showAll")}
              </Button>
            </div>
          </FilterSection>
          
          {/* Sentiment */}
          <FilterSection title={t("mentions.filters.sentiment")} badge={sentiments.length}>
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
                  {sentiment.label}
                </button>
              ))}
            </div>
          </FilterSection>
          
          {/* Influence Score */}
          <FilterSection title={t("mentions.filters.influenceScore")}>
            <div className="space-y-4 pt-2">
              <Slider
                value={influenceRange}
                onValueChange={(value) => setInfluenceRange(value as [number, number])}
                max={10}
                step={1}
                className="w-full"
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{t("mentions.filters.min")}: {influenceRange[0]}</span>
                <span>{t("mentions.filters.max")}: {influenceRange[1]}</span>
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
