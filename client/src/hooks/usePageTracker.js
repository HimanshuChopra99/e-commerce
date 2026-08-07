import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { selectProductView } from '../store/productViewSlice'
import { buildPageInfo, emitPageUpdate } from '../lib/pageTracker'

/**
 * Tracks route changes (manual clicks, agent navigation, back/forward) and
 * reports the current page to the server so voice handlers always know which
 * page the customer is on. Mount once inside the Router (see App.jsx).
 */
export function usePageTracker() {
  const location = useLocation()
  const selection = useSelector(selectProductView)

  useEffect(() => {
    emitPageUpdate(buildPageInfo(selection))
  }, [location, selection])
}
