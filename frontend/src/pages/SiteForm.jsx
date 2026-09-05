import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';

const ZONE_OPTIONS = ['TERNATE', 'MAKASSAR', 'MANADO', 'KENDARI', 'PALU', 'PARE PARE'].map((z) => ({ value: z, label: z }));

export default function SiteForm() {
  const { wid: paramWid } = useParams();
  const navigate = useNavigate();
  const isEdit = paramWid && paramWid !== 'new';
  const queryClient = useQueryClient();

  const [fields, setFields] = useState([]);
  const [formData, setFormData] = useState({});
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Load all columns (SUL preferred as primary; fallback KAL).
  useEffect(() => {
    api
      .getSiteFields()
      .then((f) => {
        const cols = (f && f.sul && f.sul.length ? f.sul : (f && f.kal) || []);
        const list = cols.map((c) => (typeof c === 'string' ? { name: c, type: 'text' } : c));
        setFields(list);
        setFormData((prev) => {
          const base = {};
          list.forEach((c) => { base[c.name] = ''; });
          return { ...base, ...prev };
        });
      })
      .catch(() => setFields([]));
  }, []);

  const toDateInput = (v) => {
    if (typeof v !== 'string' || !v) return '';
    const m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    const d = new Date(v);
    if (!Number.isNaN(d.getTime()) && /^\d{4}/.test(v)) return v.slice(0, 10);
    return '';
  };

  // Edit mode: prefill from site raw.
  useEffect(() => {
    if (isEdit && paramWid) {
      api
        .getSite(paramWid)
        .then((s) => {
          if (s && s.raw) {
            const raw = {};
            Object.entries(s.raw).forEach(([k, v]) => { raw[k] = v; });
            setFormData((prev) => ({ ...prev, ...raw }));
            setFields((prev) => (prev.length ? prev : Object.keys(raw).map((k) => ({ name: k, type: 'text' }))));
          }
        })
        .catch(() => {});
    }
  }, [isEdit, paramWid]);

  const set = (key) => (e) => setFormData((f) => ({ ...f, [key]: e.target ? e.target.value : e }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const wid = String(formData.WID || formData.wid || '');
    const name = String(formData['Site Name Impl'] || formData['Site Name'] || formData.siteName || '');
    if (!wid.trim() || !name.trim()) {
      setError('WID dan Site Name wajib diisi');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...formData };
      if (isEdit) {
        await api.updateSite(wid, { raw: payload });
      } else {
        // Map region-friendly payload
        await api.createSite(payload);
      }
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      navigate('/sites');
    } catch (err) {
      setError(err.message || 'Gagal menyimpan work item');
    } finally {
      setSaving(false);
    }
  };

  const visibleFields = fields.filter((f) => !search || f.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="section">
      <div className="page-header">
        <h1 className="page-header-title">{isEdit ? 'Edit Work Item' : 'New Work Item'}</h1>
        <p className="page-header-subtitle">
          {isEdit ? `Update ${formData.WID || paramWid}` : 'Create a new work item — semua kolom lengkap'}
        </p>
      </div>

      <Card variant="elevated">
        <CardHeader>
          <Input
            label="Cari kolom..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Contoh: ZTE, Band, eATP, DOID..."
          />
        </CardHeader>
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="max-h-[64vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {visibleFields.map((field) => {
                  const key = field.name;
                  const isZone = /^zte\s*zone$/i.test(key);
                  const isWid = /^wid$/i.test(key);
                  const isDate = field.type === 'date';
                  if (isZone) {
                    return <Select key={key} label={field.name} options={ZONE_OPTIONS} value={String(formData[key] || '')} onChange={set(key)} />;
                  }
                  if (isDate) {
                    return (
                      <Input
                        key={key}
                        type="date"
                        label={field.name}
                        value={toDateInput(formData[key])}
                        onChange={(e) => setFormData((f) => ({ ...f, [key]: e.target.value }))}
                      />
                    );
                  }
                  return (
                    <Input
                      key={key}
                      label={field.name}
                      value={String(formData[key] ?? '')}
                      onChange={set(key)}
                      disabled={isEdit && isWid}
                      placeholder={isWid ? '2602-4GGSM-4G#RO-XXXX-0001' : ''}
                    />
                  );
                })}
              </div>
            </div>

            {error && <p className="text-caption font-medium text-red-400">{error}</p>}

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-alien-500/20">
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