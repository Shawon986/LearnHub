"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole, requireUser } from "@/lib/auth/session";
import { getAIProvider, isDevAI } from "@/lib/ai";
import {
  COURSE_DESCRIPTION_PROMPT,
  MATCHING_PROMPT,
  OUTLINE_PROMPT,
  QUIZ_PROMPT,
  STUDY_ASSISTANT_PROMPT,
} from "@/lib/ai/prompts";
import { safeJsonParse } from "@/lib/utils";
import { z } from "zod";


/* ================= Study assistant ================= */

const assistantSchema = z.object({
  message: z.string().trim().min(2).max(1000),
  conversationId: z.string().optional().nullable(),
  context: z.string().max(4000).optional().nullable(),
});

export async function assistantSend(input: {
  message: string;
  conversationId?: string | null;
  context?: string | null;
}): Promise<
  { ok: true; conversationId: string; reply: string } | { ok: false; error: string }
> {
  try {
    const user = await requireUser();
    const data = assistantSchema.parse(input);

    let conversationId = data.conversationId;
    if (!conversationId) {
      const conversation = await db.aIConversation.create({
        data: { userId: user.id, type: "STUDY_ASSISTANT", title: data.message.slice(0, 60), provider: getAIProvider().key },
      });
      conversationId = conversation.id;
    } else {
      const owned = await db.aIConversation.findFirst({
        where: { id: conversationId, userId: user.id },
      });
      if (!owned) return { ok: false, error: "Conversation not found." };
    }

    const history = await db.aIMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: "desc" },
      take: 8,
    });

    const provider = getAIProvider();
    const result = await provider.chat(
      [
        { role: "system", content: STUDY_ASSISTANT_PROMPT },
        ...(data.context ? [{ role: "system" as const, content: `Lesson context:\n${data.context}` }] : []),
        ...[...history].reverse().map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
        { role: "user", content: data.message },
      ],
      { maxTokens: 600 },
    );

    await db.aIMessage.createMany({
      data: [
        { conversationId, role: "USER", content: data.message },
        { conversationId, role: "ASSISTANT", content: result.content },
      ],
    });

    revalidatePath("/dashboard/courses/[courseId]/learn");
    return { ok: true, conversationId, reply: result.content };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

/* ================= Teacher matching ================= */

const SKILL_KEYWORDS: Record<string, string[]> = {
  Python: ["python"],
  "Machine Learning": ["machine learning", "ml", "ai", "deep learning", "data science", "data"],
  React: ["react", "next", "next.js", "frontend", "front-end"],
  JavaScript: ["javascript", "js", "web", "website", "web development"],
  TypeScript: ["typescript", "ts"],
  "Node.js": ["node", "backend", "back-end", "api"],
  Figma: ["figma", "design", "ui", "ux", "prototype"],
  "C++": ["c++", "cpp"],
  "Data Structures": ["data structures", "dsa", "algorithm", "competitive"],
  Accounting: ["accounting", "finance", "financial", "excel"],
  "Spoken English": ["english", "speaking", "spoken", "fluency"],
  IELTS: ["ielts", "band score"],
  SQL: ["sql", "database"],
  Excel: ["excel", "spreadsheet"],
};

function skillsFromQuery(query: string): string[] {
  const lower = query.toLowerCase();
  const skills = new Set<string>();
  for (const [skill, keywords] of Object.entries(SKILL_KEYWORDS)) {
    if (keywords.some((k) => lower.includes(k))) skills.add(skill);
  }
  return [...skills];
}

export async function matchTeachers(
  query: string,
): Promise<{ ok: true; matches: TeacherMatch[] } | { ok: false; error: string }> {
  try {
    await requireUser();
    if (!query.trim() || query.trim().length < 4) {
      return { ok: false, error: "Describe what you want to learn (e.g. 'I need a Python teacher for beginners')." };
    }

    let skills = skillsFromQuery(query);
    const provider = getAIProvider();

    // With a production provider, extract skills via the LLM; keep the
    // keyword pass as the offline fallback and merge both.
    if (!isDevAI()) {
      try {
        const raw = await provider.complete(
          `${MATCHING_PROMPT}\n\nStudent request: "${query}"`,
          { json: true },
        );
        const parsed = safeJsonParse<{ skills?: string[] }>(raw, {});
        if (parsed.skills?.length) {
          skills = [...new Set([...skills, ...parsed.skills])];
        }
      } catch (e) {
        console.error("[ai] matching extraction failed, using keyword skills:", e);
      }
    }

    if (skills.length === 0) {
      return { ok: false, error: "Tell me the subject or skill (e.g. Python, design, English, IELTS…)." };
    }

    const teachers = await db.user.findMany({
      where: { role: "TEACHER", status: "ACTIVE" },
      include: {
        teacherProfile: true,
        teacherSkills: true,
        reviewTargets: { where: { status: "PUBLISHED", targetType: "TEACHER" }, select: { rating: true } },
      },
    });

    const scored = teachers.map((t) => {
      const skillNames = t.teacherSkills.map((s) => s.name);
      const matched = skills.filter((s) =>
        skillNames.some((name) => name.toLowerCase().includes(s.toLowerCase())),
      );
      const headlineAbout = `${t.teacherProfile?.headline ?? ""} ${t.teacherProfile?.about ?? ""}`.toLowerCase();
      const softMatches = skills.filter((s) => headlineAbout.includes(s.toLowerCase()));
      const avgRating = t.reviewTargets.length
        ? t.reviewTargets.reduce((sum, r) => sum + r.rating, 0) / t.reviewTargets.length
        : 0;
      const score =
        matched.length * 10 +
        softMatches.length * 4 +
        (t.teacherProfile?.verified ? 3 : 0) +
        avgRating;
      return { teacher: t, matched, softMatches, score };
    });

    const matches: TeacherMatch[] = scored
      .filter((s) => s.matched.length > 0 || s.softMatches.length > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map((s) => ({
        id: s.teacher.id,
        name: s.teacher.name,
        avatarUrl: s.teacher.avatarUrl,
        headline: s.teacher.teacherProfile?.headline ?? null,
        verified: s.teacher.teacherProfile?.verified ?? false,
        hourlyRate: s.teacher.teacherProfile?.hourlyRate ?? 0,
        avgRating: s.teacher.reviewTargets.length
          ? Math.round((s.teacher.reviewTargets.reduce((sum, r) => sum + r.rating, 0) / s.teacher.reviewTargets.length) * 10) / 10
          : 0,
        matchedSkills: s.matched,
        reason: `Matches ${[...new Set([...s.matched, ...s.softMatches])].slice(0, 3).join(", ")}`,
      }));

    if (matches.length === 0) {
      return { ok: false, error: "No teachers matched those skills yet — try a different subject." };
    }

    return { ok: true, matches };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export interface TeacherMatch {
  id: string;
  name: string;
  avatarUrl: string | null;
  headline: string | null;
  verified: boolean;
  hourlyRate: number;
  avgRating: number;
  matchedSkills: string[];
  reason: string;
}

/* ================= Course recommendations ================= */

export async function aiRecommendCourses(): Promise<
  { ok: true; recommendations: { courseId: string; slug: string; title: string; categoryName: string; reason: string }[] } | { ok: false; error: string }
> {
  try {
    const user = await requireUser();

    const [enrollments, profile] = await Promise.all([
      db.enrollment.findMany({
        where: { studentId: user.id, status: { in: ["ACTIVE", "COMPLETED"] } },
        include: { course: { select: { categoryId: true, title: true } } },
      }),
      db.studentProfile.findUnique({ where: { userId: user.id } }),
    ]);

    const enrolledCourseIds = new Set(enrollments.map((e) => e.courseId));
    const categoryCounts = new Map<string, number>();
    for (const e of enrollments) {
      categoryCounts.set(e.course.categoryId, (categoryCounts.get(e.course.categoryId) ?? 0) + 1);
    }
    const topCategory = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

    const interests = safeJsonParse<string[]>(profile?.interests, []);

    const candidates = await db.course.findMany({
      where: { status: "PUBLISHED", id: { notIn: [...enrolledCourseIds] } },
      include: { category: true },
    });

    const scored = candidates.map((c) => {
      let score = 0;
      let reason = "Popular with learners";
      if (topCategory && c.categoryId === topCategory) {
        score += 8;
        reason = `More in ${c.category.name}`;
      }
      for (const interest of interests) {
        if (
          c.title.toLowerCase().includes(interest.toLowerCase()) ||
          c.category.name.toLowerCase().includes(interest.toLowerCase())
        ) {
          score += 10;
          reason = `Because you're interested in ${interest}`;
        }
      }
      if (c.isFeatured) score += 3;
      score += Math.log10(c.enrollmentCount + 10) * 2;
      return { c, score, reason };
    });

    const recommendations = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map((s) => ({
        courseId: s.c.id,
        slug: s.c.slug,
        title: s.c.title,
        categoryName: s.c.category.name,
        reason: s.reason,
      }));

    return { ok: true, recommendations };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

/* ================= Teacher assistant (content generation) ================= */

export async function generateCourseContent(
  kind: "description" | "outline" | "quiz",
  topic: string,
): Promise<{ ok: true; content: string } | { ok: false; error: string }> {
  try {
    await requireRole("TEACHER", "ADMIN", "SUPER_ADMIN");
    if (!topic.trim() || topic.trim().length < 4) {
      return { ok: false, error: "Describe your course topic first (min 4 characters)." };
    }

    const provider = getAIProvider();

    if (isDevAI()) {
      // Deterministic templates — real, usable content without an API key.
      if (kind === "description") {
        const t = topic.trim();
        return {
          ok: true,
          content: JSON.stringify({
            subtitle: `Master ${t} from fundamentals to real-world projects`,
            description: `This course takes you from zero to confident in ${t}. You'll learn the core concepts through short, focused lessons, then apply them in hands-on projects. Every module ends with a quiz to lock in what you learned — and you'll finish with a portfolio-ready project and a certificate.`,
            outcomes: [
              `Understand the core concepts of ${t}`,
              "Apply what you learn in guided practice projects",
              "Avoid the most common beginner mistakes",
              "Build a portfolio-ready project",
              "Earn a verifiable certificate",
            ],
          }),
        };
      }
      if (kind === "outline") {
        const t = topic.trim();
        return {
          ok: true,
          content: JSON.stringify({
            modules: [
              {
                title: "Getting Started",
                lessons: [`What is ${t} and why it matters`, "Setting up your environment", "Your first working example"],
              },
              {
                title: "Core Concepts",
                lessons: ["The fundamentals, explained simply", "Common patterns and best practices", "Practice: guided exercise"],
              },
              {
                title: "Building Real Things",
                lessons: ["Project 1: from scratch", "Project 2: adding complexity", "Debugging like a pro"],
              },
              {
                title: "Going Further",
                lessons: ["Advanced techniques", "Performance and quality", "Final project briefing"],
              },
            ],
          }),
        };
      }
      const t = topic.trim();
      return {
        ok: true,
        content: JSON.stringify({
          questions: [
            { text: `Which best describes the primary purpose of ${t}?`, options: ["Automating repetitive work", "Adding visual style", "Managing memory manually", "None of these"], correctIndex: 0, explanation: `The core value of ${t} is automation and efficiency.` },
            { text: "What should you do first when learning a new tool?", options: ["Read the entire documentation", "Build a tiny working example", "Memorize every function", "Buy a course"], correctIndex: 1, explanation: "A tiny working example builds intuition fastest." },
            { text: "Which habit improves long-term retention most?", options: ["Binge-watching videos", "Spaced practice with exercises", "Copy-pasting code", "Skipping quizzes"], correctIndex: 1, explanation: "Spaced practice with active recall is the most effective." },
            { text: "What does 'debugging' mean?", options: ["Finding and fixing errors", "Deleting old code", "Writing documentation", "Designing interfaces"], correctIndex: 0, explanation: "Debugging = systematically finding and fixing defects." },
            { text: "When stuck on a problem, the best first step is:", options: ["Give up", "Break it into smaller pieces", "Rewrite everything", "Ask the internet for the full answer"], correctIndex: 1, explanation: "Decomposition is the foundation of problem solving." },
          ],
        }),
      };
    }

    const prompt =
      kind === "description"
        ? `${COURSE_DESCRIPTION_PROMPT}\n\nCourse topic: "${topic}"`
        : kind === "outline"
          ? `${OUTLINE_PROMPT}\n\nCourse topic: "${topic}"`
          : `${QUIZ_PROMPT}\n\nTopic: "${topic}"`;

    const raw = await provider.complete(prompt, { json: true });
    return { ok: true, content: raw };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}
