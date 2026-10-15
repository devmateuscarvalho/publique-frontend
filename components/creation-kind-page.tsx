"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { AppShell } from "@/components/app-shell";
import { WizardLookPreview } from "@/components/wizard-look-preview";
import { WizardPresetCarousel } from "@/components/wizard-preset-carousel";
import {
  WizardPrepare,
  aspectToAPI,
  wizardScreenKind,
  type WizardAspect,
  type WizardCarouselLayout,
  type WizardCarouselTheme,
  type WizardMood,
  type WizardProduct,
} from "@/components/wizard-prepare";
import { type WizardLocalRef } from "@/components/wizard-refs";
import { WizardStepper } from "@/components/wizard-stepper";
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
import { logoPlacements } from "@/lib/post-template";
import { usePresetCopy } from "@/lib/preset-i18n";

function normalizeLogoPlacement(value?: string): LogoPlacement {
  if (value && (logoPlacements as readonly string[]).includes(value)) {
    return value as LogoPlacement;
  }
  return "bottom_right";
}

function WizardActions({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-20 -mx-4 mt-auto border-t border-input bg-background/95 px-4 py-3 backdrop-blur md:static md:mx-0 md:mt-2 md:border-0 md:bg-transparent md:px-0 md:py-0 md:backdrop-blur-none">
      <div className="flex gap-2">{children}</div>
    </div>
  );
}

type Step = "gallery" | "prepare";

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

  const [step, setStep] = useState<Step>("gallery");
  const [selectedRecipeId, setSelectedRecipeId] = useState("");
  const [modelName, setModelName] = useState("");
  const [includeLogo, setIncludeLogo] = useState(true);
  const [logoPlacement, setLogoPlacement] = useState<LogoPlacement>("bottom_right");
  const [localRefs, setLocalRefs] = useState<WizardLocalRef[]>([]);
  const [product, setProduct] = useState<WizardProduct>({ name: "", price: "", description: "" });
  const [carouselTheme, setCarouselTheme] = useState<WizardCarouselTheme>("dark");
  const [carouselLayout, setCarouselLayout] = useState<WizardCarouselLayout>("editorial");
  const [mood, setMood] = useState<WizardMood>("");
  const [aspect, setAspect] = useState<WizardAspect>("square");
  const [previewOpen, setPreviewOpen] = useState(false);

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

  const selectRecipe = (recipe: CreativeRecipe) => {
    setSelectedRecipeId(recipe.id);
    setModelName(presetCopy.name(recipe));
    setIncludeLogo(recipe.include_logo);
    setLogoPlacement(normalizeLogoPlacement(recipe.logo_placement));
    setProduct({ name: "", price: "", description: "" });
    setMood("");
    setAspect("square");
    const key = (recipe.style_key || "").toLowerCase();
    if (key.includes("myth")) {
      setCarouselLayout("statement");
    } else if (key.includes("checklist") || key.includes("steps")) {
      setCarouselLayout("steps");
    } else {
      setCarouselLayout("editorial");
    }
    setLocalRefs((current) => {
      current.forEach((item) => URL.revokeObjectURL(item.url));
      return [];
    });
  };

  useEffect(() => {
    if (!brandId && !loading) {
      router.replace("/create");
    }
  }, [brandId, loading, router]);

  useEffect(() => {
    if (publishedQuery.isLoading || !publishedQuery.data) {
      return;
    }
    if (!publishedKind) {
      router.replace(brandId ? `/create?brand=${brandId}` : "/create");
    }
  }, [publishedQuery.isLoading, publishedQuery.data, publishedKind, brandId, router]);

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
      const postResult = await api<{ post: Post }>(`/v1/brands/${brandId}/posts`, {
        method: "POST",
        body: JSON.stringify({
          post_model_id: modelResult.model.id,
          ...(screen === "carousel"
            ? { theme: carouselTheme, layout: carouselLayout }
            : { mood: mood || undefined, aspect: aspectToAPI(aspect) }),
          ...(screen === "product"
            ? {
                product: {
                  name: product.name.trim(),
                  price: product.price.trim(),
                  description: product.description.trim(),
                },
              }
            : {}),
        }),
      });
      return postResult.post;
    },
    onSuccess: (post) => {
      void queryClient.invalidateQueries({ queryKey: ["models"] });
      void queryClient.invalidateQueries({ queryKey: ["posts"] });
      router.push(`/posts/${post.id}?brand=${brandId}`);
    },
    onError: (error) => {
      const code = error instanceof ApiError ? error.code : "internal_error";
      appToast.error(errors(code === "ai_unconfigured" ? "ai_unconfigured" : code === "invalid_input" ? "invalid_input" : "internal_error"), "wizard");
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
    router.push(brandId ? `/create?brand=${brandId}` : "/create");
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
      <div className="flex w-full min-h-0 flex-1 flex-col gap-4 md:gap-6">
        {step === "gallery" ? (
          <section className="mx-auto flex w-full max-w-2xl flex-1 flex-col space-y-3 md:space-y-4">
            <WizardStepper
              step={1}
              onGoTo={(next) => {
                if (next === 0) {
                  backToHub();
                }
              }}
            />
            <div className="space-y-1">
              <h2 className="text-lg font-semibold md:text-xl">{t("galleryTitle")}</h2>
              <p className="text-sm text-ink/70">{t("galleryLeadKind", { kind: kindTitle })}</p>
            </div>
            {recipesQuery.isLoading ? <p className="text-sm text-ink/70">{t("loading")}</p> : null}
            {!recipesQuery.isLoading && recipes.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-input bg-card p-5 text-sm text-ink/70">
                {t("galleryEmpty")}
              </p>
            ) : null}
            <WizardPresetCarousel
              recipes={recipes}
              selectedId={selectedRecipe?.id ?? ""}
              onSelect={selectRecipe}
              onPreview={(recipe) => {
                selectRecipe(recipe);
                setPreviewOpen(true);
              }}
              onConfirm={goPrepare}
              kindLabel={(kind) => creation(`outputKinds.${kind}`)}
              prevLabel={t("galleryPrev")}
              nextLabel={t("galleryNext")}
              label={t("galleryTitle")}
            />

            <WizardActions>
              <Button type="button" variant="outline" className="min-h-11 min-w-24" onClick={backToHub}>
                {t("back")}
              </Button>
              <Button
                type="button"
                className="min-h-11 flex-1"
                disabled={!selectedRecipe}
                onClick={() => goPrepare()}
              >
                {t("next")}
              </Button>
            </WizardActions>
            <WizardLookPreview
              open={previewOpen && Boolean(selectedRecipe)}
              recipe={selectedRecipe}
              brandName={selectedBrand?.name ?? ""}
              visual={visualQuery.data?.identity}
              emptyImageLabel={phone("phoneEmptyImage")}
              emptyCaptionLabel={phone("phoneEmptyCaption")}
              generatingCaptionLabel={phone("phoneGeneratingCaption")}
              likesLabel={phone.raw("phoneLikes")}
              onOpenChange={setPreviewOpen}
            />
          </section>
        ) : null}

        {step === "prepare" ? (
          <section className="mx-auto flex w-full max-w-xl flex-1 flex-col space-y-3 md:space-y-4">
            <WizardStepper
              step={2}
              onGoTo={(next) => {
                if (next === 0) {
                  backToHub();
                }
                if (next === 1) {
                  setStep("gallery");
                }
              }}
            />
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
                carouselLayout={carouselLayout}
                onCarouselLayout={setCarouselLayout}
                mood={mood}
                onMood={setMood}
                aspect={aspect}
                onAspect={setAspect}
              />
            ) : (
              <div className="space-y-1.5 rounded-2xl border border-dashed border-input bg-card p-5">
                <h2 className="text-lg font-semibold md:text-xl">{kindTitle}</h2>
                <p className="text-sm text-ink/70">{t("kindComingSoon")}</p>
              </div>
            )}
            <WizardActions>
              <Button type="button" variant="outline" className="min-h-11 min-w-24" onClick={() => setStep("gallery")}>
                {t("back")}
              </Button>
              {canGenerate ? (
                <Button
                  type="button"
                  className="min-h-11 flex-1"
                  disabled={
                    !selectedRecipe ||
                    generate.isPending ||
                    (wizardScreenKind(selectedRecipe) === "product" && !product.name.trim())
                  }
                  onClick={() => generate.mutate()}
                >
                  {generate.isPending ? <Loader2 className="animate-spin" aria-hidden /> : null}
                  {t("generate")}
                </Button>
              ) : null}
            </WizardActions>
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}
