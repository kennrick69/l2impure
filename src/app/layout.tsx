import type { Metadata } from "next";
import { Oswald, Open_Sans } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const oswald = Oswald({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-oswald",
  display: "swap",
});

const openSans = Open_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-open-sans",
  display: "swap",
});

const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
const RECAPTCHA_DISABLED =
  process.env.NEXT_PUBLIC_RECAPTCHA_DISABLED === "true";
const RECAPTCHA_ENTERPRISE =
  process.env.NEXT_PUBLIC_RECAPTCHA_ENTERPRISE === "true";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://l2impure.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "L2 Impure – Lineage 2 Interlude x10 com Sistema de Híbridos",
    template: "%s | L2 Impure",
  },
  description:
    "O único servidor de Lineage 2 do mundo onde você funde 2 classes em 1 personagem. Interlude x10 brasileiro com Auto-Farm justo, Olympiad Dupla e zero pay-to-win. Launch em outubro de 2026.",
  keywords: [
    "Lineage 2",
    "L2",
    "servidor privado",
    "Interlude",
    "x10",
    "mid rate",
    "servidor brasileiro",
    "sistema de híbridos",
    "L2 Impure",
  ],
  alternates: { canonical: "/" },
  // Ícones via file conventions do App Router:
  // src/app/{favicon.ico,icon.png,apple-icon.png} + manifest.ts
  robots: { index: true, follow: true },
  openGraph: {
    title: "L2 Impure – Interlude x10 com Sistema de Híbridos",
    description:
      "Funda 2 classes em 1 personagem — único no mundo. Interlude x10 BR, Auto-Farm justo, sem pay-to-win. Launch em outubro de 2026.",
    siteName: "L2 Impure",
    locale: "pt_BR",
    type: "website",
    url: SITE_URL,
    images: [
      {
        url: "/images/og.png",
        width: 1200,
        height: 630,
        alt: "L2 Impure — Interlude x10 com Sistema de Híbridos",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "L2 Impure – Interlude x10 com Sistema de Híbridos",
    description:
      "O único L2 do mundo onde você funde 2 classes em 1 personagem. Interlude x10 BR, sem pay-to-win.",
    images: ["/images/og.png"],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#org`,
      name: "L2 Impure",
      url: SITE_URL,
      logo: `${SITE_URL}/images/logo.png`,
      email: "admin@l2impure.com",
      sameAs: ["https://discord.gg/pbGXNRuWVX"],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: "L2 Impure",
      url: SITE_URL,
      inLanguage: "pt-BR",
      publisher: { "@id": `${SITE_URL}/#org` },
    },
    {
      "@type": "VideoGame",
      name: "L2 Impure — Lineage 2 Interlude x10",
      url: SITE_URL,
      description:
        "Servidor brasileiro de Lineage 2 Interlude x10 com Sistema de Híbridos: fusão de 2 classes em 1 personagem, exclusivo mundial.",
      playMode: "MultiPlayer",
      applicationCategory: "Game",
      gamePlatform: "PC",
      inLanguage: "pt-BR",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "BRL",
        availability: "https://schema.org/PreOrder",
      },
      publisher: { "@id": `${SITE_URL}/#org` },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const recaptchaSrc = RECAPTCHA_SITE_KEY
    ? RECAPTCHA_ENTERPRISE
      ? `https://www.google.com/recaptcha/enterprise.js?render=${RECAPTCHA_SITE_KEY}`
      : `https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`
    : null;
  return (
    <html
      lang="pt-BR"
      className={`${oswald.variable} ${openSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[color:var(--l2-bg-primary)] text-white">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
        {recaptchaSrc && !RECAPTCHA_DISABLED && (
          <Script
            id="grecaptcha"
            src={recaptchaSrc}
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  );
}
