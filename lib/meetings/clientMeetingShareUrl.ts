/** Client-side canonical guest URL (prefers NEXT_PUBLIC_APP_URL, else current origin). */
export function clientMeetingShareUrl(meetingSlug: string): string {
  const envBase =
    typeof process !== 'undefined' && process.env.NEXT_PUBLIC_APP_URL
      ? process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
      : '';
  const origin =
    envBase ||
    (typeof window !== 'undefined' ? window.location.origin.replace(/\/$/, '') : '');
  return `${origin}/meet/${meetingSlug}`;
}
