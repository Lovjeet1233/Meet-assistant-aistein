'use client';

import { useCallback, useState } from 'react';
import QRCode from 'react-qr-code';

function escapeAttr(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

type Props = {
  shareUrl: string;
  meetingTitle: string;
  variant?: 'light' | 'dark';
  className?: string;
};

export function MeetingShareToolkit({
  shareUrl,
  meetingTitle,
  variant = 'light',
  className = '',
}: Props) {
  const [toast, setToast] = useState<string | null>(null);
  const [embedOpen, setEmbedOpen] = useState(false);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  }, []);

  const copyLink = () => {
    void navigator.clipboard.writeText(shareUrl).then(
      () => showToast('Link copied to clipboard'),
      () => showToast('Could not copy'),
    );
  };

  const shareEmail = () => {
    const subject = encodeURIComponent(`Join: ${meetingTitle}`);
    const body = encodeURIComponent(
      `You're invited to join a meeting.\n\n${meetingTitle}\n\n${shareUrl}\n`,
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const safeSrc = shareUrl.replace(/&/g, '&amp;');
  const iframeSnippet = `<iframe src="${safeSrc}" title="${escapeAttr(meetingTitle)}" width="100%" height="640" style="border:0;border-radius:12px;max-width:960px" allow="camera; microphone; fullscreen" loading="lazy"></iframe>`;

  const copyEmbed = () => {
    void navigator.clipboard.writeText(iframeSnippet).then(
      () => showToast('Embed code copied'),
      () => showToast('Could not copy'),
    );
  };

  const isDark = variant === 'dark';
  const btn =
    isDark
      ? 'px-3 py-2 text-sm rounded-lg border border-zinc-600 bg-zinc-800 text-white hover:bg-zinc-700'
      : 'px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50';
  const input =
    isDark
      ? 'w-full text-xs font-mono bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-zinc-200 break-all'
      : 'w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-primary break-all';

  return (
    <div className={`relative ${className}`}>
      {toast && (
        <div
          className={
            isDark
              ? 'fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] px-4 py-2 rounded-lg bg-zinc-100 text-zinc-900 text-sm shadow-lg'
              : 'fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] px-4 py-2 rounded-lg border border-slate-200 bg-primary text-primary text-sm shadow-lg'
          }
          role="status"
        >
          {toast}
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        <button type="button" className={btn} onClick={copyLink}>
          Copy link
        </button>
        <button type="button" className={btn} onClick={shareEmail}>
          Share via email
        </button>
        <button
          type="button"
          className={btn}
          onClick={() => setEmbedOpen((o) => !o)}
        >
          {embedOpen ? 'Hide embed' : 'Embed code'}
        </button>
      </div>

      <div className={input + ' mb-4'}>{shareUrl}</div>

      {embedOpen && (
        <div className="mb-4 space-y-2">
          <p className={isDark ? 'text-xs text-zinc-400' : 'text-xs text-secondary'}>
            Paste into your site. Guests need camera/mic permission; some browsers restrict iframes.
          </p>
          <textarea
            readOnly
            className={
              isDark
                ? 'w-full text-xs font-mono bg-zinc-950 border border-zinc-600 rounded-lg p-3 text-zinc-300 h-28'
                : 'w-full text-xs font-mono bg-white border border-slate-200 rounded-lg p-3 text-primary h-28'
            }
            value={iframeSnippet}
          />
          <button type="button" className={btn} onClick={copyEmbed}>
            Copy embed code
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <div
          className={
            isDark
              ? 'p-3 rounded-xl bg-white inline-block self-start'
              : 'p-3 rounded-xl bg-white border border-slate-200 inline-block self-start shadow-sm'
          }
        >
          <QRCode value={shareUrl} size={132} level="M" title={meetingTitle} />
        </div>
        <p className={isDark ? 'text-xs text-zinc-400 max-w-xs' : 'text-xs text-secondary max-w-xs'}>
          Scan to open the guest link on a phone. Use “Copy link” for exact URL (
          <span className="font-mono">/meet/…</span>).
        </p>
      </div>
    </div>
  );
}
