'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { format } from 'date-fns';
import { ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/Button';
import { MeetingShareToolkit } from '@/components/meeting/MeetingShareToolkit';
import { Badge } from '@/components/ui/Badge';
import { clientMeetingShareUrl } from '@/lib/meetings/clientMeetingShareUrl';

type TranscriptLine = { role: string; content: string; timestamp: string };

type SessionRow = {
  id: string;
  title: string;
  status: string;
  guestName: string | null;
  createdAt: string;
  lastMessageAt: string;
  conversationSummary?: string;
  messageCount: number;
  durationMs: number;
  transcript: TranscriptLine[];
};

type MeetingDetail = {
  meetingId: string;
  shareUrl: string;
  title: string;
  avatarId: string;
  voiceId?: string;
  language: string;
  knowledgeBaseId: string;
  knowledgeBaseName?: string;
  status: string;
  sessionCount: number;
  createdAt: string;
  isActive: boolean;
};

function formatDuration(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function toCsv(messages: TranscriptLine[]) {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const rows = [['role', 'timestamp', 'content'], ...messages.map((m) => [m.role, m.timestamp, m.content])];
  return rows.map((r) => r.map((c) => esc(String(c))).join(',')).join('\n');
}

export default function MeetingDetailPage() {
  const params = useParams();
  const slug = typeof params?.meetingId === 'string' ? params.meetingId : '';

  const [meeting, setMeeting] = useState<MeetingDetail | null>(null);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [messagesBySession, setMessagesBySession] = useState<Record<string, TranscriptLine[]>>({});
  const [loadingMessages, setLoadingMessages] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<Record<string, string>>({});
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [openaiSummaries, setOpenaiSummaries] = useState(false);

  const load = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    try {
      const [mRes, sRes, fRes] = await Promise.all([
        fetch(`/api/meetings/${encodeURIComponent(slug)}`),
        fetch(`/api/meetings/${encodeURIComponent(slug)}/sessions`),
        fetch('/api/features'),
      ]);
      const mData = await mRes.json();
      const sData = await sRes.json();
      const fData = await fRes.json().catch(() => ({}));
      if (fData.openaiSummaries) setOpenaiSummaries(true);

      if (!mRes.ok || !mData.success) {
        setError(mData.message || 'Meeting not found');
        setMeeting(null);
        setSessions([]);
        return;
      }
      setMeeting({
        meetingId: mData.meeting.meetingId,
        shareUrl: mData.meeting.shareUrl || clientMeetingShareUrl(slug),
        title: mData.meeting.title,
        avatarId: mData.meeting.avatarId,
        voiceId: mData.meeting.voiceId,
        language: mData.meeting.language,
        knowledgeBaseId: mData.meeting.knowledgeBaseId,
        knowledgeBaseName: mData.meeting.knowledgeBaseName,
        status: mData.meeting.status,
        sessionCount: mData.meeting.sessionCount,
        createdAt: mData.meeting.createdAt,
        isActive: mData.meeting.isActive,
      });

      if (sRes.ok && sData.success) {
        const list = sData.sessions as SessionRow[];
        setSessions(list);
        const sum: Record<string, string> = {};
        for (const s of list) {
          if (s.conversationSummary) sum[s.id] = s.conversationSummary;
        }
        setSummaries((prev) => ({ ...sum, ...prev }));
      } else {
        setSessions([]);
      }
    } catch {
      setError('Failed to load meeting');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleSession = async (sessionId: string) => {
    if (expandedId === sessionId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(sessionId);
    if (messagesBySession[sessionId]) return;
    setLoadingMessages(sessionId);
    try {
      const res = await fetch(`/api/conversations/${sessionId}/messages`);
      const data = await res.json();
      if (data.success && Array.isArray(data.messages)) {
        setMessagesBySession((prev) => ({
          ...prev,
          [sessionId]: data.messages.map(
            (msg: { role: string; content: string; timestamp: string }) => ({
              role: msg.role,
              content: msg.content,
              timestamp: msg.timestamp,
            }),
          ),
        }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMessages(null);
    }
  };

  const messagesFor = (s: SessionRow) => messagesBySession[s.id] ?? s.transcript ?? [];

  const exportSession = (s: SessionRow, formatExp: 'txt' | 'csv') => {
    const msgs = messagesFor(s);
    const guest = s.guestName || 'Guest';
    if (formatExp === 'txt') {
      const lines = msgs.map((m) => {
        const t = new Date(m.timestamp).toLocaleString();
        const who = m.role === 'user' ? guest : 'Avatar';
        return `[${t}] ${who}: ${m.content}`;
      });
      downloadText(`session-${s.id.slice(-8)}.txt`, lines.join('\n\n'));
    } else {
      downloadText(`session-${s.id.slice(-8)}.csv`, toCsv(msgs));
    }
  };

  const generateSummary = async (sessionId: string) => {
    setGeneratingId(sessionId);
    try {
      const res = await fetch(`/api/conversations/${sessionId}/generate-summary`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.message || 'Could not generate summary');
        return;
      }
      setSummaries((prev) => ({ ...prev, [sessionId]: data.summary }));
    } catch {
      alert('Failed to generate summary');
    } finally {
      setGeneratingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" aria-label="Loading" />
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div className="py-12">
        <p className="text-sm text-red-600">{error || 'Not found'}</p>
        <Link href="/dashboard/meetings" className="mt-4 inline-block text-sm font-medium text-brand-600 hover:text-brand-700">
          Back to meeting links
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap items-center gap-1 text-sm text-tertiary">
        <Link href="/dashboard/meetings" className="hover:text-brand-600">
          All meetings
        </Link>
        <ChevronRight className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
        <span className="truncate text-primary">{meeting.title}</span>
      </nav>

      <section className="rounded-xl border border-slate-200 bg-primary p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight text-primary" style={{ letterSpacing: '-0.025em' }}>
            {meeting.title}
          </h1>
          <div className="flex flex-wrap gap-2">
            {meeting.isActive ? <Badge variant="active">Active link</Badge> : <Badge variant="completed">Inactive</Badge>}
            <Badge variant="neutral">{meeting.status}</Badge>
          </div>
        </div>
        <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-[13px] text-tertiary">Path</dt>
            <dd className="mt-0.5 font-mono text-sm text-primary">/meet/{meeting.meetingId}</dd>
          </div>
          <div>
            <dt className="text-[13px] text-tertiary">Avatar</dt>
            <dd className="mt-0.5 text-sm font-medium text-primary">{meeting.avatarId}</dd>
          </div>
          <div>
            <dt className="text-[13px] text-tertiary">Knowledge base</dt>
            <dd className="mt-0.5 text-sm text-primary">{meeting.knowledgeBaseName || meeting.knowledgeBaseId}</dd>
          </div>
          <div>
            <dt className="text-[13px] text-tertiary">Language</dt>
            <dd className="mt-0.5 text-sm text-primary">{meeting.language}</dd>
          </div>
          <div>
            <dt className="text-[13px] text-tertiary">Created</dt>
            <dd className="mt-0.5 text-sm text-primary">{format(new Date(meeting.createdAt), 'MMM d, yyyy · h:mm a')}</dd>
          </div>
          <div>
            <dt className="text-[13px] text-tertiary">Total sessions</dt>
            <dd className="mt-0.5 text-sm font-semibold text-primary">{meeting.sessionCount}</dd>
          </div>
        </dl>
        <div className="mt-6 border-t border-slate-100 pt-6">
          <p className="mb-3 text-[13px] font-medium text-slate-600">Guest link & sharing</p>
          <MeetingShareToolkit shareUrl={meeting.shareUrl || clientMeetingShareUrl(meeting.meetingId)} meetingTitle={meeting.title} />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-primary">Sessions</h2>
        {sessions.length === 0 ? (
          <p className="mt-3 text-sm text-secondary">No sessions yet for this meeting.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {sessions.map((s) => {
              const open = expandedId === s.id;
              const msgs = messagesFor(s);
              const guest = s.guestName || 'Guest';
              return (
                <li key={s.id} className="overflow-hidden rounded-xl border border-slate-200 bg-primary shadow-sm">
                  <button
                    type="button"
                    onClick={() => void toggleSession(s.id)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-primary">{guest}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-tertiary">
                        <span>{format(new Date(s.createdAt), 'MMM d, yyyy · h:mm a')}</span>
                        <span className="text-slate-300">·</span>
                        <Badge variant="neutral">{s.status}</Badge>
                        <span>
                          {formatDuration(s.durationMs)} · {s.messageCount} messages
                        </span>
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-tertiary">{open ? 'Hide' : 'Show'}</span>
                  </button>

                  {open ? (
                    <div className="border-t border-slate-100 px-4 py-4">
                      {loadingMessages === s.id ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                        </div>
                      ) : (
                        <>
                          <div className="mb-4 flex flex-wrap gap-2">
                            <Button type="button" variant="secondary" className="h-8 px-3 text-xs" onClick={() => exportSession(s, 'txt')}>
                              Export .txt
                            </Button>
                            <Button type="button" variant="secondary" className="h-8 px-3 text-xs" onClick={() => exportSession(s, 'csv')}>
                              Export .csv
                            </Button>
                            {openaiSummaries ? (
                              <Button
                                type="button"
                                variant="secondary"
                                className="h-8 px-3 text-xs"
                                disabled={generatingId === s.id}
                                onClick={() => void generateSummary(s.id)}
                              >
                                {generatingId === s.id ? 'Generating…' : 'Generate summary'}
                              </Button>
                            ) : null}
                          </div>

                          {(summaries[s.id] || s.conversationSummary) ? (
                            <details className="mb-4 rounded-lg bg-slate-50 p-4">
                              <summary className="cursor-pointer text-sm font-medium text-primary">Summary</summary>
                              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-secondary">
                                {summaries[s.id] || s.conversationSummary}
                              </p>
                            </details>
                          ) : null}

                          <div className="max-h-96 space-y-3 overflow-y-auto py-1">
                            {msgs.length === 0 ? (
                              <p className="text-sm text-tertiary">No messages</p>
                            ) : (
                              msgs.map((m, i) => {
                                const isUser = m.role === 'user';
                                const ts = new Date(m.timestamp);
                                return (
                                  <div
                                    key={i}
                                    className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                                  >
                                    <div
                                      className={`max-w-[min(100%,520px)] rounded-lg px-3 py-2.5 ${
                                        isUser ? 'bg-brand-50' : 'bg-slate-50'
                                      }`}
                                    >
                                      <div className="mb-1 flex flex-wrap items-baseline gap-2">
                                        <span className="text-xs font-medium text-secondary">
                                          {isUser ? guest : 'Assistant'}
                                        </span>
                                        <time className="text-xs text-tertiary" dateTime={ts.toISOString()}>
                                          {ts.toLocaleTimeString([], {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            second: '2-digit',
                                          })}
                                        </time>
                                      </div>
                                      <p className="text-sm leading-relaxed text-secondary whitespace-pre-wrap">{m.content}</p>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </>
                      )}
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
