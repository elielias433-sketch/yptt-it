import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api';
import { CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export default function AuthTest() {
  const { user, loading: authLoading, loginWithEmail, logout } = useAuth();
  const [apiStatus, setApiStatus] = useState('unknown');
  const [apiError, setApiError] = useState(null);
  const [testEmail, setTestEmail] = useState('');
  const [testPassword, setTestPassword] = useState('');

  const testApiConnection = async () => {
    setApiStatus('testing');
    setApiError(null);
    try {
      const result = await api.healthCheck();
      setApiStatus('connected');
      console.log('API Health Check:', result);
    } catch (error) {
      setApiStatus('error');
      setApiError(error.message);
      console.error('API Health Check failed:', error);
    }
  };

  const testAuthenticatedRequest = async () => {
    setApiStatus('testing');
    setApiError(null);
    try {
      const result = await api.getDashboardSummary();
      setApiStatus('authenticated');
      console.log('Authenticated request success:', result);
    } catch (error) {
      setApiStatus('error');
      setApiError(error.message);
      console.error('Authenticated request failed:', error);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await loginWithEmail(testEmail, testPassword);
      setTimeout(testAuthenticatedRequest, 1000);
    } catch (error) {
      setApiError(`Login failed: ${error.message}`);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-12 px-4 space-y-8">
      <h1 className="text-2xl font-bold text-gray-900 text-center">Authentication & API Test</h1>

      {/* User Status */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">User Status</h2>
        {user ? (
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <CheckCircleIcon className="h-5 w-5 text-green-500" />
              <span className="text-gray-700">Signed in as <strong>{user.email}</strong></span>
            </div>
            <div className="text-sm text-gray-500 ml-8">UID: {user.uid}</div>
            <button
              onClick={logout}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
              <span className="text-gray-700">Not signed in</span>
            </div>
            <form onSubmit={handleLogin} className="space-y-3 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="admin@yptt.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  value={testPassword}
                  onChange={(e) => setTestPassword(e.target.value)}
                  placeholder="password123"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Sign In & Test API
              </button>
            </form>
          </div>
        )}
      </div>

      {/* API Connection Test */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">API Connection</h2>
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={testApiConnection}
            disabled={apiStatus === 'testing'}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {apiStatus === 'testing' ? 'Testing...' : 'Test Health Check'}
          </button>
          {user && (
            <button
              onClick={testAuthenticatedRequest}
              disabled={apiStatus === 'testing'}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {apiStatus === 'testing' ? 'Testing...' : 'Test Auth Request'}
            </button>
          )}
        </div>

        <div className={`p-4 rounded-lg ${apiStatus === 'connected' || apiStatus === 'authenticated' ? 'bg-green-50 border border-green-200' : apiStatus === 'error' ? 'bg-red-50 border border-red-200' : 'bg-gray-50 border border-gray-200'}`}>
          <div className="flex items-center gap-3">
            {apiStatus === 'testing' && (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                <span className="text-gray-700">Testing connection...</span>
              </>
            )}
            {apiStatus === 'connected' && (
              <>
                <CheckCircleIcon className="h-5 w-5 text-green-500" />
                <span className="text-green-700">API Health Check: Connected</span>
              </>
            )}
            {apiStatus === 'authenticated' && (
              <>
                <CheckCircleIcon className="h-5 w-5 text-green-500" />
                <span className="text-green-700">Authenticated Request: Success</span>
              </>
            )}
            {apiStatus === 'error' && (
              <>
                <XCircleIcon className="h-5 w-5 text-red-500" />
                <span className="text-red-700">Error: {apiError}</span>
              </>
            )}
            {apiStatus === 'unknown' && (
              <span className="text-gray-500">Click a test button above</span>
            )}
          </div>
        </div>
      </div>

      {/* Configuration Info */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Configuration</h2>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <dt className="text-gray-500">API Base URL</dt>
          <dd className="font-mono text-gray-700 truncate max-w-xs">{import.meta.env.VITE_API_BASE_URL || 'Not set'}</dd>
          <dt className="text-gray-500">Firebase Project</dt>
          <dd className="font-mono text-gray-700">{import.meta.env.VITE_FIREBASE_PROJECT_ID || 'Not set'}</dd>
          <dt className="text-gray-500">Auth Domain</dt>
          <dd className="font-mono text-gray-700">{import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'Not set'}</dd>
        </dl>
      </div>
    </div>
  );
}