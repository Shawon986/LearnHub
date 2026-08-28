import { PhasePlaceholder } from "@/components/phase-placeholder";

export default async function AdminCatchAllPage({
  params,
}: {
  params: Promise<{ rest: string[] }>;
}) {
  const { rest } = await params;
  const label = rest
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
  return <PhasePlaceholder title={label} phase="Phase 3–12" />;
}
