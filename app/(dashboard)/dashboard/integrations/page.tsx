"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2, Plug } from "lucide-react";
import { Button } from "@/components/Button";
import { PageHeader } from "@/components/ui/PageHeader";

function IntegrationsPageInner() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [banner, setBanner] = useState<{
    kind: "ok" | "err";
    text: string;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/integrations/google/status");
      const data = await res.json();
      if (data.success) {
        setConnected(Boolean(data.connected));
        setEmail(typeof data.email === "string" ? data.email : null);
      }
    } catch {
      setBanner({ kind: "err", text: "Could not load integration status." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (searchParams.get("connected") === "1") {
      setBanner({
        kind: "ok",
        text: "Google Workspace connected. You can send meeting invites from Gmail when creating a link.",
      });
      void load();
    }
    const err = searchParams.get("error");
    if (err) {
      const map: Record<string, string> = {
        access_denied: "Google sign-in was cancelled.",
        google_not_configured:
          "Google OAuth is not configured on the server (missing client id/secret).",
        connect_failed: "Could not start Google sign-in.",
        missing_params: "OAuth callback was missing parameters.",
        invalid_state: "OAuth session expired. Try connecting again.",
        no_tokens: "Google did not return tokens.",
        no_refresh_token:
          "No refresh token received. Disconnect any old access in Google Account permissions and try again.",
        callback_failed: "Something went wrong finishing Google sign-in.",
      };
      setBanner({
        kind: "err",
        text: map[err] || "Connection failed.",
      });
    }
  }, [searchParams, load]);

  const disconnect = async () => {
    if (!confirm("Disconnect Google Workspace? Meeting invite emails will stop working until you connect again."))
      return;
    setDisconnecting(true);
    try {
      const res = await fetch("/api/integrations/google/disconnect", {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        setConnected(false);
        setEmail(null);
        setBanner({ kind: "ok", text: "Google Workspace disconnected." });
      } else {
        setBanner({ kind: "err", text: "Could not disconnect." });
      }
    } catch {
      setBanner({ kind: "err", text: "Could not disconnect." });
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Integrations"
        subtitle="Connect external services used by MeetAssistant"
      />

      {banner ? (
        <div
          className={`mb-6 rounded-xl border px-4 py-3 text-sm ${
            banner.kind === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-950"
              : "border-red-200 bg-red-50 text-red-900"
          }`}
          role="status"
        >
          {banner.text}
        </div>
      ) : null}

      <div className="max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <Plug className="h-5 w-5" strokeWidth={1.75} aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-primary">
              Google Workspace
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-secondary">
              Link your Google account so MeetAssistant can send HTML meeting
              invites through your Gmail when you add an optional recipient on{" "}
              <Link
                href="/dashboard/meetings"
                className="font-medium text-brand-600 hover:text-brand-700"
              >
                Meeting links
              </Link>
              .
            </p>
            {loading ? (
              <div className="mt-4 flex items-center gap-2 text-sm text-tertiary">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Checking status…
              </div>
            ) : connected ? (
              <div className="mt-4 space-y-3">
                <p className="text-sm text-primary">
                  Connected as{" "}
                  <span className="font-medium">
                    {email || "your Google account"}
                  </span>
                  .
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={disconnecting}
                    onClick={() => void disconnect()}
                  >
                    {disconnecting ? "Disconnecting…" : "Disconnect"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-4">
                <a
                  href="/api/integrations/google/connect"
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700"
                >
                  Connect Google
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function IntegrationsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <Loader2
            className="h-8 w-8 animate-spin text-slate-400"
            aria-label="Loading"
          />
        </div>
      }
    >
      <IntegrationsPageInner />
    </Suspense>
  );
}
