import { generateJSON } from "@tiptap/html/server";
import mammoth from "mammoth";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import { editorExtensions } from "./editor-extensions";
import { badRequest } from "./errors";

export const SUPPORTED_EXTENSIONS = [".txt", ".md", ".docx"] as const;
export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024; // 2 MB

export function getExtension(filename: string): string {
  const i = filename.lastIndexOf(".");
  return i === -1 ? "" : filename.slice(i).toLowerCase();
}

export function titleFromFilename(filename: string): string {
  const ext = getExtension(filename);
  const base = (ext ? filename.slice(0, -ext.length) : filename).trim();
  return (base || "Imported document").slice(0, 200);
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function textToHtml(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/)
    .map((para) => para.trim())
    .filter(Boolean)
    .map((para) => `<p>${escapeHtml(para).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

const ALLOWED_TAGS = [
  "p", "br", "h1", "h2", "h3", "h4", "h5", "h6", "strong", "b", "em", "i", "u", "s", "del",
  "ul", "ol", "li", "blockquote", "code", "pre", "hr", "a",
];

export function sanitize(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: { a: ["href"] },
    allowedSchemes: ["http", "https", "mailto"],
  });
}

/** Convert an uploaded file into sanitized HTML. Throws a 400 for unsupported/invalid input. */
export async function fileToHtml(filename: string, data: Buffer): Promise<string> {
  const ext = getExtension(filename);
  let html: string;
  switch (ext) {
    case ".txt":
      html = textToHtml(data.toString("utf8"));
      break;
    case ".md":
      html = await marked.parse(data.toString("utf8"));
      break;
    case ".docx":
      try {
        html = (await mammoth.convertToHtml({ buffer: data })).value;
      } catch {
        throw badRequest("Couldn't read that .docx file. Is it a valid Word document?");
      }
      break;
    default:
      throw badRequest(`Unsupported file type "${ext || "none"}". Supported: ${SUPPORTED_EXTENSIONS.join(", ")}`);
  }
  return sanitize(html);
}

export function htmlToDoc(html: string) {
  // h4-h6 aren't in our editor; downgrade them so their text isn't lost.
  const normalized = html.replace(/<(\/?)h[4-6]\b/gi, "<$1h3");
  return generateJSON(normalized || "<p></p>", editorExtensions);
}

export async function importFile(filename: string, data: Buffer) {
  if (data.byteLength === 0) throw badRequest("That file is empty");
  if (data.byteLength > MAX_UPLOAD_BYTES) throw badRequest("File is too large (max 2 MB)");
  const html = await fileToHtml(filename, data);
  return { title: titleFromFilename(filename), content: htmlToDoc(html) };
}
