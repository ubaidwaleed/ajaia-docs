import TurndownService from "turndown";

const turndown = new TurndownService({ headingStyle: "atx", bulletListMarker: "-", emDelimiter: "_" });
// Markdown has no underline; inline HTML <u> is the most portable fallback.
turndown.addRule("underline", { filter: ["u"], replacement: (content) => `<u>${content}</u>` });
turndown.addRule("strike", { filter: ["s", "del"], replacement: (content) => `~~${content}~~` });

export function htmlToMarkdown(html: string): string {
  return turndown.turndown(html).trim() + "\n";
}

export function markdownFilename(title: string): string {
  const safe = title.replace(/[\\/:*?"<>|]+/g, "").trim().slice(0, 100);
  return `${safe || "document"}.md`;
}
