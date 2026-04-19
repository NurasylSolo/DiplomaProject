"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { isValidEmail } from "../utils/email-validation";
import { REPORT_LANGUAGES } from "../utils/section-presets";

const CONTENT_OPTIONS = [
  { id: "summary", i18nKey: "summary" },
  { id: "mentions", i18nKey: "mentions" },
  { id: "sentiment", i18nKey: "sentiment" },
  { id: "trends", i18nKey: "trends" },
  { id: "influencers", i18nKey: "influencers" },
] as const;

type T = (key: string, options?: Record<string, unknown>) => string;

interface CreateSchedulePayload {
  recipients: string[];
  frequency: string;
  send_time: string;
  timezone: string;
  config: { sections: string[]; language: string };
  active: boolean;
}

interface EmailCreateDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (payload: CreateSchedulePayload) => void;
  isSubmitting: boolean;
  t: T;
}

export function EmailCreateDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  t,
}: EmailCreateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t("reportsPage.email.dialog.title", {
              defaultValue: "Create scheduled report",
            })}
          </DialogTitle>
        </DialogHeader>
        <CreateScheduleForm
          // Reset state every time the dialog re-opens.
          key={open ? "open" : "closed"}
          onSubmit={onSubmit}
          isSubmitting={isSubmitting}
          onCancel={() => onOpenChange(false)}
          t={t}
        />
      </DialogContent>
    </Dialog>
  );
}

function CreateScheduleForm({
  onSubmit,
  isSubmitting,
  onCancel,
  t,
}: {
  onSubmit: (p: CreateSchedulePayload) => void;
  isSubmitting: boolean;
  onCancel: () => void;
  t: T;
}) {
  const [recipients, setRecipients] = useState<string[]>([]);
  const [newRecipient, setNewRecipient] = useState("");
  const [recipientError, setRecipientError] = useState<string | null>(null);
  const [selectedContents, setSelectedContents] = useState<string[]>([
    "summary",
    "mentions",
  ]);
  const [frequency, setFrequency] = useState("weekly");
  const [sendTime, setSendTime] = useState("09:00");
  const [language, setLanguage] = useState("en");

  const addRecipient = () => {
    const value = newRecipient.trim();
    if (!value) return;
    if (!isValidEmail(value)) {
      setRecipientError(
        t("reportsPage.email.dialog.invalidEmail", {
          defaultValue: "Please enter a valid email address",
        })
      );
      return;
    }
    if (recipients.includes(value)) {
      setRecipientError(
        t("reportsPage.email.dialog.duplicateEmail", {
          defaultValue: "This email is already in the list",
        })
      );
      return;
    }
    setRecipients([...recipients, value]);
    setNewRecipient("");
    setRecipientError(null);
  };

  const submit = () => {
    if (recipients.length === 0) {
      toast.error(
        t("reportsPage.email.dialog.atLeastOneRecipient", {
          defaultValue: "Add at least one recipient",
        })
      );
      return;
    }
    onSubmit({
      recipients,
      frequency,
      send_time: sendTime,
      timezone: "Asia/Almaty",
      // We reuse the Excel "sections" preset id list shape here so the
      // backend can render the same set of report blocks for both flows.
      config: {
        sections: selectedContents.map((id) => {
          // Map content option id to backend section id where they differ.
          if (id === "mentions") return "recent_mentions";
          if (id === "summary") return "executive_summary";
          if (id === "trends") return "trending_hashtags";
          if (id === "influencers") return "top_profiles";
          if (id === "sentiment") return "social_reach";
          return id;
        }),
        language,
      },
      active: true,
    });
  };

  return (
    <div className="space-y-6 mt-4">
      {/* Recipients */}
      <div className="space-y-2">
        <Label>{t("reportsPage.email.dialog.recipients")}</Label>
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder="email@example.com"
            value={newRecipient}
            onChange={(e) => {
              setNewRecipient(e.target.value);
              if (recipientError) setRecipientError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addRecipient();
              }
            }}
          />
          <Button type="button" onClick={addRecipient}>
            {t("reportsPage.email.dialog.add", { defaultValue: "Add" })}
          </Button>
        </div>
        {recipientError ? (
          <p className="text-xs text-destructive">{recipientError}</p>
        ) : null}
        {recipients.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {recipients.map((email) => (
              <Badge key={email} variant="secondary" className="pr-1">
                {email}
                <button
                  type="button"
                  onClick={() =>
                    setRecipients(recipients.filter((r) => r !== email))
                  }
                  className="ml-1 hover:text-destructive"
                  aria-label="Remove"
                >
                  ×
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Frequency + send time */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t("reportsPage.email.dialog.frequency")}</Label>
          <Select value={frequency} onValueChange={setFrequency}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">
                {t("reportsPage.email.dialog.frequencies.daily")}
              </SelectItem>
              <SelectItem value="weekly">
                {t("reportsPage.email.dialog.frequencies.weekly")}
              </SelectItem>
              <SelectItem value="monthly">
                {t("reportsPage.email.dialog.frequencies.monthly")}
              </SelectItem>
              <SelectItem value="on_event">
                {t("reportsPage.email.dialog.frequencies.onEvent")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t("reportsPage.email.dialog.sendTime")}</Label>
          <Select value={sendTime} onValueChange={setSendTime}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="06:00">06:00</SelectItem>
              <SelectItem value="09:00">09:00</SelectItem>
              <SelectItem value="12:00">12:00</SelectItem>
              <SelectItem value="18:00">18:00</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Contents */}
      <div className="space-y-2">
        <Label>{t("reportsPage.email.dialog.contents")}</Label>
        <div className="grid grid-cols-2 gap-3">
          {CONTENT_OPTIONS.map((option) => (
            <label
              key={option.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 cursor-pointer transition-colors"
            >
              <Checkbox
                checked={selectedContents.includes(option.id)}
                onCheckedChange={(checked) => {
                  if (checked === true) {
                    setSelectedContents([...selectedContents, option.id]);
                  } else {
                    setSelectedContents(
                      selectedContents.filter((c) => c !== option.id)
                    );
                  }
                }}
              />
              <span className="text-sm">
                {t(`reportsPage.email.dialog.contentOptions.${option.i18nKey}`, {
                  defaultValue: option.i18nKey,
                })}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Language */}
      <div className="space-y-2">
        <Label>{t("reportsPage.email.dialog.language")}</Label>
        <Select value={language} onValueChange={setLanguage}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {REPORT_LANGUAGES.map((l) => (
              <SelectItem key={l.code} value={l.code}>
                {l.flag} {l.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
        <Button
          className="glow-sm"
          onClick={submit}
          disabled={isSubmitting || recipients.length === 0}
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : null}
          {t("reportsPage.email.dialog.create", {
            defaultValue: "Create schedule",
          })}
        </Button>
      </div>
    </div>
  );
}
