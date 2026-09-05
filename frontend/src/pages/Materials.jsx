import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { 
  MagnifyingGlassIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import { Card, CardBody } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHeaderCell, TablePagination } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { CubeIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { Modal } from '../components/ui/Modal';
import { BuildingOfficeIcon } from '@heroicons/react/24/outline';

const types = ['All', 'inbound', 'return', 'lom'];

export default function Materials() {
  const [search, setSearch] = useState('');
  const [type, setType] = useState('All');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['materials', { search, type, page }],
    queryFn: () => api.getMaterials({ 
      search, 
      type: type !== 'All' ? type : '', 
      page, 
      limit: pageSize 
    }),
  });

  const materials = data?.materials || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  const countBy = (fn) => {
    const map = {};
    materials.forEach((m) => {
      const k = fn(m) || 'Unknown';
      map[k] = (map[k] || 0) + 1;
    });
    return map;
  };
  const byType = countBy((m) => m.type);
  const byStatus = countBy((m) => m.status);
  const bySite = countBy((m) => m.siteName);

  const [summaryOpen, setSummaryOpen] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    refetch();
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case 'inbound': return 'inbound';
      case 'return': return 'warning';
      case 'lom': return 'lom';
      default: return 'default';
    }
  };

  const getStatusBadge = (status) => {
    if (!status) return 'default';
    const s = status.toLowerCase();
    if (s.includes('done') || s.includes('completed')) return 'completed';
    if (s.includes('progress') || s.includes('ongoing')) return 'inprogress';
    if (s.includes('submit')) return 'planning';
    return 'default';
  };

  if (isLoading && !data) {
    return (
      <div className="section">
        <div className="page-header">
          <h1 className="page-header-title">Materials</h1>
          <p className="page-header-subtitle">Track materials, inbound logistics, and returns</p>
        </div>
        <Card>
          <CardBody>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse border-b border-alien-500/10 p-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded bg-alien-700/50"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-48 bg-alien-700/50 rounded"></div>
                    <div className="h-3 w-64 bg-alien-700/50 rounded"></div>
                  </div>
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
          <h1 className="page-header-title">Materials</h1>
        </div>
        <Card variant="elevated" className="border-red-500/30">
          <CardBody className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                <span className="text-red-400 text-xl">[WARN]</span>
              </div>
              <div>
                <h3 className="text-heading-md font-semibold text-red-400">Failed to load materials</h3>
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

  // Render empty state
  if (materials.length === 0) {
    return (
      <div className="section">
        <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="page-header-title">Materials</h1>
            <p className="page-header-subtitle">Track materials, inbound logistics, and returns</p>
          </div>
        </div>

        <Card variant="elevated">
          <CardBody>
            <Table striped hoverable>
              <TableHeader>
                <TableRow>
                  <TableHeaderCell width="100" align="center">Type</TableHeaderCell>
                  <TableHeaderCell width="140">WID</TableHeaderCell>
                  <TableHeaderCell width="100">Site ID</TableHeaderCell>
                  <TableHeaderCell>Site Name</TableHeaderCell>
                  <TableHeaderCell>Material</TableHeaderCell>
                  <TableHeaderCell width="80" align="center">Qty</TableHeaderCell>
                  <TableHeaderCell width="120" align="center">Status</TableHeaderCell>
                  <TableHeaderCell width="180" align="center">Dates</TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-alien-500">
                    <div className="flex flex-col items-center gap-3">
                      <CubeIcon className="w-12 h-12 text-alien-500/30" />
                      <span className="text-body-md text-alien-400">No materials found</span>
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

  // Render materials table
  return (
    <div className="section">
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-header-title">Materials</h1>
          <p className="page-header-subtitle">Track materials, inbound logistics, and returns</p>
        </div>
        <Button variant="outline" onClick={() => setSummaryOpen(true)} leftIcon={<BuildingOfficeIcon className="w-5 h-5" />}>
          Material Summary
        </Button>
      </div>

      <Card className="mb-6">
        <CardBody className="p-4">
          <form onSubmit={(e) => { e.preventDefault(); setPage(1); refetch(); }} className="space-y-4 md:space-y-0 md:flex md:items-end md:gap-4">
            <div className="md:flex-1 min-w-[280px] relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-alien-500" />
              <Input
                placeholder="Search WID, Site Name, Material..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="md:w-40">
              <Select
                value={type}
                onChange={(e) => { setType(e.target.value); setPage(1); refetch(); }}
                options={types.map((t) => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))}
                placeholder="Type"
              />
            </div>
          </form>
        </CardBody>
      </Card>

      <Card variant="elevated" className="overflow-hidden zoom-card">
        <Table striped hoverable>
          <TableHeader>
            <TableRow>
              <TableHeaderCell width="100" align="center">Type</TableHeaderCell>
              <TableHeaderCell width="140">WID</TableHeaderCell>
              <TableHeaderCell width="100">Site ID</TableHeaderCell>
              <TableHeaderCell>Site Name</TableHeaderCell>
              <TableHeaderCell>Material</TableHeaderCell>
              <TableHeaderCell width="80" align="center">Qty</TableHeaderCell>
              <TableHeaderCell width="120" align="center">Status</TableHeaderCell>
              <TableHeaderCell width="180" align="center">Dates</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {materials.map((m) => (
              <TableRow key={m.id}>
                <TableCell align="center">
                  <Badge variant={getTypeBadge(m.type)}>
                    {m.type?.charAt(0).toUpperCase() + m.type?.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-alien-300">{m.wid}</TableCell>
                <TableCell className="text-alien-300 font-mono">{m.siteId}</TableCell>
                <TableCell className="text-alien-100 truncate max-w-[150px]">{m.siteName}</TableCell>
                <TableCell className="text-alien-300">{m.materialName || m.detailMaterial}</TableCell>
                <TableCell align="center" className="font-mono text-body-sm">{m.quantity}</TableCell>
                <TableCell align="center">
                  <Badge variant={getStatusBadge(m.status)}>{m.status || '--'}</Badge>
                </TableCell>
                <TableCell align="center" className="text-body-xs text-alien-500 font-mono">
                  <div>{m.dateRealise ? `Rel: ${format(new Date(m.dateRealise), 'MMM d')}` : ''}</div>
                  <div>{m.datePickup ? `Pick: ${format(new Date(m.datePickup), 'MMM d')}` : ''}</div>
                  <div>{m.dateInbound ? `In: ${format(new Date(m.dateInbound), 'MMM d')}` : ''}</div>
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

      {/* Material Summary Modal */}
      <Modal
        isOpen={summaryOpen}
        onClose={() => setSummaryOpen(false)}
        title="Material Summary"
        size="lg"
      >
        <div className="pt-2 space-y-4">
          <div className="flex items-center gap-3">
            <p className="text-display-sm font-bold text-alien-100">{total.toLocaleString()}</p>
            <Badge variant="info" size="sm">total materials</Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              ['By Type', byType],
              ['By Status', byStatus],
              ['By Site', bySite],
            ].map(([title, map]) => (
              <div key={title} className="p-3 rounded-xl bg-alien-900/60 border border-alien-500/20">
                <p className="text-caption text-alien-400 uppercase tracking-wide mb-2">{title}</p>
                {Object.keys(map).length === 0 ? (
                  <p className="text-body-sm text-alien-600">Belum ada data</p>
                ) : (
                  <ul className="space-y-1.5 max-h-64 overflow-y-auto">
                    {Object.entries(map).map(([k, v]) => (
                      <li key={k} className="flex items-center justify-between gap-2 text-body-sm">
                        <span className="text-alien-200 truncate">{k}</span>
                        <span className="font-mono text-alien-300 shrink-0">{v}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}