import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { logoutUser } from '../store/authSlice';

export default function AuthExpiredHandler() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  useEffect(() => {
    const handler = () => {
      dispatch(logoutUser());
      navigate('/login');
    };
    window.addEventListener('kick:auth:expired', handler);
    return () => window.removeEventListener('kick:auth:expired', handler);
  }, [dispatch, navigate]);
  return null;
}
