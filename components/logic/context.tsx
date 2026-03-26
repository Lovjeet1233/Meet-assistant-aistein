import StreamingAvatar, {
  ConnectionQuality,
  StreamingTalkingMessageEvent,
  UserTalkingMessageEvent,
} from "@heygen/streaming-avatar";
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import {
  type InterruptMode,
  persistInterruptMode,
  readStoredInterruptMode,
} from "./interruptMode";

export enum StreamingAvatarSessionState {
  INACTIVE = "inactive",
  CONNECTING = "connecting",
  CONNECTED = "connected",
}

/** Optional hooks for Meet / dashboard streaming UX (reconnect overlay, analytics). */
export type AvatarStreamLifecycleHandlers = {
  onStreamConnected?: () => void;
  onStreamDisconnected?: () => void;
};

const defaultStreamLifecycleRef: React.MutableRefObject<AvatarStreamLifecycleHandlers> = {
  current: {},
};

export enum MessageSender {
  CLIENT = "CLIENT",
  AVATAR = "AVATAR",
}

export interface Message {
  id: string;
  sender: MessageSender;
  content: string;
}

type StreamingAvatarContextProps = {
  avatarRef: React.MutableRefObject<StreamingAvatar | null>;
  basePath?: string;

  isMuted: boolean;
  setIsMuted: (isMuted: boolean) => void;
  isVoiceChatLoading: boolean;
  setIsVoiceChatLoading: (isVoiceChatLoading: boolean) => void;
  isVoiceChatActive: boolean;
  setIsVoiceChatActive: (isVoiceChatActive: boolean) => void;

  sessionState: StreamingAvatarSessionState;
  setSessionState: (sessionState: StreamingAvatarSessionState) => void;
  stream: MediaStream | null;
  setStream: (stream: MediaStream | null) => void;

  messages: Message[];
  clearMessages: () => void;
  handleUserTalkingMessage: ({
    detail,
  }: {
    detail: UserTalkingMessageEvent;
  }) => void;
  handleStreamingTalkingMessage: ({
    detail,
  }: {
    detail: StreamingTalkingMessageEvent;
  }) => void;
  handleEndMessage: () => void;

  isListening: boolean;
  setIsListening: (isListening: boolean) => void;
  isUserTalking: boolean;
  setIsUserTalking: (isUserTalking: boolean) => void;
  isAvatarTalking: boolean;
  setIsAvatarTalking: (isAvatarTalking: boolean) => void;

  connectionQuality: ConnectionQuality;
  setConnectionQuality: (connectionQuality: ConnectionQuality) => void;

  /** LiveKit subscriber ICE RTT sample (ms), polled while connected */
  subscriberRttMs: number | null;
  setSubscriberRttMs: (ms: number | null) => void;

  /** Voice / interrupt sensitivity — tunes HeyGen STT confidence + UI debounce */
  interruptMode: InterruptMode;
  setInterruptMode: (mode: InterruptMode) => void;
  /** False until localStorage has been read — avoids restart on hydration */
  interruptModeReady: boolean;

  streamLifecycleRef: React.MutableRefObject<AvatarStreamLifecycleHandlers>;
};

const StreamingAvatarContext = React.createContext<StreamingAvatarContextProps>(
  {
    avatarRef: { current: null },
    isMuted: true,
    setIsMuted: () => {},
    isVoiceChatLoading: false,
    setIsVoiceChatLoading: () => {},
    sessionState: StreamingAvatarSessionState.INACTIVE,
    setSessionState: () => {},
    isVoiceChatActive: false,
    setIsVoiceChatActive: () => {},
    stream: null,
    setStream: () => {},
    messages: [],
    clearMessages: () => {},
    handleUserTalkingMessage: () => {},
    handleStreamingTalkingMessage: () => {},
    handleEndMessage: () => {},
    isListening: false,
    setIsListening: () => {},
    isUserTalking: false,
    setIsUserTalking: () => {},
    isAvatarTalking: false,
    setIsAvatarTalking: () => {},
    connectionQuality: ConnectionQuality.UNKNOWN,
    setConnectionQuality: () => {},
    subscriberRttMs: null,
    setSubscriberRttMs: () => {},
    interruptMode: "sensitive",
    setInterruptMode: () => {},
    interruptModeReady: false,
    streamLifecycleRef: defaultStreamLifecycleRef,
  },
);

const useStreamingAvatarSessionState = () => {
  const [sessionState, setSessionState] = useState(
    StreamingAvatarSessionState.INACTIVE,
  );
  const [stream, setStream] = useState<MediaStream | null>(null);

  return {
    sessionState,
    setSessionState,
    stream,
    setStream,
  };
};

const useStreamingAvatarVoiceChatState = () => {
  const [isMuted, setIsMuted] = useState(true);
  const [isVoiceChatLoading, setIsVoiceChatLoading] = useState(false);
  const [isVoiceChatActive, setIsVoiceChatActive] = useState(false);

  return {
    isMuted,
    setIsMuted,
    isVoiceChatLoading,
    setIsVoiceChatLoading,
    isVoiceChatActive,
    setIsVoiceChatActive,
  };
};

const useStreamingAvatarMessageState = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const currentSenderRef = useRef<MessageSender | null>(null);

  const handleUserTalkingMessage = ({
    detail,
  }: {
    detail: UserTalkingMessageEvent;
  }) => {
    if (currentSenderRef.current === MessageSender.CLIENT) {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        {
          ...prev[prev.length - 1],
          content: [prev[prev.length - 1].content, detail.message].join(""),
        },
      ]);
    } else {
      currentSenderRef.current = MessageSender.CLIENT;
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: MessageSender.CLIENT,
          content: detail.message,
        },
      ]);
    }
  };

  const handleStreamingTalkingMessage = ({
    detail,
  }: {
    detail: StreamingTalkingMessageEvent;
  }) => {
    if (currentSenderRef.current === MessageSender.AVATAR) {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        {
          ...prev[prev.length - 1],
          content: [prev[prev.length - 1].content, detail.message].join(""),
        },
      ]);
    } else {
      currentSenderRef.current = MessageSender.AVATAR;
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: MessageSender.AVATAR,
          content: detail.message,
        },
      ]);
    }
  };

  const handleEndMessage = () => {
    currentSenderRef.current = null;
  };

  return {
    messages,
    clearMessages: () => {
      setMessages([]);
      currentSenderRef.current = null;
    },
    handleUserTalkingMessage,
    handleStreamingTalkingMessage,
    handleEndMessage,
  };
};

const useStreamingAvatarListeningState = () => {
  const [isListening, setIsListening] = useState(false);

  return { isListening, setIsListening };
};

const useStreamingAvatarTalkingState = () => {
  const [isUserTalking, setIsUserTalking] = useState(false);
  const [isAvatarTalking, setIsAvatarTalking] = useState(false);

  return {
    isUserTalking,
    setIsUserTalking,
    isAvatarTalking,
    setIsAvatarTalking,
  };
};

const useStreamingAvatarConnectionQualityState = () => {
  const [connectionQuality, setConnectionQuality] = useState(
    ConnectionQuality.UNKNOWN,
  );
  const [subscriberRttMs, setSubscriberRttMs] = useState<number | null>(null);

  return {
    connectionQuality,
    setConnectionQuality,
    subscriberRttMs,
    setSubscriberRttMs,
  };
};

const useInterruptModeState = (fixedInterruptMode?: InterruptMode) => {
  const isFixed = fixedInterruptMode != null;
  /** SSR-safe default; real value from localStorage applied in useLayoutEffect before child useEffects. */
  const [interruptMode, setInterruptModeState] = useState<InterruptMode>(() =>
    isFixed ? fixedInterruptMode! : "sensitive",
  );
  const [interruptModeReady, setInterruptModeReady] = useState(isFixed);

  useLayoutEffect(() => {
    if (isFixed) {
      setInterruptModeState(fixedInterruptMode!);
      setInterruptModeReady(true);
      return;
    }
    setInterruptModeState(readStoredInterruptMode());
    setInterruptModeReady(true);
  }, [isFixed, fixedInterruptMode]);

  const setInterruptMode = useCallback(
    (mode: InterruptMode) => {
      if (fixedInterruptMode != null) return;
      setInterruptModeState(mode);
      persistInterruptMode(mode);
    },
    [fixedInterruptMode],
  );

  return { interruptMode, setInterruptMode, interruptModeReady };
};

export const StreamingAvatarProvider = ({
  children,
  basePath,
  streamLifecycleRef = defaultStreamLifecycleRef,
  /** When set (e.g. public meet), interrupt mode is locked and not read from localStorage. */
  fixedInterruptMode,
}: {
  children: React.ReactNode;
  basePath?: string;
  streamLifecycleRef?: React.MutableRefObject<AvatarStreamLifecycleHandlers>;
  fixedInterruptMode?: InterruptMode;
}) => {
  const avatarRef = React.useRef<StreamingAvatar>(null);
  const voiceChatState = useStreamingAvatarVoiceChatState();
  const sessionState = useStreamingAvatarSessionState();
  const messageState = useStreamingAvatarMessageState();
  const listeningState = useStreamingAvatarListeningState();
  const talkingState = useStreamingAvatarTalkingState();
  const connectionQualityState = useStreamingAvatarConnectionQualityState();
  const interruptModeState = useInterruptModeState(fixedInterruptMode);

  return (
    <StreamingAvatarContext.Provider
      value={{
        avatarRef,
        basePath,
        ...voiceChatState,
        ...sessionState,
        ...messageState,
        ...listeningState,
        ...talkingState,
        ...connectionQualityState,
        ...interruptModeState,
        streamLifecycleRef,
      }}
    >
      {children}
    </StreamingAvatarContext.Provider>
  );
};

export const useStreamingAvatarContext = () => {
  return React.useContext(StreamingAvatarContext);
};
