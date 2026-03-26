import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { findConversationWithAccess } from '@/lib/conversations/accessConversation';
import { finalizeConversationEndById } from '@/lib/conversations/finalizeConversationEnd';

// POST end conversation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    const { id } = await params;

    const access = await findConversationWithAccess(request, id);
    if (!access) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const ended = await finalizeConversationEndById(id);
    if (!ended) {
      return NextResponse.json(
        { success: false, message: 'Conversation not found or already ended' },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Conversation ended successfully',
    });
  } catch (error) {
    console.error('End conversation error:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

