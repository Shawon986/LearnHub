import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Heart, Trash2 } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { ActionButton } from "@/components/action-button";
import { removeWishlistItem } from "@/lib/actions/student";
import { formatBDT } from "@/lib/format";
import { gradientFor } from "@/lib/utils";

export const metadata: Metadata = { title: "Wishlist" };

export default async function WishlistPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard/wishlist");

  const items = await db.wishlistItem.findMany({
    where: { userId: user.id },
    include: {
      course: { include: { teacher: true, category: true } },
      teacher: { include: { teacherProfile: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const courseItems = items.filter((i) => i.type === "COURSE");
  const teacherItems = items.filter((i) => i.type === "TEACHER");

  if (items.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-xl font-extrabold text-foreground">Wishlist</h1>
          <p className="mt-1 text-sm text-muted-fg">Save courses and teachers you want to come back to.</p>
        </div>
        <EmptyState
          icon={<Heart />}
          title="Your wishlist is empty"
          description="Courses and teachers you save will appear here — with price-drop alerts."
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-xl font-extrabold text-foreground">Wishlist</h1>
        <p className="mt-1 text-sm text-muted-fg">
          {items.length} item{items.length === 1 ? "" : "s"} saved.
        </p>
      </div>

      {courseItems.length > 0 && (
        <section aria-labelledby="wish-courses">
          <h2 id="wish-courses" className="mb-4 font-display text-base font-bold text-foreground">
            Courses
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {courseItems.map((item) => {
              const c = item.course!;
              return (
                <Card key={item.id} className="flex items-center gap-4 overflow-hidden">
                  <div
                    className={`flex h-full min-h-24 w-24 shrink-0 items-center justify-center bg-gradient-to-br ${gradientFor(c.title)}`}
                  >
                    <Heart className="h-5 w-5 fill-white/80 text-white/80" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1 py-3 pr-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-faint-fg">
                      {c.category.name}
                    </p>
                    <h3 className="line-clamp-2 text-[13px] font-bold text-foreground">{c.title}</h3>
                    <p className="mt-0.5 text-[11px] text-muted-fg">{c.teacher.name}</p>
                    <p className="mt-1 font-display text-[13px] font-extrabold text-foreground">
                      {c.price === 0 ? "Free" : formatBDT(c.price)}
                    </p>
                  </div>
                  <ActionButton
                    variant="ghost"
                    size="icon"
                    className="mr-3 text-faint-fg hover:text-danger"
                    aria-label={`Remove ${c.title} from wishlist`}
                    action={removeWishlistItem.bind(null, item.id)}
                    confirm="Remove from wishlist?"
                  >
                    <Trash2 className="h-4 w-4" />
                  </ActionButton>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {teacherItems.length > 0 && (
        <section aria-labelledby="wish-teachers">
          <h2 id="wish-teachers" className="mb-4 font-display text-base font-bold text-foreground">
            Teachers
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {teacherItems.map((item) => {
              const t = item.teacher!;
              return (
                <Card key={item.id} className="flex items-center gap-4 p-4">
                  <Avatar name={t.name} src={t.avatarUrl} size="md" />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[13px] font-bold text-foreground">{t.name}</h3>
                    <p className="line-clamp-1 text-[11px] text-muted-fg">
                      {t.teacherProfile?.headline ?? "Teacher"}
                    </p>
                    <p className="mt-0.5 text-[11px] font-bold text-accent">
                      {t.teacherProfile && t.teacherProfile.hourlyRate > 0
                        ? `${formatBDT(t.teacherProfile.hourlyRate)}/hr`
                        : "Contact for rate"}
                    </p>
                  </div>
                  <ActionButton
                    variant="ghost"
                    size="icon"
                    className="text-faint-fg hover:text-danger"
                    aria-label={`Remove ${t.name} from wishlist`}
                    action={removeWishlistItem.bind(null, item.id)}
                    confirm="Remove from wishlist?"
                  >
                    <Trash2 className="h-4 w-4" />
                  </ActionButton>
                </Card>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
