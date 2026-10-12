import { useTranslations } from "next-intl";
import { useCallback } from "react";

type Messages = {
  (key: string): string;
  has: (key: string) => boolean;
};

type PresetCopy = {
  name?: string;
  name_key?: string;
  blurb?: string;
  blurb_key?: string;
  style_key?: string;
};

export function presetNameKey(styleKey: string): string {
  return `presets.${styleKey.trim()}`;
}

export function presetBlurbKey(styleKey: string): string {
  return `presets.${styleKey.trim()}-blurb`;
}

export function resolvePresetCopy(
  t: Messages,
  raw: string | undefined,
  styleKey: string | undefined,
  kind: "name" | "blurb",
): string {
  const stored = (raw || "").trim();
  const derived = styleKey ? (kind === "name" ? presetNameKey(styleKey) : presetBlurbKey(styleKey)) : "";
  for (const key of [stored, derived]) {
    if (key && t.has(key)) {
      return t(key);
    }
  }
  return stored || derived;
}

export function usePresetCopy() {
  const t = useTranslations() as Messages;
  const name = useCallback(
    (preset: PresetCopy) => resolvePresetCopy(t, preset.name || preset.name_key, preset.style_key, "name"),
    [t],
  );
  const blurb = useCallback(
    (preset: PresetCopy) => resolvePresetCopy(t, preset.blurb || preset.blurb_key, preset.style_key, "blurb"),
    [t],
  );
  return { name, blurb };
}
