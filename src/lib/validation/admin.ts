import { z } from "zod";

export const adminUserActionSchema = z.object({
  userId: z.string().min(1),
  action: z.enum(["SUSPEND", "BAN", "ACTIVATE"]),
});

export const adminRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["STUDENT", "TEACHER", "ADMIN", "MODERATOR", "SUPPORT", "SUPER_ADMIN"]),
});

export const verificationReviewSchema = z.object({
  teacherId: z.string().min(1),
  decision: z.enum(["APPROVED", "REJECTED", "CHANGES_REQUESTED", "SUSPENDED"]),
  reason: z.string().trim().max(500).optional().nullable(),
});

export const categorySchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(300).optional().nullable(),
  icon: z.string().trim().max(40).optional().nullable(),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Use a hex color like #6d28d9")
    .optional()
    .nullable(),
  isFeatured: z.coerce.boolean().default(false),
  sortOrder: z.coerce.number().int().min(0).max(999),
});

export const platformSettingsSchema = z.object({
  commissionRate: z.coerce.number().min(0).max(90),
  referralReward: z.coerce.number().int().min(0),
  referralMinPurchase: z.coerce.number().int().min(0),
  withdrawalMin: z.coerce.number().int().min(0),
  withdrawalFeePercent: z.coerce.number().min(0).max(20),
  platformName: z.string().trim().min(2).max(60),
  platformTagline: z.string().trim().max(160),
  contactEmail: z.email("Enter a valid contact email."),
});

export const announcementSchema = z.object({
  title: z.string().trim().min(3).max(140),
  body: z.string().trim().min(3).max(2000),
  audience: z.enum(["ALL", "STUDENTS", "TEACHERS"]),
});
