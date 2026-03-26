import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import Conversation from '@/lib/db/models/Conversation';
import '@/lib/db/models/KnowledgeBase';
import User from '@/lib/db/models/User';
import { getAuthUser } from '@/lib/auth/middleware';
import type { HydratedDocument } from 'mongoose';
import type { IConversation } from '@/lib/db/models/Conversation';

export type AccessedConversation = HydratedDocument<IConversation>;

export async function findConversationWithAccess(
  request: NextRequest,
  conversationId: string,
): Promise<{ conversation: AccessedConversation } | null> {
  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    return null;
  }

  const auth = getAuthUser(request);

  if (auth) {
    const user = await User.findById(auth.userId);
    const query: Record<string, unknown> = { _id: conversationId };
    if (user?.role !== 'admin') {
      query.userId = auth.userId;
    }
    const conversation = await Conversation.findOne(query)
      .select('+guestAccessToken')
      .populate('knowledgeBaseId');
    if (conversation) {
      return { conversation };
    }
  }

  const guestToken = request.headers.get('x-guest-token');
  if (!guestToken) {
    return null;
  }

  const guestConv = await Conversation.findOne({
    _id: conversationId,
    guestName: { $exists: true, $nin: [null, ''] },
  })
    .select('+guestAccessToken')
    .populate('knowledgeBaseId');

  if (
    guestConv?.guestAccessToken &&
    guestConv.guestAccessToken === guestToken
  ) {
    return { conversation: guestConv };
  }

  return null;
}
