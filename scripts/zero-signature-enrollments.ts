// One-off: signature programs launch with 0 enrollments so the
// "NEW LAUNCHED" tag shows until the first student enrolls.
import { db } from "@/lib/db";
(async () => {
  const slugs = ["ellt-ascend", "duoscore-sprint", "pte-flowstate", "speakband-9", "fluent-street"];
  const r = await db.course.updateMany({ where: { slug: { in: slugs } }, data: { enrollmentCount: 0 } });
  console.log("updated:", r.count);
  await db.$disconnect();
})();
