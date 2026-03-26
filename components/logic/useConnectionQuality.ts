import { useStreamingAvatarContext } from "./context";

export const useConnectionQuality = () => {
  const { connectionQuality, subscriberRttMs } = useStreamingAvatarContext();

  return {
    connectionQuality,
    subscriberRttMs,
  };
};
