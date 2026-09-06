import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  TrashIcon,
  BoltIcon,
  BuildingOfficeIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline';
import { Card, CardBody } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHeaderCell } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { format } from 'date-fns';

const initialForm = {
  wid: '',
  siteId: '',
  siteName: '',
  sowPlanning: '',
  workType: '',
  plnId: '',
  registrationCode: '',
  registrationDate: '',
  surveyDate: '',
  surveyResult: '',
  remarksUpgrade: '',
  remarks: '',
  upgradeTime: '',
  atp: '',
  totalPoAmt: '',
  productivityStatus: '',
};

export default function Upgrades() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [draftSearch, setDraftSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUpgrade, setEditingUpgrade] = useState(null);
  const [formData, setFormData] = useState(initialForm);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['upgrades'],
    queryFn: () => api.getUpgrades(),
  });

  const upgrades = data || [];

  const createMutation = useMutation({
    mutationFn: api.createUpgrade,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['upgrades'] });
      closeDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.updateUpgrade(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['upgrades'] });
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.request(`/api/upgrades/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['upgrades'] }),
  });

  const openCreateDialog = () => {
    setEditingUpgrade(null);
    setFormData(initialForm);
    setDialogOpen(true);
  };

  const openEditDialog = (upgrade) => {
    setEditingUpgrade(upgrade);
    setFormData({
      wid: upgrade.wid || '',
      siteId: upgrade.siteId || '',
      siteName: upgrade.siteName || '',
      sowPlanning: upgrade.sowPlanning || '',
      workType: upgrade.workType || '',
      plnId: upgrade.plnId || '',
      registrationCode: upgrade.registrationCode || '',
      registrationDate: upgrade.registrationDate || '',
      surveyDate: upgrade.surveyDate || '',
      surveyResult: upgrade.surveyResult || '',
      remarksUpgrade: upgrade.remarksUpgrade || '',
      remarks: upgrade.remarks || '',
      upgradeTime: upgrade.upgradeTime || '',
      atp: upgrade.atp || '',
      totalPoAmt: upgrade.totalPoAmt || '',
      productivityStatus: upgrade.productivityStatus || '',
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingUpgrade(null);
    setFormData(initialForm);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingUpgrade) {
      updateMutation.mutate({ id: editingUpgrade.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const applySearch = (e) => {
    e.preventDefault();
    setSearch(draftSearch);
  };

  const filteredUpgrades = upgrades.filter(u =>
    u.wid?.toLowerCase().includes(search.toLowerCase()) ||
    u.siteName?.toLowerCase().includes(search.toLowerCase()) ||
    u.siteId?.toLowerCase().includes(search.toLowerCase())
  );

  const countBy = (fn) => {
    const map = {};
    upgrades.forEach((u) => {
      const k = fn(u) || 'Unknown';
      map[k] = (map[k] || 0) + 1;
    });
    return map;
  };
  const byWorkType = countBy((u) => u.workType);
  const byAtp = countBy((u) => u.atp);
  const byProductivity = countBy((u) => u.productivityStatus);

  const [summaryOpen, setSummaryOpen] = useState(false);

  // Loading state
  if (isLoading && !data) {
    return (
      <div className="section">
        <div className="page-header">
          <h1 className="page-header-title">PLN Upgrades</h1>
          <p className="page-header-subtitle">Manage PLN power upgrade projects</p>
        </div>
        <Card>
          <CardBody>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse border-b border-alien-500/10 p-4">
                <div className="h-4 w-48 bg-alien-700/50 rounded mb-2"></div>
                <div className="grid grid-cols-2 gap-4">
                  {[1,2].map(j => <div key={j} className="h-8 w-full bg-alien-700/50 rounded"></div>)}
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="section">
        <div className="page-header">
          <h1 className="page-header-title">PLN Upgrades</h1>
        </div>
        <Card variant="elevated" className="border-red-500/30">
          <CardBody className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                <span className="text-red-400 text-xl">[WARN]</span>
              </div>
              <div>
                <h3 className="text-heading-md font-semibold text-red-400">Failed to load upgrades</h3>
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

  return (
    <div className="section">
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-header-title">PLN Upgrades</h1>
          <p className="page-header-subtitle">Manage PLN power upgrade projects</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => setSummaryOpen(true)} leftIcon={<BuildingOfficeIcon className="w-5 h-5" />}>
            Upgrade Summary
          </Button>
          <Button onClick={openCreateDialog} leftIcon={<PlusIcon className="w-5 h-5" />}>
            Add Upgrade
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardBody className="p-4">
          <form onSubmit={applySearch} className="flex items-end gap-2">
            <div className="relative flex-1 max-w-md">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-alien-500" />
              <Input
                placeholder="Search WID, Site Name, Site ID..."
                value={draftSearch}
                onChange={(e) => setDraftSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="secondary" size="sm" type="submit" leftIcon={<MagnifyingGlassIcon className="w-4 h-4" />}>
              Search
            </Button>
          </form>
        </CardBody>
      </Card>

      <Card variant="elevated" className="overflow-hidden zoom-card">
        <Table striped hoverable>
          <TableHeader>
            <TableRow>
              <TableHeaderCell width="140">WID</TableHeaderCell>
              <TableHeaderCell width="100">Site ID</TableHeaderCell>
              <TableHeaderCell width="150">Site Name</TableHeaderCell>
              <TableHeaderCell width="200">SOW Planning</TableHeaderCell>
              <TableHeaderCell width="150">Work Type</TableHeaderCell>
              <TableHeaderCell width="100">PLN ID</TableHeaderCell>
              <TableHeaderCell width="100" align="center">Reg. Date</TableHeaderCell>
              <TableHeaderCell width="100" align="center">Survey Date</TableHeaderCell>
              <TableHeaderCell width="80" align="center">ATP</TableHeaderCell>
              <TableHeaderCell width="120" align="center">PO Amount</TableHeaderCell>
              <TableHeaderCell width="120" align="center">Status</TableHeaderCell>
              <TableHeaderCell width="80">Actions</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUpgrades.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} className="py-12 text-center text-alien-500">
                  <div className="flex flex-col items-center gap-3">
                    <BoltIcon className="w-12 h-12 text-alien-500/30" />
                    <span className="text-body-md text-alien-400">No upgrades found</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredUpgrades.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-mono text-alien-300">{u.wid}</TableCell>
                  <TableCell className="text-alien-300 font-mono">{u.siteId}</TableCell>
                  <TableCell className="font-medium text-alien-100 truncate max-w-[150px]">{u.siteName}</TableCell>
                  <TableCell className="text-alien-300 max-w-[200px] truncate">{u.sowPlanning}</TableCell>
                  <TableCell className="text-alien-300">{u.workType}</TableCell>
                  <TableCell className="text-alien-300 font-mono">{u.plnId}</TableCell>
                  <TableCell align="center" className="text-alien-300 text-body-sm">
                    {u.registrationDate ? format(new Date(u.registrationDate), 'MMM d, yyyy') : '--'}
                  </TableCell>
                  <TableCell align="center" className="text-alien-300 text-body-sm">
                    {u.surveyDate ? format(new Date(u.surveyDate), 'MMM d, yyyy') : '--'}
                  </TableCell>
                  <TableCell align="center">
                    <Badge variant={u.atp === 'Done' ? 'completed' : u.atp === 'In Progress' ? 'inprogress' : 'pending'}>
                      {u.atp || '--'}
                    </Badge>
                  </TableCell>
                  <TableCell align="center" className="text-alien-300 font-mono text-body-sm">
                    {u.totalPoAmt ? `Rp ${parseInt(u.totalPoAmt).toLocaleString()}` : '--'}
                  </TableCell>
                  <TableCell align="center">
                    <Badge variant={u.productivityStatus === 'Completed' ? 'completed' : 'pending'}>
                      {u.productivityStatus || '--'}
                    </Badge>
                  </TableCell>
                  <TableCell align="center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => openEditDialog(u)}
                        className="p-1.5 text-alien-500 hover:text-alien-100 hover:bg-alien-700/30 rounded-xl transition-colors"
                        title="Edit"
                      >
                        <PencilSquareIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => { if (window.confirm(`Hapus upgrade ${u.id || ''}?`)) deleteMutation.mutate(u.id); }}
                        disabled={deleteMutation.isPending}
                        className="p-1.5 text-red-500 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors"
                        title="Delete"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Dialog */}
      <Modal
        isOpen={dialogOpen}
        onClose={closeDialog}
        title={editingUpgrade ? 'Edit Upgrade' : 'Add PLN Upgrade'}
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="WID *" required value={formData.wid} onChange={(e) => setFormData({...formData, wid: e.target.value})} />
            <Input label="Site ID *" required value={formData.siteId} onChange={(e) => setFormData({...formData, siteId: e.target.value})} />
            <Input label="Site Name *" required value={formData.siteName} onChange={(e) => setFormData({...formData, siteName: e.target.value})} />
            <Input label="SOW Planning" value={formData.sowPlanning} onChange={(e) => setFormData({...formData, sowPlanning: e.target.value})} />
            <Input label="Work Type" value={formData.workType} onChange={(e) => setFormData({...formData, workType: e.target.value})} />
            <Input label="PLN ID" value={formData.plnId} onChange={(e) => setFormData({...formData, plnId: e.target.value})} />
            <Input label="Registration Code" value={formData.registrationCode} onChange={(e) => setFormData({...formData, registrationCode: e.target.value})} />
            <Input type="date" label="Registration Date" value={formData.registrationDate} onChange={(e) => setFormData({...formData, registrationDate: e.target.value})} />
            <Input type="date" label="Survey Date" value={formData.surveyDate} onChange={(e) => setFormData({...formData, surveyDate: e.target.value})} />
            <Input label="Survey Result" value={formData.surveyResult} onChange={(e) => setFormData({...formData, surveyResult: e.target.value})} />
            <Input label="Upgrade Time" value={formData.upgradeTime} onChange={(e) => setFormData({...formData, upgradeTime: e.target.value})} />
            <Select label="ATP" value={formData.atp} onChange={(e) => setFormData({...formData, atp: e.target.value})} options={[
              { value: '', label: 'Select' },
              { value: 'Pending', label: 'Pending' },
              { value: 'In Progress', label: 'In Progress' },
              { value: 'Done', label: 'Done' },
            ]} placeholder="Select" />
            <Input type="number" label="Total PO Amount (IDR)" value={formData.totalPoAmt} onChange={(e) => setFormData({...formData, totalPoAmt: e.target.value})} />
            <Input label="Productivity Status" value={formData.productivityStatus} onChange={(e) => setFormData({...formData, productivityStatus: e.target.value})} />
          </div>
          <Input label="Remarks Upgrade" value={formData.remarksUpgrade} onChange={(e) => setFormData({...formData, remarksUpgrade: e.target.value})} rows={2} />
          <Input label="Remarks" value={formData.remarks} onChange={(e) => setFormData({...formData, remarks: e.target.value})} rows={2} />
          <div className="flex justify-end gap-3 pt-4 border-t border-alien-500/20">
            <Button variant="secondary" onClick={closeDialog}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Upgrade Summary Modal */}
      <Modal
        isOpen={summaryOpen}
        onClose={() => setSummaryOpen(false)}
        title="Upgrade Summary"
        size="lg"
      >
        <div className="pt-2 space-y-4">
          <div className="flex items-center gap-3">
            <p className="text-display-sm font-bold text-alien-100">{upgrades.length.toLocaleString()}</p>
            <Badge variant="info" size="sm">total upgrades</Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              ['By Work Type', byWorkType],
              ['By ATP Status', byAtp],
              ['By Productivity', byProductivity],
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
