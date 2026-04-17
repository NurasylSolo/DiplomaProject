"use client";

import { use, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Clock,
  Download,
  TrendingUp,
  MessageSquare,
  Lightbulb,
  Calendar,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useHotHours, useTranslation } from "@/hooks";

interface HotHoursPageProps {
  params: Promise<{ projectId: string }>;
}

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const hours = Array.from({ length: 24 }, (_, i) => i);

const suggestedTimes = [
  { day: "Tuesday", time: "10:00 AM - 12:00 PM", reason: "Peak engagement window" },
  { day: "Thursday", time: "2:00 PM - 4:00 PM", reason: "High mention volume" },
  { day: "Friday", time: "9:00 AM - 11:00 AM", reason: "Active social discussions" },
];

function getHeatmapColor(value: number): string {
  if (value < 20) return "bg-primary/10";
  if (value < 40) return "bg-primary/25";
  if (value < 60) return "bg-primary/45";
  if (value < 80) return "bg-primary/65";
  return "bg-primary";
}

function formatHour(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return "12 PM";
  return `${hour - 12} PM`;
}

export default function HotHoursPage({ params }: HotHoursPageProps) {
  const { projectId } = use(params);
  const { t } = useTranslation();
  const { data: hotHoursData, isLoading } = useHotHours(projectId);
  const [selectedCell, setSelectedCell] = useState<{ day: number; hour: number } | null>(null);

  const heatmapData = useMemo(() => {
    const grid: number[][] = days.map(() => new Array(24).fill(0));
    if (!hotHoursData) return grid;
    for (const item of hotHoursData) {
      const pageDay = (item.day + 6) % 7; // API: 0=Sun → page: 6=Sun
      grid[pageDay][item.hour] = item.mentions;
    }
    return grid;
  }, [hotHoursData]);

  const topHours = useMemo(() => {
    const flat: { day: number; hour: number; value: number }[] = [];
    heatmapData.forEach((dayData, dayIndex) => {
      dayData.forEach((value, hourIndex) => {
        flat.push({ day: dayIndex, hour: hourIndex, value });
      });
    });
    return flat.sort((a, b) => b.value - a.value).slice(0, 5);
  }, [heatmapData]);

  const totalMentions = useMemo(
    () => heatmapData.flat().reduce((sum, v) => sum + v, 0),
    [heatmapData]
  );

  const peakEntry = topHours[0];

  const selectedValue = selectedCell 
    ? heatmapData[selectedCell.day][selectedCell.hour] 
    : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
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
            <Clock className="h-7 w-7 text-primary" />
            {t("hotHours.title")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("hotHours.subtitle")}
          </p>
        </div>
        
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export Data
        </Button>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="glass">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xl font-bold">{peakEntry ? `${days[peakEntry.day]} ${formatHour(peakEntry.hour)}` : "—"}</p>
              <p className="text-xs text-muted-foreground">Peak Hour</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <MessageSquare className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-xl font-bold">{totalMentions.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Total Weekly Mentions</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Calendar className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-xl font-bold">Tue - Thu</p>
              <p className="text-xs text-muted-foreground">Most Active Days</p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid lg:grid-cols-4 gap-6">
        {/* Heatmap */}
        <Card className="glass lg:col-span-3">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium">Activity Heatmap</CardTitle>
              {selectedCell && (
                <Badge variant="secondary">
                  {days[selectedCell.day]} {formatHour(selectedCell.hour)}: {selectedValue} mentions
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div className="min-w-[700px]">
                {/* Hour labels */}
                <div className="flex mb-2 pl-12">
                  {hours.filter((_, i) => i % 3 === 0).map((hour) => (
                    <div key={hour} className="flex-1 text-xs text-muted-foreground text-center">
                      {formatHour(hour)}
                    </div>
                  ))}
                </div>
                
                {/* Heatmap grid */}
                <div className="space-y-1">
                  {days.map((day, dayIndex) => (
                    <div key={day} className="flex items-center gap-2">
                      <div className="w-10 text-xs text-muted-foreground text-right">
                        {day}
                      </div>
                      <div className="flex-1 flex gap-0.5">
                        {hours.map((hour) => {
                          const value = heatmapData[dayIndex][hour];
                          const isSelected = selectedCell?.day === dayIndex && selectedCell?.hour === hour;
                          return (
                            <motion.button
                              key={hour}
                              onClick={() => setSelectedCell({ day: dayIndex, hour })}
                              className={cn(
                                "flex-1 h-8 rounded-sm transition-all",
                                getHeatmapColor(value),
                                isSelected && "ring-2 ring-foreground ring-offset-1 ring-offset-background"
                              )}
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.95 }}
                              title={`${day} ${formatHour(hour)}: ${value} mentions`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Legend */}
                <div className="flex items-center justify-center gap-2 mt-4">
                  <span className="text-xs text-muted-foreground">Less</span>
                  <div className="flex gap-0.5">
                    {[10, 30, 50, 70, 90].map((value) => (
                      <div
                        key={value}
                        className={cn("w-6 h-4 rounded-sm", getHeatmapColor(value))}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">More</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Sidebar */}
        <div className="space-y-6">
          {/* Top Hours */}
          <Card className="glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Top Hours
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {topHours.map((item, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/30"
                >
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                      index === 0 ? "bg-amber-500/20 text-amber-500" : "bg-muted text-muted-foreground"
                    )}>
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{days[item.day]}</p>
                      <p className="text-xs text-muted-foreground">{formatHour(item.hour)}</p>
                    </div>
                  </div>
                  <Badge variant="secondary">{item.value}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
          
          {/* Suggested Publishing Times */}
          <Card className="glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-primary" />
                Best Times to Post
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {suggestedTimes.map((item, index) => (
                <div key={index} className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                      {item.day}
                    </Badge>
                    <span className="text-sm font-medium">{item.time}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{item.reason}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Selected Cell Details */}
      {selectedCell && (
        <Card className="glass">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">
                  {days[selectedCell.day]} at {formatHour(selectedCell.hour)}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {selectedValue} mentions during this hour
                </p>
              </div>
              <Button size="sm">
                Filter Mentions
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}










