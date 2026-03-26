import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Conversation from '@/lib/db/models/Conversation';
import '@/lib/db/models/KnowledgeBase';
import Message from '@/lib/db/models/Message';
import { requireAuth } from '@/lib/auth/middleware';

// GET all conversations
export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    await connectDB();
    
    const conversations = await Conversation.find({ userId: user.userId })
      .populate('knowledgeBaseId', 'name')
      .sort({ lastMessageAt: -1 });
    
    // Get last message for each conversation
    const conversationsWithLastMessage = await Promise.all(
      conversations.map(async (conv) => {
        const lastMessage = await Message.findOne({ conversationId: conv._id })
          .sort({ timestamp: -1 })
          .limit(1);
        
        // Handle cases where knowledgeBaseId might be null or deleted
        const knowledgeBase = conv.knowledgeBaseId ? {
          id: String((conv.knowledgeBaseId as any)._id),
          name: (conv.knowledgeBaseId as any).name,
        } : {
          id: '',
          name: 'Deleted Knowledge Base',
        };
        
        return {
          id: String(conv._id),
          title: conv.title,
          avatarId: conv.avatarId,
          voiceId: conv.voiceId,
          language: conv.language,
          knowledgeBase,
          status: conv.status,
          createdAt: conv.createdAt,
          lastMessageAt: conv.lastMessageAt,
          lastMessage: lastMessage ? {
            role: lastMessage.role,
            content: lastMessage.content,
            timestamp: lastMessage.timestamp,
          } : null,
        };
      })
    );
    
    return NextResponse.json({
      success: true,
      conversations: conversationsWithLastMessage,
    });
  } catch (error) {
    console.error('Get conversations error:', error);
    
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

// POST create new conversation
export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    await connectDB();
    
    const { avatarId, voiceId, language, knowledgeBaseId, title } = await request.json();
    
    if (!avatarId || !knowledgeBaseId) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    const conversation = await Conversation.create({
      userId: user.userId,
      avatarId,
      voiceId,
      language,
      knowledgeBaseId,
      title: title || `Chat - ${new Date().toLocaleString()}`,
      status: 'active',
    });
    
    return NextResponse.json({
      success: true,
      conversation: {
        id: String(conversation._id),
        title: conversation.title,
        avatarId: conversation.avatarId,
        voiceId: conversation.voiceId,
        language: conversation.language,
        knowledgeBaseId: String(conversation.knowledgeBaseId),
        status: conversation.status,
        createdAt: conversation.createdAt,
        lastMessageAt: conversation.lastMessageAt,
      },
    });
  } catch (error) {
    console.error('Create conversation error:', error);
    
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

