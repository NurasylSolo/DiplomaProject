"use client";

import { Loader2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslation } from "@/hooks";

interface AutoDiscoverDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  isPending: boolean;
  onConfirm: () => void;
}

export function AutoDiscoverDialog({
  open,
  onOpenChange,
  isPending,
  onConfirm,
}: AutoDiscoverDialogProps) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            {t("topicsPage.dialogs.discover.title")}
          </DialogTitle>
          <DialogDescription>
            {t("topicsPage.dialogs.discover.description")}
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-sm text-amber-700 dark:text-amber-300">
          {t("topicsPage.dialogs.discover.warning")}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={onConfirm} disabled={isPending}>
            {isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Wand2 className="h-4 w-4 mr-2" />
            )}
            {t("topicsPage.dialogs.discover.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
