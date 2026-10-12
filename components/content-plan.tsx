"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { DataTable, useListQuery, type ListColumn } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAutoSave } from "@/hooks/use-auto-save";
import {
  ApiError,
  api,
  type Brand,
  type ContentIdea,
  type ContentPlanResponse,
  type ContentStrategy,
  type ListMeta,
} from "@/lib/api";
import { appToast } from "@/lib/app-toast";

const errorKeys = [
  "invalid_input",
  "not_found",
  "internal_error",
  "profile_unconfirmed",
  "unsupported_locale",
  "not_enough_material",
  "plan_failed",
  "queue_failed",
  "stale",
  "provider_unavailable",
  "openai_failed",
  "openai_quota",
  "openai_rejected",
] as const;

type ErrorKey = (typeof errorKeys)[number];
type Objective = "educational" | "authority" | "industry" | "commercial" | "opinion";

const frequencies = [2, 4, 7] as const;

export function ContentPlan({ brand }: { brand: Brand }) {
  const t = useTranslations("contentPlan");
  const errors = useTranslations("errors");
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ContentStrategy | null>(null);
  const [formStamp, setFormStamp] = useState("");

  const planQuery = useQuery({
    queryKey: ["content-plan", brand.id],
    queryFn: () => api<ContentPlanResponse>(`/v1/brands/${brand.id}/content-plan`),
    refetchInterval: (query) => {
      const status = query.state.data?.plan?.status;
      return status === "queued" || status === "running" ? 2000 : false;
    },
  });

  const loaded = planQuery.data?.strategy ?? null;
  const stamp = loaded ? JSON.stringify(loaded) + (planQuery.data?.plan?.status ?? "") : "";
  if (loaded && stamp !== formStamp) {
    setFormStamp(stamp);
    setForm(loaded);
  }

  const busy = planQuery.data?.plan?.status === "queued" || planQuery.data?.plan?.status === "running";
  const mixTotal = form
    ? form.educational_pct + form.authority_pct + form.industry_pct + form.commercial_pct + form.opinion_pct
    : 0;

  const generate = useMutation({
    mutationFn: () => {
      if (!form || mixTotal !== 100) {
        throw new ApiError("invalid_input");
      }
      return api(`/v1/brands/${brand.id}/content-plan`, {
        method: "POST",
        body: JSON.stringify(strategyBody(form)),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["content-plan", brand.id] });
    },
    onError: (error) => appToast.error(errorText(errors, error)),
  });

  if (!planQuery.data || !form) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold">{t("title")}</h3>
      {!planQuery.data.profile_confirmed ? <p className="text-sm text-ink/70">{t("needProfile")}</p> : null}
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          generate.mutate();
        }}
      >
        <div className="space-y-2">
          <Label>{t("frequency")}</Label>
          <div className="grid grid-cols-3 gap-2">
            {frequencies.map((value) => (
              <Button
                key={value}
                type="button"
                variant={form.posts_per_week === value ? "default" : "outline"}
                onClick={() => setForm({ ...form, posts_per_week: value })}
              >
                {value}
              </Button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label>{t("mix")}</Label>
          <p className="text-sm text-ink/70">
            {t("mixHint")} {mixTotal}
          </p>
          {(["educational", "authority", "industry", "commercial", "opinion"] as Objective[]).map((key) => (
            <div key={key} className="flex items-center gap-2">
              <Label className="w-28 shrink-0" htmlFor={`${key}-${brand.id}`}>
                {t(key)}
              </Label>
              <Input
                id={`${key}-${brand.id}`}
                inputMode="numeric"
                value={String(form[`${key}_pct`])}
                onChange={(event) =>
                  setForm({
                    ...form,
                    [`${key}_pct`]: Number(event.target.value.replace(/[^\d]/g, "") || "0"),
                  })
                }
              />
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <Label htmlFor={`pillars-${brand.id}`}>{t("pillars")}</Label>
          <Textarea
            id={`pillars-${brand.id}`}
            rows={3}
            value={form.pillars.join("\n")}
            placeholder={t("pillarsHint")}
            onChange={(event) => setForm({ ...form, pillars: event.target.value.split("\n") })}
          />
        </div>
        <Button type="submit" className="w-full" disabled={!planQuery.data.profile_confirmed || generate.isPending || mixTotal !== 100}>
          {generate.isPending || busy ? t("generating") : t("generate")}
        </Button>
      </form>
      {planQuery.data.plan ? (
        <p className="text-sm text-ink/70">
          {statusLabel(t, planQuery.data.plan.status)}
          {planQuery.data.plan.period_start ? ` · ${planQuery.data.plan.period_start}` : ""}
          {planQuery.data.plan.status === "failed" && planQuery.data.plan.error_code
            ? ` — ${errorText(errors, new ApiError(planQuery.data.plan.error_code))}`
            : ""}
        </p>
      ) : (
        <p className="text-sm text-ink/70">{t("empty")}</p>
      )}
      {planQuery.data.plan?.timezone ? <p className="text-sm text-ink/70">{t("dates")}: {planQuery.data.plan.timezone}</p> : null}
      <IdeasTable
        brandId={brand.id}
        pillars={form?.pillars ?? planQuery.data.strategy.pillars}
        onChanged={async () => {
          await queryClient.invalidateQueries({ queryKey: ["content-plan", brand.id] });
        }}
        onError={(error) => appToast.error(errorText(errors, error))}
      />
    </div>);
}

const ideaObjectives = ["educational", "authority", "industry", "commercial", "opinion"] as const;

function IdeasTable({
  brandId,
  pillars,
  onChanged,
  onError,
}: {
  brandId: string;
  pillars: string[];
  onChanged: () => Promise<void>;
  onError: (error: unknown) => void;
}) {
  const t = useTranslations("contentPlan");
  const lists = useTranslations("lists");
  const queryClient = useQueryClient();
  const list = useListQuery({ prefix: "ideas", defaultSort: "planned_on", filterKeys: ["objective", "pillar"] });
  const query = useQuery({
    queryKey: ["content-ideas", brandId, list.queryString],
    queryFn: () => api<{ ideas: ContentIdea[] } & ListMeta>(`/v1/brands/${brandId}/content-ideas?${list.queryString}`),
  });
  const pillarOptions = [...new Set(pillars.map((item) => item.trim()).filter(Boolean))];
  const columns: ListColumn<ContentIdea>[] = [
    {
      key: "title",
      header: t("titleColumn"),
      sortable: true,
      cell: (idea) => (
        <IdeaEditor
          brandId={brandId}
          idea={idea}
          onChanged={async () => {
            await queryClient.invalidateQueries({ queryKey: ["content-ideas", brandId] });
            await onChanged();
          }}
          onError={onError}
        />
      ),
    },
    { key: "planned_on", header: t("plannedOn"), sortable: true, cell: (idea) => idea.planned_on },
    {
      key: "objective",
      header: t("objectiveFilter"),
      sortable: true,
      cell: (idea) => (isObjective(idea.objective) ? t(idea.objective) : idea.objective),
    },
    { key: "pillar", header: t("pillarFilter"), sortable: true, cell: (idea) => idea.pillar },
  ];

  return (
    <DataTable
      controlsId="ideas"
      rows={query.data?.ideas ?? []}
      columns={columns}
      total={query.data?.total ?? 0}
      loading={query.isLoading}
      list={list}
      searchLabel={lists("searchTitle")}
      emptyLabel={t("empty")}
      noResultsLabel={t("noResults")}
      filters={[
        {
          key: "objective",
          label: t("objectiveFilter"),
          allLabel: lists("all"),
          options: ideaObjectives.map((objective) => ({ value: objective, label: t(objective) })),
        },
        {
          key: "pillar",
          label: t("pillarFilter"),
          allLabel: lists("all"),
          options: pillarOptions.map((pillar) => ({ value: pillar, label: pillar })),
        },
      ]}
    />
  );
}

function IdeaEditor({
  brandId,
  idea,
  onChanged,
  onError,
}: {
  brandId: string;
  idea: ContentIdea;
  onChanged: () => Promise<void>;
  onError: (error: unknown) => void;
}) {
  const t = useTranslations("contentPlan");
  const errors = useTranslations("errors");
  const [title, setTitle] = useState(idea.title);
  const [dirty, setDirty] = useState(false);
  const [seen, setSeen] = useState(idea.title);
  if (idea.title !== seen) {
    setSeen(idea.title);
    setTitle(idea.title);
    setDirty(false);
  }
  const { touch } = useAutoSave({
    payload: title,
    dirty: dirty && title.trim() !== "" && title.trim() !== idea.title,
    toastId: `content-idea-${idea.id}`,
    successMessage: t("saved"),
    errorMessage: (error) => errorText(errors, error),
    save: (value) =>
      api(`/v1/brands/${brandId}/content-ideas/${idea.id}`, {
        method: "PATCH",
        body: JSON.stringify({ title: value, angle: idea.angle, status: "idea" }),
      }),
    onSuccess: async (_result, meta) => {
      if (meta.isCurrent) {
        setDirty(false);
      }
      await onChanged();
    },
  });
  const dismiss = useMutation({
    mutationFn: () =>
      api(`/v1/brands/${brandId}/content-ideas/${idea.id}`, {
        method: "PATCH",
        body: JSON.stringify({ title, angle: idea.angle, status: "dismissed" }),
      }),
    onSuccess: onChanged,
    onError,
  });
  return (
    <div className="space-y-2" onClick={(event) => event.stopPropagation()}>
      <Input
        value={title}
        aria-label={t("titleColumn")}
        onChange={(event) => {
          touch();
          setDirty(true);
          setTitle(event.target.value);
        }}
      />
      <Button type="button" variant="outline" className="w-full" disabled={dismiss.isPending} onClick={() => dismiss.mutate()}>
        {t("dismiss")}
      </Button>
    </div>
  );
}

function strategyBody(form: ContentStrategy) {
  return {
    posts_per_week: form.posts_per_week,
    educational_pct: form.educational_pct,
    authority_pct: form.authority_pct,
    industry_pct: form.industry_pct,
    commercial_pct: form.commercial_pct,
    opinion_pct: form.opinion_pct,
    pillars: form.pillars.map((item) => item.trim()).filter(Boolean),
  };
}

function statusLabel(t: (key: "queued" | "running" | "completed" | "failed") => string, status: string) {
  if (status === "queued" || status === "running" || status === "completed" || status === "failed") {
    return t(status);
  }
  return status;
}

function isObjective(value: string): value is Objective {
  return value === "educational" || value === "authority" || value === "industry" || value === "commercial" || value === "opinion";
}

function errorText(errors: (key: ErrorKey) => string, error: unknown) {
  const code = error instanceof ApiError ? error.code : "internal_error";
  if ((errorKeys as readonly string[]).includes(code)) {
    return errors(code as ErrorKey);
  }
  return errors("internal_error");
}
