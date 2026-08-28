import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/teacher", "/admin", "/checkout", "/messages", "/api", "/classroom"],
      },
    ],
    sitemap: `${env.APP_URL}/sitemap.xml`,
  };
}
