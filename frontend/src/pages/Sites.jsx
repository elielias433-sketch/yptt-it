import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { 
  MagnifyingGlassIcon, 
  FunnelIcon,
  PlusIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  ViewColumnsIcon,
  BuildingOfficeIcon,
  PencilSquareIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { Card, CardBody } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHeaderCell, TablePagination } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { format } from 'date-fns';

const regions = ['All', 'KAL', 'SUL'];
const statuses = ['All', 'Planning', 'In Progress', 'Completed', 'On Hold', 'Cancelled'];
const workTypes = ['All', 'New Site', 'Add Sector', 'Upgrade', 'Swap', 'Maintenance'];
const zones = ['All', 'TERNATE', 'MAKASSAR', 'MANADO', 'KENDARI', 'PALU', 'PARE PARE'];
const ZONE_OPTIONS = zones.filter((z) => z !== 'All');

export default function Sites() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [region, setRegion] = useState('All');
  const [status, setStatus] = useState('All');
  const [workType, setWorkType] = useState('All');
  const [zone, setZone] = useState('All');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortField, setSortField] = useState('updatedAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [hiddenCols, setHiddenCols] = useState([]);
  const COLUMNS = [
    { key: 'siteId', label: 'Site ID' },
    { key: 'siteName', label: 'Site Name' },
    { key: 'region', label: 'Region' },
    { key: 'program', label: 'Program' },
    { key: 'band', label: 'Band' },
    { key: 'status', label: 'Status' },
    { key: 'updatedAt', label: 'Updated' },
  ];
  const showCol = (key) => !hiddenCols.includes(key);
  const toggleCol = (key) => setHiddenCols((h) => (h.includes(key) ? h.filter((k) => k !== key) : [...h, key]));

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['sites', { search, region, status, workType, zone, page, pageSize, sortField, sortOrder }],
    queryFn: () => api.getSites({ 
      search, 
      region: region !== 'All' ? region : '', 
      status: status !== 'All' ? status : '', 
      workType: workType !== 'All' ? workType : '',
      zone: zone !== 'All' ? zone : '',
      page, 
      limit: pageSize,
      sortField,
      sortOrder,
    }),
  });

  const sites = data?.sites || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  const countBy = (fn) => {
    const map = {};
    sites.forEach((s) => {
      const k = fn(s) || 'Unknown';
      map[k] = (map[k] || 0) + 1;
    });
    return map;
  };
  const byRegion = countBy((s) => s.region);
  const byStatus = countBy((s) => s.status);
  const byZone = countBy((s) => s.zone);
  const byWorkType = countBy((s) => s.workType);
  const byProgram = countBy((s) => s.program);
  const [editingSite, setEditingSite] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [editSearch, setEditSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const openEdit = async (site) => {
    setEditingSite(site);
    try {
      const full = await api.getSite(site.wid);
      if (full && full.raw && Object.keys(full.raw).length) {
        setEditForm(full.raw);
        return;
      }
    } catch (e) { /* fallthrough */ }
    setEditForm({
      siteId: site.siteId || '',
      siteName: site.siteName || '',
      region: site.region || 'SUL',
      workType: site.workType || '',
      program: site.program || '',
      status: site.status || '',
      band: site.band || '',
      sow: site.sow || '',
    });
  };

  const setEdit = (key) => (e) => setEditForm((f) => ({ ...f, [key]: e.target ? e.target.value : e }));

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!editingSite) return;
    setSaving(true);
    try {
      // Send the full edited row (header-keyed) so every column is updated.
      await api.updateSite(editingSite.wid, { raw: editForm });
      refetch();
      setEditingSite(null);
    } catch (err) {
      alert(err.message || 'Gagal menyimpan perubahan');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteSite(deleteTarget.wid);
      refetch();
      setDeleteTarget(null);
    } catch (err) {
      alert(err.message || 'Gagal menghapus data');
    }
  };

  const handleExport = () => {
    const cols = Object.keys(sites[0] || {});
    if (!cols.length) return;
    const header = cols.join(',');
    const rows = sites.map((r) => cols.map((c) => `"${String(r[c] ?? '').replace(/"/g, '""')}"`).join(','));
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'sites.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    refetch();
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (field) => {
    if (sortField !== field) return '[ARROW]';
    return sortOrder === 'asc' ? '[UP]' : '[DOWN]';
  };

  if (isLoading && !data) {
    return (
      <div className="section">
        <div className="page-header">
          <h1 className="page-header-title">Sites</h1>
          <p className="page-header-subtitle">Manage all work items across regions</p>
        </div>
        <Card>
          <CardBody>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse flex items-center gap-4 p-4 border-b border-alien-500/10">
                <div className="w-10 h-10 rounded-xl bg-alien-700/50"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 bg-alien-700/50 rounded"></div>
                  <div className="h-3 w-64 bg-alien-700/50 rounded"></div>
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
          <h1 className="page-header-title">Sites</h1>
        </div>
        <Card variant="elevated" className="border-red-500/30">
          <CardBody className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                <span className="text-red-400 text-xl">[WARN]</span>
              </div>
              <div>
                <h3 className="text-heading-md font-semibold text-red-400">Failed to load sites</h3>
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
  if (sites.length === 0) {
    return (
      <div className="section">
        <div className="page-header">
          <h1 className="page-header-title">Sites</h1>
          <p className="page-header-subtitle">Manage all work items across regions</p>
        </div>
        <Card variant="elevated">
          <CardBody>
            <Table striped hoverable>
              <TableBody>
                <TableRow>
                  <TableCell colSpan={10} className="py-12 text-center text-alien-500">
                    <div className="flex flex-col items-center gap-3">
                      <BuildingOfficeIcon className="w-12 h-12 text-alien-500/30" />
                      <span className="text-body-md text-alien-400">No work items found</span>
                      <span className="text-body-sm text-alien-500">Try adjusting your filters</span>
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

  // Render sites table
  return (
    <div className="section">
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-header-title">Sites</h1>
          <p className="page-header-subtitle">Manage all work items across regions</p>
        </div>
        <Link to="/sites/new">
          <Button leftIcon={<PlusIcon className="w-5 w-5" />}>
            New Work Item
          </Button>
        </Link>
      </div>

      {/* Filters */}
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
                options={regions.map(r => ({ value: r, label: r }))}
                placeholder="Region"
              />
            </div>
            <div className="md:w-44">
              <Select
                value={zone}
                onChange={(e) => { setZone(e.target.value); setPage(1); refetch(); }}
                options={zones.map(z => ({ value: z, label: z }))}
                placeholder="Zone"
              />
            </div>
            <div className="md:w-44">
              <Select
                value={status}
                onChange={(e) => { setStatus(e.target.value); setPage(1); refetch(); }}
                options={statuses.map(s => ({ value: s, label: s }))}
                placeholder="Status"
              />
            </div>
            <div className="md:w-40">
              <Select
                value={workType}
                onChange={(e) => { setWorkType(e.target.value); setPage(1); refetch(); }}
                options={workTypes.map(w => ({ value: w, label: w }))}
                placeholder="Work Type"
              />
            </div>
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => { setSearch(''); setRegion('All'); setStatus('All'); setWorkType('All'); setZone('All'); setPage(1); refetch(); }}
                leftIcon={<ArrowPathIcon className="w-4 h-4" />}
              >
                Reset
              </Button>
              <Button variant="secondary" size="sm" onClick={handleExport} leftIcon={<ArrowDownTrayIcon className="w-4 h-4" />}>
                Export
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setColumnsOpen(true)} leftIcon={<ViewColumnsIcon className="w-4 h-4" />}>
                Columns
              </Button>
              <Button variant="outline" size="sm" onClick={() => setSummaryOpen(true)} leftIcon={<BuildingOfficeIcon className="w-4 h-4" />}>
                Site Summary
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      {/* Sites Table */}
      <Card variant="elevated" className="overflow-hidden zoom-card">
        <CardBody className="p-0">
          <Table striped hoverable>
            <TableHeader>
              <TableRow>
                <TableHeaderCell width="60">#</TableHeaderCell>
                <TableHeaderCell 
                  width="140" 
                  sortable 
                  sortDirection={sortField === 'wid' ? sortOrder : null}
                  onSort={() => handleSort('wid')}
                >
                  WID {getSortIcon('wid')}
                </TableHeaderCell>
                {showCol('siteId') && (
                  <TableHeaderCell
                    width="100"
                    sortable
                    sortDirection={sortField === 'siteId' ? sortOrder : null}
                    onSort={() => handleSort('siteId')}
                  >
                    Site ID {getSortIcon('siteId')}
                  </TableHeaderCell>
                )}
                {showCol('siteName') && (
                  <TableHeaderCell
                    sortable
                    sortDirection={sortField === 'siteName' ? sortOrder : null}
                    onSort={() => handleSort('siteName')}
                  >
                    Site Name {getSortIcon('siteName')}
                  </TableHeaderCell>
                )}
                {showCol('region') && (
                  <TableHeaderCell width="80" align="center" sortable sortDirection={sortField === 'region' ? sortOrder : null} onSort={() => handleSort('region')}>
                    Region
                  </TableHeaderCell>
                )}
                {showCol('program') && (
                  <TableHeaderCell width="120" sortable sortDirection={sortField === 'program' ? sortOrder : null} onSort={() => handleSort('program')}>
                    Program
                  </TableHeaderCell>
                )}
                {showCol('band') && (
                  <TableHeaderCell width="80" align="center" sortable sortDirection={sortField === 'band' ? sortOrder : null} onSort={() => handleSort('band')}>
                    Band
                  </TableHeaderCell>
                )}
                {showCol('status') && (
                  <TableHeaderCell width="100" align="center" sortable sortDirection={sortField === 'status' ? sortOrder : null} onSort={() => handleSort('status')}>
                    Status
                  </TableHeaderCell>
                )}
                {showCol('updatedAt') && (
                  <TableHeaderCell width="120" align="center" sortable sortDirection={sortField === 'updatedAt' ? sortOrder : null} onSort={() => handleSort('updatedAt')}>
                    Updated {getSortIcon('updatedAt')}
                  </TableHeaderCell>
                )}
                <TableHeaderCell width="80">Actions</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sites.map((site, index) => (
                <TableRow key={site.wid}>
                  <TableCell className="text-alien-500 font-mono text-body-xs">{((page - 1) * pageSize) + index + 1}</TableCell>
                  <TableCell className="font-mono text-alien-300">{site.wid}</TableCell>
                  {showCol('siteId') && <TableCell className="font-mono text-alien-400">{site.siteId}</TableCell>}
                  {showCol('siteName') && <TableCell className="font-medium text-alien-100 truncate max-w-[200px]">{site.siteName}</TableCell>}
                  {showCol('region') && (
                    <TableCell align="center">
                      <Badge variant={site.region?.toLowerCase() === 'kal' ? 'kal' : 'sul'}>
                        {site.region}
                      </Badge>
                    </TableCell>
                  )}
                  {showCol('program') && <TableCell className="text-alien-300 truncate max-w-[120px]">{site.program}</TableCell>}
                  {showCol('band') && <TableCell align="center" className="font-mono text-body-xs text-alien-400">{site.band}</TableCell>}
                  {showCol('status') && (
                    <TableCell align="center">
                      <Badge variant={site.status?.toLowerCase().replace(' ', '_') || 'planning'}>
                        {site.status}
                      </Badge>
                    </TableCell>
                  )}
                  {showCol('updatedAt') && (
                    <TableCell align="center" className="text-alien-500 font-mono text-body-xs">
                      {site.updatedAt ? format(new Date(site.updatedAt), 'MMM d, HH:mm') : '--'}
                    </TableCell>
                  )}
                  <TableCell align="center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => openEdit(site)}
                        className="p-1.5 text-alien-500 hover:text-alien-100 hover:bg-alien-700/30 rounded-xl transition-colors"
                        title="Edit"
                      >
                        <PencilSquareIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(site)}
                        className="p-1.5 text-red-500 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors"
                        title="Delete"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
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
        </CardBody>
      </Card>

      <Modal
        isOpen={columnsOpen}
        onClose={() => setColumnsOpen(false)}
        title="Column Visibility"
      >
        <div className="space-y-2 py-2">
          {COLUMNS.map((c) => (
            <label key={c.key} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={!hiddenCols.includes(c.key)}
                onChange={() => toggleCol(c.key)}
                className="w-4 h-4 accent-blue-600"
              />
              <span className="text-body-sm text-alien-200">{c.label}</span>
            </label>
          ))}
          <div className="flex justify-end gap-2 pt-3">
            <Button variant="secondary" onClick={() => setColumnsOpen(false)}>Close</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Site Modal */}
      <Modal
        isOpen={!!editingSite}
        onClose={() => setEditingSite(null)}
        title={`Edit Work Item${editingSite ? ` — ${editingSite.wid}` : ''}`}
      >
        <form onSubmit={saveEdit} className="space-y-4 pt-2">
          <Input
            label="Cari kolom..."
            value={editSearch}
            onChange={(e) => setEditSearch(e.target.value)}
            placeholder="Contoh: ZTE, Band, PO Status..."
          />
          <div className="max-h-[62vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(editForm)
                .filter(([key]) => !editSearch || key.toLowerCase().includes(editSearch.toLowerCase()))
                .map(([key, value]) =>
                  /^zte\s*zone/i.test(key) ? (
                    <Select
                      key={key}
                      label={key}
                      value={String(value ?? '')}
                      onChange={(e) => setEditForm((f) => ({ ...f, [key]: e.target.value }))}
                      options={ZONE_OPTIONS.map((z) => ({ value: z, label: z }))}
                    />
                  ) : (
                    <Input
                      key={key}
                      label={key}
                      value={String(value ?? '')}
                      onChange={(e) => setEditForm((f) => ({ ...f, [key]: e.target.value }))}
                      disabled={key.toLowerCase() === 'wid'}
                    />
                  )
                )}
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-alien-500/20">
            <Button variant="secondary" onClick={() => setEditingSite(null)} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Confirmation"
      >
        <div className="pt-2 space-y-4">
          <p className="text-body-md text-alien-200">
            Yakin ingin menghapus site <span className="text-alien-100 font-semibold">{deleteTarget?.wid || ''}</span>? Tindakan ini permanen.
          </p>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="danger" onClick={confirmDelete}>Delete</Button>
          </div>
        </div>
      </Modal>

      {/* Site Summary Modal */}
      <Modal
        isOpen={summaryOpen}
        onClose={() => setSummaryOpen(false)}
        title="Site Summary"
        size="lg"
      >
        <div className="pt-2 space-y-4">
          <div className="flex items-center gap-3">
            <p className="text-display-sm font-bold text-alien-100">{total.toLocaleString()}</p>
            <Badge variant="info" size="sm">total items</Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              ['By Region', byRegion],
              ['By Status', byStatus],
              ['By Zone', byZone],
              ['By Work Type', byWorkType],
              ['By Program', byProgram],
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