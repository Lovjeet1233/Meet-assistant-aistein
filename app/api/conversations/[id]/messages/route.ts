import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Conversation from '@/lib/db/models/Conversation';
import Message from '@/lib/db/models/Message';
import { findConversationWithAccess } from '@/lib/conversations/accessConversation';

// GET messages for a conversation (authenticated owner or guest token)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await connectDB();
    const { id } = await params;

    const access = await findConversationWithAccess(request, id);
    if (!access) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 },
      );
    }

    const messages = await Message.find({ conversationId: id }).sort({ timestamp: 1 });

    return NextResponse.json({
      success: true,
      messages: messages.map((m) => ({
        id: String(m._id),
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
      })),
    });
  } catch (error) {
    console.error('List messages error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 },
    );
  }
}

// POST add message to conversation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await connectDB();

    const { id } = await params;
    const { role, content } = await request.json();

    if (!role || !content) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 },
      );
    }

    const access = await findConversationWithAccess(request, id);
    if (!access) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 },
      );
    }

    const message = await Message.create({
      conversationId: id,
      role,
      content,
    });

    await Conversation.findByIdAndUpdate(id, {
      lastMessageAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: {
        id: String(message._id),
        role: message.role,
        content: message.content,
        timestamp: message.timestamp,
      },
    });
  } catch (error) {
    console.error('Add message error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 },
      );
    }

    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 },
    );
  }
}
