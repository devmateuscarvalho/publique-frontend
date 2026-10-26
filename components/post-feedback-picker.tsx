"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const FEEDBACK_REASONS = ["generic", "off_brand", "wrong_facts", "wrong_tone", "repetitive", "bad_image", "other"] as const;

export type PostFeedback = { reason: string; note: string };

export function PostFeedbackPicker({
  title,
  confirmLabel,
  pending,
  onConfirm,
  onCancel,
}: {
  title: string;
  confirmLabel: string;
  pending: boolean;
  onConfirm: (feedback: PostFeedback) => void;
  onCancel: () => void;
}) {
  const t = useTranslations("postFeedback");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");

  return (
    <div className="space-y-3 rounded-xl border border-ink/10 p-4">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-1 text-xs text-ink/60">{t("lead")}</p>
      </div>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t("reasonLabel")}>
        {FEEDBACK_REASONS.map((item) => (
          <button
            key={item}
            type="button"
            role="radio"
            aria-checked={reason === item}
            onClick={() => setReason(reason === item ? "" : item)}
            className={cn(
              "min-h-11 rounded-full border px-4 text-sm transition-colors",
              reason === item ? "border-foreground bg-foreground text-background" : "border-ink/15 text-ink/80",
            )}
          >
            {t(`reasons.${item}`)}
          </button>
        ))}
      </div>
      <label className="block space-y-1">
        <span className="text-xs text-ink/60">{t("noteLabel")}</span>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={500}
          rows={2}
          placeholder={t("notePlaceholder")}
          className="w-full rounded-lg border border-ink/15 bg-transparent p-3 text-sm"
        />
      </label>
      <div className="grid gap-2 sm:grid-cols-2">
        <Button
          type="button"
          className="min-h-11 w-full"
          disabled={pending}
          onClick={() => onConfirm({ reason, note: note.trim() })}
        >
          {confirmLabel}
        </Button>
        <Button type="button" variant="outline" className="min-h-11 w-full" disabled={pending} onClick={onCancel}>
          {t("cancel")}
        </Button>
      </div>
    </div>
  );
}
