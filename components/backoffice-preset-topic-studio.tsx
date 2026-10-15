"use client";

import type { RefObject } from "react";
import { useTranslations } from "next-intl";

import {
  BrandTokenButtons,
  EffectivePromptPanel,
  type EffectivePrompt,
} from "@/components/backoffice-preset-widgets";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { type BrandToken, DECK_TOKENS, setScriptKey } from "@/lib/backoffice-preset-shared";

export function BackofficePresetTopicStudio({
  isNew,
  promptImage,
  promptImageRef,
  labTheme,
  labLayout,
  labTopicTitle,
  labTopicAngle,
  labSlideCount,
  resultText,
  unknownImageTokens,
  effectivePrompts,
  onPromptImage,
  onTheme,
  onLayout,
  onInsertToken,
}: {
  isNew: boolean;
  promptImage: string;
  promptImageRef: RefObject<HTMLTextAreaElement | null>;
  labTheme: "light" | "dark" | "random";
  labLayout: "editorial" | "statement" | "steps";
  labTopicTitle: string;
  labTopicAngle: string;
  labSlideCount: number;
  resultText: string;
  unknownImageTokens: string[];
  effectivePrompts: readonly EffectivePrompt[];
  onPromptImage: (value: string) => void;
  onTheme: (value: "light" | "dark" | "random") => void;
  onLayout: (value: "editorial" | "statement" | "steps") => void;
  onInsertToken: (token: BrandToken) => void;
}) {
  const t = useTranslations("backoffice");

  return (
    <div className="space-y-5">
      <div className="space-y-4 rounded-xl border border-border p-4">
        <div>
          <p className="text-sm font-medium">{t("labTopic")}</p>
          <p className="text-sm text-ink/70">{t("labTopicAutoHint")}</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="lab-layout">{t("labLayout")}</Label>
          <p className="text-sm text-ink/70">{t("labLayoutHint")}</p>
          <Select
            value={labLayout}
            onValueChange={(value) => {
              const next =
                value === "statement" || value === "steps" ? value : "editorial";
              onLayout(next);
              if (promptImage.trim()) {
                onPromptImage(setScriptKey(promptImage, "layout", next));
              }
            }}
          >
            <SelectTrigger id="lab-layout" className="min-h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="editorial">{t("labLayoutEditorial")}</SelectItem>
              <SelectItem value="statement">{t("labLayoutStatement")}</SelectItem>
              <SelectItem value="steps">{t("labLayoutSteps")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="lab-theme">{t("labTheme")}</Label>
          <p className="text-sm text-ink/70">{t("labThemeHint")}</p>
          <Select
            value={labTheme}
            onValueChange={(value) => {
              const next = value === "light" || value === "random" ? value : "dark";
              onTheme(next);
              if (promptImage.trim()) {
                onPromptImage(setScriptKey(promptImage, "theme", next));
              }
            }}
          >
            <SelectTrigger id="lab-theme" className="min-h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dark">{t("labThemeDark")}</SelectItem>
              <SelectItem value="light">{t("labThemeLight")}</SelectItem>
              <SelectItem value="random">{t("labThemeRandom")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {labTopicTitle.trim() ? (
          <div className="space-y-1 rounded-lg bg-muted/30 p-3 text-sm">
            <p className="font-medium text-ink">
              {t("labTopicTitle")}: {labTopicTitle}
            </p>
            {labTopicAngle.trim() ? (
              <p className="text-ink/70">
                {t("labTopicAngle")}: {labTopicAngle}
              </p>
            ) : null}
            {labSlideCount >= 3 ? (
              <p className="text-ink/55">
                {t("labSlideCount")}: {labSlideCount}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-ink/55">{t("labTopicEmptyResult")}</p>
        )}
      </div>

      {promptImage.trim() ? (
        <div className="space-y-3 rounded-xl border border-border p-4">
          <div>
            <Label htmlFor="preset-deck-script">{t("labDeckScript")}</Label>
            <p className="mt-1 text-sm text-ink/70">{t("labDeckScriptHint")}</p>
          </div>
          <BrandTokenButtons tokens={DECK_TOKENS} onInsert={onInsertToken} />
          <Textarea
            id="preset-deck-script"
            ref={promptImageRef}
            className="min-h-80 font-mono text-sm leading-relaxed"
            value={promptImage}
            onChange={(event) => onPromptImage(event.target.value)}
          />
          {unknownImageTokens.length ? (
            <p className="text-sm text-destructive">{t("unknownTokens", { tokens: unknownImageTokens.join(", ") })}</p>
          ) : null}
          <EffectivePromptPanel prompts={effectivePrompts} />
        </div>
      ) : !isNew ? (
        <>
          <p className="text-sm text-ink/55">{t("labDeckScriptEmpty")}</p>
          <EffectivePromptPanel prompts={effectivePrompts} />
        </>
      ) : (
        <EffectivePromptPanel prompts={effectivePrompts} />
      )}

      {resultText.trim() ? (
        <div className="space-y-2">
          <Label>{t("resultText")}</Label>
          <p className="text-sm text-ink/70">{t("resultTextHint")}</p>
          <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-muted/20 p-3 text-sm leading-relaxed text-ink">
            {resultText}
          </pre>
        </div>
      ) : null}
      {isNew ? <p className="text-sm text-ink/70">{t("saveBeforeGenerate")}</p> : null}
    </div>
  );
}
