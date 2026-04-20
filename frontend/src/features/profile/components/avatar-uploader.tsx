"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/api";
import { useDeleteAvatar, useTranslation, useUploadAvatar } from "@/hooks";

interface AvatarUploaderProps {
  currentAvatar: string | null | undefined;
  userInitials: string;
  /** Visual size preset.
   *  - `lg` (default): 128px circle for the profile cover
   *  - `md`: 96px for the settings tab
   */
  size?: "md" | "lg";
  className?: string;
}

const ACCEPTED_TYPES = "image/png,image/jpeg,image/jpg,image/webp";
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB — backend will further validate

/**
 * Avatar editor with click-to-upload and confirm-to-remove. Reuses the
 * shared `Avatar` UI primitive so the on-screen size is identical to
 * other avatar surfaces (header, sidebar). The file input is hidden —
 * users either click the avatar itself or the "Upload photo" button.
 */
export function AvatarUploader({
  currentAvatar,
  userInitials,
  size = "lg",
  className,
}: AvatarUploaderProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [removeOpen, setRemoveOpen] = useState(false);

  const uploadMutation = useUploadAvatar();
  const deleteMutation = useDeleteAvatar();

  const isBusy = uploadMutation.isPending || deleteMutation.isPending;
  const hasAvatar = Boolean(currentAvatar);

  const dimensions = size === "lg" ? "h-32 w-32" : "h-24 w-24";
  const fontSize = size === "lg" ? "text-3xl" : "text-2xl";

  const openPicker = () => {
    if (isBusy) return;
    fileInputRef.current?.click();
  };

  const handleFile = async (file: File | undefined | null) => {
    if (!file) return;
    if (!ACCEPTED_TYPES.split(",").includes(file.type)) {
      toast.error(
        t("profile.avatar.typeError", {
          defaultValue: "Unsupported format. Use PNG, JPEG or WebP.",
        })
      );
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error(
        t("profile.avatar.sizeLimit", {
          defaultValue: "Image too large. Max 5 MB.",
        })
      );
      return;
    }
    try {
      await uploadMutation.mutateAsync(file);
      toast.success(
        t("profile.toasts.avatarUpdated", { defaultValue: "Avatar updated" })
      );
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      // Reset so re-uploading the same file fires onChange again.
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemove = async () => {
    try {
      await deleteMutation.mutateAsync();
      toast.success(
        t("profile.toasts.avatarRemoved", { defaultValue: "Avatar removed" })
      );
      setRemoveOpen(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className={cn("flex items-start gap-5", className)}>
      <button
        type="button"
        onClick={openPicker}
        disabled={isBusy}
        className={cn(
          "relative group rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          isBusy && "opacity-70"
        )}
        aria-label={t("profile.avatar.upload", { defaultValue: "Upload photo" })}
      >
        <Avatar className={cn(dimensions, "border-4 border-background shadow-lg")}>
          <AvatarImage src={currentAvatar || undefined} alt="" />
          <AvatarFallback
            className={cn(fontSize, "font-bold bg-primary/10")}
          >
            {userInitials || "?"}
          </AvatarFallback>
        </Avatar>
        <span
          className={cn(
            "absolute inset-0 flex items-center justify-center rounded-full",
            "bg-black/55 text-white text-xs font-medium",
            "opacity-0 group-hover:opacity-100 transition-opacity"
          )}
        >
          {uploadMutation.isPending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Camera className="h-5 w-5" />
          )}
        </span>
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      <div className="flex flex-col gap-2 pt-2">
        <p className="text-sm font-medium">
          {t("profile.avatar.title", { defaultValue: "Profile picture" })}
        </p>
        <p className="text-xs text-muted-foreground max-w-xs">
          {t("profile.avatar.subtitle", {
            defaultValue: "PNG, JPEG or WebP. Max 5 MB. Square images work best.",
          })}
        </p>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={openPicker}
            disabled={isBusy}
          >
            {uploadMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5 mr-1.5" />
            )}
            {uploadMutation.isPending
              ? t("profile.avatar.uploading", { defaultValue: "Uploading…" })
              : hasAvatar
                ? t("profile.avatar.change", { defaultValue: "Change photo" })
                : t("profile.avatar.upload", { defaultValue: "Upload photo" })}
          </Button>
          {hasAvatar && (
            <AlertDialog open={removeOpen} onOpenChange={setRemoveOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  disabled={isBusy}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  {t("profile.avatar.remove", { defaultValue: "Remove" })}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {t("profile.avatar.confirmTitle", {
                      defaultValue: "Remove avatar?",
                    })}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("profile.avatar.confirmBody", {
                      defaultValue:
                        "Your profile will fall back to the default initials.",
                    })}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>
                    {t("common.cancel", { defaultValue: "Cancel" })}
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={(e) => {
                      e.preventDefault();
                      handleRemove();
                    }}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleteMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    ) : null}
                    {t("profile.avatar.remove", { defaultValue: "Remove" })}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
    </div>
  );
}
