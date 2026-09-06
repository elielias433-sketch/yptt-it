import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { api } from '../api';
import { 
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { Card, CardBody } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHeaderCell, TablePagination } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { BuildingOfficeIcon } from '@heroicons/react/24/outline';

export default function Validations() {
  const [search, setSearch] = useState('');
  const [draftSearch, setDraftSearch] = useState('');
  const [zone, setZone] = useState('All');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['validations', { search, zone, page }],
    placeholderData: keepPreviousData,
    queryFn: () => api.getValidations({ search, zone: zone !== 'All' ? zone : '', page, limit: pageSize }),
  });

  const validations = data?.validations || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / pageSize);
  const zones = data?.zones || ['Pare Pare', 'Makassar', 'Other'];

  const countBy = (fn) => {
    const map = {};
    validations.forEach((v) => {
      const k = fn(v) || 'Unknown';
      map[k] = (map[k] || 0) + 1;
    });
    return map;
  };
  const byZone = countBy((v) => v.zteZone);
  const byEngineer = countBy((v) => v.tiEngineer);
  const bySmAtp = countBy((v) => v.smAtpStatus);

  const [summaryOpen, setSummaryOpen] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(draftSearch);
    setPage(1);
  };

  const getStatusBadge = (status) => {
    if (!status) return 'default';
    const s = status.toLowerCase();
    if (s.includes('passed') || s.includes('approved') || s.includes('done')) return 'completed';
    if (s.includes('ongoing') || s.includes('progress')) return 'inprogress';
    if (s.includes('submit')) return 'planning';
    if (s.includes('cancel')) return 'cancelled';
    return 'default';
  };

  if (isLoading && !data) {
    return (
      <div className="section">
        <div className="page-header">
          <h1 className="page-header-title">Validations</h1>
          <p className="page-header-subtitle">Track validation status across all zones</p>
        </div>
        <Card>
          <CardBody>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse border-b border-alien-500/10 p-4">
                <div className="h-4 w-48 bg-alien-700/50 rounded mb-2"></div>
                <div className="grid grid-cols-4 gap-4">
                  {[1,2,3,4].map(j => <div key={j} className="h-8 w-full bg-alien-700/50 rounded"></div>)}
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
          <h1 className="page-header-title">Validations</h1>
        </div>
        <Card variant="elevated" className="border-red-500/30">
          <CardBody className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                <span className="text-red-400 text-xl">[WARN]</span>
              </div>
              <div>
                <h3 className="text-heading-md font-semibold text-red-400">Failed to load validations</h3>
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
  if (validations.length === 0) {
    return (
      <div className="section">
        <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="page-header-title">Validations</h1>
            <p className="page-header-subtitle">Track validation status across all zones</p>
          </div>
        </div>

        <Card variant="elevated">
          <CardBody>
            <Table striped hoverable>
              <TableHeader>
                <TableRow>
                  <TableHeaderCell width="150">Site</TableHeaderCell>
                  <TableHeaderCell width="100" align="center">Zone</TableHeaderCell>
                  <TableHeaderCell width="120" align="center">Engineer</TableHeaderCell>
                  <TableHeaderCell width="120" align="center">Aging SM</TableHeaderCell>
                  <TableHeaderCell width="120" align="center">GAP Analysis</TableHeaderCell>
                  <TableHeaderCell width="120" align="center">Dismantle</TableHeaderCell>
                  <TableHeaderCell width="120" align="center">SM Kitting</TableHeaderCell>
                  <TableHeaderCell width="100" align="center">LDM</TableHeaderCell>
                  <TableHeaderCell width="100" align="center">Tagging</TableHeaderCell>
                  <TableHeaderCell width="100" align="center">SM ATP</TableHeaderCell>
                  <TableHeaderCell width="100" align="center">BOQ</TableHeaderCell>
                  <TableHeaderCell width="100" align="center">BAPA</TableHeaderCell>
                  <TableHeaderCell width="100" align="center">ATP</TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell colSpan={13} className="py-12 text-center text-alien-500">
                    <div className="flex flex-col items-center gap-3">
                      <span className="w-12 h-12 text-alien-500/30">[OK]</span>
                      <span className="text-body-md text-alien-400">No validations found</span>
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

  // Render validations table
  return (
    <div className="section">
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-header-title">Validations</h1>
          <p className="page-header-subtitle">Track validation status across all zones</p>
        </div>
        <Button variant="outline" onClick={() => setSummaryOpen(true)} leftIcon={<BuildingOfficeIcon className="w-5 h-5" />}>
          Validation Summary
        </Button>
      </div>

      <Card className="mb-6">
        <CardBody className="p-4">
          <form onSubmit={handleSearch} className="space-y-4 md:space-y-0 md:flex md:items-end md:gap-4">
            <div className="md:flex-1 min-w-[280px] relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-alien-500" />
              <Input
                placeholder="Search Site, Engineer, Zone..."
                value={draftSearch}
                onChange={(e) => setDraftSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="md:w-48">
              <Select
                value={zone}
                onChange={(e) => { setZone(e.target.value); setPage(1); refetch(); }}
                options={['All', ...zones].map(z => ({ value: z, label: z }))}
                placeholder="Zone"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" type="submit" leftIcon={<MagnifyingGlassIcon className="w-4 h-4" />}>
                Search
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card variant="elevated" className="overflow-hidden zoom-card">
        <Table striped hoverable>
          <TableHeader>
            <TableRow>
              <TableHeaderCell width="150">Site</TableHeaderCell>
              <TableHeaderCell width="100" align="center">Zone</TableHeaderCell>
              <TableHeaderCell width="120" align="center">Engineer</TableHeaderCell>
              <TableHeaderCell width="120" align="center">Aging SM</TableHeaderCell>
              <TableHeaderCell width="120" align="center">GAP Analysis</TableHeaderCell>
              <TableHeaderCell width="120" align="center">Dismantle</TableHeaderCell>
              <TableHeaderCell width="120" align="center">SM Kitting</TableHeaderCell>
              <TableHeaderCell width="100" align="center">LDM</TableHeaderCell>
              <TableHeaderCell width="100" align="center">Tagging</TableHeaderCell>
              <TableHeaderCell width="100" align="center">SM ATP</TableHeaderCell>
              <TableHeaderCell width="100" align="center">BOQ</TableHeaderCell>
              <TableHeaderCell width="100" align="center">BAPA</TableHeaderCell>
              <TableHeaderCell width="100" align="center">ATP</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {validations.map((v) => (
              <TableRow key={v.id}>
                <TableCell className="font-medium text-alien-100">{v.siteName || v.siteId}</TableCell>
                <TableCell align="center" className="text-alien-300">{v.zteZone}</TableCell>
                <TableCell align="center" className="text-alien-300">{v.tiEngineer}</TableCell>
                <TableCell align="center"><Badge variant={getStatusBadge(v.agingSm)}>{v.agingSm}</Badge></TableCell>
                <TableCell align="center"><Badge variant={getStatusBadge(v.gapAnalysis)}>{v.gapAnalysis}</Badge></TableCell>
                <TableCell align="center"><Badge variant={getStatusBadge(v.dismantleStatus)}>{v.dismantleStatus}</Badge></TableCell>
                <TableCell align="center"><Badge variant={getStatusBadge(v.smKittingStatus)}>{v.smKittingStatus}</Badge></TableCell>
                <TableCell align="center"><Badge variant={getStatusBadge(v.ldmStatus)}>{v.ldmStatus}</Badge></TableCell>
                <TableCell align="center"><Badge variant={getStatusBadge(v.taggingIneomStatus)}>{v.taggingIneomStatus}</Badge></TableCell>
                <TableCell align="center"><Badge variant={getStatusBadge(v.smAtpStatus)}>{v.smAtpStatus}</Badge></TableCell>
                <TableCell align="center"><Badge variant={getStatusBadge(v.boqStatus)}>{v.boqStatus}</Badge></TableCell>
                <TableCell align="center"><Badge variant={getStatusBadge(v.bapaStatus)}>{v.bapaStatus}</Badge></TableCell>
                <TableCell align="center"><Badge variant={getStatusBadge(v.atpStatus)}>{v.atpStatus}</Badge></TableCell>
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

      {/* Validation Summary Modal */}
      <Modal
        isOpen={summaryOpen}
        onClose={() => setSummaryOpen(false)}
        title="Validation Summary"
        size="lg"
      >
        <div className="pt-2 space-y-4">
          <div className="flex items-center gap-3">
            <p className="text-display-sm font-bold text-alien-100">{total.toLocaleString()}</p>
            <Badge variant="info" size="sm">total validations</Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              ['By Zone', byZone],
              ['By Engineer', byEngineer],
              ['By SM ATP Status', bySmAtp],
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