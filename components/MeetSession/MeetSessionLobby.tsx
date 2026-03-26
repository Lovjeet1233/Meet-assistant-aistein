'use client';

import { User } from 'lucide-react';

export function MeetSessionLobby({
  meetingTitle,
  avatarId,
  guestName,
  onGuestNameChange,
  micStatus,
  onRequestMic,
  joinError,
  joining,
  onJoin,
  canJoin,
}: {
  meetingTitle: string;
  avatarId: string;
  guestName: string;
  onGuestNameChange: (v: string) => void;
  micStatus: 'idle' | 'pending' | 'granted' | 'denied';
  onRequestMic: () => void;
  joinError: string | null;
  joining: boolean;
  onJoin: () => void;
  canJoin: boolean;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#202124] px-4 py-12 sm:mx-0">
      <div className="w-full max-w-sm rounded-2xl bg-[#2C2C2E] p-8 shadow-xl">
        <p className="text-[13px] text-[#9AA0A6]">Ask to join</p>

        <h1 className="mt-2 text-xl font-semibold leading-snug text-white">{meetingTitle}</h1>

        <div className="mt-8 flex justify-center">
          <div
            className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600"
            aria-hidden
          >
            <User className="h-10 w-10 text-white" strokeWidth={1.5} />
          </div>
        </div>
        <p className="mt-3 text-center text-[13px] text-[#9AA0A6] truncate px-1">{avatarId}</p>

        <div className="mt-8 space-y-5">
          <div>
            <label htmlFor="meet-guest-name" className="mb-1.5 block text-[13px] text-[#9AA0A6]">
              Your name
            </label>
            <input
              id="meet-guest-name"
              type="text"
              autoComplete="name"
              value={guestName}
              onChange={(e) => onGuestNameChange(e.target.value)}
              placeholder="Enter your name"
              maxLength={120}
              className="h-11 w-full rounded-lg border-0 bg-[#3C4043] px-3 text-white placeholder:text-[#9AA0A6] outline-none ring-0 focus:ring-2 focus:ring-[#1A73E8]/40"
            />
          </div>

          <div className="rounded-lg bg-[#3C4043] p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-white">Microphone</p>
                <p className="mt-1 text-xs text-[#9AA0A6]">
                  {micStatus === 'idle' && 'Test your mic before you join'}
                  {micStatus === 'pending' && 'Waiting for browser…'}
                  {micStatus === 'granted' && 'Working — you’re ready'}
                  {micStatus === 'denied' && 'Allow access in browser settings'}
                </p>
              </div>
              {micStatus !== 'granted' ? (
                <button
                  type="button"
                  onClick={onRequestMic}
                  disabled={micStatus === 'pending'}
                  className="shrink-0 text-sm font-medium text-[#9AA0A6] hover:text-white disabled:opacity-50"
                >
                  {micStatus === 'pending' ? '…' : 'Test mic'}
                </button>
              ) : (
                <span className="text-xs font-medium text-emerald-400">OK</span>
              )}
            </div>
          </div>

          {joinError ? <p className="text-sm text-red-400">{joinError}</p> : null}

          <button
            type="button"
            onClick={onJoin}
            disabled={joining || !guestName.trim() || micStatus !== 'granted' || !canJoin}
            className="h-11 w-full rounded-full bg-[#1A73E8] text-[15px] font-medium text-white transition-colors hover:bg-[#1B66C9] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {joining ? 'Joining…' : 'Join now'}
          </button>
        </div>
      </div>
    </div>
  );
}
