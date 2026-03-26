import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Conversation from '@/lib/db/models/Conversation';
import Message from '@/lib/db/models/Message';
import { findConversationWithAccess } from '@/lib/conversations/accessConversation';
import { generateConversationSummary, createSessionContext } from '@/lib/utils/summaryGenerator';

// POST endpoint to continue a conversation with enhanced context
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
    const conversation = access.conversation;
    
    // Fetch all messages from this conversation
    const messages = await Message.find({ conversationId: id })
      .sort({ timestamp: 1 });
    
    const knowledgeBase = conversation.knowledgeBaseId as any;
    
    // Generate summary if there are previous messages
    let conversationSummary = '';
    let sessionContext = knowledgeBase.prompt;
    
    if (messages.length > 0) {
      conversationSummary = await generateConversationSummary(
        messages.map(msg => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp.toISOString(),
        }))
      );
      
      sessionContext = createSessionContext(knowledgeBase.prompt, conversationSummary);
    }
    
    // Persist without full `save()` so guest docs never fail validation when
    // `guestAccessToken` is omitted from the in-memory document (`select: false`).
    await Conversation.updateOne(
      { _id: conversation._id },
      { $set: { sessionContext, status: 'active' } },
    );
    conversation.sessionContext = sessionContext;
    conversation.status = 'active';
    
    return NextResponse.json({
      success: true,
      conversation: {
        id: String(conversation._id),
        title: conversation.title,
        avatarId: conversation.avatarId,
        voiceId: conversation.voiceId,
        language: conversation.language || 'en',
        knowledgeBase: {
          id: String(knowledgeBase._id),
          name: knowledgeBase.name,
          prompt: knowledgeBase.prompt,
        },
        sessionContext: sessionContext,
        status: conversation.status,
      },
        messages: messages.map(msg => ({
          id: String(msg._id),
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp,
        })),
      conversationSummary: conversationSummary,
    });
  } catch (error) {
    console.error('Continue conversation error:', error);
    
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

