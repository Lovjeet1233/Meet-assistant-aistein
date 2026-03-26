'use client';

import Link from 'next/link';
import { LogOut } from 'lucide-react';

function formatDuration(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  const ss = s % 60;
  if (h > 0) {
    return `${h}h ${mm}m ${ss}s`;
  }
  if (m > 0) {
    return `${m}m ${ss}s`;
  }
  return `${ss}s`;
}

export function MeetSessionLeftScreen({
  durationMs,
  canRejoin,
  onRejoin,
  homeHref = '/',
}: {
  durationMs: number;
  canRejoin: boolean;
  onRejoin: () => void;
  homeHref?: string;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#202124] px-6 py-12 text-white">
      <div className="w-full max-w-md text-center">
        <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-[#3C4043]">
          <LogOut className="h-8 w-8 text-[#9AA0A6]" strokeWidth={1.5} aria-hidden />
        </div>
        <h1 className="text-2xl font-semibold text-white">You left the meeting</h1>
        <p className="mt-2 text-sm text-[#9AA0A6]">
          Session duration:{' '}
          <span className="font-medium text-white">{formatDuration(durationMs)}</span>
        </p>

        <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
          {canRejoin ? (
            <button
              type="button"
              onClick={onRejoin}
              className="h-11 rounded-full bg-[#1A73E8] px-8 text-sm font-medium text-white transition-colors hover:bg-[#1B66C9]"
            >
              Rejoin
            </button>
          ) : (
            <p className="py-3 text-sm text-[#9AA0A6]">This link isn&apos;t accepting new joins right now.</p>
          )}
          <Link
            href={homeHref}
            className="inline-flex h-11 items-center justify-center rounded-full border border-[#3C4043] px-8 text-sm font-medium text-[#9AA0A6] transition-colors hover:bg-[#3C4043]/50 hover:text-white"
          >
            Return to home
          </Link>
        </div>
      </div>
    </div>
  );
}
