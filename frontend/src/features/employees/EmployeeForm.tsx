import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../lib/api';

type TabKey = 'personal' | 'employment' | 'documents' | 'site' | 'access';

interface GuardAssignment {
  _id: string;
  siteId: { siteName: string; siteCode: string } | string;
  effectiveFrom: string;
  isCurrent: boolean;
}

const tabs: { key: TabKey; label: string }[] = [
  { key: 'personal', label: 'Personal Info' },
  { key: 'employment', label: 'Employment Details' },
  { key: 'documents', label: 'Documents' },
  { key: 'site', label: 'Site Assignment' },
  { key: 'access', label: 'Access' },
];

const onboardingStages = [
  { label: 'Created', step: 1 },
  { label: 'Employment Details', step: 2 },
  { label: 'Documents', step: 3 },
  { label: 'Site Assignment', step: 4 },
  { label: 'Access Setup', step: 5 },
  { label: 'Activated', step: 6 },
];

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  INACTIVE: 'bg-gray-50 text-gray-600 border-gray-200',
  ON_LEAVE: 'bg-amber-50 text-amber-700 border-amber-200',
  TERMINATED: 'bg-red-50 text-red-700 border-red-200',
};

export default function EmployeeForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('personal');
  const [currentStage, setCurrentStage] = useState(1);
  const [error, setError] = useState('');
  const [guardAssignment, setGuardAssignment] = useState<GuardAssignment | null>(null);

  const [form, setForm] = useState({
    employeeCode: '',
    firstName: '',
    middleName: '',
    lastName: '',
    phone: '',
    email: '',
    address: '',
    hireDate: '',
    category: 'GUARD',
    gender: '',
    dateOfBirth: '',
    department: '',
    position: '',
    bankName: '',
    bankBranch: '',
    accountNumber: '',
    salary: 0,
    transportAllowance: 0,
  });

  useEffect(() => {
    if (isEdit) {
      setLoading(true);
      api.get(`/employees/${id}`)
        .then((res) => {
          const e = res.data.data;
          setForm({
            employeeCode: e.employeeCode || '',
            firstName: e.firstName || '',
            middleName: e.middleName || '',
            lastName: e.lastName || '',
            phone: e.phone || '',
            email: e.email || '',
            address: e.address || '',
            hireDate: e.hireDate ? e.hireDate.split('T')[0] : '',
            category: e.category || 'GUARD',
            gender: e.gender || '',
            dateOfBirth: e.dateOfBirth ? e.dateOfBirth.split('T')[0] : '',
            department: e.department || '',
            position: e.position || '',
            bankName: e.bankName || '',
            bankBranch: e.bankBranch || '',
            accountNumber: e.accountNumber || '',
            salary: e.salary || 0,
            transportAllowance: e.transportAllowance || 0,
          });
          setCurrentStage(6);
          if (e.category === 'GUARD') {
            api.get(`/guards/${id}`).then((gRes) => {
              const detail = gRes.data.data;
              setGuardAssignment(detail?.assignments?.find((a: any) => a.isCurrent) || detail?.assignments?.[0] || null);
            }).catch(() => {});
          }
        })
        .catch(() => setError('Failed to load employee'))
        .finally(() => setLoading(false));
    }
  }, [id, isEdit]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    setError('');
    setSaving(true);
    try {
      const payload = {
        ...form,
        salary: Number(form.salary),
        transportAllowance: Number(form.transportAllowance),
      };
      if (isEdit) {
        await api.put(`/employees/${id}`, payload);
      } else {
        await api.post('/employees', payload);
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

  const getStageForTab = (tab: TabKey): number => {
    const map: Record<TabKey, number> = { personal: 1, employment: 2, documents: 3, site: 4, access: 5 };
    return map[tab];
  };

  const handleNext = () => {
    const tabOrder: TabKey[] = ['personal', 'employment', 'documents', 'site', 'access'];
    const idx = tabOrder.indexOf(activeTab);
    if (idx < tabOrder.length - 1) {
      setActiveTab(tabOrder[idx + 1]);
      setCurrentStage(getStageForTab(tabOrder[idx + 1]));
    }
  };

  const handlePrev = () => {
    const tabOrder: TabKey[] = ['personal', 'employment', 'documents', 'site', 'access'];
    const idx = tabOrder.indexOf(activeTab);
    if (idx > 0) {
      setActiveTab(tabOrder[idx - 1]);
      setCurrentStage(getStageForTab(tabOrder[idx - 1]));
    }
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
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <span>Vital Security PLC</span>
        <span>/</span>
        <span>HR & People</span>
        <span>/</span>
        <span>{isEdit ? 'Edit Employee' : 'New Employee'}</span>
      </div>

      {/* Onboarding Stepper */}
      <div className="bg-white rounded-xl border border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          {onboardingStages.map((stage, i) => {
            const isCompleted = currentStage > stage.step;
            const isCurrent = currentStage === stage.step;
            return (
              <div key={stage.step} className="flex items-center flex-1 last:flex-none">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    isCompleted ? 'bg-emerald-500 text-white' :
                    isCurrent ? 'bg-blue-600 text-white' :
                    'bg-gray-100 text-gray-400'
                  }`}>
                    {isCompleted ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    ) : stage.step}
                  </div>
                  <span className={`text-xs font-medium whitespace-nowrap ${isCurrent ? 'text-blue-600' : isCompleted ? 'text-emerald-600' : 'text-gray-400'}`}>
                    {stage.label}
                  </span>
                </div>
                {i < onboardingStages.length - 1 && (
                  <div className={`flex-1 h-px mx-3 ${isCompleted ? 'bg-emerald-300' : 'bg-gray-200'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100">{error}</div>
      )}

      {/* Main Content: 3-column layout */}
      <div className="flex gap-6">
        {/* Left Sidebar - Employee Profile */}
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
              {isEdit && (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColors['ACTIVE']}`}>
                  Active
                </span>
              )}
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

        {/* Center Content - Tabs */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Tab Bar */}
          <div className="flex gap-1 border-b border-gray-200 bg-white rounded-t-xl px-4">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  setCurrentStage(getStageForTab(tab.key));
                }}
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

          {/* Tab Content */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            {/* Personal Info Tab */}
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
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Middle Name</label>
                    <input type="text" name="middleName" value={form.middleName} onChange={handleChange}
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

            {/* Employment Details Tab */}
            {activeTab === 'employment' && (
              <div className="space-y-6">
                <h3 className="text-base font-semibold text-gray-900">Employment Parameters</h3>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Hire Date *</label>
                    <input type="date" name="hireDate" value={form.hireDate} onChange={handleChange} required
                      className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Department</label>
                    <select name="department" value={form.department} onChange={handleChange}
                      className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400">
                      <option value="">Select department</option>
                      <option value="Operations">Operations</option>
                      <option value="HR">HR</option>
                      <option value="Finance">Finance</option>
                      <option value="Administration">Administration</option>
                      <option value="Security">Security</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Position</label>
                    <select name="position" value={form.position} onChange={handleChange}
                      className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400">
                      <option value="">Select position</option>
                      <option value="Guard">Guard</option>
                      <option value="Site Leader">Site Leader</option>
                      <option value="Operations Manager">Operations Manager</option>
                      <option value="HR Officer">HR Officer</option>
                      <option value="Finance Officer">Finance Officer</option>
                      <option value="Admin Officer">Admin Officer</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Pay Grade</label>
                    <select name="salary" value={form.salary || ''} onChange={(e) => setForm({ ...form, salary: Number(e.target.value) })}
                      className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400">
                      <option value={0}>Select grade</option>
                      <option value={3000}>Grade A (ETB 3,000)</option>
                      <option value={5000}>Grade B (ETB 5,000)</option>
                      <option value={8000}>Grade C (ETB 8,000)</option>
                      <option value={12000}>Grade D (ETB 12,000)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Bank Name</label>
                    <input type="text" name="bankName" value={form.bankName} onChange={handleChange}
                      className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Bank Branch</label>
                    <input type="text" name="bankBranch" value={form.bankBranch} onChange={handleChange}
                      className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Account Number</label>
                    <input type="text" name="accountNumber" value={form.accountNumber} onChange={handleChange}
                      className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Transport Allowance</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-sm text-gray-400">$</span>
                      <input type="number" name="transportAllowance" value={form.transportAllowance || ''}
                        onChange={(e) => setForm({ ...form, transportAllowance: parseFloat(e.target.value) || 0 })}
                        className="w-full h-10 pl-8 pr-4 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Documents Tab */}
            {activeTab === 'documents' && (
              <div className="space-y-6">
                <h3 className="text-base font-semibold text-gray-900">Document Upload</h3>
                <div className="grid grid-cols-1 gap-4">
                  {[
                    { label: 'National ID / Passport', required: true },
                    { label: 'Signed Contract', required: true },
                    { label: 'Enhanced Background Check', required: true },
                    { label: 'First Aid Certification', required: false },
                    { label: 'Uniform Issue Record', required: false },
                  ].map((doc) => (
                    <div key={doc.label} className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{doc.label}</p>
                          <p className="text-[10px] text-gray-400">{doc.required ? 'Required' : 'Optional'}</p>
                        </div>
                      </div>
                      <button className="h-8 px-3 flex items-center gap-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        Upload
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Site Assignment Tab */}
            {activeTab === 'site' && (
              <div className="space-y-6">
                <h3 className="text-base font-semibold text-gray-900">Site Assignment</h3>
                {guardAssignment ? (
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg border border-gray-200 bg-gray-50">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Assigned Site</p>
                          <p className="text-sm font-medium text-gray-900">
                            {typeof guardAssignment.siteId === 'object' ? guardAssignment.siteId.siteName : 'Unknown'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Site Code</p>
                          <p className="text-sm text-gray-700">
                            {typeof guardAssignment.siteId === 'object' ? guardAssignment.siteId.siteCode : '—'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Assigned Since</p>
                          <p className="text-sm text-gray-700">
                            {new Date(guardAssignment.effectiveFrom).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Status</p>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Active Assignment
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate('/guards')}
                      className="h-9 px-4 flex items-center gap-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      Manage in Guard Allocation
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
                    <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p className="text-sm text-gray-500 mb-2">No site assigned yet</p>
                    <p className="text-xs text-gray-400 mb-4">Assign this guard to a site from the Guard Allocation page.</p>
                    <button
                      onClick={() => navigate('/guards')}
                      className="h-9 px-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                      Go to Guard Allocation
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Access Tab */}
            {activeTab === 'access' && (
              <div className="space-y-6">
                <h3 className="text-base font-semibold text-gray-900">Access Setup</h3>
                <div className="space-y-4">
                  <div className="p-4 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">System Access</p>
                        <p className="text-xs text-gray-400">Enable login credentials for the employee portal</p>
                      </div>
                      <div className="relative">
                        <input type="checkbox" className="sr-only" defaultChecked={false} />
                        <div className="w-10 h-6 bg-gray-200 rounded-full shadow-inner" />
                      </div>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Mobile App Access</p>
                        <p className="text-xs text-gray-400">Allow access to the mobile attendance app</p>
                      </div>
                      <div className="relative">
                        <input type="checkbox" className="sr-only" defaultChecked={false} />
                        <div className="w-10 h-6 bg-gray-200 rounded-full shadow-inner" />
                      </div>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Biometric Registration</p>
                        <p className="text-xs text-gray-400">Register fingerprint or face for clock-in verification</p>
                      </div>
                      <div className="relative">
                        <input type="checkbox" className="sr-only" defaultChecked={false} />
                        <div className="w-10 h-6 bg-gray-200 rounded-full shadow-inner" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-100">
              <button
                onClick={handlePrev}
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
                {activeTab === 'access' ? (
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
                    onClick={handleNext}
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

        {/* Right Sidebar */}
        <div className="w-64 flex-shrink-0 space-y-4 hidden xl:block">
          {/* Workforce Actions */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h4 className="text-sm font-semibold text-gray-900 mb-4">Workforce Actions</h4>
            <div className="space-y-2">
              <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left">
                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                Assign to Site
              </button>
              <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left">
                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Update Documents
              </button>
              <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left">
                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0" />
                </svg>
                Generate ID Badge
              </button>
              <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors text-left">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
                </svg>
                Initiate Termination
              </button>
            </div>
          </div>

          {/* Document Checklist */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h4 className="text-sm font-semibold text-gray-900 mb-4">Document Checklist</h4>
            <div className="space-y-3">
              {[
                { label: 'National ID / Passport', done: false },
                { label: 'Signed Contract', done: false },
                { label: 'Enhanced Background Check', done: false },
                { label: 'First Aid Certification', done: false },
                { label: 'Uniform Issue Record', done: false },
              ].map((doc) => (
                <div key={doc.label} className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">{doc.label}</span>
                  {doc.done ? (
                    <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
