import type { Room } from "livekit-client";

/**
 * Samples WebRTC subscriber RTT from LiveKit (used by HeyGen Streaming Avatar).
 * `currentRoundTripTime` is in seconds per WebRTC stats; converted to ms.
 */
export async function estimateLiveKitSubscriberRttMs(
  room: Room | null,
): Promise<number | null> {
  const pcManager = room?.engine?.pcManager;
  if (!pcManager?.subscriber) return null;

  try {
    const stats = await pcManager.subscriber.getStats();
    let bestMs: number | null = null;

    stats.forEach((report) => {
      if (report.type !== "candidate-pair") return;
      const pair = report as RTCStats & {
        state?: string;
        currentRoundTripTime?: number;
        nominated?: boolean;
      };
      if (
        pair.currentRoundTripTime == null ||
        Number.isNaN(pair.currentRoundTripTime)
      ) {
        return;
      }
      const ms = pair.currentRoundTripTime * 1000;
      const ok =
        pair.state === "succeeded" ||
        pair.state === "in-progress" ||
        (pair as { nominated?: boolean }).nominated === true;
      if (!ok) return;
      if (bestMs == null || ms < bestMs) bestMs = ms;
    });

    return bestMs;
  } catch {
    return null;
  }
}
