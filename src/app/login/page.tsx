import React from "react";
import Link from "next/link";
import { getNotionConfig } from "@/lib/auth";
import { NotionLogo } from "@/components/notion-logo";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function LoginPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : null;
  const { isConfigured } = getNotionConfig();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 py-12 text-[#37352f] antialiased">
      <div className="w-full max-w-[360px] flex flex-col items-center">
        
        {/* Notion Logo Icon Block */}
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-black text-white p-2">
          <NotionLogo size={36} className="text-white" />
        </div>

        {/* Title & Subtitle */}
        <h1 className="text-center text-[28px] font-bold tracking-tight text-[#1a1a1a] leading-tight">
          Your AI workspace.
        </h1>
        <h2 className="mt-1 text-center text-[18px] text-[#7a7a78] font-normal leading-snug">
          Log in to your Notion account
        </h2>

        {/* Error Alert */}
        {error && (
          <div className="mt-6 w-full rounded-lg border border-red-200 bg-red-50 p-3 text-center text-sm text-red-600">
            {error === "oauth_failed"
              ? "OAuth authorization failed. Please try again."
              : error === "token_exchange_failed"
              ? "Failed to exchange OAuth code for token. Check credentials."
              : `Login error: ${error}`}
          </div>
        )}

        {/* Configuration Notice for Sandbox Mode */}
        {!isConfigured && (
          <div className="mt-6 w-full rounded-xl border border-amber-200 bg-amber-50/50 p-4 text-left text-xs leading-relaxed text-amber-800 shadow-sm">
            <p className="font-semibold flex items-center gap-1.5 text-amber-900 mb-1">
              ✨ Notion AI Sandbox Mode Active
            </p>
            We couldn&apos;t find <code className="bg-amber-100/80 px-1 py-0.5 rounded font-mono">NOTION_CLIENT_ID</code> and <code className="bg-amber-100/80 px-1 py-0.5 rounded font-mono">NOTION_CLIENT_SECRET</code> in your local environment variables. 
            <span className="block mt-1 font-medium text-amber-950">
              Clicking &quot;Continue&quot; will simulate a login with a sandbox account so you can preview the workspace dashboard.
            </span>
          </div>
        )}

        {/* Main Action Form */}
        <div className="mt-8 w-full">
          <Link
            href={isConfigured ? "/api/auth/notion" : "/api/auth/notion?mock=true"}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#2383e2] h-[46px] text-sm font-semibold text-white transition-all hover:bg-[#1f75cb] active:scale-[0.98] shadow-sm select-none"
          >
            Continue
          </Link>
        </div>

        {/* Divider (Optional but helps mimic the image) */}
        <div className="relative mt-8 w-full flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#e3e2e0]"></div>
          </div>
          <span className="relative bg-white px-4 text-xs text-[#7a7a78] font-normal uppercase tracking-wider">
            Secure OAuth 2.0 connection
          </span>
        </div>

        {/* Terms Footer */}
        <p className="mt-8 text-center text-[11px] leading-relaxed text-[#7c7b77]">
          By continuing, you acknowledge that you understand and agree to the{" "}
          <a href="#" className="underline hover:text-[#37352f]">
            Terms & Conditions
          </a>{" "}
          and{" "}
          <a href="#" className="underline hover:text-[#37352f]">
            Privacy Policy
          </a>
          .
        </p>

        {/* Setup Help Instructions (Hidden if configured) */}
        {!isConfigured && (
          <div className="mt-12 w-full text-center border-t border-[#f1f1ef] pt-6">
            <span className="text-[11px] font-semibold tracking-wider text-[#a4a3a1] uppercase block mb-3">
              How to configure real OAuth
            </span>
            <div className="text-left text-xs text-[#7a7a78] space-y-2 bg-[#f7f7f5] p-3 rounded-lg border border-[#edece9] leading-relaxed font-mono">
              <div>1. Create a public integration at <a href="https://developers.notion.com" target="_blank" className="underline hover:text-[#37352f]">developers.notion.com</a></div>
              <div>2. Set redirect URI to: <br/><code className="bg-white/80 px-1 py-0.5 rounded break-all">http://localhost:3000/api/auth/callback/notion</code></div>
              <div>3. Create <code className="bg-white/80 px-1 py-0.5 rounded">.env.local</code> file and add:
                <pre className="mt-1.5 p-1.5 bg-[#f1f1ef] rounded overflow-x-auto text-[10px] leading-none whitespace-pre select-all">
{`NOTION_CLIENT_ID=your_client_id
NOTION_CLIENT_SECRET=your_client_secret
SESSION_SECRET=your_32_char_secret`}
                </pre>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
