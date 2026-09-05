import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { 
  BuildingOfficeIcon, 
  UsersIcon, 
  CubeTransparentIcon,
  CheckBadgeIcon,
  BoltIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
  TruckIcon,
  WrenchIcon,
  CalendarIcon,
  MapPinIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHeaderCell, TablePagination } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { format } from 'date-fns';

const kpiCards = [
  { 
    name: 'Total Work Items', 
    key: 'totalWorkItems', 
    icon: BuildingOfficeIcon, 
    color: 'alien',
    trend: '+12%',
    trendUp: true,
    description: 'vs last month'
  },
  { 
    name: 'Active Work Items', 
    key: 'activeWorkItems', 
    icon: BoltIcon, 
    color: 'amber',
    trend: '+8%',
    trendUp: true,
    description: 'in progress'
  },
  { 
    name: 'Completed This Month', 
    key: 'completedThisMonth', 
    icon: CheckBadgeIcon, 
    color: 'emerald',
    trend: '+23%',
    trendUp: true,
    description: 'vs target'
  },
  { 
    name: 'Overdue Milestones', 
    key: 'overdueMilestones', 
    icon: ClockIcon, 
    color: 'red',
    trend: '-5%',
    trendUp: false,
    description: 'vs last week'
  },
  { 
    name: 'Materials Inbound', 
    key: 'materialsInbound', 
    icon: TruckIcon, 
    color: 'blue',
    trend: '+15%',
    trendUp: true,
    description: 'this month'
  },
  { 
    name: 'Validation Rate', 
    key: 'validationRate', 
    icon: CheckBadgeIcon, 
    color: 'purple',
    suffix: '%',
    trend: '+2.3%',
    trendUp: true,
    description: 'completion rate'
  },
];

const regionalCards = [
  { 
    region: 'Kalimantan', 
    key: 'kalimantan', 
    icon: MapPinIcon,
    color: 'blue',
    stats: [
      { label: 'Work Items', key: 'workItems' },
      { label: 'Active', key: 'active' },
      { label: 'Completed', key: 'completed' },
      { label: 'Completion %', key: 'completionRate', suffix: '%' },
    ]
  },
  { 
    region: 'Sulawesi', 
    key: 'sulawesi', 
    icon: MapPinIcon,
    color: 'emerald',
    stats: [
      { label: 'Work Items', key: 'workItems' },
      { label: 'Active', key: 'active' },
      { label: 'Completed', key: 'completed' },
      { label: 'Completion %', key: 'completionRate', suffix: '%' },
    ]
  },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: summary, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboardSummary'],
    queryFn: () => api.getDashboardSummary(),
    refetchInterval: 30000,
  });

  const { data: kpiData, isLoading: kpiLoading } = useQuery({
    queryKey: ['kpiAnalytics'],
    queryFn: () => api.getKPIAnalytics(),
  });

  const { data: regionalData } = useQuery({
    queryKey: ['regionalAnalytics'],
    queryFn: () => api.getRegionalAnalytics(),
  });

  const { data: recentWorkItems } = useQuery({
    queryKey: ['recentWorkItems', { limit: 10 }],
    queryFn: () => api.getWorkItems({ limit: 10, sort: 'updatedAt', order: 'desc' }),
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="page-header">
          <h1 className="page-header-title">Dashboard</h1>
          <p className="page-header-subtitle">Operational command center</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {kpiCards.map((stat) => (
            <div key={stat.name} className="stat-card">
              <div className="h-4 w-24 bg-alien-700/50 rounded mb-2"></div>
              <div className="h-8 w-32 bg-alien-700/50 rounded"></div>
            </div>
          ))}
        </div>
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="kpi-card">
            <div className="h-4 w-48 bg-alien-700/50 rounded mb-4"></div>
            <div className="space-y-3">
              {[1,2,3,4].map(i => <div key={i} className="h-10 w-full bg-alien-700/50 rounded"></div>)}
            </div>
          </div>
          <div className="kpi-card">
            <div className="h-4 w-48 bg-alien-700/50 rounded mb-4"></div>
            <div className="space-y-3">
              {[1,2,3,4].map(i => <div key={i} className="h-10 w-full bg-alien-700/50 rounded"></div>)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-header">
        <div className="alien-card border-red-500/30 p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
              <span className="text-red-400 text-xl">[WARN]</span>
            </div>
            <div>
              <h3 className="text-heading-md font-semibold text-red-400">Failed to load dashboard</h3>
              <p className="text-body-sm text-alien-400 mt-1">{error.message}</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => refetch()} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const stats = summary || {
    totalWorkItems: 0,
    activeWorkItems: 0,
    completedThisMonth: 0,
    overdueMilestones: 0,
    materialsInbound: 0,
    validationRate: 0,
  };

  const regionalStats = regionalData || {
    kalimantan: { workItems: 0, active: 0, completed: 0, completionRate: 0 },
    sulawesi: { workItems: 0, active: 0, completed: 0, completionRate: 0 },
  };

  const getTrendIcon = (up) => up ? '[UP]' : '[DOWN]';
  const getTrendColor = (up) => up ? 'text-emerald-400' : 'text-red-400';

  return (
    <div className="section">
      <div className="page-header">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="page-header-title">Dashboard</h1>
            <p className="page-header-subtitle">Operational command center  .  Real-time project intelligence</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => refetch()} leftIcon={<ArrowPathIcon className="w-5 h-5" />}>
              Refresh
            </Button>
            <span className="px-3 py-1 text-caption font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
              LIVE
            </span>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpiCards.map((stat, index) => {
          const Icon = stat.icon;
          const value = stats[stat.key] || 0;
          const trendUp = stat.trendUp;
          return (
            <div key={stat.name} className="stat-card stagger-{index + 1}" style={{ animationDelay: `${index * 50}ms` }}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-body-sm font-medium text-alien-400">{stat.name}</p>
                  <p className="mt-1 text-display-sm font-bold text-alien-100">
                    {typeof value === 'number' ? value.toLocaleString() : value}
                    {stat.suffix || ''}
                  </p>
                  <p className="mt-1 text-caption text-alien-500">{stat.description}</p>
                </div>
                <div className={`flex items-center gap-2 p-3 rounded-xl bg-${stat.color}-500/10 text-${stat.color}-400`}>
                  <Icon className="w-6 h-6" aria-hidden="true" />
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-alien-500/10 flex items-center justify-between">
                <span className={`text-caption font-medium ${getTrendColor(trendUp)} flex items-center gap-1`}>
                  <span>{getTrendIcon(trendUp)}</span>
                  <span>{stat.trend}</span>
                </span>
                <span className="text-caption text-alien-500">vs last period</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Regional Distribution & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Regional Distribution */}
        <Card variant="elevated" className="overflow-hidden">
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="section-title">Regional Distribution</h2>
              <Badge variant="info" size="sm">Real-time</Badge>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            <Table className="border-0">
              <TableHeader>
                <TableRow>
                  <TableHeaderCell width="40">Region</TableHeaderCell>
                  <TableHeaderCell align="center">Work Items</TableHeaderCell>
                  <TableHeaderCell align="center">Active</TableHeaderCell>
                  <TableHeaderCell align="center">Completed</TableHeaderCell>
                  <TableHeaderCell align="center">Completion</TableHeaderCell>
                  <TableHeaderCell align="center">Target</TableHeaderCell>
                  <TableHeaderCell align="center">Variance</TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  { 
                    region: 'Kalimantan', 
                    variant: 'kal',
                    ...regionalStats.kalimantan,
                    target: regionalStats.kalimantan?.target || 0,
                  },
                  { 
                    region: 'Sulawesi', 
                    variant: 'sul',
                    ...regionalStats.sulawesi,
                    target: regionalStats.sulawesi?.target || 0,
                  },
                ].map((region) => (
                  <TableRow key={region.region}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Badge variant={region.variant} dot>{region.region}</Badge>
                      </div>
                    </TableCell>
                    <TableCell align="center">{region.workItems?.toLocaleString() || 0}</TableCell>
                    <TableCell align="center">
                      <Badge variant="inprogress">{region.active || 0}</Badge>
                    </TableCell>
                    <TableCell align="center">
                      <Badge variant="completed">{region.completed || 0}</Badge>
                    </TableCell>
                    <TableCell align="center">
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-body-md font-medium text-alien-100">
                          {region.completionRate?.toFixed(1) || 0}%
                        </span>
                        <div className="w-24 h-2 bg-alien-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-alien-500 to-alien-400 rounded-full transition-all duration-500"
                            style={{ width: `${region.completionRate || 0}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell align="center" className="font-mono text-body-sm text-alien-400">
                      {region.target?.toLocaleString() || '--'}
                    </TableCell>
                    <TableCell align="center">
                      {(region.target ? (
                        (() => {
                          const variance = (region.completed || 0) - region.target;
                          const varianceColor = variance >= 0 ? 'text-emerald-400' : 'text-red-400';
                          return (
                            <span className={`font-mono font-medium ${varianceColor}`}>
                              {variance >= 0 ? '+' : ''}{variance.toLocaleString()}
                            </span>
                          );
                        })()
                      ) : '--')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardBody>
        </Card>

        {/* Recent Work Items */}
        <Card variant="elevated" className="overflow-hidden">
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="section-title">Recent Work Items</h2>
              <Button variant="ghost" size="sm" onClick={() => navigate('/work-items')}>
                View All
              </Button>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            <Table className="border-0" striped hoverable>
              <TableHeader>
                <TableRow>
                  <TableHeaderCell width="120">WID</TableHeaderCell>
                  <TableHeaderCell width="100">Site ID</TableHeaderCell>
                  <TableHeaderCell>Site Name</TableHeaderCell>
                  <TableHeaderCell width="100" align="center">Region</TableHeaderCell>
                  <TableHeaderCell width="120" align="center">Status</TableHeaderCell>
                  <TableHeaderCell width="100" align="center">Progress</TableHeaderCell>
                  <TableHeaderCell width="140" align="center">Updated</TableHeaderCell>
                  <TableHeaderCell width="80"></TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(Array.isArray(recentWorkItems) ? recentWorkItems : []).slice(0, 10).map((item) => (
                  <TableRow key={item.wid} clickable onClick={() => navigate(`/work-items/${encodeURIComponent(item.wid)}`)}>
                    <TableCell className="font-mono text-alien-300">{item.wid}</TableCell>
                    <TableCell className="font-mono text-alien-400">{item.siteId}</TableCell>
                    <TableCell className="font-medium text-alien-100 truncate max-w-[200px]">{item.siteName}</TableCell>
                    <TableCell align="center">
                      <Badge variant={item.region?.toLowerCase() === 'kal' ? 'kal' : 'sul'}>
                        {item.region}
                      </Badge>
                    </TableCell>
                    <TableCell align="center">
                      <Badge variant={item.status?.toLowerCase().replace(' ', '_') || 'planning'}>
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell align="center">
                      <div className="w-24 h-2 bg-alien-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-alien-500 to-alien-400 rounded-full transition-all duration-500"
                          style={{ width: `${item.progress || 0}%` }}
                        />
                      </div>
                    </TableCell>
                    <TableCell align="center" className="text-alien-500 font-mono text-body-xs">
                      {item.updatedAt ? format(new Date(item.updatedAt), 'MMM d, HH:mm') : '--'}
                    </TableCell>
                    <TableCell align="center">
                      <span className="p-1.5 text-alien-500 hover:text-alien-100 hover:bg-alien-700/30 rounded-xl transition-colors" title="View details">
                        [RIGHT]
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
                {(Array.isArray(recentWorkItems) ? recentWorkItems : []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-12 text-center text-alien-500">
                      <div className="flex flex-col items-center gap-3">
                        <BuildingOfficeIcon className="w-12 h-12 text-alien-500/30" />
                        <span className="text-body-md text-alien-400">No recent work items</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardBody>
        </Card>
      </div>

      {/* KPI Trend Charts Area */}
      <Card variant="elevated">
        <CardHeader>
          <h2 className="section-title">KPI Trends (Monthly)</h2>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'WID Volume', key: 'widVolume', color: 'alien', trend: '+12%' },
              { label: 'Completion Rate', key: 'completionRate', color: 'emerald', suffix: '%', trend: '+2.3%' },
              { label: 'Avg TAT (days)', key: 'avgTAT', color: 'amber', trend: '-1.2d' },
              { label: 'Material On-Time', key: 'materialOT', color: 'blue', suffix: '%', trend: '+5%' },
            ].map((kpi, index) => (
              <div key={kpi.label} className="alien-card p-4 stagger-{index + 1}" style={{ animationDelay: `${index * 50}ms` }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-body-sm text-alien-400">{kpi.label}</span>
                  <Badge variant={kpi.color} size="sm">{kpi.trend}</Badge>
                </div>
                <div className="h-24 bg-alien-900/50 rounded-lg relative overflow-hidden">
                  {/* Sparkline placeholder */}
                  <svg className="w-full h-full" viewBox="0 0 200 80" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="gradient-{kpi.color}" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={kpi.color === 'alien' ? '#3b82f6' : kpi.color === 'emerald' ? '#10b981' : kpi.color === 'amber' ? '#f59e0b' : '#06b6d4'} stopOpacity="0.3"/>
                        <stop offset="100%" stopColor={kpi.color === 'alien' ? '#3b82f6' : kpi.color === 'emerald' ? '#10b981' : kpi.color === 'amber' ? '#f59e0b' : '#06b6d4'} stopOpacity="0"/>
                      </linearGradient>
                    </defs>
                    <path 
                      d="M0,60 Q50,40 100,30 T200,20" 
                      stroke={kpi.color === 'alien' ? '#3b82f6' : kpi.color === 'emerald' ? '#10b981' : kpi.color === 'amber' ? '#f59e0b' : '#06b6d4'} 
                      strokeWidth="2" 
                      fill="url(#gradient-{kpi.color})" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
);
}