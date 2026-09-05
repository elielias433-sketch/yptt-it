import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';

const REGION_OPTIONS = [
  { value: 'Sulawesi', label: 'Sulawesi' },
  { value: 'Kalimantan', label: 'Kalimantan' },
];
const WORK_TYPE_OPTIONS = [
  { value: 'New Site', label: 'New Site' },
  { value: 'Add Sector', label: 'Add Sector' },
  { value: 'Upgrade', label: 'Upgrade' },
  { value: 'Swap', label: 'Swap' },
  { value: 'Maintenance', label: 'Maintenance' },
];
const STATUS_OPTIONS = [
  { value: 'Pending', label: 'Pending' },
  { value: 'In Progress', label: 'In Progress' },
  { value: 'Completed', label: 'Completed' },
];

export default function SiteForm() {
  const { wid: paramWid } = useParams();
  const navigate = useNavigate();
  const isEdit = paramWid && paramWid !== 'new';
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    wid: '',
    siteId: '',
    siteName: '',
    region: 'Sulawesi',
    workType: 'New Site',
    program: '',
    status: 'Pending',
    sow: '',
    band: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (key) => (e) => setFormData((f) => ({ ...f, [key]: e.target ? e.target.value : e }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!formData.wid.trim() || !formData.siteName.trim()) {
      setError('WID and Site Name are required');
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        await api.updateSite(formData.wid, formData);
      } else {
        await api.createSite(formData);
      }
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      navigate('/sites');
    } catch (err) {
      setError(err.message || 'Failed to save work item');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="section">
      <div className="page-header">
        <h1 className="page-header-title">{isEdit ? 'Edit Work Item' : 'New Work Item'}</h1>
        <p className="page-header-subtitle">
          {isEdit ? `Update ${formData.wid || paramWid}` : 'Create a new work item across regions'}
        </p>
      </div>

      <Card variant="elevated" className="max-w-3xl">
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="WID *" value={formData.wid} onChange={set('wid')} required disabled={isEdit} placeholder="2602-4GGSM-4G#RO-XXXX-0001" />
              <Input label="Site ID" value={formData.siteId} onChange={set('siteId')} placeholder="MGN012" />
              <Input label="Site Name *" value={formData.siteName} onChange={set('siteName')} required placeholder="Site name" />
              <Select label="Region" options={REGION_OPTIONS} value={formData.region} onChange={set('region')} />
              <Select label="Work Type" options={WORK_TYPE_OPTIONS} value={formData.workType} onChange={set('workType')} />
              <Select label="Status" options={STATUS_OPTIONS} value={formData.status} onChange={set('status')} />
              <Input label="Program" value={formData.program} onChange={set('program')} placeholder="New NE 4G" />
              <Input label="SOW Details" value={formData.sow} onChange={set('sow')} placeholder="EQP New Site 4G LTE 900 10 Mhz" />
              <Input label="Band" value={formData.band} onChange={set('band')} placeholder="L1800" />
            </div>

            {error && <p className="text-caption font-medium text-red-400">{error}</p>}

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => navigate('/sites')} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Work Item'}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}