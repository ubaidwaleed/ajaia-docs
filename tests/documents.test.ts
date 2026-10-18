// Integration tests: real Postgres semantics via in-memory PGlite, same migrations + seed as production.
import { beforeAll, describe, expect, it } from "vitest";
import { createPgliteDb, type Db } from "@/db";
import { DEMO_PASSWORD } from "@/db/seed";
import {
  authenticate,
  createDocument,
  deleteDocument,
  getDocument,
  listDocuments,
  revokeShare,
  shareDocument,
  updateDocument,
} from "@/server/documents";

let db: Db;
let alice: string, bob: string, carol: string;

beforeAll(async () => {
  db = await createPgliteDb();
  alice = (await authenticate(db, "alice@ajaia.test", DEMO_PASSWORD)).id;
  bob = (await authenticate(db, "bob@ajaia.test", DEMO_PASSWORD)).id;
  carol = (await authenticate(db, "carol@ajaia.test", DEMO_PASSWORD)).id;
});

const content = (text: string) => ({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] });

describe("auth", () => {
  it("rejects a wrong password", async () => {
    await expect(authenticate(db, "alice@ajaia.test", "nope")).rejects.toMatchObject({ status: 401 });
  });
});

describe("sharing flow", () => {
  it("owner shares, recipient sees it under 'shared', role is enforced, revoke removes access", async () => {
    const doc = await createDocument(db, alice, { title: "Roadmap" });

    // Before sharing, Bob can't see it at all (404, not 403 — don't leak existence).
    await expect(getDocument(db, bob, doc.id)).rejects.toMatchObject({ status: 404 });

    await shareDocument(db, alice, doc.id, "bob@ajaia.test", "viewer");
    const bobLists = await listDocuments(db, bob);
    expect(bobLists.shared.map((d) => d.id)).toContain(doc.id);
    expect(bobLists.owned.map((d) => d.id)).not.toContain(doc.id);
    expect((await listDocuments(db, alice)).owned.find((d) => d.id === doc.id)?.access).toBe("owner");

    // Viewer can read but not write.
    expect((await getDocument(db, bob, doc.id)).access).toBe("viewer");
    await expect(updateDocument(db, bob, doc.id, { content: content("hack") })).rejects.toMatchObject({ status: 403 });

    // Re-sharing upgrades the role; now Bob can edit.
    await shareDocument(db, alice, doc.id, "bob@ajaia.test", "editor");
    await updateDocument(db, bob, doc.id, { content: content("Bob was here") });
    expect((await getDocument(db, alice, doc.id)).content).toEqual(content("Bob was here"));

    // Editors cannot re-share or delete.
    await expect(shareDocument(db, bob, doc.id, "carol@ajaia.test", "viewer")).rejects.toMatchObject({ status: 403 });
    await expect(deleteDocument(db, bob, doc.id)).rejects.toMatchObject({ status: 403 });

    await revokeShare(db, alice, doc.id, bob);
    await expect(getDocument(db, bob, doc.id)).rejects.toMatchObject({ status: 404 });
  });

  it("validates share targets", async () => {
    const doc = await createDocument(db, alice, {});
    await expect(shareDocument(db, alice, doc.id, "nobody@ajaia.test", "editor")).rejects.toThrow(/No user found/);
    await expect(shareDocument(db, alice, doc.id, "alice@ajaia.test", "editor")).rejects.toThrow(/already own/);
  });

  it("a stranger cannot access, share or delete", async () => {
    const doc = await createDocument(db, alice, {});
    await expect(shareDocument(db, carol, doc.id, "carol@ajaia.test", "editor")).rejects.toMatchObject({ status: 404 });
    await expect(deleteDocument(db, carol, doc.id)).rejects.toMatchObject({ status: 404 });
  });
});

describe("persistence + conflicts", () => {
  it("persists title and rich content exactly", async () => {
    const doc = await createDocument(db, alice, {});
    const rich = {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Hi" }] },
        { type: "paragraph", content: [{ type: "text", marks: [{ type: "underline" }], text: "u" }] },
      ],
    };
    await updateDocument(db, alice, doc.id, { title: "Renamed", content: rich });
    const loaded = await getDocument(db, alice, doc.id);
    expect(loaded.title).toBe("Renamed");
    expect(loaded.content).toEqual(rich);
  });

  it("rejects a save based on a stale version with 409", async () => {
    const doc = await createDocument(db, alice, {});
    await shareDocument(db, alice, doc.id, "bob@ajaia.test", "editor");
    const base = (await getDocument(db, bob, doc.id)).updatedAt.toISOString();

    await new Promise((r) => setTimeout(r, 5));
    const first = await updateDocument(db, alice, doc.id, { content: content("alice"), baseUpdatedAt: base });
    await expect(updateDocument(db, bob, doc.id, { content: content("bob"), baseUpdatedAt: base })).rejects.toMatchObject({
      status: 409,
    });
    // Using the fresh version works.
    await updateDocument(db, alice, doc.id, { content: content("alice 2"), baseUpdatedAt: first.updatedAt.toISOString() });
  });
});

describe("seed data", () => {
  it("gives Bob an editable doc and Carol a view-only doc", async () => {
    const bobShared = (await listDocuments(db, bob)).shared;
    const carolShared = (await listDocuments(db, carol)).shared;
    expect(bobShared.find((d) => d.title === "Q3 Planning")?.access).toBe("editor");
    expect(carolShared.find((d) => d.title === "Team Handbook")?.access).toBe("viewer");
  });
});
