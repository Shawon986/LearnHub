import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(80),
  phone: z.string().trim().max(20).optional().nullable(),
  bio: z.string().trim().max(500).optional().nullable(),
  headline: z.string().trim().max(160).optional().nullable(),
  interests: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required."),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .max(72)
      .regex(/[a-zA-Z]/, "Password must contain a letter.")
      .regex(/[0-9]/, "Password must contain a number."),
  });

export const teacherProfileSchema = z.object({
  headline: z.string().trim().max(160).optional().nullable(),
  about: z.string().trim().max(3000).optional().nullable(),
  hourlyRate: z.coerce.number().int().min(0).max(100_000),
  yearsExperience: z.coerce.number().int().min(0).max(60),
  languages: z.array(z.string().trim().min(1).max(40)).max(10),
  location: z.string().trim().max(120).optional().nullable(),
});

export const skillSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Skill name required.").max(40),
  proficiency: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]).default("INTERMEDIATE"),
});

export const educationSchema = z.object({
  id: z.string().optional(),
  institution: z.string().trim().min(2).max(120),
  degree: z.string().trim().min(2).max(120),
  fieldOfStudy: z.string().trim().max(120).optional().nullable(),
  startYear: z.coerce.number().int().min(1950).max(new Date().getFullYear()),
  endYear: z.coerce.number().int().min(1950).max(new Date().getFullYear() + 10).optional().nullable(),
  description: z.string().trim().max(500).optional().nullable(),
});

export const experienceSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(2).max(120),
  company: z.string().trim().min(2).max(120),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional().nullable(),
  current: z.coerce.boolean().default(false),
  description: z.string().trim().max(500).optional().nullable(),
});

export const liveClassSchema = z
  .object({
    title: z.string().trim().min(3, "Title required.").max(140),
    description: z.string().trim().max(2000).optional().nullable(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date."),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, "Pick a start time."),
    durationMinutes: z.coerce.number().int().min(15).max(600),
    maxStudents: z.coerce.number().int().min(1).max(500),
    meetingUrl: z.string().trim().url("Enter a valid meeting link (https://…).").max(500),
  });

export const availabilitySlotSchema = z.object({
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
});

export const bookingResponseSchema = z.object({
  bookingId: z.string().min(1),
  action: z.enum(["ACCEPT", "DECLINE", "CANCEL"]),
});

export const withdrawalSchema = z.object({
  amount: z.coerce.number().int().min(1),
  method: z.enum(["BKASH", "NAGAD", "ROCKET", "BANK"]),
  accountDetails: z
    .object({
      accountNumber: z.string().trim().min(6).max(40),
      accountHolder: z.string().trim().min(2).max(80),
      note: z.string().trim().max(200).optional(),
    }),
});

export const createCourseSchema = z.object({
  title: z.string().trim().min(4, "Title must be at least 4 characters.").max(140),
  subtitle: z.string().trim().max(200).optional().nullable(),
  categoryId: z.string().min(1, "Pick a category."),
  type: z.enum(["RECORDED", "LIVE", "HYBRID", "ONE_ON_ONE"]),
  difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "ALL_LEVELS"]),
  price: z.coerce.number().int().min(0).max(500_000),
  language: z.string().trim().min(2).max(40),
});
