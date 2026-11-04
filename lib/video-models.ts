export const videoAspects = ["9:16", "1:1", "16:9"] as const;

export type VideoAspect = (typeof videoAspects)[number];

export const videoModels = [
  {
    id: "seedance2_5",
    labelKey: "seedance25",
    blurbKey: "seedance",
    aspects: ["9:16", "1:1", "16:9"],
    references: true,
  },
  {
    id: "seedance2",
    labelKey: "seedance20",
    blurbKey: "seedance",
    aspects: ["9:16", "1:1", "16:9"],
    references: true,
  },
  {
    id: "seedance2_fast",
    labelKey: "seedance20Fast",
    blurbKey: "seedance",
    aspects: ["9:16", "1:1", "16:9"],
    references: true,
  },
  {
    id: "seedance2_mini",
    labelKey: "seedance20Mini",
    blurbKey: "seedance",
    aspects: ["9:16", "1:1", "16:9"],
    references: true,
  },
  {
    id: "kling3.0_standard",
    labelKey: "kling30",
    blurbKey: "kling",
    aspects: ["9:16", "1:1", "16:9"],
    references: false,
  },
  {
    id: "kling3.0_pro",
    labelKey: "kling30Pro",
    blurbKey: "kling",
    aspects: ["9:16", "1:1", "16:9"],
    references: false,
  },
  {
    id: "veo3.1",
    labelKey: "veo31",
    blurbKey: "veo",
    aspects: ["9:16", "16:9"],
    references: false,
  },
  {
    id: "gen4.5",
    labelKey: "gen45",
    blurbKey: "gen4",
    aspects: ["9:16", "16:9"],
    references: false,
  },
] as const;

export type VideoModelId = (typeof videoModels)[number]["id"];

const legacyVideoModels: Record<string, VideoModelId> = {
  "fal-ai/kling-video/v2.5-turbo/pro/text-to-video": "kling3.0_pro",
  "fal-ai/kling-video/v2.5-turbo/pro/image-to-video": "kling3.0_pro",
  "kling2.5_turbo_pro": "kling3.0_pro",
  "fal-ai/kling-video/v3/standard/text-to-video": "kling3.0_standard",
  "fal-ai/kling-video/v3/standard/image-to-video": "kling3.0_standard",
  "fal-ai/kling-video/v3/pro/text-to-video": "kling3.0_pro",
  "fal-ai/kling-video/v3/pro/image-to-video": "kling3.0_pro",
  klingO3_standard: "seedance2_5",
  klingO3_pro: "seedance2_5",
  "fal-ai/veo3.1": "veo3.1",
  "fal-ai/veo3.1/image-to-video": "veo3.1",
};

export function videoModelById(id: string | undefined | null) {
  const mapped = (id && legacyVideoModels[id]) || id;
  return videoModels.find((item) => item.id === mapped) ?? videoModels[0];
}

export function normalizeVideoModel(id: string | undefined | null): VideoModelId {
  return videoModelById(id).id;
}

export function aspectsForModel(id: string | undefined | null): readonly VideoAspect[] {
  return videoModelById(id).aspects;
}

export function modelsForAspect(aspect: string | undefined | null) {
  if (aspect !== "9:16" && aspect !== "1:1" && aspect !== "16:9") {
    return videoModels;
  }
  const allowed = videoModels.filter((item) => (item.aspects as readonly string[]).includes(aspect));
  return allowed.length > 0 ? allowed : videoModels;
}
