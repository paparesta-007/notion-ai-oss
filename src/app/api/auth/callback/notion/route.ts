import { NextResponse } from "next/server";
import { getNotionConfig, setSession } from "@/lib/auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const isMock = searchParams.get("mock") === "true";
  const error = searchParams.get("error");
  
  if (error) {
    console.error("OAuth error received from provider:", error);
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error)}`, request.url));
  }
  
  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", request.url));
  }
  
  const { clientId, clientSecret, redirectUri, isConfigured } = getNotionConfig();
  
  // 1. Mock Mode Flow
  if (isMock || !isConfigured) {
    await setSession({
      accessToken: "mock_notion_api_token_value_xyz",
      workspaceName: "Notion AI Sandbox Workspace",
      workspaceIcon: "🔮",
      workspaceId: "mock-workspace-id-12345",
      ownerName: "Tommaso",
      ownerAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80",
      isMock: true,
    });
    
    return NextResponse.redirect(new URL("/", request.url));
  }
  
  // 2. Real OAuth Token Exchange Flow
  try {
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    
    const tokenResponse = await fetch("https://api.notion.com/v1/oauth/token", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${basicAuth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: redirectUri,
      }),
    });
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Notion token exchange failed:", errorText);
      return NextResponse.redirect(
        new URL("/login?error=token_exchange_failed", request.url)
      );
    }
    
    const data = await tokenResponse.json();
    
    // Map response to session structure
    await setSession({
      accessToken: data.access_token,
      workspaceName: data.workspace_name || "My Notion Workspace",
      workspaceIcon: data.workspace_icon || "📝",
      workspaceId: data.workspace_id,
      ownerName: data.owner?.user?.name || "Notion User",
      ownerAvatar: data.owner?.user?.avatar_url || null,
      isMock: false,
    });
    
    return NextResponse.redirect(new URL("/", request.url));
  } catch (err) {
    console.error("Exception during token exchange:", err);
    return NextResponse.redirect(new URL("/login?error=exception", request.url));
  }
}
