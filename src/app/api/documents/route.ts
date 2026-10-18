import { NextResponse } from "next/server";
import { createDocumentSchema } from "@/lib/validation";
import { createDocument, listDocuments } from "@/server/documents";
import { readJson, requireUser, route } from "@/server/http";

export const GET = route(async (_req, _ctx, db) => {
  const user = await requireUser();
  return NextResponse.json(await listDocuments(db, user.id));
});

export const POST = route(async (req, _ctx, db) => {
  const user = await requireUser();
  const input = createDocumentSchema.parse(await readJson(req));
  const doc = await createDocument(db, user.id, input);
  return NextResponse.json({ id: doc.id }, { status: 201 });
});
