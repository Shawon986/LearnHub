"use client";

import {
  BookOpen,
  BrainCircuit,
  Briefcase,
  Code2,
  Languages,
  Megaphone,
  Music,
  Palette,
  Target,
  Terminal,
  type LucideIcon,
} from "lucide-react";
import { RevealGroup, RevealItem } from "@/components/ui/reveal";

export interface CategoryCardData {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  color: string | null;
  description: string | null;
  courseCount: number;
}

const ICONS: Record<string, LucideIcon> = {
  Code2,
  Terminal,
  BrainCircuit,
  Palette,
  Briefcase,
  Megaphone,
  Languages,
  BookOpen,
  Target,
  Music,
};

export function CategoriesSection({ categories }: { categories: CategoryCardData[] }) {
  return (
    <RevealGroup className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {categories.map((cat) => {
        const Icon = (cat.icon && ICONS[cat.icon]) || BookOpen;
        const color = cat.color ?? "#4f46e5";
        return (
          <RevealItem key={cat.id}>
            <a
              href={`/#courses`}
              className="group flex h-full flex-col gap-3 rounded-2xl border border-line bg-card p-5 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-transparent hover:shadow-lift"
            >
              <span
                className="flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110"
                style={{ backgroundColor: `${color}1c`, color }}
              >
                <Icon className="h-5 w-5" />
              </span>
              <span className="mt-auto">
                <span className="block text-[13px] font-bold leading-snug text-foreground">
                  {cat.name}
                </span>
                <span className="mt-0.5 block text-[11px] text-faint-fg">
                  {cat.courseCount} courses
                </span>
              </span>
            </a>
          </RevealItem>
        );
      })}
    </RevealGroup>
  );
}
