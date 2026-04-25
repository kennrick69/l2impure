import type { Metadata } from "next";
import { Oswald, Open_Sans } from "next/font/google";
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

export const metadata: Metadata = {
  title: "L2 Impure – Servidor Brasileiro de Lineage 2 Interlude com Sistema de Híbridos",
  description:
    "L2 Impure - O único servidor de Lineage 2 com Sistema de Híbridos. Combine 2 classes e crie personagens únicos. Interlude x10 com Auto-Farm.",
  icons: { icon: "/images/logo.png" },
  openGraph: {
    title: "L2 Impure – Interlude x10 com Sistema de Híbridos",
    description:
      "Combine 2 classes e crie personagens únicos. Auto-Farm, Olympiad Dupla, Eventos 24/7.",
    siteName: "L2 Impure",
    locale: "pt_BR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${oswald.variable} ${openSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[color:var(--l2-bg-primary)] text-white">
        {children}
      </body>
    </html>
  );
}
