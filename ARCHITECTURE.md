# Architecture Note

## What I prioritized and why

With a 4-hour timebox, I aimed for **a small slice where every part works end to end, is deployed and is tested**, rather than many features that each half-work. In priority order:

1. **Editing that feels trustworthy.** Autosave, a visible save status, a warning before leaving with unsaved changes, and formatting that survives a reload exactly. An editor that loses work is worse than one with fewer buttons.
2. **Correct access control.** All permission rules live in one small module, are enforced on the server for every request, and are covered by tests.
3. **A deployed build reviewers can use straight away.** Demo users and shared documents are pre-loaded, and there are one-click logins.
4. **Import that's actually useful.** Uploading a file creates a new editable document (rather than an attachment), because that's the workflow people actually need when moving into a new docs tool.

**Deliberately cut:** real-time co-editing with CRDTs (Yjs), comments, version history, sign-up and password reset, attachments, link sharing. Real-time collaboration was the biggest temptation, but it's also the biggest risk in 4 hours. Instead I added a cheap, honest safeguard (see *Concurrency*) and listed real-time as the next step.

## Stack

| Layer      | Choice | Why |
| ---------- | ------ | --- |
| App        | **Next.js 16** (App Router, TypeScript) | One codebase for UI and API; one-click Vercel deploy |
| Editor     | **Tiptap 3** (ProseMirror) | Mature editor; its JSON document model stores structure without loss |
| Database   | **Postgres** via **Drizzle ORM** | Owners and shares are relational data. Drizzle runs the same schema on Neon (production) and PGlite (local/tests) |
| Auth       | Signed JWT in an HTTP-only cookie (`jose`), passwords hashed with `bcryptjs` | Minimal and secure enough for seeded accounts, no third-party auth service |
| Validation | **zod** | Every request body is validated at the API boundary |
| Import     | `marked` (md), `mammoth` (docx), `sanitize-html` | Small, well-known converters; sanitizing before storing |
| Tests      | **Vitest** + in-memory PGlite | Integration tests against real Postgres behavior, no external services needed |

## Code layout

```
src/
  db/          schema.ts (tables), index.ts (Neon vs PGlite), seed.ts (demo data, safe to re-run)
  lib/         access.ts (permission policy), validation.ts, import.ts, export.ts, session.ts
  server/      documents.ts (all business logic), http.ts (auth + error → JSON wrapper)
  app/api/     thin route handlers: parse → call service → respond
  app/, components/   pages + client UI (Dashboard, DocumentPage, Toolbar, ShareDialog)
  proxy.ts     redirects signed-out users to /login (page-level only; the API checks again)
drizzle/       SQL migrations
tests/         access, import, export, documents (integration)
```

All business logic is in `src/server/documents.ts`. Each function takes `(db, userId, …)`, so the tests call exactly the code the API runs, against a real Postgres engine.

## Data model

```
users           (id, email unique, name, password_hash)
documents       (id, title, content jsonb, owner_id → users, created_at, updated_at)
document_shares (document_id → documents, user_id → users, role 'viewer'|'editor')  PK(document_id, user_id)
```

- **Content is stored as Tiptap/ProseMirror JSON**, not HTML. It's the editor's native format, so headings, lists and formatting reload exactly as saved. It can also be validated, and converted to HTML or Markdown when needed (as the export does).
- The table enforces **at most one share per user per document**. Sharing again with the same person just updates their role.
- Deleting a document or user automatically deletes its shares.

## Access model

`lib/access.ts` is the single source of truth:

| Role   | Read | Edit content / rename | Share / revoke / delete |
| ------ | :--: | :-------------------: | :---------------------: |
| Owner  | ✓ | ✓ | ✓ |
| Editor | ✓ | ✓ |   |
| Viewer | ✓ |   |   |

- Every API call loads the document with its shares, works out the caller's role, then checks the action.
- **No access returns 404, not 403**, so users can't discover which document IDs exist. A user who *can* read but tries to edit or share gets 403 with a clear message.
- The UI hides controls the user can't use (the editor becomes read-only for viewers, and Share appears only for owners), but **the server is the real enforcement**.

## Concurrency

Without real-time collaboration, two people can edit at once. Instead of letting the last save silently win:

- Every save includes the `updatedAt` value the client last saw.
- If the database copy is newer, the server returns **409**. The UI stops autosaving, shows "changed by someone else — Reload", and keeps the user's text on screen.
- Saves from one client are queued with only one request in flight at a time, so a client never conflicts with itself.

## Import pipeline

`file → extension and size check (≤ 2 MB) → HTML (txt: escaped paragraphs | md: marked | docx: mammoth) → sanitize-html allow-list → Tiptap JSON on the server → new document`

Anything the editor doesn't support is dropped during conversion. Headings h4–h6 become H3 so their text isn't lost. A corrupt `.docx` returns a friendly 400 error.

## Validation and error handling

- zod checks every request: title 1–200 characters, content shape and ~1 MB limit, email format, role values.
- Each route is wrapped in one handler that turns known errors into `{ error }` JSON with the right status code. Unexpected errors are logged and return a generic 500.
- The UI covers loading, empty, error-with-retry and conflict states. A 401 response sends the user back to login.
- Production refuses to start without `SESSION_SECRET` and `DATABASE_URL`, rather than quietly running insecurely.

## Testing

`npm test` runs 27 tests:
- **access**: the full permission matrix.
- **import**: Markdown and plain-text conversion, script/XSS stripping, bad file type, empty, oversized and corrupt files.
- **export**: Markdown output and a round-trip back through import.
- **documents** (integration on PGlite): the full share → view-only → upgrade to editor → revoke flow, 404 for strangers, share validation, exact persistence of formatting, and the 409 conflict.

I also smoke-tested the deployed app over HTTP with all three demo users (see AI_WORKFLOW.md).

## What I'd build next (2–4 hours)

1. **Real-time co-editing** with Yjs + Hocuspocus: shared cursors and presence, replacing the 409 check with true merging.
2. **Version history:** save snapshots and let users restore one. The data model already supports adding a `document_versions` table.
3. **Comments** anchored to text ranges.
4. Real auth (magic link or OAuth), plus "share with anyone who has the link".
5. Browser end-to-end tests with Playwright for the editor UI.
