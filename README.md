# Ajaia Docs

A lightweight collaborative document editor: create and edit rich-text documents, import files, and share them with other users as **viewers** or **editors**.

**Live app:** https://ajaia-docs-peach-gamma.vercel.app

## Demo accounts

All passwords are `demo1234`. The login page also has one-click "Sign in as…" buttons.

| User  | Email              | What to try                                                    |
| ----- | ------------------ | -------------------------------------------------------------- |
| Alice | `alice@ajaia.test` | Owns the sample docs; share them, change roles, revoke access  |
| Bob   | `bob@ajaia.test`   | Has **edit** access to "Q3 Planning"                           |
| Carol | `carol@ajaia.test` | Has **view-only** access to "Team Handbook"                    |

Suggested review flow (about 3 minutes): sign in as Alice → create a document, format it, rename it, refresh → **Share** it with `bob@ajaia.test` → sign out, sign in as Bob → it appears under **Shared with me** → sign in as Carol to see read-only mode.

## Features

- **Documents:** create, rename (click the title), edit, delete (owner only). Changes **autosave** about a second after you stop typing. The header shows the save status.
- **Rich text:** bold, italic, underline, strikethrough, H1–H3, bulleted and numbered lists, quotes, undo/redo. Standard keyboard shortcuts (Ctrl/Cmd+B/I/U, Markdown-style `# ` and `- `) work.
- **File import:** **`.txt`, `.md`, `.docx`, max 2 MB** → becomes a new editable document. Other file types are rejected with a clear message.
- **Sharing:** the owner shares by email with **Can edit** or **Can view**, can change roles, and can remove access. The dashboard separates **My documents** from **Shared with me**, and role badges are shown everywhere.
- **Export:** download any document as Markdown.
- **Conflict protection:** if someone else saved the document after you opened it, your save is rejected and you're asked to reload, instead of their changes being silently overwritten.

## Run locally

Requires **Node.js 20+**.

```bash
npm install
npm run dev
# open http://localhost:3000 and sign in with a demo account
```

You don't need to set up a database. With no `DATABASE_URL`, the app uses **PGlite** (Postgres compiled to WebAssembly, running inside Node) and stores data in `./.pglite`. It creates the tables and loads the demo data automatically on first start. Delete `.pglite/` to reset.

To use a real Postgres database instead, copy `.env.example` to `.env.local` and set:

```bash
DATABASE_URL="postgresql://..."   # e.g. a free Neon database
SESSION_SECRET="long-random-string"
npm run db:migrate                # creates the tables and loads demo data (safe to re-run)
npm run dev
```

### Scripts

| Command             | Purpose                                                       |
| ------------------- | ------------------------------------------------------------- |
| `npm test`          | Unit + integration tests (Vitest, in-memory Postgres via PGlite) |
| `npm run typecheck` | TypeScript                                                    |
| `npm run lint`      | ESLint                                                        |
| `npm run db:migrate`| Create tables and load demo data in `DATABASE_URL`            |
| `npm run db:generate` | Generate a new migration after editing `src/db/schema.ts`   |

## Deployment

Hosted on **Vercel** with a **Neon** Postgres database, both on free tiers. Set `DATABASE_URL` and `SESSION_SECRET` in Vercel. The `vercel-build` script creates the tables and loads the demo data before `next build`, so every deploy is ready to use.

## Known limitations

- No real-time co-editing. Concurrent edits are detected (the second save is rejected and asks for a reload) but not merged.
- No sign-up flow; accounts are pre-made (seeded).
- Imports keep headings, paragraphs, bold/italic/underline, lists, quotes and links. Images, tables and colors in `.docx` files are dropped.

More detail: [ARCHITECTURE.md](ARCHITECTURE.md) · [AI_WORKFLOW.md](AI_WORKFLOW.md) · [SUBMISSION.md](SUBMISSION.md)
