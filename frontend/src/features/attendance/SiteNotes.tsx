import { useState, useEffect, useCallback } from 'react';
import api from '../../lib/api';
import { Card, Button, Modal, LoadingSpinner } from '../../components/ui';

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
      const all = (res.data.data || []).map((s: any) => ({
        id: s._id || s.id,
        siteName: s.siteName,
      }));
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
    <div className="space-y-4">
      {/* Header + Controls */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">Site Notes</h2>
        <div className="flex items-center gap-3">
          <select
            value={selectedSiteId}
            onChange={(e) => setSelectedSiteId(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          >
            {sites.map((s) => (
              <option key={s.id} value={s.id}>{s.siteName}</option>
            ))}
          </select>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          />
          <Button size="sm" onClick={openAddModal}>
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Note
          </Button>
        </div>
      </div>

      {/* Notes List */}
      <Card padding={false} className="overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <LoadingSpinner text="Loading notes..." />
          </div>
        ) : notes.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <svg className="w-10 h-10 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm">No notes for this site on {selectedDate}.</p>
            <p className="text-xs text-gray-300 mt-1">Click "Add Note" to record something.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notes.map((note) => (
              <div key={note._id} className="px-5 py-4 hover:bg-gray-50/50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap flex-1">{note.noteText}</p>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[11px] text-gray-400">{formatRecorder(note.recordedById)}</p>
                    <p className="text-[11px] text-gray-400">
                      {new Date(note.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Add Note Modal */}
      {addModalOpen && (
        <Modal open={addModalOpen} onClose={() => setAddModalOpen(false)} title="Add Site Note">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Site</label>
                <select
                  value={newNoteSiteId}
                  onChange={(e) => setNewNoteSiteId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
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
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
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
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setAddModalOpen(false)}>Cancel</Button>
              <Button onClick={handleAddNote} disabled={!newNoteText.trim() || submitting}>
                {submitting ? 'Saving...' : 'Save Note'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
