import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../lib/api';

type TabKey = 'personal' | 'employment' | 'documents';

const tabs: { key: TabKey; label: string }[] = [
  { key: 'personal', label: 'Personal Info' },
  { key: 'employment', label: 'Employment Details' },
  { key: 'documents', label: 'Documents' },
];

interface DocEntry {
  title: string;
  file: File | null;
  existingUrl?: string;
  existingFileName?: string;
}

export default function EmployeeForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('personal');
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    employeeCode: '',
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    address: '',
    category: 'GUARD',
    gender: '',
    dateOfBirth: '',
    department: '',
    position: '',
    bankName: '',
    accountNumber: '',
    salary: 0,
  });

  const [departments, setDepartments] = useState<{ _id: string; name: string }[]>([]);
  const [positions, setPositions] = useState<{ _id: string; name: string }[]>([]);
  const [documents, setDocuments] = useState<DocEntry[]>([{ title: '', file: null }]);

  useEffect(() => {
    api.get('/departments').then((r) => setDepartments(r.data.data || [])).catch(() => {});
    api.get('/positions').then((r) => setPositions(r.data.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (isEdit) {
      setLoading(true);
      api.get(`/employees/${id}`)
        .then((res) => {
          const e = res.data.data;
          setForm({
            employeeCode: e.employeeCode || '',
            firstName: e.firstName || '',
            lastName: e.lastName || '',
            phone: e.phone || '',
            email: e.email || '',
            address: e.address || '',
            category: e.category || 'GUARD',
            gender: e.gender || '',
            dateOfBirth: e.dateOfBirth ? e.dateOfBirth.split('T')[0] : '',
            department: e.department || '',
            position: e.position || '',
            bankName: e.bankName || '',
            accountNumber: e.accountNumber || '',
            salary: e.salary || 0,
          });
          if (e.documents && e.documents.length > 0) {
            setDocuments(e.documents.map((d: any) => ({
              title: d.title || '',
              file: null,
              existingUrl: d.url,
              existingFileName: d.fileName,
            })));
          }
        })
        .catch(() => setError('Failed to load employee'))
        .finally(() => setLoading(false));
    }
  }, [id, isEdit]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const addDocument = () => setDocuments([...documents, { title: '', file: null }]);
  const removeDocument = (idx: number) => setDocuments(documents.filter((_, i) => i !== idx));
  const updateDocument = (idx: number, field: string, value: any) => {
    const updated = [...documents];
    (updated[idx] as any)[field] = value;
    setDocuments(updated);
  };

  const handleSubmit = async () => {
    setError('');
    setSaving(true);
    try {
      const payload = { ...form, salary: Number(form.salary) };
      let employeeId = id;
      if (isEdit) {
        await api.put(`/employees/${id}`, payload);
      } else {
        const res = await api.post('/employees', payload);
        employeeId = res.data.data._id;
      }

      for (const doc of documents) {
        if (doc.file && employeeId) {
          const fd = new FormData();
          fd.append('file', doc.file);
          fd.append('entityType', 'employee');
          fd.append('entityId', employeeId);
          fd.append('title', doc.title || doc.file.name);
          await api.post('/files', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        }
      }
      navigate('/employees');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save employee');
    } finally {
      setSaving(false);
    }
  };

  const getInitials = () => {
    return `${form.firstName?.[0] || ''}${form.lastName?.[0] || ''}`.toUpperCase() || '??';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <span>Vital Security PLC</span>
        <span>/</span>
        <span>HR & People</span>
        <span>/</span>
        <span>{isEdit ? 'Edit Employee' : 'New Employee'}</span>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100">{error}</div>
      )}

      <div className="flex gap-6">
        <div className="w-64 flex-shrink-0 space-y-4 hidden lg:block">
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4 shadow-lg">
              {getInitials()}
            </div>
            <h3 className="text-base font-semibold text-gray-900">
              {form.firstName || form.lastName ? `${form.firstName} ${form.lastName}` : 'New Employee'}
            </h3>
            <p className="text-xs text-gray-400 font-mono mt-1">{form.employeeCode || 'VS-0000'}</p>
            <div className="flex items-center justify-center gap-2 mt-3">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                form.category === 'GUARD' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-violet-50 text-violet-700 border-violet-200'
              }`}>
                {form.category === 'GUARD' ? 'Guard' : 'Office Staff'}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Phone</p>
              <p className="text-sm text-gray-700">{form.phone || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Email</p>
              <p className="text-sm text-gray-700">{form.email || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Department</p>
              <p className="text-sm text-gray-700">{form.department || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Position</p>
              <p className="text-sm text-gray-700">{form.position || '—'}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 min-w-0 space-y-4">
          <div className="flex gap-1 border-b border-gray-200 bg-white rounded-t-xl px-4">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
                  activeTab === tab.key
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            {activeTab === 'personal' && (
              <div className="space-y-6">
                <h3 className="text-base font-semibold text-gray-900">Personal Information</h3>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Employee Code *</label>
                    <input type="text" name="employeeCode" value={form.employeeCode} onChange={handleChange}
                      placeholder="VS-0000"
                      className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Category *</label>
                    <select name="category" value={form.category} onChange={handleChange}
                      className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400">
                      <option value="GUARD">Guard</option>
                      <option value="OFFICE_STAFF">Office Staff</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">First Name *</label>
                    <input type="text" name="firstName" value={form.firstName} onChange={handleChange} required
                      className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Last Name *</label>
                    <input type="text" name="lastName" value={form.lastName} onChange={handleChange} required
                      className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Gender</label>
                    <select name="gender" value={form.gender} onChange={handleChange}
                      className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400">
                      <option value="">Select gender</option>
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Date of Birth</label>
                    <input type="date" name="dateOfBirth" value={form.dateOfBirth} onChange={handleChange}
                      className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone *</label>
                    <input type="text" name="phone" value={form.phone} onChange={handleChange} required
                      className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                    <input type="email" name="email" value={form.email} onChange={handleChange}
                      className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
                    <textarea name="address" value={form.address} onChange={handleChange} rows={2}
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none" />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'employment' && (
              <div className="space-y-6">
                <h3 className="text-base font-semibold text-gray-900">Employment Parameters</h3>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Department</label>
                    <select name="department" value={form.department} onChange={handleChange}
                      className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400">
                      <option value="">Select department</option>
                      {departments.map((d) => (
                        <option key={d._id} value={d.name}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Position</label>
                    <select name="position" value={form.position} onChange={handleChange}
                      className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400">
                      <option value="">Select position</option>
                      {positions.map((p) => (
                        <option key={p._id} value={p.name}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Bank Name</label>
                    <input type="text" name="bankName" value={form.bankName} onChange={handleChange}
                      className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Account Number</label>
                    <input type="text" name="accountNumber" value={form.accountNumber} onChange={handleChange}
                      className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'documents' && (
              <div className="space-y-6">
                <h3 className="text-base font-semibold text-gray-900">Documents</h3>
                <p className="text-sm text-gray-500">Upload employee documents (ID copies, certifications, contracts, etc.)</p>
                <div className="space-y-4">
                  {documents.map((doc, idx) => (
                    <div key={idx} className="p-4 rounded-lg border border-gray-200 bg-gray-50/50">
                      <div className="flex items-start gap-4">
                        <div className="flex-1 space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Document Title</label>
                            <input
                              type="text"
                              value={doc.title}
                              onChange={(e) => updateDocument(idx, 'title', e.target.value)}
                              placeholder="e.g. National ID, Contract, Certification"
                              className="w-full h-9 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">File</label>
                            {doc.existingUrl ? (
                              <div className="flex items-center gap-2 h-9 px-3 rounded-lg border border-emerald-200 bg-emerald-50 text-sm text-emerald-700">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span className="truncate">{doc.existingFileName}</span>
                                <span className="text-xs text-emerald-500 ml-auto">Uploaded</span>
                              </div>
                            ) : (
                              <label className="flex items-center gap-2 h-9 px-3 rounded-lg border border-dashed border-gray-300 bg-white text-sm text-gray-500 cursor-pointer hover:bg-gray-50 transition-colors">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                                <span className="truncate">{doc.file ? doc.file.name : 'Choose file...'}</span>
                                <input
                                  type="file"
                                  className="hidden"
                                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                  onChange={(e) => updateDocument(idx, 'file', e.target.files?.[0] || null)}
                                />
                              </label>
                            )}
                          </div>
                        </div>
                        {documents.length > 1 && (
                          <button
                            onClick={() => removeDocument(idx)}
                            className="mt-5 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={addDocument}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-blue-600 border border-dashed border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add another file
                </button>
              </div>
            )}

            <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-100">
              <button
                onClick={() => setActiveTab(tabs[Math.max(0, tabs.findIndex(t => t.key === activeTab) - 1)].key)}
                disabled={activeTab === 'personal'}
                className="px-5 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => navigate('/employees')}
                  className="px-5 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                {activeTab === 'documents' ? (
                  <button
                    onClick={handleSubmit}
                    disabled={saving}
                    className="px-6 py-2.5 flex items-center gap-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {saving ? 'Saving...' : isEdit ? 'Update Employee' : 'Create Employee'}
                  </button>
                ) : (
                  <button
                    onClick={() => setActiveTab(tabs[tabs.findIndex(t => t.key === activeTab) + 1].key)}
                    className="px-6 py-2.5 flex items-center gap-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    Next
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
