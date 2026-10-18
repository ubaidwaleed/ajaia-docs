import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import type { Db } from "./index";
import { documentShares, documents, users } from "./schema";

export const DEMO_PASSWORD = "demo1234";

export const DEMO_USERS = [
  { email: "alice@ajaia.test", name: "Alice Admin" },
  { email: "bob@ajaia.test", name: "Bob Builder" },
  { email: "carol@ajaia.test", name: "Carol Critic" },
] as const;

const p = (text: string) => ({ type: "paragraph", content: [{ type: "text", text }] });
const h = (level: number, text: string) => ({
  type: "heading",
  attrs: { level },
  content: [{ type: "text", text }],
});
const list = (type: "bulletList" | "orderedList", items: string[]) => ({
  type,
  content: items.map((t) => ({ type: "listItem", content: [p(t)] })),
});

const SAMPLE_DOCS = [
  {
    title: "Q3 Planning",
    shareWith: { email: "bob@ajaia.test", role: "editor" as const },
    content: {
      type: "doc",
      content: [
        h(1, "Q3 Planning"),
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Goal: " },
            { type: "text", marks: [{ type: "bold" }], text: "ship the docs MVP" },
            { type: "text", text: " and collect " },
            { type: "text", marks: [{ type: "italic" }], text: "real" },
            { type: "text", text: " feedback." },
          ],
        },
        h(2, "Priorities"),
        list("orderedList", ["Editing + autosave", "Sharing", "File import"]),
        h(2, "Open questions"),
        list("bulletList", ["Do we need real-time cursors?", "Which file types matter most?"]),
      ],
    },
  },
  {
    title: "Team Handbook",
    shareWith: { email: "carol@ajaia.test", role: "viewer" as const },
    content: {
      type: "doc",
      content: [
        h(1, "Team Handbook"),
        p("This document is shared with Carol as a viewer, so she can read it but not edit it."),
        h(3, "Working agreements"),
        list("bulletList", ["Write things down", "Default to async", "Ship small"]),
      ],
    },
  },
];

/** Idempotent: safe to run on every boot / deploy. */
export async function seed(db: Db) {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  await db
    .insert(users)
    .values(DEMO_USERS.map((u) => ({ ...u, passwordHash })))
    .onConflictDoNothing({ target: users.email });

  const all = await db.select().from(users);
  const byEmail = new Map(all.map((u) => [u.email, u]));
  const alice = byEmail.get("alice@ajaia.test")!;

  const existing = await db.select({ id: documents.id }).from(documents).where(eq(documents.ownerId, alice.id)).limit(1);
  if (existing.length > 0) return;

  for (const d of SAMPLE_DOCS) {
    const [doc] = await db
      .insert(documents)
      .values({ title: d.title, content: d.content, ownerId: alice.id })
      .returning();
    const target = byEmail.get(d.shareWith.email)!;
    await db.insert(documentShares).values({ documentId: doc.id, userId: target.id, role: d.shareWith.role });
  }
}
