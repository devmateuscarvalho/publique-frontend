import { api } from "@/lib/api";

export function startSocialOAuth(
  brandID: string,
  network: "linkedin" | "instagram" | "facebook" | "tiktok",
  returnTo: string,
) {
  const qs = new URLSearchParams();
  if (returnTo) {
    qs.set("return_to", returnTo);
  }
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return api<{ authorize_url: string }>(
    `/v1/brands/${brandID}/integrations/${network}/connect${suffix}`,
  ).then((data) => {
    window.location.href = data.authorize_url;
  });
}

export function startLinkedInOAuth(brandID: string, returnTo: string) {
  return startSocialOAuth(brandID, "linkedin", returnTo);
}
