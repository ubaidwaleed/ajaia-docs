import type { ShareRole } from "@/db/schema";

export type Access = "owner" | "editor" | "viewer";

interface DocLike {
  ownerId: string;
  shares: { userId: string; role: ShareRole }[];
}

/** Single source of truth for what a user may do with a document. `null` = no access. */
export function getAccess(userId: string, doc: DocLike): Access | null {
  if (doc.ownerId === userId) return "owner";
  const share = doc.shares.find((s) => s.userId === userId);
  return share ? share.role : null;
}

export const canRead = (a: Access | null): a is Access => a !== null;
export const canEdit = (a: Access | null) => a === "owner" || a === "editor";
/** Share, revoke, delete. */
export const canManage = (a: Access | null) => a === "owner";
