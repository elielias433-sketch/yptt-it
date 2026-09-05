import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { 
  MagnifyingGlassIcon,
  CalendarIcon,
  ArrowTrendingUpIcon,
  ArrowDownTrayIcon,
  DocumentChartBarIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHeaderCell, TablePagination } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Card as CardComponent, CardBody as CardBodyComponent, CardHeader as CardHeaderComponent } from '../components/ui/Card';
import { format } from 'date-fns';

const regions = ['All', 'KAL', 'SUL'];
const periods = ['All', 'Last 7 days', 'Last 30 days', 'Last 90 days', 'This year'];

export default function KPIAnalytics() {
const queryClient = useQueryClient();
const [region, setRegion] = useState('All');
  const [period, setPeriod] = useState('Last 30 days');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [programLimit, setProgramLimit] = useState(10);

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['kpiSummary', { region, period }],
    queryFn: () => api.getKPISummary({ region: region !== 'All' ? region : '', period }),
  });

  const { data: trends, isLoading: trendsLoading } = useQuery({
    queryKey: ['kpiTrends', { region, period }],
    queryFn: () => api.getKPITrends({ region: region !== 'All' ? region : '', period }),
  });

  const { data: breakdown, isLoading: breakdownLoading } = useQuery({
    queryKey: ['kpiBreakdown', { region }],
    queryFn: () => api.getKPIBreakdown({ region: region !== 'All' ? region : '' }),
  });

  if (summaryLoading) {
    return (
      <div className="section">
        <div className="page-header">
          <h1 className="page-header-title">KPI Analytics</h1>
          <p className="page-header-subtitle">Deep-dive operational analytics and trends</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} variant="elevated">
              <CardBody className="p-6 animate-pulse">
                <div className="h-4 w-32 bg-alien-700/50 rounded mb-2"></div>
                <div className="h-10 w-24 bg-alien-700/50 rounded"></div>
              </CardBody>
            </Card>
          ))}
        </div>
        <Card variant="elevated" className="mt-6">
          <CardBody className="p-6 animate-pulse">
            <div className="h-64 bg-alien-700/30 rounded-xl"></div>
          </CardBody>
        </Card>
      </div>
    );
  }

  const stats = summary || {
    totalWorkItems: 0,
    activeWorkItems: 0,
    completedWorkItems: 0,
    overdueWorkItems: 0,
    completionRate: 0,
    avgTAT: 0,
    onTimeDelivery: 0,
    materialOnTime: 0,
  };

  const trendsData = trends || [];
  const breakdownData = breakdown || { byRegion: {}, byProgram: {}, byStatus: {}, rows: [] };
  const breakdownRows = Array.isArray(breakdownData.rows) ? breakdownData.rows : [];
  const monthlyData = Array.isArray(breakdownData.monthly) ? breakdownData.monthly : [];
  const trendLines = Array.isArray(trendsData) && trendsData.length > 0
    ? trendsData.map((t) => ({ label: t.label || 'Series', color: t.color || '#3b82f6', data: Array.isArray(t.data) ? t.data : [] }))
    : [];
  const maxTrend = Math.max(1, ...trendLines.flatMap((l) => l.data || []));
  const programEntries = Object.entries(breakdownData.byProgram || {})
    .map(([program, p]) => ({ program, total: p.total || 0, active: p.active || 0, completed: p.completed || 0 }))
    .sort((a, b) => b.total - a.total);
  const programVisible = programLimit === 10 ? programEntries.slice(0, 10) : programEntries;

  const kpiCards = [
    { 
      name: 'Total Work Items', 
      key: 'totalWorkItems', 
      icon: '[CLIPBOARD]',
      color: 'alien',
      trend: '+12%',
      trendUp: true,
      description: 'vs previous period'
    },
    { 
      name: 'Active Work Items', 
      key: 'activeWorkItems', 
      icon: '[BOLT]',
      color: 'amber',
      trend: '+8%',
      trendUp: true,
      description: 'in progress'
    },
    { 
      name: 'Completed', 
      key: 'completedWorkItems', 
      icon: '[CHECK]',
      color: 'emerald',
      trend: '+23%',
      trendUp: true,
      description: 'this period'
    },
    { 
      name: 'Overdue', 
      key: 'overdueWorkItems', 
      icon: '[CLOCK]',
      color: 'red',
      trend: '-5%',
      trendUp: false,
      description: 'vs last week'
    },
    { 
      name: 'Completion Rate', 
      key: 'completionRate', 
      icon: '[PURPLE]',
      color: 'purple',
      suffix: '%',
      trend: '+2.3%',
      trendUp: true,
      description: 'overall'
    },
    { 
      name: 'Avg TAT (days)', 
      key: 'avgTAT', 
      icon: '[TIMER]',
      color: 'blue',
      trend: '-1.2d',
      trendUp: true,
      description: 'improvement'
    },
    { 
      name: 'On-Time Delivery', 
      key: 'onTimeDelivery', 
      icon: '[TARGET]',
      color: 'emerald',
      suffix: '%',
      trend: '+1.5%',
      trendUp: true,
      description: 'vs target'
    },
    { 
      name: 'Material On-Time', 
      key: 'materialOnTime', 
      icon: '[BOX]',
      color: 'amber',
      suffix: '%',
      trend: '+5%',
      trendUp: true,
      description: 'this month'
    },
  ];

  const getTrendIcon = (up) => up ? '[UP]' : '[DOWN]';
  const getTrendColor = (up) => up ? 'text-emerald-400' : 'text-red-400';

  return (
    <div className="section">
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-header-title">KPI Analytics</h1>
          <p className="page-header-subtitle">Deep-dive operational analytics and trends</p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            options={regions.map(r => ({ value: r, label: r }))}
            placeholder="Region"
            className="w-40"
          />
          <Select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            options={periods.map(p => ({ value: p, label: p }))}
            placeholder="Period"
            className="w-40"
          />
          <Button variant="ghost" size="sm" onClick={() => queryClient.invalidateQueries({ prefix: ['kpi'] })} leftIcon={<ArrowPathIcon className="w-4 h-4" />}>
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
        {kpiCards.map((stat, index) => {
          const rawValue = stats[stat.key];
          const meaningful = rawValue != null && rawValue !== 0;
          const value = meaningful ? rawValue : '–';
          const trendUp = stat.trendUp;
          return (
            <div key={stat.name} className="stat-card" style={{ animationDelay: `${index * 40}ms` }}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-caption font-medium text-alien-400 uppercase tracking-wide truncate">{stat.name}</p>
                  <p className="mt-1 text-heading-xl font-bold text-alien-100">
                    {typeof value === 'number' ? value.toLocaleString() : value}
                    {stat.suffix || ''}
                  </p>
                  <p className="mt-1 text-caption text-alien-500 truncate">{stat.description}</p>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-xl shrink-0 bg-alien-900/60 border border-alien-500/20">
                  <span className="text-lg leading-none text-alien-300">{stat.icon}</span>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-alien-500/10 flex items-center gap-1">
                <span className={`text-caption font-medium ${trendUp ? 'text-emerald-400' : 'text-red-400'}`}>
                  {trendUp ? '↑' : '↓'} {stat.trend}
                </span>
                <span className="text-caption text-alien-500 ml-auto truncate">vs prev period</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts & Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Trend Chart */}
        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="section-title">Trend Analysis</h2>
              <Badge variant="info" size="sm">Monthly</Badge>
            </div>
          </CardHeader>
          <CardBody>
            <div className="h-72 relative">
              <svg className="w-full h-full" viewBox="0 0 600 280" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="grid-lines" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1e293b" stopOpacity="0.5"/>
                    <stop offset="100%" stopColor="#1e293b" stopOpacity="0.1"/>
                  </linearGradient>
                </defs>
                {/* Grid */}
                <g stroke="#1e293b" strokeWidth="0.5" opacity="0.3">
                  {[20,30,40,50,60,70,80].map((y,i) => (
                    <line key={i} x1="40" y1={y} x2="560" y2={y} />
                  ))}
                  {[80,140,200,260,320,380,440,500,560].map((x,i) => (
                    <line key={i} x1={x} y1="10" x2={x} y2="270" />
                  ))}
                </g>
                {/* Sample trend lines */}
                {trendLines.length === 0 ? (
                  <text x="300" y="140" textAnchor="middle" fontSize="12" fill="#64748b">
                    Belum ada data tren untuk periode ini
                  </text>
                ) : trendLines.map((line, idx) => (
                  <g key={idx}>
                    <path 
                      d={`M40,${270 - ((line.data[0] || 0) / maxTrend) * 245} ${line.data.slice(1).map((v, i) => `L${40 + (i + 1) * 47.27},${270 - (v / maxTrend) * 245}`).join(' ')}`}
                      stroke={line.color}
                      strokeWidth="2"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {/* Area fill */}
                    <path 
                      d={['M40,270', ...line.data.map((v, i) => `L${40 + i * 47.27},${270 - (v / maxTrend) * 245}`), 'L560,270', 'Z'].join(' ')}
                      fill={line.color}
                      opacity="0.1"
                    />
                  </g>
                ))}
                {/* Labels */}
                <g fontSize="10" fill="#64748b">
                  {[0,2,4,6,8,10].map((m,i) => (
                    <text key={i} x={40 + m * 47.27} y="285" textAnchor="middle" className="text-caption text-alien-500">
                      {['Jan','Mar','May','Jul','Sep','Nov'][i]}
                    </text>
                  ))}
                </g>
              </svg>
            </div>
          </CardBody>
        </Card>

        {/* Breakdown by Region */}
        <Card variant="elevated">
          <CardHeader>
            <h2 className="section-title">Breakdown by Region</h2>
          </CardHeader>
          <CardBody>
            <Table striped hoverable>
              <TableHeader>
                <TableRow>
                  <TableHeaderCell width="80">Region</TableHeaderCell>
                  <TableHeaderCell align="center">Total</TableHeaderCell>
                  <TableHeaderCell align="center">Active</TableHeaderCell>
                  <TableHeaderCell align="center">Completed</TableHeaderCell>
                  <TableHeaderCell align="center">Overdue</TableHeaderCell>
                  <TableHeaderCell align="center">Completion %</TableHeaderCell>
                  <TableHeaderCell align="center">Avg TAT</TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {breakdownRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-alien-500">No breakdown data</TableCell>
                  </TableRow>
                ) : breakdownRows.map((r) => (
                  <TableRow key={r.region}>
                    <TableCell>
                      <Badge variant={String(r.region).toLowerCase().startsWith('kal') ? 'kal' : 'sul'} dot>
                        {r.region}
                      </Badge>
                    </TableCell>
                    <TableCell align="center" className="font-mono text-alien-100">{(r.total || 0).toLocaleString()}</TableCell>
                    <TableCell align="center"><Badge variant="inprogress">{r.active || 0}</Badge></TableCell>
                    <TableCell align="center"><Badge variant="completed">{r.completed || 0}</Badge></TableCell>
                    <TableCell align="center"><Badge variant="danger">{r.overdue || 0}</Badge></TableCell>
                    <TableCell align="center" className="font-medium text-emerald-400">{(r.completionRate || 0)}%</TableCell>
                    <TableCell align="center" className="font-mono text-alien-400">{r.avgTAT ? `${r.avgTAT}d` : '--'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardBody>
        </Card>
      </div>

      {/* Program Breakdown */}
      <Card variant="elevated">
        <CardHeader>
          <h2 className="section-title">Program Breakdown</h2>
        </CardHeader>
        <CardBody>
          {programEntries.length === 0 ? (
            <p className="py-6 text-center text-alien-500 text-body-sm">No program data</p>
          ) : (
            <div className="space-y-2">
              {programVisible.map((p) => {
                const rate = p.total ? Math.round((p.completed / p.total) * 100) : 0;
                return (
                  <div key={p.program} className="flex items-center gap-3">
                    <span className="w-40 truncate text-body-sm text-alien-200 font-medium">{p.program}</span>
                    <div className="flex-1 h-2 bg-alien-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500/70 rounded-full" style={{ width: `${rate}%` }} />
                    </div>
                    <span className="w-24 text-right text-body-xs text-alien-400">
                      {p.completed.toLocaleString()}/{p.total.toLocaleString()}
                    </span>
                    <span className="w-14 text-right text-body-sm font-mono font-medium text-emerald-400">{rate}%</span>
                  </div>
                );
              })}
              {programEntries.length > 10 && (
                <Button variant="ghost" size="sm" className="mt-2" onClick={() => setProgramLimit(programLimit === 10 ? Infinity : 10)}>
                  {programLimit === 10 ? `Lihat semua (${programEntries.length})` : 'Cicilkan (top 10)'}
                </Button>
              )}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Monthly Targets */}
      <Card variant="elevated">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="section-title">Monthly Targets vs Achievement</h2>
            <Badge variant="info" size="sm">2026</Badge>
          </div>
        </CardHeader>
        <CardBody>
          <Table striped hoverable>
            <TableHeader>
              <TableRow>
                <TableHeaderCell width="80">Month</TableHeaderCell>
                <TableHeaderCell align="center">Target</TableHeaderCell>
                <TableHeaderCell align="center">Actual</TableHeaderCell>
                <TableHeaderCell align="center">Variance</TableHeaderCell>
                <TableHeaderCell align="center">Achievement %</TableHeaderCell>
                <TableHeaderCell align="center">Status</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {monthlyData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-alien-500">
                    Data target bulanan belum tersedia.
                  </TableCell>
                </TableRow>
              ) : monthlyData.map((m) => {
                const varColor = m.variance >= 0 ? 'text-emerald-400' : 'text-red-400';
                const achColor = m.achievement >= 100 ? 'text-emerald-400' : m.achievement > 0 ? 'text-amber-400' : 'text-alien-500';
                return (
                  <TableRow key={m.label}>
                    <TableCell className="font-medium text-alien-100">{m.label}</TableCell>
                    <TableCell align="center" className="font-mono text-alien-300">{(m.target || 0).toLocaleString()}</TableCell>
                    <TableCell align="center" className="font-mono text-alien-100">{(m.actual || 0).toLocaleString()}</TableCell>
                    <TableCell align="center">
                      <span className={`font-mono font-medium ${varColor}`}>
                        {m.variance >= 0 ? '+' : ''}{m.variance.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell align="center">
                      <span className={`font-mono font-medium ${achColor}`}>
                        {m.target > 0 ? `${m.achievement}%` : '–'}
                      </span>
                    </TableCell>
                    <TableCell align="center">
                      <Badge variant={m.target > 0 && m.achievement >= 100 ? 'completed' : m.target > 0 ? 'inprogress' : 'default'}>
                        {m.target > 0 ? (m.achievement >= 100 ? 'Exceeded' : 'Partial') : 'No target'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardBody>
      </Card>
    </div>
  );
}
