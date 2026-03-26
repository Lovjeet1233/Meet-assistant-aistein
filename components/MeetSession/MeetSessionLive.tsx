'use client';

import type { MutableRefObject } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StreamingAvatarProvider, type AvatarStreamLifecycleHandlers } from '@/components/logic';
import { MeetConversationAvatar, type LiveTranscriptPayload } from '@/components/InteractiveAvatar';
import { useVoiceChat } from '@/components/logic/useVoiceChat';
import type { SessionConversation } from '@/components/meeting/sessionTypes';
import { MeetSessionTopBar } from './MeetSessionTopBar';
import { MeetSessionControlBar } from './MeetSessionControlBar';
import { MeetSessionChatPanel, type LiveMessage } from './MeetSessionChatPanel';
import { MeetSessionSelfView } from './MeetSessionSelfView';
import { MeetSessionSettingsModal } from './MeetSessionSettingsModal';
import { Loader2 } from 'lucide-react';
import { MeetLiveCaptionsBar } from './MeetLiveCaptionsBar';

function MeetSessionRoomInner({
  conversation,
  guestName,
  micStream,
  onMessageSent,
  onEndCall,
  streamLifecycleRef,
  onRecoveryTimeout,
  onGuestActivity,
}: {
  conversation: SessionConversation;
  guestName: string;
  micStream: MediaStream | null;
  onMessageSent: (message: string, role: 'user' | 'assistant') => void;
  onEndCall: () => void;
  streamLifecycleRef: MutableRefObject<AvatarStreamLifecycleHandlers>;
  onRecoveryTimeout?: () => void;
  onGuestActivity?: () => void;
}) {
  const [messages, setMessages] = useState<LiveMessage[]>(() => conversation.messages || []);
  const [chatOpen, setChatOpen] = useState(false);
  const [captionsOn, setCaptionsOn] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [endConfirm, setEndConfirm] = useState(false);
  const [sessionStartedAt] = useState(() => Date.now());
  const [liveUserDraft, setLiveUserDraft] = useState('');
  const [liveAvatarDraft, setLiveAvatarDraft] = useState('');
  const [recoveringStream, setRecoveringStream] = useState(false);

  const recoveryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { isMuted } = useVoiceChat();

  const guestLabel = guestName.trim() || 'Guest';
  const hostLabel = 'Avatar';

  useEffect(() => {
    const raw = process.env.NEXT_PUBLIC_MEETING_STREAM_RECOVERY_MS;
    const parsed = raw ? parseInt(raw, 10) : NaN;
    const recoveryMs = Number.isFinite(parsed) ? Math.max(parsed, 30_000) : 120_000;

    streamLifecycleRef.current = {
      onStreamDisconnected: () => {
        setRecoveringStream(true);
        if (recoveryTimerRef.current) clearTimeout(recoveryTimerRef.current);
        recoveryTimerRef.current = setTimeout(() => {
          recoveryTimerRef.current = null;
          onRecoveryTimeout?.();
        }, recoveryMs);
      },
      onStreamConnected: () => {
        if (recoveryTimerRef.current) {
          clearTimeout(recoveryTimerRef.current);
          recoveryTimerRef.current = null;
        }
        setRecoveringStream(false);
      },
    };

    return () => {
      if (recoveryTimerRef.current) {
        clearTimeout(recoveryTimerRef.current);
        recoveryTimerRef.current = null;
      }
    };
  }, [streamLifecycleRef, onRecoveryTimeout]);

  useEffect(() => {
    setMessages(conversation.messages || []);
  }, [conversation.id, conversation.messages]);

  const onLiveTranscript = useCallback(
    (p: LiveTranscriptPayload) => {
      if (p.role === 'user') {
        setLiveUserDraft(p.interim ? p.text : '');
        if (p.text.trim().length > 0) {
          onGuestActivity?.();
        }
      } else {
        setLiveAvatarDraft(p.interim ? p.text : '');
      }
    },
    [onGuestActivity],
  );

  const pushAssistant = useCallback(
    (text: string) => {
      onMessageSent(text, 'assistant');
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-a`,
          role: 'assistant' as const,
          content: text,
          timestamp: new Date().toISOString(),
        },
      ]);
    },
    [onMessageSent],
  );

  const pushUser = useCallback(
    (text: string) => {
      onGuestActivity?.();
      onMessageSent(text, 'user');
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-u`,
          role: 'user' as const,
          content: text,
          timestamp: new Date().toISOString(),
        },
      ]);
    },
    [onMessageSent, onGuestActivity],
  );

  const startedAt = sessionStartedAt;

  const showLiveCaptionSlot =
    captionsOn && (liveUserDraft.trim().length > 0 || liveAvatarDraft.trim().length > 0);

  return (
    <div className="fixed inset-0 bg-[#202124] text-white flex flex-col">
      <MeetSessionTopBar title={conversation.title} sessionStartedAt={startedAt} />

      <div className="flex-1 min-h-0 pt-14 relative">
        <div className="absolute inset-0 flex flex-col">
          <div className="flex-1 min-h-0 relative flex items-stretch justify-center">
            <MeetConversationAvatar
              variant="meet"
              conversation={conversation}
              onMessageReceived={pushAssistant}
              onUserMessage={pushUser}
              onLiveTranscript={onLiveTranscript}
              onGuestVoiceActivity={onGuestActivity}
              meetFooterOverlay={
                showLiveCaptionSlot ? (
                  <MeetLiveCaptionsBar
                    guestLabel={guestLabel}
                    hostLabel={hostLabel}
                    userText={liveUserDraft}
                    avatarText={liveAvatarDraft}
                  />
                ) : null
              }
            />

            <MeetSessionSelfView audioStream={micStream} guestName={guestName} isMuted={isMuted} />

            {recoveringStream && (
              <div className="pointer-events-none absolute inset-0 z-[40] flex items-center justify-center bg-black/35">
                <div className="pointer-events-auto mx-4 max-w-sm rounded-2xl border border-[#3C4043] bg-[#2C2C2E] px-8 py-6 text-center shadow-xl">
                  <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-white/80" aria-hidden />
                  <p className="text-lg font-medium text-white">Reconnecting…</p>
                  <p className="mt-2 text-sm text-[#9AA0A6]">
                    Your connection to the host dropped. Trying to restore the stream.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <MeetSessionChatPanel
          open={chatOpen}
          onClose={() => setChatOpen(false)}
          guestLabel={guestLabel}
          hostLabel={hostLabel}
          messages={messages}
          liveUserDraft={liveUserDraft}
          liveAvatarDraft={liveAvatarDraft}
        />
      </div>

      <MeetSessionControlBar
        chatOpen={chatOpen}
        onChatToggle={() => setChatOpen((o) => !o)}
        captionsOn={captionsOn}
        onCaptionsToggle={() => setCaptionsOn((c) => !c)}
        onSettingsOpen={() => setSettingsOpen(true)}
        onEndCall={() => setEndConfirm(true)}
      />

      <MeetSessionSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {endConfirm && (
        <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[#3C4043] bg-[#2C2C2E] p-6 shadow-xl">
            <h2 className="mb-2 text-lg font-semibold text-white">Leave meeting?</h2>
            <p className="mb-6 text-sm text-[#9AA0A6]">You’ll disconnect from the host and your session will end.</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setEndConfirm(false)}
                className="flex-1 rounded-lg border border-[#3C4043] py-2.5 text-sm text-white hover:bg-white/5"
              >
                Stay
              </button>
              <button
                type="button"
                onClick={() => {
                  setEndConfirm(false);
                  onEndCall();
                }}
                className="flex-1 rounded-lg bg-[#EA4335] py-2.5 text-sm font-medium text-white hover:opacity-90"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function MeetSessionLive(props: {
  conversation: SessionConversation;
  guestName: string;
  micStream: MediaStream | null;
  onMessageSent: (message: string, role: 'user' | 'assistant') => void;
  onEndCall: () => void;
  onRecoveryTimeout?: () => void;
  onGuestActivity?: () => void;
}) {
  const streamLifecycleRef = useRef<AvatarStreamLifecycleHandlers>({});

  return (
    <StreamingAvatarProvider
      basePath={process.env.NEXT_PUBLIC_BASE_API_URL}
      streamLifecycleRef={streamLifecycleRef}
    >
      <MeetSessionRoomInner {...props} streamLifecycleRef={streamLifecycleRef} />
    </StreamingAvatarProvider>
  );
}
