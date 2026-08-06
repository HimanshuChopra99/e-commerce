import React, { useState, useEffect, useCallback, useRef } from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { createCall } from "../../lib/api";
import { retellClient } from "../../lib/retell";
import { connectSocket, disconnectSocket, getSocket } from "../../lib/socket";
import { useSelector } from "react-redux";
import { MicOff, Loader2, Volume2, PhoneCall, AlertCircle, X } from "lucide-react";

const AiAgentIcon = () => {
  const user = useSelector((state) => state.auth?.user);

  const [callState, setCallState] = useState("idle"); // idle | connecting | connected | error
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isHovered, setIsHovered] = useState(false);
  const [showGreeting, setShowGreeting] = useState(true);

  const lottieRef = useRef(null);

  // Dynamic User Name
  const userName = user?.firstName || user?.name || "there";

  // Handle call end and cleanup
  const handleCleanup = useCallback(() => {
    setCallState("idle");
    setIsAgentSpeaking(false);

    const socket = getSocket();
    if (socket?.connected) {
      socket.emit("retell-call-ended", {
        userId: user?.id || "guest",
        timestamp: new Date().toISOString(),
      });
    }

    try {
      retellClient.stopCall();
    } catch (err) {
      // Ignored if already stopped
    }

    disconnectSocket();
  }, [user?.id]);

  // Retell SDK Event Listeners
  useEffect(() => {
    const handleCallStarted = () => {
      setCallState("connected");
      setShowGreeting(false);
      const socket = getSocket();
      if (socket?.connected) {
        socket.emit("retell-call-started", {
          userId: user?.id || "guest",
          timestamp: new Date().toISOString(),
        });
      }
    };

    const handleCallEnded = () => handleCleanup();
    const handleAgentStartTalking = () => setIsAgentSpeaking(true);
    const handleAgentStopTalking = () => setIsAgentSpeaking(false);

    const handleError = (error) => {
      setErrorMessage(error.message || "Call error occurred");
      handleCleanup();
    };

    retellClient.on("call_started", handleCallStarted);
    retellClient.on("call_ended", handleCallEnded);
    retellClient.on("agent_start_talking", handleAgentStartTalking);
    retellClient.on("agent_stop_talking", handleAgentStopTalking);
    retellClient.on("error", handleError);

    return () => {
      retellClient.off("call_started", handleCallStarted);
      retellClient.off("call_ended", handleCallEnded);
      retellClient.off("agent_start_talking", handleAgentStartTalking);
      retellClient.off("agent_stop_talking", handleAgentStopTalking);
      retellClient.off("error", handleError);
    };
  }, [handleCleanup, user?.id]);

  // Keep Lottie Animation at normal speed (1x)
  useEffect(() => {
    if (lottieRef.current) {
      lottieRef.current.setSpeed(1);
    }
  }, [callState]);

  // Toggle Retell call
  const handleToggleCall = async () => {
    setErrorMessage("");
    setShowGreeting(false);

    if (callState === "connected" || callState === "connecting") {
      handleCleanup();
      return;
    }

    try {
      setCallState("connecting");
      connectSocket(user?.id || "guest");

      const userId = user?.id || `guest_${Math.random().toString(36).substring(2, 9)}`;
      const formattedUserName = user?.firstName || user?.name || "Guest User";

      const data = await createCall({ userId, userName: formattedUserName });
      const accessToken = data?.session?.access_token;

      if (!accessToken) {
        throw new Error("Failed to receive valid Retell access token.");
      }

      await retellClient.startCall({ accessToken });
    } catch (err) {
      setErrorMessage(err.message || "Failed to start call");
      handleCleanup();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-2.5 select-none font-sans">
      
      {/* Light Theme Error Popup */}
      {errorMessage && (
        <div className="flex items-center gap-2 bg-red-50 text-red-800 text-xs px-3.5 py-2 rounded-xl shadow-md border border-red-200 animate-fade-in backdrop-blur-md">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 1. Light Theme Message Bubble & Hover Button */}
      {callState === "idle" && (
        <div className="animate-fade-in">
          {isHovered ? (
            /* Button on Hover (Light Primary Style) */
            <div className="flex items-center gap-2 bg-indigo-600 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-md shadow-indigo-500/20 border border-indigo-500 transition-all duration-200">
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Click to start</span>
            </div>
          ) : (
            showGreeting && (
              /* Greeting Speech Bubble (Light Mode) */
              <div className="relative flex items-center justify-between gap-2.5 bg-white/95 text-slate-800 text-xs px-4 py-3 rounded-2xl shadow-xl shadow-slate-300/40 border border-slate-200/90 backdrop-blur-md max-w-[230px]">
                <span className="leading-snug">
                  Hey <strong className="text-indigo-600 font-semibold">{userName}</strong>, how can I help you?
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowGreeting(false);
                  }}
                  className="text-slate-400 hover:text-slate-600 p-0.5 rounded-full transition-colors"
                  title="Close"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                {/* Speech Bubble Arrow (Light Mode) */}
                <div className="absolute -bottom-1.5 right-8 w-3 h-3 bg-white border-r border-b border-slate-200/90 rotate-45 pointer-events-none" />
              </div>
            )
          )}
        </div>
      )}

      {/* 2. Light Theme Active Call Status Pill */}
      {callState !== "idle" && (
        <div className="flex items-center gap-2 bg-white/95 text-slate-700 text-xs px-3.5 py-2 rounded-full shadow-lg shadow-slate-200/60 border border-slate-200/90 backdrop-blur-md animate-fade-in">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              callState === "connecting"
                ? "bg-amber-500 animate-ping"
                : isAgentSpeaking
                ? "bg-emerald-500 animate-pulse"
                : "bg-blue-500"
            }`}
          />
          <span className="font-semibold text-slate-700">
            {callState === "connecting" && "Connecting..."}
            {callState === "connected" && (isAgentSpeaking ? "AI Speaking..." : "AI Listening")}
          </span>
          {isAgentSpeaking && <Volume2 className="w-3.5 h-3.5 text-emerald-600" />}
        </div>
      )}

      {/* 3. Main Interactive Container */}
      <div
        className="relative w-28 h-28 cursor-pointer flex items-center justify-center group"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleToggleCall}
      >
        {/* Glow rings when speaking/connecting */}
        {callState === "connected" && isAgentSpeaking && (
          <span className="absolute inset-1 rounded-full bg-emerald-500/20 animate-pulse pointer-events-none" />
        )}

        {callState === "connecting" && (
          <span className="absolute inset-1 rounded-full bg-amber-500/20 animate-ping pointer-events-none" />
        )}

        {/* Lottie Animation (Normal Speed 1x) */}
        <div className="w-full h-full pointer-events-none transition-transform duration-300 ease-out group-hover:scale-105">
          <DotLottieReact
            src="https://lottie.host/24856c72-6258-4a41-9c08-1bb0bcbdd892/Rxo3WStR06.json"
            loop
            autoplay
            dotLottieRefCallback={(dotLottie) => {
              lottieRef.current = dotLottie;
              if (dotLottie) dotLottie.setSpeed(1);
            }}
          />
        </div>

        {/* Small Action Badge Indicator */}
        <div className="absolute bottom-1 right-1 z-10 transition-transform duration-200 group-hover:scale-110">
          {callState === "connecting" ? (
            <div className="p-2 bg-amber-500 text-white rounded-full shadow-md">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          ) : callState === "connected" ? (
            <div className="p-2 bg-red-600 text-white rounded-full shadow-md hover:bg-red-700">
              <MicOff className="w-4 h-4" />
            </div>
          ) : null}
        </div>
      </div>

      {/* CSS Animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.25s ease-out forwards; }
      `}} />
    </div>
  );
};

export default AiAgentIcon;