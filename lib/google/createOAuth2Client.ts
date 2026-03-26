import { google } from 'googleapis';
import { NextRequest } from 'next/server';
import {
  googleOAuthRedirectUri,
  requireGoogleOAuthEnv,
} from '@/lib/google/googleOAuthRedirectUri';

export function createGoogleOAuth2Client(request: NextRequest) {
  const { clientId, clientSecret } = requireGoogleOAuthEnv();
  return new google.auth.OAuth2(
    clientId,
    clientSecret,
    googleOAuthRedirectUri(request),
  );
}

export const GOOGLE_OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/userinfo.email',
  'openid',
] as const;
