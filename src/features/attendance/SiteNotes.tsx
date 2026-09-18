import { useState, useEffect, useCallback } from 'react';
import api from '../../lib/api';

interface Site {
  id: string;
  siteName: string;
}

interface SiteNoteRecord {
  _id: string;
  siteId: string;
  date: string;
  noteText: string;
  recordedById: { name?: string; email?: string } | string;
  createdAt: string;
}

export default function SiteNotes() {
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<SiteNoteRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');
  const [newNoteDate, setNewNoteDate] = useState(new Date().toISOString().split('T')[0]);
  const [newNoteSiteId, setNewNoteSiteId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get('/sites').then((res) => {
      const all = (res.data.data || []).map((s: any) => ({ id: s._id || s.id, siteName: s.siteName }));
      setSites(all);
      if (all.length > 0 && !selectedSiteId) {
        setSelectedSiteId(all[0].id);
      }
    }).catch(() => {});
  }, []);

  const loadNotes = useCallback(async () => {
    if (!selectedSiteId) return;
    setLoading(true);
    try {
      const res = await api.get(`/site-notes?siteId=${selectedSiteId}&date=${selectedDate}`);
      setNotes(res.data.data || []);
    } catch (e) {
      console.error('Failed to load site notes:', e);
    } finally {
      setLoading(false);
    }
  }, [selectedSiteId, selectedDate]);

  useEffect(() => { loadNotes(); }, [loadNotes]);

  const openAddModal = () => {
    setNewNoteSiteId(selectedSiteId);
    setNewNoteDate(selectedDate);
    setNewNoteText('');
    setAddModalOpen(true);
  };

  const handleAddNote = async () => {
    if (!newNoteText.trim() || !newNoteSiteId || !newNoteDate) return;
    setSubmitting(true);
    try {
      await api.post('/site-notes', {
        siteId: newNoteSiteId,
        date: newNoteDate,
        noteText: newNoteText.trim(),
      });
      setAddModalOpen(false);
      setNewNoteText('');
      await loadNotes();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to add note');
    } finally {
      setSubmitting(false);
    }
  };

  const formatRecorder = (recordedById: SiteNoteRecord['recordedById']) => {
    if (!recordedById) return 'Unknown';
    if (typeof recordedById === 'string') return recordedById;
    return recordedById.name || recordedById.email || 'Unknown';
  };

  return (
    <div className="space-y-5">
      {/* Header + Controls */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Site Notes</h2>
            <p className="text-sm text-gray-500 mt-0.5">Record observations and incidents for each site</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
              className="text-sm border border-gray-200 rounded-xl px-4 py-2 bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
            >
              {sites.map((s) => (
                <option key={s.id} value={s.id}>{s.siteName}</option>
              ))}
            </select>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-sm border border-gray-200 rounded-xl px-4 py-2 bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
            />
            <button onClick={openAddModal} className="h-10 px-4 flex items-center gap-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Note
            </button>
          </div>
        </div>
      </div>

      {/* Notes List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto" />
          </div>
        ) : notes.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-500">No notes for this site on {selectedDate}.</p>
            <p className="text-xs text-gray-400 mt-1">Click "Add Note" to record something.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {notes.map((note) => (
              <div key={note._id} className="px-5 py-4 hover:bg-gray-50/50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.noteText}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[11px] text-gray-400 font-medium">{formatRecorder(note.recordedById)}</p>
                    <p className="text-[11px] text-gray-400 font-mono">
                      {new Date(note.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Note Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Add Site Note</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Site</label>
                <select
                  value={newNoteSiteId}
                  onChange={(e) => setNewNoteSiteId(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                >
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>{s.siteName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={newNoteDate}
                  onChange={(e) => setNewNoteDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Note *</label>
              <textarea
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                placeholder="What happened at the site?"
                rows={4}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none transition-all"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setAddModalOpen(false)} className="h-10 px-5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={handleAddNote} disabled={!newNoteText.trim() || submitting}
                className="h-10 px-5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-lg shadow-indigo-200">
                {submitting ? 'Saving...' : 'Save Note'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}