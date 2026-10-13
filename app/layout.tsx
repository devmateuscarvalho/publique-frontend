import type { Metadata } from "next";
import { Geist, Inter, Oswald } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";

import { themeBootScript } from "@/lib/theme";

import { Providers } from "./providers";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const oswald = Oswald({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketing.meta");
  const locale = await getLocale();

  return {
    title: {
      default: t("title"),
      template: "%s · Publique",
    },
    description: t("description"),
    applicationName: "Publique",
    openGraph: {
      title: t("title"),
      description: t("description"),
      siteName: "Publique",
      locale: locale === "en" ? "en_US" : "pt_BR",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
    },
    icons: {
      icon: [{ url: "/app-icon.svg", type: "image/svg+xml" }],
    },
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`${geist.variable} ${oswald.variable} ${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full font-sans text-ink">
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
        <NextIntlClientProvider messages={messages}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
