"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { useTranslation } from "@/hooks";
import { getErrorMessage } from "@/lib/api";
import { SOURCE_TYPE_OPTIONS } from "../types";
import type { useSourcesPage } from "../hooks/use-sources-page";

interface AddSourceDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  createMutation: ReturnType<typeof useSourcesPage>["createMutation"];
}

const INITIAL = {
  name: "",
  base_url: "",
  type: "news" as string,
  country: "",
  language: "",
};

export function AddSourceDialog({
  open,
  onOpenChange,
  createMutation,
}: AddSourceDialogProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState(INITIAL);

  const submit = () => {
    const name = form.name.trim();
    let url = form.base_url.trim();
    if (!name || !url) {
      toast.error(t("sources.toasts.fillRequired"));
      return;
    }
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;

    createMutation.mutate(
      {
        name,
        base_url: url,
        type: form.type,
        country: form.country.trim() || undefined,
        language: form.language.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success(t("sources.toasts.added"));
          onOpenChange(false);
          setForm(INITIAL);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{t("sources.dialogs.add.title")}</DialogTitle>
          <DialogDescription>
            {t("sources.dialogs.add.description")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="src-name">{t("sources.dialogs.add.name")}</Label>
            <Input
              id="src-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="TechCrunch"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="src-url">{t("sources.dialogs.add.baseUrl")}</Label>
            <Input
              id="src-url"
              value={form.base_url}
              onChange={(e) =>
                setForm((f) => ({ ...f, base_url: e.target.value }))
              }
              placeholder="https://techcrunch.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("sources.dialogs.add.type")}</Label>
            <Select
              value={form.type}
              onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_TYPE_OPTIONS.map((tp) => (
                  <SelectItem key={tp} value={tp}>
                    {tp}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="src-country">{t("sources.dialogs.add.country")}</Label>
              <Input
                id="src-country"
                value={form.country}
                onChange={(e) =>
                  setForm((f) => ({ ...f, country: e.target.value.toUpperCase() }))
                }
                placeholder="US"
                maxLength={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="src-lang">{t("sources.dialogs.add.language")}</Label>
              <Input
                id="src-lang"
                value={form.language}
                onChange={(e) =>
                  setForm((f) => ({ ...f, language: e.target.value.toLowerCase() }))
                }
                placeholder="en"
                maxLength={5}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={submit} disabled={createMutation.isPending}>
            {createMutation.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            {t("sources.dialogs.add.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
