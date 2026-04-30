"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { TrulienceAvatar } from "@trulience/react-sdk";
import Vapi from "@vapi-ai/web";
import { Mic, MicOff, Volume1, VolumeX } from "lucide-react";

export default function AvatarPage() {
  const { id } = useParams();
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [vapi, setVapi] = useState<Vapi | null>(null);
  const trulienceRef = useRef<any>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null); // 👈 ADDED

  // 👇 ADDED - fetches JWT token on page load
  useEffect(() => {
    if (!id) return;
    fetch(`/api/trulience-token?avatarId=${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.token) setAuthToken(d.token);
        else console.error("Failed to get Trulience token:", d.error);
      })
      .catch((err) => console.error("Token fetch error:", err));
  }, [id]);

  const eventCallbacks = {
    "websocket-connect": () => {
      console.log("Trulience websocket connected, attaching stream");
      if (remoteStream && trulienceRef.current) {
        trulienceRef.current.setMediaStream(remoteStream);
        trulienceRef.current.getTrulienceObject().setSpeakerEnabled(true);
        console.log("Stream attached and speaker enabled (happy path)");
      }
    },
  };

  const startSession = async () => {
    try {
      setConnecting(true);
      const trulienceObj = trulienceRef.current.getTrulienceObject();
      trulienceObj.connectGateway();

      const VAPI_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
      const VAPI_ASSISTANT_ID = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;

      if (!VAPI_PUBLIC_KEY || !VAPI_ASSISTANT_ID) {
        throw new Error(
          "Missing VAPI_PUBLIC_KEY or VAPI_ASSISTANT_ID in environment variables"
        );
      }

      const vapiInstance = new Vapi(VAPI_PUBLIC_KEY);
      setVapi(vapiInstance);

      vapiInstance.on("call-start", () => {
        console.log("Vapi call started");
        setConnected(true);
        setConnecting(false);
      });

      vapiInstance.on("call-end", () => {
        console.log("Vapi call ended");
        setConnected(false);
        setRemoteStream(null);
      });

      vapiInstance.on("speech-start", () => {
        console.log("Assistant started speaking");
      });

      vapiInstance.on("speech-end", () => {
        console.log("Assistant stopped speaking");
      });

      vapiInstance.on("volume-level", (volume) => {
        console.log(`Assistant volume level: ${volume}`);
      });

      vapiInstance.on("message", (message) => {
        console.log("Vapi message:", message);

        if (message.type === "model-output") {
          const trulienceObj = trulienceRef.current.getTrulienceObject();
          try {
            if (trulienceObj.processSSML)
              trulienceObj.processSSML({ text: message.output }, "chunk");
          } catch (error) {
            console.error("Error while handling model output: ", error);
          }
        }
      });

      vapiInstance.on("error", (error) => {
        console.error("Vapi error:", error);
      });

      vapiInstance.on("video", (track) => {
        console.log("Received video track from Vapi:", track);
      });

      const dailyCallStarted = new Promise((resolve) => {
        const checkDaily = () => {
          const dailyCall = vapiInstance.getDailyCallObject();
          if (dailyCall) {
            console.log("Daily call object available");

            dailyCall.on("track-started", (event) => {
              console.log("Daily track started:", event);
              if (
                event.participant &&
                !event.participant.local &&
                event.track.kind === "audio"
              ) {
                console.log("Received audio track from Vapi");
                const stream = new MediaStream([event.track]);
                setRemoteStream(stream);

                if (trulienceRef.current) {
                  trulienceRef.current.setMediaStream(stream);
                  const trulienceObj =
                    trulienceRef.current.getTrulienceObject();
                  if (trulienceObj) {
                    trulienceObj.setSpeakerEnabled(true);
                  }
                }

                setTimeout(() => {
                  const vapiAudioPlayer = document.querySelector(
                    `audio[data-participant-id="${event.participant!.session_id}"]`
                  ) as HTMLAudioElement;
                  if (vapiAudioPlayer) {
                    vapiAudioPlayer.muted = true;
                    console.log("Muted Vapi audio player to prevent double audio");
                  }
                }, 100);
              }
            });

            resolve(dailyCall);
          } else {
            setTimeout(checkDaily, 100);
          }
        };
        checkDaily();
      });

      await vapiInstance.start(VAPI_ASSISTANT_ID);
      await dailyCallStarted;
    } catch (err) {
      console.error("Error starting session:", err);
      setConnected(false);
      setConnecting(false);
    }
  };

  const disconnectSession = async () => {
    const trulienceObj = trulienceRef.current.getTrulienceObject();
    trulienceObj.disconnectGateway();
    trulienceObj.preloadAvatar();
    if (vapi) {
      await vapi.stop();
      setVapi(null);
    }
    setConnected(false);
    setRemoteStream(null);
  };

  const toggleMic = () => {
    if (vapi) {
      vapi.setMuted(!isMicMuted);
      setIsMicMuted(!isMicMuted);
    }
  };

  const toggleSpeaker = () => {
    if (trulienceRef.current) {
      const trulienceObj = trulienceRef.current.getTrulienceObject();
      if (trulienceObj) {
        trulienceObj.setSpeakerEnabled(isSpeakerMuted);
        setIsSpeakerMuted(!isSpeakerMuted);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (vapi) {
        vapi.stop();
      }
    };
  }, [vapi]);

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-8 gap-6">
      <h1 className="text-3xl font-bold">Trulience Vapi Demo</h1>
      <div className="flex flex-col items-center gap-4">
        <button
          onClick={startSession}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          disabled={connected || connecting}
        >
          {connected ? "Connected" : connecting ? "Connecting..." : "Start Session"}
        </button>
      </div>
      <div className="absolute inset-0">
        <TrulienceAvatar
          autoConnect={false}
          prefetchAvatar={true}
          ref={trulienceRef}
          url={process.env.NEXT_PUBLIC_TRULIENCE_SDK_URL || ""}
          avatarId={id as string}
          token={authToken || ""} // 👈 CHANGED from process.env.NEXT_PUBLIC_TRULIENCE_TOKEN
          width="100%"
          height="100%"
          eventCallbacks={eventCallbacks}
          envParams={{
            useAgoraVideo: true,
          }}
          avatarParams={{
            NativeBar: {
              enabled: true,
              style: {
                bar: {
                  background: "#3b82f6",
                },
                container: {
                  background: "#e0e0de",
                  "border-radius": "10px",
                  height: "10px",
                },
              },
            },
          }}
        />
      </div>
      <button
        onClick={connected ? disconnectSession : startSession}
        disabled={connecting}
        className={`cursor-pointer absolute bottom-6 px-6 py-3 rounded-lg text-white font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ${
          connected ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"
        }`}
      >
        {connected ? "Disconnect" : connecting ? "Connecting..." : "Connect"}
      </button>

      {connected && (
        <div className="absolute bottom-6 right-6 flex gap-2">
          <button
            onClick={toggleMic}
            className={`p-2 rounded-full text-white transition cursor-pointer ${
              isMicMuted ? "bg-red-500 hover:bg-red-600" : "bg-blue-600 hover:bg-blue-700"
            }`}
            title={isMicMuted ? "Unmute Microphone" : "Mute Microphone"}
          >
            {isMicMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
          <button
            onClick={toggleSpeaker}
            className={`p-2 rounded-full text-white transition cursor-pointer ${
              isSpeakerMuted ? "bg-red-500 hover:bg-red-600" : "bg-blue-600 hover:bg-blue-700"
            }`}
            title={isSpeakerMuted ? "Unmute Speaker" : "Mute Speaker"}
          >
            {isSpeakerMuted ? <VolumeX className="w-5 h-5" /> : <Volume1 className="w-5 h-5" />}
          </button>
        </div>
      )}
    </main>
  );
}