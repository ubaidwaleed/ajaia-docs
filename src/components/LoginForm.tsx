"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";

const DEMO_ACCOUNTS = [
  { email: "alice@ajaia.test", name: "Alice", note: "owns the sample docs" },
  { email: "bob@ajaia.test", name: "Bob", note: "editor on “Q3 Planning”" },
  { email: "carol@ajaia.test", name: "Carol", note: "viewer on “Team Handbook”" },
];
const DEMO_PASSWORD = "demo1234";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function login(e: string, p: string) {
    setLoading(true);
    setError(null);
    try {
      await api("/api/auth/login", { method: "POST", json: { email: e, password: p } });
      router.replace("/");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <h1 className="mb-1 text-2xl font-semibold">Ajaia Docs</h1>
      <p className="mb-6 text-sm text-slate-500">Sign in to create, edit and share documents.</p>

      <form
        className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        onSubmit={(ev) => {
          ev.preventDefault();
          login(email, password);
        }}
      >
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Email</span>
          <input
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Password</span>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <div className="mt-6 rounded-xl border border-dashed border-slate-300 p-4 text-sm">
        <p className="mb-2 font-medium">Demo accounts <span className="font-normal text-slate-500">(password: {DEMO_PASSWORD})</span></p>
        <ul className="space-y-1">
          {DEMO_ACCOUNTS.map((a) => (
            <li key={a.email}>
              <button
                type="button"
                disabled={loading}
                onClick={() => login(a.email, DEMO_PASSWORD)}
                className="text-left text-blue-600 hover:underline disabled:opacity-60"
              >
                Sign in as {a.name}
              </button>{" "}
              <span className="text-slate-500">— {a.note}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
