import type { MetadataRoute } from "next";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://l2impure.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const page = (
    path: string,
    priority: number,
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] = "weekly",
  ) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  });

  return [
    page("/", 1.0, "daily"),
    page("/hibridos", 0.9),
    page("/download", 0.8),
    page("/roadmap", 0.8),
    page("/faq", 0.7),
    page("/sobre", 0.6),
    page("/regras", 0.6),
    page("/register", 0.6, "monthly"),
    page("/login", 0.3, "monthly"),
    page("/termos", 0.2, "yearly"),
    page("/privacidade", 0.2, "yearly"),
  ];
}
