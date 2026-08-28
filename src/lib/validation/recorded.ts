import { z } from "zod";

export const recordedClassSchema = z.object({
  title: z.string().trim().min(4, "Title must be at least 4 characters.").max(160),
  description: z.string().trim().max(3000).optional().nullable(),
  courseId: z.string().min(1).optional().nullable(),
  moduleId: z.string().min(1).optional().nullable(),
  lessonId: z.string().min(1).optional().nullable(),
  videoId: z.string().min(1, "A video file is required."),
  thumbnailPath: z.string().max(300).optional().nullable(),
  language: z.string().trim().min(2).max(40).default("English"),
  tags: z.string().max(500).optional().nullable(),
  durationSeconds: z.coerce.number().int().min(0).max(60 * 60 * 12).default(0),
  resources: z
    .array(
      z.object({
        title: z.string().trim().min(2).max(120),
        type: z.string().trim().min(2).max(10),
        path: z.string().min(1).max(300),
      }),
    )
    .max(20)
    .default([]),
});

export const recordedClassUpdateSchema = recordedClassSchema.partial({
  videoId: true,
});

export type RecordedClassInput = z.infer<typeof recordedClassSchema>;
