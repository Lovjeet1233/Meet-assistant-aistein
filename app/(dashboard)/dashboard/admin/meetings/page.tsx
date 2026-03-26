"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Inbox, Loader2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/Button";
import {
  DataTable,
  DataTableBody,
  DataTableCard,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
} from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";

interface MeetingRow {
  id: string;
  meetingId: string;
  title: string;
  status: string;
  isActive: boolean;
  isReusable: boolean;
  sessionCount: number;
  guestSessionCount: number;
  appointmentBookedSessionCount: number;
  maxSessions: number | null;
  expiresAt: string | null;
  avatarId: string;
  language: string;
  createdAt: string;
  updatedAt: string;
  owner: { id: string; username?: string; email?: string } | null;
}

export default function AdminMeetingsPage() {
  const [meetings, setMeetings] = useState<MeetingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const router = useRouter();

  const load = async () => {
    try {
      const res = await fetch("/api/admin/meetings");
      const data = await res.json();
      if (data.success) {
        setMeetings(data.meetings);
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

  useEffect(() => {
    void load();
  }, []);

  const patchActive = async (id: string, isActive: boolean) => {
    setActionId(id);
    try {
      const res = await fetch(`/api/admin/meetings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.message || "Update failed");
        return;
      }
      await load();
    } catch {
      alert("Request failed");
    } finally {
      setActionId(null);
    }
  };

  const deleteMeeting = async (id: string, title: string) => {
    if (
      !confirm(
        `Delete meeting link "${title}"? Guest conversations stay in the database but are unlinked.`,
      )
    ) {
      return;
    }
    setActionId(id);
    try {
      const res = await fetch(`/api/admin/meetings/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.message || "Delete failed");
        return;
      }
      await load();
    } catch {
      alert("Request failed");
    } finally {
      setActionId(null);
    }
  };

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

  return (
    <div>
      <PageHeader
        title="All meetings"
        subtitle="Meeting links across every user account"
        action={
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push("/dashboard/admin")}
          >
            Back to dashboard
          </Button>
        }
      />

      {meetings.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No meetings found"
          description="There are no meeting links in the system yet."
        />
      ) : (
        <DataTableCard>
          <DataTable>
            <DataTableHead>
              <DataTableHeaderCell>Title</DataTableHeaderCell>
              <DataTableHeaderCell>Path</DataTableHeaderCell>
              <DataTableHeaderCell>Owner</DataTableHeaderCell>
              <DataTableHeaderCell>Sessions</DataTableHeaderCell>
              <DataTableHeaderCell>Avatar</DataTableHeaderCell>
              <DataTableHeaderCell>Created</DataTableHeaderCell>
              <DataTableHeaderCell align="right">Actions</DataTableHeaderCell>
            </DataTableHead>
            <DataTableBody>
              {meetings.map((m) => (
                <DataTableRow key={m.id}>
                  <DataTableCell>
                    <span className="font-medium text-primary">{m.title}</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {m.isActive ? (
                        <Badge variant="active">Active</Badge>
                      ) : (
                        <Badge variant="completed">Off</Badge>
                      )}
                      <Badge variant="neutral">{m.status}</Badge>
                      {!m.isReusable ? (
                        <Badge variant="single-use">Single-use</Badge>
                      ) : null}
                      {m.appointmentBookedSessionCount > 0 ? (
                        <Badge variant="appointment">
                          Appointment ×{m.appointmentBookedSessionCount}
                        </Badge>
                      ) : null}
                    </div>
                  </DataTableCell>
                  <DataTableCell>
                    <code className="text-xs text-tertiary">
                      /meet/{m.meetingId}
                    </code>
                  </DataTableCell>
                  <DataTableCell className="max-w-[140px] truncate">
                    {m.owner ? (m.owner.username ?? m.owner.email) : "—"}
                  </DataTableCell>
                  <DataTableCell>
                    <span className="text-secondary">
                      {m.guestSessionCount}
                    </span>
                    <span className="text-tertiary"> · </span>
                    <span className="text-xs text-tertiary">
                      joins {m.sessionCount}
                      {m.maxSessions != null ? ` / ${m.maxSessions}` : ""}
                    </span>
                  </DataTableCell>
                  <DataTableCell className="max-w-[120px] truncate font-mono text-xs">
                    {m.avatarId}
                  </DataTableCell>
                  <DataTableCell className="whitespace-nowrap text-xs text-tertiary">
                    {format(new Date(m.createdAt), "MMM d, yyyy")}
                  </DataTableCell>
                  <DataTableCell align="right">
                    <div className="flex flex-wrap items-center justify-end gap-1">
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-8 px-3 text-xs"
                        disabled={actionId === m.id}
                        onClick={() =>
                          router.push(`/dashboard/admin/meetings/${m.id}`)
                        }
                      >
                        Sessions
                      </Button>
                      {m.isActive ? (
                        <Button
                          type="button"
                          variant="secondary"
                          className="h-8 px-3 text-xs"
                          disabled={actionId === m.id}
                          onClick={() => void patchActive(m.id, false)}
                        >
                          Deactivate
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="secondary"
                          className="h-8 px-3 text-xs"
                          disabled={actionId === m.id}
                          onClick={() => void patchActive(m.id, true)}
                        >
                          Activate
                        </Button>
                      )}
                      <button
                        type="button"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-40"
                        title="Delete"
                        disabled={actionId === m.id}
                        onClick={() => void deleteMeeting(m.id, m.title)}
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                      </button>
                    </div>
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        </DataTableCard>
      )}

      <p className="mt-4 text-center text-xs text-tertiary">
        Showing up to 200 meetings (newest first)
      </p>
    </div>
  );
}
