import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { Button, Card, FormField, Select, PageHeader } from '../../components/ui';

export function SiteForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    siteCode: '',
    siteName: '',
    client: '',
    location: '',
    siteType: 'COMMERCIAL',
    requiredGuardCount: 0,
    agreedManpower: 0,
    actualManpower: 0,
    contactPerson: '',
    contactPhone: '',
    address: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/sites', form);
      navigate('/sites');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create site');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="New Site"
        breadcrumbs={[
          { label: 'Sites', path: '/sites' },
          { label: 'New Site' },
        ]}
      />

      <Card>
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="Site Code"
              value={form.siteCode}
              onChange={(e) => setForm({ ...form, siteCode: e.target.value.toUpperCase() })}
              required
            />
            <FormField
              label="Site Name"
              value={form.siteName}
              onChange={(e) => setForm({ ...form, siteName: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="Client"
              value={form.client}
              onChange={(e) => setForm({ ...form, client: e.target.value })}
            />
            <FormField
              label="Location"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-4 gap-4">
            <Select
              label="Type"
              value={form.siteType}
              onChange={(e) => setForm({ ...form, siteType: e.target.value })}
            >
              <option value="COMMERCIAL">Commercial</option>
              <option value="RESIDENTIAL">Residential</option>
              <option value="INDUSTRIAL">Industrial</option>
              <option value="GOVERNMENT">Government</option>
            </Select>

            <FormField
              label="Required Guard Posts"
              type="number"
              value={form.requiredGuardCount}
              onChange={(e) => setForm({ ...form, requiredGuardCount: parseInt(e.target.value) || 0 })}
              required
            />

            <FormField
              label="Agreed Manpower"
              type="number"
              value={form.agreedManpower}
              onChange={(e) => setForm({ ...form, agreedManpower: parseInt(e.target.value) })}
              required
            />

            <FormField
              label="Actual Manpower"
              type="number"
              value={form.actualManpower}
              onChange={(e) => setForm({ ...form, actualManpower: parseInt(e.target.value) })}
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <FormField
              label="Contact Person"
              value={form.contactPerson}
              onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
            />
            <FormField
              label="Contact Phone"
              value={form.contactPhone}
              onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
            />
            <FormField
              label="Address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>

          <div className="flex gap-4 pt-4">
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Site'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate('/sites')}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
