import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { useNav } from '../context/NavContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Alert, EmptyState, PageHeader, Spinner, StatusBadge } from '../components/ui.jsx';
import { fmtDate, fmtTime } from '../utils.js';

const FILTERS = ['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED'];

export default function MyBookings() {
  const { navigate } = useNav();
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('ALL');

  const load = useCallback(() => {
    api('/api/bookings').then(setRows).catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  const visible = useMemo(() => (rows || []).filter((b) => filter === 'ALL' || b.status === filter), [rows, filter]);

  const act = async (fn, okMessage) => {
    try { await fn(); toast.success(okMessage); load(); } catch (e) { toast.error(e.message); }
  };
  const cancel = (b) => window.confirm(`Cancel booking ${b.bookingCode}?`) &&
    act(() => api(`/api/bookings/${b.id}/cancel`, { method: 'PUT' }), `${b.bookingCode} cancelled`);
  const remove = (b) => window.confirm(`Delete booking ${b.bookingCode} permanently?`) &&
    act(() => api(`/api/bookings/${b.id}`, { method: 'DELETE' }), `${b.bookingCode} deleted`);

  return (
    <div>
      <PageHeader title="My Bookings" subtitle="Track the status of every request you have made.">
        <button className="btn btn-primary" onClick={() => navigate('book')}>＋ New Booking</button>
      </PageHeader>

      <div className="pill-row" role="tablist">
        {FILTERS.map((f) => (
          <button key={f} className={filter === f ? 'pill active' : 'pill'} onClick={() => setFilter(f)}>
            {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
            <span className="pill-count">{f === 'ALL' ? (rows || []).length : (rows || []).filter((b) => b.status === f).length}</span>
          </button>
        ))}
      </div>

      {error && <Alert>{error}</Alert>}
      {!rows && !error && <Spinner />}
      {rows && visible.length === 0 && (
        <EmptyState icon="📚" title="No bookings here" text="Reserve some equipment to see it listed.">
          <button className="btn btn-primary" onClick={() => navigate('equipment')}>Browse Equipment</button>
        </EmptyState>
      )}

      <ul className="booking-list">
        {visible.map((b) => (
          <li key={b.id} className="booking-card">
            <div className="booking-main">
              <p className="booking-code">{b.bookingCode}</p>
              <h3>{b.equipmentName}</h3>
              <p className="muted">📅 {fmtDate(b.date)} · 🕒 {fmtTime(b.startTime)} – {fmtTime(b.endTime)}</p>
              <p className="muted small">Purpose: {b.purpose}</p>
            </div>
            <div className="booking-side">
              <StatusBadge status={b.status} />
              <div className="row-actions">
                {(b.status === 'PENDING' || b.status === 'APPROVED') && <button className="btn btn-sm btn-danger-outline" onClick={() => cancel(b)}>Cancel</button>}
                {b.status !== 'APPROVED' && <button className="btn btn-sm btn-ghost" onClick={() => remove(b)}>Delete</button>}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
