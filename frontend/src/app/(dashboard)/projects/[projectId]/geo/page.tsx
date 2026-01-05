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
} from "lucide-react";
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

interface GeoAnalysisPageProps {
  params: Promise<{ projectId: string }>;
}

const countriesData = [
  { code: "US", name: "United States", mentions: 4521, reach: "1.2M", sentiment: 75, change: 12 },
  { code: "GB", name: "United Kingdom", mentions: 2156, reach: "650K", sentiment: 68, change: 8 },
  { code: "DE", name: "Germany", mentions: 1892, reach: "520K", sentiment: 72, change: -5 },
  { code: "FR", name: "France", mentions: 1234, reach: "380K", sentiment: 65, change: 15 },
  { code: "KZ", name: "Kazakhstan", mentions: 987, reach: "290K", sentiment: 85, change: 42 },
  { code: "RU", name: "Russia", mentions: 756, reach: "210K", sentiment: 58, change: -12 },
  { code: "CA", name: "Canada", mentions: 654, reach: "180K", sentiment: 78, change: 5 },
  { code: "AU", name: "Australia", mentions: 543, reach: "150K", sentiment: 82, change: 18 },
  { code: "JP", name: "Japan", mentions: 432, reach: "120K", sentiment: 70, change: 3 },
  { code: "IN", name: "India", mentions: 321, reach: "95K", sentiment: 62, change: 25 },
  { code: "BR", name: "Brazil", mentions: 289, reach: "85K", sentiment: 71, change: 8 },
  { code: "CN", name: "China", mentions: 567, reach: "160K", sentiment: 55, change: -8 },
  { code: "MX", name: "Mexico", mentions: 198, reach: "52K", sentiment: 68, change: 12 },
  { code: "IT", name: "Italy", mentions: 312, reach: "78K", sentiment: 74, change: 5 },
  { code: "ES", name: "Spain", mentions: 267, reach: "65K", sentiment: 69, change: 3 },
  { code: "NL", name: "Netherlands", mentions: 189, reach: "48K", sentiment: 77, change: 15 },
  { code: "SE", name: "Sweden", mentions: 145, reach: "38K", sentiment: 81, change: 10 },
  { code: "PL", name: "Poland", mentions: 178, reach: "42K", sentiment: 66, change: -2 },
  { code: "TR", name: "Turkey", mentions: 234, reach: "58K", sentiment: 54, change: -15 },
  { code: "UA", name: "Ukraine", mentions: 156, reach: "35K", sentiment: 63, change: 20 },
];

// Mapping country codes to ECharts country names
const countryCodeToName: Record<string, string> = {
  US: "United States",
  GB: "United Kingdom",
  DE: "Germany",
  FR: "France",
  KZ: "Kazakhstan",
  RU: "Russia",
  CA: "Canada",
  AU: "Australia",
  JP: "Japan",
  IN: "India",
  BR: "Brazil",
  CN: "China",
  MX: "Mexico",
  IT: "Italy",
  ES: "Spain",
  NL: "Netherlands",
  SE: "Sweden",
  PL: "Poland",
  TR: "Turkey",
  UA: "Ukraine",
};

export default function GeoAnalysisPage({ params }: GeoAnalysisPageProps) {
  const { projectId } = use(params);
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [excludedCountries, setExcludedCountries] = useState<string[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  
  // Load world map
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
  const maxMentions = Math.max(...countriesData.map(c => c.mentions));
  
  const toggleCountry = (code: string) => {
    setExcludedCountries(prev => 
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };
  
  const mapData = filteredCountries.map((country) => ({
    name: countryCodeToName[country.code] || country.name,
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
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Globe className="h-7 w-7 text-primary" />
            Geo Analysis
          </h1>
          <p className="text-muted-foreground mt-1">
            Geographic distribution of your media mentions
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter Countries
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
                  {getFlagEmoji(country.code)} {country.name}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>
      
      {/* Map */}
      <Card className="glass">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">World Map - Mentions by Country</CardTitle>
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
            <CardTitle className="text-base font-medium">Countries Breakdown</CardTitle>
            <Badge variant="secondary">{filteredCountries.length} countries</Badge>
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
                        <span className="text-lg">{getFlagEmoji(country.code)}</span>
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

function getFlagEmoji(countryCode: string): string {
  const flags: Record<string, string> = {
    US: "🇺🇸", GB: "🇬🇧", DE: "🇩🇪", FR: "🇫🇷", KZ: "🇰🇿",
    RU: "🇷🇺", CA: "🇨🇦", AU: "🇦🇺", JP: "🇯🇵", IN: "🇮🇳",
    BR: "🇧🇷", CN: "🇨🇳", MX: "🇲🇽", IT: "🇮🇹", ES: "🇪🇸",
    NL: "🇳🇱", SE: "🇸🇪", PL: "🇵🇱", TR: "🇹🇷", UA: "🇺🇦",
  };
  return flags[countryCode] || "🌍";
}
