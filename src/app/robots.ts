import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/teacher", "/admin", "/checkout", "/messages", "/api"],
      },
    ],
    sitemap: `${env.APP_URL}/sitemap.xml`,
  };
}
