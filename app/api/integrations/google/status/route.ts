import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import User from '@/lib/db/models/User';
import { requireAuth } from '@/lib/auth/middleware';

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    await connectDB();
    const doc = await User.findById(user.userId).select('googleIntegration');
    const g = doc?.googleIntegration;
    const connected = Boolean(g?.refreshToken);
    return NextResponse.json({
      success: true,
      connected,
      email: connected ? g?.email ?? null : null,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 },
      );
    }
    console.error('Google status error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 },
    );
  }
}
