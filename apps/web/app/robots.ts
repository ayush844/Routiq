import type { MetadataRoute } from "next";

const BASE_URL = "https://routiq.dev";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/login", "/api"],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
