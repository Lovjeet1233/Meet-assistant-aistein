'use client';

import { useState, useEffect, useRef } from 'react';
import { StreamingAvatarProvider } from '@/components/logic';
import { MeetConversationAvatar } from '@/components/InteractiveAvatar';
import type { SessionConversation } from '@/components/meeting/sessionTypes';

export type { SessionConversation } from '@/components/meeting/sessionTypes';

export function MeetAvatarSession({
  conversation,
  onMessageSent,
}: {
  conversation: SessionConversation;
  onMessageSent: (message: string, role: 'user' | 'assistant') => void;
}) {
  const [messages, setMessages] = useState(conversation.messages);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    setMessages(conversation.messages);
    scrollToBottom();
  }, [conversation.messages]);

  const pushAssistant = (message: string) => {
    onMessageSent(message, 'assistant');
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        role: 'assistant' as const,
        content: message,
        timestamp: new Date().toISOString(),
      },
    ]);
  };

  const pushUser = (message: string) => {
    onMessageSent(message, 'user');
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        role: 'user' as const,
        content: message,
        timestamp: new Date().toISOString(),
      },
    ]);
  };

  const messageList = (
    <div className="flex-1 overflow-y-auto p-4 md:p-6">
      <div className="space-y-3 md:space-y-4">
        {conversation.messages && conversation.messages.length > 0 && (
          <>
            <div className="flex items-center my-3">
              <div className="flex-1 border-t border-gray-200/20" />
              <span className="px-3 text-xs font-medium text-gray-500">Previous Messages</span>
              <div className="flex-1 border-t border-gray-200/20" />
            </div>

            {conversation.messages.map((message, index) => (
              <div
                key={`prev-${message.id || index}`}
                className={`p-3 md:p-4 rounded-lg opacity-60 ${
                  message.role === 'user'
                    ? 'bg-blue-500/10 ml-2 md:ml-4'
                    : 'bg-white/5 mr-2 md:mr-4'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-medium text-gray-300 text-xs">
                    {message.role === 'user' ? 'You' : conversation.avatarId}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(message.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="text-sm text-gray-200 leading-relaxed">{message.content}</p>
              </div>
            ))}

            <div className="flex items-center my-4">
              <div className="flex-1 border-t-2 border-blue-500/60" />
              <span className="px-3 text-xs font-semibold text-blue-400">Live Session</span>
              <div className="flex-1 border-t-2 border-blue-500/60" />
            </div>
          </>
        )}

        {messages.map((message, index) => (
          <div
            key={message.id || index}
            className={`p-3 md:p-4 rounded-lg shadow-sm ${
              message.role === 'user'
                ? 'bg-blue-600 text-white ml-2 md:ml-4'
                : 'bg-white/10 border border-white/10 mr-2 md:mr-4'
            }`}
          >
            <div className="flex justify-between items-start mb-1">
              <span
                className={`font-medium text-xs ${
                  message.role === 'user' ? 'text-blue-100' : 'text-gray-300'
                }`}
              >
                {message.role === 'user' ? 'You' : conversation.avatarId}
              </span>
              <span
                className={`text-xs ${
                  message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                }`}
              >
                {new Date(message.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            <p
              className={`text-sm leading-relaxed ${
                message.role === 'user' ? 'text-white' : 'text-gray-100'
              }`}
            >
              {message.content}
            </p>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );

  return (
    <div className="h-full flex">
      <div
        className={`${
          isFullScreen ? 'w-full' : 'w-2/3'
        } bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center relative transition-all duration-300`}
      >
        <StreamingAvatarProvider basePath={process.env.NEXT_PUBLIC_BASE_API_URL}>
          <MeetConversationAvatar
            variant="dashboard"
            conversation={conversation}
            onMessageReceived={pushAssistant}
            onUserMessage={pushUser}
          />
        </StreamingAvatarProvider>
        <button
          type="button"
          onClick={() => setIsFullScreen(!isFullScreen)}
          className="absolute top-3 right-3 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white p-3 rounded-lg transition-all shadow-lg z-10"
          title={isFullScreen ? 'Show Chat' : 'Hide Chat'}
        >
          {isFullScreen ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          )}
        </button>
      </div>

      <div
        className={`${
          isFullScreen ? 'hidden' : 'w-1/3'
        } bg-white flex flex-col border-l border-gray-200 shadow-xl transition-all duration-300`}
      >
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-900">Conversation</h3>
          <p className="text-sm text-gray-500 mt-1">
            {new Date(conversation.createdAt).toLocaleDateString()} at{' '}
            {new Date(conversation.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
        {messageList}
      </div>
    </div>
  );
}
