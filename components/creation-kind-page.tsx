"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { WizardLookPreview } from "@/components/wizard-look-preview";
import { WizardPresetCarousel } from "@/components/wizard-preset-carousel";
import {
  WizardPrepare,
  aspectToAPI,
  normalizeLogoPlacement,
  wizardScreenKind,
  type WizardAspect,
  type WizardCarouselTheme,
  type WizardMood,
  type WizardProduct,
} from "@/components/wizard-prepare";
import { type WizardLocalRef } from "@/components/wizard-refs";
import { WIZARD_STEPS, WizardStepper } from "@/components/wizard-stepper";
import { WizardWhen, type WhenMode } from "@/components/wizard-when";
import { WizardActions, WizardFrame, WizardStepHeader, wizardEmptyClass, wizardPrimaryClass, wizardSecondaryClass } from "@/components/wizard-ui";
import { Button } from "@/components/ui/button";
import { useAccount } from "@/components/use-account";
import {
  ApiError,
  api,
  apiUpload,
  type Brand,
  type CreativeRecipe,
  type OutputKind,
  type Post,
  type PostModel,
  type VisualResponse,
} from "@/lib/api";
import { appToast } from "@/lib/app-toast";
import { type LogoPlacement } from "@/lib/backoffice-preset-shared";
import { usePresetCopy } from "@/lib/preset-i18n";

type Step = "gallery" | "prepare" | "when";


function localToday() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function isoWeekday(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return String(weekday === 0 ? 7 : weekday);
}

function createHubHref(
  brandId: string,
  params: { get: (key: string) => string | null },
  destination: "brand" | "kind" = "kind",
) {
  const search = new URLSearchParams();
  if (brandId) {
    search.set("brand", brandId);
  }
  if (destination === "brand") {
    search.set("step", "brand");
  }
  const on = params.get("on") ?? "";
  const at = params.get("at") ?? "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(on)) {
    search.set("on", on);
  }
  if (/^\d{2}:\d{2}$/.test(at)) {
    search.set("at", at);
  }
  const query = search.toString();
  return query ? `/create?${query}` : "/create";
}

export function CreationKindPage() {
  const t = useTranslations("wizard");
  const phone = useTranslations("backoffice");
  const creation = useTranslations("creation");
  const messages = useTranslations();
  const errors = useTranslations("errors");
  const presetCopy = usePresetCopy();
  const queryClient = useQueryClient();
  const router = useRouter();
  const params = useParams<{ kind: string }>();
  const searchParams = useSearchParams();
  const { organization, loading } = useAccount();

  const kindCode = typeof params.kind === "string" ? params.kind : "";
  const brandId = searchParams.get("brand") ?? "";
  const presetOn = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.get("on") ?? "") ? (searchParams.get("on") as string) : "";
  const presetAt = /^\d{2}:\d{2}$/.test(searchParams.get("at") ?? "") ? (searchParams.get("at") as string) : "";

  const [step, setStep] = useState<Step>("gallery");
  const [selectedRecipeId, setSelectedRecipeId] = useState("");
  const [modelName, setModelName] = useState("");
  const [includeLogo, setIncludeLogo] = useState(true);
  const [logoPlacement, setLogoPlacement] = useState<LogoPlacement>("bottom_right");
  const [localRefs, setLocalRefs] = useState<WizardLocalRef[]>([]);
  const [product, setProduct] = useState<WizardProduct>({ name: "", price: "", description: "" });
  const [carouselTheme, setCarouselTheme] = useState<WizardCarouselTheme>("dark");
  const [mood, setMood] = useState<WizardMood>("");
  const [aspect, setAspect] = useState<WizardAspect>("square");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewRecipeId, setPreviewRecipeId] = useState("");
  const [whenMode, setWhenMode] = useState<WhenMode>(presetOn ? "once" : "now");
  const [publishOn, setPublishOn] = useState(presetOn);
  const [publishTime, setPublishTime] = useState(presetAt || "09:00");
  const [weekday, setWeekday] = useState(presetOn ? isoWeekday(presetOn) : "1");
  const [startsOn, setStartsOn] = useState(presetOn || localToday);
  const [endsOn, setEndsOn] = useState("");
  const [networks, setNetworks] = useState<string[]>([]);
  const [requireApproval, setRequireApproval] = useState(false);
  const scheduleKey = presetOn ? `${presetOn}|${presetAt}` : "";
  const appliedSchedule = useRef("");
  useEffect(() => {
    if (!scheduleKey || appliedSchedule.current === scheduleKey) {
      return;
    }
    appliedSchedule.current = scheduleKey;
    setWhenMode("once");
    setPublishOn(presetOn);
    setPublishTime(presetAt || "09:00");
    setWeekday(isoWeekday(presetOn));
    setStartsOn(presetOn);
  }, [scheduleKey, presetOn, presetAt]);

  const publishedQuery = useQuery({
    queryKey: ["output-kinds", "published"],
    queryFn: () => api<{ output_kinds: OutputKind[] }>("/v1/output-kinds"),
    enabled: Boolean(kindCode),
  });
  const publishedKind = (publishedQuery.data?.output_kinds ?? []).find((item) => item.code === kindCode);
  const canGenerate = Boolean(publishedKind && publishedKind.pipeline !== "none");

  const brandQuery = useQuery({
    queryKey: ["brand", brandId],
    queryFn: () => api<{ brand: Brand }>(`/v1/brands/${brandId}`),
    enabled: Boolean(brandId),
  });
  const selectedBrand = brandQuery.data?.brand ?? null;
  const visualQuery = useQuery({
    queryKey: ["visual", brandId],
    queryFn: () => api<VisualResponse>(`/v1/brands/${brandId}/visual`),
    enabled: Boolean(brandId),
    staleTime: 5 * 60_000,
  });

  const recipesQuery = useQuery({
    queryKey: ["creative-recipes", organization?.id, selectedBrand?.id, kindCode],
    queryFn: () => {
      const query = new URLSearchParams();
      if (selectedBrand?.segment_id) {
        query.set("segment_id", selectedBrand.segment_id);
      }
      query.set("output_kind", kindCode);
      return api<{ creative_recipes: CreativeRecipe[] }>(
        `/v1/organizations/${organization?.id}/creative-recipes?${query.toString()}`,
      );
    },
    enabled: Boolean(organization?.id && selectedBrand?.id && kindCode),
  });

  const recipes = useMemo(() => recipesQuery.data?.creative_recipes ?? [], [recipesQuery.data?.creative_recipes]);
  const selectedRecipe = recipes.find((item) => item.id === selectedRecipeId) ?? recipes[0];
  const previewRecipe = recipes.find((item) => item.id === previewRecipeId) ?? null;

  const selectRecipe = (recipe: CreativeRecipe) => {
    setSelectedRecipeId(recipe.id);
    setModelName(presetCopy.name(recipe));
    setIncludeLogo(recipe.include_logo);
    setLogoPlacement(normalizeLogoPlacement(recipe.logo_placement));
    setProduct({ name: "", price: "", description: "" });
    setMood("");
    setAspect("square");
    setLocalRefs((current) => {
      current.forEach((item) => URL.revokeObjectURL(item.url));
      return [];
    });
  };

  useEffect(() => {
    if (!brandId && !loading) {
      router.replace(createHubHref("", searchParams));
    }
  }, [brandId, loading, router, searchParams]);

  useEffect(() => {
    if (publishedQuery.isLoading || !publishedQuery.data) {
      return;
    }
    if (!publishedKind) {
      router.replace(createHubHref(brandId, searchParams));
    }
  }, [publishedQuery.isLoading, publishedQuery.data, publishedKind, brandId, router, searchParams]);

  const addLocalRef = (role: "person" | "location", file: File) => {
    setLocalRefs((current) => {
      if (role === "location") {
        const previous = current.find((item) => item.role === "location");
        if (previous) {
          URL.revokeObjectURL(previous.url);
        }
        return [
          ...current.filter((item) => item.role !== "location"),
          { key: crypto.randomUUID(), role, file, url: URL.createObjectURL(file) },
        ];
      }
      if (current.filter((item) => item.role === "person").length >= 3) {
        return current;
      }
      return [...current, { key: crypto.randomUUID(), role, file, url: URL.createObjectURL(file) }];
    });
  };

  const removeLocalRef = (key: string) => {
    setLocalRefs((current) => {
      const found = current.find((item) => item.key === key);
      if (found) {
        URL.revokeObjectURL(found.url);
      }
      return current.filter((item) => item.key !== key);
    });
  };

  const generate = useMutation({
    mutationFn: async () => {
      if (!brandId || !selectedRecipe || !canGenerate) {
        throw new ApiError("invalid_input");
      }
      const name = modelName.trim() || presetCopy.name(selectedRecipe);
      const modelResult = await api<{ model: PostModel }>(`/v1/brands/${brandId}/models`, {
        method: "POST",
        body: JSON.stringify({
          prompt_preset_id: selectedRecipe.id,
          name,
          include_logo: includeLogo,
          logo_placement: logoPlacement,
        }),
      });
      for (const ref of localRefs) {
        const form = new FormData();
        form.append("file", ref.file);
        form.append("role", ref.role);
        await apiUpload(`/v1/brands/${brandId}/models/${modelResult.model.id}/references?role=${ref.role}`, form);
      }
      const screen = wizardScreenKind(selectedRecipe);
      const brief = {
        ...(screen === "carousel" ? { theme: carouselTheme } : {}),
        ...(screen === "single" ? { mood: mood || undefined, aspect: aspectToAPI(aspect) } : {}),
        ...(screen === "product"
          ? {
              product: {
                name: product.name.trim(),
                price: product.price.trim(),
                description: product.description.trim(),
              },
            }
          : {}),
      };
      if (whenMode === "weekly") {
        const [hour, minute] = publishTime.split(":");
        await api(`/v1/brands/${brandId}/automation/slots`, {
          method: "POST",
          body: JSON.stringify({
            post_model_id: modelResult.model.id,
            weekday: Number(weekday),
            hour: Number(hour),
            minute: Number(minute || 0),
            networks,
            require_approval: requireApproval,
            starts_on: startsOn,
            ends_on: endsOn,
            ...brief,
          }),
        });
        return { kind: "slot" as const, post: null };
      }
      const postResult = await api<{ post: Post }>(`/v1/brands/${brandId}/posts`, {
        method: "POST",
        body: JSON.stringify({
          post_model_id: modelResult.model.id,
          ...brief,
          ...(whenMode === "once"
            ? {
                publish_on: publishOn,
                publish_time: publishTime,
                networks,
                require_approval: requireApproval,
              }
            : {}),
        }),
      });
      return { kind: "post" as const, post: postResult.post };
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ["models"] });
      void queryClient.invalidateQueries({ queryKey: ["posts"] });
      if (result.kind === "slot") {
        router.push(`/calendar?brand=${brandId}`);
        return;
      }
      if (result.post) {
        router.push(`/posts/${result.post.id}?brand=${brandId}`);
      }
    },
    onError: (error) => {
      const code = error instanceof ApiError ? error.code : "internal_error";
      const known = ["ai_unconfigured", "invalid_input", "schedule_taken", "provider_unavailable"];
      appToast.error(errors(known.includes(code) ? code : "internal_error"), "wizard");
    },
  });

  const goPrepare = (recipe?: CreativeRecipe) => {
    const chosen = recipe ?? selectedRecipe;
    if (!chosen) {
      return;
    }
    selectRecipe(chosen);
    setPreviewOpen(false);
    setStep("prepare");
  };

  const backToHub = () => {
    router.push(createHubHref(brandId, searchParams));
  };

  const goToWizardStep = (index: number) => {
    if (index <= 0) {
      router.push(createHubHref(brandId, searchParams, "brand"));
      return;
    }
    if (index === 1) {
      backToHub();
      return;
    }
    if (index === 2) {
      setPreviewOpen(false);
      setStep("gallery");
      return;
    }
    if (index === 3) {
      setStep("prepare");
    }
  };

  if (loading || publishedQuery.isLoading || !publishedKind) {
    return (
      <AppShell title={t("title")} fluid>
        <p className="text-sm text-ink/70">{t("loading")}</p>
      </AppShell>
    );
  }

  if (!organization) {
    return (
      <AppShell title={t("title")} fluid>
        <p className="text-sm text-ink/70">{t("needOrg")}</p>
      </AppShell>
    );
  }

  const kindTitle = messages(publishedKind.name_key);

  return (
    <AppShell title={t("title")} fluid>
      <div className="flex w-full min-h-0 flex-1 flex-col">
        {step === "gallery" ? (
          <WizardFrame>
            <WizardStepper steps={WIZARD_STEPS} step={2} onGoTo={goToWizardStep} />
            <WizardStepHeader title={t("galleryTitle")} lead={t("galleryLeadKind", { kind: kindTitle })} />
            {recipesQuery.isLoading ? <p className="text-sm text-ink/65">{t("loading")}</p> : null}
            {!recipesQuery.isLoading && recipes.length === 0 ? (
              <p className={wizardEmptyClass}>{t("galleryEmpty")}</p>
            ) : null}
            <WizardPresetCarousel
              recipes={recipes}
              selectedId={selectedRecipe?.id ?? ""}
              onSelect={selectRecipe}
              onPreview={(recipe) => {
                setPreviewRecipeId(recipe.id);
                setPreviewOpen(true);
              }}
              onConfirm={goPrepare}
              kindLabel={(kind) => creation(`outputKinds.${kind}`)}
              prevLabel={t("galleryPrev")}
              nextLabel={t("galleryNext")}
              label={t("galleryTitle")}
            />

            <WizardActions>
              <Button type="button" variant="outline" className={wizardSecondaryClass} onClick={backToHub}>
                {t("back")}
              </Button>
              <Button
                type="button"
                className={wizardPrimaryClass}
                disabled={!selectedRecipe}
                onClick={() => goPrepare()}
              >
                {t("next")}
              </Button>
            </WizardActions>
            <WizardLookPreview
              open={previewOpen && Boolean(previewRecipe)}
              recipe={previewRecipe}
              brandName={selectedBrand?.name ?? ""}
              visual={visualQuery.data?.identity}
              emptyImageLabel={phone("phoneEmptyImage")}
              emptyCaptionLabel={phone("phoneEmptyCaption")}
              generatingCaptionLabel={phone("phoneGeneratingCaption")}
              likesLabel={phone.raw("phoneLikes")}
              onOpenChange={setPreviewOpen}
            />
          </WizardFrame>
        ) : null}

        {step === "prepare" ? (
          <WizardFrame>
            <WizardStepper steps={WIZARD_STEPS} step={3} onGoTo={goToWizardStep} />
            {canGenerate ? (
              <WizardPrepare
                recipe={selectedRecipe}
                includeLogo={includeLogo}
                onIncludeLogo={setIncludeLogo}
                logoPlacement={logoPlacement}
                onLogoPlacement={setLogoPlacement}
                refs={localRefs}
                onAdd={addLocalRef}
                onRemove={removeLocalRef}
                product={product}
                onProduct={setProduct}
                carouselTheme={carouselTheme}
                onCarouselTheme={setCarouselTheme}
                mood={mood}
                onMood={setMood}
                aspect={aspect}
                onAspect={setAspect}
              />
            ) : (
              <div className="space-y-1.5 rounded-lg border border-dashed border-border bg-card p-5">
                <h2 className="font-display text-xl font-semibold tracking-tight">{kindTitle}</h2>
                <p className="text-sm leading-relaxed text-ink/65">{t("kindComingSoon")}</p>
              </div>
            )}
            <WizardActions>
              <Button type="button" variant="outline" className={wizardSecondaryClass} onClick={() => setStep("gallery")}>
                {t("back")}
              </Button>
              {canGenerate ? (
                <Button
                  type="button"
                  className={wizardPrimaryClass}
                  disabled={
                    !selectedRecipe ||
                    (wizardScreenKind(selectedRecipe) === "product" && !product.name.trim())
                  }
                  onClick={() => setStep("when")}
                >
                  {t("next")}
                </Button>
              ) : null}
            </WizardActions>
          </WizardFrame>
        ) : null}

        {step === "when" && selectedRecipe ? (
          <WizardFrame>
            <WizardStepper steps={WIZARD_STEPS} step={4} onGoTo={goToWizardStep} />
            <WizardWhen
              brandId={brandId}
              timezone={selectedBrand?.timezone ?? ""}
              mode={whenMode}
              onMode={setWhenMode}
              publishOn={publishOn}
              onPublishOn={setPublishOn}
              publishTime={publishTime}
              onPublishTime={setPublishTime}
              weekday={weekday}
              onWeekday={setWeekday}
              startsOn={startsOn}
              onStartsOn={setStartsOn}
              endsOn={endsOn}
              onEndsOn={setEndsOn}
              networks={networks}
              onNetworks={setNetworks}
              requireApproval={requireApproval}
              onRequireApproval={setRequireApproval}
            />
            <WizardActions>
              <Button type="button" variant="outline" className={wizardSecondaryClass} onClick={() => setStep("prepare")}>
                {t("back")}
              </Button>
              <Button
                type="button"
                className={wizardPrimaryClass}
                disabled={
                  generate.isPending ||
                  (wizardScreenKind(selectedRecipe) === "product" && !product.name.trim()) ||
                  (whenMode !== "now" && networks.length === 0) ||
                  (whenMode === "once" && (!publishOn || !publishTime)) ||
                  (whenMode === "weekly" && (!startsOn || !publishTime))
                }
                onClick={() => generate.mutate()}
              >
                {generate.isPending ? <Loader2 className="animate-spin" aria-hidden /> : null}
                {whenMode === "weekly" ? t("whenConfirmWeekly") : t("generate")}
              </Button>
            </WizardActions>
          </WizardFrame>
        ) : null}
      </div>
    </AppShell>
  );
}
