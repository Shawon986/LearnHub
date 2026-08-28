"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, GraduationCap, Plus, Sparkles, Trash2, User } from "lucide-react";
import { Tabs } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/modal";
import {
  deleteEducation,
  deleteExperience,
  deleteSkill,
  updateTeacherProfile,
  upsertEducation,
  upsertExperience,
  upsertSkill,
} from "@/lib/actions/teacher";

interface EditorData {
  name: string;
  email: string;
  headline: string;
  about: string;
  hourlyRate: number;
  yearsExperience: number;
  languages: string[];
  location: string;
  skills: { id: string; name: string; proficiency: string }[];
  education: {
    id: string;
    institution: string;
    degree: string;
    fieldOfStudy: string;
    startYear: number;
    endYear: number | null;
  }[];
  experience: {
    id: string;
    title: string;
    company: string;
    startDate: string;
    endDate: string;
    current: boolean;
  }[];
}

export function TeacherProfileEditor({ initial }: { initial: EditorData }) {
  const [tab, setTab] = useState("info");

  return (
    <>
      <Tabs
        value={tab}
        onChange={setTab}
        variant="segmented"
        tabs={[
          { value: "info", label: "Info", icon: <User /> },
          { value: "skills", label: "Skills", icon: <Sparkles />, count: initial.skills.length },
          { value: "education", label: "Education", icon: <GraduationCap />, count: initial.education.length },
          { value: "experience", label: "Experience", icon: <Briefcase />, count: initial.experience.length },
        ]}
      />

      {tab === "info" && <InfoForm initial={initial} />}
      {tab === "skills" && <SkillsSection initial={initial.skills} />}
      {tab === "education" && <EducationSection initial={initial.education} />}
      {tab === "experience" && <ExperienceSection initial={initial.experience} />}
    </>
  );
}

function run(
  startTransition: ReturnType<typeof useTransition>[1],
  action: () => Promise<{ ok: boolean; error?: string }>,
  onOk: () => void,
  setError: (e: string | null) => void,
) {
  setError(null);
  startTransition(async () => {
    const result = await action();
    if (result.ok) onOk();
    else setError(result.error ?? "Something went wrong.");
  });
}

/* ---------------- Info ---------------- */

function InfoForm({ initial }: { initial: EditorData }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    run(
      startTransition,
      () =>
        updateTeacherProfile({
          headline: String(form.get("headline") ?? ""),
          about: String(form.get("about") ?? ""),
          hourlyRate: Number(form.get("hourlyRate")),
          yearsExperience: Number(form.get("yearsExperience")),
          languages: String(form.get("languages") ?? "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          location: String(form.get("location") ?? ""),
        }),
      () => {
        toast({ title: "Profile updated", variant: "success" });
        router.refresh();
      },
      setError,
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-4 w-4 text-brand-fg" /> Public information
        </CardTitle>
        <CardDescription>
          Signed in as {initial.email} · students see {initial.name}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <Input label="Headline" name="headline" defaultValue={initial.headline} placeholder="e.g. Full-Stack Developer & Mentor · 8 years in the industry" />
          <Textarea label="About" name="about" defaultValue={initial.about} rows={5} placeholder="Your teaching philosophy, experience, what makes your sessions different…" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Hourly rate (৳)" name="hourlyRate" type="number" min={0} defaultValue={initial.hourlyRate} hint="For 1-on-1 tutoring sessions." />
            <Input label="Years of experience" name="yearsExperience" type="number" min={0} defaultValue={initial.yearsExperience} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Languages" name="languages" defaultValue={initial.languages.join(", ")} placeholder="English, বাংলা" hint="Comma-separated." />
            <Input label="Location" name="location" defaultValue={initial.location} placeholder="Dhaka, Bangladesh" />
          </div>
          {error && (
            <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-xs font-semibold text-danger">
              {error}
            </p>
          )}
          <div className="flex justify-end">
            <Button type="submit" loading={pending}>Save changes</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

/* ---------------- Skills ---------------- */

function SkillsSection({ initial }: { initial: EditorData["skills"] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const router = useRouter();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    run(
      startTransition,
      () => upsertSkill({ name: String(form.get("name")), proficiency: String(form.get("proficiency")) }),
      () => {
        setOpen(false);
        router.refresh();
      },
      setError,
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand-fg" /> Skills
          </span>
          <Button size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={() => setOpen(true)}>
            Add skill
          </Button>
        </CardTitle>
        <CardDescription>Skills appear as chips on your public profile and power search.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {initial.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line p-5 text-center text-[13px] text-faint-fg">
            No skills yet — add your first one.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {initial.map((s) => (
              <li key={s.id}>
                <Badge variant="brand" size="md">
                  {s.name}
                  <span className="text-[10px] font-bold uppercase opacity-70">· {s.proficiency}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${s.name}`}
                    onClick={() =>
                      startTransition(async () => {
                        await deleteSkill(s.id);
                        router.refresh();
                      })
                    }
                    className="ml-1 rounded-full p-0.5 hover:bg-brand-soft"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </Badge>
              </li>
            ))}
          </ul>
        )}

        <Modal open={open} onClose={() => setOpen(false)} title="Add a skill">
          <form onSubmit={onSubmit} className="space-y-4">
            <Input label="Skill" name="name" placeholder="e.g. React" required />
            <Select
              label="Proficiency"
              name="proficiency"
              defaultValue="INTERMEDIATE"
              options={["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"].map((v) => ({ value: v, label: v.charAt(0) + v.slice(1).toLowerCase() }))}
            />
            {error && (
              <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-xs font-semibold text-danger">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" loading={pending}>Add skill</Button>
            </div>
          </form>
        </Modal>
      </CardContent>
    </Card>
  );
}

/* ---------------- Education ---------------- */

function EducationSection({ initial }: { initial: EditorData["education"] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const router = useRouter();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    run(
      startTransition,
      () =>
        upsertEducation({
          institution: String(form.get("institution")),
          degree: String(form.get("degree")),
          fieldOfStudy: String(form.get("fieldOfStudy") ?? ""),
          startYear: Number(form.get("startYear")),
          endYear: form.get("endYear") ? Number(form.get("endYear")) : null,
        }),
      () => {
        setOpen(false);
        router.refresh();
      },
      setError,
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-brand-fg" /> Education
          </span>
          <Button size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={() => setOpen(true)}>
            Add education
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {initial.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line p-5 text-center text-[13px] text-faint-fg">
            Add your degrees — they build student trust.
          </p>
        ) : (
          <ul className="space-y-3">
            {initial.map((ed) => (
              <li key={ed.id} className="flex items-start gap-3 rounded-xl border border-line p-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-fg">
                  <GraduationCap className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-foreground">
                    {ed.degree} · {ed.institution}
                  </p>
                  <p className="text-[12px] text-muted-fg">
                    {ed.fieldOfStudy && `${ed.fieldOfStudy} · `}
                    {ed.startYear}–{ed.endYear ?? "Present"}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Remove education entry"
                  onClick={() =>
                    startTransition(async () => {
                      await deleteEducation(ed.id);
                      router.refresh();
                    })
                  }
                >
                  <Trash2 className="h-4 w-4 text-faint-fg hover:text-danger" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <Modal open={open} onClose={() => setOpen(false)} title="Add education">
          <form onSubmit={onSubmit} className="space-y-4">
            <Input label="Institution" name="institution" placeholder="e.g. BUET" required />
            <Input label="Degree" name="degree" placeholder="e.g. B.Sc. in Computer Science" required />
            <Input label="Field of study" name="fieldOfStudy" placeholder="e.g. Computer Science" />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Start year" name="startYear" type="number" defaultValue={2015} min={1950} max={2030} required />
              <Input label="End year" name="endYear" type="number" min={1950} max={2030} hint="Leave empty if ongoing." />
            </div>
            {error && (
              <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-xs font-semibold text-danger">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" loading={pending}>Add education</Button>
            </div>
          </form>
        </Modal>
      </CardContent>
    </Card>
  );
}

/* ---------------- Experience ---------------- */

function ExperienceSection({ initial }: { initial: EditorData["experience"] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const router = useRouter();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const current = form.get("current") === "on";
    run(
      startTransition,
      () =>
        upsertExperience({
          title: String(form.get("title")),
          company: String(form.get("company")),
          startDate: `${String(form.get("startDate"))}T00:00:00`,
          endDate: current ? null : form.get("endDate") ? `${String(form.get("endDate"))}T00:00:00` : null,
          current,
        }),
      () => {
        setOpen(false);
        router.refresh();
      },
      setError,
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-brand-fg" /> Experience
          </span>
          <Button size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={() => setOpen(true)}>
            Add experience
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {initial.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line p-5 text-center text-[13px] text-faint-fg">
            Share your industry experience — it sets you apart.
          </p>
        ) : (
          <ul className="space-y-3">
            {initial.map((ex) => (
              <li key={ex.id} className="flex items-start gap-3 rounded-xl border border-line p-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                  <Briefcase className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-foreground">{ex.title}</p>
                  <p className="text-[12px] text-muted-fg">
                    {ex.company} · {ex.startDate}–{ex.current ? "Present" : ex.endDate || "—"}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Remove experience entry"
                  onClick={() =>
                    startTransition(async () => {
                      await deleteExperience(ex.id);
                      router.refresh();
                    })
                  }
                >
                  <Trash2 className="h-4 w-4 text-faint-fg hover:text-danger" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <Modal open={open} onClose={() => setOpen(false)} title="Add experience">
          <form onSubmit={onSubmit} className="space-y-4">
            <Input label="Job title" name="title" placeholder="e.g. Senior Software Engineer" required />
            <Input label="Company" name="company" placeholder="e.g. Brain Station 23" required />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Start date" name="startDate" type="date" required />
              <Input label="End date" name="endDate" type="date" />
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] font-semibold text-muted-fg">
              <input type="checkbox" name="current" className="h-4 w-4 rounded border-line accent-[var(--brand)]" />
              I currently work here
            </label>
            {error && (
              <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-xs font-semibold text-danger">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" loading={pending}>Add experience</Button>
            </div>
          </form>
        </Modal>
      </CardContent>
    </Card>
  );
}
