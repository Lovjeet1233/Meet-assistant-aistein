import type { StartAvatarRequest } from "@heygen/streaming-avatar";
import { STTProvider } from "@heygen/streaming-avatar";

/**
 * HeyGen Streaming Avatar does not expose client-side VAD knobs in the SDK.
 * We tune `stt_settings.confidence` (see HeyGen "New Session" API; default 0.55).
 * Higher confidence = stricter acceptance of speech → fewer false triggers from noise.
 *
 * Debounce values only affect local UI state (`isUserTalking`); the server still
 * drives when the avatar stops for interruption — confidence is the main lever.
 */
export type InterruptMode = "sensitive" | "robust";

export const INTERRUPT_MODE_STORAGE_KEY = "heygen-interrupt-mode";

/** HeyGen default STT confidence (from API docs). */
export const HEYGEN_DEFAULT_STT_CONFIDENCE = 0.55;

export type InterruptProfile = {
  /** Passed to HeyGen `stt_settings.confidence` */
  sttConfidence: number;
  /** Delay before treating USER_START as "user talking" in UI */
  userStartDebounceMs: number;
  /** Keep "user talking" true briefly after USER_STOP to reduce flicker */
  userStopHoldMs: number;
};

export const INTERRUPT_PROFILES: Record<InterruptMode, InterruptProfile> = {
  sensitive: {
    sttConfidence: 0.86,
    userStartDebounceMs: 60,
    userStopHoldMs: 120,
  },
  robust: {
    sttConfidence: 0.82,
    userStartDebounceMs: 420,
    userStopHoldMs: 280,
  },
};

export function isInterruptMode(value: string | null): value is InterruptMode {
  return value === "sensitive" || value === "robust";
}

export function readStoredInterruptMode(): InterruptMode {
  if (typeof window === "undefined") return "sensitive";
  try {
    const raw = localStorage.getItem(INTERRUPT_MODE_STORAGE_KEY);
    if (isInterruptMode(raw)) return raw;
  } catch {
    /* ignore */
  }
  return "sensitive";
}

export function persistInterruptMode(mode: InterruptMode): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(INTERRUPT_MODE_STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}

/**
 * Merges interrupt profile into StartAvatarRequest without dropping caller STT options.
 */
export function mergeStartAvatarRequestWithInterruptProfile(
  config: StartAvatarRequest,
  mode: InterruptMode,
): StartAvatarRequest {
  const profile = INTERRUPT_PROFILES[mode];
  return {
    ...config,
    sttSettings: {
      ...config.sttSettings,
      provider: config.sttSettings?.provider ?? STTProvider.DEEPGRAM,
      confidence: profile.sttConfidence,
    },
  };
}
