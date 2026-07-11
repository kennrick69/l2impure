import type { MetadataRoute } from "next";

/**
 * PWA manifest — servido em /manifest.webmanifest e linkado
 * automaticamente pelo Next no <head>. Ícones vêm das file
 * conventions do App Router (src/app/icon.png etc).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "L2 Impure – Lineage 2 Interlude x10",
    short_name: "L2 Impure",
    description:
      "O único servidor de Lineage 2 do mundo onde você funde 2 classes em 1 personagem. Interlude x10 brasileiro, sem pay-to-win.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0f",
    theme_color: "#0a0a0f",
    icons: [
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
