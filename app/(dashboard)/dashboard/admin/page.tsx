'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatsCard } from '@/components/ui/StatsCard';
import { Button } from '@/components/Button';

interface Stats {
  overview: {
    totalUsers: number;
    totalConversations: number;
    totalMessages: number;
    totalKnowledgeBases: number;
    activeUsers: number;
    avgMessagesPerConversation: number;
    totalMeetings: number;
    activeMeetings: number;
    totalGuestSessions: number;
  };
  meetings: {
    totalMeetings: number;
    activeMeetings: number;
    totalGuestSessions: number;
  };
  conversations: {
    active: number;
    completed: number;
  };
  recentActivity: {
    conversationsLast30Days: number;
    messagesLast30Days: number;
  };
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiKey, setApiKey] = useState<string>('');
  const [apiKeySet, setApiKeySet] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [newApiKey, setNewApiKey] = useState('');
  const [updatingApiKey, setUpdatingApiKey] = useState(false);
  const router = useRouter();

  useEffect(() => {
    void fetchStats();
    void fetchApiKey();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/stats');
      const data = await response.json();

      if (data.success) {
        setStats(data.stats);
      } else if (response.status === 403) {
        alert('Admin access required');
        router.push('/dashboard/meetings');
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchApiKey = async () => {
    try {
      const response = await fetch('/api/admin/api-key');
      const data = await response.json();

      if (data.success) {
        setApiKey(data.apiKey);
        setApiKeySet(data.isSet);
      }
    } catch (error) {
      console.error('Failed to fetch API key:', error);
    }
  };

  const handleUpdateApiKey = async () => {
    if (!newApiKey.trim()) {
      alert('Please enter an API key');
      return;
    }

    setUpdatingApiKey(true);
    try {
      const response = await fetch('/api/admin/api-key', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: newApiKey }),
      });

      const data = await response.json();

      if (data.success) {
        alert(data.message);
        setShowApiKeyModal(false);
        setNewApiKey('');
        void fetchApiKey();
      } else {
        alert(data.message || 'Failed to update API key');
      }
    } catch (error) {
      console.error('Failed to update API key:', error);
      alert('An error occurred while updating API key');
    } finally {
      setUpdatingApiKey(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" aria-label="Loading" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="py-16 text-center">
        <p className="text-red-600">Failed to load statistics</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Admin dashboard" subtitle="System overview and statistics" />

      <section className="rounded-xl border border-slate-200 bg-primary p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-primary">HeyGen API key</h2>
            <p className="mt-1 text-sm text-secondary">Used for avatar streaming on the server.</p>
          </div>
          <Button type="button" variant="secondary" onClick={() => setShowApiKeyModal(true)}>
            Update
          </Button>
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 font-mono text-sm text-primary">
            {apiKeySet ? apiKey : 'No API key set'}
          </div>
          {apiKeySet ? (
            <Badge variant="active">Active</Badge>
          ) : (
            <Badge variant="deactivated">Not set</Badge>
          )}
        </div>
      </section>

      <section>
        <h2 className="sr-only">Key metrics</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/dashboard/admin/users"
            className="block cursor-pointer rounded-xl transition-all hover:border-slate-300 hover:shadow-md"
          >
            <StatsCard label="Users" value={stats.overview.totalUsers} />
          </Link>
          <Link
            href="/dashboard/admin/conversations"
            className="block cursor-pointer rounded-xl transition-all hover:border-slate-300 hover:shadow-md"
          >
            <StatsCard label="Conversations" value={stats.overview.totalConversations} />
          </Link>
          <Link
            href="/dashboard/admin/meetings"
            className="block cursor-pointer rounded-xl transition-all hover:border-slate-300 hover:shadow-md"
          >
            <StatsCard label="Meetings" value={stats.overview.totalMeetings} />
          </Link>
          <Link
            href="/dashboard/knowledge-bases"
            className="block cursor-pointer rounded-xl transition-all hover:border-slate-300 hover:shadow-md"
          >
            <StatsCard label="Knowledge bases" value={stats.overview.totalKnowledgeBases} />
          </Link>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-primary p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-primary">System overview</h2>
        <dl className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ['Total users', stats.overview.totalUsers],
            ['Active users (7d)', stats.overview.activeUsers],
            ['Total conversations', stats.overview.totalConversations],
            ['Total messages', stats.overview.totalMessages],
            ['Avg messages / chat', stats.overview.avgMessagesPerConversation],
            ['Knowledge bases', stats.overview.totalKnowledgeBases],
            ['Total meetings', stats.overview.totalMeetings],
            ['Active meeting links', stats.overview.activeMeetings],
            ['Guest sessions', stats.overview.totalGuestSessions],
          ].map(([label, value]) => (
            <div key={String(label)}>
              <dt className="text-[13px] text-tertiary">{label}</dt>
              <dd className="mt-1 text-xl font-semibold text-primary">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-primary p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-primary">Conversations</h2>
          <dl className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <dt className="text-sm text-secondary">Active</dt>
              <dd className="text-xl font-semibold text-primary">{stats.conversations.active}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-sm text-secondary">Completed</dt>
              <dd className="text-xl font-semibold text-primary">{stats.conversations.completed}</dd>
            </div>
          </dl>
        </section>
        <section className="rounded-xl border border-slate-200 bg-primary p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-primary">Recent activity (30 days)</h2>
          <dl className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <dt className="text-sm text-secondary">New conversations</dt>
              <dd className="text-xl font-semibold text-primary">
                {stats.recentActivity.conversationsLast30Days}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-sm text-secondary">Messages sent</dt>
              <dd className="text-xl font-semibold text-primary">
                {stats.recentActivity.messagesLast30Days}
              </dd>
            </div>
          </dl>
        </section>
      </div>

      {showApiKeyModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-primary p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-primary">Update HeyGen API key</h2>
            <p className="mt-2 text-sm leading-relaxed text-secondary">
              Enter your new HeyGen API key. Restart the server if required for changes to apply.
            </p>
            <div className="mt-6">
              <label className="mb-1.5 block text-[13px] font-medium text-slate-600">
                API key <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={newApiKey}
                onChange={(e) => setNewApiKey(e.target.value)}
                placeholder="HeyGen API key"
                className="h-10 w-full rounded-lg border border-slate-200 px-3 font-mono text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
              />
            </div>
            <div className="mt-6 flex gap-3">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  setShowApiKeyModal(false);
                  setNewApiKey('');
                }}
                disabled={updatingApiKey}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                className="flex-1"
                onClick={() => void handleUpdateApiKey()}
                disabled={updatingApiKey}
              >
                {updatingApiKey ? 'Updating…' : 'Update key'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
