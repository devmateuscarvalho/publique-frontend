"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { AppShell } from "@/components/app-shell";
import { ConfirmAlertDialog } from "@/components/confirm-alert-dialog";
import { useCreationBrand } from "@/components/creation-brand";
import { SocialNetworkIcon, type SocialNetworkID } from "@/components/social-network-icons";
import { BrandFilter, CreationFrame, useBrandQuery } from "@/components/creation-screen";
import { useAccount } from "@/components/use-account";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  WizardPrepare,
  aspectToAPI,
  defaultCarouselLayout,
  normalizeLogoPlacement,
  wizardScreenKind,
  type WizardAspect,
  type WizardCarouselLayout,
  type WizardCarouselTheme,
  type WizardMood,
  type WizardProduct,
} from "@/components/wizard-prepare";
import { type WizardLocalRef } from "@/components/wizard-refs";
import { ApiError, api, apiUpload, type CreativeRecipe, type OutputKind } from "@/lib/api";
import { type LogoPlacement } from "@/lib/backoffice-preset-shared";
import { startSocialOAuth } from "@/lib/social-connect";
import { appToast } from "@/lib/app-toast";
import { usePresetCopy } from "@/lib/preset-i18n";
import { cn } from "@/lib/utils";

const weekdays = [1, 2, 3, 4, 5, 6, 7] as const;
const networkChoices = ["linkedin", "instagram", "facebook", "tiktok"] as const;
type NetworkChoice = (typeof networkChoices)[number];
const calendarDays = [7, 1, 2, 3, 4, 5, 6] as const;
const calendarHours = Array.from({ length: 24 }, (_, hour) => hour);

type AutomationSlot = {
  id: string;
  post_model_id: string;
  model_name: string;
  weekday: number;
  hour: number;
  minute: number;
  networks?: string[];
  require_approval?: boolean;
  brief?: SlotBrief;
};

type SlotBrief = {
  theme?: string;
  layout?: string;
  mood?: string;
  aspect?: string;
  product?: { name: string; price?: string; description?: string };
};

type AutomationRun = {
  id: string;
  post_id: string | null;
  post_model_id: string;
  model_name: string;
  weekday: number;
  hour: number;
  minute: number;
  occurrence_on: string;
  status: string;
  error_code: string;
  message: string;
  created_at: string;
};

const runErrorCodes = [
  "ai_unconfigured",
  "provider_unavailable",
  "invalid_input",
  "not_found",
  "model_inactive",
  "invalid_timezone",
  "automation_failed",
  "automation_queue_failed",
  "queue_failed",
  "schedule_taken",
] as const;

type RunErrorCode = (typeof runErrorCodes)[number];

export function AutomationWeek() {
  const t = useTranslations("creation");
  return (
    <AppShell title={t("automationTitle")}>
      <CreationFrame>
        <WeekPlanner />
      </CreationFrame>
    </AppShell>
  );
}

function WeekPlanner() {
  const t = useTranslations("creation");
  const errors = useTranslations("errors");
  const messages = useTranslations();
  const recipeLabel = (name: string) => (messages.has(name) ? messages(name) : name);
  const queryClient = useQueryClient();
  const { organization } = useAccount();
  const { brands } = useCreationBrand();
  const { brandId, setBrandId } = useBrandQuery();
  const brand = brands.find((item) => item.id === brandId);
  const [kindCode, setKindCode] = useState("");
  const [presetId, setPresetId] = useState("");
  const [weekday, setWeekday] = useState("1");
  const [time, setTime] = useState("09:00");
  const [networks, setNetworks] = useState<NetworkChoice[]>([]);
  const [requireApproval, setRequireApproval] = useState(false);
  const [includeLogo, setIncludeLogo] = useState(true);
  const [logoPlacement, setLogoPlacement] = useState<LogoPlacement>("bottom_right");
  const [localRefs, setLocalRefs] = useState<WizardLocalRef[]>([]);
  const [product, setProduct] = useState<WizardProduct>({ name: "", price: "", description: "" });
  const [carouselTheme, setCarouselTheme] = useState<WizardCarouselTheme>("dark");
  const [carouselLayout, setCarouselLayout] = useState<WizardCarouselLayout>("editorial");
  const [mood, setMood] = useState<WizardMood>("");
  const [aspect, setAspect] = useState<WizardAspect>("square");
  const [openCell, setOpenCell] = useState<{ weekday: number; hour: number } | null>(null);
  const detailsRef = useRef<HTMLDivElement>(null);

  const presetCopy = usePresetCopy();
  const kindsQuery = useQuery({
    queryKey: ["output-kinds", "published"],
    queryFn: () => api<{ output_kinds: OutputKind[] }>("/v1/output-kinds"),
    enabled: Boolean(organization?.id && brandId),
  });
  const outputKinds = kindsQuery.data?.output_kinds ?? [];
  const recipesQuery = useQuery({
    queryKey: ["creative-recipes", organization?.id, brandId, kindCode, "automation"],
    queryFn: () => {
      const query = new URLSearchParams();
      if (brand?.segment_id) {
        query.set("segment_id", brand.segment_id);
      }
      query.set("output_kind", kindCode);
      return api<{ creative_recipes: CreativeRecipe[] }>(
        `/v1/organizations/${organization?.id}/creative-recipes?${query.toString()}`,
      );
    },
    enabled: Boolean(organization?.id && brandId && kindCode),
  });
  const recipes = recipesQuery.data?.creative_recipes ?? [];
  const selectedRecipe = recipes.find((recipe) => recipe.id === presetId) ?? null;
  const screen = selectedRecipe ? wizardScreenKind(selectedRecipe) : null;
  const needsProduct = screen === "product" && !product.name.trim();

  const clearRefs = () => {
    setLocalRefs((current) => {
      current.forEach((item) => URL.revokeObjectURL(item.url));
      return [];
    });
  };

  const selectPreset = (id: string) => {
    setPresetId(id);
    const recipe = recipes.find((item) => item.id === id);
    setIncludeLogo(recipe?.include_logo ?? true);
    setLogoPlacement(normalizeLogoPlacement(recipe?.logo_placement));
    setProduct({ name: "", price: "", description: "" });
    setCarouselTheme("dark");
    setCarouselLayout(defaultCarouselLayout(recipe));
    setMood("");
    setAspect("square");
    clearRefs();
  };

  const addLocalRef = (role: "person" | "location", file: File) => {
    setLocalRefs((current) => {
      if (role === "location") {
        current.filter((item) => item.role === "location").forEach((item) => URL.revokeObjectURL(item.url));
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

  const integrationsQuery = useQuery({
    queryKey: ["integrations", brandId],
    queryFn: () =>
      api<{ integrations: { network: string; configured: boolean; page_urn?: string }[] }>(
        `/v1/brands/${brandId}/integrations`,
      ),
    enabled: Boolean(brandId),
  });
  const connectedNetworks: NetworkChoice[] = networkChoices.filter((id) => {
    const row = (integrationsQuery.data?.integrations ?? []).find((item) => item.network === id);
    if (!row?.configured) {
      return false;
    }
    if (id === "linkedin" || id === "facebook") {
      return Boolean(row.page_urn?.trim());
    }
    if (id === "instagram" || id === "tiktok") {
      return Boolean(row.page_urn?.trim() || row.configured);
    }
    return true;
  });
  const returnTo = brandId ? `/posts/automate?brand=${brandId}` : "/posts/automate";

  const countsQuery = useQuery({
    queryKey: ["automation-counts", organization?.id],
    queryFn: () =>
      api<{ brands: { brand_id: string; count: number }[] }>(`/v1/organizations/${organization?.id}/automation`),
    enabled: Boolean(organization?.id) && !brandId,
  });
  const countByBrand = new Map((countsQuery.data?.brands ?? []).map((item) => [item.brand_id, item.count]));

  const scheduleQuery = useQuery({
    queryKey: ["automation", brandId],
    queryFn: () => api<{ slots: AutomationSlot[]; runs: AutomationRun[] }>(`/v1/brands/${brandId}/automation`),
    enabled: Boolean(brandId),
  });
  const slots = scheduleQuery.data?.slots ?? [];
  const runs = scheduleQuery.data?.runs ?? [];
  const openSlots = openCell
    ? slots
        .filter((slot) => slot.weekday === openCell.weekday && slot.hour === openCell.hour)
        .sort((a, b) => a.minute - b.minute)
    : [];

  const add = useMutation({
    mutationFn: async () => {
      const [hourText, minuteText] = time.split(":");
      const hour = Number(hourText);
      const minute = Number(minuteText);
      const result = await api<{ slot: AutomationSlot }>(`/v1/brands/${brandId}/automation/slots`, {
        method: "POST",
        body: JSON.stringify({
          prompt_preset_id: presetId,
          weekday: Number(weekday),
          hour,
          minute,
          networks,
          require_approval: requireApproval,
          ...(screen === "carousel" ? {} : { include_logo: includeLogo, logo_placement: logoPlacement }),
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
      if (screen === "product" || screen === "avatar") {
        for (const ref of localRefs) {
          const form = new FormData();
          form.append("file", ref.file);
          form.append("role", ref.role);
          await apiUpload(
            `/v1/brands/${brandId}/models/${result.slot.post_model_id}/references?role=${ref.role}`,
            form,
          );
        }
      }
      return result;
    },
    onSuccess: async () => {
      clearRefs();
      await queryClient.invalidateQueries({ queryKey: ["automation", brandId] });
      await queryClient.invalidateQueries({ queryKey: ["automation-counts", organization?.id] });
    },
    onError: (error) => appToast.error(errors(runError(error))),
  });

  const remove = useMutation({
    mutationFn: (slotId: string) =>
      api<void>(`/v1/brands/${brandId}/automation/slots/${slotId}`, { method: "DELETE" }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["automation", brandId] });
      await queryClient.invalidateQueries({ queryKey: ["automation-counts", organization?.id] });
    },
    onError: (error) => appToast.error(errors(runError(error))),
  });

  const clockOk = /^\d{2}:\d{2}/.test(time);

  useEffect(() => {
    if (!kindCode && outputKinds.length > 0) {
      setKindCode(outputKinds[0].code);
    }
  }, [kindCode, outputKinds]);

  useEffect(() => {
    setNetworks((current) => current.filter((id) => connectedNetworks.includes(id)));
  }, [connectedNetworks.join(",")]);

  useEffect(() => {
    if (openSlots.length > 0) {
      detailsRef.current?.scrollIntoView({ block: "nearest" });
    }
  }, [openCell, openSlots.length]);

  return (
    <div className="space-y-4">
      <div className="flex justify-start">
        <BrandFilter />
      </div>
      {brandId ? <p className="text-sm text-ink/70">{t("automationLead")}</p> : null}
      {!brandId ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {brands.map((item) => {
            const count = countByBrand.get(item.id) ?? 0;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className="flex min-h-11 w-full flex-col items-start justify-center gap-1 rounded-2xl border border-input bg-card px-4 py-3 text-left"
                  onClick={() => setBrandId(item.id)}
                >
                  <span className="font-medium">{item.name}</span>
                  <span className="text-sm text-ink/70">
                    {countsQuery.isSuccess ? `${t("automationBrandCount", { count })} — ` : null}
                    {t("automationOpenBrand")}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
      {brand ? <p className="text-sm text-ink/70">{t("automationHint", { timezone: brand.timezone })}</p> : null}

      {brandId ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("automationAdd")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {outputKinds.length === 0 && !kindsQuery.isLoading ? (
              <p className="text-sm text-ink/70">{t("automationNeedPreset")}</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="automation-kind">{t("automationKind")}</Label>
                  <Select
                    value={kindCode}
                    onValueChange={(code) => {
                      setKindCode(code);
                      selectPreset("");
                    }}
                  >
                    <SelectTrigger id="automation-kind">
                      <SelectValue placeholder={t("automationKindPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {outputKinds.map((kind) => (
                        <SelectItem key={kind.code} value={kind.code}>
                          {messages.has(kind.name_key)
                            ? messages(kind.name_key)
                            : t.has(`outputKinds.${kind.code}`)
                              ? t(`outputKinds.${kind.code}`)
                              : kind.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="automation-preset">{t("automationPreset")}</Label>
                  <Select value={presetId} onValueChange={selectPreset} disabled={!kindCode || recipesQuery.isLoading}>
                    <SelectTrigger id="automation-preset">
                      <SelectValue placeholder={t("automationPresetPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {recipes.map((recipe) => (
                        <SelectItem key={recipe.id} value={recipe.id}>
                          {presetCopy.name(recipe)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {kindCode && recipes.length === 0 && !recipesQuery.isLoading ? (
                  <p className="text-sm text-ink/70 sm:col-span-2">{t("automationNoLooksForKind")}</p>
                ) : null}
                {selectedRecipe ? (
                  <div className="space-y-2 sm:col-span-2">
                    <p className="text-sm text-ink/70">{t("automationLookVariablesHint")}</p>
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
                  </div>
                ) : null}
                <div className="space-y-2">
                  <Label htmlFor="automation-day">{t("automationDay")}</Label>
                  <Select value={weekday} onValueChange={setWeekday}>
                    <SelectTrigger id="automation-day">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {weekdays.map((day) => (
                        <SelectItem key={day} value={String(day)}>
                          {t(`weekdays.${day}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>{t("automationNetworks")}</Label>
                  {connectedNetworks.length === 0 && !integrationsQuery.isLoading ? (
                    <p className="text-sm text-ink/70">{t("automationNoNetworks")}</p>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    {networkChoices.map((id) => {
                      const connected = connectedNetworks.includes(id);
                      const selected = networks.includes(id);
                      if (!connected) {
                        return (
                          <Button
                            key={id}
                            type="button"
                            variant="outline"
                            className="min-h-11 gap-2"
                            onClick={() => {
                              if (brandId) {
                                void startSocialOAuth(brandId, id, returnTo).then(() =>
                                  integrationsQuery.refetch(),
                                );
                              }
                            }}
                          >
                            <SocialNetworkIcon id={id as SocialNetworkID} className="size-4" />
                            {t("automationConnectNetwork", { network: t(`manualPublishNetworks.${id}`) })}
                          </Button>
                        );
                      }
                      return (
                        <button
                          key={id}
                          type="button"
                          aria-pressed={selected}
                          className={cn(
                            "inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm font-medium",
                            selected ? "border-foreground bg-foreground text-background" : "border-input bg-background",
                          )}
                          onClick={() =>
                            setNetworks((current) =>
                              current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
                            )
                          }
                        >
                          <SocialNetworkIcon id={id as SocialNetworkID} className="size-4" />
                          {t(`manualPublishNetworks.${id}`)}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <label className="flex min-h-11 cursor-pointer items-center gap-3 sm:col-span-2">
                  <input
                    type="checkbox"
                    className="size-4 rounded border-input"
                    checked={requireApproval}
                    onChange={(event) => setRequireApproval(event.target.checked)}
                  />
                  <span className="text-sm">{t("automationRequireApproval")}</span>
                </label>
                <div className="space-y-2">
                  <Label htmlFor="automation-time">{t("automationTime")}</Label>
                  <Input
                    id="automation-time"
                    type="time"
                    step={60}
                    value={time}
                    onChange={(event) => setTime(event.target.value)}
                  />
                </div>
              </div>
            )}
            <Button
              type="button"
              className="w-full sm:w-auto"
              disabled={!presetId || !clockOk || networks.length === 0 || needsProduct || add.isPending}
              onClick={() => add.mutate()}
            >
              {t("automationAdd")}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {brandId ? (
        <div className="overflow-x-auto rounded-2xl border border-input bg-card">
          <div className="min-w-[40rem]">
            <div className="grid grid-cols-[3rem_repeat(7,minmax(2.75rem,1fr))] border-b border-input bg-muted/40">
              <div className="border-r border-input px-1 py-2 text-center text-xs font-semibold text-foreground">
                {t("automationHour")}
              </div>
              {calendarDays.map((day) => (
                <div
                  key={day}
                  className="border-r border-input px-1 py-2 text-center text-xs font-semibold tracking-wide text-foreground"
                  title={t(`weekdays.${day}`)}
                >
                  {t(`weekdaysShort.${day}`)}
                </div>
              ))}
            </div>
            <div className="max-h-[min(50vh,calc(100vh-24rem))] overflow-y-auto">
              {calendarHours.map((hour) => (
                <div key={hour} className="grid grid-cols-[3rem_repeat(7,minmax(2.75rem,1fr))]">
                  <div className="sticky left-0 z-10 flex min-h-11 items-center justify-center border-b border-r border-input bg-card text-xs font-medium text-foreground/70">
                    {String(hour).padStart(2, "0")}
                  </div>
                  {calendarDays.map((day) => {
                    const cellSlots = slots
                      .filter((slot) => slot.weekday === day && slot.hour === hour)
                      .sort((a, b) => a.minute - b.minute);
                    const marked = cellSlots.length > 0;
                    const active = openCell?.weekday === day && openCell.hour === hour;
                    return (
                      <div key={`${day}-${hour}`} className="border-b border-r border-input/60">
                        {marked ? (
                          <button
                            type="button"
                            className={cn(
                              "min-h-11 w-full px-1 text-sm font-semibold",
                              active ? "bg-foreground text-background" : "bg-foreground/10 text-foreground",
                            )}
                            aria-pressed={active}
                            aria-label={`${t(`weekdays.${day}`)} ${String(hour).padStart(2, "0")}:00, ${t("automationBrandCount", { count: cellSlots.length })}`}
                            onClick={() => setOpenCell(active ? null : { weekday: day, hour })}
                          >
                            {cellSlots.length}
                          </button>
                        ) : (
                          <div className="min-h-11" />
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {brandId && openCell && openSlots.length > 0 ? (
        <Card ref={detailsRef} className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle>{t("automationDetails")}</CardTitle>
            <Button type="button" variant="outline" onClick={() => setOpenCell(null)}>
              {t("automationClose")}
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm font-medium">{t(`weekdays.${openCell.weekday}`)}</p>
            <ul className="space-y-2">
              {openSlots.map((slot) => (
                <li key={slot.id} className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{clock(slot.hour, slot.minute)}</p>
                    <p className="truncate text-xs text-ink/60">{recipeLabel(slot.model_name)}</p>
                    <NetworkMarks networks={slot.networks} />
                    <BriefMarks brief={slot.brief} />
                  </div>
                  <ConfirmAlertDialog
                    title={t("automationRemove")}
                    description={t("automationRemoveConfirm")}
                    cancelLabel={t("cancel")}
                    confirmLabel={t("automationRemove")}
                    onConfirm={() => remove.mutate(slot.id)}
                    trigger={
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label={t("automationRemove")}
                        disabled={remove.isPending}
                      >
                        <Trash />
                      </Button>
                    }
                  />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {brandId ? (
        <div className="grid gap-3">
          {weekdays.map((day) => {
            const daySlots = slots
              .filter((slot) => slot.weekday === day)
              .sort((a, b) => a.hour - b.hour || a.minute - b.minute);
            return (
              <section key={day} className="rounded-2xl border border-input bg-card p-3">
                <h2 className="text-sm font-medium">{t(`weekdays.${day}`)}</h2>
                {daySlots.length === 0 ? (
                  <p className="mt-2 text-sm text-ink/55">{t("automationEmptyDay")}</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {daySlots.map((slot) => (
                      <li key={slot.id} className="flex items-center gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{clock(slot.hour, slot.minute)}</p>
                          <p className="truncate text-xs text-ink/60">{recipeLabel(slot.model_name)}</p>
                          <NetworkMarks networks={slot.networks} />
                    <BriefMarks brief={slot.brief} />
                        </div>
                        <ConfirmAlertDialog
                          title={t("automationRemove")}
                          description={t("automationRemoveConfirm")}
                          cancelLabel={t("cancel")}
                          confirmLabel={t("automationRemove")}
                          onConfirm={() => remove.mutate(slot.id)}
                          trigger={
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              aria-label={t("automationRemove")}
                              disabled={remove.isPending}
                            >
                              <Trash />
                            </Button>
                          }
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      ) : null}

      {brandId ? (
        <section className="space-y-2">
          <h2 className="text-sm font-medium">{t("automationLogs")}</h2>
          {runs.length === 0 && !scheduleQuery.isLoading ? (
            <p className="text-sm text-ink/70">{t("automationLogsEmpty")}</p>
          ) : (
            <ul className="space-y-2">
              {runs.map((run) => (
                <li key={run.id} className="rounded-xl border border-input px-3 py-2 text-sm">
                  <p className="font-medium">
                    {t(`weekdays.${run.weekday}`)} {clock(run.hour, run.minute)} · {recipeLabel(run.model_name)}
                  </p>
                  <p className={run.status === "failed" ? "text-destructive" : "text-ink/70"}>
                    {run.occurrence_on} · {run.status === "failed" ? t("automationRunFailed") : t("automationRunCreated")}
                    {run.status === "failed" && run.error_code ? ` · ${errors(runError(run.error_code))}` : ""}
                  </p>
                  {run.post_id ? (
                    <Link className="mt-1 inline-flex min-h-11 items-center text-sm underline" href={`/posts/${run.post_id}?brand=${brandId}`}>
                      {t("automationOpenPost")}
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}


function NetworkMarks({ networks }: { networks?: string[] }) {
  const t = useTranslations("creation");
  const chosen = networkChoices.filter((id) => networks?.includes(id));
  if (chosen.length === 0) {
    return null;
  }
  return (
    <span className="mt-1 flex flex-wrap gap-1">
      {chosen.map((id) => {
        return (
          <span key={id} className="inline-flex items-center gap-1 rounded-md border border-input px-1.5 py-0.5 text-xs text-ink/80">
            <SocialNetworkIcon id={id} className="size-3.5" />
            {t(`manualPublishNetworks.${id}`)}
          </span>
        );
      })}
    </span>
  );
}

const moodKeys: Record<string, string> = {
  warm: "moodWarm",
  bold: "moodBold",
  calm: "moodCalm",
  casual: "moodCasual",
};
const aspectKeys: Record<string, string> = {
  "1:1": "aspectSquare",
  "4:5": "aspectPortrait",
  "9:16": "aspectStory",
};
const themeKeys: Record<string, string> = {
  dark: "carouselThemeDark",
  light: "carouselThemeLight",
  random: "carouselThemeRandom",
};
const layoutKeys: Record<string, string> = {
  editorial: "carouselLayoutEditorial",
  statement: "carouselLayoutStatement",
  steps: "carouselLayoutSteps",
};

function BriefMarks({ brief }: { brief?: SlotBrief }) {
  const wizard = useTranslations("wizard");
  if (!brief) {
    return null;
  }
  const labels = [
    brief.product?.name,
    brief.mood && moodKeys[brief.mood] ? wizard(moodKeys[brief.mood]) : "",
    brief.aspect && aspectKeys[brief.aspect] ? wizard(aspectKeys[brief.aspect]) : "",
    brief.theme && themeKeys[brief.theme] ? wizard(themeKeys[brief.theme]) : "",
    brief.layout && layoutKeys[brief.layout] ? wizard(layoutKeys[brief.layout]) : "",
  ].filter((label): label is string => Boolean(label));
  if (labels.length === 0) {
    return null;
  }
  return <span className="mt-1 block truncate text-xs text-ink/60">{labels.join(" · ")}</span>;
}

function clock(hour: number, minute: number) {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function runError(error: unknown): RunErrorCode | "internal_error" {
  const code = typeof error === "string" ? error : error instanceof ApiError ? error.code : "";
  if (runErrorCodes.includes(code as RunErrorCode)) {
    return code as RunErrorCode;
  }
  return "internal_error";
}
