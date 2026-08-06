import React, { useState, useEffect, useCallback, useRef } from 'react'
import { DotLottieReact }  from '@lottiefiles/dotlottie-react'
import { createCall }      from '../../lib/api'
import { retellClient }    from '../../lib/retell'
import { connectSocket, disconnectSocket, getSocket } from '../../lib/socket'
import { useSelector }     from 'react-redux'
import { useVoiceCommands } from '../../hooks/useVoiceCommands'
import {
  MicOff, Loader2, Volume2, PhoneCall,
  AlertCircle, X, Mic,
} from 'lucide-react'

const CALL_STATES = {
  IDLE:       'idle',
  CONNECTING: 'connecting',
  CONNECTED:  'connected',
  ERROR:      'error',
}

const AiAgentIcon = () => {
  const user = useSelector((state) => state.auth?.user)

  const [callState, setCallState]         = useState(CALL_STATES.IDLE)
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false)
  const [isProcessing, setIsProcessing]   = useState(false)
  const [errorMessage, setErrorMessage]   = useState('')
  const [isHovered, setIsHovered]         = useState(false)
  const [showGreeting, setShowGreeting]   = useState(true)

  const lottieRef    = useRef(null)
  const processingTimer = useRef(null)

  const isCallActive = callState === CALL_STATES.CONNECTED

  // Activate voice command listener when call is active
  useVoiceCommands(isCallActive)

  const userName = user?.firstName || user?.name || 'there'

  const handleCleanup = useCallback(() => {
    setCallState(CALL_STATES.IDLE)
    setIsAgentSpeaking(false)
    setIsProcessing(false)
    clearTimeout(processingTimer.current)

    const socket = getSocket()
    if (socket?.connected) {
      socket.emit('retell-call-ended', {
        userId:    user?.id || 'guest',
        timestamp: new Date().toISOString(),
      })
    }

    try { retellClient.stopCall() } catch {}

    // Small delay before disconnecting socket so final events are flushed
    setTimeout(() => disconnectSocket(), 300)
  }, [user?.id])

  // Retell SDK event listeners
  useEffect(() => {
    const onCallStarted = () => {
      setCallState(CALL_STATES.CONNECTED)
      setShowGreeting(false)
      const socket = getSocket()
      if (socket?.connected) {
        socket.emit('retell-call-started', {
          userId:    user?.id || 'guest',
          timestamp: new Date().toISOString(),
        })
      }
    }

    const onCallEnded          = () => handleCleanup()
    const onAgentStartTalking  = () => { setIsAgentSpeaking(true); setIsProcessing(false) }
    const onAgentStopTalking   = () => setIsAgentSpeaking(false)
    const onError              = (err) => {
      setErrorMessage(err?.message || 'Call error occurred')
      handleCleanup()
    }

    retellClient.on('call_started',        onCallStarted)
    retellClient.on('call_ended',          onCallEnded)
    retellClient.on('agent_start_talking', onAgentStartTalking)
    retellClient.on('agent_stop_talking',  onAgentStopTalking)
    retellClient.on('error',               onError)

    return () => {
      retellClient.off('call_started',        onCallStarted)
      retellClient.off('call_ended',          onCallEnded)
      retellClient.off('agent_start_talking', onAgentStartTalking)
      retellClient.off('agent_stop_talking',  onAgentStopTalking)
      retellClient.off('error',               onError)
    }
  }, [handleCleanup, user?.id])

  // Show processing state briefly after user stops speaking
  useEffect(() => {
    if (isCallActive && !isAgentSpeaking) {
      processingTimer.current = setTimeout(() => setIsProcessing(true), 600)
    } else {
      clearTimeout(processingTimer.current)
      setIsProcessing(false)
    }
    return () => clearTimeout(processingTimer.current)
  }, [isCallActive, isAgentSpeaking])

  // Lottie speed
  useEffect(() => {
    if (lottieRef.current) lottieRef.current.setSpeed(1)
  }, [callState])

  // Auto-dismiss error after 4s
  useEffect(() => {
    if (!errorMessage) return
    const t = setTimeout(() => setErrorMessage(''), 4000)
    return () => clearTimeout(t)
  }, [errorMessage])

  const handleToggleCall = async () => {
    setErrorMessage('')
    setShowGreeting(false)

    if (callState === CALL_STATES.CONNECTED || callState === CALL_STATES.CONNECTING) {
      handleCleanup()
      return
    }

    try {
      setCallState(CALL_STATES.CONNECTING)
      const userId = user?.id || `guest_${Math.random().toString(36).substring(2, 9)}`
      connectSocket(userId)

      const formattedName = user?.firstName || user?.name || 'Guest'
      const data = await createCall({ userId, userName: formattedName })
      const accessToken = data?.session?.access_token

      if (!accessToken) throw new Error('Failed to receive Retell access token.')

      await retellClient.startCall({ accessToken })
    } catch (err) {
      setErrorMessage(err.message || 'Failed to start call. Please try again.')
      handleCleanup()
    }
  }

  const statusLabel = () => {
    if (callState === CALL_STATES.CONNECTING) return 'Connecting...'
    if (isAgentSpeaking)  return 'AI Speaking...'
    if (isProcessing)     return 'Processing...'
    return 'Listening'
  }

  const statusColor = () => {
    if (callState === CALL_STATES.CONNECTING) return 'bg-amber-500 animate-ping'
    if (isAgentSpeaking)  return 'bg-emerald-500 animate-pulse'
    if (isProcessing)     return 'bg-violet-500 animate-pulse'
    return 'bg-blue-500 animate-pulse'
  }

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-2.5 select-none font-sans">

      {/* Error popup */}
      {errorMessage && (
        <div className="flex items-center gap-2 bg-red-50 text-red-800 text-xs px-3.5 py-2 rounded-xl shadow-md border border-red-200 animate-fade-in backdrop-blur-md max-w-[240px]">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <span className="leading-snug">{errorMessage}</span>
        </div>
      )}

      {/* Idle greeting bubble */}
      {callState === CALL_STATES.IDLE && (
        <div className="animate-fade-in">
          {isHovered ? (
            <div className="flex items-center gap-2 bg-indigo-600 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-md shadow-indigo-500/20 border border-indigo-500 transition-all duration-200">
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Click to start</span>
            </div>
          ) : showGreeting && (
            <div className="relative flex items-center justify-between gap-2.5 bg-white/95 text-slate-800 text-xs px-4 py-3 rounded-2xl shadow-xl shadow-slate-300/40 border border-slate-200/90 backdrop-blur-md max-w-[230px]">
              <span className="leading-snug">
                Hey <strong className="text-indigo-600 font-semibold">{userName}</strong>, how can I help you?
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); setShowGreeting(false) }}
                className="text-slate-400 hover:text-slate-600 p-0.5 rounded-full transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <div className="absolute -bottom-1.5 right-8 w-3 h-3 bg-white border-r border-b border-slate-200/90 rotate-45 pointer-events-none" />
            </div>
          )}
        </div>
      )}

      {/* Active call status pill */}
      {callState !== CALL_STATES.IDLE && (
        <div className="flex items-center gap-2 bg-white/95 text-slate-700 text-xs px-3.5 py-2 rounded-full shadow-lg shadow-slate-200/60 border border-slate-200/90 backdrop-blur-md animate-fade-in">
          <span className={`h-2.5 w-2.5 rounded-full ${statusColor()}`} />
          <span className="font-semibold text-slate-700">{statusLabel()}</span>
          {isAgentSpeaking && <Volume2 className="w-3.5 h-3.5 text-emerald-600" />}
          {isProcessing && !isAgentSpeaking && <Loader2 className="w-3.5 h-3.5 text-violet-500 animate-spin" />}
        </div>
      )}

      {/* Main button */}
      <div
        className="relative w-28 h-28 cursor-pointer flex items-center justify-center group"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleToggleCall}
        role="button"
        aria-label={callState === CALL_STATES.CONNECTED ? 'Stop voice assistant' : 'Start voice assistant'}
      >
        {/* Glow rings */}
        {callState === CALL_STATES.CONNECTED && isAgentSpeaking && (
          <span className="absolute inset-1 rounded-full bg-emerald-500/20 animate-pulse pointer-events-none" />
        )}
        {callState === CALL_STATES.CONNECTED && isProcessing && !isAgentSpeaking && (
          <span className="absolute inset-1 rounded-full bg-violet-500/10 animate-pulse pointer-events-none" />
        )}
        {callState === CALL_STATES.CONNECTING && (
          <span className="absolute inset-1 rounded-full bg-amber-500/20 animate-ping pointer-events-none" />
        )}

        {/* Lottie animation */}
        <div className="w-full h-full pointer-events-none transition-transform duration-300 ease-out group-hover:scale-105">
          <DotLottieReact
            src="https://lottie.host/24856c72-6258-4a41-9c08-1bb0bcbdd892/Rxo3WStR06.json"
            loop
            autoplay
            dotLottieRefCallback={(dotLottie) => {
              lottieRef.current = dotLottie
              if (dotLottie) dotLottie.setSpeed(1)
            }}
          />
        </div>

        {/* Badge */}
        <div className="absolute bottom-1 right-1 z-10 transition-transform duration-200 group-hover:scale-110">
          {callState === CALL_STATES.CONNECTING && (
            <div className="p-2 bg-amber-500 text-white rounded-full shadow-md">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          )}
          {callState === CALL_STATES.CONNECTED && isProcessing && !isAgentSpeaking && (
            <div className="p-2 bg-violet-500 text-white rounded-full shadow-md">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          )}
          {callState === CALL_STATES.CONNECTED && !isProcessing && !isAgentSpeaking && (
            <div className="p-2 bg-blue-500 text-white rounded-full shadow-md">
              <Mic className="w-4 h-4" />
            </div>
          )}
          {callState === CALL_STATES.CONNECTED && isAgentSpeaking && (
            <div className="p-2 bg-emerald-500 text-white rounded-full shadow-md">
              <Volume2 className="w-4 h-4" />
            </div>
          )}
        </div>

        {/* Stop overlay on hover during active call */}
        {callState === CALL_STATES.CONNECTED && isHovered && (
          <div className="absolute inset-0 rounded-full bg-red-600/80 flex items-center justify-center backdrop-blur-sm transition-all duration-200">
            <MicOff className="w-8 h-8 text-white" />
          </div>
        )}
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.25s ease-out forwards; }
      `}</style>
    </div>
  )
}

export default AiAgentIcon