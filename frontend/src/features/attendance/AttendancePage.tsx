import React, { useState, useEffect, useCallback } from 'react';
import { Button, Card, Modal } from '../../components/ui';
import api from '../../lib/api';
import GuardManualFiling from './GuardManualFiling';
import GuardAttendanceGrid from './GuardAttendanceGrid';
import CoverageDashboard from './CoverageDashboard';
import SiteNotes from './SiteNotes';
import ShiftsPage from './ShiftsPage';

interface Site {
  id: string;
  name: string;
  requiredPosts: number;
  onDutyGuardForce: number;
  coverageRate: number;
}

interface PostCoverage {
  id: string;
  siteId: string;
  postName: string;
  assignedGuard: string | null;
  status: 'covered' | 'transitioning' | 'unfilled';
  clockInTime: string | null;
}

interface OnDutyGuard {
  id: string;
  guardName: string;
  avatarInitials: string;
  assignedPost: string;
  clockInTime: string;
  scheduledRelief: string;
  duration: string;
  riskStatus: 'normal' | 'high';
  hoursWorked: number;
}

interface ReliefLogEntry {
  id: string;
  timestamp: string;
  action: string;
  guardName: string;
  details: string;
}


const TABS = [
  { key: 'attendance', label: 'Attendance' },
  { key: 'guard-filing', label: 'Guard Filing' },
  { key: 'coverage', label: 'Coverage' },
  { key: 'sites', label: 'Sites' },
  { key: 'site-notes', label: 'Site Notes' },
  { key: 'shifts', label: 'Shifts' },
] as const;

const RELIEF_STEPS = [
  { step: 1, title: 'Select Site Post', description: 'Choose the post requiring relief' },
  { step: 2, title: 'Verify Outgoing Guard', description: 'Confirm identity of departing guard' },
  { step: 3, title: 'Confirm Shift Replacement', description: 'Assign incoming guard to post' },
  { step: 4, title: 'Perform 48h Fatigue Check', description: 'Verify guard has rested minimum 8 hours' },
  { step: 5, title: 'Clock-in Incoming Guard', description: 'Process time entry for replacement' },
];

function getCoverageColor(rate: number): string {
  if (rate >= 90) return 'text-emerald-600';
  if (rate >= 50) return 'text-amber-500';
  return 'text-red-600';
}

function getPostStatusClasses(status: PostCoverage['status']): string {
  switch (status) {
    case 'covered':
      return 'bg-emerald-50 border-emerald-300';
    case 'transitioning':
      return 'bg-amber-50 border-amber-300';
    case 'unfilled':
      return 'bg-red-50 border-red-300';
  }
}

function getPostStatusDot(status: PostCoverage['status']): string {
  switch (status) {
    case 'covered':
      return 'bg-emerald-500';
    case 'transitioning':
      return 'bg-amber-500';
    case 'unfilled':
      return 'bg-red-500';
  }
}

function getPostStatusLabel(status: PostCoverage['status']): string {
  switch (status) {
    case 'covered':
      return 'Covered';
    case 'transitioning':
      return 'Transitioning';
    case 'unfilled':
      return 'Unfilled';
  }
}

function getRiskBadge(status: OnDutyGuard['riskStatus']): string {
  if (status === 'high') return 'bg-red-100 text-red-700 border border-red-200';
  return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
}

function formatTime(timeStr: string): string {
  if (!timeStr) return '-';
  const d = new Date(timeStr);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function formatTimestamp(timeStr: string): string {
  const d = new Date(timeStr);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

const AttendancePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('attendance');
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [posts, setPosts] = useState<PostCoverage[]>([]);
  const [onDutyGuards, setOnDutyGuards] = useState<OnDutyGuard[]>([]);
  const [reliefLog, setReliefLog] = useState<ReliefLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [overrideGuardId, setOverrideGuardId] = useState<string>('');
  const [overrideReason, setOverrideReason] = useState('');
  const [clockInModalOpen, setClockInModalOpen] = useState(false);
  const [clockInGuardName, setClockInGuardName] = useState('');
  const [clockInPost, setClockInPost] = useState('');
  const [reliefStep, setReliefStep] = useState(0);

  const selectedSite = sites.find((s) => s.id === selectedSiteId) || sites[0];

  const fetchSites = useCallback(async () => {
    try {
      const response = await api.get('/sites');
      const data = response.data.data || response.data;
      setSites(data);
      if (data.length > 0 && !selectedSiteId) {
        setSelectedSiteId(data[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch sites:', error);
    }
  }, [selectedSiteId]);

  const fetchOnDutyGuards = useCallback(async (siteId: string) => {
    if (!siteId) return;
    try {
      const response = await api.get(`/attendance/on-duty?siteId=${siteId}`);
      setOnDutyGuards(response.data.data || response.data);
    } catch (error) {
      console.error('Failed to fetch on-duty guards:', error);
    }
  }, []);

  const fetchPosts = useCallback(async (siteId: string) => {
    if (!siteId) return;
    try {
      const response = await api.get(`/attendance/posts?siteId=${siteId}`);
      setPosts(response.data.data || response.data);
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    }
  }, []);

  const addLogEntry = useCallback(
    (action: string, guardName: string, details: string) => {
      const entry: ReliefLogEntry = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        action,
        guardName,
        details,
      };
      setReliefLog((prev) => [entry, ...prev].slice(0, 20));
    },
    []
  );

  useEffect(() => {
    fetchSites();
  }, [fetchSites]);

  useEffect(() => {
    if (selectedSiteId) {
      setLoading(true);
      Promise.all([fetchPosts(selectedSiteId), fetchOnDutyGuards(selectedSiteId)]).then(() =>
        setLoading(false)
      );
    }
  }, [selectedSiteId, fetchPosts, fetchOnDutyGuards]);

  const handleClockIn = async () => {
    if (!clockInGuardName || !clockInPost) return;
    try {
      await api.post('/attendance/clock-in', {
        guardName: clockInGuardName,
        postId: clockInPost,
        siteId: selectedSiteId,
      });
      addLogEntry('Clock-In', clockInGuardName, `Clocked in at post`);
      setClockInModalOpen(false);
      setClockInGuardName('');
      setClockInPost('');
      if (selectedSiteId) {
        fetchPosts(selectedSiteId);
        fetchOnDutyGuards(selectedSiteId);
      }
    } catch (error) {
      console.error('Failed to clock in:', error);
    }
  };

  const handleClockOut = async (guardId: string) => {
    try {
      await api.post('/attendance/clock-out', { guardId });
      const guard = onDutyGuards.find((g) => g.id === guardId);
      addLogEntry('Clock-Out', guard?.guardName || 'Unknown', 'Clocked out from post');
      if (selectedSiteId) {
        fetchPosts(selectedSiteId);
        fetchOnDutyGuards(selectedSiteId);
      }
    } catch (error) {
      console.error('Failed to clock out:', error);
    }
  };

  const handleOverrideClockOut = async () => {
    if (!overrideGuardId || !overrideReason) return;
    try {
      await api.post('/attendance/override-clock-out', {
        guardId: overrideGuardId,
        reason: overrideReason,
      });
      const guard = onDutyGuards.find((g) => g.id === overrideGuardId);
      addLogEntry('Override Clock-Out', guard?.guardName || 'Unknown', `Reason: ${overrideReason}`);
      setOverrideModalOpen(false);
      setOverrideGuardId('');
      setOverrideReason('');
      if (selectedSiteId) {
        fetchPosts(selectedSiteId);
        fetchOnDutyGuards(selectedSiteId);
      }
    } catch (error) {
      console.error('Failed to override clock out:', error);
    }
  };

  const handleProcessRelief = () => {
    if (reliefStep < RELIEF_STEPS.length) {
      setReliefStep((prev) => prev + 1);
      if (reliefStep === RELIEF_STEPS.length - 1) {
        addLogEntry('Relief Complete', 'System', 'Guard relief process completed');
      }
    }
  };

  const coverageAlert = onDutyGuards.some((g) => g.hoursWorked >= 48);

  const coveredPosts = posts.filter((p) => p.status === 'covered').length;
  const transitioningPosts = posts.filter((p) => p.status === 'transitioning').length;
  const unfilledPosts = posts.filter((p) => p.status === 'unfilled').length;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <span className="hover:text-blue-600 cursor-pointer">Operations</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="text-gray-900 font-medium">Attendance & Relief</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Operations Control Tower</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setClockInModalOpen(true)}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Clock In
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                if (onDutyGuards.length > 0) {
                  setOverrideGuardId(onDutyGuards[0].id);
                  setOverrideModalOpen(true);
                }
              }}
            >
              Override Clock-Out
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-gray-200">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === tab.key
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Site Selector Bar */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <select
                  value={selectedSiteId}
                  onChange={(e) => setSelectedSiteId(e.target.value)}
                  className="text-lg font-semibold text-gray-900 bg-transparent border-none focus:ring-0 cursor-pointer pr-8"
                >
                  {sites.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-8">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{selectedSite?.requiredPosts || 0}</div>
                <div className="text-xs text-gray-500 font-medium">Required Guard Posts</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{selectedSite?.onDutyGuardForce || 0}</div>
                <div className="text-xs text-gray-500 font-medium">On-Duty Guard Force</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${getCoverageColor(selectedSite?.coverageRate || 0)}`}>
                  {selectedSite?.coverageRate || 0}%
                </div>
                <div className="text-xs text-gray-500 font-medium">Site Coverage Rate</div>
              </div>
            </div>
          </div>
        </Card>

        {/* Fatigue Alert Banner */}
        {coverageAlert && (
          <div className="bg-amber-50 border border-amber-300 rounded-xl px-5 py-3.5 flex items-center gap-4">
            <div className="flex-shrink-0 w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="flex-1">
              <span className="font-semibold text-amber-800">48-Hour Rolling Guard Fatigue Alert</span>
              <span className="text-amber-700 text-sm ml-2">
                - One or more guards approaching or exceeding 48-hour duty threshold. Immediate relief required.
              </span>
            </div>
            <button className="text-amber-500 hover:text-amber-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Main Content Grid */}
        {activeTab === 'guard-filing' ? (
          <GuardManualFiling />
        ) : activeTab === 'attendance' ? (
          <GuardAttendanceGrid />
        ) : activeTab === 'coverage' ? (
          <CoverageDashboard />
        ) : activeTab === 'site-notes' ? (
          <SiteNotes />
        ) : activeTab === 'shifts' ? (
          <ShiftsPage />
        ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6">
          {/* Heatmap */}
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Live Post Coverage Heatmap</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Real-time status of all posts</p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                    Covered ({coveredPosts})
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                    Transitioning ({transitioningPosts})
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
                    Unfilled ({unfilledPosts})
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
                </div>
              ) : posts.length === 0 ? (
                <div className="text-center py-20 text-gray-400">
                  <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <p className="text-sm">No posts configured for this site</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {posts.map((post) => (
                    <div
                      key={post.id}
                      className={`rounded-xl border-2 p-4 transition-all hover:shadow-md cursor-pointer ${getPostStatusClasses(post.status)}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: getPostStatusDot(post.status).replace('bg-', '') }} />
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            post.status === 'covered'
                              ? 'bg-emerald-100 text-emerald-700'
                              : post.status === 'transitioning'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {getPostStatusLabel(post.status)}
                        </span>
                      </div>
                      <h3 className="font-semibold text-gray-900 text-sm mb-1">{post.postName}</h3>
                      <p className="text-xs text-gray-500">
                        {post.assignedGuard ? (
                          <>
                            <span className="font-medium">{post.assignedGuard}</span>
                            <br />
                            {formatTime(post.clockInTime || '')}
                          </>
                        ) : (
                          <span className="text-red-400 italic">No guard assigned</span>
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Guards Currently On Site Table */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Guards Currently On Site</h2>
                  <p className="text-sm text-gray-500 mt-0.5">{onDutyGuards.length} guard(s) on duty</p>
                </div>
                <Button variant="ghost" size="sm">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Officer Name</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Assigned Post</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Clock-In Time</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Duration</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Scheduled Relief</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Risk Status</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {onDutyGuards.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-12 text-gray-400">
                          No guards currently on duty at this site.
                        </td>
                      </tr>
                    ) : (
                      onDutyGuards.map((guard) => (
                        <tr key={guard.id} className="hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                                {guard.avatarInitials}
                              </div>
                              <span className="font-medium text-gray-900">{guard.guardName}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-gray-700">{guard.assignedPost}</td>
                          <td className="py-3 px-4 text-gray-700">{formatTime(guard.clockInTime)}</td>
                          <td className="py-3 px-4 text-gray-700">{guard.duration}</td>
                          <td className="py-3 px-4 text-gray-700">{formatTime(guard.scheduledRelief)}</td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${getRiskBadge(guard.riskStatus)}`}>
                              {guard.riskStatus === 'high' ? 'High Risk' : 'Normal'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleClockOut(guard.id)}
                                className="text-xs text-red-600 hover:text-red-800 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
                              >
                                Clock Out
                              </button>
                              <button
                                onClick={() => {
                                  setOverrideGuardId(guard.id);
                                  setOverrideModalOpen(true);
                                }}
                                className="text-xs text-amber-600 hover:text-amber-800 font-medium px-2 py-1 rounded hover:bg-amber-50 transition-colors"
                              >
                                Override
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Operational Relief Chain */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-5">Operational Relief Chain</h2>
              <div className="space-y-0">
                {RELIEF_STEPS.map((step, idx) => {
                  const isCompleted = reliefStep > step.step;
                  const isActive = reliefStep === step.step - 1;
                  return (
                    <div key={step.step} className="flex gap-3 relative">
                      {idx < RELIEF_STEPS.length - 1 && (
                        <div
                          className={`absolute left-4 top-8 w-0.5 h-full ${
                            isCompleted ? 'bg-blue-600' : 'bg-gray-200'
                          }`}
                        />
                      )}
                      <div
                        className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors ${
                          isCompleted
                            ? 'bg-blue-600 text-white'
                            : isActive
                            ? 'bg-blue-100 text-blue-700 border-2 border-blue-400'
                            : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        {isCompleted ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          step.step
                        )}
                      </div>
                      <div className="pb-6 flex-1">
                        <h3
                          className={`text-sm font-semibold ${
                            isCompleted ? 'text-gray-500 line-through' : isActive ? 'text-gray-900' : 'text-gray-400'
                          }`}
                        >
                          {step.title}
                        </h3>
                        <p className="text-xs text-gray-400 mt-0.5">{step.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <Button
                className="w-full mt-4"
                onClick={handleProcessRelief}
                disabled={reliefStep >= RELIEF_STEPS.length}
              >
                {reliefStep >= RELIEF_STEPS.length ? 'Relief Complete' : 'Process Relief'}
              </Button>
              {reliefStep > 0 && reliefStep < RELIEF_STEPS.length && (
                <button
                  onClick={() => setReliefStep(0)}
                  className="w-full mt-2 text-xs text-gray-400 hover:text-gray-600 py-1"
                >
                  Reset
                </button>
              )}
            </Card>

            {/* Control Room Log */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Control Room Log</h2>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {reliefLog.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6">No log entries yet</p>
                ) : (
                  reliefLog.map((entry) => (
                    <div key={entry.id} className="border-l-2 border-gray-200 pl-3 py-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-400 font-mono">
                          {formatTimestamp(entry.timestamp)}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            entry.action.includes('Override')
                              ? 'bg-amber-100 text-amber-700'
                              : entry.action.includes('Clock-In')
                              ? 'bg-emerald-100 text-emerald-700'
                              : entry.action.includes('Clock-Out')
                              ? 'bg-red-100 text-red-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {entry.action}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-gray-700 mt-0.5">{entry.guardName}</p>
                      <p className="text-[11px] text-gray-400">{entry.details}</p>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>
        )}
      </div>

      {/* Clock-In Modal */}
      <Modal open={clockInModalOpen} onClose={() => setClockInModalOpen(false)} title="Clock In Guard">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Guard Name</label>
            <input
              type="text"
              value={clockInGuardName}
              onChange={(e) => setClockInGuardName(e.target.value)}
              placeholder="Enter guard name"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assign to Post</label>
            <select
              value={clockInPost}
              onChange={(e) => setClockInPost(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="">Select a post...</option>
              {posts
                .filter((p) => p.status !== 'covered')
                .map((post) => (
                  <option key={post.id} value={post.id}>
                    {post.postName} ({post.status === 'unfilled' ? 'Unfilled' : 'Transitioning'})
                  </option>
                ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setClockInModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleClockIn} disabled={!clockInGuardName || !clockInPost}>
              Confirm Clock-In
            </Button>
          </div>
        </div>
      </Modal>

      {/* Override Clock-Out Modal */}
      <Modal open={overrideModalOpen} onClose={() => setOverrideModalOpen(false)} title="Override Clock-Out">
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
            <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            This action requires authorized approval and will be logged.
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Guard</label>
            <select
              value={overrideGuardId}
              onChange={(e) => setOverrideGuardId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="">Select a guard...</option>
              {onDutyGuards.map((guard) => (
                <option key={guard.id} value={guard.id}>
                  {guard.guardName} - {guard.assignedPost}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Override</label>
            <textarea
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="Enter reason for override clock-out..."
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setOverrideModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleOverrideClockOut}
              disabled={!overrideGuardId || !overrideReason}
            >
              Confirm Override
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AttendancePage;
