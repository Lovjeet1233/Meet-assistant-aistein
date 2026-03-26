import { ToggleGroup, ToggleGroupItem } from "@radix-ui/react-toggle-group";
import React from "react";

import { useStreamingAvatarContext } from "../logic/context";
import { useVoiceChat } from "../logic/useVoiceChat";

import { AudioInput } from "./AudioInput";
import { TextInput } from "./TextInput";

export const AvatarControls: React.FC = () => {
  const {
    isVoiceChatLoading,
    isVoiceChatActive,
    startVoiceChat,
    stopVoiceChat,
  } = useVoiceChat();
  const { interruptMode, setInterruptMode } = useStreamingAvatarContext();

  const handleInterruptModeChange = (value: string) => {
    if (value !== "sensitive" && value !== "robust") return;
    setInterruptMode(value);
  };

  return (
    <div className="flex flex-col gap-3 relative w-full items-center max-w-md">
      <div className="w-full rounded-lg border border-zinc-600 bg-zinc-800/80 p-2">
        <p className="text-[10px] uppercase tracking-wide text-zinc-400 mb-1.5 px-1">
          Voice interrupt
        </p>
        <ToggleGroup
          className="flex w-full rounded-md bg-zinc-900 p-0.5"
          type="single"
          value={interruptMode}
          onValueChange={handleInterruptModeChange}
        >
          <ToggleGroupItem
            className="flex-1 data-[state=on]:bg-amber-600/90 data-[state=on]:text-white rounded px-2 py-1.5 text-xs text-center text-zinc-300"
            value="sensitive"
            title="Lower STT confidence — reacts quickly; more false cuts on noise"
          >
            Sensitive
          </ToggleGroupItem>
          <ToggleGroupItem
            className="flex-1 data-[state=on]:bg-emerald-600/90 data-[state=on]:text-white rounded px-2 py-1.5 text-xs text-center text-zinc-300"
            value="robust"
            title="Higher STT confidence — ignores faint noise better (HeyGen API)"
          >
            Robust
          </ToggleGroupItem>
        </ToggleGroup>
        <p className="text-[10px] text-zinc-500 mt-1.5 px-1 leading-snug">
          Robust uses a higher HeyGen{" "}
          <code className="text-zinc-400">stt_settings.confidence</code> so faint
          sounds are less likely to cut the avatar off. Switching mode stops the
          session — dashboard chat auto-restarts; on the demo page press Start
          again.
        </p>
      </div>
      <ToggleGroup
        className={`bg-zinc-700 rounded-lg p-1 ${isVoiceChatLoading ? "opacity-50" : ""}`}
        disabled={isVoiceChatLoading}
        type="single"
        value={isVoiceChatActive || isVoiceChatLoading ? "voice" : "text"}
        onValueChange={(value) => {
          if (value === "voice" && !isVoiceChatActive && !isVoiceChatLoading) {
            startVoiceChat();
          } else if (
            value === "text" &&
            isVoiceChatActive &&
            !isVoiceChatLoading
          ) {
            stopVoiceChat();
          }
        }}
      >
        <ToggleGroupItem
          className="data-[state=on]:bg-zinc-800 rounded-lg p-2 text-sm w-[90px] text-center"
          value="voice"
        >
          Voice Chat
        </ToggleGroupItem>
        <ToggleGroupItem
          className="data-[state=on]:bg-zinc-800 rounded-lg p-2 text-sm w-[90px] text-center"
          value="text"
        >
          Text Chat
        </ToggleGroupItem>
      </ToggleGroup>
      {isVoiceChatActive || isVoiceChatLoading ? <AudioInput /> : <TextInput />}
    </div>
  );
};
