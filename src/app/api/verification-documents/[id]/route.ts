import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, isAdminRole } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

// Serves teacher verification documents stored in the database.
// ADMIN-ONLY: NID/CV/certificate uploads are private by design.

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "Invalid id." }, { status: 400 });

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in." }, { status: 401 });
  if (!isAdminRole(user.role)) {
    return NextResponse.json({ error: "Access denied." }, { status: 403 });
  }

  const doc = await db.verificationDocument.findUnique({ where: { id } });
  if (!doc) return NextResponse.json({ error: "File not found." }, { status: 404 });

  const bytes = Buffer.from(doc.data);
  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "Content-Type": doc.mime,
      "Content-Length": String(doc.size),
      // Inline so admins review the document right in the tab.
      "Content-Disposition": "inline",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
