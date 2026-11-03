export const videoModels = [
  { id: "fal-ai/kling-video/v2.5-turbo/pro/text-to-video", labelKey: "kling25Pro" },
  { id: "fal-ai/kling-video/v3/standard/text-to-video", labelKey: "kling3Standard" },
  { id: "fal-ai/kling-video/v3/pro/text-to-video", labelKey: "kling3Pro" },
] as const;

export type VideoModelId = (typeof videoModels)[number]["id"];

export function normalizeVideoModel(id: string | undefined | null): VideoModelId {
  const found = videoModels.find((item) => item.id === id);
  return found?.id ?? videoModels[0].id;
}
