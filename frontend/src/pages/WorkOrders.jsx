import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import { Card, CardBody } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHeaderCell, TablePagination } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { format } from 'date-fns';

const regions = ['All', 'KAL', 'SUL'];
const statuses = ['All', 'Planning', 'In Progress', 'Completed', 'On Hold', 'Cancelled'];

export default function WorkOrders() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [region, setRegion] = useState('All');
  const [status, setStatus] = useState('All');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['workOrders', { search, region, status, page, pageSize }],
    queryFn: () => api.getWorkOrders({
      search,
      region: region !== 'All' ? region : '',
      status: status !== 'All' ? status : '',
      page,
      limit: pageSize,
    }),
  });

  const workOrders = data?.workOrders || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    refetch();
  };

  const handleExport = () => {
    const cols = Object.keys(workOrders[0] || {});
    if (!cols.length) return;
    const rows = workOrders.map((r) => cols.map((c) => `"${String(r[c] ?? '').replace(/"/g, '""')}"`).join(','));
    const csv = [cols.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'work-orders.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (isLoading && !data) {
    return (
      <div className="section">
        <div className="page-header">
          <h1 className="page-header-title">Work Orders</h1>
          <p className="page-header-subtitle">Manage work orders and assignments</p>
        </div>
        <Card>
          <CardBody>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse border-b border-alien-500/10 p-4">
                <div className="h-4 w-48 bg-alien-700/50 rounded mb-2"></div>
                <div className="grid grid-cols-2 gap-4">
                  {[1, 2].map((j) => <div key={j} className="h-8 w-full bg-alien-700/50 rounded"></div>)}
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="section">
        <div className="page-header">
          <h1 className="page-header-title">Work Orders</h1>
        </div>
        <Card variant="elevated" className="border-red-500/30">
          <CardBody className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                <span className="text-red-400 text-xl">[WARN]</span>
              </div>
              <div>
                <h3 className="text-heading-md font-semibold text-red-400">Failed to load work orders</h3>
                <p className="text-body-sm text-alien-400 mt-1">{error.message}</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => refetch()} className="mt-4">
              Retry
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (workOrders.length === 0) {
    return (
      <div className="section">
        <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="page-header-title">Work Orders</h1>
            <p className="page-header-subtitle">Manage work orders and assignments</p>
          </div>
          <Button leftIcon={<PlusIcon className="w-5 h-5" />} onClick={() => navigate('/sites/new')}>
            New Work Order
          </Button>
        </div>
        <Card variant="elevated">
          <CardBody>
            <Table striped hoverable>
              <TableHeader>
                <TableRow>
                  <TableHeaderCell width="60">#</TableHeaderCell>
                  <TableHeaderCell width="140">WID</TableHeaderCell>
                  <TableHeaderCell>Site Name</TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell colSpan={3} className="py-12 text-center text-alien-500">
                    <div className="flex flex-col items-center gap-3">
                      <DocumentTextIcon className="w-12 h-12 text-alien-500/30" />
                      <span className="text-body-md text-alien-400">No work orders found</span>
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="section">
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-header-title">Work Orders</h1>
          <p className="page-header-subtitle">Manage work orders and assignments</p>
        </div>
        <Button leftIcon={<PlusIcon className="w-5 h-5" />} onClick={() => navigate('/sites/new')}>
          New Work Order
        </Button>
      </div>

      <Card className="mb-6">
        <CardBody className="p-4">
          <form onSubmit={handleSearch} className="space-y-4 md:space-y-0 md:flex md:items-end md:gap-4">
            <div className="md:flex-1 min-w-[280px] relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-alien-500" />
              <Input
                placeholder="Search WID, Site ID, Site Name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="md:w-40">
              <Select
                value={region}
                onChange={(e) => { setRegion(e.target.value); setPage(1); refetch(); }}
                options={regions.map((r) => ({ value: r, label: r }))}
                placeholder="Region"
              />
            </div>
            <div className="md:w-44">
              <Select
                value={status}
                onChange={(e) => { setStatus(e.target.value); setPage(1); refetch(); }}
                options={statuses.map((s) => ({ value: s, label: s }))}
                placeholder="Status"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setRegion('All'); setStatus('All'); setPage(1); refetch(); }} leftIcon={<ArrowPathIcon className="w-4 h-4" />}>
                Reset
              </Button>
              <Button variant="secondary" size="sm" onClick={handleExport} leftIcon={<ArrowDownTrayIcon className="w-4 h-4" />}>
                Export
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card variant="elevated" className="overflow-hidden">
        <Table striped hoverable>
          <TableHeader>
            <TableRow>
              <TableHeaderCell width="60">#</TableHeaderCell>
              <TableHeaderCell width="140">WID</TableHeaderCell>
              <TableHeaderCell width="100">Site ID</TableHeaderCell>
              <TableHeaderCell>Site Name</TableHeaderCell>
              <TableHeaderCell width="80" align="center">Region</TableHeaderCell>
              <TableHeaderCell width="120">Program</TableHeaderCell>
              <TableHeaderCell width="100" align="center">Status</TableHeaderCell>
              <TableHeaderCell width="80">Actions</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workOrders.map((wo, index) => (
              <TableRow key={wo.wid} clickable onClick={() => navigate(`/work-orders/${encodeURIComponent(wo.wid)}`)}>
                <TableCell className="text-alien-500 font-mono text-body-xs">{((page - 1) * pageSize) + index + 1}</TableCell>
                <TableCell className="font-mono text-alien-300">{wo.wid}</TableCell>
                <TableCell className="font-mono text-alien-400">{wo.siteId}</TableCell>
                <TableCell className="font-medium text-alien-100 truncate max-w-[200px]">{wo.siteName}</TableCell>
                <TableCell align="center">
                  <Badge variant={wo.region?.toLowerCase() === 'kal' ? 'kal' : 'sul'}>{wo.region}</Badge>
                </TableCell>
                <TableCell className="text-alien-300 truncate max-w-[120px]">{wo.program}</TableCell>
                <TableCell align="center">
                  <Badge variant={wo.status?.toLowerCase().replace(' ', '_') || 'planning'}>{wo.status}</Badge>
                </TableCell>
                <TableCell align="center">
                  <Link to={`/work-orders/${encodeURIComponent(wo.wid)}`}>
                    <span className="p-1.5 text-alien-500 hover:text-alien-100 hover:bg-alien-700/30 rounded-xl transition-colors" title="View details">
                      <ArrowRightIcon className="w-5 h-5" />
                    </span>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
        />
      </Card>
    </div>
  );
}