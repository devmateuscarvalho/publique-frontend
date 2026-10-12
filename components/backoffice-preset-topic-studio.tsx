"use client";

import type { RefObject } from "react";
import { useTranslations } from "next-intl";

import { BrandTokenButtons, LogoPlacementGrid, ResolvedPromptDisclosure } from "@/components/backoffice-preset-widgets";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { type BrandToken, type LogoPlacement, DECK_TOKENS, setScriptKey } from "@/lib/backoffice-preset-shared";
import { logoPlacements } from "@/lib/post-template";

export function BackofficePresetTopicStudio({
  isNew,
  promptImage,
  promptImageRef,
  labVisualFormat,
  labTheme,
  labTopicTitle,
  labTopicAngle,
  labSlideCount,
  includeLogo,
  logoPlacement,
  resultText,
  unknownImageTokens,
  resolvedScript,
  onPromptImage,
  onFormat,
  onTheme,
  onIncludeLogo,
  onLogoPlacement,
  onInsertToken,
}: {
  isNew: boolean;
  promptImage: string;
  promptImageRef: RefObject<HTMLTextAreaElement | null>;
  labVisualFormat: "single" | "carousel";
  labTheme: "light" | "dark" | "random";
  labTopicTitle: string;
  labTopicAngle: string;
  labSlideCount: number;
  includeLogo: boolean;
  logoPlacement: LogoPlacement;
  resultText: string;
  unknownImageTokens: string[];
  resolvedScript: string;
  onPromptImage: (value: string) => void;
  onFormat: (value: "single" | "carousel") => void;
  onTheme: (value: "light" | "dark" | "random") => void;
  onIncludeLogo: (value: boolean) => void;
  onLogoPlacement: (value: LogoPlacement) => void;
  onInsertToken: (token: BrandToken) => void;
}) {
  const t = useTranslations("backoffice");
  const creation = useTranslations("creation");

  return (
    <div className="space-y-5">
      <div className="space-y-4 rounded-xl border border-border p-4">
        <div>
          <p className="text-sm font-medium">{t("labTopic")}</p>
          <p className="text-sm text-ink/70">{t("labTopicAutoHint")}</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="lab-visual-format">{t("labVisualFormat")}</Label>
          <Select
            value={labVisualFormat}
            onValueChange={(value) => {
              const next = value === "single" ? "single" : "carousel";
              onFormat(next);
              if (promptImage.trim()) {
                onPromptImage(setScriptKey(promptImage, "format", next));
              }
            }}
          >
            <SelectTrigger id="lab-visual-format" className="min-h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="carousel">{t("labVisualFormatCarousel")}</SelectItem>
              <SelectItem value="single">{t("labVisualFormatSingle")}</SelectItem>
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
            {labVisualFormat === "carousel" && labSlideCount >= 3 ? (
              <p className="text-ink/55">
                {t("labSlideCount")}: {labSlideCount}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-ink/55">{t("labTopicEmptyResult")}</p>
        )}
      </div>

      {labVisualFormat === "single" ? (
        <div className="space-y-3 rounded-xl border border-border p-3">
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input
              id="preset-include-logo"
              type="checkbox"
              className="size-5"
              checked={includeLogo}
              onChange={(event) => onIncludeLogo(event.target.checked)}
            />
            <span>
              <span className="font-medium">{t("includeLogo")}</span>
              <span className="mt-0.5 block text-ink/70">{t("includeLogoSingleHint")}</span>
            </span>
          </label>
          {includeLogo ? (
            <div className="space-y-2 border-t border-border pt-3">
              <Label>{t("logoPlacement")}</Label>
              <p className="text-sm text-ink/70">{t("logoPlacementSingleHint")}</p>
              <Select value={logoPlacement} onValueChange={(value) => onLogoPlacement(value as LogoPlacement)}>
                <SelectTrigger className="min-h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {logoPlacements.map((item) => (
                    <SelectItem key={item} value={item}>
                      {creation(`logoPlacements.${item}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <LogoPlacementGrid value={logoPlacement} onChange={onLogoPlacement} />
            </div>
          ) : null}
        </div>
      ) : null}

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
          <ResolvedPromptDisclosure value={resolvedScript} />
        </div>
      ) : !isNew ? (
        <p className="text-sm text-ink/55">{t("labDeckScriptEmpty")}</p>
      ) : null}

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
