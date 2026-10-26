"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { BrandInterviewForm } from "@/components/brand-interview";
import { DataTable, formatListDate, useListQuery, type ListColumn } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAutoSave } from "@/hooks/use-auto-save";
import {
  ApiError,
  api,
  type Brand,
  type BrandProfile,
  type BrandProfileResponse,
  type ListMeta,
  type ListedPage,
} from "@/lib/api";
import { appToast } from "@/lib/app-toast";

const errorKeys = [
  "invalid_credentials",
  "email_taken",
  "invalid_input",
  "unauthenticated",
  "not_found",
  "internal_error",
  "crawl_failed",
  "blocked_url",
  "openai_failed",
  "openai_quota",
  "openai_rejected",
  "analysis_failed",
  "stale",
  "ai_unconfigured",
  "provider_unavailable",
] as const;

type ErrorKey = (typeof errorKeys)[number];

function emptyProfile(brand: Brand): BrandProfile {
  return {
    id: "",
    brand_id: brand.id,
    status: "draft",
    company_name: brand.name || "",
    description: "",
    audience: [],
    services: [],
    products: [],
    tone: [],
    topics: [],
    terminology: [],
    people_guidance: "",
    attire: "",
    environment: "",
    source: "manual",
    prompt_version: "",
    confirmed_at: "",
  };
}

export function BrandBrain({ brand }: { brand: Brand }) {
  const t = useTranslations("brandBrain");
  const workspace = useTranslations("brandWorkspace");
  const errors = useTranslations("errors");
  const queryClient = useQueryClient();
  const [website, setWebsite] = useState(brand.website_url || "");
  const [form, setForm] = useState<BrandProfile | null>(null);
  const [formStamp, setFormStamp] = useState("");
  const [dirty, setDirty] = useState(false);
  const lastStatus = useRef<string>("");
  const toastId = `brand-profile-${brand.id}`;

  const profileQuery = useQuery({
    queryKey: ["profile", brand.id],
    queryFn: () => api<BrandProfileResponse>(`/v1/brands/${brand.id}/profile`),
    refetchInterval: (query) => {
      const status = query.state.data?.analysis?.status;
      return status === "queued" || status === "running" ? 2000 : false;
    },
  });

  const loaded = profileQuery.data?.profile ?? null;
  const stamp = loaded ? JSON.stringify(loaded) : "";

  // Hydrate from server only when we have a profile, or once when initializing.
  // Never replace local edits with an empty profile after a successful save (query still null).
  if (profileQuery.isFetched) {
    if (form === null) {
      setForm(loaded ?? emptyProfile(brand));
      setFormStamp(loaded ? stamp : "local");
      setDirty(false);
    } else if (loaded && stamp !== formStamp && !dirty) {
      setFormStamp(stamp);
      setForm(loaded);
      setDirty(false);
    }
  }

  const analysis = profileQuery.data?.analysis;
  const busy = analysis?.status === "queued" || analysis?.status === "running";
  const done = analysis?.status === "completed" || Boolean(loaded);
  const failed = analysis?.status === "failed";

  useEffect(() => {
    const status = analysis?.status ?? "";
    if (lastStatus.current === status) {
      return;
    }
    const previous = lastStatus.current;
    lastStatus.current = status;
    if ((previous === "queued" || previous === "running") && (status === "completed" || status === "failed")) {
      void queryClient.invalidateQueries({ queryKey: ["visual", brand.id] });
      void queryClient.invalidateQueries({ queryKey: ["brand", brand.id] });
      void queryClient.invalidateQueries({ queryKey: ["brands"] });
      if (status === "completed") {
        setDirty(false);
        void queryClient.invalidateQueries({ queryKey: ["profile", brand.id] });
      }
    }
  }, [analysis?.status, brand.id, queryClient]);

  const analyze = useMutation({
    mutationFn: () =>
      api(`/v1/brands/${brand.id}/analyze-website`, {
        method: "POST",
        body: JSON.stringify({ website_url: website }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["profile", brand.id] });
      await queryClient.invalidateQueries({ queryKey: ["brands"] });
      await queryClient.invalidateQueries({ queryKey: ["brand", brand.id] });
    },
    onError: (error) => appToast.error(errorText(errors, error), toastId),
  });

  const { touch } = useAutoSave({
    payload: form,
    dirty,
    pause: busy,
    toastId,
    successMessage: workspace("saved"),
    errorMessage: (error) => errorText(errors, error),
    save: (profile) =>
      api<{ profile: BrandProfile }>(`/v1/brands/${brand.id}/profile`, {
        method: "PATCH",
        body: JSON.stringify({
          company_name: profile.company_name,
          description: profile.description,
          audience: cleanList(profile.audience),
          services: cleanList(profile.services),
          products: cleanList(profile.products),
          tone: cleanList(profile.tone),
          topics: cleanList(profile.topics),
          terminology: cleanList(profile.terminology),
          people_guidance: profile.people_guidance ?? "",
          attire: profile.attire ?? "",
          environment: profile.environment ?? "",
          confirm: true,
        }),
      }),
    onSuccess: (result, meta) => {
      const savedProfile = result.profile;
      queryClient.setQueryData<BrandProfileResponse>(["profile", brand.id], (current) => ({
        profile: savedProfile,
        analysis: current?.analysis ?? null,
        pages: current?.pages ?? [],
      }));
      if (meta.isCurrent) {
        setFormStamp(JSON.stringify(savedProfile));
        setForm(savedProfile);
        setDirty(false);
      }
      void queryClient.invalidateQueries({ queryKey: ["content-plan", brand.id] });
    },
  });

  function updateForm(next: BrandProfile) {
    touch();
    setDirty(true);
    setForm(next);
  }

  const buttonLabel = () => {
    if (analyze.isPending || busy) {
      return t("analyzing");
    }
    if (done || failed) {
      return t("analyzeAgain");
    }
    return t("analyze");
  };

  return (
    <div className="space-y-4">
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!website.trim()) {
            return;
          }
          analyze.mutate();
        }}
      >
        <div className="space-y-2">
          <Label htmlFor={`site-${brand.id}`}>{t("website")}</Label>
          <Input
            id={`site-${brand.id}`}
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
            inputMode="url"
            autoCapitalize="none"
            placeholder="https://"
            disabled={busy || analyze.isPending}
          />
        </div>
        <Button type="submit" className="w-full" disabled={!website.trim() || analyze.isPending || busy}>
          {busy || analyze.isPending ? <Loader2 className="animate-spin" aria-hidden /> : null}
          {buttonLabel()}
        </Button>
      </form>
      {busy || analyze.isPending ? <ScanMotion label={statusLabel(t, analysis?.status || "running")} /> : null}
      {analysis && !busy ? (
        <p className="text-sm text-ink/70">
          {statusLabel(t, analysis.status)}
          {analysis.status === "failed" && analysis.error_code
            ? ` — ${errorText(errors, new ApiError(analysis.error_code))}`
            : ""}
        </p>
      ) : null}
      {!analysis && !busy ? <p className="text-sm text-ink/70">{t("empty")}</p> : null}
      {form ? (
        <div className="space-y-3">
          <TextField
            id={`company-${brand.id}`}
            label={t("company")}
            value={form.company_name}
            onChange={(value) => updateForm({ ...form, company_name: value })}
          />
          <AreaField
            id={`description-${brand.id}`}
            label={t("description")}
            value={form.description}
            onChange={(value) => updateForm({ ...form, description: value })}
          />
          <ListField id={`services-${brand.id}`} label={t("services")} hint={t("listHint")} values={form.services} onChange={(values) => updateForm({ ...form, services: values })} />
          <ListField id={`products-${brand.id}`} label={t("products")} hint={t("listHint")} values={form.products} onChange={(values) => updateForm({ ...form, products: values })} />
          <ListField id={`audience-${brand.id}`} label={t("audience")} hint={t("listHint")} values={form.audience} onChange={(values) => updateForm({ ...form, audience: values })} />
          <ListField id={`tone-${brand.id}`} label={t("tone")} hint={t("listHint")} values={form.tone} onChange={(values) => updateForm({ ...form, tone: values })} />
          <ListField id={`topics-${brand.id}`} label={t("topics")} hint={t("listHint")} values={form.topics} onChange={(values) => updateForm({ ...form, topics: values })} />
          <ListField id={`terms-${brand.id}`} label={t("terminology")} hint={t("listHint")} values={form.terminology} onChange={(values) => updateForm({ ...form, terminology: values })} />
          <AreaField
            id={`people-${brand.id}`}
            label={t("peopleGuidance")}
            value={form.people_guidance ?? ""}
            onChange={(value) => updateForm({ ...form, people_guidance: value })}
            hint={t("peopleGuidanceHint")}
          />
          <AreaField
            id={`attire-${brand.id}`}
            label={t("attire")}
            value={form.attire ?? ""}
            onChange={(value) => updateForm({ ...form, attire: value })}
            hint={t("attireHint")}
          />
          <AreaField
            id={`environment-${brand.id}`}
            label={t("environment")}
            value={form.environment ?? ""}
            onChange={(value) => updateForm({ ...form, environment: value })}
            hint={t("environmentHint")}
          />
        </div>
      ) : null}
      <BrandInterviewForm brandId={brand.id} />
      <PagesTable brandId={brand.id} />
    </div>
  );
}

const pageTypes = ["home", "about", "services", "product", "blog", "contact", "other"] as const;

function PagesTable({ brandId }: { brandId: string }) {
  const t = useTranslations("brandBrain");
  const lists = useTranslations("lists");
  const locale = useLocale();
  const list = useListQuery({ prefix: "pages", defaultSort: "created_at", filterKeys: ["page_type"] });
  const query = useQuery({
    queryKey: ["pages", brandId, list.queryString],
    queryFn: () => api<{ pages: ListedPage[] } & ListMeta>(`/v1/brands/${brandId}/pages?${list.queryString}`),
  });
  const columns: ListColumn<ListedPage>[] = [
    {
      key: "title",
      header: t("titleColumn"),
      sortable: true,
      cell: (page) => page.title || page.url,
    },
    {
      key: "page_type",
      header: t("pageType"),
      sortable: true,
      cell: (page) => (pageTypes.includes(page.page_type as (typeof pageTypes)[number]) ? t(`pageTypes.${page.page_type as (typeof pageTypes)[number]}`) : page.page_type),
    },
    { key: "url", header: t("url"), sortable: true, cell: (page) => page.url },
    {
      key: "created_at",
      header: t("createdAt"),
      sortable: true,
      cell: (page) => formatListDate(locale, page.created_at),
    },
  ];

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{t("pages")}</p>
      <DataTable
        controlsId="pages"
        rows={query.data?.pages ?? []}
        columns={columns}
        total={query.data?.total ?? 0}
        loading={query.isLoading}
        list={list}
        searchLabel={lists("searchTitle")}
        emptyLabel={t("noPages")}
        noResultsLabel={t("noResults")}
        filters={[
          {
            key: "page_type",
            label: t("pageType"),
            allLabel: lists("all"),
            options: pageTypes.map((type) => ({ value: type, label: t(`pageTypes.${type}`) })),
          },
        ]}
      />
    </div>
  );
}

function ScanMotion({ label }: { label: string }) {
  return (
    <div
      className="flex items-center gap-3 rounded-md border border-input bg-muted/40 px-3 py-3"
      role="status"
      aria-live="polite"
    >
      <span className="relative flex size-10 shrink-0 items-center justify-center">
        <span className="absolute inset-0 rounded-full border border-pine/30" />
        <span className="absolute inset-1 animate-ping rounded-full bg-pine/20" />
        <Loader2 className="relative size-5 animate-spin text-pine" aria-hidden />
      </span>
      <div className="min-w-0 space-y-2">
        <p className="text-sm text-ink/80">{label}</p>
        <div className="flex gap-1.5" aria-hidden>
          <span className="h-1.5 w-8 animate-pulse rounded-full bg-pine" />
          <span className="h-1.5 w-5 animate-pulse rounded-full bg-pine/60 [animation-delay:150ms]" />
          <span className="h-1.5 w-3 animate-pulse rounded-full bg-pine/35 [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}

function statusLabel(t: (key: "queued" | "running" | "completed" | "failed") => string, status: string) {
  if (status === "queued" || status === "running" || status === "completed" || status === "failed") {
    return t(status);
  }
  return status;
}

function errorText(errors: (key: ErrorKey) => string, error: unknown) {
  const code = error instanceof ApiError ? error.code : "internal_error";
  if ((errorKeys as readonly string[]).includes(code)) {
    return errors(code as ErrorKey);
  }
  return errors("internal_error");
}

function cleanList(values: string[]) {
  return values.map((item) => item.trim()).filter(Boolean);
}

function TextField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function AreaField({
  id,
  label,
  value,
  onChange,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Textarea
        id={id}
        value={value}
        rows={4}
        placeholder={hint}
        onChange={(event) => onChange(event.target.value)}
      />
      {hint ? <p className="text-xs text-ink/55">{hint}</p> : null}
    </div>
  );
}

function ListField({
  id,
  label,
  hint,
  values,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  values: string[];
  onChange: (values: string[]) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Textarea
        id={id}
        value={values.join("\n")}
        rows={3}
        placeholder={hint}
        onChange={(event) => onChange(event.target.value.split("\n"))}
      />
    </div>
  );
}
