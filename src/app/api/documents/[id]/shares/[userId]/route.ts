import { NextResponse } from "next/server";
import { revokeShare } from "@/server/documents";
import { requireUser, route } from "@/server/http";

type Ctx = { params: Promise<{ id: string; userId: string }> };

export const DELETE = route<Ctx>(async (_req, ctx, db) => {
  const user = await requireUser();
  const { id, userId } = await ctx.params;
  await revokeShare(db, user.id, id, userId);
  return new NextResponse(null, { status: 204 });
});
