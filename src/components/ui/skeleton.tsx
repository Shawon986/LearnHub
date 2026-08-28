import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse-soft rounded-lg bg-card-2",
        className,
      )}
      aria-hidden
    />
  );
}

/* ---- Composite skeletons for real content shapes -------------- */

export function CourseCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-card shadow-soft">
      <Skeleton className="h-40 w-full rounded-none" />
      <div className="space-y-3 p-4">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <div className="flex items-center justify-between pt-1">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function TeacherCardSkeleton() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-line bg-card p-6 shadow-soft">
      <Skeleton className="h-16 w-16 rounded-full" />
      <div className="w-full space-y-2.5 text-center">
        <Skeleton className="mx-auto h-4 w-2/3" />
        <Skeleton className="mx-auto h-3 w-1/2" />
      </div>
      <div className="flex w-full justify-center gap-2">
        <Skeleton className="h-6 w-14 rounded-full" />
        <Skeleton className="h-6 w-14 rounded-full" />
      </div>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-line bg-card p-5 shadow-soft">
      <Skeleton className="h-11 w-11 rounded-xl" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-6 w-16" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-3 rounded-2xl border border-line bg-card p-5 shadow-soft">
      <Skeleton className="h-8 w-full rounded-lg" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full rounded-lg" />
      ))}
    </div>
  );
}

export function VideoPlayerSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="aspect-video w-full rounded-2xl" />
      <div className="space-y-3">
        <Skeleton className="h-5 w-2/3" />
        <div className="flex gap-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="rounded-2xl border border-line bg-card p-6 shadow-soft">
      <div className="flex items-center gap-4">
        <Skeleton className="h-20 w-20 rounded-full" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        </div>
      </div>
      <Skeleton className="mt-6 h-3 w-full" />
      <Skeleton className="mt-2 h-3 w-5/6" />
    </div>
  );
}

export function MessageListSkeleton() {
  return (
    <div className="space-y-4 p-5">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className={cn("flex gap-3", i % 2 === 1 && "flex-row-reverse")}>
          <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
          <Skeleton className={cn("h-14 w-2/5 rounded-2xl", i % 2 === 1 && "w-1/3")} />
        </div>
      ))}
    </div>
  );
}
