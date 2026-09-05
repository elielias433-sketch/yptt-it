import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
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
import { Modal } from '../components/ui/Modal';
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

const WILAYAH = [
  { key: 'ternate', label: 'Ternate', color: '#3b82f6' },
  { key: 'makassar', label: 'Makassar', color: '#10b981' },
  { key: 'manado', label: 'Manado', color: '#06b6d4' },
];

function Legend({ sulawesiBlocks }) {
  const list = WILAYAH.filter((w) => sulawesiBlocks.some((b) => b.key === w.key));
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {list.map((w) => (
        <span key={w.key} className="flex items-center gap-1.5 text-caption text-alien-300">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: w.color }} />
          {w.label}
        </span>
      ))}
    </div>
  );
}

function blockRows(blocks, key) {
  const b = blocks.find((x) => x.key === key);
  return (b && b.rows) || [];
}

function detailTitle(key, cards) {
  const c = (cards || []).find((x) => x.key === key);
  return c ? c.name : 'Detail';
}

function renderDetail(key, bd) {
  const rows = Array.isArray((bd || {}).rows) ? bd.rows : [];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {Object.entries((bd || {}).byStatus || {}).map(([k, v]) => (
          <div key={k} className="p-3 rounded-xl bg-alien-900/60 border border-alien-500/20">
            <p className="text-caption text-alien-400">{k}</p>
            <p className="text-heading-md font-bold text-alien-100">{v}</p>
          </div>
        ))}
      </div>
      <div>
        <p className="text-caption text-alien-400 uppercase tracking-wide mb-2">Per Region</p>
        {rows.length === 0 ? (
          <p className="text-body-sm text-alien-500">Belum ada data rinci.</p>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <div key={r.region} className="flex items-center justify-between text-body-sm">
                <span className="text-alien-200">{r.region}</span>
                <span className="font-mono text-alien-300">
                  {r.completed.toLocaleString()}/{r.total.toLocaleString()} · {r.completionRate}%
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function SulawesiBarChart({ blocks }) {
  const milestones = blockRows(blocks, 'ternate');
  return (
    <div className="space-y-3">
      {milestones.map((m, i) => {
        const maxAch = Math.max(1, ...WILAYAH.map((w) => num(blockRows(blocks, w.key)[i]?.ach)));
        const plan = num(m.plan) || 1;
        return (
          <div key={i}>
            <p className="text-caption text-alien-400 font-medium mb-1">{m.milestone}</p>
            <div className="flex items-center gap-2">
              {WILAYAH.map((w) => {
                const row = blockRows(blocks, w.key)[i];
                const ach = num(row?.ach);
                return (
                  <div key={w.key} className="flex-1">
                    <div className="h-3 bg-alien-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(ach / plan) * 100}%`, backgroundColor: w.color }} />
                    </div>
                    <p className="text-caption text-alien-500 mt-0.5">{ach.toLocaleString()}</p>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SulawesiLineChart({ blocks }) {
  const milestones = blockRows(blocks, 'ternate');
  const n = Math.max(1, milestones.length);
  const W = 560, H = 220;
  const padL = 40, padR = 20, padT = 16, padB = 28;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const x = (i) => padL + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (p) => padT + innerH - (p / 100) * innerH;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        {/* grid */}
        {[0, 25, 50, 75, 100].map((p) => (
          <line key={p} x1={padL} x2={W - padR} y1={y(p)} y2={y(p)} stroke="#1e293b" strokeWidth="0.5" opacity="0.5" />
        ))}
        {/* x labels */}
        {milestones.map((m, i) => (
          <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="9" fill="#64748b">
            {String(m.milestone || '').split(' ')[0]}
          </text>
        ))}
        {/* lines */}
        {WILAYAH.map((w) => {
          const rows = blockRows(blocks, w.key);
          const pts = rows.map((r, i) => {
            const pc = parseFloat(String(r.pct || '0')) || 0;
            return `${x(i).toFixed(1)},${y(pc).toFixed(1)}`;
          });
          const d = 'M' + pts.join(' L');
          return (
            <g key={w.key}>
              <path d={d} fill="none" stroke={w.color} strokeWidth="2" opacity="0.9" strokeLinejoin="round" />
              {pts.map((pt, i) => {
                const [px, py] = pt.split(',').map(Number);
                return <circle key={i} cx={px} cy={py} r="3" fill={w.color} stroke="#0c1222" strokeWidth="1" />;
              })}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

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

  const { data: sulawesiData } = useQuery({
    queryKey: ['dashboardSulawesi'],
    queryFn: () => api.getDashboardSulawesi(),
  });
  const sulawesiBlocks = ['sulawesi', 'makassar', 'manado', 'ternate']
    .map((k) => ({ key: k, label: k.charAt(0).toUpperCase() + k.slice(1), rows: (sulawesiData && sulawesiData[k] && sulawesiData[k].rows) || [] }))
    .filter((b) => b.rows.length > 0);

  // Breakdown (status/program/region) for KPI card detail modal.
  const { data: kpiBreak } = useQuery({
    queryKey: ['dashboardBreakdown'],
    queryFn: () => api.getKPIBreakdown(),
  });
  const activeDetailKey = useState(null);
  const activeDetail = activeDetailKey[0];
  const setActiveDetail = activeDetailKey[1];

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
            <div
              key={stat.name}
              className="stat-card stagger-{index + 1} zoom-card"
              style={{ animationDelay: `${index * 50}ms` }}
              onClick={() => setActiveDetail(stat.key)}
              role="button"
            >
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left column: Regional Distribution + Sulawesi charts */}
        <div className="space-y-6">
        {/* Regional Distribution */}
        <Card variant="elevated" className="overflow-hidden zoom-card" onClick={() => setActiveDetail('regional')}>
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

        {/* Kartu A — Bar Chart: Ach per Wilayah */}
        {sulawesiBlocks.length > 0 && (
          <Card variant="elevated">
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="section-title">Sulawesi Milestone · Ach per Wilayah</h2>
                <Legend sulawesiBlocks={sulawesiBlocks} />
              </div>
            </CardHeader>
            <CardBody className="p-4">
              <SulawesiBarChart blocks={sulawesiBlocks} />
            </CardBody>
          </Card>
        )}

        {/* Kartu B — Line Chart: Achievement % */}
        {sulawesiBlocks.length > 0 && (
          <Card variant="elevated">
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="section-title">Achievement % per Milestone</h2>
                <Legend sulawesiBlocks={sulawesiBlocks} />
              </div>
            </CardHeader>
            <CardBody className="p-4">
              <SulawesiLineChart blocks={sulawesiBlocks} />
            </CardBody>
          </Card>
        )}
        </div>

        {/* Recent Work Items */}
        <Card variant="elevated" className="overflow-hidden zoom-card" onClick={() => setActiveDetail('recent')}>
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

      {/* Sulawesi Summary (Excel Dashboard) */}
      {sulawesiBlocks.length > 0 && (
        <Card variant="elevated" className="zoom-card" onClick={() => setActiveDetail('sulawesi')}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="section-title">Sulawesi Milestone Summary</h2>
              <Badge variant="info" size="sm">2026 · Jan–Agu</Badge>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            <Table striped hoverable>
              <TableHeader>
                <TableRow>
                  {sulawesiBlocks.map((b) => (
                    <TableHeaderCell key={b.key}>{b.label}</TableHeaderCell>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>
                    {sulawesiBlocks.map((b) => {
                      const row = b.rows[i];
                      return (
                        <TableCell key={b.key} className="py-2 align-top">
                          {row ? (
                            <div>
                              <p className="text-body-xs text-alien-400 font-medium">{row.milestone}</p>
                              <p className="text-body-sm font-semibold text-alien-100">
                                {Number(row.ach || 0).toLocaleString()} <span className="text-caption text-alien-500">/ {Number(row.plan || 0).toLocaleString()}</span>
                              </p>
                              <div className="flex items-center gap-2">
                                <Badge variant={row.ach >= row.delta * 2 ? 'completed' : 'inprogress'} size="sm">{row.pct}</Badge>
                                <span className="text-caption text-alien-500">Δ {Number(row.delta || 0).toLocaleString()}</span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-body-xs text-alien-600">–</span>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardBody>
        </Card>
      )}

      {/* KPI Trend Charts Area */}
      <Card variant="elevated" className="zoom-card" onClick={() => setActiveDetail('kpiTrend')}>
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

      {/* KPI Card Detail Modal */}
      <Modal
        isOpen={activeDetail === 'regional' || activeDetail === 'recent' || activeDetail === 'sulawesi' || !!kpiCards.find((x) => x.key === activeDetail)}
        onClose={() => setActiveDetail(null)}
        title={
          activeDetail === 'regional' ? 'Regional Distribution Detail'
          : activeDetail === 'recent' ? 'Recent Work Items Detail'
          : activeDetail === 'sulawesi' ? 'Sulawesi Milestone Summary'
          : activeDetail === 'kpiTrend' ? 'KPI Trends (Monthly) Detail'
          : detailTitle(activeDetail, kpiCards)
        }
      >
        <div className="pt-2">
          {activeDetail === 'regional' ? (
            <div className="space-y-3">
              {(regionalData ? [['Kalimantan', regionalData.kalimantan], ['Sulawesi', regionalData.sulawesi]] : []).map(([name, r]) => (
                <div key={name} className="flex items-center justify-between text-body-sm">
                  <span className="text-alien-200">{name}</span>
                  <span className="font-mono text-alien-300">{(r?.workItems || 0).toLocaleString()} item · {(r?.active || 0)} aktif · {(r?.completed || 0)} selesai · {(r?.completionRate || 0)}%</span>
                </div>
              ))}
            </div>
          ) : activeDetail === 'recent' ? (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {(Array.isArray(recentWorkItems) ? recentWorkItems : []).slice(0, 10).map((it) => (
                <div key={it.wid} className="flex items-center justify-between gap-2 text-body-sm border-b border-alien-500/10 pb-2">
                  <span className="font-mono text-alien-300 truncate">{it.wid}</span>
                  <span className="text-alien-200 truncate">{it.siteName}</span>
                  <Badge variant={String(it.status || '').toLowerCase().replace(' ', '_') || 'planning'}>{it.status}</Badge>
                </div>
              ))}
            </div>
          ) : activeDetail === 'sulawesi' ? (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {sulawesiBlocks.map((b) => (
                <div key={b.key}>
                  <p className="text-body-sm font-semibold text-alien-100 mb-1">{b.label}</p>
                  {b.rows.slice(0, 5).map((r) => (
                    <div key={r.milestone} className="flex justify-between text-body-xs text-alien-400">
                      <span>{r.milestone}</span>
                      <span>{Number(r.ach || 0).toLocaleString()}/{Number(r.plan || 0).toLocaleString()} · {r.pct}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : activeDetail === 'kpiTrend' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: 'WID Volume', value: stats.totalWorkItems, suffix: '', trend: '+12%' },
                { label: 'Completion Rate', value: stats.completionRate, suffix: '%', trend: '+2.3%' },
                { label: 'Avg TAT (days)', value: stats.avgTAT, suffix: 'd', trend: '-1.2d' },
                { label: 'Material On-Time', value: stats.materialOnTime, suffix: '%', trend: '+5%' },
              ].map((m) => (
                <div key={m.label} className="p-3 rounded-xl bg-alien-900/60 border border-alien-500/20">
                  <p className="text-caption text-alien-400">{m.label}</p>
                  <p className="text-heading-md font-bold text-alien-100">
                    {typeof m.value === 'number' ? m.value.toLocaleString() : (m.value || 0)}{m.suffix}
                  </p>
                  <Badge variant="info" size="sm" className="mt-1">{m.trend}</Badge>
                </div>
              ))}
            </div>
          ) : (
            renderDetail(activeDetail, kpiBreak)
          )}
        </div>
      </Modal>
    </div>
);
}