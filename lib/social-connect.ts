import { api } from "@/lib/api";

export function startSocialOAuth(
  organizationID: string,
  network: "linkedin" | "instagram",
  returnTo: string,
) {
  const qs = new URLSearchParams();
  if (returnTo) {
    qs.set("return_to", returnTo);
  }
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return api<{ authorize_url: string }>(
    `/v1/organizations/${organizationID}/integrations/${network}/connect${suffix}`,
  ).then((data) => {
    window.location.href = data.authorize_url;
  });
}

export function startLinkedInOAuth(organizationID: string, returnTo: string) {
  return startSocialOAuth(organizationID, "linkedin", returnTo);
}
