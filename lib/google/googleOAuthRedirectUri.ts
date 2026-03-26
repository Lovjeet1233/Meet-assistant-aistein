import { NextRequest } from 'next/server';
import { publicAppOrigin } from '@/lib/meetings/publicOrigin';

/** Must match exactly what is registered in Google Cloud Console. */
export function googleOAuthRedirectUri(request: NextRequest): string {
  const explicit = process.env.GOOGLE_REDIRECT_URI?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, '');
  }
  const origin = publicAppOrigin(request);
  return `${origin.replace(/\/$/, '')}/api/integrations/google/callback`;
}

export function requireGoogleOAuthEnv(): { clientId: string; clientSecret: string } {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth is not configured');
  }
  return { clientId, clientSecret };
}
