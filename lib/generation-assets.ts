import { api, type BrandItem } from "@/lib/api";
import { knownOffering, type OfferingChip } from "@/lib/look-fits";

type ProductFields = { name: string; price: string; description: string };

export function orderedItemImages(item: BrandItem | null) {
  return [...(item?.images ?? [])].sort((a, b) => {
    if (a.is_primary !== b.is_primary) {
      return a.is_primary ? -1 : 1;
    }
    return a.sort_order - b.sort_order;
  });
}

export function generationBrief(args: {
  screen: string;
  product: ProductFields;
  carouselTheme: string;
  mood: string;
  aspect: string;
  fits: { category: string; subtype: string }[] | undefined;
  chip: OfferingChip;
  item: BrandItem | null;
  place: BrandItem | null;
  characterName: string;
}) {
  const brief: Record<string, unknown> = {};
  if (args.screen === "carousel") {
    brief.theme = args.carouselTheme;
  }
  if (args.screen === "single") {
    if (args.mood) {
      brief.mood = args.mood;
    }
    brief.aspect = args.aspect;
  }
  if (args.screen === "product") {
    const offering = knownOffering(args.fits, args.chip, args.item);
    const service = offering?.category === "service";
    brief.product = {
      name: args.product.name.trim(),
      price: service ? "" : args.product.price.trim(),
      description: args.product.description.trim(),
    };
    if (args.item || offering) {
      brief.item = {
        ...(args.item ? { id: args.item.id } : {}),
        category: args.item?.category ?? offering?.category,
        subtype: args.item?.subtype ?? offering?.subtype ?? "",
        name: args.product.name.trim(),
        description: args.product.description.trim(),
      };
    }
  }
  if (args.screen === "avatar" && args.item?.category === "character") {
    brief.item = {
      id: args.item.id,
      category: args.item.category,
      subtype: args.item.subtype,
      name: args.characterName.trim() || args.item.name,
      description: args.item.description,
    };
  }
  if (args.place && (args.screen === "product" || args.screen === "avatar")) {
    brief.place = {
      id: args.place.id,
      name: args.place.name,
      description: args.place.description,
    };
  }
  return brief;
}

export function needsBrandSubject(screen: string | null, item: BrandItem | null, productName: string) {
  const photos = orderedItemImages(item).length;
  if (screen === "avatar") {
    return photos < 1;
  }
  if (screen === "product") {
    return photos < 1 || !productName.trim();
  }
  return false;
}

export async function attachModelReferences(args: {
  brandId: string;
  modelId: string;
  item: BrandItem | null;
  place: BrandItem | null;
}) {
  const people = orderedItemImages(args.item).slice(0, 3);
  for (const image of people) {
    await api(`/v1/brands/${args.brandId}/models/${args.modelId}/references/link`, {
      method: "POST",
      body: JSON.stringify({ media_id: image.media_id, role: "person" }),
    });
  }
  const placeImage = orderedItemImages(args.place)[0];
  if (placeImage) {
    await api(`/v1/brands/${args.brandId}/models/${args.modelId}/references/link`, {
      method: "POST",
      body: JSON.stringify({ media_id: placeImage.media_id, role: "location" }),
    });
  }
}
