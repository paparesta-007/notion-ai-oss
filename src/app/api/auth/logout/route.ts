import { NextResponse } from "next/server";
import { deleteSession } from "@/lib/auth";

export async function GET(request: Request) {
  await deleteSession();
  return NextResponse.redirect(new URL("/login", request.url));
}
export async function POST(request: Request) {
  await deleteSession();
  return NextResponse.redirect(new URL("/login", request.url));
}
