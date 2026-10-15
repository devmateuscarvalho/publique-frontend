import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { PrivacyPolicy } from "@/components/marketing/privacy-policy";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("privacy.meta");
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default function PrivacyPage() {
  return <PrivacyPolicy />;
}
