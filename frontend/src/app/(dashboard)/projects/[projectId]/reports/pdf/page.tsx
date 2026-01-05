"use client";

import { use, useState } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  Download,
  Eye,
  Upload,
  Palette,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface PDFReportPageProps {
  params: Promise<{ projectId: string }>;
}

const reportSections = [
  { id: "summary", label: "Summary of Mentions", defaultChecked: true },
  { id: "social_reach", label: "Social Reach Graphs", defaultChecked: true },
  { id: "volume_category", label: "Volume per Category", defaultChecked: true },
  { id: "context", label: "Context of Discussion", defaultChecked: false },
  { id: "recent_mentions", label: "Recent Mentions", defaultChecked: true },
  { id: "top_profiles", label: "Top Public Profiles", defaultChecked: true },
  { id: "influential_sites", label: "Most Influential Sites", defaultChecked: true },
  { id: "quotes", label: "Quotes", defaultChecked: false },
  { id: "volume_chart", label: "Volume Chart", defaultChecked: true },
  { id: "non_social_reach", label: "Non-social Reach", defaultChecked: false },
  { id: "numeric_summary", label: "Numeric Summary", defaultChecked: true },
  { id: "popular_mentions", label: "Popular Mentions", defaultChecked: false },
  { id: "active_profiles", label: "Active Profiles/Sites", defaultChecked: false },
  { id: "trending_hashtags", label: "Trending Hashtags", defaultChecked: true },
];

const accentColors = [
  { name: "Cyan", value: "#00A3E0" },
  { name: "Emerald", value: "#10B981" },
  { name: "Amber", value: "#F59E0B" },
  { name: "Rose", value: "#F43F5E" },
  { name: "Violet", value: "#8B5CF6" },
  { name: "Blue", value: "#3B82F6" },
];

export default function PDFReportPage({ params }: PDFReportPageProps) {
  const { projectId } = use(params);
  const [sections, setSections] = useState(
    reportSections.map(s => ({ ...s, checked: s.defaultChecked }))
  );
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState("#00A3E0");
  const [isGenerating, setIsGenerating] = useState(false);
  
  const toggleSection = (id: string) => {
    setSections(sections.map(s => 
      s.id === id ? { ...s, checked: !s.checked } : s
    ));
  };
  
  const handleGenerate = async () => {
    setIsGenerating(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsGenerating(false);
  };
  
  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-7 w-7 text-primary" />
            PDF Report
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure and generate a customized PDF report
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button 
            className="glow-sm" 
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            <Download className="h-4 w-4 mr-2" />
            {isGenerating ? "Generating..." : "Generate & Download"}
          </Button>
        </div>
      </div>
      
      {/* Report Sections */}
      <Card className="glass">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Report Sections</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-3">
            {sections.map((section, index) => (
              <motion.div
                key={section.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <label
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all",
                    section.checked 
                      ? "border-primary/30 bg-primary/5" 
                      : "border-border hover:border-primary/20"
                  )}
                >
                  <span className="text-sm">{section.label}</span>
                  <Switch
                    checked={section.checked}
                    onCheckedChange={() => toggleSection(section.id)}
                  />
                </label>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Optional Settings */}
      <Collapsible open={optionsOpen} onOpenChange={setOptionsOpen}>
        <Card className="glass">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium">
                  Additional Options
                </CardTitle>
                {optionsOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-6 pt-0">
              {/* Language */}
              <div className="space-y-2">
                <Label>Report Language</Label>
                <Select defaultValue="en">
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">🇬🇧 English</SelectItem>
                    <SelectItem value="ru">🇷🇺 Русский</SelectItem>
                    <SelectItem value="kz">🇰🇿 Қазақша</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Description */}
              <div className="space-y-2">
                <Label>Report Description</Label>
                <Textarea
                  placeholder="Add a custom description for this report..."
                  className="resize-none"
                  rows={3}
                />
              </div>
              
              {/* Logo Upload */}
              <div className="space-y-2">
                <Label>Company Logo</Label>
                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex items-center justify-center cursor-pointer transition-colors">
                    <Upload className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <p>Drag & drop or click to upload</p>
                    <p className="text-xs">PNG, JPG up to 2MB</p>
                  </div>
                </div>
              </div>
              
              {/* Accent Color */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  Accent Color
                </Label>
                <div className="flex items-center gap-3">
                  {accentColors.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setSelectedColor(color.value)}
                      className={cn(
                        "w-8 h-8 rounded-full transition-all",
                        selectedColor === color.value &&
                          "ring-2 ring-offset-2 ring-offset-background ring-foreground"
                      )}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
              
              {/* Saved Filters */}
              <div className="space-y-2">
                <Label>Apply Saved Filter</Label>
                <Select>
                  <SelectTrigger className="w-[300px]">
                    <SelectValue placeholder="Select a saved filter..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No filter</SelectItem>
                    <SelectItem value="last7days">Last 7 days - Positive only</SelectItem>
                    <SelectItem value="tech">Tech sources only</SelectItem>
                    <SelectItem value="social">Social media only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
      
      {/* Preview */}
      <Card className="glass">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="aspect-[8.5/11] bg-white rounded-lg shadow-lg p-8 text-gray-800">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold" style={{ color: selectedColor }}>
                  Media Monitoring Report
                </h2>
                <p className="text-sm text-gray-500">December 2024</p>
              </div>
              <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-400">
                Logo
              </div>
            </div>
            
            <div className="space-y-4">
              {sections.filter(s => s.checked).slice(0, 5).map((section) => (
                <div key={section.id} className="border-b border-gray-200 pb-3">
                  <h3 className="font-medium text-sm mb-2">{section.label}</h3>
                  <div className="h-8 bg-gray-100 rounded animate-pulse" />
                </div>
              ))}
            </div>
            
            <p className="text-center text-xs text-gray-400 mt-8">
              {sections.filter(s => s.checked).length} sections selected
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}










