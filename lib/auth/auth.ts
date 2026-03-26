import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface TokenPayload {
  userId: string;
  username: string;
  role: string;
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

const GOOGLE_OAUTH_STATE_PURPOSE = 'google_oauth' as const;

export function signGoogleOAuthState(userId: string): string {
  return jwt.sign(
    { purpose: GOOGLE_OAUTH_STATE_PURPOSE, userId },
    JWT_SECRET,
    { expiresIn: '10m' },
  );
}

export function verifyGoogleOAuthState(
  token: string,
): { userId: string } | null {
  try {
    const p = jwt.verify(token, JWT_SECRET) as {
      purpose?: string;
      userId?: string;
    };
    if (p.purpose !== GOOGLE_OAUTH_STATE_PURPOSE || !p.userId) {
      return null;
    }
    return { userId: p.userId };
  } catch {
    return null;
  }
}

