"use client";

import { CheckCircle, Shield, ShieldOff, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "@/hooks";

export type BulkAction =
  | "activate"
  | "deactivate"
  | "delete"
  | "mark_trusted"
  | "unmark_trusted";

interface BulkActionBarProps {
  selectedCount: number;
  isPending: boolean;
  onAction: (action: BulkAction) => void;
  onClear: () => void;
}

export function BulkActionBar({
  selectedCount,
  isPending,
  onAction,
  onClear,
}: BulkActionBarProps) {
  const { t } = useTranslation();
  if (selectedCount === 0) return null;

  return (
    <Card className="glass border-primary/40">
      <CardContent className="p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm">
          <span className="font-medium">{selectedCount}</span>{" "}
          {t("sources.bulk.selected")}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAction("activate")}
            disabled={isPending}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            {t("sources.bulk.activate")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAction("deactivate")}
            disabled={isPending}
          >
            {t("sources.bulk.deactivate")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAction("mark_trusted")}
            disabled={isPending}
          >
            <Shield className="h-4 w-4 mr-2" />
            {t("sources.bulk.markTrusted")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAction("unmark_trusted")}
            disabled={isPending}
          >
            <ShieldOff className="h-4 w-4 mr-2" />
            {t("sources.bulk.unmarkTrusted")}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onAction("delete")}
            disabled={isPending}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {t("sources.bulk.delete")}
          </Button>
          <Button variant="ghost" size="sm" onClick={onClear}>
            {t("sources.bulk.clear")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
