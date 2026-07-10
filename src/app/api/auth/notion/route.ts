import { NextResponse } from "next/server";
import { getNotionConfig } from "@/lib/auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const forceMock = searchParams.get("mock") === "true";
  
  const { clientId, redirectUri, isConfigured } = getNotionConfig();
  
  // If not configured or mock is requested, redirect to mock flow callback
  if (!isConfigured || forceMock) {
    const callbackUrl = new URL("/api/auth/callback/notion", request.url);
    callbackUrl.searchParams.set("code", "mock_authorization_code_123");
    callbackUrl.searchParams.set("mock", "true");
    return NextResponse.redirect(callbackUrl);
  }
  
  // Real Notion OAuth redirect
  const notionAuthUrl = `https://api.notion.com/v1/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&response_type=code&owner=user`;
  
  return NextResponse.redirect(notionAuthUrl);
}
