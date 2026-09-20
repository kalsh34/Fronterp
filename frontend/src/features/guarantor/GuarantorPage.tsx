import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../lib/api';

interface Employee {
  _id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  category: string;
  status: string;
}

interface GuarantorDoc {
  url: string;
  fileName: string;
  description?: string;
}

interface GuarantorRecord {
  _id: string;
  guarantorType: string;
  fullName: string;
  phone: string;
  address?: string;
  relationship?: string;
  occupation?: string;
  idNumber?: string;
  vehicleType?: string;
  vehiclePlateNumber?: string;
  vehicleMake?: string;
  vehicleYear?: number;
  propertyType?: string;
  propertyLocation?: string;
  propertyTitleNumber?: string;
  estimatedValue?: number;
  documents: GuarantorDoc[];
  verificationStatus: string;
  verifiedAt?: string;
  rejectionReason?: string;
  notes?: string;
  createdAt: string;
}

const TYPE_OPTIONS = [
  { value: 'PERSON', label: 'Person', icon: '👤', desc: 'Personal guarantor' },
  { value: 'VEHICLE_COLLATERAL', label: 'Vehicle Collateral', icon: '🚗', desc: 'Vehicle as collateral' },
  { value: 'PROPERTY_COLLATERAL', label: 'Property Collateral', icon: '🏠', desc: 'Property as collateral' },
];

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700 border border-amber-200',
  VERIFIED: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  REJECTED: 'bg-red-50 text-red-700 border border-red-200',
};

export default function GuarantorPage() {
  const { id: employeeId } = useParams<{ id: string }>();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [guarantors, setGuarantors] = useState<GuarantorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState('PERSON');
  const [form, setForm] = useState({
    fullName: '', phone: '', address: '', relationship: '', occupation: '', idNumber: '',
    vehicleType: '', vehiclePlateNumber: '', vehicleMake: '', vehicleYear: '',
    propertyType: '', propertyLocation: '', propertyTitleNumber: '', estimatedValue: '',
    notes: '',
  });
  const [documents, setDocuments] = useState<{ file: File | null; description: string; uploadedUrl?: string; uploadedFileName?: string }[]>([]);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchData = useCallback(async () => {
    if (!employeeId) return;
    setLoading(true);
    try {
      const [empRes, guarRes] = await Promise.all([
        api.get(`/employees/${employeeId}`),
        api.get(`/guarantors/employee/${employeeId}`),
      ]);
      setEmployee(empRes.data.data);
      setGuarantors(guarRes.data.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [employeeId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const resetForm = () => {
    setForm({ fullName: '', phone: '', address: '', relationship: '', occupation: '', idNumber: '',
      vehicleType: '', vehiclePlateNumber: '', vehicleMake: '', vehicleYear: '',
      propertyType: '', propertyLocation: '', propertyTitleNumber: '', estimatedValue: '', notes: '' });
    setDocuments([]);
    setType('PERSON');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const uploadedDocs: { url: string; fileName: string; description: string }[] = [];
      for (const doc of documents) {
        if (doc.uploadedUrl) {
          uploadedDocs.push({ url: doc.uploadedUrl, fileName: doc.uploadedFileName || '', description: doc.description });
        } else if (doc.file) {
          const fd = new FormData();
          fd.append('file', doc.file);
          fd.append('entityType', 'guarantor');
          fd.append('title', doc.description || doc.file.name);
          const uploadRes = await api.post('/files', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
          uploadedDocs.push({ url: uploadRes.data.data.path, fileName: uploadRes.data.data.filename, description: doc.description });
        }
      }

      const payload: any = {
        employeeId,
        guarantorType: type,
        fullName: form.fullName,
        phone: form.phone,
        address: form.address,
        relationship: form.relationship,
        occupation: form.occupation,
        idNumber: form.idNumber,
        notes: form.notes,
        documents: uploadedDocs,
      };

      if (type === 'VEHICLE_COLLATERAL') {
        payload.vehicleType = form.vehicleType;
        payload.vehiclePlateNumber = form.vehiclePlateNumber;
        payload.vehicleMake = form.vehicleMake;
        payload.vehicleYear = form.vehicleYear ? Number(form.vehicleYear) : undefined;
      } else if (type === 'PROPERTY_COLLATERAL') {
        payload.propertyType = form.propertyType;
        payload.propertyLocation = form.propertyLocation;
        payload.propertyTitleNumber = form.propertyTitleNumber;
        payload.estimatedValue = form.estimatedValue ? Number(form.estimatedValue) : undefined;
      }

      await api.post('/guarantors', payload);
      resetForm();
      setShowForm(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save guarantor');
    } finally { setSaving(false); }
  };

  const handleVerify = async (id: string) => {
    try {
      await api.put(`/guarantors/${id}/verify`);
      fetchData();
    } catch (err: any) { alert(err.response?.data?.message || 'Failed'); }
  };

  const handleReject = async (id: string) => {
    if (!rejectReason.trim()) return;
    try {
      await api.put(`/guarantors/${id}/reject`, { reason: rejectReason });
      setRejectingId(null);
      setRejectReason('');
      fetchData();
    } catch (err: any) { alert(err.response?.data?.message || 'Failed'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this guarantor record?')) return;
    try {
      await api.delete(`/guarantors/${id}`);
      fetchData();
    } catch (err: any) { alert(err.response?.data?.message || 'Failed'); }
  };

  const addDocument = () => {
    setDocuments([...documents, { file: null, description: '' }]);
  };

  const updateDoc = (idx: number, field: string, value: string) => {
    const updated = [...documents];
    (updated[idx] as any)[field] = value;
    setDocuments(updated);
  };

  const removeDoc = (idx: number) => {
    setDocuments(documents.filter((_, i) => i !== idx));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!employee) {
    return <div className="text-center py-20 text-gray-500">Employee not found</div>;
  }

  const hasVerified = guarantors.some(g => g.verificationStatus === 'VERIFIED');

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
            <span>Vital Security PLC</span><span>/</span>
            <span>HR & People</span><span>/</span>
            <span>Guarantor</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Guarantor Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            {employee.firstName} {employee.lastName} ({employee.employeeCode})
          </p>
        </div>
        <div className="flex gap-3">
          <Link to={`/employees/${employeeId}/edit`}
            className="h-10 px-5 flex items-center rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            Back to Employee
          </Link>
          <Link to={`/contracts/${employeeId}`}
            className="h-10 px-5 flex items-center gap-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
            Next: Create Contract
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </Link>
        </div>
      </div>

      {/* Status Banner */}
      {hasVerified && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </div>
          <div>
            <p className="text-sm font-medium text-emerald-800">Guarantor verified</p>
            <p className="text-xs text-emerald-600">This employee has a verified guarantor on file.</p>
          </div>
        </div>
      )}

      {/* Add Guarantor Button */}
      {!showForm && (
        <button onClick={() => setShowForm(true)}
          className="w-full h-12 flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 text-sm font-medium text-gray-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
          Add Guarantor
        </button>
      )}

      {/* Add Guarantor Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">New Guarantor</h2>
            <button type="button" onClick={() => { setShowForm(false); resetForm(); }}
              className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
          </div>

          {/* Type Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Guarantor Type *</label>
            <div className="grid grid-cols-3 gap-3">
              {TYPE_OPTIONS.map(opt => (
                <button key={opt.value} type="button" onClick={() => setType(opt.value)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    type === opt.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}>
                  <span className="text-2xl">{opt.icon}</span>
                  <p className="text-sm font-semibold text-gray-900 mt-2">{opt.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Common Fields */}
          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name *</label>
              <input type="text" value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })}
                required className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone *</label>
              <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                required className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
              <input type="text" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Relationship</label>
              <input type="text" value={form.relationship} onChange={e => setForm({ ...form, relationship: e.target.value })}
                placeholder="e.g. Parent, Sibling, Friend" className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
            </div>
          </div>

          {/* Person-specific */}
          {type === 'PERSON' && (
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Occupation</label>
                <input type="text" value={form.occupation} onChange={e => setForm({ ...form, occupation: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">ID Number</label>
                <input type="text" value={form.idNumber} onChange={e => setForm({ ...form, idNumber: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
              </div>
            </div>
          )}

          {/* Vehicle-specific */}
          {type === 'VEHICLE_COLLATERAL' && (
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Vehicle Type</label>
                <select value={form.vehicleType} onChange={e => setForm({ ...form, vehicleType: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400">
                  <option value="">Select type</option>
                  <option value="Sedan">Sedan</option>
                  <option value="SUV">SUV</option>
                  <option value="Truck">Truck</option>
                  <option value="Van">Van</option>
                  <option value="Motorcycle">Motorcycle</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Plate Number</label>
                <input type="text" value={form.vehiclePlateNumber} onChange={e => setForm({ ...form, vehiclePlateNumber: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Make / Brand</label>
                <input type="text" value={form.vehicleMake} onChange={e => setForm({ ...form, vehicleMake: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Year</label>
                <input type="number" value={form.vehicleYear} onChange={e => setForm({ ...form, vehicleYear: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
              </div>
            </div>
          )}

          {/* Property-specific */}
          {type === 'PROPERTY_COLLATERAL' && (
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Property Type</label>
                <select value={form.propertyType} onChange={e => setForm({ ...form, propertyType: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400">
                  <option value="">Select type</option>
                  <option value="House">House</option>
                  <option value="Apartment">Apartment</option>
                  <option value="Land">Land</option>
                  <option value="Commercial">Commercial Building</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Location</label>
                <input type="text" value={form.propertyLocation} onChange={e => setForm({ ...form, propertyLocation: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Title Number</label>
                <input type="text" value={form.propertyTitleNumber} onChange={e => setForm({ ...form, propertyTitleNumber: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Estimated Value (ETB)</label>
                <input type="number" value={form.estimatedValue} onChange={e => setForm({ ...form, estimatedValue: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
              </div>
            </div>
          )}

          {/* Documents */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700">Documents</label>
              <button type="button" onClick={addDocument}
                className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                Add Document
              </button>
            </div>
            {documents.length === 0 && (
              <p className="text-xs text-gray-400">No documents added yet.</p>
            )}
            <div className="space-y-3">
              {documents.map((doc, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  {doc.uploadedUrl ? (
                    <svg className="w-5 h-5 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  ) : (
                    <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  )}
                  <input type="text" value={doc.description} onChange={e => updateDoc(idx, 'description', e.target.value)}
                    placeholder="Document description" className="flex-1 h-8 px-2 rounded border border-gray-200 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500/20" />
                  {doc.uploadedUrl ? (
                    <span className="text-xs text-emerald-600 font-medium">Uploaded</span>
                  ) : (
                    <label className="h-8 px-3 flex items-center gap-1 rounded border border-dashed border-gray-300 text-xs text-gray-500 cursor-pointer hover:bg-gray-100">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                      {doc.file ? doc.file.name : 'Choose file'}
                      <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        onChange={e => {
                          const file = e.target.files?.[0] || null;
                          const updated = [...documents];
                          updated[idx] = { ...updated[idx], file, uploadedUrl: undefined, uploadedFileName: undefined };
                          setDocuments(updated);
                        }} />
                    </label>
                  )}
                  <button type="button" onClick={() => removeDoc(idx)} className="text-gray-400 hover:text-red-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
              rows={3} className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none" />
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => { setShowForm(false); resetForm(); }}
              className="h-10 px-5 flex items-center rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="h-10 px-5 flex items-center gap-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Guarantor'}
            </button>
          </div>
        </form>
      )}

      {/* Existing Guarantors */}
      {guarantors.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-gray-900">Submitted Guarantors ({guarantors.length})</h2>
          {guarantors.map(g => (
            <div key={g._id} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold">
                    {g.fullName?.[0]}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">{g.fullName}</h3>
                    <p className="text-sm text-gray-500">{g.phone} {g.relationship ? `• ${g.relationship}` : ''}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {TYPE_OPTIONS.find(t => t.value === g.guarantorType)?.label || g.guarantorType}
                      {g.occupation ? ` • ${g.occupation}` : ''}
                      {g.idNumber ? ` • ID: ${g.idNumber}` : ''}
                    </p>
                  </div>
                </div>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[g.verificationStatus] || ''}`}>
                  {g.verificationStatus}
                </span>
              </div>

              {/* Vehicle / Property details */}
              {g.guarantorType === 'VEHICLE_COLLATERAL' && (
                <div className="grid grid-cols-4 gap-3 text-xs">
                  {g.vehicleType && <div><span className="text-gray-400">Type:</span> <span className="font-medium">{g.vehicleType}</span></div>}
                  {g.vehiclePlateNumber && <div><span className="text-gray-400">Plate:</span> <span className="font-medium">{g.vehiclePlateNumber}</span></div>}
                  {g.vehicleMake && <div><span className="text-gray-400">Make:</span> <span className="font-medium">{g.vehicleMake}</span></div>}
                  {g.vehicleYear && <div><span className="text-gray-400">Year:</span> <span className="font-medium">{g.vehicleYear}</span></div>}
                </div>
              )}
              {g.guarantorType === 'PROPERTY_COLLATERAL' && (
                <div className="grid grid-cols-4 gap-3 text-xs">
                  {g.propertyType && <div><span className="text-gray-400">Type:</span> <span className="font-medium">{g.propertyType}</span></div>}
                  {g.propertyLocation && <div><span className="text-gray-400">Location:</span> <span className="font-medium">{g.propertyLocation}</span></div>}
                  {g.propertyTitleNumber && <div><span className="text-gray-400">Title:</span> <span className="font-medium">{g.propertyTitleNumber}</span></div>}
                  {g.estimatedValue && <div><span className="text-gray-400">Value:</span> <span className="font-medium">ETB {g.estimatedValue.toLocaleString()}</span></div>}
                </div>
              )}

              {/* Documents */}
              {g.documents.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {g.documents.map((d, i) => (
                    <a key={i} href={d.url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-50 rounded-lg text-xs text-gray-600 hover:bg-gray-100 transition-colors">
                      <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      {d.description || d.fileName}
                    </a>
                  ))}
                </div>
              )}

              {/* Rejection reason */}
              {g.verificationStatus === 'REJECTED' && g.rejectionReason && (
                <div className="bg-red-50 rounded-lg p-3">
                  <p className="text-xs font-medium text-red-700">Rejection Reason:</p>
                  <p className="text-sm text-red-600 mt-0.5">{g.rejectionReason}</p>
                </div>
              )}

              {/* Notes */}
              {g.notes && (
                <p className="text-xs text-gray-500 italic">{g.notes}</p>
              )}

              {/* Actions */}
              {g.verificationStatus === 'PENDING' && (
                <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
                  <button onClick={() => handleVerify(g._id)}
                    className="h-8 px-4 flex items-center gap-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    Verify
                  </button>
                  {rejectingId === g._id ? (
                    <div className="flex items-center gap-2">
                      <input type="text" value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                        placeholder="Rejection reason" className="h-8 px-3 rounded-lg border border-red-200 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-red-500/20 w-48" />
                      <button onClick={() => handleReject(g._id)} className="h-8 px-3 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700">Confirm</button>
                      <button onClick={() => { setRejectingId(null); setRejectReason(''); }} className="h-8 px-3 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50">Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => setRejectingId(g._id)}
                      className="h-8 px-4 flex items-center gap-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-medium hover:bg-red-50 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      Reject
                    </button>
                  )}
                  <button onClick={() => handleDelete(g._id)}
                    className="h-8 px-3 rounded-lg text-gray-400 hover:text-red-500 text-xs ml-auto">
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {guarantors.length === 0 && !showForm && (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          <p className="text-sm text-gray-500">No guarantors on file</p>
          <p className="text-xs text-gray-400 mt-1">Add a guarantor to proceed with the onboarding process.</p>
        </div>
      )}
    </div>
  );
}
