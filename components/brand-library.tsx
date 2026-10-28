"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Briefcase, ImagePlus, MapPin, Package, Plus, Smile, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { ConfirmAlertDialog } from "@/components/confirm-alert-dialog";
import { LibraryPhoto } from "@/components/library-photo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, api, apiUpload, type BrandItem } from "@/lib/api";
import { appToast } from "@/lib/app-toast";
import { orderedItemImages } from "@/lib/generation-assets";
import { cn } from "@/lib/utils";

const kinds = ["person", "mascot", "product", "service", "location"] as const;
type LibraryKind = (typeof kinds)[number];
type LibraryFilter = LibraryKind | "";
type ProductSubtype = "physical" | "digital";

const kindIcon = {
  person: User,
  mascot: Smile,
  product: Package,
  service: Briefcase,
  location: MapPin,
} as const;

function matchesFilter(item: BrandItem, filter: LibraryFilter) {
  if (!filter) {
    return true;
  }
  if (filter === "person") {
    return item.category === "character" && item.subtype !== "mascot";
  }
  if (filter === "mascot") {
    return item.category === "character" && item.subtype === "mascot";
  }
  return item.category === filter;
}

function storedFromKind(kind: LibraryKind, productSubtype: ProductSubtype) {
  if (kind === "person") {
    return { category: "character", subtype: "person" };
  }
  if (kind === "mascot") {
    return { category: "character", subtype: "mascot" };
  }
  if (kind === "product") {
    return { category: "product", subtype: productSubtype };
  }
  if (kind === "service") {
    return { category: "service", subtype: "" };
  }
  return { category: "location", subtype: "" };
}

function cardLabelKey(item: BrandItem) {
  if (item.category === "character") {
    if (item.subtype === "mascot") {
      return "character_mascot";
    }
    if (item.subtype === "person") {
      return "character_person";
    }
    return "character_any";
  }
  if (item.category === "product" && (item.subtype === "physical" || item.subtype === "digital")) {
    return `product_${item.subtype}`;
  }
  return item.category;
}

export function BrandLibrary({ brandId }: { brandId: string }) {
  const t = useTranslations("brandWorkspace");
  const errors = useTranslations("errors");
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<LibraryFilter>("");
  const [selectedId, setSelectedId] = useState("");
  const [draftName, setDraftName] = useState("");
  const [draftSubtype, setDraftSubtype] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftPrice, setDraftPrice] = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newKind, setNewKind] = useState<LibraryKind | "">("");
  const [newProductSubtype, setNewProductSubtype] = useState<ProductSubtype>("physical");

  const query = useQuery({
    queryKey: ["brand-items", brandId],
    queryFn: () => api<{ items: BrandItem[] }>(`/v1/brands/${brandId}/items`),
  });
  const allItems = query.data?.items ?? [];
  const items = allItems.filter((item) => matchesFilter(item, filter));
  const selected = allItems.find((item) => item.id === selectedId) ?? null;
  const images = orderedItemImages(selected);

  useEffect(() => {
    if (!selectedId) {
      return;
    }
    editorRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedId]);

  function toastError(error: unknown) {
    const code = error instanceof ApiError ? error.code : "internal_error";
    const known = ["invalid_input", "not_found", "internal_error"] as const;
    appToast.error(errors(known.includes(code as (typeof known)[number]) ? code : "internal_error"), "library");
  }

  function mergeItem(next: BrandItem) {
    queryClient.setQueryData<{ items: BrandItem[] }>(["brand-items", brandId], (current) => {
      const rows = current?.items ?? [];
      if (!rows.some((item) => item.id === next.id)) {
        return { items: [...rows, next] };
      }
      return { items: rows.map((item) => (item.id === next.id ? next : item)) };
    });
    void queryClient.invalidateQueries({ queryKey: ["brand-items", brandId] });
  }

  function refresh(next?: BrandItem, fields = false) {
    if (next) {
      mergeItem(next);
      setSelectedId(next.id);
      if (filter && !matchesFilter(next, filter)) {
        setFilter("");
      }
      if (fields) {
        setDraftName(next.name);
        setDraftSubtype(next.subtype);
        setDraftDescription(next.description);
        setDraftPrice(next.price_label);
      }
      return;
    }
    void queryClient.invalidateQueries({ queryKey: ["brand-items", brandId] });
  }

  const create = useMutation({
    mutationFn: () => {
      if (!newKind) {
        throw new ApiError("invalid_input");
      }
      const stored = storedFromKind(newKind, newProductSubtype);
      return api<{ item: BrandItem }>(`/v1/brands/${brandId}/items`, {
        method: "POST",
        body: JSON.stringify({
          category: stored.category,
          subtype: stored.subtype,
          name: newName.trim(),
          description: "",
          price_label: "",
        }),
      });
    },
    onSuccess: (result) => {
      setCreating(false);
      setNewName("");
      setNewKind("");
      setNewProductSubtype("physical");
      refresh(result.item, true);
    },
    onError: toastError,
  });

  const save = useMutation({
    mutationFn: () => {
      if (!selected) {
        throw new ApiError("invalid_input");
      }
      return api<{ item: BrandItem }>(`/v1/brands/${brandId}/items/${selected.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          category: selected.category,
          subtype: draftSubtype,
          name: draftName.trim(),
          description: draftDescription.trim(),
          price_label: selected.category === "product" ? draftPrice.trim() : "",
        }),
      });
    },
    onSuccess: (result) => {
      appToast.success(t("saved"), "library");
      refresh(result.item, true);
    },
    onError: toastError,
  });

  const remove = useMutation({
    mutationFn: (itemId: string) => api<void>(`/v1/brands/${brandId}/items/${itemId}`, { method: "DELETE" }),
    onSuccess: (_result, itemId) => {
      setSelectedId("");
      queryClient.setQueryData<{ items: BrandItem[] }>(["brand-items", brandId], (current) => ({
        items: (current?.items ?? []).filter((item) => item.id !== itemId),
      }));
      void queryClient.invalidateQueries({ queryKey: ["brand-items", brandId] });
    },
    onError: toastError,
  });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      if (!selected) {
        throw new ApiError("invalid_input");
      }
      const form = new FormData();
      form.append("file", file);
      return apiUpload<{ item: BrandItem }>(`/v1/brands/${brandId}/items/${selected.id}/images`, form);
    },
    onSuccess: (result) => refresh(result.item),
    onError: toastError,
  });

  const imageAction = useMutation({
    mutationFn: async (action: { kind: "primary" | "delete" | "order"; imageId?: string; ids?: string[] }) => {
      if (!selected) {
        throw new ApiError("invalid_input");
      }
      if (action.kind === "order" || action.kind === "primary") {
        const ids =
          action.kind === "primary"
            ? [action.imageId ?? "", ...images.filter((image) => image.id !== action.imageId).map((image) => image.id)]
            : (action.ids ?? []);
        await api(`/v1/brands/${brandId}/items/${selected.id}/images/order`, {
          method: "POST",
          body: JSON.stringify({ ids }),
        });
        return api<{ item: BrandItem }>(`/v1/brands/${brandId}/items/${selected.id}/images/${ids[0]}/primary`, {
          method: "POST",
        });
      }
      return api<{ item: BrandItem }>(`/v1/brands/${brandId}/items/${selected.id}/images/${action.imageId}`, {
        method: "DELETE",
      });
    },
    onSuccess: (result) => refresh(result.item),
    onError: toastError,
  });

  function openItem(item: BrandItem) {
    if (item.id === selectedId) {
      setSelectedId("");
      return;
    }
    setCreating(false);
    setSelectedId(item.id);
    setDraftName(item.name);
    setDraftSubtype(item.subtype);
    setDraftDescription(item.description);
    setDraftPrice(item.price_label);
  }

  function moveImage(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= images.length) {
      return;
    }
    const next = [...images];
    const [row] = next.splice(index, 1);
    next.splice(target, 0, row);
    imageAction.mutate({ kind: "order", ids: next.map((image) => image.id) });
  }

  function startCreate(kind: LibraryKind | "" = "") {
    setCreating(true);
    setSelectedId("");
    setNewKind(kind);
    if (kind === "product") {
      setNewProductSubtype("physical");
    }
  }

  const showGlobalEmpty = !query.isLoading && !query.isError && allItems.length === 0;
  const showFilteredEmpty = !query.isLoading && !query.isError && allItems.length > 0 && items.length === 0;

  return (
    <div className="space-y-4">
      <p className="max-w-2xl text-sm leading-relaxed text-ink/70">{t("library.lead")}</p>

      <div className="flex flex-col gap-3">
        <Button
          type="button"
          className="min-h-11 w-full sm:w-fit"
          aria-expanded={creating}
          onClick={() => (creating ? setCreating(false) : startCreate(filter))}
        >
          <Plus aria-hidden />
          {creating ? t("library.cancel") : t("library.add")}
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-ink/60">{t("library.show")}</span>
          <FilterChip active={filter === ""} label={t("library.all")} onClick={() => setFilter("")} />
          {kinds.map((item) => (
            <FilterChip
              key={item}
              active={filter === item}
              label={t(`library.filters.${item}`)}
              onClick={() => setFilter(item)}
            />
          ))}
        </div>
      </div>

      {creating ? (
        <div className="space-y-4 rounded-lg border border-border bg-card p-4">
          <div className="space-y-1">
            <p className="text-sm font-medium">{t("library.addTitle")}</p>
            <p className="text-sm leading-relaxed text-ink/70">{t("library.addLead")}</p>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {kinds.map((item) => {
              const Icon = kindIcon[item];
              const active = newKind === item;
              return (
                <button
                  key={item}
                  type="button"
                  aria-pressed={active}
                  className={cn(
                    "flex min-h-11 items-start gap-3 rounded-lg border px-3 py-3 text-left",
                    active ? "border-foreground bg-foreground text-background" : "border-border bg-background",
                  )}
                  onClick={() => {
                    setNewKind(item);
                    if (item === "product") {
                      setNewProductSubtype("physical");
                    }
                  }}
                >
                  <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
                  <span>
                    <span className="block text-sm font-medium">{t(`library.kinds.${item}.title`)}</span>
                    <span className={cn("mt-0.5 block text-xs leading-snug", active ? "text-background/80" : "text-ink/60")}>
                      {t(`library.kinds.${item}.blurb`)}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          {newKind === "product" ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">{t("library.productKind")}</p>
              <ChoiceRow
                value={newProductSubtype}
                options={[
                  { id: "physical", label: t("library.subtypes.physical") },
                  { id: "digital", label: t("library.subtypes.digital") },
                ]}
                onChange={(value) => setNewProductSubtype(value as ProductSubtype)}
              />
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="library-new-name">{t("library.name")}</Label>
            <Input
              id="library-new-name"
              className="min-h-11"
              value={newName}
              placeholder={t("library.namePlaceholder")}
              autoComplete="off"
              onChange={(event) => setNewName(event.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              className="min-h-11"
              disabled={!newKind || !newName.trim() || create.isPending}
              onClick={() => create.mutate()}
            >
              {t("library.create")}
            </Button>
            <Button type="button" variant="outline" className="min-h-11" onClick={() => setCreating(false)}>
              {t("library.cancel")}
            </Button>
          </div>
        </div>
      ) : null}

      {query.isLoading ? <p className="text-sm text-ink/70">{t("library.loading")}</p> : null}
      {query.isError ? <p className="text-sm text-destructive">{t("library.error")}</p> : null}
      {showGlobalEmpty && !creating ? (
        <div className="rounded-lg border border-dashed border-border bg-card px-4 py-8 text-center">
          <p className="font-medium">{t("library.emptyTitle")}</p>
          <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-ink/70">{t("library.empty")}</p>
          <Button type="button" className="mt-4 min-h-11" onClick={() => startCreate()}>
            <Plus aria-hidden />
            {t("library.add")}
          </Button>
        </div>
      ) : null}
      {showFilteredEmpty ? (
        <div className="rounded-lg border border-dashed border-border bg-card px-4 py-6 text-center">
          <p className="text-sm text-ink/70">{t("library.emptyFiltered")}</p>
          <Button type="button" className="mt-3 min-h-11" onClick={() => startCreate(filter)}>
            <Plus aria-hidden />
            {t("library.add")}
          </Button>
        </div>
      ) : null}

      {items.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.map((item) => {
            const cover = orderedItemImages(item)[0];
            const open = item.id === selectedId && !creating;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  aria-pressed={open}
                  className={cn(
                    "flex min-h-11 w-full flex-col overflow-hidden rounded-lg border text-left",
                    open ? "border-foreground ring-2 ring-foreground" : "border-border bg-card",
                  )}
                  onClick={() => openItem(item)}
                >
                  <LibraryPhoto src={cover?.url} emptyLabel={t("library.noPhoto")} className="aspect-square w-full" />
                  <span className="space-y-0.5 px-3 py-2">
                    <span className="block text-sm font-medium">{item.name}</span>
                    <span className="block text-xs text-ink/60">{t(`library.cardLabel.${cardLabelKey(item)}`)}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {items.length > 0 && !selected && !creating ? (
        <p className="text-sm leading-relaxed text-ink/60">{t("library.tapHint")}</p>
      ) : null}

      {selected && !creating ? (
        <div ref={editorRef} className="scroll-mt-4 space-y-4 rounded-lg border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-ink/60">
                {t(`library.cardLabel.${cardLabelKey({ ...selected, subtype: draftSubtype })}`)}
              </p>
              <h3 className="truncate text-base font-medium">{t("library.editing", { name: draftName.trim() || selected.name })}</h3>
            </div>
            <Button type="button" variant="ghost" className="min-h-11 shrink-0" onClick={() => setSelectedId("")}>
              {t("library.close")}
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="library-name">{t("library.name")}</Label>
              <Input
                id="library-name"
                className="min-h-11"
                value={draftName}
                placeholder={t("library.namePlaceholder")}
                autoComplete="off"
                onChange={(event) => setDraftName(event.target.value)}
              />
            </div>
            {selected.category === "character" ? (
              <div className="space-y-2 sm:col-span-2">
                <p className="text-sm font-medium">{t("library.characterKind")}</p>
                <ChoiceRow
                  value={draftSubtype}
                  options={[
                    { id: "person", label: t("library.subtypes.person") },
                    { id: "mascot", label: t("library.subtypes.mascot") },
                  ]}
                  onChange={setDraftSubtype}
                />
              </div>
            ) : null}
            {selected.category === "product" ? (
              <div className="space-y-2 sm:col-span-2">
                <p className="text-sm font-medium">{t("library.productKind")}</p>
                <ChoiceRow
                  value={draftSubtype}
                  options={[
                    { id: "physical", label: t("library.subtypes.physical") },
                    { id: "digital", label: t("library.subtypes.digital") },
                  ]}
                  onChange={setDraftSubtype}
                />
              </div>
            ) : null}
            {selected.category === "product" ? (
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="library-price">{t("library.price")}</Label>
                <p className="text-sm leading-relaxed text-ink/70">{t("library.priceHint")}</p>
                <Input
                  id="library-price"
                  className="min-h-11"
                  value={draftPrice}
                  placeholder={t("library.pricePlaceholder")}
                  onChange={(event) => setDraftPrice(event.target.value)}
                />
              </div>
            ) : null}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="library-description">{t("library.description")}</Label>
              <p className="text-sm leading-relaxed text-ink/70">{t("library.descriptionHint")}</p>
              <Textarea
                id="library-description"
                value={draftDescription}
                onChange={(event) => setDraftDescription(event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">{t("library.images")}</p>
            <p className="text-sm leading-relaxed text-ink/70">{t("library.imagesHint")}</p>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  upload.mutate(file);
                }
                event.target.value = "";
              }}
            />
            {images.length === 0 ? (
              <button
                type="button"
                className="flex min-h-36 w-full max-w-xs flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border px-4 text-sm font-medium"
                disabled={upload.isPending}
                onClick={() => fileRef.current?.click()}
              >
                <ImagePlus aria-hidden />
                {upload.isPending ? t("library.uploading") : t("library.uploadFirst")}
              </button>
            ) : (
              <ul className="space-y-2">
                {images.map((image, index) => (
                  <li key={image.id} className="flex items-center gap-3 rounded-lg border border-border p-2">
                    <LibraryPhoto src={image.url} emptyLabel={t("library.noPhoto")} className="size-20 shrink-0 rounded-md" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <p className="text-sm font-medium">
                        {image.is_primary ? t("library.cover") : t("library.referenceN", { n: index + 1 })}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {image.is_primary ? null : (
                          <Button
                            type="button"
                            variant="outline"
                            className="min-h-11"
                            disabled={imageAction.isPending}
                            onClick={() => imageAction.mutate({ kind: "primary", imageId: image.id })}
                          >
                            {t("library.makeCover")}
                          </Button>
                        )}
                        {images.length > 1 ? (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              className="min-h-11"
                              disabled={index === 0 || imageAction.isPending}
                              onClick={() => moveImage(index, -1)}
                            >
                              {t("library.earlier")}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              className="min-h-11"
                              disabled={index === images.length - 1 || imageAction.isPending}
                              onClick={() => moveImage(index, 1)}
                            >
                              {t("library.later")}
                            </Button>
                          </>
                        ) : null}
                        <Button
                          type="button"
                          variant="outline"
                          className="min-h-11"
                          disabled={imageAction.isPending}
                          onClick={() => imageAction.mutate({ kind: "delete", imageId: image.id })}
                        >
                          {t("library.deletePhoto")}
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {images.length > 0 && images.length < 8 ? (
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                disabled={upload.isPending || !selected}
                onClick={() => fileRef.current?.click()}
              >
                <ImagePlus aria-hidden />
                {upload.isPending ? t("library.uploading") : t("library.upload")}
              </Button>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" className="min-h-11" disabled={!draftName.trim() || save.isPending} onClick={() => save.mutate()}>
              {t("library.saveItem")}
            </Button>
            <ConfirmAlertDialog
              title={t("library.removeTitle")}
              description={t("library.removeConfirm")}
              cancelLabel={t("library.cancel")}
              confirmLabel={t("library.remove")}
              onConfirm={() => remove.mutate(selected.id)}
              trigger={
                <Button type="button" variant="outline" className="min-h-11">
                  {t("library.remove")}
                </Button>
              }
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FilterChip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "min-h-11 rounded-full border px-3 text-sm font-medium",
        active ? "border-foreground bg-foreground text-background" : "border-border bg-card",
      )}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function ChoiceRow({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { id: string; label: string }[];
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          aria-pressed={value === option.id}
          className={cn(
            "min-h-11 rounded-full border px-3 text-sm font-medium",
            value === option.id ? "border-foreground bg-foreground text-background" : "border-border bg-background",
          )}
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
