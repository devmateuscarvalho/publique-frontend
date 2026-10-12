"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, ImagePlus, Loader2, X } from "lucide-react";
import JSZip from "jszip";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { type RefObject, useEffect, useMemo, useRef, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { BackofficePresetProductFields } from "@/components/backoffice-preset-product-fields";
import { BackofficePresetTopicStudio } from "@/components/backoffice-preset-topic-studio";
import { BrandTokenButtons, LogoPlacementGrid, ResolvedPromptDisclosure } from "@/components/backoffice-preset-widgets";
import { InstagramPhonePreview } from "@/components/instagram-phone-preview";
import { useAccount } from "@/components/use-account";
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentTrigger,
} from "@/components/ui/attachment";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ApiError, api, apiUpload, type BackofficeBrand, type OutputKind, type PromptPreset } from "@/lib/api";
import { appToast } from "@/lib/app-toast";
import {
  LAB_BRAND_KEY,
  type BrandToken,
  type LogoPlacement,
  type RefRole,
  IMAGE_TOKENS,
  TEXT_TOKENS,
  appendLogoClearZone,
  appendReferenceSceneGuidance,
  filterKindTokens,
  findUnknownTokens,
  formatFileMeta,
  isLocationRole,
  isPersonRole,
  readStoredBrandId,
  resolveTemplate,
  scriptKey,
  slugFileBase,
} from "@/lib/backoffice-preset-shared";
import { logoPlacements } from "@/lib/post-template";

export function BackofficePresetEditor({ presetId, kind }: { presetId?: string; kind?: string }) {
  const t = useTranslations("backoffice");
  const creation = useTranslations("creation");
  const messages = useTranslations();
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

  const [outputKind, setOutputKind] = useState(() => kind?.trim() || "product");
  const [name, setName] = useState("");
  const [blurb, setBlurb] = useState("");
  const [promptImage, setPromptImage] = useState("");
  const [promptText, setPromptText] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [previewPath, setPreviewPath] = useState("");
  const [assets, setAssets] = useState<PromptPreset["assets"]>([]);
  const [labBrandId, setLabBrandId] = useState("");
  const [labProductName, setLabProductName] = useState("");
  const [labProductPrice, setLabProductPrice] = useState("");
  const [labProductDescription, setLabProductDescription] = useState("");
  const [labTopicTitle, setLabTopicTitle] = useState("");
  const [labTopicAngle, setLabTopicAngle] = useState("");
  const [labTopicMood, setLabTopicMood] = useState("");
  const [labSlideCount, setLabSlideCount] = useState(4);
  const [labVisualFormat, setLabVisualFormat] = useState<"single" | "carousel">("carousel");
  const [labTheme, setLabTheme] = useState<"light" | "dark" | "random">("dark");
  const [carouselSlideIndex, setCarouselSlideIndex] = useState(0);
  const [resolvedImagePrompt, setResolvedImagePrompt] = useState("");
  const [resolvedTextPrompt, setResolvedTextPrompt] = useState("");
  const [includeLogo, setIncludeLogo] = useState(true);
  const [logoPlacement, setLogoPlacement] = useState<LogoPlacement>("bottom_right");
  const [resultText, setResultText] = useState("");
  const [pendingLocationFile, setPendingLocationFile] = useState<File | null>(null);
  const [pendingLocationPreview, setPendingLocationPreview] = useState("");
  const [pendingPeopleFiles, setPendingPeopleFiles] = useState<File[]>([]);
  const [pendingPeoplePreviews, setPendingPeoplePreviews] = useState<string[]>([]);
  const [uploadingFileName, setUploadingFileName] = useState("");
  const [uploadingRole, setUploadingRole] = useState<RefRole | "">("");
  const [downloadingImages, setDownloadingImages] = useState(false);
  const locationFileRef = useRef<HTMLInputElement>(null);
  const peopleFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLabBrandId(readStoredBrandId());
  }, []);

  useEffect(() => {
    if (!isNew) {
      return;
    }
    const next = kind?.trim() ?? "";
    if (next) {
      setOutputKind(next);
    }
  }, [isNew, kind]);

  useEffect(() => {
    if (!isNew || !kindsQuery.isSuccess) {
      return;
    }
    const next = kind?.trim() ?? "";
    const exists = (kindsQuery.data?.output_kinds ?? []).some((item) => item.code === next);
    if (!exists) {
      router.replace("/backoffice/presets/new");
    }
  }, [isNew, kind, kindsQuery.data?.output_kinds, kindsQuery.isSuccess, router]);

  useEffect(() => {
    return () => {
      if (pendingLocationPreview) {
        URL.revokeObjectURL(pendingLocationPreview);
      }
      for (const url of pendingPeoplePreviews) {
        URL.revokeObjectURL(url);
      }
    };
  }, [pendingLocationPreview, pendingPeoplePreviews]);

  useEffect(() => {
    const preset = presetQuery.data?.prompt_preset;
    if (!preset) {
      return;
    }
    setOutputKind(preset.output_kind);
    setName(preset.name);
    setBlurb(preset.blurb || "");
    setPromptImage(preset.prompt_image || preset.example_prompt || "");
    setPromptText(preset.prompt_text || "");
    setEnabled(preset.enabled);
    setPreviewPath(preset.preview_path);
    setAssets(preset.assets ?? []);
    setIncludeLogo(preset.include_logo ?? true);
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
    setLabVisualFormat(preset.lab_visual_format === "single" ? "single" : "carousel");
    const scriptTheme = scriptKey(preset.prompt_image || "", "theme");
    setLabTheme(
      scriptTheme === "light" || scriptTheme === "random" ? scriptTheme : "dark",
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
    window.localStorage.setItem(LAB_BRAND_KEY, next);
  }, [brands, brandsQuery.isLoading, labBrandId]);

  const contextQuery = useQuery({
    queryKey: ["backoffice-brand-prompt-context", labBrandId],
    queryFn: () =>
      api<{ tokens: Record<string, string>; logo_url?: string; logo_inverted_url?: string }>(
        `/v1/backoffice/brands/${labBrandId}/prompt-context`,
      ),
    enabled: isSuperAdmin && Boolean(labBrandId),
  });

  const locationAssets = useMemo(
    () => (assets ?? []).filter((item) => isLocationRole(item.role)),
    [assets],
  );
  const peopleAssets = useMemo(
    () => (assets ?? []).filter((item) => isPersonRole(item.role)),
    [assets],
  );
  const personCount = peopleAssets.length + pendingPeopleFiles.length;
  const hasLocationRef = locationAssets.length > 0 || Boolean(pendingLocationFile);
  const canAddPerson = personCount < 3;
  const canAddLocation = !hasLocationRef;
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

  const clearPendingLocation = () => {
    if (pendingLocationPreview) {
      URL.revokeObjectURL(pendingLocationPreview);
    }
    setPendingLocationFile(null);
    setPendingLocationPreview("");
  };

  const clearPendingPeople = () => {
    for (const url of pendingPeoplePreviews) {
      URL.revokeObjectURL(url);
    }
    setPendingPeopleFiles([]);
    setPendingPeoplePreviews([]);
  };

  const stageLocationFile = (file: File | null) => {
    if (pendingLocationPreview) {
      URL.revokeObjectURL(pendingLocationPreview);
    }
    if (!file) {
      setPendingLocationFile(null);
      setPendingLocationPreview("");
      return;
    }
    setPendingLocationFile(file);
    setPendingLocationPreview(URL.createObjectURL(file));
  };

  const stagePersonFile = (file: File) => {
    if (pendingPeopleFiles.length >= 3) {
      return;
    }
    setPendingPeopleFiles((current) => [...current, file]);
    setPendingPeoplePreviews((current) => [...current, URL.createObjectURL(file)]);
  };

  const removePendingPerson = (index: number) => {
    setPendingPeoplePreviews((current) => {
      const url = current[index];
      if (url) {
        URL.revokeObjectURL(url);
      }
      return current.filter((_, i) => i !== index);
    });
    setPendingPeopleFiles((current) => current.filter((_, i) => i !== index));
  };

  const uploadRefToPreset = async (targetPresetId: string, file: File, role: RefRole) => {
    const form = new FormData();
    // role before file; also in query so multipart parsers cannot drop it
    form.append("role", role);
    form.append("file", file);
    const data = await apiUpload<{ asset: { id: string; media_id: string; role: string; url: string } }>(
      `/v1/backoffice/prompt-presets/${targetPresetId}/references?role=${encodeURIComponent(role)}`,
      form,
    );
    const saved = data.asset?.role;
    const ok =
      (role === "location" && isLocationRole(saved)) ||
      (role === "person" && isPersonRole(saved));
    if (!ok) {
      throw new ApiError("invalid_input");
    }
    return data;
  };

  const promptTokens = useMemo(
    () => ({
      ...(contextQuery.data?.tokens ?? {}),
      "product.name": labProductName,
      "product.price": labProductPrice,
      "product.description": labProductDescription,
      "topic.title": labTopicTitle,
      "topic.angle": labTopicAngle,
      "topic.image_mood": labTopicMood,
    }),
    [
      contextQuery.data?.tokens,
      labProductName,
      labProductPrice,
      labProductDescription,
      labTopicTitle,
      labTopicAngle,
      labTopicMood,
    ],
  );

  const liveResolvedImage = useMemo(() => {
    const withRefs = appendReferenceSceneGuidance(
      resolveTemplate(promptImage, promptTokens),
      outputKind,
      personCount,
      hasLocationRef,
    );
    return appendLogoClearZone(withRefs, includeLogo, logoPlacement);
  }, [promptTokens, promptImage, includeLogo, logoPlacement, personCount, hasLocationRef, outputKind]);

  useEffect(() => {
    setResolvedImagePrompt("");
  }, [
    promptImage,
    includeLogo,
    logoPlacement,
    personCount,
    hasLocationRef,
    labBrandId,
    outputKind,
    labProductName,
    labProductPrice,
    labProductDescription,
    labTopicTitle,
    labTopicAngle,
    labTopicMood,
  ]);

  const unknownImageTokens = useMemo(() => findUnknownTokens(promptImage), [promptImage]);
  const unknownTextTokens = useMemo(() => findUnknownTokens(promptText), [promptText]);
  const unknownTokens = useMemo(
    () => [...new Set([...unknownImageTokens, ...unknownTextTokens])],
    [unknownImageTokens, unknownTextTokens],
  );
  const liveResolvedText = useMemo(
    () => resolveTemplate(promptText, promptTokens),
    [promptTokens, promptText],
  );
  // Market topic: the "image prompt" is the deck script; no scene/logo guidance is appended.
  const liveResolvedScript = useMemo(
    () => resolveTemplate(promptImage, promptTokens),
    [promptTokens, promptImage],
  );

  const selectLabBrand = (id: string) => {
    setLabBrandId(id);
    window.localStorage.setItem(LAB_BRAND_KEY, id);
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
        output_kind: outputKind,
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
        lab_visual_format: labVisualFormat,
        include_logo: includeLogo,
        logo_placement: logoPlacement,
        enabled,
      };
      if (isNew) {
        const created = await api<{ prompt_preset: PromptPreset }>("/v1/backoffice/prompt-presets", {
          method: "POST",
          body: JSON.stringify(body),
        });
        const id = created.prompt_preset.id;
        for (const file of pendingPeopleFiles) {
          try {
            await uploadRefToPreset(id, file, "person");
          } catch {
            // Preset exists; user can retry upload on the edit screen.
          }
        }
        if (pendingLocationFile) {
          try {
            await uploadRefToPreset(id, pendingLocationFile, "location");
          } catch {
            // Preset exists; user can retry upload on the edit screen.
          }
        }
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
        clearPendingLocation();
        clearPendingPeople();
        router.replace(`/backoffice/presets/${data.prompt_preset.id}`);
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
      if (outputKind === "market_topic") {
        // One shot: research → deck script + caption → render slides.
        const carousel = await api<{
          prompt_preset: PromptPreset;
          resolved_prompt: string;
          result_text: string;
          slide_count: number;
          lab_visual_format?: string;
          lab_topic_title?: string;
          lab_topic_angle?: string;
        }>(`/v1/backoffice/prompt-presets/${presetId}/generate-carousel`, {
          method: "POST",
          body: JSON.stringify({
            brand_id: labBrandId,
            include_logo: includeLogo,
            logo_placement: logoPlacement,
            lab_visual_format: labVisualFormat,
            lab_theme: labTheme,
          }),
        });
        return { mode: "carousel" as const, carousel };
      }
      const [image, text] = await Promise.all([
        api<{ prompt_preset: PromptPreset; resolved_prompt: string }>(
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
            }),
          },
        ),
        api<{ prompt_preset: PromptPreset; resolved_prompt: string; result_text: string }>(
          `/v1/backoffice/prompt-presets/${presetId}/generate-text`,
          {
            method: "POST",
            body: JSON.stringify({
              prompt_text: promptText,
              brand_id: labBrandId,
              lab_product_name: labProductName,
              lab_product_price: labProductPrice,
              lab_product_description: labProductDescription,
            }),
          },
        ),
      ]);
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
        setResolvedImagePrompt(carousel.resolved_prompt ?? "");
        setResolvedTextPrompt("");
        setLabTopicTitle(carousel.lab_topic_title || preset.lab_topic_title || "");
        setLabTopicAngle(carousel.lab_topic_angle || preset.lab_topic_angle || "");
        setLabTopicMood(preset.lab_topic_mood || "");
        setLabSlideCount(preset.lab_slide_count || carousel.slide_count || labSlideCount);
        setLabVisualFormat(
          carousel.lab_visual_format === "single" || preset.lab_visual_format === "single"
            ? "single"
            : "carousel",
        );
        const nextTheme = scriptKey(preset.prompt_image || "", "theme");
        setLabTheme(nextTheme === "light" || nextTheme === "random" ? nextTheme : "dark");
        setCarouselSlideIndex(0);
      } else {
        const { image, text } = result;
        setPreviewPath(image.prompt_preset.preview_path);
        setAssets(image.prompt_preset.assets ?? []);
        setPromptImage(image.prompt_preset.prompt_image || image.prompt_preset.example_prompt || promptImage);
        setResolvedImagePrompt(image.resolved_prompt ?? "");
        setPromptText(text.prompt_preset.prompt_text || promptText);
        setResultText(text.result_text || text.prompt_preset.result_text || "");
        setResolvedTextPrompt(text.resolved_prompt ?? "");
      }
      await queryClient.invalidateQueries({ queryKey: ["backoffice-prompt-preset", presetId] });
      await queryClient.invalidateQueries({ queryKey: ["backoffice-prompt-presets"] });
      appToast.success("ok");
    },
    onError: (err) => {
      appToast.error(err instanceof ApiError ? err.code : "error");
    },
  });

  const upload = useMutation({
    mutationFn: async ({ file, role }: { file: File; role: RefRole }) => {
      if (!presetId) {
        throw new ApiError("invalid_input");
      }
      setUploadingFileName(file.name);
      setUploadingRole(role);
      return uploadRefToPreset(presetId, file, role);
    },
    onSuccess: async (data) => {
      setAssets((current) => [...(current ?? []), data.asset]);
      await queryClient.invalidateQueries({ queryKey: ["backoffice-prompt-preset", presetId] });
    },
    onError: (err) => {
      appToast.error(err instanceof ApiError ? err.code : "error");
    },
    onSettled: () => {
      setUploadingFileName("");
      setUploadingRole("");
    },
  });

  const onLocationFileChange = (file: File | undefined) => {
    if (!file || !canAddLocation) {
      return;
    }
    if (isNew) {
      stageLocationFile(file);
      return;
    }
    upload.mutate({ file, role: "location" });
  };

  const onPersonFileChange = (file: File | undefined) => {
    if (!file || !canAddPerson) {
      return;
    }
    if (isNew) {
      stagePersonFile(file);
      return;
    }
    upload.mutate({ file, role: "person" });
  };

  const removeAsset = useMutation({
    mutationFn: (assetId: string) =>
      api(`/v1/backoffice/prompt-presets/${presetId}/references/${assetId}`, { method: "DELETE" }),
    onSuccess: async (_data, assetId) => {
      setAssets((current) => (current ?? []).filter((item) => item.id !== assetId));
      await queryClient.invalidateQueries({ queryKey: ["backoffice-prompt-preset", presetId] });
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
    if (outputKind === "market_topic" && carouselSlides.length > 0) {
      return carouselSlides.map((slide) => slide.url).filter(Boolean);
    }
    return previewPath ? [previewPath] : [];
  }, [outputKind, carouselSlides, previewPath]);

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

  const resolvedImageDisplay = resolvedImagePrompt || liveResolvedImage;
  const resolvedTextDisplay = resolvedTextPrompt || liveResolvedText;
  const labBrand = brands.find((item) => item.id === labBrandId);
  const previewBrandName = labBrand?.name || name || t("previewBrandFallback");
  const safeCarouselIndex =
    carouselSlides.length > 0
      ? Math.min(carouselSlideIndex, carouselSlides.length - 1)
      : 0;
  const previewImageUrl =
    outputKind === "market_topic" && carouselSlides.length > 0
      ? carouselSlides[safeCarouselIndex]?.url || previewPath
      : previewPath;
  const busy = generate.isPending;
  const canGenerate =
    !isNew &&
    !busy &&
    Boolean(labBrandId) &&
    (outputKind === "market_topic" ||
      (unknownTokens.length === 0 && Boolean(promptImage.trim()) && Boolean(promptText.trim())));
  const canDownloadImages = downloadUrls.length > 0 && !busy && !downloadingImages;
  const kindLabel = creation.has(`outputKinds.${outputKind}`)
    ? creation(`outputKinds.${outputKind}`)
    : outputKind;

  return (
    <AppShell title={isNew ? t("newWithKind", { kind: kindLabel }) : t("editWithKind", { kind: kindLabel })}>
      <div className="mx-auto w-full max-w-6xl space-y-5">
        <Button asChild variant="outline" className="min-h-11">
          <Link href={isNew ? "/backoffice/presets/new" : "/backoffice/presets"}>
            {isNew ? t("backToKinds") : t("backToList")}
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

            {outputKind === "product" ? (
              <BackofficePresetProductFields
                name={labProductName}
                price={labProductPrice}
                description={labProductDescription}
                onName={setLabProductName}
                onPrice={setLabProductPrice}
                onDescription={setLabProductDescription}
              />
            ) : null}

            {outputKind === "market_topic" ? (
              <BackofficePresetTopicStudio
                isNew={isNew}
                promptImage={promptImage}
                promptImageRef={promptImageRef}
                labVisualFormat={labVisualFormat}
                labTheme={labTheme}
                labTopicTitle={labTopicTitle}
                labTopicAngle={labTopicAngle}
                labSlideCount={labSlideCount}
                includeLogo={includeLogo}
                logoPlacement={logoPlacement}
                resultText={resultText}
                unknownImageTokens={unknownImageTokens}
                resolvedScript={resolvedImagePrompt || liveResolvedScript}
                onPromptImage={setPromptImage}
                onFormat={setLabVisualFormat}
                onTheme={setLabTheme}
                onIncludeLogo={setIncludeLogo}
                onLogoPlacement={setLogoPlacement}
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
                  <ResolvedPromptDisclosure value={resolvedImageDisplay} />
                </div>

                <div className="space-y-5">
                  <input
                    ref={locationFileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    disabled={upload.isPending || save.isPending || !canAddLocation}
                    onChange={(e) => {
                      onLocationFileChange(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                  <input
                    ref={peopleFileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    disabled={upload.isPending || save.isPending || !canAddPerson}
                    onChange={(e) => {
                      onPersonFileChange(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />

                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium">{t("refLocation")}</p>
                      <p className="text-sm text-ink/70">{t("refLocationHint")}</p>
                    </div>
                    <AttachmentGroup className="gap-3">
                      {canAddLocation && !(upload.isPending && uploadingRole === "location") ? (
                        <Attachment state="idle" orientation="vertical" className="w-28">
                          <AttachmentMedia>
                            <ImagePlus aria-hidden />
                          </AttachmentMedia>
                          <AttachmentContent>
                            <AttachmentTitle>{t("upload")}</AttachmentTitle>
                            <AttachmentDescription>{t("refLocationOptional")}</AttachmentDescription>
                          </AttachmentContent>
                          <AttachmentTrigger
                            aria-label={t("refLocation")}
                            className="min-h-11"
                            disabled={upload.isPending || save.isPending}
                            onClick={() => locationFileRef.current?.click()}
                          />
                        </Attachment>
                      ) : null}
                      {pendingLocationPreview && pendingLocationFile ? (
                        <Attachment state="idle" orientation="vertical">
                          <AttachmentMedia variant="image">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={pendingLocationPreview} alt="" />
                          </AttachmentMedia>
                          <AttachmentContent>
                            <AttachmentTitle>{t("refLocation")}</AttachmentTitle>
                            <AttachmentDescription>{formatFileMeta(pendingLocationFile)}</AttachmentDescription>
                          </AttachmentContent>
                          <AttachmentActions>
                            <AttachmentAction
                              aria-label={t("refRemoveLocation")}
                              onClick={() => stageLocationFile(null)}
                            >
                              <X />
                            </AttachmentAction>
                          </AttachmentActions>
                        </Attachment>
                      ) : null}
                      {upload.isPending && uploadingRole === "location" ? (
                        <Attachment state="uploading" orientation="vertical">
                          <AttachmentMedia>
                            <Loader2 data-slot="spinner" className="animate-spin" aria-hidden />
                          </AttachmentMedia>
                          <AttachmentContent>
                            <AttachmentTitle>{uploadingFileName || t("upload")}</AttachmentTitle>
                            <AttachmentDescription>{t("uploading")}</AttachmentDescription>
                          </AttachmentContent>
                        </Attachment>
                      ) : null}
                      {locationAssets.map((asset) => (
                        <Attachment key={asset.id} state="done" orientation="vertical">
                          <AttachmentMedia variant="image">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={asset.url} alt="" />
                          </AttachmentMedia>
                          <AttachmentContent>
                            <AttachmentTitle>{t("refLocation")}</AttachmentTitle>
                            <AttachmentDescription>{t("references")}</AttachmentDescription>
                          </AttachmentContent>
                          {!isNew ? (
                            <AttachmentActions>
                              <AttachmentAction
                                aria-label={t("refRemoveLocation")}
                                disabled={removeAsset.isPending}
                                onClick={() => removeAsset.mutate(asset.id)}
                              >
                                <X />
                              </AttachmentAction>
                            </AttachmentActions>
                          ) : null}
                        </Attachment>
                      ))}
                    </AttachmentGroup>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium">
                        {outputKind === "avatar"
                          ? t("refPeopleAvatar")
                          : outputKind === "product"
                            ? t("refProducts")
                            : t("refPeople")}
                      </p>
                      <p className="text-sm text-ink/70">
                        {outputKind === "avatar"
                          ? t("refPeopleHintAvatar")
                          : outputKind === "product"
                            ? t("refProductsHint")
                            : t("refPeopleHint")}
                      </p>
                    </div>
                    <AttachmentGroup className="gap-3">
                      {canAddPerson && !(upload.isPending && uploadingRole === "person") ? (
                        <Attachment state="idle" orientation="vertical" className="w-28">
                          <AttachmentMedia>
                            <ImagePlus aria-hidden />
                          </AttachmentMedia>
                          <AttachmentContent>
                            <AttachmentTitle>{t("upload")}</AttachmentTitle>
                            <AttachmentDescription>
                              {t("refPeopleCount", { count: personCount, max: 3 })}
                            </AttachmentDescription>
                          </AttachmentContent>
                          <AttachmentTrigger
                            aria-label={
                              outputKind === "avatar"
                                ? t("refPeopleAvatar")
                                : outputKind === "product"
                                  ? t("refProducts")
                                  : t("refPeople")
                            }
                            className="min-h-11"
                            disabled={upload.isPending || save.isPending}
                            onClick={() => peopleFileRef.current?.click()}
                          />
                        </Attachment>
                      ) : null}
                      {pendingPeopleFiles.map((file, index) => (
                        <Attachment key={`pending-person-${index}`} state="idle" orientation="vertical">
                          <AttachmentMedia variant="image">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={pendingPeoplePreviews[index]} alt="" />
                          </AttachmentMedia>
                          <AttachmentContent>
                            <AttachmentTitle>
                              {outputKind === "avatar" || outputKind === "product"
                                ? t("refAvatarPhotoN", { n: index + 1 })
                                : t("refPersonN", { n: index + 1 })}
                            </AttachmentTitle>
                            <AttachmentDescription>{formatFileMeta(file)}</AttachmentDescription>
                          </AttachmentContent>
                          <AttachmentActions>
                            <AttachmentAction
                              aria-label={
                                outputKind === "avatar" || outputKind === "product"
                                  ? t("refRemoveAvatarPhoto")
                                  : t("refRemovePerson")
                              }
                              onClick={() => removePendingPerson(index)}
                            >
                              <X />
                            </AttachmentAction>
                          </AttachmentActions>
                        </Attachment>
                      ))}
                      {upload.isPending && uploadingRole === "person" ? (
                        <Attachment state="uploading" orientation="vertical">
                          <AttachmentMedia>
                            <Loader2 data-slot="spinner" className="animate-spin" aria-hidden />
                          </AttachmentMedia>
                          <AttachmentContent>
                            <AttachmentTitle>{uploadingFileName || t("upload")}</AttachmentTitle>
                            <AttachmentDescription>{t("uploading")}</AttachmentDescription>
                          </AttachmentContent>
                        </Attachment>
                      ) : null}
                      {peopleAssets.map((asset, index) => (
                        <Attachment key={asset.id} state="done" orientation="vertical">
                          <AttachmentMedia variant="image">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={asset.url} alt="" />
                          </AttachmentMedia>
                          <AttachmentContent>
                            <AttachmentTitle>
                              {outputKind === "avatar" || outputKind === "product"
                                ? t("refAvatarPhotoN", { n: index + 1 })
                                : t("refPersonN", { n: index + 1 })}
                            </AttachmentTitle>
                            <AttachmentDescription>
                              {outputKind === "avatar"
                                ? t("refAvatarSamePerson")
                                : outputKind === "product"
                                  ? t("refProductSameHint")
                                  : t("refPersonOneHint")}
                            </AttachmentDescription>
                          </AttachmentContent>
                          {!isNew ? (
                            <AttachmentActions>
                              <AttachmentAction
                                aria-label={
                                  outputKind === "avatar" || outputKind === "product"
                                    ? t("refRemoveAvatarPhoto")
                                    : t("refRemovePerson")
                                }
                                disabled={removeAsset.isPending}
                                onClick={() => removeAsset.mutate(asset.id)}
                              >
                                <X />
                              </AttachmentAction>
                            </AttachmentActions>
                          ) : null}
                        </Attachment>
                      ))}
                    </AttachmentGroup>
                  </div>

                  {isNew ? <p className="text-sm text-ink/55">{t("refUploadNewHint")}</p> : null}
                  {isNew ? <p className="text-sm text-ink/70">{t("saveBeforeGenerate")}</p> : null}
                </div>
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
                  <ResolvedPromptDisclosure value={resolvedTextDisplay} />
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
                outputKind === "market_topic" && carouselSlides.length > 1
                  ? carouselSlides.map((slide) => slide.url)
                  : undefined
              }
              activeIndex={safeCarouselIndex}
              onActiveIndexChange={setCarouselSlideIndex}
              aspect={outputKind === "market_topic" ? "portrait" : "square"}
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
                {outputKind === "market_topic" ? t("generatingCarousel") : t("generating")}
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
                      ? outputKind === "market_topic"
                        ? t("generatingCarousel")
                        : t("generating")
                      : t("generate")}
                  </Button>
                ) : null}
                {!isNew ? (
                  <Button
                    type="button"
                    variant="destructive"
                    className="min-h-11"
                    disabled={remove.isPending || busy}
                    onClick={() => remove.mutate()}
                  >
                    {t("delete")}
                  </Button>
                ) : null}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
