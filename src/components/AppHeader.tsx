"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export interface Me {
  id: string;
  name: string;
  email: string;
}

export function useMe() {
  const [me, setMe] = useState<Me | null>(null);
  useEffect(() => {
    api<{ user: Me }>("/api/auth/me").then((r) => setMe(r.user), () => {});
  }, []);
  return me;
}

export function AppHeader({ children }: { children?: React.ReactNode }) {
  const me = useMe();
  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-2.5">
      <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold" title="All documents">
        <span className="grid h-7 w-7 place-items-center rounded-md bg-blue-600 text-sm text-white">A</span>
        <span className="hidden sm:inline">Ajaia Docs</span>
      </Link>
      <div className="flex min-w-0 flex-1 items-center gap-3">{children}</div>
      {me && (
        <div className="flex shrink-0 items-center gap-3 text-sm">
          <span className="hidden text-slate-600 md:inline" title={me.email}>
            {me.name}
          </span>
          <button
            onClick={async () => {
              await api("/api/auth/logout", { method: "POST" }).catch(() => {});
              // Full reload on purpose: drops all client state from the previous user.
              // eslint-disable-next-line @next/next/no-location-assign-relative-destination
              window.location.href = "/login";
            }}
            className="rounded-md px-2 py-1 text-slate-600 hover:bg-slate-100"
          >
            Sign out
          </button>
        </div>
      )}
    </header>
  );
}
