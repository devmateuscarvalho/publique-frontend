import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

const locales = ["pt-BR", "en"] as const;

function isLocale(value: string | undefined): value is (typeof locales)[number] {
  return value === "pt-BR" || value === "en";
}

export default getRequestConfig(async () => {
  const store = await cookies();
  const requested = store.get("locale")?.value;
  const locale = isLocale(requested) ? requested : "pt-BR";

  return {
    locale,
    messages: (await import(`./${locale}/common.json`)).default,
  };
});
