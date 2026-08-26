import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { api } from '../lib/api';
import { setMe } from '../store/slices/appSlice';

/**
 * Fetches the authenticated partner's real profile + stats + recent
 * deliveries once on login, and refreshes the Redux store with it.
 */
export function usePartnerData() {
  const dispatch = useDispatch();
  const token = useSelector((s) => s.app.token);
  const partner = useSelector((s) => s.app.partner);

  useEffect(() => {
    if (!token || !partner) return;
    let active = true;

    api
      .get('/delivery-partner/me', token)
      .then((data) => {
        if (active) dispatch(setMe(data));
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [token, partner?.publicId, dispatch]); // eslint-disable-line react-hooks/exhaustive-deps
}
