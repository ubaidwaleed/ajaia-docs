# Submission — Ajaia Full Stack Product Engineer

**Candidate:** Ubaidullah Waleed

## Links

- **Live app:** https://ajaia-docs-peach-gamma.vercel.app
- **Source:** https://github.com/ubaidwaleed/ajaia-docs (also in this Drive folder)
- **Walkthrough video:** see `VIDEO_URL.txt`

## Test accounts (password `demo1234` for all)

| Email | Role in the sample data |
| --- | --- |
| `alice@ajaia.test` | Owner of "Q3 Planning" and "Team Handbook" |
| `bob@ajaia.test` | **Editor** on "Q3 Planning" |
| `carol@ajaia.test` | **Viewer** on "Team Handbook" |

The login page has one-click buttons for each account.

## What's included

| Item | Location |
| --- | --- |
| Source code | `ajaia-docs/` (`src/`, `tests/`, `drizzle/`, `scripts/`) |
| Setup and run instructions | `README.md` |
| Architecture note | `ARCHITECTURE.md` |
| AI workflow note | `AI_WORKFLOW.md` |
| This file | `SUBMISSION.md` |
| Walkthrough video URL | `VIDEO_URL.txt` |
| Automated tests | `tests/` — run with `npm test` (27 tests) |
| Environment template | `.env.example` |

No screenshots are included, because local setup is just `npm install && npm run dev` (no database or keys needed).

## Status

### Working end to end
- Create, rename, edit and delete documents; autosave with a save status; content and formatting persist across refreshes.
- Rich text: bold, italic, underline, strikethrough, H1–H3, bulleted and numbered lists, quotes, undo/redo.
- File import: `.txt`, `.md`, `.docx` (≤ 2 MB) → a new editable document; unsupported types are rejected with a message.
- Sharing: owner, editor and viewer roles; share by email, change role, revoke; "My documents" vs "Shared with me"; read-only editor for viewers; all enforced on the server.
- Detecting edits from two places at once (409 + reload prompt).
- Export to Markdown (optional extra), plus role-based permissions (also an optional extra).
- Deployed on Vercel + Neon; demo data is set up on every deploy.

### Incomplete or intentionally left out
- Real-time co-editing and presence. Simultaneous edits are detected, not merged.
- Sign-up and password reset (accounts are pre-made); comments; version history; attachments; images and tables in documents.
- No browser end-to-end tests. The UI was verified by hand; the logic and API are covered by automated tests.

### Next 2–4 hours
1. Real-time collaboration with Yjs + Hocuspocus (cursors, presence, merging edits).
2. Version history with restore.
3. Comments on text selections.
4. Playwright end-to-end tests for the editor and sharing flows.
