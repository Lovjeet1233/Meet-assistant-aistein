'use client';

import { useEffect, useRef, useState } from 'react';

export function MeetSessionSelfView({
  audioStream,
  guestName,
  isMuted,
}: {
  audioStream: MediaStream | null;
  guestName: string;
  isMuted: boolean;
}) {
  const [levels, setLevels] = useState<number[]>([0, 0, 0, 0, 0]);
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!audioStream || isMuted) {
      setLevels([0, 0, 0, 0, 0]);
      return;
    }

    let raf = 0;
    const setup = async () => {
      const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      ctxRef.current = ctx;
      const source = ctx.createMediaStreamSource(audioStream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.65;
      source.connect(analyser);
      const buf = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        analyser.getByteFrequencyData(buf);
        const chunk = Math.floor(buf.length / 5);
        const next: number[] = [];
        for (let i = 0; i < 5; i++) {
          let sum = 0;
          for (let j = 0; j < chunk; j++) {
            sum += buf[i * chunk + j] ?? 0;
          }
          next.push(sum / chunk / 255);
        }
        setLevels(next);
        raf = requestAnimationFrame(tick);
      };
      tick();
    };

    void setup();

    return () => {
      cancelAnimationFrame(raf);
      void ctxRef.current?.close();
      ctxRef.current = null;
    };
  }, [audioStream, isMuted]);

  const initial = guestName.trim().charAt(0).toUpperCase() || '?';

  return (
    <div className="absolute bottom-28 sm:bottom-32 right-4 sm:right-6 z-[32] flex flex-col items-end gap-2">
      <div className="rounded-2xl bg-[#3c4043]/95 backdrop-blur-md border border-white/10 shadow-xl overflow-hidden w-[140px] sm:w-[160px]">
        <div className="px-2 py-1.5 border-b border-white/10 flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#1a73e8] to-purple-600 flex items-center justify-center text-xs font-semibold text-white shrink-0">
            {initial}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-white truncate">{guestName.trim() || 'Guest'}</p>
            <p className="text-[10px] text-gray-400">{isMuted ? 'Muted' : 'Mic live'}</p>
          </div>
        </div>
        <div className="h-14 flex items-end justify-center gap-1 px-2 pb-2 pt-1">
          {audioStream && !isMuted ? (
            levels.map((v, i) => (
              <span
                key={i}
                className="w-1.5 rounded-full bg-[#8ab4f8] transition-[height] duration-75"
                style={{ height: `${8 + v * 28}px`, opacity: 0.4 + v * 0.6 }}
              />
            ))
          ) : (
            <div className="flex h-10 w-full items-center justify-center text-gray-500">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
