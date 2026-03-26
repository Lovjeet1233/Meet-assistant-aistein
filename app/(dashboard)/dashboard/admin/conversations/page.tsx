"use client";

import {
  Suspense,
  useCallback,
  useDeferredValue,
  useEffect,
  useState,
} from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";

type AppointmentFilter =
  | "all"
  | "booked"
  | "not_booked"
  | "pending"
  | "no_summary";

interface MeetingRef {
  id: string;
  title?: string;
  meetingId?: string;
}

interface AdminConversationRow {
  id: string;
  title: string;
  guestName: string | null;
  avatarId: string;
  status: string;
  createdAt: string;
  lastMessageAt: string;
  messageCount: number;
  conversationSummary: string;
  appointmentBooked: boolean | null;
  appointmentCheckedAt: string | null;
  knowledgeBase: { id: string; name?: string } | null;
  user: { id: string; username?: string; email?: string } | null;
  meeting: MeetingRef | null;
}

function AdminConversationsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId");

  /**
   * URL query is unreliable on the first SSR paint vs client (static shell / searchParams timing).
   * Use this for any conditional UI so server HTML matches the client's first hydration frame.
   */
  const [clientUserId, setClientUserId] = useState<string | null>(null);

  /** Must not depend on `userId` for initial state — searchParams can differ SSR vs client (hydration #418). */
  const [scope, setScope] = useState<"meetings" | "all">("meetings");
  const [appointment, setAppointment] = useState<AppointmentFilter>("all");
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDeferredValue(searchInput);

  const [conversations, setConversations] = useState<AdminConversationRow[]>(
    [],
  );
  const [openaiConfigured, setOpenaiConfigured] = useState(true);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);

  useEffect(() => {
    setClientUserId(userId);
  }, [userId]);

  const load = useCallback(async () => {
    setLoading(true);
    setScanResult(null);
    try {
      const params = new URLSearchParams();
      if (userId) params.set("userId", userId);
      params.set("scope", userId ? "all" : scope);
      params.set("appointment", appointment);
      if (debouncedSearch.trim()) params.set("q", debouncedSearch.trim());

      const response = await fetch(`/api/admin/conversations?${params}`);
      const data = await response.json();

      if (data.success) {
        setConversations(data.conversations);
        setOpenaiConfigured(data.openaiConfigured !== false);
      } else if (response.status === 403) {
        alert("Admin access required");
        router.push("/dashboard");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [userId, scope, appointment, debouncedSearch, router]);

  useEffect(() => {
    void load();
  }, [load]);

  const runAiScan = async (forceOverwrite: boolean) => {
    setScanning(true);
    setScanResult(null);
    try {
      const res = await fetch("/api/admin/conversations/analyze-appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          limit: forceOverwrite ? 40 : 30,
          force: forceOverwrite,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setScanResult(data.message || "Scan failed");
        return;
      }
      setScanResult(
        `Processed ${data.processed as number}: updated ${data.updated as number}, skipped ${data.skipped as number}.`,
      );
      await load();
    } catch {
      setScanResult("Scan request failed");
    } finally {
      setScanning(false);
    }
  };

  const apptBadge = (row: AdminConversationRow) => {
    if (!row.conversationSummary?.trim()) {
      return <Badge variant="neutral">No summary</Badge>;
    }
    if (row.appointmentBooked === true) {
      return (
        <Badge variant="appointment">Appointment (date and time)</Badge>
      );
    }
    if (row.appointmentBooked === false) {
      return <Badge variant="neutral">No booking in summary</Badge>;
    }
    return <Badge variant="waiting">AI check pending</Badge>;
  };

  return (
    <div>
      <PageHeader
        title={clientUserId ? "User conversations" : "Conversations"}
        subtitle={
          clientUserId
            ? "Filtered to the selected user"
            : "Guest meeting sessions with summaries, appointment tags, and search"
        }
        action={
          <div className="flex flex-wrap gap-2">
            {clientUserId ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.push("/dashboard/admin/users")}
              >
                Back to users
              </Button>
            ) : null}
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push("/dashboard/admin")}
            >
              Admin dashboard
            </Button>
          </div>
        }
      />

      {!openaiConfigured ? (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Set <code className="font-mono text-xs">OPENAI_API_KEY</code> in your
          environment to classify appointments and generate AI summaries.
        </p>
      ) : null}

      <div className="mb-6 space-y-4 rounded-xl border border-slate-200 bg-primary p-4 shadow-sm">
        {clientUserId ? (
          <p className="text-sm text-secondary">
            Scope:{" "}
            <span className="font-medium text-primary">All conversations</span>{" "}
            (user filter)
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            <span className="w-full text-xs font-medium uppercase tracking-wide text-tertiary">
              Scope
            </span>
            {(["meetings", "all"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setScope(s)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  scope === s
                    ? "bg-brand-600 text-white"
                    : "bg-slate-100 text-secondary hover:bg-slate-200"
                }`}
              >
                {s === "meetings" ? "Meeting guests only" : "All conversations"}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <span className="w-full text-xs font-medium uppercase tracking-wide text-tertiary">
            Appointment filter
          </span>
          {(
            [
              ["all", "All"],
              ["booked", "Booked"],
              ["not_booked", "Not booked"],
              ["pending", "Pending check"],
              ["no_summary", "No summary"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setAppointment(value)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                appointment === value
                  ? "bg-brand-600 text-white"
                  : "bg-slate-100 text-secondary hover:bg-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-slate-600">
            Search title, guest, or summary
          </label>
          <Input
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Type to filter…"
          />
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 pt-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              disabled={scanning || !openaiConfigured}
              onClick={() => void runAiScan(false)}
            >
              {scanning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  Scanning…
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" aria-hidden />
                  Scan new summaries
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={scanning || !openaiConfigured}
              onClick={() => void runAiScan(true)}
            >
              Re-scan &amp; overwrite tags
            </Button>
          </div>
          <p className="text-xs text-tertiary">
            <strong>Scan new</strong> — up to 30 meeting conversations with a
            summary that were never classified.{" "}
            <strong>Re-scan &amp; overwrite</strong> — re-runs OpenAI on up to
            40 conversations (including ones already tagged) so updated rules
            apply.
          </p>
        </div>
        {scanResult ? (
          <p className="text-sm text-secondary" role="status">
            {scanResult}
          </p>
        ) : null}
      </div>

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2
            className="h-8 w-8 animate-spin text-slate-400"
            aria-label="Loading"
          />
        </div>
      ) : conversations.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 py-16 text-center text-sm text-secondary">
          No conversations match these filters.
        </p>
      ) : (
        <ul className="space-y-3">
          {conversations.map((conv) => (
            <li
              key={conv.id}
              className="rounded-xl border border-slate-200 bg-primary p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-primary">{conv.title}</h3>
                    <Badge
                      variant={
                        conv.status === "active" ? "active" : "completed"
                      }
                    >
                      {conv.status}
                    </Badge>
                    {apptBadge(conv)}
                  </div>
                  <div className="mt-2 grid gap-1 text-sm text-secondary sm:grid-cols-2">
                    {conv.guestName ? (
                      <p>
                        <span className="font-medium text-primary">Guest:</span>{" "}
                        {conv.guestName}
                      </p>
                    ) : null}
                    {conv.user ? (
                      <p>
                        <span className="font-medium text-primary">User:</span>{" "}
                        {conv.user.username ?? conv.user.email}
                      </p>
                    ) : null}
                    {conv.meeting ? (
                      <p className="sm:col-span-2">
                        <span className="font-medium text-primary">
                          Meeting:
                        </span>{" "}
                        <Link
                          href={`/dashboard/admin/meetings/${conv.meeting!.id}`}
                          className="text-brand-600 hover:text-brand-700"
                        >
                          {conv.meeting.title ?? "Untitled"}
                        </Link>
                        {conv.meeting.meetingId ? (
                          <span className="ml-1 font-mono text-xs text-tertiary">
                            /meet/{conv.meeting.meetingId}
                          </span>
                        ) : null}
                      </p>
                    ) : null}
                    <p>
                      <span className="font-medium text-primary">Avatar:</span>{" "}
                      <span className="font-mono text-xs">{conv.avatarId}</span>
                    </p>
                    <p>
                      <span className="font-medium text-primary">
                        Messages:
                      </span>{" "}
                      {conv.messageCount}
                    </p>
                    <p className="text-xs text-tertiary sm:col-span-2">
                      Last activity:{" "}
                      <time
                        dateTime={conv.lastMessageAt}
                        suppressHydrationWarning
                      >
                        {format(
                          new Date(conv.lastMessageAt),
                          "MMM d, yyyy · h:mm a",
                        )}
                      </time>
                    </p>
                  </div>
                  {conv.conversationSummary?.trim() ? (
                    <details className="mt-3 rounded-lg bg-slate-50 p-3">
                      <summary className="cursor-pointer text-sm font-medium text-primary">
                        Summary
                      </summary>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-secondary">
                        {conv.conversationSummary}
                      </p>
                    </details>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-col gap-2">
                  {conv.meeting ? (
                    <Button
                      type="button"
                      variant="secondary"
                      className="whitespace-nowrap"
                      onClick={() =>
                        router.push(
                          `/dashboard/admin/meetings/${conv.meeting!.id}`,
                        )
                      }
                    >
                      Meeting detail
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="secondary"
                    className="whitespace-nowrap"
                    onClick={() => router.push(`/dashboard/chats/${conv.id}`)}
                  >
                    Open chat
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 text-center text-xs text-tertiary">
        Showing {conversations.length} conversation
        {conversations.length === 1 ? "" : "s"} (max 150 per request).
      </p>
    </div>
  );
}

export default function AdminConversationsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2
            className="h-8 w-8 animate-spin text-slate-400"
            aria-label="Loading"
          />
        </div>
      }
    >
      <AdminConversationsContent />
    </Suspense>
  );
}
