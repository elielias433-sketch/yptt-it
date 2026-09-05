import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const { loginWithEmail, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await loginWithEmail(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await loginWithGoogle();
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden bg-alien-950">
      {/* Background glow (nyambung dgn tema aplikasi) */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-alien-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-electric-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-alien-500 to-electric-500 flex items-center justify-center mb-4 shadow-glow-md">
            <span className="text-heading-md font-bold text-white">YT</span>
          </div>
          <h1 className="text-display-sm font-bold text-alien-100">YPTT TI Tracker</h1>
          <p className="mt-2 text-body-sm text-alien-400">Sign in to your account</p>
        </div>

        <div className="bg-alien-900/70 backdrop-blur-xl py-8 px-6 rounded-card-lg border border-alien-500/20 shadow-glow-md">
          <form onSubmit={handleEmailLogin} className="space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-lg text-body-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-body-sm font-medium text-alien-300">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 rounded-md bg-alien-950/60 border border-alien-500/30 text-alien-100 placeholder-alien-500 focus:outline-none focus:ring-2 focus:ring-alien-500/50 focus:border-alien-400"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-body-sm font-medium text-alien-300">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 rounded-md bg-alien-950/60 border border-alien-500/30 text-alien-100 placeholder-alien-500 focus:outline-none focus:ring-2 focus:ring-alien-500/50 focus:border-alien-400"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2.5 px-4 text-body-sm font-semibold rounded-md text-white bg-gradient-to-r from-alien-500 to-electric-500 hover:from-alien-400 hover:to-electric-400 shadow-glow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-alien-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Signing in...' : 'Sign in with Email'}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-alien-500/20" />
              </div>
              <div className="relative flex justify-center text-body-xs">
                <span className="px-2 bg-alien-900 text-alien-500">or continue with</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="mt-4 w-full flex justify-center items-center gap-2 py-2.5 px-4 rounded-md border border-alien-500/30 bg-alien-800/40 text-body-sm font-medium text-alien-200 hover:bg-alien-700/40 hover:text-alien-100 hover:border-alien-400/50 focus:outline-none focus:ring-2 focus:ring-alien-500/40 disabled:opacity-50 transition-colors"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Google
            </button>
          </div>
        </div>

        <p className="text-center text-body-xs text-alien-500">
          Sign in with your organization account.
        </p>
      </div>
    </div>
  );
}