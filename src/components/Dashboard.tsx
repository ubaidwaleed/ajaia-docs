"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Access } from "@/lib/access";
import { api } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import { AppHeader } from "./AppHeader";
import { RoleBadge } from "./RoleBadge";

interface DocSummary {
  id: string;
  title: string;
  updatedAt: string;
  access: Access;
  owner: { id: string; name: string; email: string };
}

interface DocLists {
  owned: DocSummary[];
  shared: DocSummary[];
}

export function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState<DocLists | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | "create" | "import">(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    api<DocLists>("/api/documents").then(setData, (e: Error) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  async function createDoc() {
    setBusy("create");
    setError(null);
    try {
      const { id } = await api<{ id: string }>("/api/documents", { method: "POST", json: {} });
      router.push(`/docs/${id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    }
  }

  async function importFile(file: File) {
    setBusy("import");
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const { id } = await api<{ id: string }>("/api/documents/import", { method: "POST", body });
      router.push(`/docs/${id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    } finally {
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function deleteDoc(doc: DocSummary) {
    if (!confirm(`Delete "${doc.title}"? This cannot be undone.`)) return;
    try {
      await api(`/api/documents/${doc.id}`, { method: "DELETE" });
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Documents</h1>
            <p className="text-sm text-slate-500">Create a new document or import an existing file.</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex gap-2">
              <button
                onClick={() => fileInput.current?.click()}
                disabled={busy !== null}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-60"
              >
                {busy === "import" ? "Importing…" : "Import file"}
              </button>
              <button
                onClick={createDoc}
                disabled={busy !== null}
                className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {busy === "create" ? "Creating…" : "+ New document"}
              </button>
            </div>
            <span className="text-xs text-slate-500">Import supports .txt, .md and .docx (max 2 MB)</span>
            <input
              ref={fileInput}
              type="file"
              accept=".txt,.md,.docx"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && importFile(e.target.files[0])}
            />
          </div>
        </div>

        {error && (
          <div role="alert" className="mb-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {!data && !error && <p className="text-sm text-slate-500">Loading documents…</p>}

        {data && (
          <div className="space-y-10">
            <DocSection
              title="My documents"
              empty="You have not created any documents yet. Create one or import a file to get started."
              docs={data.owned}
              onDelete={deleteDoc}
            />
            <DocSection title="Shared with me" empty="Nothing has been shared with you yet." docs={data.shared} showOwner />
          </div>
        )}
      </main>
    </>
  );
}

function DocSection({
  title,
  empty,
  docs,
  showOwner,
  onDelete,
}: {
  title: string;
  empty: string;
  docs: DocSummary[];
  showOwner?: boolean;
  onDelete?: (d: DocSummary) => void;
}) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
        {title} <span className="font-normal">({docs.length})</span>
      </h2>
      {docs.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">{empty}</p>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white">
          {docs.map((d) => (
            <li key={d.id} className="group flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
              <span aria-hidden className="text-lg">
                📄
              </span>
              <Link href={`/docs/${d.id}`} className="min-w-0 flex-1">
                <span className="block truncate font-medium">{d.title}</span>
                <span className="block text-xs text-slate-500">
                  {showOwner ? `Owned by ${d.owner.name} · ` : ""}Edited {timeAgo(d.updatedAt)}
                </span>
              </Link>
              <RoleBadge access={d.access} />
              {onDelete && (
                <button
                  onClick={() => onDelete(d)}
                  className="rounded px-2 py-1 text-xs text-slate-400 hover:bg-red-50 hover:text-red-600 sm:opacity-0 sm:focus:opacity-100 sm:group-hover:opacity-100"
                  aria-label={`Delete ${d.title}`}
                >
                  Delete
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
