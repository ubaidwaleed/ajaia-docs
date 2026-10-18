import { NextResponse } from "next/server";
import { requireUser, route } from "@/server/http";

export const GET = route(async () => NextResponse.json({ user: await requireUser() }));
