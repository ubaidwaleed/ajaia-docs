"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ShareRole } from "@/db/schema";
import { api } from "@/lib/api";

interface Share {
  role: ShareRole;
  user: { id: string; name: string; email: string };
}

export function ShareDialog({ docId, onClose }: { docId: string; onClose: () => void }) {
  const [shares, setShares] = useState<Share[] | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<ShareRole>("editor");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);

  const load = useCallback(() => {
    api<{ shares: Share[] }>(`/api/documents/${docId}/shares`).then(
      (r) => setShares(r.shares),
      (e: Error) => setError(e.message),
    );
  }, [docId]);

  useEffect(() => {
    dialog.current?.showModal();
    load();
  }, [load]);

  async function share(targetEmail: string, targetRole: ShareRole) {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/documents/${docId}/shares`, { method: "POST", json: { email: targetEmail, role: targetRole } });
      setEmail("");
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function revoke(userId: string) {
    setError(null);
    try {
      await api(`/api/documents/${docId}/shares/${userId}`, { method: "DELETE" });
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onClick={(e) => e.target === dialog.current && dialog.current?.close()}
      className="m-auto w-full max-w-md rounded-xl p-0 shadow-xl backdrop:bg-slate-900/40"
    >
      <div className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Share document</h2>
          <button onClick={() => dialog.current?.close()} aria-label="Close" className="rounded px-2 text-xl text-slate-500 hover:bg-slate-100">
            ×
          </button>
        </div>

        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            share(email, role);
          }}
        >
          <input
            type="email"
            required
            placeholder="Email, e.g. bob@ajaia.test"
            aria-label="Email to share with"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          <select
            aria-label="Permission"
            value={role}
            onChange={(e) => setRole(e.target.value as ShareRole)}
            className="rounded-md border border-slate-300 px-2 text-sm"
          >
            <option value="editor">Can edit</option>
            <option value="viewer">Can view</option>
          </select>
          <button disabled={busy} className="rounded-md bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
            {busy ? "…" : "Share"}
          </button>
        </form>
        {error && (
          <p role="alert" className="mt-2 text-sm text-red-600">
            {error}
          </p>
        )}

        <h3 className="mb-2 mt-5 text-sm font-medium text-slate-600">People with access</h3>
        {!shares ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : shares.length === 0 ? (
          <p className="text-sm text-slate-500">Only you can see this document.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {shares.map((s) => (
              <li key={s.user.id} className="flex items-center gap-2 py-2 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{s.user.name}</div>
                  <div className="truncate text-xs text-slate-500">{s.user.email}</div>
                </div>
                <select
                  aria-label={`Permission for ${s.user.name}`}
                  value={s.role}
                  onChange={(e) => share(s.user.email, e.target.value as ShareRole)}
                  className="rounded border border-slate-200 px-1 py-0.5 text-xs"
                >
                  <option value="editor">Can edit</option>
                  <option value="viewer">Can view</option>
                </select>
                <button onClick={() => revoke(s.user.id)} className="rounded px-2 py-0.5 text-xs text-red-600 hover:bg-red-50">
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-xs text-slate-400">Demo users: alice@ajaia.test, bob@ajaia.test, carol@ajaia.test</p>
      </div>
    </dialog>
  );
}
