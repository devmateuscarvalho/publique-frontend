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

/**
 * Resolve gallery/lab copy from the stored name/blurb i18n key.
 * When a key is stored, never fall back to style_key — that hid author edits
 * (e.g. renaming presets.avatar → presets.foo still showed "Avatar").
 */
export function resolvePresetCopy(
  t: Messages,
  raw: string | undefined,
  styleKey: string | undefined,
  kind: "name" | "blurb",
): string {
  const stored = (raw || "").trim();
  if (stored) {
    if (t.has(stored)) {
      return t(stored);
    }
    return stored;
  }
  const derived = styleKey ? (kind === "name" ? presetNameKey(styleKey) : presetBlurbKey(styleKey)) : "";
  if (derived && t.has(derived)) {
    return t(derived);
  }
  return derived;
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
