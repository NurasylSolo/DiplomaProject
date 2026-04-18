"use client";

import { use, useState, useEffect } from "react";
import { motion } from "framer-motion";
import ReactECharts from "echarts-for-react";
import * as echarts from "echarts";
import { useTheme } from "next-themes";
import {
  Globe,
  Download,
  Filter,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { useGeoData, useTranslation } from "@/hooks";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { getCountryName, getEChartsCountryName } from "@/lib/utils/countries";
import { CountryFlag } from "@/components/ui/country-flag";

interface GeoAnalysisPageProps {
  params: Promise<{ projectId: string }>;
}

function formatReach(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(0)}K`;
  return String(num);
}

export default function GeoAnalysisPage({ params }: GeoAnalysisPageProps) {
  const { projectId } = use(params);
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [excludedCountries, setExcludedCountries] = useState<string[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const { data: geoApiData, isLoading } = useGeoData(projectId);

  const countriesData = (geoApiData || []).map((g: any) => {
    const sent = g.sentiment || {};
    const positive = sent.positive || 0;
    const neutral = sent.neutral || 0;
    const negative = sent.negative || 0;
    const total = positive + neutral + negative;
    const sentimentScore = total > 0 ? Math.round((positive / total) * 100) : 50;
    const code = (g.country_code || "").toUpperCase();
    return {
      code,
      name: getCountryName(code, "en") || g.country || "Unknown",
      mentions: g.mentions || 0,
      reach: typeof g.reach === "number" ? formatReach(g.reach) : (g.reach || "0"),
      sentiment: sentimentScore,
      change: 0,
    };
  }).filter((c: { code: string }) => c.code && c.code !== "XX");

  useEffect(() => {
    const loadMap = async () => {
      try {
        // Try local file first, then CDN fallbacks
        const urls = [
          "/data/world.json",
          "https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json",
        ];
        
        let geoJson = null;
        for (const url of urls) {
          try {
            const res = await fetch(url);
            if (res.ok) {
              const text = await res.text();
              // Check if it's valid JSON
              if (text.startsWith("{") || text.startsWith("[")) {
                geoJson = JSON.parse(text);
                break;
              }
            }
          } catch {
            continue;
          }
        }
        
        if (geoJson) {
          echarts.registerMap("world", geoJson);
          setMapLoaded(true);
        } else {
          console.error("Failed to load world map from all sources");
          setMapError(true);
        }
      } catch (err) {
        console.error("Failed to load world map:", err);
        setMapError(true);
      }
    };
    
    loadMap();
  }, []);
  
  const filteredCountries = countriesData.filter(c => !excludedCountries.includes(c.code));
  const maxMentions = countriesData.length > 0
    ? Math.max(...countriesData.map(c => c.mentions || 0))
    : 0;
  
  const toggleCountry = (code: string) => {
    setExcludedCountries(prev => 
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };
  
  const mapData = filteredCountries.map((country) => ({
    name: getEChartsCountryName(country.code) || country.name,
    value: country.mentions,
    sentiment: country.sentiment,
  }));
  
  const mapOption = {
    tooltip: {
      trigger: "item",
      backgroundColor: isDark ? "rgba(23, 23, 23, 0.95)" : "rgba(255, 255, 255, 0.95)",
      borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
      textStyle: { color: isDark ? "#e5e5e5" : "#171717" },
      formatter: (params: any) => {
        if (params.value) {
          return `<strong>${params.name}</strong><br/>Mentions: ${params.value.toLocaleString()}`;
        }
        return `<strong>${params.name}</strong><br/>No data`;
      },
    },
    visualMap: {
      min: 0,
      max: maxMentions,
      left: "left",
      top: "bottom",
      text: ["High", "Low"],
      textStyle: { color: isDark ? "#a3a3a3" : "#737373" },
      calculable: true,
      inRange: {
        color: [
          isDark ? "rgba(0, 163, 224, 0.1)" : "rgba(0, 163, 224, 0.15)",
          isDark ? "rgba(0, 163, 224, 0.3)" : "rgba(0, 163, 224, 0.35)",
          isDark ? "rgba(0, 163, 224, 0.5)" : "rgba(0, 163, 224, 0.55)",
          isDark ? "rgba(0, 163, 224, 0.7)" : "rgba(0, 163, 224, 0.75)",
          isDark ? "rgba(0, 163, 224, 0.9)" : "rgba(0, 163, 224, 1)",
        ],
      },
    },
    series: [
      {
        name: "Mentions",
        type: "map",
        map: "world",
        roam: true,
        zoom: 1.2,
        scaleLimit: { min: 1, max: 10 },
        emphasis: {
          label: { show: true, color: isDark ? "#fff" : "#000" },
          itemStyle: { areaColor: "#00A3E0" },
        },
        itemStyle: {
          areaColor: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)",
          borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
          borderWidth: 0.5,
        },
        data: mapData,
      },
    ],
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Globe className="h-7 w-7 text-primary" />
            {t("geo.title")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("geo.subtitle")}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                {t("geo.filterCountries")}
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 max-h-[300px] overflow-y-auto">
                {countriesData.map((country) => (
                <DropdownMenuCheckboxItem
                  key={country.code}
                  checked={!excludedCountries.includes(country.code)}
                  onCheckedChange={() => toggleCountry(country.code)}
                >
                  <CountryFlag code={country.code} size={18} className="mr-2" />
                  {country.name}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            {t("common.export")}
          </Button>
        </div>
      </div>
      
      {/* Map */}
      <Card className="glass">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">{t("geo.worldMap")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative rounded-lg overflow-hidden bg-muted/10">
            {mapLoaded ? (
              <ReactECharts
                option={mapOption}
                style={{ height: "500px", width: "100%" }}
                opts={{ renderer: "svg" }}
              />
            ) : mapError ? (
              <div className="h-[400px] flex items-center justify-center">
                <div className="text-center">
                  <Globe className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground mb-2">Map visualization unavailable</p>
                  <p className="text-sm text-muted-foreground/70">View the countries table below for geographic data</p>
                </div>
              </div>
            ) : (
              <div className="h-[500px] flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-muted-foreground">Loading world map...</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Countries Table */}
      <Card className="glass">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium">{t("geo.countriesBreakdown")}</CardTitle>
            <Badge variant="secondary">{filteredCountries.length} {t("geo.countries")}</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-muted-foreground uppercase border-b border-border/50">
                  <th className="p-4">#</th>
                  <th className="p-4">Country</th>
                  <th className="p-4 text-right">Mentions</th>
                  <th className="p-4 text-right">Reach</th>
                  <th className="p-4 text-center">Sentiment</th>
                  <th className="p-4 text-center">Change</th>
                </tr>
              </thead>
              <tbody>
                {filteredCountries.map((country, index) => (
                  <motion.tr
                    key={country.code}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="border-b border-border/30 hover:bg-muted/30 transition-colors"
                  >
                    <td className="p-4 text-muted-foreground">{index + 1}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <CountryFlag code={country.code} size={22} />
                        <span className="font-medium">{country.name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-right font-medium">{country.mentions.toLocaleString()}</td>
                    <td className="p-4 text-right">{country.reach}</td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full rounded-full",
                              country.sentiment >= 70 ? "bg-green-500" : 
                              country.sentiment >= 50 ? "bg-amber-500" : "bg-red-500"
                            )} 
                            style={{ width: `${country.sentiment}%` }} 
                          />
                        </div>
                        <span className="text-sm">{country.sentiment}%</span>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-xs",
                          country.change >= 0 
                            ? "border-green-500/30 text-green-500" 
                            : "border-red-500/30 text-red-500"
                        )}
                      >
                        {country.change >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                        {country.change >= 0 ? "+" : ""}{country.change}%
                      </Badge>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

