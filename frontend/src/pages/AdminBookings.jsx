import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { useToast } from '../context/ToastContext.jsx';
import { Alert, EmptyState, PageHeader, Spinner, StatusBadge } from '../components/ui.jsx';
import { fmtDate, fmtTime } from '../utils.js';

const FILTERS = ['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED'];

export default function AdminBookings() {
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('PENDING');
  const [search, setSearch] = useState('');

  const load = useCallback(() => {
    api('/api/bookings').then(setRows).catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (rows || [])
      .filter((b) => filter === 'ALL' || b.status === filter)
      .filter((b) => !q || b.studentName.toLowerCase().includes(q) || b.equipmentName.toLowerCase().includes(q) || b.bookingCode.toLowerCase().includes(q));
  }, [rows, filter, search]);

  const setStatus = async (b, status, verb) => {
    try {
      await api(`/api/bookings/${b.id}/status`, { method: 'PUT', body: { status } });
      toast.success(`${b.bookingCode} ${verb}`);
      load();
    } catch (e) { toast.error(e.message); }
  };

  const remove = async (b) => {
    if (!window.confirm(`Delete booking ${b.bookingCode}?`)) return;
    try { await api(`/api/bookings/${b.id}`, { method: 'DELETE' }); toast.success(`${b.bookingCode} deleted`); load(); }
    catch (e) { toast.error(e.message); }
  };

  return (
    <div>
      <PageHeader title="Booking Requests" subtitle="Approve or reject student requests and close finished bookings." />

      <div className="pill-row">
        {FILTERS.map((f) => (
          <button key={f} className={filter === f ? 'pill active' : 'pill'} onClick={() => setFilter(f)}>
            {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
            <span className="pill-count">{f === 'ALL' ? (rows || []).length : (rows || []).filter((b) => b.status === f).length}</span>
          </button>
        ))}
      </div>
      <div className="toolbar">
        <input type="search" placeholder="🔍  Search student, equipment or ID…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search bookings" />
      </div>

      {error && <Alert>{error}</Alert>}
      {!rows && !error && <Spinner />}
      {rows && visible.length === 0 && <EmptyState icon="🎯" title="No bookings in this view" text="Try another status filter." />}

      {visible.length > 0 && (
        <div className="table-wrap panel flush">
          <table className="table">
            <thead><tr><th>ID</th><th>Student</th><th>Equipment</th><th>Date & time</th><th>Purpose</th><th>Status</th><th aria-label="Actions" /></tr></thead>
            <tbody>
              {visible.map((b) => (
                <tr key={b.id}>
                  <td><strong>{b.bookingCode}</strong></td>
                  <td>{b.studentName}</td>
                  <td>{b.equipmentName}</td>
                  <td>{fmtDate(b.date)}<br /><small className="muted">{fmtTime(b.startTime)} – {fmtTime(b.endTime)}</small></td>
                  <td>{b.purpose}</td>
                  <td><StatusBadge status={b.status} /></td>
                  <td className="nowrap">
                    {b.status === 'PENDING' && (<>
                      <button className="btn btn-sm btn-success" onClick={() => setStatus(b, 'APPROVED', 'approved')}>Approve</button>{' '}
                      <button className="btn btn-sm btn-danger-outline" onClick={() => setStatus(b, 'REJECTED', 'rejected')}>Reject</button>
                    </>)}
                    {b.status === 'APPROVED' && (<>
                      <button className="btn btn-sm btn-outline" onClick={() => setStatus(b, 'COMPLETED', 'marked completed')}>Mark completed</button>{' '}
                      <button className="btn btn-sm btn-danger-outline" onClick={() => setStatus(b, 'CANCELLED', 'cancelled')}>Cancel</button>
                    </>)}
                    {b.status !== 'PENDING' && b.status !== 'APPROVED' && <button className="btn btn-sm btn-ghost" onClick={() => remove(b)}>Delete</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
