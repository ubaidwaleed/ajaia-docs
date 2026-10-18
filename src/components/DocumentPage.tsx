"use client";

import { Placeholder } from "@tiptap/extensions";
import { EditorContent, type JSONContent, useEditor } from "@tiptap/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Access } from "@/lib/access";
import { api, ApiError } from "@/lib/api";
import { editorExtensions } from "@/lib/editor-extensions";
import { htmlToMarkdown, markdownFilename } from "@/lib/export";
import { AppHeader } from "./AppHeader";
import { RoleBadge } from "./RoleBadge";
import { ShareDialog } from "./ShareDialog";
import { Toolbar } from "./Toolbar";

interface Doc {
  id: string;
  title: string;
  content: JSONContent;
  updatedAt: string;
  access: Access;
  owner: { id: string; name: string; email: string };
}

export function DocumentPage() {
  const { id } = useParams<{ id: string }>();
  const [doc, setDoc] = useState<Doc | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    api<Doc>(`/api/documents/${id}`).then(setDoc, (e: ApiError) =>
      setLoadError(e.status === 404 ? "This document does not exist or you do not have access to it." : e.message),
    );
  }, [id]);

  if (loadError) {
    return (
      <>
        <AppHeader />
        <main className="mx-auto max-w-md flex-1 px-4 py-20 text-center">
          <p className="mb-4 text-slate-600">{loadError}</p>
          <Link href="/" className="text-blue-600 hover:underline">
            ← Back to documents
          </Link>
        </main>
      </>
    );
  }
  if (!doc) {
    return (
      <>
        <AppHeader />
        <p className="p-8 text-center text-sm text-slate-500">Loading document…</p>
      </>
    );
  }
  return <Editor doc={doc} />;
}

type SaveStatus = "saved" | "dirty" | "saving" | "error" | "conflict";

const AUTOSAVE_MS = 800;

function Editor({ doc }: { doc: Doc }) {
  const editable = doc.access !== "viewer";
  const [title, setTitle] = useState(doc.title);
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  // Save queue: changes accumulate in `pending`; only one PATCH is in flight at a time.
  const pending = useRef<{ title?: string; content?: JSONContent }>({});
  const baseUpdatedAt = useRef(doc.updatedAt);
  const inFlight = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blocked = useRef(false); // set on conflict: stop saving until reload
  const flushRef = useRef<() => void>(() => {}); // lets flush re-schedule itself

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (inFlight.current || blocked.current || Object.keys(pending.current).length === 0) return;

    const changes = pending.current;
    pending.current = {};
    inFlight.current = true;
    setStatus("saving");
    try {
      const res = await api<{ updatedAt: string }>(`/api/documents/${doc.id}`, {
        method: "PATCH",
        json: { ...changes, baseUpdatedAt: baseUpdatedAt.current },
      });
      baseUpdatedAt.current = res.updatedAt;
      setErrorMsg(null);
      setStatus(Object.keys(pending.current).length ? "dirty" : "saved");
    } catch (e) {
      // Put the failed changes back (newer edits win) so a retry sends them.
      pending.current = { ...changes, ...pending.current };
      const err = e as ApiError;
      if (err.status === 409) blocked.current = true;
      setStatus(err.status === 409 ? "conflict" : "error");
      setErrorMsg(err.message);
    } finally {
      inFlight.current = false;
    }
    if (Object.keys(pending.current).length && !blocked.current && timer.current === null) {
      timer.current = setTimeout(() => flushRef.current(), AUTOSAVE_MS);
    }
  }, [doc.id]);

  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  const queue = useCallback(
    (change: { title?: string; content?: JSONContent }) => {
      Object.assign(pending.current, change);
      if (blocked.current) return;
      setStatus("dirty");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, AUTOSAVE_MS);
    },
    [flush],
  );

  const editor = useEditor({
    extensions: [
      ...editorExtensions,
      Placeholder.configure({ placeholder: editable ? "Start writing…" : "This document is empty." }),
    ],
    content: doc.content,
    editable,
    immediatelyRender: false, // avoid SSR hydration mismatch
    onUpdate: ({ editor }) => queue({ content: editor.getJSON() }),
    editorProps: { attributes: { "aria-label": "Document content" } },
  });

  // Warn before leaving with unsaved changes; save immediately on tab hide.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (Object.keys(pending.current).length || inFlight.current) e.preventDefault();
    };
    const onHide = () => document.visibilityState === "hidden" && flush();
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [flush]);

  function onTitleChange(value: string) {
    setTitle(value);
    if (value.trim()) queue({ title: value.trim() });
  }

  return (
    <>
      <AppHeader>
        <input
          aria-label="Document title"
          value={title}
          readOnly={!editable}
          maxLength={200}
          onChange={(e) => onTitleChange(e.target.value)}
          onBlur={() => {
            if (!title.trim()) setTitle(doc.title);
            flush();
          }}
          onKeyDown={(e) => e.key === "Enter" && (e.currentTarget.blur(), editor?.commands.focus())}
          className="min-w-0 flex-1 truncate rounded px-2 py-1 text-base font-medium outline-none hover:bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-100 read-only:hover:bg-transparent"
        />
        <SaveIndicator status={status} editable={editable} />
        <RoleBadge access={doc.access} />
        <button
          onClick={() => editor && downloadMarkdown(title || doc.title, editor.getHTML())}
          disabled={!editor}
          title="Download as Markdown"
          className="hidden shrink-0 rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50 sm:block"
        >
          Export .md
        </button>
        {doc.access === "owner" && (
          <button
            onClick={() => setShareOpen(true)}
            className="shrink-0 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            Share
          </button>
        )}
      </AppHeader>

      {editable && editor && (
        <div className="sticky top-[49px] z-10 border-b border-slate-200 bg-white/95 px-4 py-1.5 backdrop-blur">
          <div className="mx-auto max-w-3xl">
            <Toolbar editor={editor} />
          </div>
        </div>
      )}

      <main className="flex-1 px-4 py-8">
        <div className="mx-auto max-w-3xl space-y-4">
          {!editable && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              You have view-only access. Owned by {doc.owner.name}.
            </div>
          )}
          {doc.access === "editor" && (
            <p className="text-xs text-slate-500">Shared with you by {doc.owner.name} · you can edit</p>
          )}
          {(status === "error" || status === "conflict") && errorMsg && (
            <div role="alert" className="flex items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <span>{status === "error" ? `Couldn't save: ${errorMsg}` : errorMsg}</span>
              {status === "error" ? (
                <button onClick={flush} className="font-medium underline">
                  Retry
                </button>
              ) : (
                <button onClick={() => window.location.reload()} className="font-medium underline">
                  Reload
                </button>
              )}
            </div>
          )}
          <article className="doc-content min-h-[70vh] rounded-lg border border-slate-200 bg-white px-6 py-8 shadow-sm sm:px-12 sm:py-12">
            <EditorContent editor={editor} />
          </article>
        </div>
      </main>

      {shareOpen && <ShareDialog docId={doc.id} onClose={() => setShareOpen(false)} />}
    </>
  );
}

function downloadMarkdown(title: string, html: string) {
  const blob = new Blob([htmlToMarkdown(html)], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = markdownFilename(title);
  a.click();
  URL.revokeObjectURL(url);
}

function SaveIndicator({ status, editable }: { status: SaveStatus; editable: boolean }) {
  if (!editable) return null;
  const text = {
    saved: "Saved",
    dirty: "Unsaved changes",
    saving: "Saving…",
    error: "Save failed",
    conflict: "Out of date",
  }[status];
  const color = status === "error" || status === "conflict" ? "text-red-600" : "text-slate-500";
  return (
    <span aria-live="polite" className={`hidden shrink-0 text-xs sm:inline ${color}`}>
      {text}
    </span>
  );
}
