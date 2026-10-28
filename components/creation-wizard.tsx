"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { WizardBrandPick } from "@/components/wizard-brand-pick";
import { WizardKindPick } from "@/components/wizard-kind-pick";
import { WizardNewBrand, WizardModeSwitch } from "@/components/wizard-new-brand";
import { WizardScanStatus } from "@/components/wizard-scan-status";
import { WIZARD_STEPS, WizardStepper } from "@/components/wizard-stepper";
import { WizardFrame, WizardStepHeader } from "@/components/wizard-ui";
import { useAccount } from "@/components/use-account";
import {
  ApiError,
  api,
  type Brand,
  type BrandProfileResponse,
  type OutputKind,
  type Segment,
} from "@/lib/api";
import { appToast } from "@/lib/app-toast";

const DEFAULT_SEGMENT_CODE = "professional_services";
type Step = "site" | "kind";

function scheduleSearch(params: { get: (key: string) => string | null }, brandId: string) {
  const search = new URLSearchParams();
  search.set("brand", brandId);
  const on = params.get("on") ?? "";
  const at = params.get("at") ?? "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(on)) {
    search.set("on", on);
  }
  if (/^\d{2}:\d{2}$/.test(at)) {
    search.set("at", at);
  }
  return search.toString();
}

function brandNameFromUrl(raw: string): string {
  try {
    const value = raw.includes("://") ? raw : `https://${raw}`;
    const host = new URL(value).hostname.replace(/^www\./, "");
    return host || "Brand";
  } catch {
    return "Brand";
  }
}

function normalizeWebsite(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return "";
  }
  return trimmed.includes("://") ? trimmed : `https://${trimmed}`;
}

function displayHost(raw: string): string {
  try {
    const value = raw.includes("://") ? raw : `https://${raw}`;
    return new URL(value).hostname.replace(/^www\./, "") || raw.trim();
  } catch {
    return raw.trim();
  }
}

export function CreationWizard() {
  const t = useTranslations("wizard");
  const errors = useTranslations("errors");
  const messages = useTranslations();
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { organization, brands, loading } = useAccount();

  const [step, setStep] = useState<Step>(
    searchParams.get("brand") && searchParams.get("step") !== "brand" ? "kind" : "site",
  );
  const [brandId, setBrandId] = useState(searchParams.get("brand") ?? "");
  const [brandName, setBrandName] = useState("");
  const [website, setWebsite] = useState("");
  const [locale, setLocale] = useState("");
  const [timezone, setTimezone] = useState("");
  const [segmentId, setSegmentId] = useState("");
  const [mode, setMode] = useState<"existing" | "new">("new");
  const [modeReady, setModeReady] = useState(false);
  const [manualSetup, setManualSetup] = useState(false);
  const [newBrandPath, setNewBrandPath] = useState<"scan" | "manual">("scan");

  const brandList = brands.data?.brands ?? [];
  const brandQuery = useQuery({
    queryKey: ["brand", brandId],
    queryFn: () => api<{ brand: Brand }>(`/v1/brands/${brandId}`),
    enabled: Boolean(brandId),
  });
  const selectedBrand = brandQuery.data?.brand ?? brandList.find((item) => item.id === brandId) ?? null;
  const isNewBrandFlow = mode === "new" || brandList.length === 0;

  useEffect(() => {
    if (!organization) {
      return;
    }
    if (!locale) {
      setLocale(organization.default_locale);
    }
    if (!timezone) {
      setTimezone(organization.timezone);
    }
  }, [organization, locale, timezone]);

  useEffect(() => {
    if (loading || brands.isLoading || modeReady) {
      return;
    }
    if (brandList.length > 0) {
      setMode("existing");
    } else {
      setMode("new");
    }
    setModeReady(true);
  }, [loading, brands.isLoading, brandList.length, modeReady]);

  useEffect(() => {
    if (loading || brandList.length === 0 || mode !== "existing") {
      return;
    }
    if (!brandId) {
      setBrandId(brandList[0].id);
      setWebsite(brandList[0].website_url || "");
    }
  }, [loading, brandList, brandId, mode]);

  const segmentsQuery = useQuery({
    queryKey: ["segments"],
    queryFn: () => api<{ segments: Segment[] }>("/v1/segments"),
  });

  const kindsQuery = useQuery({
    queryKey: ["output-kinds", "published"],
    queryFn: () => api<{ output_kinds: OutputKind[] }>("/v1/output-kinds"),
    enabled: Boolean(organization),
  });

  const defaultSegmentId = useMemo(() => {
    const segments = segmentsQuery.data?.segments ?? [];
    return segments.find((item) => item.code === DEFAULT_SEGMENT_CODE)?.id ?? segments[0]?.id ?? "";
  }, [segmentsQuery.data?.segments]);

  useEffect(() => {
    if (!segmentId && defaultSegmentId) {
      setSegmentId(defaultSegmentId);
    }
  }, [segmentId, defaultSegmentId]);

  useEffect(() => {
    if (!selectedBrand) {
      return;
    }
    if (mode === "existing") {
      setWebsite(selectedBrand.website_url || "");
    } else if (!website.trim() && selectedBrand.website_url) {
      setWebsite(selectedBrand.website_url);
    }
    setLocale(selectedBrand.default_locale || organization?.default_locale || "");
    setTimezone(selectedBrand.timezone || organization?.timezone || "");
    if (selectedBrand.segment_id) {
      setSegmentId(selectedBrand.segment_id);
    }
  }, [selectedBrand?.id, mode, organization?.default_locale, organization?.timezone]);

  const profileQuery = useQuery({
    queryKey: ["profile", brandId],
    queryFn: () => api<BrandProfileResponse>(`/v1/brands/${brandId}/profile`),
    enabled: Boolean(brandId),
    refetchInterval: (query) => {
      const status = query.state.data?.analysis?.status;
      return status === "queued" || status === "running" ? 2000 : false;
    },
  });

  const analysis = profileQuery.data?.analysis;
  const profile = profileQuery.data?.profile;
  const scanBusy = analysis?.status === "queued" || analysis?.status === "running";
  const scanReady = analysis?.status === "completed" && Boolean(profile);

  useEffect(() => {
    if (!brandId || !scanReady) {
      return;
    }
    void queryClient.invalidateQueries({ queryKey: ["brand", brandId] });
    void queryClient.invalidateQueries({ queryKey: ["brands"] });
  }, [brandId, scanReady, queryClient]);

  const createBrand = useMutation({
    mutationFn: async (input: { scan: boolean }) => {
      if (!organization) {
        throw new ApiError("invalid_input");
      }
      const site = normalizeWebsite(website);
      const segment = segmentId || defaultSegmentId;
      const name = input.scan
        ? brandNameFromUrl(site)
        : brandName.trim() || brandNameFromUrl(site) || "Brand";
      if (!segment || !name.trim()) {
        throw new ApiError("invalid_input");
      }
      if (input.scan && !site) {
        throw new ApiError("invalid_input");
      }
      return {
        scan: input.scan,
        result: await api<{ brand: Brand }>("/v1/brands", {
          method: "POST",
          body: JSON.stringify({
            organization_id: organization.id,
            name: name.trim(),
            website_url: site || undefined,
            default_locale: locale || organization.default_locale,
            timezone: timezone || organization.timezone,
            segment_id: segment,
          }),
        }),
      };
    },
    onSuccess: async ({ scan, result }) => {
      setMode("new");
      setBrandId(result.brand.id);
      queryClient.setQueryData(["brand", result.brand.id], { brand: result.brand });
      await queryClient.invalidateQueries({ queryKey: ["brands"] });
      if (scan && (result.brand.website_url || website.trim())) {
        setManualSetup(false);
        await api(`/v1/brands/${result.brand.id}/analyze-website`, {
          method: "POST",
          body: JSON.stringify({ website_url: result.brand.website_url || normalizeWebsite(website) }),
        });
        await queryClient.invalidateQueries({ queryKey: ["profile", result.brand.id] });
      } else {
        setManualSetup(true);
      }
    },
    onError: (error) => {
      const code = error instanceof ApiError ? error.code : "internal_error";
      appToast.error(errors(code === "ai_unconfigured" ? "ai_unconfigured" : code === "invalid_input" ? "invalid_input" : "internal_error"), "wizard");
    },
  });

  const analyze = useMutation({
    mutationFn: () =>
      api(`/v1/brands/${brandId}/analyze-website`, {
        method: "POST",
        body: JSON.stringify({ website_url: normalizeWebsite(website) }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["profile", brandId] });
      await queryClient.invalidateQueries({ queryKey: ["brands"] });
    },
    onError: (error) => {
      const code = error instanceof ApiError ? error.code : "internal_error";
      appToast.error(errors(code === "ai_unconfigured" ? "ai_unconfigured" : code === "invalid_input" ? "invalid_input" : "internal_error"), "wizard");
    },
  });

  const segmentLabel = (id: string) => {
    const segment = (segmentsQuery.data?.segments ?? []).find((item) => item.id === id);
    return segment ? messages(segment.name_key) : "—";
  };

  const startExistingMode = () => {
    setMode("existing");
    const first = brandList[0];
    if (first) {
      setBrandId(first.id);
      setWebsite(first.website_url || "");
    }
  };

  const startNewBrandMode = () => {
    setMode("new");
    setBrandId("");
    setBrandName("");
    setWebsite("");
    setManualSetup(false);
    setNewBrandPath("scan");
    if (defaultSegmentId) {
      setSegmentId(defaultSegmentId);
    }
  };

  const canContinue = isNewBrandFlow
    ? Boolean(brandId && selectedBrand?.segment_id && (scanReady || manualSetup))
    : Boolean(brandId && selectedBrand?.segment_id);

  const goKind = () => {
    if (!brandId) {
      return;
    }
    setStep("kind");
    router.replace(`/create?${scheduleSearch(searchParams, brandId)}`, { scroll: false });
  };

  const openKind = (kind: OutputKind) => {
    if (!brandId) {
      return;
    }
    router.push(`/create/${kind.code}?${scheduleSearch(searchParams, brandId)}`);
  };

  if (loading) {
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

  const busy = scanBusy || createBrand.isPending || analyze.isPending;
  const scanState: "busy" | "ready" | "failed" =
    analysis?.status === "failed"
      ? "failed"
      : scanReady || manualSetup
        ? "ready"
        : "busy";

  return (
    <AppShell title={t("title")} fluid>
      <div className="flex w-full min-h-0 flex-1 flex-col">
        {step === "site" ? (
          <WizardFrame>
            <WizardStepper step={0} steps={WIZARD_STEPS} />
            {!isNewBrandFlow ? <WizardStepHeader title={t("siteTitle")} lead={t("siteLead")} /> : null}

            <WizardModeSwitch
              hasExisting={brandList.length > 0}
              mode={isNewBrandFlow ? "new" : "existing"}
              disabled={busy}
              onExisting={startExistingMode}
              onNew={startNewBrandMode}
              existingLabel={t("useExistingBrand")}
              newLabel={t("newBrand")}
            />

            {!isNewBrandFlow && brandList.length > 0 ? (
              <WizardBrandPick
                brands={brandList}
                selectedId={brandId}
                onSelect={(brand) => {
                  setBrandId(brand.id);
                  setWebsite(brand.website_url || "");
                }}
                segmentLabel={segmentLabel}
                editLabel={t("editBrand")}
                continueLabel={t("next")}
                onContinue={goKind}
                canContinue={canContinue}
              />
            ) : null}

            {isNewBrandFlow && !brandId ? (
              <WizardNewBrand
                path={newBrandPath}
                onPathChange={setNewBrandPath}
                website={website}
                onWebsiteChange={setWebsite}
                brandName={brandName}
                onBrandNameChange={setBrandName}
                pending={createBrand.isPending}
                canScan={Boolean(website.trim() && segmentId)}
                canCreateManual={Boolean(brandName.trim() && segmentId)}
                onScan={() => createBrand.mutate({ scan: true })}
                onCreateManual={() => createBrand.mutate({ scan: false })}
              />
            ) : null}

            {isNewBrandFlow && brandId ? (
              <WizardScanStatus
                state={createBrand.isPending ? "busy" : scanState}
                host={displayHost(website) || selectedBrand?.name || t("newBrand")}
                brandName={selectedBrand?.name ?? ""}
                segment={selectedBrand?.segment_id ? segmentLabel(selectedBrand.segment_id) : undefined}
                brandHref={`/brands/${brandId}`}
                website={website}
                onWebsiteChange={setWebsite}
                canContinue={canContinue}
                onContinue={goKind}
                onRetry={() => analyze.mutate()}
              />
            ) : null}
          </WizardFrame>
        ) : null}

        {step === "kind" ? (
          <WizardFrame>
            <WizardStepper
              step={1}
              steps={WIZARD_STEPS}
              onGoTo={(next) => {
                if (next === 0) {
                  setStep("site");
                }
              }}
            />
            <WizardStepHeader title={t("kindTitle")} lead={t("kindLead")} />
            <WizardKindPick
              kinds={kindsQuery.data?.output_kinds ?? []}
              loading={kindsQuery.isLoading}
              empty={t("kindEmpty")}
              onPick={openKind}
            />
          </WizardFrame>
        ) : null}
      </div>
    </AppShell>
  );
}
