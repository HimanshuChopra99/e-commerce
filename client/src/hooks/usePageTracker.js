import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectProductView } from '../store/productViewSlice';
import { buildPageInfo, emitPageUpdate } from '../lib/pageTracker';

/**
 * Tracks route changes (manual clicks, agent navigation, back/forward, cart updates)
 * and reports the current page & session context to the server.
 */
export function usePageTracker() {
  const location = useLocation();
  const selection = useSelector(selectProductView);
  const cartItems = useSelector((state) => state.cart?.items);

  useEffect(() => {
    emitPageUpdate(buildPageInfo(selection));
  }, [location, selection, cartItems]);
}
