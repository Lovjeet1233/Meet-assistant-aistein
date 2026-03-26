import StreamingAvatar, {
  ConnectionQuality,
  StartAvatarRequest,
  StreamingEvents,
} from "@heygen/streaming-avatar";
import { useCallback, useEffect, useRef } from "react";

import { buildAvatarMediaStreamFromLiveKitRoom } from "@/lib/streaming/buildAvatarMediaStreamFromLiveKitRoom";
import { estimateLiveKitSubscriberRttMs } from "@/lib/streaming/livekitRtt";
import { RoomEvent } from "livekit-client";

import {
  StreamingAvatarSessionState,
  useStreamingAvatarContext,
} from "./context";
import {
  INTERRUPT_PROFILES,
  mergeStartAvatarRequestWithInterruptProfile,
} from "./interruptMode";
import { useMessageHistory } from "./useMessageHistory";
import { useVoiceChat } from "./useVoiceChat";

/** SDK `.on()` typings are loose; keep wrappers compatible with StreamingAvatar. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SdkEventHandler = (...args: any[]) => void;

export const useStreamingAvatarSession = () => {
  const {
    avatarRef,
    basePath,
    sessionState,
    setSessionState,
    stream,
    setStream,
    setIsListening,
    setIsUserTalking,
    setIsAvatarTalking,
    setConnectionQuality,
    setSubscriberRttMs,
    handleUserTalkingMessage,
    handleStreamingTalkingMessage,
    handleEndMessage,
    clearMessages,
    interruptMode,
    interruptModeReady,
    streamLifecycleRef,
  } = useStreamingAvatarContext();
  const { stopVoiceChat } = useVoiceChat();

  const sessionStateRef = useRef(sessionState);
  sessionStateRef.current = sessionState;

  const interruptModeRef = useRef(interruptMode);
  /** Keep in sync during render so `start()` never merges STT profile from a stale ref. */
  interruptModeRef.current = interruptMode;

  /** Coalesces concurrent `start()` calls into one in-flight promise (Strict Mode / double effects). */
  const startPromiseRef = useRef<Promise<StreamingAvatar | void> | null>(null);

  /** Per-session `.off` callbacks so we never stack duplicate listeners on reconnect. */
  const sessionListenerCleanupsRef = useRef<(() => void)[]>([]);

  const runSessionListenerCleanups = useCallback(() => {
    const fns = sessionListenerCleanupsRef.current;
    sessionListenerCleanupsRef.current = [];
    fns.forEach((fn) => {
      try {
        fn();
      } catch {
        /* ignore */
      }
    });
  }, []);

  const registerSessionListener = useCallback(
    (sessionAvatar: StreamingAvatar, event: string, handler: SdkEventHandler) => {
      sessionAvatar.on(event, handler);
      sessionListenerCleanupsRef.current.push(() => {
        sessionAvatar.off(event, handler);
      });
    },
    [],
  );

  /** Debounce timers for USER_START / USER_STOP → isUserTalking (UI only). */
  const userTalkingDebounceRef = useRef<{
    start: ReturnType<typeof setTimeout> | null;
    stop: ReturnType<typeof setTimeout> | null;
  }>({ start: null, stop: null });

  const clearUserTalkingDebounce = useCallback(() => {
    const { start, stop } = userTalkingDebounceRef.current;
    if (start) clearTimeout(start);
    if (stop) clearTimeout(stop);
    userTalkingDebounceRef.current = { start: null, stop: null };
  }, []);

  useMessageHistory();

  const init = useCallback(
    (token: string) => {
      if (avatarRef.current) {
        runSessionListenerCleanups();
        const stale = avatarRef.current;
        avatarRef.current = null;
        void stale.stopAvatar().catch(() => {
          /* already torn down */
        });
      }

      avatarRef.current = new StreamingAvatar({
        token,
        basePath: basePath,
      });

      return avatarRef.current;
    },
    [basePath, avatarRef, runSessionListenerCleanups],
  );

  const handleStream = useCallback(
    ({ detail }: { detail: MediaStream }) => {
      setStream(detail);
      setSessionState(StreamingAvatarSessionState.CONNECTED);
      streamLifecycleRef.current?.onStreamConnected?.();
    },
    [setSessionState, setStream, streamLifecycleRef],
  );

  const stop = useCallback(async () => {
    try {
      startPromiseRef.current = null;
      clearUserTalkingDebounce();
      runSessionListenerCleanups();
      clearMessages();
      stopVoiceChat();
      setIsListening(false);
      setIsUserTalking(false);
      setIsAvatarTalking(false);
      setStream(null);
      setConnectionQuality(ConnectionQuality.UNKNOWN);
      setSubscriberRttMs(null);

      if (avatarRef.current) {
        try {
          await avatarRef.current.stopAvatar();
        } catch (error) {
          console.error(
            "Error stopping avatar (may already be stopped):",
            error,
          );
        }
      }

      avatarRef.current = null;
      setSessionState(StreamingAvatarSessionState.INACTIVE);
    } catch (error) {
      console.error("Error in stop cleanup:", error);
      startPromiseRef.current = null;
      avatarRef.current = null;
      setSessionState(StreamingAvatarSessionState.INACTIVE);
    }
  }, [
    runSessionListenerCleanups,
    setSessionState,
    setStream,
    avatarRef,
    setIsListening,
    stopVoiceChat,
    clearMessages,
    setIsUserTalking,
    setIsAvatarTalking,
    clearUserTalkingDebounce,
    setConnectionQuality,
    setSubscriberRttMs,
  ]);

  /**
   * When the user switches interrupt mode during an active session, stop so the
   * next start() picks up new STT confidence (merged in createStartAvatar).
   * Chat page auto-starts on INACTIVE; InteractiveAvatar user taps Start again.
   */
  const prevInterruptModeForRestartRef = useRef<typeof interruptMode | null>(
    null,
  );
  useEffect(() => {
    if (!interruptModeReady) {
      return;
    }
    if (sessionState !== StreamingAvatarSessionState.CONNECTED) {
      if (sessionState === StreamingAvatarSessionState.INACTIVE) {
        prevInterruptModeForRestartRef.current = null;
      }
      return;
    }
    if (prevInterruptModeForRestartRef.current === null) {
      prevInterruptModeForRestartRef.current = interruptMode;
      return;
    }
    if (prevInterruptModeForRestartRef.current === interruptMode) {
      return;
    }
    prevInterruptModeForRestartRef.current = interruptMode;
    void stop();
  }, [interruptMode, interruptModeReady, sessionState, stop]);

  /** Poll LiveKit subscriber RTT while connected (HeyGen uses LiveKit for media). */
  useEffect(() => {
    if (sessionState !== StreamingAvatarSessionState.CONNECTED) {
      setSubscriberRttMs(null);
      return;
    }

    let cancelled = false;

    const tick = async () => {
      const room = avatarRef.current?.room ?? null;
      const ms = await estimateLiveKitSubscriberRttMs(room);
      if (cancelled) return;
      setSubscriberRttMs(ms);
      if (ms != null) {
        console.info(
          "[HeyGen Streaming] subscriber RTT (approx):",
          `${Math.round(ms)} ms`,
        );
      }
    };

    void tick();
    const id = setInterval(() => void tick(), 2000);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [sessionState, avatarRef, setSubscriberRttMs]);

  const start = useCallback(
    async (config: StartAvatarRequest, token?: string) => {
      let pending = startPromiseRef.current;
      if (!pending) {
        pending = (async () => {
          try {
            if (sessionStateRef.current !== StreamingAvatarSessionState.INACTIVE) {
              throw new Error("There is already an active session");
            }

            if (!avatarRef.current) {
              if (!token) {
                throw new Error("Token is required");
              }
              init(token);
            }

            if (!avatarRef.current) {
              throw new Error("Avatar is not initialized");
            }

            const sessionAvatar = avatarRef.current;

            setSessionState(StreamingAvatarSessionState.CONNECTING);
            const mergedConfig = mergeStartAvatarRequestWithInterruptProfile(
              config,
              interruptModeRef.current,
            );

            registerSessionListener(sessionAvatar, StreamingEvents.STREAM_READY, handleStream);
            registerSessionListener(sessionAvatar, StreamingEvents.STREAM_DISCONNECTED, () => {
              streamLifecycleRef.current?.onStreamDisconnected?.();
              void stop();
            });

            const onConnectionQuality: SdkEventHandler = (ev) => {
              const detail = (ev as CustomEvent<ConnectionQuality>).detail;
              setConnectionQuality(detail);
            };
            registerSessionListener(
              sessionAvatar,
              StreamingEvents.CONNECTION_QUALITY_CHANGED,
              onConnectionQuality,
            );

            registerSessionListener(sessionAvatar, StreamingEvents.USER_START, () => {
              const mode = interruptModeRef.current;
              const { userStartDebounceMs } = INTERRUPT_PROFILES[mode];
              const timers = userTalkingDebounceRef.current;
              if (timers.start) clearTimeout(timers.start);
              if (timers.stop) clearTimeout(timers.stop);
              timers.stop = null;

              timers.start = setTimeout(() => {
                userTalkingDebounceRef.current.start = null;
                setIsUserTalking(true);
              }, userStartDebounceMs);
            });

            registerSessionListener(sessionAvatar, StreamingEvents.USER_STOP, () => {
              const mode = interruptModeRef.current;
              const { userStopHoldMs } = INTERRUPT_PROFILES[mode];
              const timers = userTalkingDebounceRef.current;

              if (timers.start) {
                clearTimeout(timers.start);
                timers.start = null;
                return;
              }

              if (timers.stop) clearTimeout(timers.stop);
              timers.stop = setTimeout(() => {
                userTalkingDebounceRef.current.stop = null;
                setIsUserTalking(false);
              }, userStopHoldMs);
            });

            registerSessionListener(
              sessionAvatar,
              StreamingEvents.AVATAR_START_TALKING,
              () => {
                setIsAvatarTalking(true);
              },
            );
            registerSessionListener(
              sessionAvatar,
              StreamingEvents.AVATAR_STOP_TALKING,
              () => {
                setIsAvatarTalking(false);
              },
            );

            registerSessionListener(
              sessionAvatar,
              StreamingEvents.USER_TALKING_MESSAGE,
              handleUserTalkingMessage,
            );
            registerSessionListener(
              sessionAvatar,
              StreamingEvents.AVATAR_TALKING_MESSAGE,
              handleStreamingTalkingMessage,
            );
            registerSessionListener(
              sessionAvatar,
              StreamingEvents.USER_END_MESSAGE,
              handleEndMessage,
            );
            registerSessionListener(
              sessionAvatar,
              StreamingEvents.AVATAR_END_MESSAGE,
              handleEndMessage,
            );

            await sessionAvatar.createStartAvatar(mergedConfig);

            /** Fallback if SDK never emits STREAM_READY but LiveKit already has video. */
            const tryAttachStreamFromRoom = (): boolean => {
              if (
                sessionStateRef.current ===
                StreamingAvatarSessionState.CONNECTED
              ) {
                return true;
              }
              const fromSdk = sessionAvatar.mediaStream;
              if (fromSdk && fromSdk.getVideoTracks().length > 0) {
                handleStream({ detail: fromSdk });
                return true;
              }
              const built = buildAvatarMediaStreamFromLiveKitRoom(
                sessionAvatar.room,
              );
              if (built && built.getVideoTracks().length > 0) {
                handleStream({ detail: built });
                return true;
              }
              return false;
            };

            tryAttachStreamFromRoom();

            const lkRoom = sessionAvatar.room;
            if (lkRoom) {
              const onRemoteTrack = () => {
                tryAttachStreamFromRoom();
              };
              lkRoom.on(RoomEvent.TrackSubscribed, onRemoteTrack);
              sessionListenerCleanupsRef.current.push(() => {
                lkRoom.off(RoomEvent.TrackSubscribed, onRemoteTrack);
              });
            }

            const pollDeadline = Date.now() + 20_000;
            const pollId = setInterval(() => {
              if (tryAttachStreamFromRoom() || Date.now() > pollDeadline) {
                clearInterval(pollId);
              }
            }, 350);
            sessionListenerCleanupsRef.current.push(() => clearInterval(pollId));

            return sessionAvatar;
          } finally {
            startPromiseRef.current = null;
          }
        })();
        startPromiseRef.current = pending;
      }
      return pending;
    },
    [
      init,
      handleStream,
      stop,
      setSessionState,
      avatarRef,
      sessionStateRef,
      setConnectionQuality,
      setIsUserTalking,
      handleUserTalkingMessage,
      handleStreamingTalkingMessage,
      handleEndMessage,
      setIsAvatarTalking,
      registerSessionListener,
      streamLifecycleRef,
    ],
  );

  return {
    avatarRef,
    sessionState,
    stream,
    initAvatar: init,
    startAvatar: start,
    stopAvatar: stop,
    interruptModeReady,
  };
};
