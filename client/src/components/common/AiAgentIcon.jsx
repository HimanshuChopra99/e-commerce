import React, { useState, useEffect, useCallback, useRef } from "react";
import { createCall } from "../../lib/api";
import { retellClient } from "../../lib/retell";
import { connectSocket, disconnectSocket, getSocket } from "../../lib/socket";
import { useSelector } from "react-redux";
import { MicOff, Loader2, Volume2, PhoneCall } from "lucide-react";

// --- Bot Icon Component (Converted from your SVG) ---
const BotIcon = () => {
  const svgRef = useRef(null);

  // Mouse tracking logic extracted from the SVG script tag for React compatibility
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const eyeLeft = svg.querySelector('#eye-left');
    const eyeRight = svg.querySelector('#eye-right');
    if (!eyeLeft || !eyeRight) return;

    const lx = 165, ly = 265;
    const rx = 275, ry = 265;
    const maxRadius = 14;

    const trackMouse = (e) => {
      const rect = svg.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
      const clientY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);

      const mouseX = ((clientX - rect.left) / rect.width) * 500;
      const mouseY = ((clientY - rect.top) / rect.height) * 500;

      const dxL = mouseX - lx;
      const dyL = mouseY - ly;
      const distL = Math.hypot(dxL, dyL) || 1;
      const moveL = Math.min(distL, maxRadius);
      const oxL = (dxL / distL) * moveL;
      const oyL = (dyL / distL) * moveL;

      const dxR = mouseX - rx;
      const dyR = mouseY - ry;
      const distR = Math.hypot(dxR, dyR) || 1;
      const moveR = Math.min(distR, maxRadius);
      const oxR = (dxR / distR) * moveR;
      const oyR = (dyR / distR) * moveR;

      eyeLeft.style.transform = `translate(${oxL}px, ${oyL}px)`;
      eyeRight.style.transform = `translate(${oxR}px, ${oyR}px)`;
    };

    window.addEventListener('mousemove', trackMouse);
    window.addEventListener('touchmove', trackMouse);

    return () => {
      window.removeEventListener('mousemove', trackMouse);
      window.removeEventListener('touchmove', trackMouse);
    };
  }, []);

  const svgStyles = `
    .ai-bot-wrapper {
      --bot-color: #2176ff;
    }
    .ai-bot-wrapper .interactive-bot { cursor: pointer; }
    .ai-bot-wrapper #bot-container {
      transform-origin: 220px 280px;
      animation: floatBody 4s ease-in-out infinite;
    }
    .ai-bot-wrapper .eye {
      transform-origin: center;
      animation: blink 4s infinite;
      transition: transform 0.1s ease-out;
    }
    .ai-bot-wrapper #eye-left { transform-origin: 165px 265px; }
    .ai-bot-wrapper #eye-right { transform-origin: 275px 265px; }
    .ai-bot-wrapper #headset-group {
      transform-origin: 355px 350px;
      animation: micSwing 3s ease-in-out infinite alternate;
    }
    .ai-bot-wrapper #mic-capsule { transform-origin: 215px 465px; }
    .ai-bot-wrapper #speech-bubble {
      transform-origin: 350px 110px;
      animation: bubbleBounce 3s ease-in-out infinite alternate;
      transition: transform 0.3s ease;
    }
    .ai-bot-wrapper .typing-bar-1 { animation: typeBar1 2s ease-in-out infinite alternate; }
    .ai-bot-wrapper .typing-bar-2 { animation: typeBar2 2s ease-in-out infinite alternate 0.4s; }
    .ai-bot-wrapper .ear-left {
      transform-origin: 50px 285px;
      animation: earFlex 4.5s ease-in-out infinite;
    }
    .ai-bot-wrapper .ear-right {
      transform-origin: 390px 285px;
      animation: earFlex 4.5s ease-in-out infinite 0.2s;
    }
    @keyframes floatBody {
      0%, 100% { transform: translateY(0px) rotate(0deg); }
      50% { transform: translateY(-12px) rotate(1deg); }
    }
    @keyframes blink {
      0%, 92%, 100% { transform: scaleY(1); }
      96% { transform: scaleY(0.08); }
    }
    @keyframes micSwing {
      0% { transform: rotate(0deg); }
      50% { transform: rotate(-4deg) translateY(-2px); }
      100% { transform: rotate(3deg) translateY(2px); }
    }
    @keyframes bubbleBounce {
      0% { transform: translateY(0) rotate(0deg); }
      100% { transform: translateY(-8px) rotate(1.5deg); }
    }
    @keyframes typeBar1 {
      0% { width: 130px; }
      50% { width: 65px; }
      100% { width: 120px; }
    }
    @keyframes typeBar2 {
      0% { width: 130px; }
      50% { width: 140px; }
      100% { width: 75px; }
    }
    @keyframes earFlex {
      0%, 90%, 100% { transform: scale(1); }
      93% { transform: scale(1.06, 0.94); }
      96% { transform: scale(0.94, 1.06); }
    }
    .ai-bot-wrapper svg:hover #head-main {
      transform: rotate(-2deg) scale(1.01);
      transition: transform 0.3s ease;
    }
    .ai-bot-wrapper svg:hover #speech-bubble {
      transform: scale(1.08) translate(6px, -6px);
    }
    .ai-bot-wrapper svg:active #bot-container {
      transform: scale(0.94) translateY(8px) !important;
      transition: transform 0.1s ease;
    }
  `;

  return (
    <div className="ai-bot-wrapper w-full h-full">
      <style dangerouslySetInnerHTML={{ __html: svgStyles }} />
      <svg ref={svgRef} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="100%" height="100%">
        <defs>
          <mask id="bubble-cutout">
            <rect x="0" y="0" width="500" height="500" fill="#ffffff" />
            <rect className="typing-bar-1" x="285" y="45" width="130" height="18" rx="9" fill="#000000" />
            <rect className="typing-bar-2" x="285" y="95" width="130" height="18" rx="9" fill="#000000" />
          </mask>
        </defs>
        <g id="bot-container" className="interactive-bot">
          <g id="speech-bubble">
            <path d="M 265 15 H 445 A 25 25 0 0 1 470 40 V 135 A 25 25 0 0 1 445 160 H 330 L 275 205 V 160 H 265 A 25 25 0 0 1 240 135 V 40 A 25 25 0 0 1 265 15 Z" fill="var(--bot-color)" mask="url(#bubble-cutout)" />
          </g>
          <g id="head-main" style={{ transformOrigin: '220px 280px', transition: 'transform 0.3s ease' }}>
            <g id="antenna">
              <line x1="139" y1="140" x2="139" y2="179" stroke="var(--bot-color)" strokeWidth="16" strokeLinecap="round" />
              <circle id="antenna-bulb" cx="139" cy="115" r="30" fill="var(--bot-color)" />
            </g>
            <g id="ears-layer">
              <rect className="ear-left" x="15" y="235" width="70" height="100" rx="25" fill="none" stroke="var(--bot-color)" strokeWidth="16" strokeLinejoin="round" />
              <rect className="ear-right" x="355" y="235" width="70" height="100" rx="25" fill="none" stroke="var(--bot-color)" strokeWidth="16" strokeLinejoin="round" />
            </g>
            <rect x="85" y="180" width="270" height="210" rx="55" fill="none" stroke="var(--bot-color)" strokeWidth="16" strokeLinejoin="round" />
            <g className="eye-group">
              <circle id="eye-left" className="eye" cx="165" cy="265" r="28" fill="var(--bot-color)" />
              <circle id="eye-right" className="eye" cx="275" cy="265" r="28" fill="var(--bot-color)" />
            </g>
            <path id="mouth" d="M 152 315 C 152 315, 170 365, 220 365 C 270 365, 288 315, 288 315 Z" fill="var(--bot-color)" />
            <g id="headset-group">
              <path d="M 355 350 L 385 350 C 400 350, 402 360, 402 375 L 402 415 C 402 448, 375 465, 335 465 L 255 465" fill="none" stroke="var(--bot-color)" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" />
              <ellipse id="mic-capsule" cx="215" cy="465" rx="45" ry="30" fill="var(--bot-color)" />
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
};


// --- Main AI Agent Component ---
const AiAgentIcon = () => {
  const user = useSelector((state) => state.auth?.user);
  
  const [callState, setCallState] = useState('idle');
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleCleanup = useCallback(() => {
    setCallState('idle');
    setIsAgentSpeaking(false);
    
    const socket = getSocket();
    if (socket?.connected) {
      socket.emit('retell-call-ended', {
        userId: user?.id || 'guest',
        timestamp: new Date().toISOString()
      });
    }

    try {
      retellClient.stopCall();
    } catch {
      // Ignored
    }

    disconnectSocket();
  }, [user?.id]);

  useEffect(() => {
    const handleCallStarted = () => {
      console.log("[Retell SDK] Call Started");
      setCallState('connected');

      const socket = getSocket();
      if (socket?.connected) {
        socket.emit('retell-call-started', {
          userId: user?.id || 'guest',
          timestamp: new Date().toISOString()
        });
      }
    };

    const handleCallEnded = () => {
      console.log("[Retell SDK] Call Ended");
      handleCleanup();
    };

    const handleAgentStartTalking = () => setIsAgentSpeaking(true);
    const handleAgentStopTalking = () => setIsAgentSpeaking(false);

    const handleError = (error) => {
      console.error("[Retell SDK] Error:", error);
      setErrorMessage(error.message || 'Call error occurred');
      handleCleanup();
    };

    retellClient.on('call_started', handleCallStarted);
    retellClient.on('call_ended', handleCallEnded);
    retellClient.on('agent_start_talking', handleAgentStartTalking);
    retellClient.on('agent_stop_talking', handleAgentStopTalking);
    retellClient.on('error', handleError);

    return () => {
      retellClient.off('call_started', handleCallStarted);
      retellClient.off('call_ended', handleCallEnded);
      retellClient.off('agent_start_talking', handleAgentStartTalking);
      retellClient.off('agent_stop_talking', handleAgentStopTalking);
      retellClient.off('error', handleError);
    };
  }, [handleCleanup, user?.id]);

  const handleToggleCall = async () => {
    setErrorMessage('');

    if (callState === 'connected' || callState === 'connecting') {
      handleCleanup();
      return;
    }

    try {
      setCallState('connecting');
      connectSocket(user?.id || 'guest');

      const userId = user?.id || `guest_${Math.random().toString(36).substring(2, 9)}`;
      const userName = user?.firstName || user?.name || 'Guest User';

      const data = await createCall({ userId, userName });
      const accessToken = data?.session?.access_token;
      
      if (!accessToken) {
        throw new Error("Failed to receive valid Retell access token from server.");
      }

      await retellClient.startCall({ accessToken });
    } catch (err) {
      console.error("[AiAgentIcon] Failed to initiate call:", err);
      setErrorMessage(err.message || 'Failed to start call');
      handleCleanup();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-2 group">
      {/* Error Popup Alert */}
      {errorMessage && (
        <div className="bg-red-900/90 text-white text-xs px-3 py-1.5 rounded-lg shadow-lg border border-red-700 animate-fade-in backdrop-blur-md">
          {errorMessage}
        </div>
      )}

      {/* Connection Status Badge */}
      {callState !== 'idle' && (
        <div className="flex items-center gap-2 bg-slate-900/90 text-slate-200 text-xs px-3 py-1 rounded-full shadow-lg border border-slate-700 backdrop-blur-md">
          <span className={`h-2 w-2 rounded-full ${callState === 'connecting' ? 'bg-amber-400 animate-ping' : 'bg-emerald-400 animate-pulse'}`} />
          <span>
            {callState === 'connecting' && 'Connecting Socket & Retell...'}
            {callState === 'connected' && (isAgentSpeaking ? 'AI Agent Speaking...' : 'AI Connected (Listening)')}
          </span>
          {isAgentSpeaking && <Volume2 className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />}
        </div>
      )}

      {/* Main Trigger Container */}
      <div className="relative w-32 h-32 cursor-pointer group active:scale-95 transition-transform" onClick={handleToggleCall}>
        
        {/* The Call Button (Appears on hover, sits on top) */}
        <div
          className={`absolute inset-0 flex items-center justify-center gap-2 rounded-full font-semibold shadow-2xl transition-all duration-300 transform z-20 pointer-events-none
            ${callState === 'connected' ? 'bg-gradient-to-r from-red-600 to-rose-700 text-white ring-4 ring-red-500/30' : 
              callState === 'connecting' ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white' : 
              'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white'}
            opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100`}
        >
          {callState === 'connecting' ? (
            <Loader2 className="w-8 h-8 animate-spin" />
          ) : callState === 'connected' ? (
            <>
              <MicOff className="w-6 h-6" />
              <span className="text-sm font-bold">End Call</span>
            </>
          ) : (
            <>
              <PhoneCall className="w-6 h-6" />
              <span className="text-sm font-bold">Start Call</span>
            </>
          )}
        </div>

        {/* The SVG Icon (Hides behind the button on hover) */}
        <div className={`absolute inset-0 transition-all duration-300 z-10 pointer-events-none group-hover:opacity-0 group-hover:scale-75`}>
          <BotIcon />
        </div>

        {/* Animated speaking indicator effect */}
        {callState === 'connected' && (
          <span className="absolute -inset-2 rounded-full bg-red-500/20 animate-pulse pointer-events-none z-0" />
        )}
      </div>
    </div>
  );
};

export default AiAgentIcon;