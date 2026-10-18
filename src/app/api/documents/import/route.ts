import { NextResponse } from "next/server";
import { badRequest } from "@/lib/errors";
import { importFile } from "@/lib/import";
import { createDocument } from "@/server/documents";
import { requireUser, route } from "@/server/http";

export const POST = route(async (req, _ctx, db) => {
  const user = await requireUser();
  const form = await req.formData().catch(() => {
    throw badRequest("Expected a multipart form upload");
  });
  const file = form.get("file");
  if (!(file instanceof File)) throw badRequest("Choose a file to upload");

  const { title, content } = await importFile(file.name, Buffer.from(await file.arrayBuffer()));
  const doc = await createDocument(db, user.id, { title, content });
  return NextResponse.json({ id: doc.id }, { status: 201 });
});
