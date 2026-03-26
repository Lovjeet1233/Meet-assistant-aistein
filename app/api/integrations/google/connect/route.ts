import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { signGoogleOAuthState } from '@/lib/auth/auth';
import {
  createGoogleOAuth2Client,
  GOOGLE_OAUTH_SCOPES,
} from '@/lib/google/createOAuth2Client';

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const oauth2Client = createGoogleOAuth2Client(request);
    const state = signGoogleOAuthState(user.userId);
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: [...GOOGLE_OAUTH_SCOPES],
      state,
    });
    return NextResponse.redirect(url);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    if (error instanceof Error && error.message === 'Google OAuth is not configured') {
      return NextResponse.redirect(
        new URL(
          '/dashboard/integrations?error=google_not_configured',
          request.url,
        ),
      );
    }
    console.error('Google connect error:', error);
    return NextResponse.redirect(
      new URL('/dashboard/integrations?error=connect_failed', request.url),
    );
  }
}
