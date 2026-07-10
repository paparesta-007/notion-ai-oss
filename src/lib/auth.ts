import { cookies } from "next/headers";
import { encrypt, decrypt } from "./crypto";

const COOKIE_NAME = "notion_session";
const SESSION_DURATION_SECONDS = 3 * 24 * 60 * 60; // 3 days

export interface NotionSession {
  accessToken: string;
  workspaceName?: string;
  workspaceIcon?: string;
  workspaceId?: string;
  ownerName?: string;
  ownerAvatar?: string;
  createdAt: number;
  isMock?: boolean;
}

export function getNotionConfig() {
  const clientId = process.env.NOTION_CLIENT_ID;
  const clientSecret = process.env.NOTION_CLIENT_SECRET;
  const redirectUri = process.env.NOTION_REDIRECT_URI || "http://localhost:3000/api/auth/callback/notion";
  
  const isConfigured = !!(clientId && clientSecret);
  
  return {
    clientId,
    clientSecret,
    redirectUri,
    isConfigured,
  };
}

/**
 * Get the current session from the cookies.
 * Resolves to NotionSession or null if not logged in / expired.
 */
export async function getSession(): Promise<NotionSession | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(COOKIE_NAME);
    
    if (!sessionCookie || !sessionCookie.value) {
      return null;
    }
    
    const decrypted = decrypt(sessionCookie.value);
    const session: NotionSession = JSON.parse(decrypted);
    
    // Check if session has expired (3 days)
    const now = Date.now();
    const ageInSeconds = (now - session.createdAt) / 1000;
    
    if (ageInSeconds > SESSION_DURATION_SECONDS) {
      // Session expired, clear it
      await deleteSession();
      return null;
    }
    
    return session;
  } catch (err) {
    console.error("Failed to retrieve session:", err);
    return null;
  }
}

/**
 * Store the session in a secure HttpOnly cookie lasting for 3 days.
 */
export async function setSession(session: Omit<NotionSession, "createdAt">): Promise<void> {
  const cookieStore = await cookies();
  const sessionData: NotionSession = {
    ...session,
    createdAt: Date.now(),
  };
  
  const encrypted = encrypt(JSON.stringify(sessionData));
  
  cookieStore.set({
    name: COOKIE_NAME,
    value: encrypted,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

/**
 * Remove the session cookie (logout).
 */
export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set({
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0, // Expire immediately
  });
}
