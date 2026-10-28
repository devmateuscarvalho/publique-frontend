export type LookFit = { category: string; subtype: string };

export type OfferingChip = "" | "physical" | "digital" | "service";

export type Offering = { category: "product" | "service" | "character"; subtype: string };

export function lookMatchesKind(fits: LookFit[] | undefined, outputKind: string): boolean {
  if (!fits?.length) {
    return true;
  }
  if (outputKind === "avatar") {
    return fits.some((fit) => fit.category === "character");
  }
  if (outputKind === "product") {
    return fits.some((fit) => fit.category === "product" || fit.category === "service");
  }
  return true;
}

export function lookMatchesFit(fits: LookFit[] | undefined, chip: OfferingChip): boolean {
  if (!chip || !fits?.length) {
    return true;
  }
  return fits.some((fit) => {
    if (chip === "service") {
      return fit.category === "service";
    }
    return fit.category === "product" && (fit.subtype === "" || fit.subtype === chip);
  });
}

export function soleFitBadge(fits: LookFit[] | undefined): "" | OfferingChip | "character" {
  if (!fits?.length) {
    return "";
  }
  const first = fits[0];
  const same = fits.every((fit) => fit.category === first.category && fit.subtype === first.subtype);
  if (!same) {
    return "";
  }
  if (first.category === "service" && first.subtype === "") {
    return "service";
  }
  if (first.category === "product" && (first.subtype === "physical" || first.subtype === "digital")) {
    return first.subtype;
  }
  if (first.category === "character" && first.subtype) {
    return "character";
  }
  return "";
}

export function knownOffering(
  fits: LookFit[] | undefined,
  chip: OfferingChip,
  item: { category: string; subtype: string } | null,
): Offering | null {
  if (item?.category === "product" || item?.category === "service" || item?.category === "character") {
    return { category: item.category, subtype: item.subtype };
  }
  if (chip === "service") {
    return { category: "service", subtype: "" };
  }
  if (chip === "physical" || chip === "digital") {
    return { category: "product", subtype: chip };
  }
  if (!fits?.length) {
    return null;
  }
  const first = fits[0];
  const same = fits.every((fit) => fit.category === first.category && fit.subtype === first.subtype);
  if (!same || (first.subtype === "" && first.category !== "service")) {
    return null;
  }
  if (first.category === "product" || first.category === "service" || first.category === "character") {
    return { category: first.category, subtype: first.subtype };
  }
  return null;
}

export function itemMatchesLook(
  fits: LookFit[] | undefined,
  outputKind: string,
  item: { category: string; subtype: string },
): boolean {
  if (item.category === "location") {
    return outputKind === "avatar" || outputKind === "product";
  }
  if (outputKind === "avatar" && item.category !== "character") {
    return false;
  }
  if (outputKind === "product" && item.category !== "product" && item.category !== "service") {
    return false;
  }
  if (outputKind !== "avatar" && outputKind !== "product") {
    return false;
  }
  if (!fits?.length) {
    return true;
  }
  return fits.some(
    (fit) =>
      fit.category === item.category &&
      (fit.subtype === "" || item.subtype === "" || fit.subtype === item.subtype),
  );
}

export function librarySaveCategory(
  outputKind: string,
  fits: LookFit[] | undefined,
  chip: OfferingChip,
): { category: string; subtype: string } {
  if (outputKind === "avatar") {
    return { category: "character", subtype: "person" };
  }
  const known = knownOffering(fits, chip, null);
  if (known && known.category !== "character") {
    return { category: known.category, subtype: known.subtype };
  }
  return { category: "product", subtype: "" };
}
