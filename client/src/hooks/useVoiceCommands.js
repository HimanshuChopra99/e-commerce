import { useEffect, useCallback } from 'react'
import { useNavigate }            from 'react-router-dom'
import { useDispatch }            from 'react-redux'
import { getSocket }              from '../lib/socket'
import { hydrateCart }            from '../store/cartSlice'
import { fetchFavourites }        from '../store/wishlistSlice'
import { showToast }              from '../lib/toast'

export function useVoiceCommands(isCallActive) {
  const navigate = useNavigate()
  const dispatch = useDispatch()

  const handleCommand = useCallback(({ type, payload }) => {
    switch (type) {

      case 'navigate':
        if (payload?.path) {
          navigate(payload.path)
        }
        break

      case 'cart:refresh':
        dispatch(hydrateCart())
        break

      case 'wishlist:refresh':
        dispatch(fetchFavourites())
        break

      case 'toast':
        showToast(payload?.message || '', payload?.kind || 'info')
        break

      default:
        break
    }
  }, [navigate, dispatch])

  useEffect(() => {
    if (!isCallActive) return

    const socket = getSocket()
    if (!socket) return

    socket.on('ui:command', handleCommand)

    return () => {
      socket.off('ui:command', handleCommand)
    }
  }, [isCallActive, handleCommand])
}
