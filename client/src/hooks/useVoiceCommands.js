import { useEffect, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { getSocket } from '../lib/socket'
import { hydrateCart } from '../store/cartSlice'
import { fetchFavourites } from '../store/wishlistSlice'
import { selectVariant } from '../store/productViewSlice'
import { showToast } from '../lib/toast'

export function useVoiceCommands(isCallActive) {
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useDispatch()

  const handleCommand = useCallback(({ type, payload }) => {
    switch (type) {

      case 'navigate':
        if (payload?.path) {
          navigate(payload.path)
        }
        break

      case 'variant:select': {
        // The server has already validated the color/size combination against
        // the product's real variants — here we just apply it to the screen.
        const { slug, color, size } = payload || {}
        dispatch(selectVariant({ slug, color, size }))

        // If the command targets a product that isn't open, navigate to it
        // (query params seed the selection once the page loads). If it is
        // already open, the store update above re-renders the page in place.
        const pathSlug = location.pathname.match(/^\/product\/([^/]+)/)?.[1]
        if (slug && slug !== pathSlug) {
          const params = new URLSearchParams()
          if (color) params.set('color', color)
          if (size) params.set('size', size)
          const qs = params.toString()
          navigate(`/product/${slug}${qs ? `?${qs}` : ''}`)
        }
        break
      }

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
  }, [navigate, location, dispatch])

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
