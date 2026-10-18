import { NextResponse } from "next/server";
import { loginSchema } from "@/lib/validation";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/session";
import { authenticate } from "@/server/documents";
import { readJson, route } from "@/server/http";

export const POST = route(async (req, _ctx, db) => {
  const { email, password } = loginSchema.parse(await readJson(req));
  const user = await authenticate(db, email, password);
  const res = NextResponse.json({ user });
  res.cookies.set(SESSION_COOKIE, await signSession(user), sessionCookieOptions);
  return res;
});
