import { ConnectionQuality } from '@heygen/streaming-avatar';
import React, { forwardRef, useEffect } from 'react';

import { StreamingAvatarSessionState } from '../logic';
import { useConnectionQuality } from '../logic/useConnectionQuality';
import { useStreamingAvatarSession } from '../logic/useStreamingAvatarSession';

export const AvatarVideo = forwardRef<
  HTMLVideoElement,
  { objectFit?: 'contain' | 'cover' }
>(({ objectFit = 'contain' }, ref) => {
  const { sessionState } = useStreamingAvatarSession();
  const { connectionQuality, subscriberRttMs } = useConnectionQuality();

  const isLoaded = sessionState === StreamingAvatarSessionState.CONNECTED;

  useEffect(() => {
    if (connectionQuality !== ConnectionQuality.UNKNOWN) {
      console.info('[HeyGen Streaming] connection quality:', connectionQuality);
    }
  }, [connectionQuality]);

  return (
    <>
      {(connectionQuality !== ConnectionQuality.UNKNOWN || subscriberRttMs != null) && (
        <div className="absolute left-3 top-3 z-10 flex flex-col gap-1 rounded-lg bg-black/85 px-3 py-2 text-xs text-white shadow-lg backdrop-blur-sm">
          <div className="font-semibold text-zinc-200">Connection</div>
          <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[11px]">
            <span>
              Quality: <span className="text-emerald-300">{connectionQuality}</span>
            </span>
            {subscriberRttMs != null && (
              <span>
                RTT ≈ <span className="text-sky-300">{Math.round(subscriberRttMs)} ms</span>
              </span>
            )}
          </div>
        </div>
      )}
      <video
        ref={ref}
        autoPlay
        playsInline
        muted={false}
        controls={false}
        disablePictureInPicture
        preload="metadata"
        className="h-full w-full"
        style={{
          objectFit,
        }}
      >
        <track kind="captions" />
      </video>
      {!isLoaded && (
        <div className="absolute left-0 top-0 flex h-full w-full items-center justify-center bg-black/40 text-sm text-white/80">
          Loading…
        </div>
      )}
    </>
  );
});
AvatarVideo.displayName = 'AvatarVideo';
