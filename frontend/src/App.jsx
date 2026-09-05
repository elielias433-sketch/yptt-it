import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { QueryProvider } from './contexts/QueryProvider';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Sites from './pages/Sites';
import SiteDetail from './pages/SiteDetail';
import SiteForm from './pages/SiteForm';
import Teams from './pages/Teams';
import Materials from './pages/Materials';
import Validations from './pages/Validations';
import Upgrades from './pages/Upgrades';
import Settings from './pages/Settings';
import AuthTest from './pages/AuthTest';
import WorkOrders from './pages/WorkOrders';
import KPIAnalytics from './pages/KPIAnalytics';
import './index.css';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/auth-test" element={<AuthTest />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="sites" element={<Sites />} />
        <Route path="sites/new" element={<SiteForm />} />
        <Route path="sites/:wid" element={<SiteDetail />} />
        <Route path="sites/:wid/edit" element={<SiteForm />} />
        <Route path="teams" element={<Teams />} />
        <Route path="materials" element={<Materials />} />
        <Route path="validations" element={<Validations />} />
        <Route path="upgrades" element={<Upgrades />} />
        <Route path="work-orders" element={<WorkOrders />} />
        <Route path="work-orders/:wid" element={<SiteDetail />} />
        <Route path="work-items" element={<WorkOrders />} />
        <Route path="work-items/:wid" element={<SiteDetail />} />
        <Route path="kpi" element={<KPIAnalytics />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <QueryProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </QueryProvider>
    </AuthProvider>
  );
}

export default App;