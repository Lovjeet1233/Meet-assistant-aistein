'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MeetAvatarSession, type SessionConversation } from '@/components/meeting/MeetAvatarSession';

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const [conversation, setConversation] = useState<SessionConversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEndChatConfirm, setShowEndChatConfirm] = useState(false);
  const [endingChat, setEndingChat] = useState(false);
  const [conversationId, setConversationId] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    const loadParams = async () => {
      const { id } = await params;
      setConversationId(id);
    };
    loadParams();
  }, [params]);

  useEffect(() => {
    if (conversationId) {
      continueConversation();
    }
  }, [conversationId]);

  const continueConversation = async () => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/continue`, {
        method: 'POST',
      });
      const data = await response.json();

      if (data.success) {
        setConversation({
          ...data.conversation,
          messages: data.messages || [],
        });
      } else {
        console.error('Failed to continue conversation:', data.message);
      }
    } catch (error) {
      console.error('Failed to continue conversation:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEndChat = async () => {
    setEndingChat(true);

    try {
      const response = await fetch(`/api/conversations/${conversationId}/end`, {
        method: 'POST',
      });

      if (response.ok) {
        router.push('/dashboard');
      } else {
        alert('Failed to end chat');
      }
    } catch (error) {
      console.error('Failed to end chat:', error);
      alert('An error occurred');
    } finally {
      setEndingChat(false);
      setShowEndChatConfirm(false);
    }
  };

  const handleMessageSent = async (message: string, role: 'user' | 'assistant') => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, content: message }),
      });

      const data = await response.json();

      if (!data.success) {
        console.error('Failed to save message:', data.message);
      }
    } catch (error) {
      console.error('Failed to save message:', error);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-black text-xl mb-2">Loading chat...</p>
          <p className="text-gray-600">Please wait</p>
        </div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-black text-xl mb-4">Conversation not found</p>
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="px-6 py-2 bg-black text-white font-medium hover:bg-gray-800"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="fixed top-0 left-0 right-0 h-20 bg-white/95 backdrop-blur-md border-b border-gray-200 flex items-center justify-between px-8 z-10 shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{conversation.title}</h1>
            <p className="text-sm text-gray-500">{conversation.knowledgeBase.name}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowEndChatConfirm(true)}
          className="px-6 py-2.5 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 transition-all shadow-sm hover:shadow-md"
        >
          End Session
        </button>
      </div>

      <div className="pt-20 h-full">
        <MeetAvatarSession conversation={conversation} onMessageSent={handleMessageSent} />
      </div>

      {showEndChatConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">End Session?</h2>
            <p className="text-gray-600 mb-8 leading-relaxed">
              This will end the current session and save a summary for future conversations.
            </p>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => setShowEndChatConfirm(false)}
                disabled={endingChat}
                className="flex-1 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEndChat}
                disabled={endingChat}
                className="flex-1 py-3 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 transition-all disabled:bg-gray-400 shadow-sm"
              >
                {endingChat ? 'Ending...' : 'End Session'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
