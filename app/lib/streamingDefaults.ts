import { AvatarQuality } from "@heygen/streaming-avatar";

/**
 * Default streaming quality for new sessions (was Low — hurts clarity).
 * HeyGen: high ≈ 720p / 2000kbps, medium ≈ 480p / 1000kbps (see API docs).
 */
export const DEFAULT_STREAMING_AVATAR_QUALITY = AvatarQuality.High;
