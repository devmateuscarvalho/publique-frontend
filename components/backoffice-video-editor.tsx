"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAccount } from "@/components/use-account";
import { ApiError, api, type BackofficeBrand, type OutputKind, type PromptPreset } from "@/lib/api";
import { appToast } from "@/lib/app-toast";
import { presetLabEditPath } from "@/lib/content-format";
import { cn } from "@/lib/utils";

const ASPECTS = ["9:16", "1:1", "16:9"] as const;

export function BackofficeVideoEditor({ presetId }: { presetId?: string }) {
  const t = useTranslations("backoffice");
  const messages = useTranslations();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { me, loading } = useAccount();
  const isSuperAdmin = me.data?.user.platform_role === "super_admin";
  const isNew = !presetId;
  const hydrated = useRef(false);

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

  const [name, setName] = useState("presets.video");
  const [blurb, setBlurb] = useState("presets.video-blurb");
  const [outputKind, setOutputKind] = useState("avatar");
  const [labBrandId, setLabBrandId] = useState("");
  const [promptImage, setPromptImage] = useState("");
  const [promptText, setPromptText] = useState("");
  const [seconds, setSeconds] = useState(5);
  const [aspect, setAspect] = useState<(typeof ASPECTS)[number]>("9:16");
  const [previewPath, setPreviewPath] = useState("");
  const [resolved, setResolved] = useState("");
  const [resultText, setResultText] = useState("");

  useEffect(() => {
    const preset = presetQuery.data?.prompt_preset;
    if (!preset || hydrated.current) {
      return;
    }
    hydrated.current = true;
    setName(preset.name || "");
    setBlurb(preset.blurb || "");
    setOutputKind(preset.output_kind || "avatar");
    setLabBrandId(preset.lab_brand_id || "");
    setPromptImage(preset.prompt_image || "");
    setPromptText(preset.prompt_text || "");
    setPreviewPath(preset.preview_path || "");
    setResultText(preset.result_text || "");
    if (preset.video_seconds === 10) {
      setSeconds(10);
    }
    if (preset.video_aspect === "16:9" || preset.video_aspect === "1:1" || preset.video_aspect === "9:16") {
      setAspect(preset.video_aspect);
    }
  }, [presetQuery.data]);

  const subjects = (kindsQuery.data?.output_kinds ?? []).filter((item) => item.code !== "market_topic");
  const brands = brandsQuery.data?.brands ?? [];

  const save = useMutation({
    mutationFn: async () => {
      const body = {
        output_kind: outputKind,
        content_format: "video",
        name,
        blurb,
        prompt_image: promptImage,
        prompt_text: promptText,
        lab_brand_id: labBrandId,
        video_seconds: seconds,
        video_aspect: aspect,
        include_logo: false,
      };
      if (isNew) {
        return api<{ prompt_preset: PromptPreset }>("/v1/backoffice/prompt-presets", {
          method: "POST",
          body: JSON.stringify(body),
        });
      }
      return api<{ prompt_preset: PromptPreset }>(`/v1/backoffice/prompt-presets/${presetId}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ["backoffice-prompt-presets"] });
      if (isNew) {
        router.replace(presetLabEditPath("video", data.prompt_preset.id));
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
      appToast.info(t("videoLab.generating"));
      const video = await api<{
        prompt_preset: PromptPreset;
        resolved_prompt: string;
      }>(`/v1/backoffice/prompt-presets/${presetId}/generate-video`, {
        method: "POST",
        body: JSON.stringify({
          prompt_image: promptImage,
          brand_id: labBrandId,
          video_seconds: seconds,
          video_aspect: aspect,
        }),
      });
      let caption = "";
      if (promptText.trim()) {
        const text = await api<{ result_text: string }>(`/v1/backoffice/prompt-presets/${presetId}/generate-text`, {
          method: "POST",
          body: JSON.stringify({
            prompt_text: promptText,
            brand_id: labBrandId,
          }),
        });
        caption = text.result_text || "";
      }
      return { video, caption };
    },
    onSuccess: async ({ video, caption }) => {
      setPreviewPath(video.prompt_preset.preview_path || "");
      setResolved(video.resolved_prompt || "");
      setPromptImage(video.prompt_preset.prompt_image || promptImage);
      if (caption) {
        setResultText(caption);
      }
      await queryClient.invalidateQueries({ queryKey: ["backoffice-prompt-preset", presetId] });
      appToast.success("ok");
    },
    onError: (err) => {
      appToast.error(err instanceof ApiError ? err.code : "error");
    },
  });

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

  const busy = save.isPending || generate.isPending;
  const canGenerate = !isNew && !busy && Boolean(labBrandId) && Boolean(promptImage.trim());
  const aspectClass = aspect === "16:9" ? "aspect-video" : aspect === "1:1" ? "aspect-square" : "aspect-[9/16]";

  return (
    <AppShell title={isNew ? t("newWithFormat", { format: t("formats.video.title") }) : t("editWithFormat", { format: t("formats.video.title") })}>
      <div className="mx-auto w-full max-w-6xl space-y-5">
        <Button asChild variant="outline" className="min-h-11">
          <Link href={isNew ? "/backoffice/presets/new" : "/backoffice/presets?content_format=video"}>
            {isNew ? t("backToFormats") : t("backToList")}
          </Link>
        </Button>

        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="video-name">{t("name")}</Label>
              <Input id="video-name" className="min-h-11" value={name} onChange={(e) => setName(e.target.value)} />
              <p className="text-xs text-ink/55">{t("nameHint")}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="video-blurb">{t("blurb")}</Label>
              <Input id="video-blurb" className="min-h-11" value={blurb} onChange={(e) => setBlurb(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>{t("subjectTag")}</Label>
              <p className="text-sm text-ink/70">{t("subjectTagHint")}</p>
              <Select value={outputKind} onValueChange={setOutputKind}>
                <SelectTrigger className="min-h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((item) => (
                    <SelectItem key={item.code} value={item.code}>
                      {messages.has(item.name_key) ? messages(item.name_key) : item.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("videoLab.brand")}</Label>
              <p className="text-sm text-ink/70">{t("videoLab.brandHint")}</p>
              <Select value={labBrandId || undefined} onValueChange={setLabBrandId}>
                <SelectTrigger className="min-h-11">
                  <SelectValue placeholder={t("videoLab.brand")} />
                </SelectTrigger>
                <SelectContent>
                  {brands.map((brand) => (
                    <SelectItem key={brand.id} value={brand.id}>
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("videoLab.duration")}</Label>
                <Select value={String(seconds)} onValueChange={(value) => setSeconds(value === "10" ? 10 : 5)}>
                  <SelectTrigger className="min-h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">{t("videoLab.seconds", { n: 5 })}</SelectItem>
                    <SelectItem value="10">{t("videoLab.seconds", { n: 10 })}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("videoLab.aspect")}</Label>
                <Select value={aspect} onValueChange={(value) => setAspect(value as (typeof ASPECTS)[number])}>
                  <SelectTrigger className="min-h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="9:16">{t("videoLab.aspectStory")}</SelectItem>
                    <SelectItem value="1:1">{t("videoLab.aspectSquare")}</SelectItem>
                    <SelectItem value="16:9">{t("videoLab.aspectWide")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="video-prompt">{t("videoLab.prompt")}</Label>
              <Textarea
                id="video-prompt"
                className="min-h-40"
                value={promptImage}
                onChange={(e) => setPromptImage(e.target.value)}
              />
              <p className="text-xs text-ink/55">{t("videoLab.promptHint")}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="video-caption">{t("videoLab.caption")}</Label>
              <Textarea
                id="video-caption"
                className="min-h-28"
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
              />
              <p className="text-xs text-ink/55">{t("videoLab.captionHint")}</p>
            </div>

            <p className="text-sm text-ink/70">{t("videoLab.publishLater")}</p>

            <div className="flex flex-wrap gap-2">
              <Button type="button" className="min-h-11" disabled={busy || !name.trim()} onClick={() => save.mutate()}>
                {save.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                {isNew ? t("create") : t("save")}
              </Button>
              <Button type="button" variant="secondary" className="min-h-11" disabled={!canGenerate} onClick={() => generate.mutate()}>
                {generate.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                {t("generate")}
              </Button>
            </div>
            {resolved ? (
              <div className="space-y-1">
                <p className="text-sm font-medium">{t("videoLab.resolved")}</p>
                <p className="whitespace-pre-wrap text-sm text-ink/70">{resolved}</p>
              </div>
            ) : null}
            {resultText ? <p className="whitespace-pre-wrap text-sm text-ink/80">{resultText}</p> : null}
          </div>

          <div className="lg:sticky lg:top-4">
            <p className="mb-2 text-sm font-medium">{t("videoLab.preview")}</p>
            <div className={cn("mx-auto w-full max-w-[280px] overflow-hidden rounded-2xl bg-muted", aspectClass)}>
              {previewPath ? (
                <video key={previewPath} src={previewPath} controls playsInline className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full min-h-40 place-items-center px-4 text-center text-sm text-ink/60">
                  {t("videoLab.previewEmpty")}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
