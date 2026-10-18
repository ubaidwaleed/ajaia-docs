import { describe, expect, it } from "vitest";
import { canEdit, canManage, canRead, getAccess } from "@/lib/access";

const doc = {
  ownerId: "alice",
  shares: [
    { userId: "bob", role: "editor" as const },
    { userId: "carol", role: "viewer" as const },
  ],
};

describe("getAccess", () => {
  it.each([
    ["alice", "owner"],
    ["bob", "editor"],
    ["carol", "viewer"],
    ["mallory", null],
  ])("%s -> %s", (user, expected) => {
    expect(getAccess(user, doc)).toBe(expected);
  });
});

describe("permissions", () => {
  it("owner can read, edit and manage", () => {
    expect([canRead("owner"), canEdit("owner"), canManage("owner")]).toEqual([true, true, true]);
  });
  it("editor can read and edit but not manage sharing", () => {
    expect([canRead("editor"), canEdit("editor"), canManage("editor")]).toEqual([true, true, false]);
  });
  it("viewer can only read", () => {
    expect([canRead("viewer"), canEdit("viewer"), canManage("viewer")]).toEqual([true, false, false]);
  });
  it("no access means nothing", () => {
    expect([canRead(null), canEdit(null), canManage(null)]).toEqual([false, false, false]);
  });
});
