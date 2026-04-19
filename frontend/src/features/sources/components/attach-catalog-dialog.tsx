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
import { useTranslation } from "@/hooks";
import { getErrorMessage } from "@/lib/api";
import type { useSourcesPage } from "../hooks/use-sources-page";

interface AttachCatalogDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  attachMutation: ReturnType<typeof useSourcesPage>["attachMutation"];
}

export function AttachCatalogDialog({
  open,
  onOpenChange,
  attachMutation,
}: AttachCatalogDialogProps) {
  const { t } = useTranslation();
  const [langs, setLangs] = useState<string[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [limit, setLimit] = useState<number>(100);

  const submit = () => {
    attachMutation.mutate(
      {
        languages: langs.length ? langs : undefined,
        countries: countries.length ? countries : undefined,
        active_only: true,
        limit,
      },
      {
        onSuccess: (res) => {
          toast.success(
            t("sources.toasts.attached", {
              created: res.created,
              matched: res.matched,
            })
          );
          onOpenChange(false);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{t("sources.dialogs.attach.title")}</DialogTitle>
          <DialogDescription>
            {t("sources.dialogs.attach.description")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <div className="space-y-1.5">
            <Label>{t("sources.dialogs.attach.languages")}</Label>
            <Input
              value={langs.join(", ")}
              onChange={(e) =>
                setLangs(
                  e.target.value
                    .split(",")
                    .map((s) => s.trim().toLowerCase())
                    .filter(Boolean)
                )
              }
              placeholder="en, ru, kk"
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("sources.dialogs.attach.countries")}</Label>
            <Input
              value={countries.join(", ")}
              onChange={(e) =>
                setCountries(
                  e.target.value
                    .split(",")
                    .map((s) => s.trim().toUpperCase())
                    .filter(Boolean)
                )
              }
              placeholder="US, KZ, RU"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="att-limit">{t("sources.dialogs.attach.limit")}</Label>
            <Input
              id="att-limit"
              type="number"
              min={1}
              max={1000}
              value={limit}
              onChange={(e) =>
                setLimit(
                  Math.max(1, Math.min(1000, Number(e.target.value) || 100))
                )
              }
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {t("sources.dialogs.attach.hint")}
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={submit} disabled={attachMutation.isPending}>
            {attachMutation.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            {t("sources.dialogs.attach.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
