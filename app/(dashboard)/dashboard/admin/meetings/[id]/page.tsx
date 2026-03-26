"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ChevronRight, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

interface TranscriptMessage {
  id: string;
  role: string;
  content: string;
  timestamp: string;
}

interface SessionRow {
  id: string;
  title: string;
  guestName: string | null;
  status: string;
  createdAt: string;
  lastMessageAt: string;
  conversationSummary: string;
  appointmentBooked: boolean | null;
  appointmentCheckedAt: string | null;
  messages: TranscriptMessage[];
}

interface MeetingDetail {
  id: string;
  meetingId: string;
  title: string;
  status: string;
  isActive: boolean;
  isReusable: boolean;
  sessionCount: number;
  owner: { id: string; username?: string; email?: string } | null;
}

export default function AdminMeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [meeting, setMeeting] = useState<MeetingDetail | null>(null);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openSessionId, setOpenSessionId] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch(`/api/admin/meetings/${id}`);
        const data = await res.json();
        if (data.success) {
          setMeeting(data.meeting);
          setSessions(data.sessions);
        } else if (res.status === 403) {
          alert("Admin access required");
          router.push("/dashboard/meetings");
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [id, router]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2
          className="h-8 w-8 animate-spin text-slate-400"
          aria-label="Loading"
        />
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="py-16 text-center">
        <p className="text-red-600">Meeting not found</p>
        <button
          type="button"
          onClick={() => router.push("/dashboard/admin/meetings")}
          className="mt-4 text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          Back to meetings
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap items-center gap-1 text-sm text-tertiary">
        <Link href="/dashboard/admin/meetings" className="hover:text-brand-600">
          All meetings
        </Link>
        <ChevronRight
          className="h-4 w-4 shrink-0"
          strokeWidth={1.75}
          aria-hidden
        />
        <span className="truncate text-primary">{meeting.title}</span>
      </nav>

      <section className="rounded-xl border border-slate-200 bg-primary p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1
              className="text-2xl font-semibold tracking-tight text-primary"
              style={{ letterSpacing: "-0.025em" }}
            >
              {meeting.title}
            </h1>
            <p className="mt-1 font-mono text-sm text-tertiary">
              /meet/{meeting.meetingId}
            </p>
            {meeting.owner ? (
              <p className="mt-2 text-sm text-secondary">
                Owner:{" "}
                <span className="font-medium text-primary">
                  {meeting.owner.username ?? meeting.owner.email}
                </span>
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {meeting.isActive ? (
              <Badge variant="active">Active</Badge>
            ) : (
              <Badge variant="completed">Deactivated</Badge>
            )}
            <Badge variant="neutral">{meeting.status}</Badge>
            {!meeting.isReusable ? (
              <Badge variant="single-use">Single-use</Badge>
            ) : null}
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-primary">
          Guest sessions & transcripts
        </h2>
        {sessions.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-slate-200 bg-primary py-12 text-center text-sm text-secondary">
            No sessions yet
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {sessions.map((s) => {
              const open = openSessionId === s.id;
              const guest = s.guestName || "Guest";
              return (
                <li
                  key={s.id}
                  className="overflow-hidden rounded-xl border border-slate-200 bg-primary shadow-sm"
                >
                  <button
                    type="button"
                    onClick={() => setOpenSessionId(open ? null : s.id)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50"
                  >
                    <div>
                      <p className="font-medium text-primary">{s.title}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-tertiary">
                        <span>{guest}</span>
                        <Badge variant="neutral">{s.status}</Badge>
                        {s.conversationSummary?.trim() &&
                        s.appointmentBooked === true ? (
                          <Badge variant="appointment">
                            Appointment (date and time)
                          </Badge>
                        ) : null}
                        {s.conversationSummary?.trim() &&
                        s.appointmentBooked === false ? (
                          <Badge variant="neutral">
                            No booking in summary
                          </Badge>
                        ) : null}
                        {s.conversationSummary?.trim() &&
                        s.appointmentBooked == null ? (
                          <Badge variant="waiting">AI check pending</Badge>
                        ) : null}
                        <span>
                          {format(
                            new Date(s.createdAt),
                            "MMM d, yyyy · h:mm a",
                          )}
                        </span>
                      </div>
                    </div>
                    <span className="shrink-0 text-xs text-tertiary">
                      {open ? "Hide" : "Show"}
                    </span>
                  </button>
                  {open ? (
                    <div className="border-t border-slate-100 px-4 py-4">
                      {s.conversationSummary ? (
                        <details className="mb-4 rounded-lg bg-slate-50 p-4">
                          <summary className="cursor-pointer text-sm font-medium text-primary">
                            Summary
                          </summary>
                          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-secondary">
                            {s.conversationSummary}
                          </p>
                        </details>
                      ) : null}
                      <p
                        className="mb-3 text-xs font-medium uppercase tracking-wide text-tertiary"
                        style={{ letterSpacing: "0.05em" }}
                      >
                        Transcript
                      </p>
                      <div className="max-h-[480px] space-y-3 overflow-y-auto">
                        {s.messages.length === 0 ? (
                          <p className="text-sm text-tertiary">
                            No messages stored
                          </p>
                        ) : (
                          s.messages.map((msg) => {
                            const isUser = msg.role === "user";
                            const ts = new Date(msg.timestamp);
                            return (
                              <div
                                key={msg.id}
                                className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                              >
                                <div
                                  className={`max-w-[min(100%,420px)] rounded-lg px-3 py-2.5 ${
                                    isUser ? "bg-brand-50" : "bg-slate-50"
                                  }`}
                                >
                                  <div className="mb-1 flex flex-wrap gap-2">
                                    <span className="text-xs font-medium text-secondary">
                                      {isUser ? guest : "Assistant"}
                                    </span>
                                    <time
                                      className="text-xs text-tertiary"
                                      dateTime={ts.toISOString()}
                                    >
                                      {ts.toLocaleString()}
                                    </time>
                                  </div>
                                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-secondary">
                                    {msg.content}
                                  </p>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
