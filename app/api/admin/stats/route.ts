import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import User from '@/lib/db/models/User';
import Conversation from '@/lib/db/models/Conversation';
import Message from '@/lib/db/models/Message';
import KnowledgeBase from '@/lib/db/models/KnowledgeBase';
import Meeting from '@/lib/db/models/Meeting';
import { requireAdmin } from '@/lib/auth/adminMiddleware';

// GET usage statistics
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    await connectDB();
    
    const now = new Date();
    const meetingActiveFilter = {
      isActive: true,
      status: { $ne: 'completed' as const },
      $and: [
        {
          $or: [
            { expiresAt: { $exists: false } },
            { expiresAt: null },
            { expiresAt: { $gt: now } },
          ],
        },
        {
          $or: [
            { maxSessions: { $exists: false } },
            { maxSessions: null },
            { $expr: { $lt: ['$sessionCount', '$maxSessions'] } },
          ],
        },
      ],
    };

    // Get total counts
    const [totalUsers, totalConversations, totalMessages, totalKnowledgeBases, totalMeetings, activeMeetings, totalGuestSessions] =
      await Promise.all([
        User.countDocuments(),
        Conversation.countDocuments(),
        Message.countDocuments(),
        KnowledgeBase.countDocuments(),
        Meeting.countDocuments(),
        Meeting.countDocuments(meetingActiveFilter),
        Conversation.countDocuments({
          guestName: { $exists: true, $nin: [null, ''] },
        }),
      ]);
    
    // Get active users (logged in within last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const activeUsers = await User.countDocuments({
      lastLoginAt: { $gte: sevenDaysAgo },
    });
    
    // Get conversations by status
    const activeConversations = await Conversation.countDocuments({ status: 'active' });
    const completedConversations = await Conversation.countDocuments({ status: 'completed' });
    
    // Get recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentConversations = await Conversation.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
    });
    
    const recentMessages = await Message.countDocuments({
      timestamp: { $gte: thirtyDaysAgo },
    });
    
    // Get average messages per conversation
    const avgMessagesPerConversation = totalConversations > 0 
      ? Math.round(totalMessages / totalConversations) 
      : 0;
    
    return NextResponse.json({
      success: true,
      stats: {
        overview: {
          totalUsers,
          totalConversations,
          totalMessages,
          totalKnowledgeBases,
          activeUsers,
          avgMessagesPerConversation,
          totalMeetings,
          activeMeetings,
          totalGuestSessions,
        },
        meetings: {
          totalMeetings,
          activeMeetings,
          totalGuestSessions,
        },
        conversations: {
          active: activeConversations,
          completed: completedConversations,
        },
        recentActivity: {
          conversationsLast30Days: recentConversations,
          messagesLast30Days: recentMessages,
        },
      },
    });
  } catch (error) {
    console.error('Get stats error:', error);
    
    if (error instanceof Error && error.message === 'Admin access required') {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      );
    }
    
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

