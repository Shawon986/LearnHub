import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.APP_URL;

  const [courses, teachers, recordings] = await Promise.all([
    db.course.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, updatedAt: true } }),
    db.user.findMany({ where: { role: "TEACHER" }, select: { id: true, updatedAt: true } }),
    db.recordedClass.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, updatedAt: true } }),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${base}/courses`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/teachers`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/recorded-classes`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/ai`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/register`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
  ];

  return [
    ...staticRoutes,
    ...courses.map((c) => ({
      url: `${base}/courses/${c.slug}`,
      lastModified: c.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...teachers.map((t) => ({
      url: `${base}/teachers/${t.id}`,
      lastModified: t.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...recordings.map((r) => ({
      url: `${base}/recorded-classes/${r.slug}`,
      lastModified: r.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
