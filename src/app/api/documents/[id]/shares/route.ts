import { NextResponse } from "next/server";
import { shareSchema } from "@/lib/validation";
import { listShares, shareDocument } from "@/server/documents";
import { readJson, requireUser, route } from "@/server/http";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route<Ctx>(async (_req, ctx, db) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  return NextResponse.json({ shares: await listShares(db, user.id, id) });
});

export const POST = route<Ctx>(async (req, ctx, db) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const { email, role } = shareSchema.parse(await readJson(req));
  return NextResponse.json(await shareDocument(db, user.id, id, email, role), { status: 201 });
});
