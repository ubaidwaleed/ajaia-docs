import { z } from "zod";
import { SHARE_ROLES } from "@/db/schema";

export const MAX_TITLE_LENGTH = 200;
export const MAX_CONTENT_BYTES = 1_000_000;

export const titleSchema = z
  .string()
  .trim()
  .min(1, "Title can't be empty")
  .max(MAX_TITLE_LENGTH, `Title must be ${MAX_TITLE_LENGTH} characters or fewer`);

// We only check the outer shape; Tiptap's schema drops unknown nodes when the doc is loaded.
export const contentSchema = z
  .looseObject({ type: z.literal("doc"), content: z.array(z.any()).optional() })
  .refine((c) => JSON.stringify(c).length <= MAX_CONTENT_BYTES, "Document is too large (max ~1 MB)");

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email")),
  password: z.string().min(1, "Enter your password"),
});

export const createDocumentSchema = z.object({
  title: titleSchema.optional(),
});

export const updateDocumentSchema = z
  .object({
    title: titleSchema.optional(),
    content: contentSchema.optional(),
    // The updatedAt the client last saw; used to detect conflicting edits.
    baseUpdatedAt: z.iso.datetime({ offset: true }).optional(),
  })
  .refine((v) => v.title !== undefined || v.content !== undefined, "Nothing to update");

export const shareSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email")),
  role: z.enum(SHARE_ROLES),
});
