import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Scrolls the window back to the top on every route navigation — including
 * query/filter changes (pathname + search). This prevents a new page (e.g. a
 * footer link, a filter click, or a pagination change) from keeping the user
 * halfway down the previous viewport, which feels jarring.
 */
export default function ScrollToTop() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname, search]);

  return null;
}
