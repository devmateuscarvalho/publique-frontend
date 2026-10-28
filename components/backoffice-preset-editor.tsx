"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Loader2 } from "lucide-react";
import JSZip from "jszip";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { type RefObject, useEffect, useMemo, useRef, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { BackofficePresetProductFields } from "@/components/backoffice-preset-product-fields";
import { BackofficePresetTopicStudio } from "@/components/backoffice-preset-topic-studio";
import { ConfirmAlertDialog } from "@/components/confirm-alert-dialog";
import { LibraryPhoto } from "@/components/library-photo";
import {
  BrandTokenButtons,
  EffectivePromptPanel,
  LogoPlacementGrid,
  type EffectivePrompt,
} from "@/components/backoffice-preset-widgets";
import { InstagramPhonePreview } from "@/components/instagram-phone-preview";
import { useAccount } from "@/components/use-account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ApiError, api, type BackofficeBrand, type BrandItem, type OutputKind, type PromptPreset } from "@/lib/api";
import { appToast } from "@/lib/app-toast";
import {
  LAB_BRAND_KEY,
  type BrandToken,
  type LogoPlacement,
  IMAGE_TOKENS,
  TEXT_TOKENS,
  appendLogoClearZone,
  appendReferenceSceneGuidance,
  filterKindTokens,
  findUnknownTokens,
  readStoredBrandId,
  resolveTemplate,
  scriptKey,
  slugFileBase,
} from "@/lib/backoffice-preset-shared";
import {
  type ContentFormat,
  defaultSubjectForFormat,
  presetLabEditPath,
  presetLabPathFromPreset,
} from "@/lib/content-format";
import { orderedItemImages } from "@/lib/generation-assets";
import { itemMatchesLook } from "@/lib/look-fits";
import { logoPlacements } from "@/lib/post-template";

function imageExtension(url: string, contentType: string): string {
  const type = contentType.split(";")[0]?.trim().toLowerCase() ?? "";
  if (type === "image/jpeg" || type === "image/jpg") return "jpg";
  if (type === "image/webp") return "webp";
  if (type === "image/gif") return "gif";
  if (type === "image/png") return "png";
  const match = url.split("?")[0]?.match(/\.([a-z0-9]+)$/i);
  const ext = match?.[1]?.toLowerCase();
  if (ext === "jpeg") return "jpg";
  if (ext && ["png", "jpg", "webp", "gif"].includes(ext)) return ext;
  return "png";
}

async function downloadImagesAsZip(urls: string[], zipName: string, fileBase: string) {
  const zip = new JSZip();
  for (const [index, url] of urls.entries()) {
    const response = await fetch(url, { credentials: "include" });
    if (!response.ok) {
      throw new Error("download_failed");
    }
    const blob = await response.blob();
    const ext = imageExtension(url, blob.type);
    zip.file(`${fileBase}-${String(index + 1).padStart(2, "0")}.${ext}`, blob);
  }
  const archive = await zip.generateAsync({ type: "blob" });
  const objectUrl = URL.createObjectURL(archive);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = zipName;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}

export function BackofficePresetEditor({
  presetId,
  kind,
  format,
}: {
  presetId?: string;
  kind?: string;
  format?: ContentFormat;
}) {
  const t = useTranslations("backoffice");
  const wizardCopy = useTranslations("wizard");
  const creation = useTranslations("creation");
  const messages = useTranslations();
  const errors = useTranslations("errors");
  const router = useRouter();
  const queryClient = useQueryClient();
  const { me, loading } = useAccount();
  const isSuperAdmin = me.data?.user.platform_role === "super_admin";
  const isNew = !presetId;
  const promptImageRef = useRef<HTMLTextAreaElement>(null);
  const promptTextRef = useRef<HTMLTextAreaElement>(null);

  const kindsQuery = useQuery({
    queryKey: ["output-kinds", "catalog"],
    queryFn: () => api<{ output_kinds: OutputKind[] }>("/v1/output-kinds?published=false"),
    enabled: isSuperAdmin,
  });

  const brandsQuery = useQuery({
    queryKey: ["backoffice-brands"],
    queryFn: () => api<{ brands: BackofficeBrand[] }>("/v1/backoffice/brands"),
    enabled: isSuperAdmin,
  });

  const presetQuery = useQuery({
    queryKey: ["backoffice-prompt-preset", presetId],
    queryFn: () => api<{ prompt_preset: PromptPreset }>(`/v1/backoffice/prompt-presets/${presetId}`),
    enabled: isSuperAdmin && Boolean(presetId),
  });

  const [contentFormat, setContentFormat] = useState<ContentFormat>(() => format ?? "image");
  const [outputKind, setOutputKind] = useState(() => {
    const subject = kind?.trim();
    if (subject) {
      return subject;
    }
    return defaultSubjectForFormat(format ?? "image");
  });
  const [name, setName] = useState("");
  const [blurb, setBlurb] = useState("");
  const [promptImage, setPromptImage] = useState("");
  const [promptText, setPromptText] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [previewPath, setPreviewPath] = useState("");
  const [assets, setAssets] = useState<PromptPreset["assets"]>([]);
  const [labBrandId, setLabBrandId] = useState("");
  const [labItemId, setLabItemId] = useState("");
  const [labPlaceId, setLabPlaceId] = useState("");
  const [labProductName, setLabProductName] = useState("");
  const [labProductPrice, setLabProductPrice] = useState("");
  const [labProductDescription, setLabProductDescription] = useState("");
  const [labTopicTitle, setLabTopicTitle] = useState("");
  const [labTopicAngle, setLabTopicAngle] = useState("");
  const [labTopicMood, setLabTopicMood] = useState("");
  const [labSlideCount, setLabSlideCount] = useState(4);
  const [labVisualFormat, setLabVisualFormat] = useState<"carousel">("carousel");
  const [labTheme, setLabTheme] = useState<"light" | "dark" | "random">("dark");
  const [labLayout, setLabLayout] = useState<"editorial" | "statement" | "steps">("editorial");
  const [carouselSlideIndex, setCarouselSlideIndex] = useState(0);
  const [effectiveImage, setEffectiveImage] = useState<EffectivePrompt | null>(null);
  const [effectiveCaption, setEffectiveCaption] = useState<EffectivePrompt | null>(null);
  const [effectivePrompts, setEffectivePrompts] = useState<EffectivePrompt[]>([]);
  const [includeLogo, setIncludeLogo] = useState(true);
  const [fitKeys, setFitKeys] = useState<string[]>([]);
  const [logoPlacement, setLogoPlacement] = useState<LogoPlacement>("bottom_right");
  const [resultText, setResultText] = useState("");
  const [downloadingImages, setDownloadingImages] = useState(false);

  useEffect(() => {
    setLabBrandId(readStoredBrandId());
  }, []);

  useEffect(() => {
    if (!isNew) {
      return;
    }
    if (format === "image" || format === "carousel") {
      setContentFormat(format);
    }
    const next = kind?.trim() ?? "";
    if (next) {
      setOutputKind(next);
    } else if (format) {
      setOutputKind(defaultSubjectForFormat(format));
    }
  }, [isNew, kind, format]);

  useEffect(() => {
    if (!isNew) {
      return;
    }
    if (format !== "image" && format !== "carousel") {
      router.replace("/backoffice/presets/new");
    }
  }, [isNew, format, router]);

  // Keep the URL format segment aligned with the stored content_format.
  useEffect(() => {
    if (isNew || !presetId || !format) {
      return;
    }
    const preset = presetQuery.data?.prompt_preset;
    if (!preset) {
      return;
    }
    const canonical = presetLabPathFromPreset(preset);
    const current = presetLabEditPath(format, presetId);
    if (canonical !== current) {
      router.replace(canonical);
    }
  }, [isNew, presetId, format, presetQuery.data?.prompt_preset, router]);

  useEffect(() => {
    if (!isNew || !kindsQuery.isSuccess || contentFormat !== "image") {
      return;
    }
    const kinds = (kindsQuery.data?.output_kinds ?? []).filter((item) => item.code !== "market_topic");
    if (!kinds.some((item) => item.code === outputKind) && kinds[0]) {
      setOutputKind(kinds[0].code);
    }
  }, [isNew, contentFormat, kindsQuery.data?.output_kinds, kindsQuery.isSuccess, outputKind]);

  useEffect(() => {
    const preset = presetQuery.data?.prompt_preset;
    if (!preset) {
      return;
    }
    setOutputKind(preset.output_kind);
    setContentFormat(
      preset.content_format === "carousel" ||
        preset.content_format === "video" ||
        preset.content_format === "image"
        ? preset.content_format
        : preset.output_kind === "market_topic"
          ? "carousel"
          : "image",
    );
    setName(preset.name);
    setBlurb(preset.blurb || "");
    setPromptImage(preset.prompt_image || preset.example_prompt || "");
    setPromptText(preset.prompt_text || "");
    setEnabled(preset.enabled);
    setPreviewPath(preset.preview_path);
    setAssets(preset.assets ?? []);
    setIncludeLogo(preset.include_logo ?? true);
    setFitKeys((preset.fits ?? []).map((fit) => (fit.subtype ? `${fit.category}:${fit.subtype}` : fit.category)));
    setResultText(preset.result_text || preset.preview_caption || "");
    if (preset.lab_brand_id) {
      setLabBrandId(preset.lab_brand_id);
    }
    setLabProductName(preset.lab_product_name || "");
    setLabProductPrice(preset.lab_product_price || "");
    setLabProductDescription(preset.lab_product_description || "");
    setLabTopicTitle(preset.lab_topic_title || "");
    setLabTopicAngle(preset.lab_topic_angle || "");
    setLabTopicMood(preset.lab_topic_mood || "");
    setLabSlideCount(
      preset.lab_slide_count && preset.lab_slide_count >= 3 && preset.lab_slide_count <= 5
        ? preset.lab_slide_count
        : 4,
    );
    setLabVisualFormat("carousel");
    const scriptTheme = scriptKey(preset.prompt_image || "", "theme");
    setLabTheme(
      scriptTheme === "light" || scriptTheme === "random" ? scriptTheme : "dark",
    );
    const scriptLayout = scriptKey(preset.prompt_image || "", "layout");
    setLabLayout(
      scriptLayout === "statement" || scriptLayout === "steps" ? scriptLayout : "editorial",
    );
    setCarouselSlideIndex(0);
    const placement = preset.logo_placement;
    if (placement && (logoPlacements as readonly string[]).includes(placement)) {
      setLogoPlacement(placement as LogoPlacement);
    }
  }, [presetQuery.data]);

  const brands = useMemo(() => brandsQuery.data?.brands ?? [], [brandsQuery.data]);

  useEffect(() => {
    if (brandsQuery.isLoading) {
      return;
    }
    if (!brands.length) {
      return;
    }
    if (labBrandId && brands.some((item) => item.id === labBrandId)) {
      return;
    }
    const next = brands[0].id;
    setLabBrandId(next);
    setLabItemId("");
    setLabPlaceId("");
    window.localStorage.setItem(LAB_BRAND_KEY, next);
  }, [brands, brandsQuery.isLoading, labBrandId]);

  const contextQuery = useQuery({
    queryKey: ["backoffice-brand-prompt-context", labBrandId],
    queryFn: () =>
      api<{
        tokens: Record<string, string>;
        logo_url?: string;
        logo_inverted_url?: string;
        envelopes?: Record<string, string>;
      }>(`/v1/backoffice/brands/${labBrandId}/prompt-context`),
    enabled: isSuperAdmin && Boolean(labBrandId),
  });

  const labItemsQuery = useQuery({
    queryKey: ["backoffice-brand-items", labBrandId],
    queryFn: () => api<{ items: BrandItem[] }>(`/v1/backoffice/brands/${labBrandId}/items`),
    enabled: isSuperAdmin && Boolean(labBrandId) && contentFormat === "image",
  });
  const labFits = useMemo(
    () =>
      fitKeys.map((key) => {
        const [category, subtype = ""] = key.split(":");
        return { category, subtype };
      }),
    [fitKeys],
  );
  const labSubjectItems = useMemo(
    () =>
      (labItemsQuery.data?.items ?? []).filter(
        (item) => item.category !== "location" && itemMatchesLook(labFits, outputKind, item),
      ),
    [labItemsQuery.data?.items, labFits, outputKind],
  );
  const labPlaces = useMemo(
    () => (labItemsQuery.data?.items ?? []).filter((item) => item.category === "location"),
    [labItemsQuery.data?.items],
  );
  const labSubject = labSubjectItems.find((item) => item.id === labItemId) ?? null;
  const labPlace = labPlaces.find((item) => item.id === labPlaceId) ?? null;
  useEffect(() => {
    if (!labItemsQuery.isSuccess) {
      return;
    }
    if (labItemId && !labSubjectItems.some((item) => item.id === labItemId)) {
      setLabItemId("");
    }
    if (labPlaceId && !labPlaces.some((item) => item.id === labPlaceId)) {
      setLabPlaceId("");
    }
  }, [labItemsQuery.isSuccess, labItemId, labPlaceId, labSubjectItems, labPlaces]);

  const [previewDebounced, setPreviewDebounced] = useState({
    promptImage: "",
    promptText: "",
    includeLogo: true,
    logoPlacement: "bottom_right" as LogoPlacement,
    labProductName: "",
    labProductPrice: "",
    labProductDescription: "",
    labTopicTitle: "",
    labTopicAngle: "",
    labTopicMood: "",
  });
  useEffect(() => {
    const handle = window.setTimeout(() => {
      setPreviewDebounced({
        promptImage,
        promptText,
        includeLogo,
        logoPlacement,
        labProductName,
        labProductPrice,
        labProductDescription,
        labTopicTitle,
        labTopicAngle,
        labTopicMood,
      });
    }, 400);
    return () => window.clearTimeout(handle);
  }, [
    promptImage,
    promptText,
    includeLogo,
    logoPlacement,
    labProductName,
    labProductPrice,
    labProductDescription,
    labTopicTitle,
    labTopicAngle,
    labTopicMood,
  ]);

  const subjectPhotoCount = orderedItemImages(labSubject).length;
  const personCount = outputKind === "avatar" ? (subjectPhotoCount > 0 ? 1 : 0) : Math.min(3, subjectPhotoCount);
  const hasLocationRef = orderedItemImages(labPlace).length > 0;

  const previewPromptsQuery = useQuery({
    queryKey: [
      "backoffice-preview-prompts",
      presetId,
      labBrandId,
      previewDebounced,
      contentFormat,
      labItemId,
      labPlaceId,
      resultText,
    ],
    queryFn: () =>
      api<{
        image?: EffectivePrompt;
        caption?: EffectivePrompt;
        effective_prompts?: EffectivePrompt[];
      }>(`/v1/backoffice/prompt-presets/${presetId}/preview-prompts`, {
        method: "POST",
        body: JSON.stringify({
          brand_id: labBrandId,
          prompt_image: previewDebounced.promptImage,
          prompt_text: previewDebounced.promptText,
          include_logo: previewDebounced.includeLogo,
          logo_placement: previewDebounced.logoPlacement,
          lab_product_name: previewDebounced.labProductName,
          lab_product_price: previewDebounced.labProductPrice,
          lab_product_description: previewDebounced.labProductDescription,
          lab_topic_title: previewDebounced.labTopicTitle,
          lab_topic_angle: previewDebounced.labTopicAngle,
          lab_topic_mood: previewDebounced.labTopicMood,
          previous_caption: resultText,
          item_id: labItemId,
          place_id: labPlaceId,
        }),
      }),
    enabled: isSuperAdmin && !isNew && Boolean(labBrandId) && Boolean(presetId),
    retry: 1,
  });
  const imageTokens = useMemo(() => filterKindTokens(IMAGE_TOKENS, outputKind), [outputKind]);
  const textTokens = useMemo(() => filterKindTokens(TEXT_TOKENS, outputKind), [outputKind]);
  const carouselSlides = useMemo(
    () =>
      (assets ?? [])
        .filter((item) => item.role === "carousel_slide")
        .slice()
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    [assets],
  );

  const promptTokens = useMemo((): Record<string, string> => {
    return {
      ...(contextQuery.data?.tokens ?? {}),
      "product.name": labProductName,
      "product.price": labProductPrice,
      "product.description": labProductDescription,
      "topic.title": labTopicTitle,
      "topic.angle": labTopicAngle,
      "topic.image_mood": labTopicMood,
    };
  }, [
    contextQuery.data?.tokens,
    labProductName,
    labProductPrice,
    labProductDescription,
    labTopicTitle,
    labTopicAngle,
    labTopicMood,
  ]);

  // Live client fallback when preview-prompts is unavailable (or still loading).
  const liveImageEffective = useMemo((): EffectivePrompt | null => {
    if (contentFormat !== "image" || !promptImage.trim() || !labBrandId) {
      return null;
    }
    const recipe = resolveTemplate(promptImage, promptTokens);
    if (!recipe.trim()) {
      return null;
    }
    const withRefs = appendReferenceSceneGuidance(
      recipe,
      outputKind,
      personCount,
      hasLocationRef,
    );
    const withLogo = appendLogoClearZone(withRefs, includeLogo, logoPlacement);
    const quality = contextQuery.data?.envelopes?.image_quality_appendix?.trim() ?? "";
    const sent = quality ? `${withLogo.trim()}\n\n${quality}` : withLogo.trim();
    return { kind: "image", recipe, user: sent, sent };
  }, [
    contentFormat,
    promptImage,
    promptTokens,
    labBrandId,
    outputKind,
    personCount,
    hasLocationRef,
    includeLogo,
    logoPlacement,
    contextQuery.data?.envelopes?.image_quality_appendix,
  ]);

  const liveCaptionEffective = useMemo((): EffectivePrompt | null => {
    if (contentFormat !== "image" || !promptText.trim() || !labBrandId) {
      return null;
    }
    const recipe = resolveTemplate(promptText, promptTokens);
    if (!recipe.trim()) {
      return null;
    }
    const system =
      contextQuery.data?.envelopes?.caption_system?.trim() ||
      "You write premium social captions from a curated brand recipe.";
    const brandName = promptTokens["brand.name"] || "";
    const user = [
      "Brand brief:",
      brandName ? `Brand name: ${brandName}` : null,
      "",
      "Caption recipe (follow this):",
      recipe,
      "",
      "Write one Instagram caption that meets the quality bar and does not repeat a prior subject.",
    ]
      .filter((line) => line !== null)
      .join("\n");
    return {
      kind: "caption",
      recipe,
      system,
      user,
      sent: `=== SYSTEM ===\n${system}\n\n=== USER ===\n${user}`,
    };
  }, [
    contentFormat,
    promptText,
    promptTokens,
    labBrandId,
    contextQuery.data?.envelopes?.caption_system,
  ]);

  const liveCarouselEffective = useMemo((): EffectivePrompt[] => {
    if (contentFormat !== "carousel" || !labBrandId) {
      return [];
    }
    const envelopes = contextQuery.data?.envelopes ?? {};
    const out: EffectivePrompt[] = [];
    const researchSystem = envelopes.carousel_research_system?.trim();
    if (researchSystem) {
      out.push({
        kind: "research",
        system: researchSystem,
        user: "(user message is built at generate time from brand brief + live web snippets)",
        sent: `=== SYSTEM ===\n${researchSystem}\n\n=== USER ===\n(user message is built at generate time from brand brief + live web snippets)`,
      });
    }
    const deckSystem = envelopes.carousel_deck_system?.trim();
    if (deckSystem) {
      out.push({
        kind: "deck",
        system: deckSystem,
        user: "(user message is built at generate time from topic brief + key points + brand style)",
        sent: `=== SYSTEM ===\n${deckSystem}\n\n=== USER ===\n(user message is built at generate time from topic brief + key points + brand style)`,
      });
    }
    if (promptImage.trim()) {
      const resolved = resolveTemplate(promptImage, promptTokens);
      out.push({
        kind: "carousel_script",
        recipe: promptImage,
        user: resolved,
        sent: `=== LOCAL RENDER (not sent to an image model) ===\n${resolved}`,
      });
    }
    return out;
  }, [
    contentFormat,
    labBrandId,
    contextQuery.data?.envelopes,
    promptImage,
    promptTokens,
  ]);

  useEffect(() => {
    // Brand change invalidates last-generate payloads; live preview covers edits.
    setEffectiveImage(null);
    setEffectiveCaption(null);
    setEffectivePrompts([]);
  }, [labBrandId]);

  const unknownImageTokens = useMemo(() => findUnknownTokens(promptImage), [promptImage]);
  const unknownTextTokens = useMemo(() => findUnknownTokens(promptText), [promptText]);
  const unknownTokens = useMemo(
    () => [...new Set([...unknownImageTokens, ...unknownTextTokens])],
    [unknownImageTokens, unknownTextTokens],
  );

  const selectLabBrand = (id: string) => {
    setLabBrandId(id);
    setLabItemId("");
    setLabPlaceId("");
    window.localStorage.setItem(LAB_BRAND_KEY, id);
  };

  const selectLabItem = (id: string) => {
    if (!id || id === "none") {
      setLabItemId("");
      return;
    }
    setLabItemId(id);
    const item = labSubjectItems.find((row) => row.id === id);
    if (!item || (item.category !== "product" && item.category !== "service")) {
      return;
    }
    setLabProductName(item.name);
    setLabProductPrice(item.category === "service" ? "" : item.price_label);
    setLabProductDescription(item.description);
  };

  const insertToken = (
    token: string,
    value: string,
    setValue: (next: string) => void,
    ref: RefObject<HTMLTextAreaElement | null>,
  ) => {
    const el = ref.current;
    const snippet = `{{${token}}}`;
    if (!el) {
      setValue(`${value}${snippet}`);
      return;
    }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? start;
    const next = value.slice(0, start) + snippet + value.slice(end);
    setValue(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + snippet.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const insertImageToken = (token: BrandToken) => {
    insertToken(token, promptImage, setPromptImage, promptImageRef);
  };

  const insertTextToken = (token: BrandToken) => {
    insertToken(token, promptText, setPromptText, promptTextRef);
  };

  const save = useMutation({
    mutationFn: async () => {
      if (unknownTokens.length) {
        throw new ApiError("invalid_input");
      }
      const body = {
        output_kind: contentFormat === "carousel" ? "market_topic" : outputKind,
        content_format: contentFormat,
        name,
        blurb,
        prompt_image: promptImage,
        prompt_text: promptText,
        lab_brand_id: labBrandId || "",
        lab_product_name: labProductName,
        lab_product_price: labProductPrice,
        lab_product_description: labProductDescription,
        lab_topic_title: labTopicTitle,
        lab_topic_angle: labTopicAngle,
        lab_topic_mood: labTopicMood,
        lab_slide_count: labSlideCount,
        lab_visual_format: contentFormat === "carousel" ? "carousel" : labVisualFormat,
        include_logo: includeLogo,
        logo_placement: logoPlacement,
        enabled,
        ...(contentFormat === "image"
          ? {
              fits: fitKeys.map((key) => {
                const [category, subtype = ""] = key.split(":");
                return { category, subtype };
              }),
            }
          : {}),
      };
      if (isNew) {
        const created = await api<{ prompt_preset: PromptPreset }>("/v1/backoffice/prompt-presets", {
          method: "POST",
          body: JSON.stringify(body),
        });
        return created;
      }
      return api<{ prompt_preset: PromptPreset }>(`/v1/backoffice/prompt-presets/${presetId}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ["backoffice-prompt-presets"] });
      if (isNew) {
        router.replace(presetLabPathFromPreset(data.prompt_preset));
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["backoffice-prompt-preset", presetId] });
      appToast.success("ok");
    },
    onError: (err) => {
      appToast.error(err instanceof ApiError ? err.code : "error");
    },
  });

  const generate = useMutation({
    mutationFn: async () => {
      appToast.info(contentFormat === "carousel" ? t("generatingCarousel") : t("generating"));
      if (contentFormat === "carousel") {
        // One shot: research → deck script + caption → render slides.
        const carousel = await api<{
          prompt_preset: PromptPreset;
          resolved_prompt: string;
          result_text: string;
          slide_count: number;
          lab_visual_format?: string;
          lab_topic_title?: string;
          lab_topic_angle?: string;
          effective_prompt?: EffectivePrompt;
          effective_prompts?: EffectivePrompt[];
        }>(`/v1/backoffice/prompt-presets/${presetId}/generate-carousel`, {
          method: "POST",
          body: JSON.stringify({
            brand_id: labBrandId,
            include_logo: includeLogo,
            logo_placement: logoPlacement,
            lab_visual_format: "carousel",
            lab_theme: labTheme,
            lab_layout: labLayout,
          }),
        });
        return { mode: "carousel" as const, carousel };
      }
      // Sequential: image then caption. Parallel calls often competed for the same
      // OpenAI image/chat quota and surfaced as a bare provider_unavailable 409.
      const image = await api<{ prompt_preset: PromptPreset; resolved_prompt: string; effective_prompt?: EffectivePrompt }>(
        `/v1/backoffice/prompt-presets/${presetId}/generate-image`,
        {
          method: "POST",
          body: JSON.stringify({
            prompt_image: promptImage,
            brand_id: labBrandId,
            include_logo: includeLogo,
            logo_placement: logoPlacement,
            lab_product_name: labProductName,
            lab_product_price: labProductPrice,
            lab_product_description: labProductDescription,
            item_id: labItemId,
            place_id: labPlaceId,
          }),
        },
      );
      const text = await api<{
        prompt_preset: PromptPreset;
        resolved_prompt: string;
        result_text: string;
        effective_prompt?: EffectivePrompt;
        effective_prompts?: EffectivePrompt[];
      }>(`/v1/backoffice/prompt-presets/${presetId}/generate-text`, {
        method: "POST",
        body: JSON.stringify({
          prompt_text: promptText,
          brand_id: labBrandId,
          lab_product_name: labProductName,
          lab_product_price: labProductPrice,
          lab_product_description: labProductDescription,
        }),
      });
      return { mode: "single" as const, image, text };
    },
    onSuccess: async (result) => {
      if (result.mode === "carousel") {
        const { carousel } = result;
        const preset = carousel.prompt_preset;
        setPreviewPath(preset.preview_path);
        setAssets(preset.assets ?? []);
        setResultText(carousel.result_text || preset.result_text || "");
        setPromptImage(preset.prompt_image || "");
        setPromptText(preset.prompt_text || promptText);
        setEffectiveImage(carousel.effective_prompt ?? null);
        setEffectiveCaption(null);
        setEffectivePrompts(carousel.effective_prompts ?? []);
        setLabTopicTitle(carousel.lab_topic_title || preset.lab_topic_title || "");
        setLabTopicAngle(carousel.lab_topic_angle || preset.lab_topic_angle || "");
        setLabTopicMood(preset.lab_topic_mood || "");
        setLabSlideCount(preset.lab_slide_count || carousel.slide_count || labSlideCount);
        setLabVisualFormat("carousel");
        const nextTheme = scriptKey(preset.prompt_image || "", "theme");
        setLabTheme(nextTheme === "light" || nextTheme === "random" ? nextTheme : "dark");
        const nextLayout = scriptKey(preset.prompt_image || "", "layout");
        setLabLayout(
          nextLayout === "statement" || nextLayout === "steps" ? nextLayout : "editorial",
        );
        setCarouselSlideIndex(0);
      } else {
        const { image, text } = result;
        setPreviewPath(image.prompt_preset.preview_path);
        setAssets(image.prompt_preset.assets ?? []);
        setPromptImage(image.prompt_preset.prompt_image || image.prompt_preset.example_prompt || promptImage);
        setPromptText(text.prompt_preset.prompt_text || promptText);
        setResultText(text.result_text || text.prompt_preset.result_text || "");
        setEffectiveImage(image.effective_prompt ?? null);
        setEffectiveCaption(text.effective_prompt ?? null);
        setEffectivePrompts([
          ...(image.effective_prompt ? [image.effective_prompt] : []),
          ...(text.effective_prompt ? [text.effective_prompt] : []),
        ]);
      }
      await queryClient.invalidateQueries({ queryKey: ["backoffice-prompt-preset", presetId] });
      await queryClient.invalidateQueries({ queryKey: ["backoffice-prompt-presets"] });
      appToast.success("ok");
    },
    onError: (err) => {
      const code = err instanceof ApiError ? err.code : "error";
      appToast.error(errors.has(code) ? errors(code) : code);
    },
  });

  const remove = useMutation({
    mutationFn: () => api(`/v1/backoffice/prompt-presets/${presetId}`, { method: "DELETE" }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["backoffice-prompt-presets"] });
      router.replace("/backoffice");
    },
  });

  const downloadUrls = useMemo(() => {
    if (contentFormat === "carousel" && carouselSlides.length > 0) {
      return carouselSlides.map((slide) => slide.url).filter(Boolean);
    }
    return previewPath ? [previewPath] : [];
  }, [contentFormat, carouselSlides, previewPath]);

  const downloadGeneratedImages = async () => {
    if (downloadUrls.length === 0 || generate.isPending || downloadingImages) {
      return;
    }
    setDownloadingImages(true);
    try {
      const base = slugFileBase(name || "preset");
      await downloadImagesAsZip(downloadUrls, `${base}.zip`, base);
      appToast.success("ok");
    } catch {
      appToast.error("error");
    } finally {
      setDownloadingImages(false);
    }
  };

  // Prefer server preview → last generate → live client resolve (always something visible).
  const previewImageEff =
    previewPromptsQuery.data?.image ?? effectiveImage ?? liveImageEffective;
  const previewCaptionEff =
    previewPromptsQuery.data?.caption ?? effectiveCaption ?? liveCaptionEffective;
  const previewCarouselEffs = useMemo(() => {
    const fromPreview = previewPromptsQuery.data?.effective_prompts ?? [];
    const fromLive = liveCarouselEffective;
    if (effectivePrompts.length === 0) {
      return fromPreview.length > 0 ? fromPreview : fromLive;
    }
    // Keep research/deck/caption from last generate; refresh script from live/server when editing.
    const scriptFromPreview =
      fromPreview.find((item) => item.kind === "carousel_script") ??
      fromLive.find((item) => item.kind === "carousel_script");
    return effectivePrompts.map((item) =>
      item.kind === "carousel_script" && scriptFromPreview ? scriptFromPreview : item,
    );
  }, [effectivePrompts, previewPromptsQuery.data?.effective_prompts, liveCarouselEffective]);
  const imagePanelPrompts = previewImageEff ? [previewImageEff] : [];
  const captionPanelPrompts = previewCaptionEff ? [previewCaptionEff] : [];

  if (loading || me.isLoading) {
    return null;
  }

  if (!isSuperAdmin) {
    return (
      <AppShell title={t("title")}>
        <p className="text-sm text-ink/70">{t("forbidden")}</p>
      </AppShell>
    );
  }

  const labBrand = brands.find((item) => item.id === labBrandId);
  const previewBrandName = labBrand?.name || name || t("previewBrandFallback");
  const safeCarouselIndex =
    carouselSlides.length > 0
      ? Math.min(carouselSlideIndex, carouselSlides.length - 1)
      : 0;
  const previewImageUrl =
    contentFormat === "carousel" && carouselSlides.length > 0
      ? carouselSlides[safeCarouselIndex]?.url || previewPath
      : previewPath;
  const busy = generate.isPending;
  const canGenerate =
    !isNew &&
    !busy &&
    Boolean(labBrandId) &&
    (contentFormat === "carousel" ||
      (unknownTokens.length === 0 && Boolean(promptImage.trim()) && Boolean(promptText.trim())));
  const canDownloadImages = downloadUrls.length > 0 && !busy && !downloadingImages;
  const formatLabel = t(`formats.${contentFormat}.title`);
  const imageSubjects = (kindsQuery.data?.output_kinds ?? []).filter(
    (item) => item.code !== "market_topic",
  );

  return (
    <AppShell title={isNew ? t("newWithFormat", { format: formatLabel }) : t("editWithFormat", { format: formatLabel })}>
      <div className="mx-auto w-full max-w-6xl space-y-5">
        <Button asChild variant="outline" className="min-h-11">
          <Link
            href={
              isNew
                ? "/backoffice/presets/new"
                : `/backoffice/presets?content_format=${encodeURIComponent(contentFormat)}`
            }
          >
            {isNew ? t("backToFormats") : t("backToList")}
          </Link>
        </Button>

        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="preset-name">{t("name")}</Label>
              <Input id="preset-name" className="min-h-11" value={name} onChange={(e) => setName(e.target.value)} />
              <p className="text-xs text-ink/55">{t("nameHint")}</p>
              {messages.has(name) ? <p className="text-sm text-ink/80">{messages(name)}</p> : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="preset-blurb">{t("blurb")}</Label>
              <Textarea
                id="preset-blurb"
                className="min-h-20"
                value={blurb}
                onChange={(e) => setBlurb(e.target.value)}
              />
              <p className="text-xs text-ink/55">{t("blurbHint")}</p>
              {messages.has(blurb) ? <p className="text-sm text-ink/80">{messages(blurb)}</p> : null}
            </div>

            <div className="space-y-2">
              <Label>{t("labBrand")}</Label>
              <p className="text-sm text-ink/70">{t("labBrandHint")}</p>
              <Select value={labBrandId || undefined} onValueChange={selectLabBrand} disabled={!brands.length}>
                <SelectTrigger className="min-h-11">
                  <SelectValue placeholder={t("labBrandEmpty")} />
                </SelectTrigger>
                <SelectContent>
                  {brands.map((brand) => (
                    <SelectItem key={brand.id} value={brand.id}>
                      {brand.name} · {brand.organization_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {contentFormat === "image" ? (
              <div className="space-y-2">
                <Label>{t("fitLabel")}</Label>
                <p className="text-sm text-ink/70">{t("fitHint")}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(
                    [
                      ["product:physical", "fitPhysical"],
                      ["product:digital", "fitDigital"],
                      ["service", "fitService"],
                      ["character:person", "fitCharacter"],
                      ["location", "fitLocation"],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key} className="flex min-h-11 items-center gap-3 text-sm">
                      <input
                        type="checkbox"
                        className="size-4 accent-pine"
                        checked={fitKeys.includes(key)}
                        onChange={(event) => {
                          setFitKeys((current) =>
                            event.target.checked ? [...current, key] : current.filter((item) => item !== key),
                          );
                        }}
                      />
                      {t(label)}
                    </label>
                  ))}
                </div>
              </div>
            ) : null}

            {contentFormat === "image" ? (
              <div className="space-y-2">
                <Label>{t("subjectTag")}</Label>
                <p className="text-sm text-ink/70">{t("subjectTagHint")}</p>
                <Select value={outputKind} onValueChange={setOutputKind}>
                  <SelectTrigger className="min-h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {imageSubjects.map((item) => (
                      <SelectItem key={item.code} value={item.code}>
                        {creation.has(`outputKinds.${item.code}`)
                          ? creation(`outputKinds.${item.code}`)
                          : item.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            {contentFormat === "image" ? (
              <BackofficePresetProductFields
                name={labProductName}
                price={labProductPrice}
                description={labProductDescription}
                onName={setLabProductName}
                onPrice={setLabProductPrice}
                onDescription={setLabProductDescription}
              />
            ) : null}

            {contentFormat === "carousel" ? (
              <BackofficePresetTopicStudio
                isNew={isNew}
                promptImage={promptImage}
                promptImageRef={promptImageRef}
                labTheme={labTheme}
                labLayout={labLayout}
                labTopicTitle={labTopicTitle}
                labTopicAngle={labTopicAngle}
                labSlideCount={labSlideCount}
                resultText={resultText}
                unknownImageTokens={unknownImageTokens}
                effectivePrompts={previewCarouselEffs}
                onPromptImage={setPromptImage}
                onTheme={setLabTheme}
                onLayout={setLabLayout}
                onInsertToken={insertImageToken}
              />
            ) : (
            <Tabs defaultValue="image" className="w-full">
              <TabsList>
                <TabsTrigger value="image">{t("tabs.image")}</TabsTrigger>
                <TabsTrigger value="text">{t("tabs.text")}</TabsTrigger>
              </TabsList>

              <TabsContent value="image" className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="preset-prompt-image">{t("promptImage")}</Label>
                  <p className="text-sm text-ink/70">{t("promptImageHint")}</p>
                </div>

                <div className="space-y-3 rounded-xl border border-border p-3">
                  <label className="flex min-h-11 items-center gap-3 text-sm">
                    <input
                      id="preset-include-logo"
                      type="checkbox"
                      className="size-5"
                      checked={includeLogo}
                      onChange={(e) => setIncludeLogo(e.target.checked)}
                    />
                    <span>
                      <span className="font-medium">{t("includeLogo")}</span>
                      <span className="mt-0.5 block text-ink/70">{t("includeLogoHint")}</span>
                    </span>
                  </label>
                  {includeLogo ? (
                    <div className="space-y-2 border-t border-border pt-3">
                      <Label>{t("logoPlacement")}</Label>
                      <p className="text-sm text-ink/70">{t("logoPlacementHint")}</p>
                      <Select
                        value={logoPlacement}
                        onValueChange={(value) => setLogoPlacement(value as LogoPlacement)}
                      >
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
                      <LogoPlacementGrid value={logoPlacement} onChange={setLogoPlacement} />
                    </div>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <BrandTokenButtons tokens={imageTokens} onInsert={insertImageToken} />
                  <Textarea
                    id="preset-prompt-image"
                    ref={promptImageRef}
                    className="min-h-44 font-mono text-sm"
                    value={promptImage}
                    onChange={(e) => setPromptImage(e.target.value)}
                  />
                  {unknownImageTokens.length ? (
                    <p className="text-sm text-destructive">
                      {t("unknownTokens", { tokens: unknownImageTokens.join(", ") })}
                    </p>
                  ) : null}
                  <EffectivePromptPanel prompts={imagePanelPrompts} />
                </div>

                {contentFormat === "image" && labBrandId ? (
                  <div className="space-y-4 rounded-xl border border-border p-3">
                    <div className="space-y-2">
                      <Label>{t("labItem")}</Label>
                      <p className="text-sm text-ink/70">{t("labItemHint")}</p>
                      <Select value={labItemId || "none"} onValueChange={selectLabItem} disabled={labItemsQuery.isLoading}>
                        <SelectTrigger className="min-h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">{t("labItemNone")}</SelectItem>
                          {labSubjectItems.map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {!labItemsQuery.isLoading && labSubjectItems.length === 0 ? (
                        <p className="text-sm text-ink/70">{t("labItemEmpty")}</p>
                      ) : null}
                      {labSubject ? (
                        <div className="flex flex-wrap gap-2">
                          {orderedItemImages(labSubject).slice(0, 3).length > 0 ? (
                            orderedItemImages(labSubject)
                              .slice(0, 3)
                              .map((image) => (
                                <LibraryPhoto
                                  key={image.id}
                                  src={image.url}
                                  emptyLabel={wizardCopy("libraryNoPhoto")}
                                  className="size-16 rounded-md"
                                />
                              ))
                          ) : (
                            <LibraryPhoto emptyLabel={wizardCopy("libraryNoPhoto")} className="size-16 rounded-md" />
                          )}
                        </div>
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      <Label>{t("labPlace")}</Label>
                      <p className="text-sm text-ink/70">{t("labPlaceHint")}</p>
                      <Select value={labPlaceId || "none"} onValueChange={(value) => setLabPlaceId(value === "none" ? "" : value)} disabled={labItemsQuery.isLoading}>
                        <SelectTrigger className="min-h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">{t("labItemNone")}</SelectItem>
                          {labPlaces.map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {labPlace ? (
                        <LibraryPhoto
                          src={orderedItemImages(labPlace)[0]?.url}
                          emptyLabel={wizardCopy("libraryNoPhoto")}
                          className="size-16 rounded-md"
                        />
                      ) : null}
                    </div>
                  </div>
                ) : null}
                {isNew ? <p className="text-sm text-ink/70">{t("saveBeforeGenerate")}</p> : null}
              </TabsContent>

              <TabsContent value="text" className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="preset-prompt-text">{t("promptText")}</Label>
                  <p className="text-sm text-ink/70">{t("promptTextHint")}</p>
                </div>
                <BrandTokenButtons tokens={textTokens} onInsert={insertTextToken} />
                <div className="space-y-2">
                  <Textarea
                    id="preset-prompt-text"
                    ref={promptTextRef}
                    className="min-h-44 font-mono text-sm"
                    value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                  />
                  {unknownTextTokens.length ? (
                    <p className="text-sm text-destructive">
                      {t("unknownTokens", { tokens: unknownTextTokens.join(", ") })}
                    </p>
                  ) : null}
                  <EffectivePromptPanel prompts={captionPanelPrompts} />
                </div>
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
              </TabsContent>
            </Tabs>
            )}
          </div>

          <aside className="space-y-4 lg:sticky lg:top-4">
            <div>
              <p className="text-sm font-medium">{t("phonePreview")}</p>
              <p className="text-sm text-ink/70">{t("phonePreviewHint")}</p>
            </div>
            <InstagramPhonePreview
              brandName={previewBrandName}
              logoUrl={contextQuery.data?.logo_url}
              logoInvertedUrl={contextQuery.data?.logo_inverted_url}
              imageUrl={previewImageUrl || undefined}
              imageUrls={
                contentFormat === "carousel" && carouselSlides.length > 1
                  ? carouselSlides.map((slide) => slide.url)
                  : undefined
              }
              activeIndex={safeCarouselIndex}
              onActiveIndexChange={setCarouselSlideIndex}
              aspect={contentFormat === "carousel" ? "portrait" : "square"}
              caption={resultText}
              captionPending={generate.isPending}
              emptyImageLabel={t("phoneEmptyImage")}
              emptyCaptionLabel={t("phoneEmptyCaption")}
              generatingCaptionLabel={t("phoneGeneratingCaption")}
              likesLabel={t.raw("phoneLikes")}
            />
            {busy ? (
              <p className="flex items-center gap-2 text-sm text-ink/70">
                <Loader2 className="size-4 animate-spin" aria-hidden />
                {contentFormat === "carousel" ? t("generatingCarousel") : t("generating")}
              </p>
            ) : null}
            {downloadUrls.length > 0 ? (
              <Button
                type="button"
                variant="outline"
                className="min-h-11 w-full"
                disabled={!canDownloadImages}
                onClick={() => void downloadGeneratedImages()}
              >
                {downloadingImages ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    {t("downloadingImages")}
                  </>
                ) : (
                  <>
                    <Download className="size-4" aria-hidden />
                    {downloadUrls.length > 1
                      ? t("downloadImagesZip", { count: downloadUrls.length })
                      : t("downloadImageZip")}
                  </>
                )}
              </Button>
            ) : null}
            <div className="space-y-3">
              <div className="flex min-h-11 items-center gap-3 text-sm">
                <input
                  id="preset-enabled"
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="size-5"
                />
                <label htmlFor="preset-enabled" className="inline-flex items-center gap-1">
                  {t("enabled")}
                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex size-11 shrink-0 items-center justify-center rounded-md text-ink/55 hover:bg-muted hover:text-ink"
                          aria-label={t("enabledHint")}
                        >
                          <span className="flex size-5 items-center justify-center rounded-full border border-current text-[11px] font-semibold leading-none">
                            i
                          </span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs text-left leading-snug">
                        {t("enabledHint")}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  className="min-h-11"
                  disabled={save.isPending || busy || !name.trim() || unknownTokens.length > 0}
                  onClick={() => save.mutate()}
                >
                  {isNew ? t("create") : t("save")}
                </Button>
                {!isNew ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11"
                    disabled={!canGenerate}
                    onClick={() => generate.mutate()}
                  >
                    {generate.isPending
                      ? contentFormat === "carousel"
                        ? t("generatingCarousel")
                        : t("generating")
                      : t("generate")}
                  </Button>
                ) : null}
                {!isNew ? (
                  <ConfirmAlertDialog
                    title={t("delete")}
                    description={t("deleteConfirm")}
                    cancelLabel={t("cancel")}
                    confirmLabel={t("delete")}
                    onConfirm={() => remove.mutate()}
                    trigger={
                      <Button
                        type="button"
                        variant="destructive"
                        className="min-h-11"
                        disabled={remove.isPending || busy}
                      >
                        {t("delete")}
                      </Button>
                    }
                  />
                ) : null}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
