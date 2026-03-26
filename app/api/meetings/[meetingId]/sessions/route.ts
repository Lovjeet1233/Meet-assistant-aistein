import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Meeting from '@/lib/db/models/Meeting';
import Conversation from '@/lib/db/models/Conversation';
import Message from '@/lib/db/models/Message';
import { requireAuth } from '@/lib/auth/middleware';

function unauthorized() {
  return NextResponse.json(
    { success: false, message: 'Unauthorized' },
    { status: 401 },
  );
}

// GET — conversations tied to this meeting with message transcripts (owner only)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ meetingId: string }> },
) {
  try {
    const user = requireAuth(request);
    await connectDB();
    const { meetingId: meetingSlug } = await params;

    const meeting = await Meeting.findOne({ meetingId: meetingSlug });
    if (!meeting) {
      return NextResponse.json(
        { success: false, message: 'Meeting not found' },
        { status: 404 },
      );
    }

    if (String(meeting.createdBy) !== user.userId) {
      return NextResponse.json(
        { success: false, message: 'Forbidden' },
        { status: 403 },
      );
    }

    const conversations = await Conversation.find({ meetingId: meeting._id }).sort({
      createdAt: -1,
    });

    const sessions = await Promise.all(
      conversations.map(async (conv) => {
        const messages = await Message.find({ conversationId: conv._id }).sort({
          timestamp: 1,
        });
        return {
          id: String(conv._id),
          title: conv.title,
          status: conv.status,
          guestName: conv.guestName || null,
          createdAt: conv.createdAt,
          lastMessageAt: conv.lastMessageAt,
          conversationSummary: conv.conversationSummary || '',
          messageCount: messages.length,
          durationMs: Math.max(
            0,
            new Date(conv.lastMessageAt).getTime() - new Date(conv.createdAt).getTime(),
          ),
          transcript: messages.map((m) => ({
            role: m.role,
            content: m.content,
            timestamp: m.timestamp,
          })),
        };
      }),
    );

    return NextResponse.json({
      success: true,
      meetingId: meeting.meetingId,
      sessions,
    });
  } catch (error) {
    console.error('List meeting sessions error:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return unauthorized();
    }
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 },
    );
  }
}
