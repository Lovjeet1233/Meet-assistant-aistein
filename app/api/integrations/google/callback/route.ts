import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import connectDB from '@/lib/db/mongodb';
import User from '@/lib/db/models/User';
import { verifyGoogleOAuthState } from '@/lib/auth/auth';
import { createGoogleOAuth2Client } from '@/lib/google/createOAuth2Client';

export async function GET(request: NextRequest) {
  const base = new URL(request.url);
  const fail = (code: string) =>
    NextResponse.redirect(
      new URL(`/dashboard/integrations?error=${code}`, base.origin),
    );

  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const oauthError = searchParams.get('error');

    if (oauthError) {
      return fail('access_denied');
    }
    if (!code || !state) {
      return fail('missing_params');
    }

    const statePayload = verifyGoogleOAuthState(state);
    if (!statePayload) {
      return fail('invalid_state');
    }

    const oauth2Client = createGoogleOAuth2Client(request);
    const { tokens } = await oauth2Client.getToken(code);
    if (!tokens.refresh_token && !tokens.access_token) {
      return fail('no_tokens');
    }

    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: userinfo } = await oauth2.userinfo.get();
    const googleEmail = userinfo.email || undefined;

    await connectDB();

    const refreshToken =
      tokens.refresh_token ||
      (await User.findById(statePayload.userId).then(
        (u) => u?.googleIntegration?.refreshToken,
      ));

    if (!refreshToken) {
      return fail('no_refresh_token');
    }

    await User.findByIdAndUpdate(statePayload.userId, {
      $set: {
        googleIntegration: {
          refreshToken,
          accessToken: tokens.access_token ?? undefined,
          accessTokenExpiresAt: tokens.expiry_date
            ? new Date(tokens.expiry_date)
            : undefined,
          email: googleEmail,
        },
      },
    });

    return NextResponse.redirect(
      new URL('/dashboard/integrations?connected=1', base.origin),
    );
  } catch (e) {
    console.error('Google OAuth callback error:', e);
    return fail('callback_failed');
  }
}
