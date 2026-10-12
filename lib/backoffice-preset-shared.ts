import { logoPlacements } from "@/lib/post-template";

export const LAB_BRAND_KEY = "backoffice.labBrandId";

export type LogoPlacement = (typeof logoPlacements)[number];
export type RefRole = "location" | "person";

export const LOGO_CLEAR_ZONES: Record<LogoPlacement, string> = {
  top_left:
    "Real brand logo will be pasted top-left later. Keep upper-left ~20% clear/soft/low-detail; focus center-right or lower-right.",
  top_right:
    "Real brand logo will be pasted top-right later. Keep upper-right ~20% clear/soft/low-detail; focus center-left or lower-left.",
  bottom_left:
    "Real brand logo will be pasted bottom-left later. Keep lower-left ~20% clear/soft/low-detail; focus upper-right or center-right.",
  bottom_right:
    "Real brand logo will be pasted bottom-right later. Keep lower-right ~20% clear/soft/low-detail; focus upper-left or center-left.",
  center: "Real brand logo will be pasted center later. Keep middle ~25% soft/open; main subject off-center.",
};

export function appendLogoClearZone(prompt: string, include: boolean, placement: LogoPlacement): string {
  if (!include) {
    return prompt.trim();
  }
  const zone = LOGO_CLEAR_ZONES[placement] || LOGO_CLEAR_ZONES.bottom_right;
  const base = prompt.trim();
  return base ? `${base}\n\n${zone}` : zone;
}

export function isPersonRole(role: string | undefined): boolean {
  return role === "person" || role === "reference";
}

export function isLocationRole(role: string | undefined): boolean {
  return role === "location";
}

function productReferenceGuidance(n: number): string {
  const sameProduct =
    "These are PRODUCT photos of the SAME product (shape, materials, colors, branding marks, packaging). Each photo may show a different angle or detail of that one product. Keep that same identifiable product recognizably consistent in the result. Do not invent a different product or treat the photos as separate products.";
  if (n === 1) return `Image 1 is a PRODUCT photo. ${sameProduct}`;
  if (n === 2) return `Images 1 and 2 are PRODUCT photos. ${sameProduct}`;
  return `Images 1, 2, and 3 are PRODUCT photos. ${sameProduct}`;
}

export function referenceSceneGuidance(outputKind: string, personCount: number, hasLocation: boolean): string {
  let n = Math.min(Math.max(personCount, 0), 3);
  const avatar = outputKind === "avatar";
  const product = outputKind === "product";
  if (avatar && n > 1) {
    n = 1;
  }
  if (n === 0 && !hasLocation) {
    return "";
  }
  const parts = ["Reference images are attached in order. Follow this mapping exactly."];
  if (avatar) {
    if (n >= 1) {
      parts.push(
        "Image 1 is the AVATAR person (face, hair, skin tone, body type, clothing). Keep that same identifiable person recognizably consistent in the result. Place them in a new scene matching the prompt; do not invent a different person and do not add extra people from the reference.",
      );
    }
  } else if (product) {
    if (n > 0) {
      parts.push(productReferenceGuidance(n));
    }
  } else if (n === 1) {
    parts.push(
      "Image 1 is ONE person only (face, hair, skin tone, body type, clothing). Keep that same identifiable person recognizably consistent in the result. Do not invent a different person and do not add extra people from the reference.",
    );
  } else if (n === 2) {
    parts.push(
      "Images 1 and 2 are TWO different people — each photo is exactly one distinct person. Keep both identifiable people recognizably consistent (face, hair, skin tone, body type). Do not merge them into one person, swap identities, or invent additional people.",
    );
  } else if (n === 3) {
    parts.push(
      "Images 1, 2, and 3 are THREE different people — each photo is exactly one distinct person. Keep all three identifiable people recognizably consistent (face, hair, skin tone, body type). Do not merge, swap, or invent people beyond those three.",
    );
  }
  if (hasLocation) {
    parts.push(
      `Image ${n + 1} is the LOCATION / environment reference (place, architecture, furniture, lighting, atmosphere). Use it as the setting for the scene. Adapt crop and brand styling to the prompt while staying faithful to that place; do not invent an unrelated environment when this reference is present.`,
    );
  }
  if (n > 0 && hasLocation) {
    parts.push(
      avatar
        ? "Place the referenced avatar person into the referenced location unless the prompt clearly requires otherwise."
        : product
          ? "Place the referenced product into the referenced location unless the prompt clearly requires otherwise."
          : "Place the referenced people into the referenced location unless the prompt clearly requires otherwise.",
    );
  }
  return parts.join(" ");
}

export function appendReferenceSceneGuidance(
  prompt: string,
  outputKind: string,
  personCount: number,
  hasLocation: boolean,
): string {
  const guide = referenceSceneGuidance(outputKind, personCount, hasLocation);
  const base = prompt.trim();
  if (!guide) {
    return base;
  }
  return base ? `${base}\n\n${guide}` : guide;
}

export const PRODUCT_TOKENS = ["product.name", "product.price", "product.description"] as const;
export const TOPIC_TOKENS = ["topic.title", "topic.angle", "topic.image_mood"] as const;
export const STYLE_TOKENS = [
  "brand.color.primary",
  "brand.color.secondary",
  "brand.color.accent",
  "brand.color.background",
  "brand.color.text",
  "brand.font.heading",
  "brand.font.body",
] as const;
export const DECK_TOKENS = [
  "brand.name",
  ...STYLE_TOKENS,
  "brand.logo",
  "brand.logo_inverted",
  ...TOPIC_TOKENS,
] as const;

export const IMAGE_TOKENS = [
  "brand.name",
  "brand.description",
  "brand.audience",
  "brand.services",
  "brand.tone",
  "brand.people_guidance",
  "brand.attire",
  "brand.environment",
  "brand.colors",
  "brand.typography",
  "brand.locale",
  ...PRODUCT_TOKENS,
  ...TOPIC_TOKENS,
] as const;

export const TEXT_TOKENS = [
  "brand.name",
  "brand.description",
  "brand.audience",
  "brand.services",
  "brand.products",
  "brand.tone",
  "brand.attire",
  "brand.environment",
  "brand.locale",
  "brand.country",
  ...PRODUCT_TOKENS,
  ...TOPIC_TOKENS,
] as const;

export type BrandToken = (typeof IMAGE_TOKENS)[number] | (typeof TEXT_TOKENS)[number] | (typeof DECK_TOKENS)[number];

export function tokenLabelKey(token: BrandToken): string {
  if (token.startsWith("product.") || token.startsWith("topic.")) {
    return token.replace(/\./g, "_");
  }
  return token.replace(/^brand\./, "").replace(/\./g, "_");
}

export function filterKindTokens(tokens: readonly BrandToken[], kind: string): BrandToken[] {
  return tokens.filter((token) => {
    if (token.startsWith("product.")) {
      return kind === "product";
    }
    if (token.startsWith("topic.")) {
      return kind === "market_topic";
    }
    return true;
  });
}

export function scriptKey(script: string, key: string): string {
  const match = script.match(new RegExp(`^${key}:\\s*(.*)$`, "m"));
  return match?.[1]?.trim() ?? "";
}

export function setScriptKey(script: string, key: string, value: string): string {
  const line = `${key}: ${value}`;
  const re = new RegExp(`^${key}:\\s*.*$`, "m");
  if (re.test(script)) {
    return script.replace(re, line);
  }
  if (!script.trim()) {
    return `${line}\n`;
  }
  return `${line}\n${script}`;
}

export function slugFileBase(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "preset";
}

export function formatFileMeta(file: File) {
  const ext = file.name.includes(".") ? file.name.split(".").pop()?.toUpperCase() : "";
  const kb = Math.max(1, Math.round(file.size / 1024));
  return ext ? `${ext} · ${kb} KB` : `${kb} KB`;
}

const TOKEN_RE = /\{\{\s*([a-z0-9_.]+)\s*\}\}/g;
const KNOWN = new Set<string>([...IMAGE_TOKENS, ...TEXT_TOKENS, ...DECK_TOKENS]);

export function findUnknownTokens(template: string): string[] {
  const found = new Set<string>();
  for (const match of template.matchAll(TOKEN_RE)) {
    const key = match[1];
    if (!KNOWN.has(key)) {
      found.add(key);
    }
  }
  return [...found];
}

export function resolveTemplate(template: string, tokens: Record<string, string>): string {
  return template.replace(TOKEN_RE, (_raw, key: string) => {
    if (!KNOWN.has(key)) {
      return `{{${key}}}`;
    }
    return tokens[key] ?? "";
  });
}

export function readStoredBrandId(): string {
  if (typeof window === "undefined") {
    return "";
  }
  return window.localStorage.getItem(LAB_BRAND_KEY) ?? "";
}

export function isLabImageKind(kind: string): boolean {
  return kind !== "market_topic";
}
