import { z } from "zod";
import { COURSE_TYPES, DIFFICULTIES, LESSON_TYPES } from "@/lib/constants";

export const courseUpdateSchema = z.object({
  title: z.string().trim().min(4).max(140),
  subtitle: z.string().trim().max(200).optional().nullable(),
  description: z.string().trim().max(5000).optional().nullable(),
  categoryId: z.string().min(1),
  type: z.enum(COURSE_TYPES),
  difficulty: z.enum(DIFFICULTIES),
  price: z.coerce.number().int().min(0).max(500_000),
  compareAtPrice: z.coerce.number().int().min(0).max(500_000).optional().nullable(),
  language: z.string().trim().min(2).max(40),
  requirements: z.string().max(2000).optional().nullable(),
  outcomes: z.string().max(3000).optional().nullable(),
  tags: z.string().max(500).optional().nullable(),
});

export const moduleSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(2, "Module title required.").max(140),
  description: z.string().trim().max(500).optional().nullable(),
});

export const lessonSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(2, "Lesson title required.").max(140),
  description: z.string().trim().max(1000).optional().nullable(),
  type: z.enum(LESSON_TYPES),
  durationMinutes: z.coerce.number().int().min(0).max(1000).default(0),
  isPreview: z.coerce.boolean().default(false),
  articleContent: z.string().max(20_000).optional().nullable(),
});

export const quizSchema = z.object({
  title: z.string().trim().min(2).max(140),
  passingScore: z.coerce.number().int().min(0).max(100).default(50),
  timeLimitMinutes: z.coerce.number().int().min(1).max(300).optional().nullable(),
});

export const questionSchema = z.object({
  id: z.string().optional(),
  text: z.string().trim().min(2).max(500),
  options: z.array(z.string().trim().min(1).max(200)).min(2).max(6),
  correctIndex: z.coerce.number().int().min(0).max(5),
  points: z.coerce.number().int().min(1).max(100).default(1),
  explanation: z.string().trim().max(500).optional().nullable(),
});

export const quizAnswersSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string().min(1),
      selectedIndex: z.coerce.number().int().min(0).max(5),
    }),
  ),
});

export const assignmentSchema = z.object({
  title: z.string().trim().min(2).max(140),
  description: z.string().trim().max(2000).optional().nullable(),
  dueDate: z.string().optional().nullable(),
  maxScore: z.coerce.number().int().min(1).max(1000).default(100),
});

export const assignmentSubmissionSchema = z.object({
  content: z.string().trim().min(10, "Submission is too short (min 10 characters).").max(10_000),
});

export const gradeSubmissionSchema = z.object({
  score: z.coerce.number().int().min(0).max(1000),
  feedback: z.string().trim().max(1000).optional().nullable(),
});

export const courseReviewDecisionSchema = z.object({
  decision: z.enum(["APPROVE", "REJECT"]),
  reason: z.string().trim().max(500).optional().nullable(),
});

/** Comma/line separated list → trimmed string array. */
export function splitList(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 30);
}
