export type ContentFormat = "image" | "carousel" | "video";

const CONTENT_FORMATS = new Set<string>(["image", "carousel", "video"]);

/** Legacy output_kind codes that used to be the new-look hub. */
const KIND_TO_FORMAT: Record<string, { format: ContentFormat; subject?: string }> = {
  avatar: { format: "image", subject: "avatar" },
  product: { format: "image", subject: "product" },
  mascot: { format: "image", subject: "mascot" },
  team: { format: "image", subject: "team" },
  market_topic: { format: "carousel", subject: "market_topic" },
};

/** Portuguese / typo aliases → canonical content_format. */
const FORMAT_ALIASES: Record<string, ContentFormat> = {
  image: "image",
  imagem: "image",
  carousel: "carousel",
  carrosel: "carousel",
  carrossel: "carousel",
  video: "video",
  vídeo: "video",
};

export function isContentFormat(value: string): value is ContentFormat {
  return CONTENT_FORMATS.has(value);
}

/** Normalize a URL segment to a content format (accepts aliases). */
export function normalizeFormatParam(param: string): ContentFormat | null {
  const code = param.trim().toLowerCase();
  if (!code) {
    return null;
  }
  return FORMAT_ALIASES[code] ?? null;
}

export function presetLabNewPath(format: ContentFormat): string {
  return `/backoffice/presets/${format}/new`;
}

export function presetLabEditPath(format: ContentFormat, presetId: string): string {
  return `/backoffice/presets/${format}/${presetId}`;
}

export function presetLabPathFromPreset(preset: {
  id: string;
  content_format?: string | null;
  output_kind?: string | null;
}): string {
  const fromField = normalizeFormatParam(preset.content_format ?? "");
  if (fromField && fromField !== "video") {
    return presetLabEditPath(fromField, preset.id);
  }
  if (preset.output_kind === "market_topic") {
    return presetLabEditPath("carousel", preset.id);
  }
  return presetLabEditPath("image", preset.id);
}

export function resolveNewPresetRoute(param: string): {
  format: ContentFormat;
  subject?: string;
  legacyRedirect?: string;
} | null {
  const code = param.trim().toLowerCase();
  if (!code) {
    return null;
  }
  const asFormat = normalizeFormatParam(code);
  if (asFormat) {
    return { format: asFormat };
  }
  const mapped = KIND_TO_FORMAT[code];
  if (!mapped) {
    return null;
  }
  return {
    format: mapped.format,
    subject: mapped.subject,
    legacyRedirect: presetLabNewPath(mapped.format),
  };
}

export function defaultSubjectForFormat(format: ContentFormat): string {
  return format === "carousel" ? "market_topic" : "avatar";
}
