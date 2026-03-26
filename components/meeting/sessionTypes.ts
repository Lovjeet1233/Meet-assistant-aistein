export interface SessionConversation {
  id: string;
  title: string;
  avatarId: string;
  voiceId?: string;
  language?: string;
  knowledgeBase: {
    id: string;
    name: string;
    prompt: string;
  };
  status: string;
  sessionContext?: string;
  conversationSummary?: string;
  createdAt: string;
  lastMessageAt: string;
  messages: {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }[];
}
