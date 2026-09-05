import { useAuth } from '../contexts/AuthContext';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { 
  CpuChipIcon, 
  ServerIcon, 
  CloudIcon,
  LockClosedIcon,
  KeyIcon,
  CircleStackIcon,
} from '@heroicons/react/24/outline';

export default function Settings() {
  const { user, logout } = useAuth();

  const configItems = [
    { label: 'Version', value: '1.0.0', icon: CpuChipIcon },
    { label: 'Environment', value: import.meta.env.MODE || 'development', icon: ServerIcon },
    { label: 'API Base URL', value: import.meta.env.VITE_API_BASE_URL || 'Not configured', icon: CloudIcon, monospace: true },
    { label: 'Firebase Project', value: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'Not configured', icon: LockClosedIcon },
    { label: 'Auth Domain', value: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'Not configured', icon: KeyIcon },
  ];

  const dataSources = [
    { name: 'Google Sheets (Primary Database)', status: 'connected', icon: CircleStackIcon },
    { name: 'Google Apps Script (API Layer)', status: 'connected', icon: ServerIcon },
    { name: 'Firebase Authentication', status: 'connected', icon: LockClosedIcon },
    { name: 'Firebase Hosting (Frontend)', status: 'connected', icon: CloudIcon },
  ];

  return (
    <div className="section">
      <div className="page-header">
        <h1 className="page-header-title">Settings</h1>
        <p className="page-header-subtitle">Application configuration and account settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Account */}
        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="section-title">Account</h2>
              <Badge variant="info" size="sm">{user?.email?.split('@')[1] || 'firebase'}</Badge>
            </div>
          </CardHeader>
          <CardBody>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <dt className="text-caption text-alien-400">Display Name</dt>
                <dd className="mt-1 text-body-sm font-medium text-alien-100">{user?.displayName || 'Not set'}</dd>
              </div>
              <div>
                <dt className="text-caption text-alien-400">Email</dt>
                <dd className="mt-1 text-body-sm font-medium text-alien-100">{user?.email}</dd>
              </div>
              <div>
                <dt className="text-caption text-alien-400">UID</dt>
                <dd className="mt-1 text-body-sm font-mono text-alien-400">{user?.uid}</dd>
              </div>
              <div>
                <dt className="text-caption text-alien-400">Provider</dt>
                <dd className="mt-1 text-body-sm font-medium text-alien-100">
                  {user?.providerData?.[0]?.providerId || 'password'}
                </dd>
              </div>
              <div>
                <dt className="text-caption text-alien-400">Email Verified</dt>
                <dd className="mt-1 text-body-sm font-medium text-alien-100">
                  {user?.emailVerified ? 'Yes' : 'No'}
                </dd>
              </div>
              <div>
                <dt className="text-caption text-alien-400">Created</dt>
                <dd className="mt-1 text-body-sm font-medium text-alien-100">
                  {user?.metadata?.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : '--'}
                </dd>
              </div>
            </dl>
          </CardBody>
        </Card>

        {/* Application Info */}
        <Card variant="elevated">
          <CardHeader>
            <h2 className="section-title">Application</h2>
          </CardHeader>
          <CardBody>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {configItems.map((item) => (
                <div key={item.label}>
                  <dt className="text-caption text-alien-400 flex items-center gap-2">
                    <item.icon className="w-4 h-4 text-alien-500/50" />
                    {item.label}
                  </dt>
                  <dd className={`mt-1 text-body-sm font-medium text-alien-100 ${item.monospace ? 'font-mono truncate max-w-xs' : ''}`}>
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
          </CardBody>
        </Card>
      </div>

      {/* Data Sources */}
      <Card variant="elevated">
        <CardHeader>
          <h2 className="section-title">Data Sources</h2>
        </CardHeader>
        <CardBody>
          <ul className="space-y-3">
            {dataSources.map((source) => (
              <li key={source.name} className="flex items-center gap-4 p-3 rounded-xl bg-alien-800/50 border border-alien-500/10 hover:border-alien-500/30 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-alien-500/20 flex items-center justify-center">
                  <source.icon className="w-5 h-5 text-alien-400" />
                </div>
                <div className="flex-1">
                  <p className="text-body-sm font-medium text-alien-100">{source.name}</p>
                  <p className="text-caption text-alien-500">
                    {source.status === 'connected' ? 'Active connection' : 'Disconnected'}
                  </p>
                </div>
                <Badge variant={source.status === 'connected' ? 'completed' : 'warning'} size="sm" dot>
                  {source.status === 'connected' ? 'Connected' : 'Disconnected'}
                </Badge>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>

      {/* Actions */}
      <Card variant="elevated" className="border-red-500/20">
        <CardHeader>
          <h2 className="section-title">Danger Zone</h2>
        </CardHeader>
        <CardBody>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-body-md font-medium text-alien-100">Sign Out</h3>
              <p className="text-caption text-alien-500 mt-1">Sign out of your account and clear session</p>
            </div>
            <Button variant="danger" onClick={logout} leftIcon={<span>[UP2]</span>}>
              Sign Out
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}