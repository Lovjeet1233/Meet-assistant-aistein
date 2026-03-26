'use client';

import { X } from 'lucide-react';
import { useStreamingAvatarContext } from '@/components/logic/context';

export function MeetSessionSettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { interruptMode } = useStreamingAvatarContext();

  if (!open) return null;

  const label = interruptMode === 'sensitive' ? 'Sensitive' : 'Robust';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <button type="button" className="absolute inset-0" aria-label="Close settings" onClick={onClose} />
      <div className="relative z-10 max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl border border-[#3C4043] bg-[#2C2C2E] p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Meeting settings</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-[#9AA0A6] hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>

        <div className="mb-5 rounded-xl border border-[#3C4043] bg-[#202124] px-3 py-3">
          <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-[#9AA0A6]">
            Voice interrupt (this session)
          </p>
          <p className="text-sm font-medium text-white">{label}</p>
          <p className="mt-2 text-xs leading-relaxed text-[#9AA0A6]">
            Sensitive uses lower STT confidence so the host reacts quickly when you speak. The default for new sessions
            is Sensitive. To switch to Robust (fewer noise cut-ins), open a dashboard chat once, change it in controls,
            then join a meet again — or clear site data to reset to Sensitive.
          </p>
        </div>

        <ul className="space-y-3 text-sm text-[#9AA0A6]">
          <li>
            <span className="font-medium text-white">Microphone</span>
            <span> — Mute or unmute from the bottom bar.</span>
          </li>
          <li>
            <span className="font-medium text-white">Transcript</span>
            <span> — Open the transcript panel for message history.</span>
          </li>
          <li>
            <span className="font-medium text-white">Captions</span>
            <span> — Toggle live captions with the CC button.</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
