import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getDb } from "@/db";
import { HttpError, unauthorized } from "@/lib/errors";
import { SESSION_COOKIE, type SessionUser, verifySession } from "@/lib/session";

export async function requireUser(): Promise<SessionUser> {
  const store = await cookies();
  const user = await verifySession(store.get(SESSION_COOKIE)?.value);
  if (!user) throw unauthorized();
  return user;
}

/** Wraps a route handler: injects db, maps errors to JSON responses. */
export function route<Ctx>(fn: (req: Request, ctx: Ctx, db: Awaited<ReturnType<typeof getDb>>) => Promise<Response>) {
  return async (req: Request, ctx: Ctx): Promise<Response> => {
    try {
      return await fn(req, ctx, await getDb());
    } catch (err) {
      if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
      if (err instanceof ZodError) {
        return NextResponse.json({ error: err.issues[0]?.message ?? "Invalid request" }, { status: 400 });
      }
      console.error(err);
      return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }
  };
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new HttpError(400, "Request body must be valid JSON");
  }
}
