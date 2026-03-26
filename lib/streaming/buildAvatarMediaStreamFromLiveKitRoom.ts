import type { Room } from "livekit-client";

/**
 * Builds a MediaStream from subscribed remote LiveKit tracks (HeyGen avatar).
 * Used when the streaming-avatar SDK misses `stream_ready` but media is present.
 */
export function buildAvatarMediaStreamFromLiveKitRoom(
  room: Room | null,
): MediaStream | null {
  if (!room) return null;
  const tracks: MediaStreamTrack[] = [];
  room.remoteParticipants.forEach((participant) => {
    participant.videoTrackPublications.forEach((pub) => {
      if (!pub.isSubscribed) return;
      const mt = pub.track?.mediaStreamTrack;
      if (mt && mt.readyState !== "ended") tracks.push(mt);
    });
    participant.audioTrackPublications.forEach((pub) => {
      if (!pub.isSubscribed) return;
      const mt = pub.track?.mediaStreamTrack;
      if (mt && mt.readyState !== "ended") tracks.push(mt);
    });
  });
  if (!tracks.some((t) => t.kind === "video")) return null;
  return new MediaStream(tracks);
}
