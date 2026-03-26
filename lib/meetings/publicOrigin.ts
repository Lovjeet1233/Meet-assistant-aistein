import { NextRequest } from 'next/server';

/** Public app origin for share links; prefers NEXT_PUBLIC_APP_URL, else request URL. */
export function publicAppOrigin(request: NextRequest): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '');
  if (fromEnv) {
    return fromEnv;
  }
  const u = new URL(request.url);
  return `${u.protocol}//${u.host}`;
}

export function meetingShareUrl(origin: string, meetingId: string): string {
  return `${origin.replace(/\/$/, '')}/meet/${meetingId}`;
}
