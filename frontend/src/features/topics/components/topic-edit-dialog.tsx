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
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/hooks";
import { getErrorMessage } from "@/lib/api";
import type { TopicDto } from "@/lib/api/services/topics";
import type {
  useCreateTopic,
  useUpdateTopic,
} from "@/hooks";

interface TopicEditDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Pass null when creating a new topic, or the existing topic to edit. */
  editing: TopicDto | null;
  createMutation: ReturnType<typeof useCreateTopic>;
  updateMutation: ReturnType<typeof useUpdateTopic>;
}

export function TopicEditDialog({
  open,
  onOpenChange,
  editing,
  createMutation,
  updateMutation,
}: TopicEditDialogProps) {
  // Remount the inner form whenever the editing target changes so the form
  // state is reset declaratively (instead of via useEffect+setState).
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <TopicEditDialogBody
          key={editing?.id || "new"}
          editing={editing}
          onClose={() => onOpenChange(false)}
          createMutation={createMutation}
          updateMutation={updateMutation}
        />
      </DialogContent>
    </Dialog>
  );
}

function TopicEditDialogBody({
  editing,
  onClose,
  createMutation,
  updateMutation,
}: {
  editing: TopicDto | null;
  onClose: () => void;
  createMutation: ReturnType<typeof useCreateTopic>;
  updateMutation: ReturnType<typeof useUpdateTopic>;
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState(() =>
    editing
      ? {
          name: editing.name || "",
          description: editing.description || "",
          keywordsRaw: (editing.keywords || []).join(", "),
        }
      : { name: "", description: "", keywordsRaw: "" }
  );

  const submit = async () => {
    const name = form.name.trim();
    if (!name) {
      toast.error(t("topicsPage.toasts.nameRequired"));
      return;
    }
    const keywords = form.keywordsRaw
      .split(/[,;|]/)
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      if (editing) {
        await updateMutation.mutateAsync({
          topicId: editing.id,
          data: {
            name,
            description: form.description.trim() || undefined,
            keywords,
          },
        });
        toast.success(t("topicsPage.toasts.updated"));
      } else {
        await createMutation.mutateAsync({
          name,
          description: form.description.trim() || undefined,
          keywords,
        });
        toast.success(t("topicsPage.toasts.created"));
      }
      onClose();
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {editing
            ? t("topicsPage.dialogs.edit.title")
            : t("topicsPage.dialogs.create.title")}
        </DialogTitle>
        <DialogDescription>
          {editing
            ? t("topicsPage.dialogs.edit.description")
            : t("topicsPage.dialogs.create.description")}
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-3 pt-2">
        <div className="space-y-1.5">
          <Label htmlFor="topic-name">
            {t("topicsPage.dialogs.fields.name")}
          </Label>
          <Input
            id="topic-name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="AI Innovation"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="topic-desc">
            {t("topicsPage.dialogs.fields.description")}
          </Label>
          <Textarea
            id="topic-desc"
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
            placeholder={t("topicsPage.dialogs.fields.descriptionPlaceholder")}
            rows={3}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="topic-kws">
            {t("topicsPage.dialogs.fields.keywords")}
          </Label>
          <Input
            id="topic-kws"
            value={form.keywordsRaw}
            onChange={(e) =>
              setForm((f) => ({ ...f, keywordsRaw: e.target.value }))
            }
            placeholder="ai, gpt, openai, llm"
          />
          <p className="text-xs text-muted-foreground">
            {t("topicsPage.dialogs.fields.keywordsHint")}
          </p>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          {t("common.cancel")}
        </Button>
        <Button onClick={submit} disabled={isPending}>
          {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {editing
            ? t("topicsPage.actions.save")
            : t("topicsPage.actions.create")}
        </Button>
      </DialogFooter>
    </>
  );
}
