import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Tags } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { CategoryFormModal } from "./category-form-modal";

export const metadata: Metadata = { title: "Categories" };

export default async function CategoriesPage() {
  const actor = await getCurrentUser();
  if (!actor) redirect("/login?next=/admin/categories");

  const [categories, counts] = await Promise.all([
    db.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    db.course.groupBy({ by: ["categoryId"], _count: true }),
  ]);

  const countByCat = new Map(counts.map((c) => [c.categoryId, c._count]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-extrabold text-foreground">Categories</h1>
          <p className="mt-1 text-sm text-muted-fg">
            {categories.length} categories · featured ones appear on the landing page.
          </p>
        </div>
        <CategoryFormModal />
      </div>

      {categories.length === 0 ? (
        <EmptyState icon={<Tags />} title="No categories yet" description="Create your first category." />
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-line">
            {categories.map((c) => (
              <li key={c.id} className="flex items-center gap-4 px-5 py-4">
                {c.color && (
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm"
                    style={{ backgroundColor: `${c.color}1c`, color: c.color }}
                    aria-hidden
                  >
                    ●
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-[14px] font-bold text-foreground">{c.name}</h2>
                    {c.isFeatured && <Badge variant="brand" size="sm">Featured</Badge>}
                  </div>
                  <p className="text-[11px] text-faint-fg">
                    /{c.slug} · {countByCat.get(c.id) ?? 0} courses · sort {c.sortOrder}
                  </p>
                </div>
                <CategoryFormModal
                  triggerLabel="Edit"
                  initial={{
                    id: c.id,
                    name: c.name,
                    description: c.description ?? "",
                    icon: c.icon ?? "",
                    color: c.color ?? "",
                    isFeatured: c.isFeatured,
                    sortOrder: c.sortOrder,
                  }}
                />
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
