import { z } from "zod";

export const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1, "Pick a star rating.").max(5),
  content: z.string().trim().min(10, "Review must be at least 10 characters.").max(1000),
});

export const reportSchema = z.object({
  reason: z.string().trim().min(5, "Tell us why you're reporting this.").max(500),
});

export const searchQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  type: z.enum(["courses", "teachers", "live"]).default("courses"),
  category: z.string().min(1).optional(),
  priceMin: z.coerce.number().int().min(0).optional(),
  priceMax: z.coerce.number().int().min(0).optional(),
  ratingMin: z.coerce.number().min(1).max(5).optional(),
  difficulty: z.string().min(1).optional(),
  language: z.string().min(1).optional(),
  sort: z.enum(["popular", "newest", "rating", "priceAsc", "priceDesc"]).default("popular"),
  page: z.coerce.number().int().min(1).default(1),
});
