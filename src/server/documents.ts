import bcrypt from "bcryptjs";
import { and, desc, eq, inArray } from "drizzle-orm";
import type { Db } from "@/db";
import { documents, documentShares, type ShareRole, users } from "@/db/schema";
import { type Access, canEdit, canManage, canRead, getAccess } from "@/lib/access";
import { badRequest, conflict, forbidden, notFound, unauthorized } from "@/lib/errors";
import type { SessionUser } from "@/lib/session";

const EMPTY_DOC = { type: "doc", content: [{ type: "paragraph" }] };

export async function authenticate(db: Db, email: string, password: string): Promise<SessionUser> {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  // Compare even when the user is missing, so timing doesn't reveal which emails exist.
  const ok = await bcrypt.compare(password, user?.passwordHash ?? "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva");
  if (!user || !ok) throw unauthorized("Incorrect email or password");
  return { id: user.id, email: user.email, name: user.name };
}

async function loadWithAccess(db: Db, userId: string, docId: string) {
  const doc = await db.query.documents.findFirst({
    where: eq(documents.id, docId),
    with: { shares: true, owner: { columns: { id: true, name: true, email: true } } },
  });
  const access = doc ? getAccess(userId, doc) : null;
  if (!doc || !canRead(access)) throw notFound();
  return { doc, access };
}

export interface DocumentSummary {
  id: string;
  title: string;
  updatedAt: Date;
  access: Access;
  owner: { id: string; name: string; email: string };
}

export async function listDocuments(db: Db, userId: string) {
  const ownerCols = { columns: { id: true, name: true, email: true } } as const;
  const owned = await db.query.documents.findMany({
    where: eq(documents.ownerId, userId),
    columns: { id: true, title: true, updatedAt: true },
    with: { owner: ownerCols },
    orderBy: desc(documents.updatedAt),
  });

  const myShares = await db.select().from(documentShares).where(eq(documentShares.userId, userId));
  const roleByDoc = new Map(myShares.map((s) => [s.documentId, s.role]));
  const shared = myShares.length
    ? await db.query.documents.findMany({
        where: inArray(documents.id, [...roleByDoc.keys()]),
        columns: { id: true, title: true, updatedAt: true },
        with: { owner: ownerCols },
        orderBy: desc(documents.updatedAt),
      })
    : [];

  return {
    owned: owned.map((d): DocumentSummary => ({ ...d, access: "owner" })),
    shared: shared.map((d): DocumentSummary => ({ ...d, access: roleByDoc.get(d.id)! })),
  };
}

export async function createDocument(db: Db, userId: string, input: { title?: string; content?: unknown }) {
  const [doc] = await db
    .insert(documents)
    .values({ ownerId: userId, title: input.title ?? "Untitled document", content: input.content ?? EMPTY_DOC })
    .returning();
  return doc;
}

export async function getDocument(db: Db, userId: string, docId: string) {
  const { doc, access } = await loadWithAccess(db, userId, docId);
  return {
    id: doc.id,
    title: doc.title,
    content: doc.content,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    owner: doc.owner,
    access,
  };
}

export async function updateDocument(
  db: Db,
  userId: string,
  docId: string,
  input: { title?: string; content?: unknown; baseUpdatedAt?: string },
) {
  const { doc, access } = await loadWithAccess(db, userId, docId);
  if (!canEdit(access)) throw forbidden("You have view-only access to this document");

  // Optimistic concurrency: reject if someone else saved since this client loaded the doc.
  // (Compared at millisecond precision, which is what the client sees.)
  if (input.baseUpdatedAt && new Date(input.baseUpdatedAt).getTime() < doc.updatedAt.getTime()) {
    throw conflict("This document was changed by someone else. Reload to get the latest version.");
  }

  const [updated] = await db
    .update(documents)
    .set({
      ...(input.title !== undefined && { title: input.title }),
      ...(input.content !== undefined && { content: input.content }),
      updatedAt: new Date(),
    })
    .where(eq(documents.id, docId))
    .returning({ id: documents.id, title: documents.title, updatedAt: documents.updatedAt });
  return updated;
}

export async function deleteDocument(db: Db, userId: string, docId: string) {
  const { access } = await loadWithAccess(db, userId, docId);
  if (!canManage(access)) throw forbidden("Only the owner can delete this document");
  await db.delete(documents).where(eq(documents.id, docId));
}

export async function listShares(db: Db, userId: string, docId: string) {
  const { access } = await loadWithAccess(db, userId, docId);
  if (!canManage(access)) throw forbidden("Only the owner can manage sharing");
  const rows = await db.query.documentShares.findMany({
    where: eq(documentShares.documentId, docId),
    with: { user: { columns: { id: true, name: true, email: true } } },
  });
  return rows.map((r) => ({ role: r.role, createdAt: r.createdAt, user: r.user }));
}

export async function shareDocument(db: Db, userId: string, docId: string, email: string, role: ShareRole) {
  const { doc, access } = await loadWithAccess(db, userId, docId);
  if (!canManage(access)) throw forbidden("Only the owner can share this document");

  const [target] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!target) throw badRequest(`No user found with email ${email}`);
  if (target.id === doc.ownerId) throw badRequest("You already own this document");

  // Re-sharing with the same person just updates their role.
  await db
    .insert(documentShares)
    .values({ documentId: docId, userId: target.id, role })
    .onConflictDoUpdate({ target: [documentShares.documentId, documentShares.userId], set: { role } });
  return { user: { id: target.id, name: target.name, email: target.email }, role };
}

export async function revokeShare(db: Db, userId: string, docId: string, targetUserId: string) {
  const { access } = await loadWithAccess(db, userId, docId);
  if (!canManage(access)) throw forbidden("Only the owner can manage sharing");
  await db
    .delete(documentShares)
    .where(and(eq(documentShares.documentId, docId), eq(documentShares.userId, targetUserId)));
}
