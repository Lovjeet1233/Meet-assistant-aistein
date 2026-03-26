import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Conversation from '@/lib/db/models/Conversation';
import { finalizeConversationEndById } from '@/lib/conversations/finalizeConversationEnd';

function authorizeCron(request: NextRequest): boolean | 'missing_secret' {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return 'missing_secret';
  }
  const auth = request.headers.get('authorization');
  if (auth === `Bearer ${secret}`) {
    return true;
  }
  return request.headers.get('x-cron-secret') === secret;
}

/**
 * Marks stale guest conversations as completed (same summary flow as POST .../end).
 * Call from Vercel Cron or any scheduler with CRON_SECRET header.
 *
 * Age threshold: STALE_GUEST_CONVERSATION_MAX_AGE_MS (default 1 hour) based on lastMessageAt.
 */
export async function POST(request: NextRequest) {
  return runCleanup(request);
}

export async function GET(request: NextRequest) {
  return runCleanup(request);
}

async function runCleanup(request: NextRequest) {
  try {
    const auth = authorizeCron(request);
    if (auth === 'missing_secret') {
      return NextResponse.json(
        { success: false, message: 'CRON_SECRET is not configured' },
        { status: 503 },
      );
    }
    if (!auth) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const rawAge = process.env.STALE_GUEST_CONVERSATION_MAX_AGE_MS;
    const parsedAge = rawAge ? parseInt(rawAge, 10) : NaN;
    const maxAgeMs = Number.isFinite(parsedAge)
      ? Math.min(Math.max(parsedAge, 60_000), 48 * 60 * 60 * 1000)
      : 60 * 60 * 1000;

    const cutoff = new Date(Date.now() - maxAgeMs);
    const batchLimit = Math.min(
      Math.max(parseInt(process.env.STALE_GUEST_CLEANUP_BATCH || '25', 10) || 25, 1),
      100,
    );

    const stale = await Conversation.find({
      status: 'active',
      guestName: { $exists: true, $nin: [null, ''] },
      lastMessageAt: { $lt: cutoff },
    })
      .select('_id')
      .limit(batchLimit)
      .lean();

    let completed = 0;
    for (const row of stale) {
      const ok = await finalizeConversationEndById(String(row._id));
      if (ok) completed += 1;
    }

    return NextResponse.json({
      success: true,
      scanned: stale.length,
      completed,
      cutoff: cutoff.toISOString(),
    });
  } catch (error) {
    console.error('Stale guest session cleanup error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
