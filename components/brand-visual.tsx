"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ImageIcon, ImagePlus, Upload, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";

import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentTrigger,
} from "@/components/ui/attachment";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAutoSave } from "@/hooks/use-auto-save";
import {
  ApiError,
  api,
  apiUpload,
  type BrandVisual,
  type ContrastScheme,
  type VisualResponse,
} from "@/lib/api";
import { appToast } from "@/lib/app-toast";
import { cn } from "@/lib/utils";

const fields = [
  ["primary_color", "primary"],
  ["secondary_color", "secondary"],
  ["accent_color", "accent"],
  ["background_color", "background"],
  ["text_color", "text"],
] as const;

const hexPattern = /^#([0-9A-Fa-f]{6})$/;

export function BrandVisualCard({ brandId, autoSave = false }: { brandId: string; autoSave?: boolean }) {
  const t = useTranslations("visual");
  const query = useQuery({
    queryKey: ["visual", brandId],
    queryFn: () => api<VisualResponse>(`/v1/brands/${brandId}/visual`),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm text-ink/70">{t("lead")}</p>
        {query.data ? (
          <VisualForm
            key={JSON.stringify(query.data.identity)}
            brandId={brandId}
            identity={query.data.identity}
            autoSave={autoSave}
          />
        ) : null}
        {query.data ? (
          <LogoSlots brandId={brandId} identity={query.data.identity} onChanged={() => void query.refetch()} />
        ) : null}
      </CardContent>
    </Card>
  );
}

function VisualForm({
  brandId,
  identity,
  autoSave = true,
}: {
  brandId: string;
  identity: BrandVisual;
  autoSave?: boolean;
}) {
  const t = useTranslations("visual");
  const workspace = useTranslations("brandWorkspace");
  const errors = useTranslations("errors");
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(identity);
  const [dirty, setDirty] = useState(false);
  const toastId = `brand-visual-${brandId}`;

  const { touch, saveNow, isSaving } = useAutoSave({
    payload: draft,
    dirty,
    enabled: autoSave,
    toastId,
    successMessage: autoSave ? workspace("saved") : t("saved"),
    errorMessage: (error) => {
      const code = error instanceof ApiError ? error.code : "internal_error";
      return errors(code === "invalid_input" ? "invalid_input" : "internal_error");
    },
    save: (payload) =>
      api(`/v1/brands/${brandId}/visual`, {
        method: "PATCH",
        body: JSON.stringify({
          primary_color: payload.primary_color,
          secondary_color: payload.secondary_color,
          accent_color: payload.accent_color,
          background_color: payload.background_color,
          text_color: payload.text_color,
          heading_font: payload.heading_font,
          body_font: payload.body_font,
          logo_url: payload.logo_url,
          logo_inverted_url: payload.logo_inverted_url,
          icon_url: payload.icon_url,
        }),
      }),
    onSuccess: async (_result, meta) => {
      if (meta.isCurrent) {
        setDirty(false);
      }
      if (!autoSave) {
        await queryClient.invalidateQueries({ queryKey: ["visual", brandId] });
      }
    },
  });

  function updateDraft(updater: (current: BrandVisual) => BrandVisual) {
    touch();
    setDirty(true);
    setDraft(updater);
  }

  const palette = fields.map(([key, label]) => ({
    key,
    label: t(label),
    value: draft[key],
  }));

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (autoSave) {
          return;
        }
        void saveNow(draft);
      }}
    >
      <ContrastBoards identity={identity} headingFont={draft.heading_font} bodyFont={draft.body_font} />

      <PaletteStrip colors={palette} emptyLabel={t("emptySwatch")} />

      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map(([key, label]) => (
          <ColorField
            key={key}
            id={key}
            label={t(label)}
            origin={originLabel(
              t,
              identity[key],
              typeof identity[`${key}_origin` as keyof BrandVisual] === "string"
                ? (identity[`${key}_origin` as keyof BrandVisual] as string)
                : "",
            )}
            pickLabel={t("pickColor")}
            clearLabel={t("clear")}
            placeholder={t("hexPlaceholder")}
            value={draft[key]}
            onChange={(value) => updateDraft((current) => ({ ...current, [key]: value }))}
          />
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <FontField
          id="heading_font"
          label={t("headingFont")}
          origin={originLabel(t, identity.heading_font, identity.heading_font_origin)}
          sample={t("fontSample")}
          value={draft.heading_font}
          onChange={(value) => updateDraft((current) => ({ ...current, heading_font: value }))}
        />
        <FontField
          id="body_font"
          label={t("bodyFont")}
          origin={originLabel(t, identity.body_font, identity.body_font_origin)}
          sample={t("fontSample")}
          value={draft.body_font}
          onChange={(value) => updateDraft((current) => ({ ...current, body_font: value }))}
        />
      </div>

      {!autoSave ? (
        <Button type="submit" className="w-full sm:w-auto" disabled={isSaving}>
          {t("save")}
        </Button>
      ) : null}
    </form>
  );
}

const logoSlots = [
  { kind: "logo" as const, labelKey: "logo" as const, field: "logo_url" as const, originField: "logo_url_origin" as const },
  {
    kind: "logo_inverted" as const,
    labelKey: "logoInverted" as const,
    field: "logo_inverted_url" as const,
    originField: "logo_inverted_url_origin" as const,
  },
];

function LogoSlots({
  brandId,
  identity,
  onChanged,
}: {
  brandId: string;
  identity: BrandVisual;
  onChanged: () => void;
}) {
  const t = useTranslations("visual");
  const errors = useTranslations("errors");
  const queryClient = useQueryClient();
  const toastId = `brand-logos-${brandId}`;

  function refresh() {
    onChanged();
    void queryClient.invalidateQueries({ queryKey: ["visual", brandId] });
    void queryClient.invalidateQueries({ queryKey: ["images", brandId] });
  }

  function errorText(error: unknown) {
    const code = error instanceof ApiError ? error.code : "internal_error";
    return errors(code === "invalid_input" ? "invalid_input" : "internal_error");
  }

  return (
    <div className="space-y-3 border-t border-input pt-5">
      <div className="space-y-1">
        <h3 className="text-sm font-medium">{t("marks")}</h3>
        <p className="text-sm text-ink/70">{t("marksLead")}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {logoSlots.map((slot) => (
          <LogoSlotCard
            key={slot.kind}
            brandId={brandId}
            identity={identity}
            kind={slot.kind}
            label={t(slot.labelKey)}
            url={identity[slot.field]}
            origin={originLabel(t, identity[slot.field], identity[slot.originField])}
            toastId={toastId}
            onUploaded={refresh}
            onCleared={refresh}
            onError={(error) => appToast.error(errorText(error), toastId)}
          />
        ))}
      </div>
    </div>
  );
}

function LogoSlotCard({
  brandId,
  identity,
  kind,
  label,
  url,
  origin,
  toastId,
  onUploaded,
  onCleared,
  onError,
}: {
  brandId: string;
  identity: BrandVisual;
  kind: "logo" | "logo_inverted";
  label: string;
  url: string;
  origin: string;
  toastId: string;
  onUploaded: () => void;
  onCleared: () => void;
  onError: (error: unknown) => void;
}) {
  const t = useTranslations("visual");
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [pendingName, setPendingName] = useState("");

  function clearLogo() {
    setBusy(true);
    void api(`/v1/brands/${brandId}/visual`, {
      method: "PATCH",
      body: JSON.stringify({
        primary_color: identity.primary_color,
        secondary_color: identity.secondary_color,
        accent_color: identity.accent_color,
        background_color: identity.background_color,
        text_color: identity.text_color,
        heading_font: identity.heading_font,
        body_font: identity.body_font,
        logo_url: kind === "logo" ? "" : identity.logo_url,
        logo_inverted_url: kind === "logo_inverted" ? "" : identity.logo_inverted_url,
        icon_url: identity.icon_url,
      }),
    })
      .then(() => {
        onCleared();
        appToast.success(t("saved"), toastId);
      })
      .catch(onError)
      .finally(() => setBusy(false));
  }

  function uploadFile(file: File) {
    const form = new FormData();
    form.set("kind", kind);
    form.set("file", file);
    setPendingName(file.name);
    setBusy(true);
    void apiUpload(`/v1/brands/${brandId}/marks`, form)
      .then(() => {
        onUploaded();
        appToast.success(t("saved"), toastId);
      })
      .catch(onError)
      .finally(() => {
        setBusy(false);
        setPendingName("");
      });
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {origin ? <p className="text-xs text-ink/55">{origin}</p> : null}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) {
            return;
          }
          uploadFile(file);
        }}
      />
      {url || busy ? (
        <Attachment state={busy ? "uploading" : "done"} className="w-full max-w-none">
          <AttachmentMedia variant={url ? "image" : "icon"}>
            {url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={url} alt={label} />
            ) : (
              <ImageIcon aria-hidden />
            )}
          </AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle>{busy && pendingName ? pendingName : label}</AttachmentTitle>
            <AttachmentDescription>
              {busy ? t("uploading") : origin || t("logo")}
            </AttachmentDescription>
          </AttachmentContent>
          <AttachmentActions>
            <AttachmentAction
              aria-label={t("upload")}
              disabled={busy}
              onClick={() => fileRef.current?.click()}
            >
              <Upload />
            </AttachmentAction>
            {url ? (
              <AttachmentAction aria-label={t("clear")} disabled={busy} onClick={clearLogo}>
                <X />
              </AttachmentAction>
            ) : null}
          </AttachmentActions>
        </Attachment>
      ) : (
        <Attachment state="idle" className="w-full max-w-none">
          <AttachmentMedia>
            <ImagePlus aria-hidden />
          </AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle>{t("logoEmpty")}</AttachmentTitle>
            <AttachmentDescription>{t("upload")}</AttachmentDescription>
          </AttachmentContent>
          <AttachmentTrigger
            aria-label={t("upload")}
            className="min-h-11"
            onClick={() => fileRef.current?.click()}
          />
        </Attachment>
      )}
    </div>
  );
}

function ContrastBoards({
  identity,
  headingFont,
  bodyFont,
}: {
  identity: BrandVisual;
  headingFont: string;
  bodyFont: string;
}) {
  const t = useTranslations("visual");
  useBrandFonts(headingFont, bodyFont);
  const boards = [
    { key: "light" as const, title: t("lightScheme"), scheme: identity.schemes?.light },
    { key: "inverse" as const, title: t("inverseScheme"), scheme: identity.schemes?.inverse },
  ].filter((board) => Boolean(board.scheme?.background));
  const shape = identity.shape;
  const type = identity.schemes?.type;
  const notes = [
    shape?.radius ? t("shapeRadius", { value: shape.radius }) : "",
    shape?.border ? t("shapeBorder", { value: shape.border }) : "",
    shape?.shadow === "none" ? t("shapeShadowNone") : "",
    shape?.shadow === "soft" ? t("shapeShadowSoft") : "",
    type?.heading_weight || type?.body_weight
      ? t("typeWeights", { heading: type.heading_weight || "—", body: type.body_weight || "—" })
      : "",
    type?.label_style === "uppercase" ? t("labelUppercase") : "",
  ].filter(Boolean);

  if (boards.length === 0 && notes.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {boards.length > 0 ? <h3 className="text-sm font-medium">{t("contrasts")}</h3> : null}
      {boards.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {boards.map((board) => (
            <ContrastBoard
              key={board.key}
              title={board.title}
              scheme={board.scheme as ContrastScheme}
              headingFont={headingFont}
              bodyFont={bodyFont}
              labelStyle={type?.label_style}
              radius={shape?.radius}
              headingWeight={type?.heading_weight}
              bodyWeight={type?.body_weight}
            />
          ))}
        </div>
      ) : null}
      {notes.length > 0 ? <p className="text-xs text-ink/60">{notes.join(" · ")}</p> : null}
    </div>
  );
}

function ContrastBoard({
  title,
  scheme,
  headingFont,
  bodyFont,
  labelStyle,
  radius,
  headingWeight,
  bodyWeight,
}: {
  title: string;
  scheme: ContrastScheme;
  headingFont: string;
  bodyFont: string;
  labelStyle?: string;
  radius?: string;
  headingWeight?: string;
  bodyWeight?: string;
}) {
  const t = useTranslations("visual");
  const headingFamily = fontStack(headingFont);
  const bodyFamily = fontStack(bodyFont);
  const sample = (
    <div className="space-y-2">
      <p
        className="text-lg leading-tight"
        style={{
          color: scheme.heading || scheme.body,
          fontFamily: headingFamily,
          fontWeight: headingWeight || 600,
        }}
      >
        {t("contrastHeading")}
      </p>
      <p
        className="text-sm leading-relaxed"
        style={{
          color: scheme.body || scheme.heading,
          fontFamily: bodyFamily,
          fontWeight: bodyWeight || 400,
        }}
      >
        {t("contrastBody")}
      </p>
    </div>
  );
  return (
    <div
      className="space-y-3 border border-black/10 p-4"
      style={{
        backgroundColor: scheme.background,
        borderRadius: radius || "12px",
        borderColor: scheme.border || undefined,
      }}
    >
      <p
        className="text-[11px] font-medium tracking-[0.16em]"
        style={{
          color: scheme.muted || scheme.heading,
          fontFamily: headingFamily,
          textTransform: labelStyle === "uppercase" ? "uppercase" : undefined,
        }}
      >
        {title}
      </p>
      {scheme.surface ? (
        <div
          className="space-y-2 p-3"
          style={{
            backgroundColor: scheme.surface,
            borderRadius: radius || "12px",
            border: scheme.border ? `1px solid ${scheme.border}` : undefined,
          }}
        >
          {sample}
        </div>
      ) : (
        sample
      )}
      <div className="flex flex-wrap items-center gap-2">
        {scheme.accent ? (
          <span
            className="inline-flex min-h-11 items-center rounded-md px-3 text-sm"
            style={{
              backgroundColor: scheme.accent,
              color: scheme.on_accent || scheme.background,
              fontFamily: bodyFamily || headingFamily,
              fontWeight: bodyWeight || 500,
            }}
          >
            {t("accent")}
          </span>
        ) : null}
        {scheme.heading_contrast > 0 ? (
          <span className="text-xs" style={{ color: scheme.muted || scheme.body, fontFamily: bodyFamily }}>
            {t("contrastRatio", { ratio: scheme.heading_contrast.toFixed(2) })}
          </span>
        ) : null}
      </div>
    </div>
  );
}

const FONT_ALIASES: Record<string, string[]> = {
  kohinoor: ["Kohinoor Devanagari", "Kohinoor Bangla", "Kohinoor Gujarati", "Kohinoor Telugu"],
};

const GENERIC_FONTS = new Set([
  "serif",
  "sans-serif",
  "monospace",
  "cursive",
  "fantasy",
  "system-ui",
  "ui-sans-serif",
  "ui-serif",
  "ui-monospace",
  "ui-rounded",
]);

function fontStack(name: string) {
  const family = name.trim();
  if (!family) {
    return undefined;
  }
  const aliases = FONT_ALIASES[family.toLowerCase()] ?? [];
  return [...new Set([family, ...aliases]), "sans-serif"]
    .map((item) => (GENERIC_FONTS.has(item.toLowerCase()) ? item : `"${item}"`))
    .join(", ");
}

function useBrandFonts(...names: string[]) {
  useEffect(() => {
    const families = [...new Set(names.map((name) => name.trim()).filter(Boolean))];
    for (const family of families) {
      if (GENERIC_FONTS.has(family.toLowerCase())) {
        continue;
      }
      const id = `brand-font-${family.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
      if (document.getElementById(id)) {
        continue;
      }
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, "+")}:wght@400;500;600;700&display=swap`;
      document.head.appendChild(link);
    }
  }, [names.join("|")]);
}

function PaletteStrip({
  colors,
  emptyLabel,
}: {
  colors: { key: string; label: string; value: string }[];
  emptyLabel: string;
}) {
  return (
    <div
      className="overflow-hidden rounded-xl border border-input"
      role="img"
      aria-label={colors.map((color) => `${color.label}: ${color.value || emptyLabel}`).join(", ")}
    >
      <div className="flex h-14 divide-x divide-black/10 dark:divide-white/15">
        {colors.map((color) => {
          const valid = hexPattern.test(color.value);
          return (
            <div
              key={color.key}
              className={cn("relative min-w-0 flex-1", !valid && "bg-checker")}
              style={valid ? { backgroundColor: color.value } : undefined}
              title={`${color.label}: ${color.value || emptyLabel}`}
            />
          );
        })}
      </div>
    </div>
  );
}

function ColorField({
  id,
  label,
  origin,
  pickLabel,
  clearLabel,
  placeholder,
  value,
  onChange,
}: {
  id: string;
  label: string;
  origin: string;
  pickLabel: string;
  clearLabel: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const pickerRef = useRef<HTMLInputElement>(null);
  const pickerId = useId();
  const valid = hexPattern.test(value);
  const pickerValue = valid ? value : "#000000";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Label htmlFor={id}>{label}</Label>
        <OriginBadge value={origin} />
      </div>
      <div className="flex h-11 items-stretch overflow-hidden rounded-md border border-input bg-muted text-foreground shadow-sm focus-within:ring-1 focus-within:ring-ring">
        <button
          type="button"
          className={cn(
            "relative size-11 shrink-0 border-r border-input transition-opacity hover:opacity-90",
            !valid && "bg-checker",
          )}
          style={valid ? { backgroundColor: value } : undefined}
          aria-label={pickLabel}
          onClick={() => pickerRef.current?.click()}
        >
          <input
            ref={pickerRef}
            id={pickerId}
            type="color"
            value={pickerValue}
            className="pointer-events-none absolute inset-0 size-full opacity-0"
            tabIndex={-1}
            onChange={(event) => onChange(event.target.value.toUpperCase())}
          />
        </button>
        <input
          id={id}
          value={value}
          placeholder={placeholder}
          spellCheck={false}
          autoCapitalize="characters"
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent px-3 font-mono text-sm uppercase tracking-wide outline-none placeholder:normal-case placeholder:tracking-normal placeholder:text-muted-foreground"
          onChange={(event) => onChange(normalizeHexInput(event.target.value))}
          onBlur={() => {
            if (value && hexPattern.test(value)) {
              onChange(value.toUpperCase());
            }
          }}
        />
        {value ? (
          <button
            type="button"
            className="min-h-11 shrink-0 px-3 text-xs text-ink/55 transition-colors hover:text-ink"
            onClick={() => onChange("")}
          >
            {clearLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function FontField({
  id,
  label,
  origin,
  sample,
  value,
  onChange,
}: {
  id: string;
  label: string;
  origin: string;
  sample: string;
  value: string;
  onChange: (value: string) => void;
}) {
  useBrandFonts(value);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Label htmlFor={id}>{label}</Label>
        <OriginBadge value={origin} />
      </div>
      <Input id={id} value={value} onChange={(event) => onChange(event.target.value)} />
      {value ? (
        <p className="truncate rounded-md bg-muted/50 px-3 py-2 text-sm text-ink/80" style={{ fontFamily: fontStack(value) }}>
          {sample}
        </p>
      ) : null}
    </div>
  );
}

function OriginBadge({ value }: { value: string }) {
  if (!value) {
    return null;
  }
  return (
    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium tracking-wide text-ink/60">
      {value}
    </span>
  );
}

function originLabel(t: (key: "extracted" | "manual") => string, value: string, origin: string) {
  if (origin === "manual") {
    return t("manual");
  }
  if (origin === "extracted" && value) {
    return t("extracted");
  }
  return "";
}

function normalizeHexInput(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) {
    return "";
  }
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  return withHash.slice(0, 7);
}
