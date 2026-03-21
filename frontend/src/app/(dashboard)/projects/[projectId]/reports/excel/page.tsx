"use client";

import { use, useState } from "react";
import { motion } from "framer-motion";
import {
  FileSpreadsheet,
  Download,
  Check,
  Loader2,
  FileText,
  Database,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";

import { cn } from "@/lib/utils";
import { useCreateExcelReport, useDownloadReport } from "@/hooks";
import { toast } from "sonner";

interface ExcelExportPageProps {
  params: Promise<{ projectId: string }>;
}

const exportOptions = [
  {
    id: "current",
    title: "Current Filters",
    description: "Export data matching your current filter settings",
    icon: Filter,
    estimate: "~2,847 rows",
  },
  {
    id: "full",
    title: "Full Dataset",
    description: "Export all mentions without any filters",
    icon: Database,
    estimate: "~12,847 rows",
  },
  {
    id: "summary",
    title: "Summarized Report",
    description: "Export aggregated statistics and summaries",
    icon: FileText,
    estimate: "~50 rows",
  },
];

const sheetOptions = [
  { id: "mentions", label: "Mentions", checked: true },
  { id: "sources", label: "Sources", checked: true },
  { id: "sentiment", label: "Sentiment Analysis", checked: true },
  { id: "influencers", label: "Influencers", checked: false },
  { id: "trends", label: "Trending Topics", checked: false },
  { id: "daily_stats", label: "Daily Statistics", checked: true },
];

export default function ExcelExportPage({ params }: ExcelExportPageProps) {
  const { projectId } = use(params);
  const [selectedOption, setSelectedOption] = useState("current");
  const [sheets, setSheets] = useState(sheetOptions);
  const [isComplete, setIsComplete] = useState(false);
  const createExcelReport = useCreateExcelReport(projectId);
  const downloadReport = useDownloadReport(projectId);

  const isExporting = createExcelReport.isPending || downloadReport.isPending;
  
  const toggleSheet = (id: string) => {
    setSheets(sheets.map(s => s.id === id ? { ...s, checked: !s.checked } : s));
  };
  
  const handleExport = async () => {
    setIsComplete(false);
    try {
      const report = await createExcelReport.mutateAsync({
        config: {
          sections: sheets.filter(s => s.checked).map(s => s.id),
        },
      });
      await downloadReport.mutateAsync(report.id);
      setIsComplete(true);
      toast.success("Excel report downloaded successfully");
      setTimeout(() => setIsComplete(false), 3000);
    } catch {
      toast.error("Failed to export Excel report");
    }
  };
  
  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="h-7 w-7 text-primary" />
            Excel Export
          </h1>
          <p className="text-muted-foreground mt-1">
            Export your data to Microsoft Excel format
          </p>
        </div>
      </div>
      
      {/* Export Type */}
      <Card className="glass">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Export Type</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup value={selectedOption} onValueChange={setSelectedOption}>
            <div className="space-y-3">
              {exportOptions.map((option, index) => (
                <motion.div
                  key={option.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <label
                    className={cn(
                      "flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-all",
                      selectedOption === option.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/30"
                    )}
                  >
                    <RadioGroupItem value={option.id} className="mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <option.icon className="h-4 w-4 text-primary" />
                          <span className="font-medium">{option.title}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {option.estimate}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {option.description}
                      </p>
                    </div>
                  </label>
                </motion.div>
              ))}
            </div>
          </RadioGroup>
        </CardContent>
      </Card>
      
      {/* Sheets Selection */}
      <Card className="glass">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Include Sheets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-3">
            {sheets.map((sheet) => (
              <label
                key={sheet.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                  sheet.checked
                    ? "border-primary/30 bg-primary/5"
                    : "border-border hover:border-primary/20"
                )}
              >
                <Checkbox
                  checked={sheet.checked}
                  onCheckedChange={() => toggleSheet(sheet.id)}
                />
                <span className="text-sm">{sheet.label}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Export Button */}
      <Card className="glass">
        <CardContent className="p-6">
          <div className="flex flex-col items-center text-center">
            {isComplete ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="mb-4 p-4 rounded-full bg-green-500/10"
              >
                <Check className="h-8 w-8 text-green-500" />
              </motion.div>
            ) : (
              <div className="mb-4 p-4 rounded-full bg-primary/10">
                <FileSpreadsheet className="h-8 w-8 text-primary" />
              </div>
            )}
            
            <h3 className="font-semibold mb-1">
              {isComplete ? "Export Complete!" : "Ready to Export"}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {isComplete 
                ? "Your file has been downloaded" 
                : `${sheets.filter(s => s.checked).length} sheets selected`
              }
            </p>
            
            {isExporting && (
              <div className="mb-4">
                <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
                <p className="text-xs text-muted-foreground mt-2">
                  Exporting...
                </p>
              </div>
            )}
            
            <Button
              size="lg"
              className="glow-sm"
              onClick={handleExport}
              disabled={isExporting || sheets.filter(s => s.checked).length === 0}
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : isComplete ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Downloaded
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download Excel
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}










