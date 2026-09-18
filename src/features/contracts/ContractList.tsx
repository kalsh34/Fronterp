import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';

interface Employee {
  _id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  category: string;
  status: string;
  department?: string;
}

interface Contract {
  _id: string;
  employeeId: { _id: string; firstName: string; lastName: string; employeeCode: string } | string;
  contractStartDate: string;
  contractEndDate?: string;
  contractType: string;
  wage: number;
  status: string;
}

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  EXPIRED: 'bg-gray-50 text-gray-600 border-gray-200',
  TERMINATED: 'bg-red-50 text-red-700 border-red-200',
};

export default function ContractList() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [contractMap, setContractMap] = useState<Record<string, Contract>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (search) params.search = search;

      const [empRes, contractRes] = await Promise.all([
        api.get('/employees', { params }),
        api.get('/contracts', { params: { limit: 200 } }).catch(() => ({ data: { data: [] } })),
      ]);

      const emps = empRes.data.data || [];
      const ctrs = contractRes.data.data || [];

      setEmployees(emps);
      setTotalPages(empRes.data.pagination?.totalPages || 1);

      const map: Record<string, Contract> = {};
      ctrs.forEach((c: Contract) => {
        const empId = typeof c.employeeId === 'object' ? c.employeeId._id : c.employeeId;
        if (!map[empId]) map[empId] = c;
      });
      setContractMap(map);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const activeCount = Object.values(contractMap).filter((c) => c.status === 'ACTIVE').length;
  const expiredCount = Object.values(contractMap).filter((c) => c.status === 'EXPIRED').length;
  const noContractCount = employees.filter((e) => !contractMap[e._id]).length;

  return (
    <div className="space-y-4">
      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'TOTAL EMPLOYEES', value: employees.length, dot: 'bg-blue-500' },
          { label: 'ACTIVE CONTRACTS', value: activeCount, dot: 'bg-emerald-500' },
          { label: 'EXPIRED', value: expiredCount, dot: 'bg-amber-500' },
          { label: 'NO CONTRACT', value: noContractCount, dot: 'bg-red-500' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 px-4 py-3">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">{s.label}</p>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${s.dot}`} />
              <span className="text-xl font-bold text-gray-900">{s.value}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search employee..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full h-10 pl-10 pr-4 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-7 h-7 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : employees.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-gray-500">No employees found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Employee</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Department</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Contract Type</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Wage</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Start Date</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => {
                    const contract = contractMap[emp._id];
                    return (
                      <tr key={emp._id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                              {emp.firstName?.[0]}{emp.lastName?.[0]}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 text-sm">{emp.firstName} {emp.lastName}</p>
                              <p className="text-[10px] text-gray-400 font-mono">{emp.employeeCode}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-gray-600">{emp.department || '—'}</td>
                        <td className="px-5 py-3.5">
                          {contract ? (
                            <span className="text-sm text-gray-700">{contract.contractType}</span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          {contract ? (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColors[contract.status] || ''}`}>
                              {contract.status}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                              No Contract
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-sm text-gray-700">
                          {contract ? `$${contract.wage.toLocaleString()}` : '—'}
                        </td>
                        <td className="px-5 py-3.5 text-sm text-gray-600">
                          {contract?.contractStartDate
                            ? new Date(contract.contractStartDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                            : '—'}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={() => navigate(`/contracts/${emp._id}`)}
                            className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {contract ? 'Update' : 'Create'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex justify-between items-center px-5 py-3 border-t border-gray-100">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
