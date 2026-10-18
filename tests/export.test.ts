import { describe, expect, it } from "vitest";
import { htmlToMarkdown, markdownFilename } from "@/lib/export";
import { importFile } from "@/lib/import";

describe("htmlToMarkdown", () => {
  it("converts headings, marks and lists", () => {
    const md = htmlToMarkdown(
      "<h2>Plan</h2><p><strong>b</strong> <em>i</em> <u>u</u> <s>s</s></p><ul><li><p>one</p></li></ul><ol><li><p>first</p></li></ol>",
    );
    expect(md).toContain("## Plan");
    expect(md).toContain("**b** _i_ <u>u</u> ~~s~~");
    expect(md).toMatch(/^-\s+one$/m);
    expect(md).toMatch(/^1\.\s+first$/m);
  });

  it("round-trips through import", async () => {
    const md = htmlToMarkdown("<h1>Title</h1><p>Some <strong>bold</strong></p>");
    const { content } = await importFile("x.md", Buffer.from(md));
    expect(content.content?.[0]).toMatchObject({ type: "heading", attrs: { level: 1 } });
  });
});

describe("markdownFilename", () => {
  it("strips characters that are invalid in filenames", () => {
    expect(markdownFilename('Q3: plan/"final"?')).toBe("Q3 planfinal.md");
    expect(markdownFilename("   ")).toBe("document.md");
  });
});
