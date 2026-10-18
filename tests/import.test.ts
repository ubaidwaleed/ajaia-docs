import { describe, expect, it } from "vitest";
import { HttpError } from "@/lib/errors";
import { importFile, MAX_UPLOAD_BYTES, sanitize, textToHtml, titleFromFilename } from "@/lib/import";

const buf = (s: string) => Buffer.from(s, "utf8");
type Node = { type: string; attrs?: Record<string, unknown>; content?: Node[]; text?: string; marks?: { type: string }[] };

describe("titleFromFilename", () => {
  it("strips the extension", () => expect(titleFromFilename("Meeting notes.final.md")).toBe("Meeting notes.final"));
  it("falls back when empty", () => expect(titleFromFilename(".md")).toBe("Imported document"));
});

describe("textToHtml", () => {
  it("splits blank lines into paragraphs and escapes HTML", () => {
    expect(textToHtml("Hello <b>world</b>\r\n\r\nline one\nline two")).toBe(
      "<p>Hello &lt;b&gt;world&lt;/b&gt;</p><p>line one<br>line two</p>",
    );
  });
});

describe("sanitize", () => {
  it("removes scripts, event handlers and javascript: links", () => {
    const out = sanitize(`<p onclick="x()">hi</p><script>alert(1)</script><a href="javascript:alert(1)">x</a>`);
    expect(out).not.toMatch(/script|onclick|javascript/i);
    expect(out).toContain("<p>hi</p>");
  });
});

describe("importFile", () => {
  it("converts markdown headings, marks and lists into editor JSON", async () => {
    const md = "# Title\n\nSome **bold** and _italic_ text.\n\n- one\n- two\n\n1. first\n2. second\n";
    const { title, content } = await importFile("plan.md", buf(md));
    expect(title).toBe("plan");

    const nodes = content.content as Node[];
    expect(nodes.map((n) => n.type)).toEqual(["heading", "paragraph", "bulletList", "orderedList"]);
    expect(nodes[0].attrs?.level).toBe(1);
    const marks = nodes[1].content!.flatMap((t) => t.marks?.map((m) => m.type) ?? []);
    expect(marks).toEqual(expect.arrayContaining(["bold", "italic"]));
    expect(nodes[2].content).toHaveLength(2);
  });

  it("imports plain text as paragraphs", async () => {
    const { content } = await importFile("notes.TXT", buf("first\n\nsecond"));
    expect((content.content as Node[]).map((n) => n.type)).toEqual(["paragraph", "paragraph"]);
  });

  it("rejects unsupported file types with a 400", async () => {
    await expect(importFile("report.pdf", buf("%PDF"))).rejects.toMatchObject({ status: 400 });
  });

  it("rejects empty and oversized files", async () => {
    await expect(importFile("a.txt", buf(""))).rejects.toBeInstanceOf(HttpError);
    await expect(importFile("a.txt", Buffer.alloc(MAX_UPLOAD_BYTES + 1, 97))).rejects.toThrow(/too large/);
  });

  it("rejects a corrupt .docx", async () => {
    await expect(importFile("broken.docx", buf("not a zip"))).rejects.toMatchObject({ status: 400 });
  });
});
