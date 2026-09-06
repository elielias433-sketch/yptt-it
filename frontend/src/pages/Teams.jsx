import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { 
  MagnifyingGlassIcon, 
  PlusIcon,
  PencilIcon,
  TrashIcon,
  UserCircleIcon,
  IdentificationIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import { Card, CardBody } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHeaderCell } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';

const initialForm = {
  name: '',
  position: '',
  contact: '',
  email: '',
  regionCity: '',
  iepmsAccount: '',
  teamInfo: '',
  idCardNo: '',
};

export default function Teams() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [draftSearch, setDraftSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [formData, setFormData] = useState(initialForm);
  const [cardDetail, setCardDetail] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['teams'],
    queryFn: () => api.getTeams({ limit: 1000 }),
  });

  // Fetch all team rows (Sheet tab has extra blocks/blank rows); keep only real members.
  const teams = (data || []).filter(
    (t) => t && t.name && String(t.name).trim() !== '' && String(t.name).trim().toLowerCase() !== 'name'
  );

  const createMutation = useMutation({
    mutationFn: api.createTeam,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      closeDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.updateTeam(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.request(`/api/teams/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teams'] }),
  });

  const openCreateDialog = () => {
    setEditingTeam(null);
    setFormData(initialForm);
    setDialogOpen(true);
  };

  const openEditDialog = (team) => {
    setEditingTeam(team);
    setFormData({
      name: team.name || '',
      position: team.position || '',
      contact: team.contact || '',
      email: team.email || '',
      regionCity: team.regionCity || '',
      iepmsAccount: team.iepmsAccount || '',
      teamInfo: team.teamInfo || '',
      idCardNo: team.idCardNo || '',
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingTeam(null);
    setFormData(initialForm);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingTeam) {
      updateMutation.mutate({ id: editingTeam.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const applySearch = (e) => {
    e.preventDefault();
    setSearch(draftSearch);
  };

  const filteredTeams = teams.filter(team =>
    team.name?.toLowerCase().includes(search.toLowerCase()) ||
    team.position?.toLowerCase().includes(search.toLowerCase()) ||
    team.regionCity?.toLowerCase().includes(search.toLowerCase()) ||
    team.email?.toLowerCase().includes(search.toLowerCase())
  );

  const countBy = (fn) => {
    const map = {};
    teams.forEach((t) => {
      const k = fn(t) || 'Unknown';
      map[k] = (map[k] || 0) + 1;
    });
    return map;
  };
  const byPosition = countBy((t) => t.position);
  const byRegion = countBy((t) => t.regionCity);
  const byTeam = countBy((t) => t.teamInfo);

  if (isLoading && !data) {
    return (
      <div className="section">
        <div className="page-header">
          <h1 className="page-header-title">Teams</h1>
          <p className="page-header-subtitle">Manage team members and assignments</p>
        </div>
        <Card>
          <CardBody>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse border-b border-alien-500/10 p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-alien-700/50"></div>
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
          <h1 className="page-header-title">Teams</h1>
          <p className="page-header-subtitle">Manage team members and assignments</p>
        </div>
        <Card variant="elevated" className="border-red-500/30">
          <CardBody className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                <span className="text-red-400 text-xl">[WARN]</span>
              </div>
              <div>
                <h3 className="text-heading-md font-semibold text-red-400">Failed to load teams</h3>
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

// Render teams table
  return (
    <div className="section">
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-header-title">Teams</h1>
          <p className="page-header-subtitle">Manage team members and assignments</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => setCardDetail(true)} leftIcon={<UsersIcon className="w-5 h-5" />}>
            Team Summary
          </Button>
          <Button onClick={openCreateDialog} leftIcon={<PlusIcon className="w-5 h-5" />}>
            Add Team Member
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardBody className="p-4">
          <form onSubmit={applySearch} className="flex items-end gap-2">
            <div className="relative flex-1 max-w-md">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-alien-500" />
              <Input
                placeholder="Search team members..."
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

      <Card variant="elevated" className="overflow-hidden zoom-card" onClick={() => setCardDetail(!cardDetail)}>
        <Table striped hoverable>
          <TableHeader>
            <TableRow>
              <TableHeaderCell width="60">#</TableHeaderCell>
              <TableHeaderCell sortable>Team Member</TableHeaderCell>
              <TableHeaderCell>Position</TableHeaderCell>
              <TableHeaderCell>Contact</TableHeaderCell>
              <TableHeaderCell>Email</TableHeaderCell>
              <TableHeaderCell>Region/City</TableHeaderCell>
              <TableHeaderCell>Team</TableHeaderCell>
              <TableHeaderCell width="100">Actions</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTeams.map((team, index) => (
              <TableRow key={team.id} clickable onClick={(e) => { e.stopPropagation(); openEditDialog(team); }}>
                <TableCell className="text-alien-500 font-mono text-body-xs">{index + 1}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <UserCircleIcon className="w-10 h-10 text-alien-500/30" />
                    <div>
                      <p className="font-medium text-alien-100">{team.name}</p>
                      {team.idCardNo && <p className="text-caption text-alien-500 font-mono">ID: {team.idCardNo}</p>}
                    </div>
                  </div>
                </TableCell>
                  <TableCell className="text-alien-300">{team.position}</TableCell>
                  <TableCell className="text-alien-300">
                    <div className="flex items-center gap-1">
                      <PhoneIcon className="w-4 h-4 text-alien-500/50" />
                      <span className="font-mono text-body-xs">{team.contact}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-alien-300">
                    <div className="flex items-center gap-1">
                      <EnvelopeIcon className="w-4 h-4 text-alien-500/50" />
                      <span className="font-mono text-body-xs truncate max-w-[200px]">{team.email}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-alien-300">
                    <div className="flex items-center gap-1">
                      <MapPinIcon className="w-4 h-4 text-alien-500/50" />
                      <span>{team.regionCity}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="info">{team.teamInfo || '--'}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); openEditDialog(team); }}
                        className="p-1.5 text-alien-500 hover:text-alien-100 hover:bg-alien-700/30 rounded-xl transition-colors"
                        title="Edit"
                      >
                        <PencilIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(team.id); }}
                        disabled={deleteMutation.isPending}
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
      </Card>

      {/* Dialog */}
      <Modal
        isOpen={dialogOpen}
        onClose={closeDialog}
        title={editingTeam ? 'Edit Team Member' : 'Add Team Member'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Name *"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              leftIcon={<UserCircleIcon className="w-5 h-5" />}
              placeholder="Full name"
            />
            <Input
              label="Position *"
              required
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              leftIcon={<UsersIcon className="w-5 h-5" />}
              placeholder="Role/Position"
            />
            <Input
              label="Contact *"
              required
              type="tel"
              value={formData.contact}
              onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
              leftIcon={<PhoneIcon className="w-5 h-5" />}
              placeholder="Phone number"
            />
            <Input
              label="Email *"
              required
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              leftIcon={<EnvelopeIcon className="w-5 h-5" />}
              placeholder="email@example.com"
            />
            <Input
              label="Region/City *"
              required
              value={formData.regionCity}
              onChange={(e) => setFormData({ ...formData, regionCity: e.target.value })}
              leftIcon={<MapPinIcon className="w-5 h-5" />}
              placeholder="Region/City"
            />
            <Input
              label="IEPMS Account"
              value={formData.iepmsAccount}
              onChange={(e) => setFormData({ ...formData, iepmsAccount: e.target.value })}
              leftIcon={<IdentificationIcon className="w-5 h-5" />}
              placeholder="IEPMS account"
            />
            <Input
              label="Team Info"
              value={formData.teamInfo}
              onChange={(e) => setFormData({ ...formData, teamInfo: e.target.value })}
              leftIcon={<UsersIcon className="w-5 h-5" />}
              placeholder="Team number/group"
            />
            <Input
              label="ID Card No."
              value={formData.idCardNo}
              onChange={(e) => setFormData({ ...formData, idCardNo: e.target.value })}
              leftIcon={<IdentificationIcon className="w-5 h-5" />}
              placeholder="ID card number"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-alien-500/20">
            <Button variant="secondary" onClick={closeDialog}>Cancel</Button>
            <Button 
              type="submit" 
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Card Detail Modal */}
      <Modal
        isOpen={cardDetail}
        onClose={() => setCardDetail(false)}
        title="Team Summary"
      >
        <div className="pt-2 space-y-4">
          <div className="flex items-center gap-3">
            <p className="text-display-sm font-bold text-alien-100">{teams.length.toLocaleString()}</p>
            <Badge variant="info" size="sm">total member</Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              ['By Position', byPosition],
              ['By Region/City', byRegion],
              ['By Team', byTeam],
            ].map(([title, map]) => (
              <div key={title} className="p-3 rounded-xl bg-alien-900/60 border border-alien-500/20">
                <p className="text-caption text-alien-400 uppercase tracking-wide mb-2">{title}</p>
                {Object.keys(map).length === 0 ? (
                  <p className="text-body-sm text-alien-600">Belum ada data</p>
                ) : (
                  <ul className="space-y-1.5">
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