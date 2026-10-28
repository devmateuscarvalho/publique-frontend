"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";

import { LibraryPhoto } from "@/components/library-photo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { wizardControlClass, wizardHintClass, wizardPanelClass } from "@/components/wizard-ui";
import { ApiError, api, apiUpload, type BrandItem, type CreativeRecipe } from "@/lib/api";
import { appToast } from "@/lib/app-toast";
import { orderedItemImages } from "@/lib/generation-assets";
import { itemMatchesLook, type OfferingChip } from "@/lib/look-fits";
import { cn } from "@/lib/utils";

type WizardProduct = { name: string; price: string; description: string };

type CreateKind = "physical" | "digital" | "service" | "person" | "mascot";

export function WizardLibrary({
  brandId,
  recipe,
  offering,
  item,
  onItem,
  product,
  onProduct,
  place,
  onPlace,
}: {
  brandId: string;
  recipe?: CreativeRecipe | null;
  offering: OfferingChip;
  item: BrandItem | null;
  onItem: (item: BrandItem | null) => void;
  product: WizardProduct;
  onProduct: (next: WizardProduct) => void;
  place: BrandItem | null;
  onPlace: (item: BrandItem | null) => void;
}) {
  const t = useTranslations("wizard");
  const kind = recipe?.output_kind === "avatar" ? "avatar" : "product";
  const query = useQuery({
    queryKey: ["brand-items", brandId],
    queryFn: () => api<{ items: BrandItem[] }>(`/v1/brands/${brandId}/items`),
    enabled: Boolean(brandId),
  });
  const items = (query.data?.items ?? []).filter(
    (row) => itemMatchesLook(recipe?.fits, kind, row) && row.category !== "location" && matchesChip(row, offering),
  );
  const places = (query.data?.items ?? []).filter((row) => row.category === "location");

  return (
    <div className="space-y-4">
      <section className={`${wizardPanelClass} space-y-3 p-4 md:p-5`}>
        <div>
          <p className="text-sm font-medium">{kind === "avatar" ? t("librarySubjectPerson") : t("librarySubjectProduct")}</p>
          <p className={wizardHintClass}>{t("libraryHint")}</p>
        </div>
        {query.isLoading ? <p className="text-sm text-muted-foreground">{t("loading")}</p> : null}
        {query.isError ? <p className="text-sm text-destructive">{t("libraryError")}</p> : null}
        <div className="flex gap-2 overflow-x-auto pb-1">
          <LibraryChoice label={t("libraryNone")} active={!item} onClick={() => onItem(null)} />
          {items.map((row) => (
            <LibraryChoice
              key={row.id}
              label={row.name}
              image={orderedItemImages(row)[0]?.url}
              emptyLabel={t("libraryNoPhoto")}
              active={item?.id === row.id}
              onClick={() => onItem(row)}
            />
          ))}
        </div>
        {!query.isLoading && !query.isError && items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("libraryEmpty")}</p>
        ) : null}
        <CreateItem
          brandId={brandId}
          kind={kind}
          offering={offering}
          fits={recipe?.fits}
          onCreated={(created) => {
            onItem(created);
            if (created.category === "product" || created.category === "service") {
              onProduct({
                name: created.name,
                price: created.category === "service" ? "" : created.price_label,
                description: created.description,
              });
            }
          }}
        />
        {item ? (
          <SelectedItem
            brandId={brandId}
            item={item}
            onItem={onItem}
            showCopy={kind === "product"}
            product={product}
            onProduct={onProduct}
          />
        ) : null}
      </section>

      <section className={`${wizardPanelClass} space-y-3 p-4 md:p-5`}>
        <div>
          <p className="text-sm font-medium">{t("libraryPlaceTitle")}</p>
          <p className={wizardHintClass}>{t("libraryPlaceHint")}</p>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <LibraryChoice label={t("libraryNone")} active={!place} onClick={() => onPlace(null)} />
          {places.map((row) => (
            <LibraryChoice
              key={row.id}
              label={row.name}
              image={orderedItemImages(row)[0]?.url}
              emptyLabel={t("libraryNoPhoto")}
              active={place?.id === row.id}
              onClick={() => onPlace(row)}
            />
          ))}
        </div>
        <CreateItem
          brandId={brandId}
          kind="location"
          offering=""
          fits={recipe?.fits}
          onCreated={onPlace}
        />
        {place ? <SelectedItem brandId={brandId} item={place} onItem={onPlace} /> : null}
      </section>
    </div>
  );
}

function matchesChip(item: { category: string; subtype: string }, chip: OfferingChip) {
  if (!chip) {
    return true;
  }
  if (chip === "service") {
    return item.category === "service";
  }
  return item.category === "product" && (item.subtype === "" || item.subtype === chip);
}

function createOptions(kind: "avatar" | "product" | "location", offering: OfferingChip, fits: CreativeRecipe["fits"]): CreateKind[] {
  if (kind === "location") {
    return [];
  }
  const options: CreateKind[] =
    kind === "avatar" ? ["person", "mascot"] : ["physical", "digital", "service"];
  return options.filter((option) => {
    const category = option === "service" ? "service" : kind === "avatar" ? "character" : "product";
    const subtype = option === "service" ? "" : option;
    if (!itemMatchesLook(fits, kind === "avatar" ? "avatar" : "product", { category, subtype })) {
      return false;
    }
    if (!offering) {
      return true;
    }
    if (offering === "service") {
      return option === "service";
    }
    return option === offering;
  });
}

function CreateItem({
  brandId,
  kind,
  offering,
  fits,
  onCreated,
}: {
  brandId: string;
  kind: "avatar" | "product" | "location";
  offering: OfferingChip;
  fits: CreativeRecipe["fits"];
  onCreated: (item: BrandItem) => void;
}) {
  const t = useTranslations("wizard");
  const errors = useTranslations("errors");
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const options = createOptions(kind, offering, fits);
  const [createKind, setCreateKind] = useState<CreateKind>(options[0] ?? "physical");
  const chosenKind = (options.includes(createKind) ? createKind : options[0] ?? "physical") as CreateKind;
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<{ key: string; file: File; url: string }[]>([]);

  const create = useMutation({
    mutationFn: async () => {
      const category = kind === "location" ? "location" : kind === "avatar" ? "character" : chosenKind === "service" ? "service" : "product";
      const subtype = category === "product" || category === "character" ? (chosenKind === "service" ? "" : chosenKind) : "";
      const created = await api<{ item: BrandItem }>(`/v1/brands/${brandId}/items`, {
        method: "POST",
        body: JSON.stringify({
          category,
          subtype,
          name: name.trim(),
          description: description.trim(),
          price_label: category === "product" ? price.trim() : "",
        }),
      });
      let current = created.item;
      for (const staged of files) {
        const form = new FormData();
        form.append("file", staged.file);
        const uploaded = await apiUpload<{ item: BrandItem }>(`/v1/brands/${brandId}/items/${current.id}/images`, form);
        current = uploaded.item;
      }
      return current;
    },
    onSuccess: (created) => {
      queryClient.setQueryData<{ items: BrandItem[] }>(["brand-items", brandId], (current) => {
        const items = current?.items ?? [];
        const next = items.some((row) => row.id === created.id)
          ? items.map((row) => (row.id === created.id ? created : row))
          : [created, ...items];
        return { items: next };
      });
      files.forEach((staged) => URL.revokeObjectURL(staged.url));
      setFiles([]);
      setName("");
      setPrice("");
      setDescription("");
      setOpen(false);
      onCreated(created);
    },
    onError: (error) => {
      const code = error instanceof ApiError ? error.code : "internal_error";
      appToast.error(errors(code === "invalid_input" || code === "not_found" ? code : "internal_error"), "library");
    },
  });

  return (
    <div className="space-y-3">
      <Button type="button" variant={open ? "default" : "outline"} className="min-h-11" onClick={() => setOpen((value) => !value)}>
        {t("libraryCreateNew")}
      </Button>
      {open ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor={`library-create-name-${kind}`}>
              {kind === "avatar" ? t("characterName") : kind === "location" ? t("placeName") : t("productName")}
            </Label>
            <Input id={`library-create-name-${kind}`} className={wizardControlClass} value={name} onChange={(event) => setName(event.target.value)} autoComplete="off" />
          </div>
          {options.length > 1 ? (
            <div className="space-y-1.5 sm:col-span-2">
              <Label>{t("libraryOfferings")}</Label>
              <Select value={chosenKind} onValueChange={(value) => setCreateKind(value as CreateKind)}>
                <SelectTrigger className={wizardControlClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {options.map((option) => (
                    <SelectItem key={option} value={option}>
                      {t(`fitBadge.${option === "person" ? "character" : option}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          {kind === "product" && chosenKind !== "service" ? (
            <div className="space-y-1.5">
              <Label htmlFor={`library-create-price-${kind}`}>{t("productPrice")}</Label>
              <Input
                id={`library-create-price-${kind}`}
                className={wizardControlClass}
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                placeholder={t("productPricePlaceholder")}
                autoComplete="off"
              />
            </div>
          ) : null}
          {kind !== "location" ? (
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor={`library-create-description-${kind}`}>{t("productDescription")}</Label>
              <Textarea
                id={`library-create-description-${kind}`}
                className="min-h-24 resize-y border-border bg-background text-base shadow-none focus-visible:ring-2 focus-visible:ring-pine/25"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
          ) : null}
          <div className="space-y-2 sm:col-span-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file && files.length < 8) {
                  setFiles((current) => [...current, { key: crypto.randomUUID(), file, url: URL.createObjectURL(file) }]);
                }
                event.target.value = "";
              }}
            />
            <div className="flex flex-wrap gap-2">
              {files.map((staged) => (
                <LibraryPhoto key={staged.key} src={staged.url} emptyLabel={t("libraryNoPhoto")} className="size-16 rounded-md" />
              ))}
              {files.length === 0 ? <LibraryPhoto emptyLabel={t("libraryNoPhoto")} className="size-16 rounded-md" /> : null}
            </div>
            <Button type="button" variant="outline" className="min-h-11" disabled={files.length >= 8} onClick={() => fileRef.current?.click()}>
              <ImagePlus aria-hidden />
              {t("libraryAddPhoto")}
            </Button>
          </div>
          <Button type="button" className="min-h-11 sm:col-span-2 sm:w-fit" disabled={!name.trim() || create.isPending} onClick={() => create.mutate()}>
            {t("libraryCreateUse")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function SelectedItem({
  brandId,
  item,
  onItem,
  showCopy = false,
  product,
  onProduct,
}: {
  brandId: string;
  item: BrandItem;
  onItem: (item: BrandItem) => void;
  showCopy?: boolean;
  product?: WizardProduct;
  onProduct?: (next: WizardProduct) => void;
}) {
  const t = useTranslations("wizard");
  const errors = useTranslations("errors");
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const images = orderedItemImages(item).slice(0, 3);
  const upload = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      return apiUpload<{ item: BrandItem }>(`/v1/brands/${brandId}/items/${item.id}/images`, form);
    },
    onSuccess: (result) => {
      queryClient.setQueryData<{ items: BrandItem[] }>(["brand-items", brandId], (current) => ({
        items: (current?.items ?? []).map((row) => (row.id === result.item.id ? result.item : row)),
      }));
      onItem(result.item);
    },
    onError: (error) => {
      const code = error instanceof ApiError ? error.code : "internal_error";
      appToast.error(errors(code === "invalid_input" || code === "not_found" ? code : "internal_error"), "library");
    },
  });

  return (
    <div className="space-y-3 border-t border-border pt-3">
      {images.length > 0 ? (
        <p className={wizardHintClass}>{t("libraryUsing", { count: images.length })}</p>
      ) : (
        <p className={wizardHintClass}>{t("libraryItemEmpty")}</p>
      )}
      <div className="flex flex-wrap gap-2">
        {images.length > 0 ? (
          images.map((image) => (
            <LibraryPhoto key={image.id} src={image.url} emptyLabel={t("libraryNoPhoto")} className="size-16 rounded-md" />
          ))
        ) : (
          <LibraryPhoto emptyLabel={t("libraryNoPhoto")} className="size-16 rounded-md" />
        )}
      </div>
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
      {(item.images?.length ?? 0) < 8 ? (
        <Button type="button" variant="outline" className="min-h-11" disabled={upload.isPending} onClick={() => fileRef.current?.click()}>
          <ImagePlus aria-hidden />
          {upload.isPending ? t("loading") : t("libraryAddPhoto")}
        </Button>
      ) : null}
      {showCopy && product && onProduct ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <p className={`${wizardHintClass} sm:col-span-2`}>{t("libraryPostCopy")}</p>
          <div className={product && item.category === "service" ? "space-y-1.5 sm:col-span-2" : "space-y-1.5"}>
            <Label htmlFor="wizard-product-name">{item.category === "service" ? t("serviceName") : t("productName")}</Label>
            <Input
              id="wizard-product-name"
              className={wizardControlClass}
              value={product.name}
              onChange={(event) => onProduct({ ...product, name: event.target.value })}
              autoComplete="off"
            />
          </div>
          {item.category === "service" ? null : (
            <div className="space-y-1.5">
              <Label htmlFor="wizard-product-price">{t("productPrice")}</Label>
              <Input
                id="wizard-product-price"
                className={wizardControlClass}
                value={product.price}
                onChange={(event) => onProduct({ ...product, price: event.target.value })}
                placeholder={t("productPricePlaceholder")}
                autoComplete="off"
              />
            </div>
          )}
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="wizard-product-description">{t("productDescription")}</Label>
            <Textarea
              id="wizard-product-description"
              className="min-h-28 resize-y border-border bg-background text-base shadow-none focus-visible:ring-2 focus-visible:ring-pine/25"
              value={product.description}
              onChange={(event) => onProduct({ ...product, description: event.target.value })}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function LibraryChoice({
  label,
  image,
  emptyLabel,
  active,
  onClick,
}: {
  label: string;
  image?: string;
  emptyLabel?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "flex w-28 shrink-0 flex-col overflow-hidden rounded-lg border text-left",
        active ? "border-pine bg-wizard-selected" : "border-border bg-card",
      )}
      onClick={onClick}
    >
      {emptyLabel ? (
        <LibraryPhoto src={image} emptyLabel={emptyLabel} className="h-20 w-full" />
      ) : (
        <span className="block h-20 w-full bg-muted" />
      )}
      <span className="line-clamp-2 min-h-11 px-2 py-2 text-xs font-medium leading-snug">{label}</span>
    </button>
  );
}
