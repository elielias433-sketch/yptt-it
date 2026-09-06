import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../api';
import { 
  ArrowLeftIcon, 
  MapPinIcon,
  BuildingOfficeIcon,
  TagIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { format } from 'date-fns';

const getStatusColor = (status) => {
  switch (status) {
    case 'Completed': return 'completed';
    case 'In Progress': return 'in_progress';
    case 'Planning': return 'planning';
    case 'On Hold': return 'on_hold';
    case 'Cancelled': return 'cancelled';
    default: return 'default';
  }
};

export default function SiteDetail() {
  const { wid } = useParams();
  const [activeTab, setActiveTab] = useState('general');

  const { data: site, isLoading, error } = useQuery({
    queryKey: ['site', wid],
    queryFn: () => api.getSite(wid),
    enabled: !!wid,
  });

  const { data: relatedData } = useQuery({
    queryKey: ['siteRelated', wid],
    queryFn: () => api.getSiteRelated(wid),
  });

  if (isLoading) {
    return (
      <div className="section animate-pulse">
        <div className="page-header">
          <Link to="/sites" className="p-2 text-alien-500 hover:text-alien-100 hover:bg-alien-700/30 rounded-xl transition-colors">
            <ArrowLeftIcon className="w-6 h-6" />
          </Link>
          <h1 className="page-header-title">Loading...</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} variant="elevated">
              <CardBody>
                <div className="h-4 w-32 bg-alien-700/50 rounded mb-2"></div>
                <div className="h-8 w-48 bg-alien-700/50 rounded"></div>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="section">
        <div className="page-header">
          <Link to="/sites" className="p-2 text-alien-500 hover:text-alien-100 hover:bg-alien-700/30 rounded-xl transition-colors">
            <ArrowLeftIcon className="w-6 h-6" />
          </Link>
        </div>
        <Card variant="elevated" className="border-red-500/30 max-w-2xl">
          <CardBody className="p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-500/20 flex items-center justify-center">
              <span className="text-red-400 text-2xl">[WARN]</span>
            </div>
            <h3 className="text-heading-md font-semibold text-red-400 mb-2">Failed to load work item</h3>
            <p className="text-body-sm text-alien-400 mb-4">{error.message}</p>
            <Link to="/sites">
              <Button variant="secondary" leftIcon={<ArrowLeftIcon className="w-4 h-4" />}>
                Back to Sites
              </Button>
            </Link>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (!site) {
    return (
      <div className="section">
        <div className="page-header">
          <Link to="/sites" className="p-2 text-alien-500 hover:text-alien-100 hover:bg-alien-700/30 rounded-xl transition-colors">
            <ArrowLeftIcon className="w-6 h-6" />
          </Link>
        </div>
        <div className="text-center py-16">
          <p className="text-alien-500">Work item not found</p>
          <Link to="/sites" className="ml-4 text-sm text-alien-400 underline">Back to Sites</Link>
        </div>
      </div>
    );
  }

  const materials = relatedData?.materials || [];
  const validations = relatedData?.validations || [];
  const milestones = relatedData?.milestones || [];
  const assignments = relatedData?.assignments || [];

  return (
    <div className="section">
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/sites" className="p-2 text-alien-500 hover:text-alien-100 hover:bg-alien-700/30 rounded-xl transition-colors">
            <ArrowLeftIcon className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="page-header-title">{site.siteName}</h1>
            <p className="page-header-subtitle font-mono text-alien-400">{site.wid}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Badge variant={getStatusColor(site.status)} size="lg" dot>
            {site.status}
          </Badge>
          <Badge variant={site.region?.toLowerCase() === 'kal' ? 'kal' : 'sul'} size="lg">
            {site.region}
          </Badge>
          <Badge variant="info" size="lg">
            {site.program}
          </Badge>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card variant="elevated" className="overflow-hidden">
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-alien-500/20 flex items-center justify-center">
                <BuildingOfficeIcon className="w-6 h-6 text-alien-400" />
              </div>
              <div>
                <p className="text-caption text-alien-400">Site ID</p>
                <p className="text-body-lg font-semibold text-alien-100 font-mono">{site.siteId}</p>
              </div>
            </div>
          </CardBody>
        </Card>
        <Card variant="elevated" className="overflow-hidden">
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <MapPinIcon className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-caption text-alien-400">Location</p>
                <p className="text-body-lg font-semibold text-alien-100">{site.branch}, {site.cluster}</p>
              </div>
            </div>
          </CardBody>
        </Card>
        <Card variant="elevated" className="overflow-hidden">
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <TagIcon className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <p className="text-caption text-alien-400">Program</p>
                <p className="text-body-lg font-semibold text-alien-100">{site.program}</p>
              </div>
            </div>
          </CardBody>
        </Card>
        <Card variant="elevated" className="overflow-hidden">
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <ChartBarIcon className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <p className="text-caption text-alien-400">Band</p>
                <p className="text-body-lg font-semibold text-alien-100">{site.band}</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Detail Tabs */}
      <Card variant="elevated" className="overflow-hidden">
        <CardHeader>
          <nav className="flex gap-8" aria-label="Tabs">
            <Button variant="ghost" size="sm" onClick={() => setActiveTab('general')} className={`relative ${activeTab === 'general' ? 'text-alien-100' : 'text-alien-400'}`}>
              General
              {activeTab === 'general' && <span className="absolute -bottom-0.5 left-0 right-0 h-0.5 bg-alien-500 rounded-full" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setActiveTab('materials')} className={`text-alien-400 hover:text-alien-300 ${activeTab === 'materials' ? 'text-alien-100' : ''}`}>
              Materials ({materials.length})
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setActiveTab('validations')} className={`text-alien-400 hover:text-alien-300 ${activeTab === 'validations' ? 'text-alien-100' : ''}`}>
              Validations ({validations.length})
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setActiveTab('milestones')} className={`text-alien-400 hover:text-alien-300 ${activeTab === 'milestones' ? 'text-alien-100' : ''}`}>
              Milestones ({milestones.length})
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setActiveTab('assignments')} className={`text-alien-400 hover:text-alien-300 ${activeTab === 'assignments' ? 'text-alien-100' : ''}`}>
              Assignments ({assignments.length})
            </Button>
          </nav>
        </CardHeader>
        <CardBody>
          <dl className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <dt className="text-caption text-alien-400">WID</dt>
              <dd className="mt-1 text-body-sm font-mono text-alien-100">{site.wid}</dd>
            </div>
            <div>
              <dt className="text-caption text-alien-400">Site ID</dt>
              <dd className="mt-1 text-body-sm text-alien-100 font-mono">{site.siteId}</dd>
            </div>
            <div>
              <dt className="text-caption text-alien-400">NE ID</dt>
              <dd className="mt-1 text-body-sm text-alien-100">{site.neId || '--'}</dd>
            </div>
            <div>
              <dt className="text-caption text-alien-400">Subcontractor</dt>
              <dd className="mt-1 text-body-sm text-alien-100">{site.subc || '--'}</dd>
            </div>
            <div>
              <dt className="text-caption text-alien-400">DU Name</dt>
              <dd className="mt-1 text-body-sm text-alien-100">{site.duName || '--'}</dd>
            </div>
            <div>
              <dt className="text-caption text-alien-400">DU</dt>
              <dd className="mt-1 text-body-sm text-alien-100 font-mono">{site.du || '--'}</dd>
            </div>
            <div>
              <dt className="text-caption text-alien-400">Tower Owner</dt>
              <dd className="mt-1 text-body-sm text-alien-100">{site.towerOwner || '--'}</dd>
            </div>
            <div>
              <dt className="text-caption text-alien-400">RTPO / Kabupaten</dt>
              <dd className="mt-1 text-body-sm text-alien-100">{site.rtpoKabupaten || '--'}</dd>
            </div>
            <div>
              <dt className="text-caption text-alien-400">SOW</dt>
              <dd className="mt-1 text-body-sm text-alien-100">{site.sow || '--'}</dd>
            </div>
            <div>
              <dt className="text-caption text-alien-400">Detail SOW</dt>
              <dd className="mt-1 text-body-sm text-alien-100">{site.detailSow || '--'}</dd>
            </div>
            <div>
              <dt className="text-caption text-alien-400">Work Type</dt>
              <dd className="mt-1 text-body-sm text-alien-100">{site.workType || '--'}</dd>
            </div>
            <div>
              <dt className="text-caption text-alien-400">Coordinates</dt>
              <dd className="mt-1 text-body-sm text-alien-100 font-mono">
                {site.latitude && site.longitude ? `${site.latitude}, ${site.longitude}` : '--'}
              </dd>
            </div>
            <div>
              <dt className="text-caption text-alien-400">Address</dt>
              <dd className="mt-1 text-body-sm text-alien-100">{site.address || '--'}</dd>
            </div>
            <div>
              <dt className="text-caption text-alien-400">Monthly Target</dt>
              <dd className="mt-1 text-body-sm text-alien-100">{site.monthlyTarget || '--'}</dd>
            </div>
            <div>
              <dt className="text-caption text-alien-400">Monthly Assignment</dt>
              <dd className="mt-1 text-body-sm text-alien-100">{site.monthlyAssignment || '--'}</dd>
            </div>
            <div>
              <dt className="text-caption text-alien-400">PO Year</dt>
              <dd className="mt-1 text-body-sm text-alien-100">{site.poYear || '--'}</dd>
            </div>
            <div>
              <dt className="text-caption text-alien-400">Years Assigned</dt>
              <dd className="mt-1 text-body-sm text-alien-100">{site.yearsAssigned || '--'}</dd>
            </div>
            <div>
              <dt className="text-caption text-alien-400">WID Recti</dt>
              <dd className="mt-1 text-body-sm text-alien-100">{site.widRecti || '--'}</dd>
            </div>
            <div>
              <dt className="text-caption text-alien-400">Remark</dt>
              <dd className="mt-1 text-body-sm text-alien-100">{site.remark || '--'}</dd>
            </div>
            <div>
              <dt className="text-caption text-alien-400">ZTE Zone</dt>
              <dd className="mt-1 text-body-sm text-alien-100">{site.zteZone || '--'}</dd>
            </div>
            <div>
              <dt className="text-caption text-alien-400">Type Antenna BOQ</dt>
              <dd className="mt-1 text-body-sm text-alien-100">{site.typeAntennaBoq || '--'}</dd>
            </div>
            <div className="lg:col-span-3">
              <dt className="text-caption text-alien-400">Daily Remark</dt>
              <dd className="mt-1 text-body-sm text-alien-100 whitespace-pre-wrap">{site.dailyRemark || '--'}</dd>
            </div>
            <div>
              <dt className="text-caption text-alien-400">Created</dt>
              <dd className="mt-1 text-body-sm text-alien-100">{site.createdAt ? format(new Date(site.createdAt), 'MMM d, yyyy HH:mm') : '--'}</dd>
            </div>
            <div>
              <dt className="text-caption text-alien-400">Last Updated</dt>
              <dd className="mt-1 text-body-sm text-alien-100">{site.updatedAt ? format(new Date(site.updatedAt), 'MMM d, yyyy HH:mm') : '--'}</dd>
            </div>
          </dl>
        </CardBody>
      </Card>
    </div>
);
}