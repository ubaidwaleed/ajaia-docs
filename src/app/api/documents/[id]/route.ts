import { NextResponse } from "next/server";
import { updateDocumentSchema } from "@/lib/validation";
import { deleteDocument, getDocument, updateDocument } from "@/server/documents";
import { readJson, requireUser, route } from "@/server/http";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route<Ctx>(async (_req, ctx, db) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  return NextResponse.json(await getDocument(db, user.id, id));
});

export const PATCH = route<Ctx>(async (req, ctx, db) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const input = updateDocumentSchema.parse(await readJson(req));
  return NextResponse.json(await updateDocument(db, user.id, id, input));
});

export const DELETE = route<Ctx>(async (_req, ctx, db) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  await deleteDocument(db, user.id, id);
  return new NextResponse(null, { status: 204 });
});
