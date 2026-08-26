import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { loginSuccess } from '../store/slices/appSlice';
import { connectSocket } from '../lib/socket';

export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await api.post('/delivery-partner/login', {
        email,
        password,
      });
      dispatch(loginSuccess(data));
      connectSocket(data.partner.publicId);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-margin-mobile">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-display-sm font-bold text-on-surface">KICKS</h1>
          <p className="text-body-md text-on-surface-variant mt-1">
            Delivery Partner Portal
          </p>
        </div>

        <form
          onSubmit={handleLogin}
          className="bg-surface-container-lowest rounded-2xl p-6 border border-surface-container-highest shadow-sm flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1">
            <label className="text-label-sm text-on-surface-variant">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-surface border border-surface-container-highest rounded-xl px-4 py-3 text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-label-sm text-on-surface-variant">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-surface border border-surface-container-highest rounded-xl px-4 py-3 text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {error && <p className="text-label-sm text-error">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-primary text-on-primary rounded-xl font-bold text-label-lg disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
