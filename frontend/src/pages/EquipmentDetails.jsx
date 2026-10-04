import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useNav } from '../context/NavContext.jsx';
import { Alert, PageHeader, Spinner, StatusBadge, categoryIcon } from '../components/ui.jsx';
import { fmtDate, fmtTime } from '../utils.js';

export default function EquipmentDetails() {
  const { params, navigate } = useNav();
  const { user, isStudent } = useAuth();
  const [item, setItem] = useState(null);
  const [slots, setSlots] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api(`/api/equipment/${params.id}`), api(`/api/equipment/${params.id}/schedule`)])
      .then(([eq, schedule]) => { setItem(eq); setSlots(schedule); })
      .catch((e) => setError(e.message));
  }, [params.id]);

  if (error) return <Alert>{error}</Alert>;
  if (!item) return <Spinner />;

  const bookable = item.status === 'AVAILABLE' || item.status === 'BOOKED';

  return (
    <div>
      <button className="link-btn" onClick={() => navigate('equipment')}>← Back to equipment</button>
      <PageHeader title={item.name} subtitle={`Equipment ID: ${item.code}`}>
        <StatusBadge status={item.status} />
      </PageHeader>

      <div className="two-col">
        <section className="panel">
          <div className="detail-hero">{categoryIcon(item.category)}</div>
          <dl className="detail-list">
            <div><dt>Equipment ID</dt><dd>{item.code}</dd></div>
            <div><dt>Category</dt><dd>{item.category}</dd></div>
            <div><dt>Quantity</dt><dd>{item.quantity}</dd></div>
            <div><dt>Available now</dt><dd>{item.availableQuantity}</dd></div>
            <div><dt>Condition</dt><dd>{item.condition}</dd></div>
            <div><dt>Location</dt><dd>{item.location}</dd></div>
          </dl>
          {item.description && <p className="muted">{item.description}</p>}

          {isStudent && (
            <button className="btn btn-primary btn-block" disabled={!bookable} onClick={() => navigate('book', { equipmentId: item.id })}>
              {bookable ? 'Book Equipment' : `Cannot book (${item.status.toLowerCase()})`}
            </button>
          )}
          {!user && <button className="btn btn-primary btn-block" onClick={() => navigate('login')}>Login to book</button>}
        </section>

        <section className="panel">
          <h2>Upcoming reservations</h2>
          <p className="muted">Time slots that already use this equipment.</p>
          {slots.length === 0 ? (
            <p className="empty-line">🎉 No reservations yet — every slot is free.</p>
          ) : (
            <table className="table compact">
              <thead><tr><th>Date</th><th>Time</th><th>Status</th></tr></thead>
              <tbody>
                {slots.map((s, i) => (
                  <tr key={i}>
                    <td>{fmtDate(s.date)}</td>
                    <td>{fmtTime(s.startTime)} – {fmtTime(s.endTime)}</td>
                    <td><StatusBadge status={s.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {item.quantity > 1 && <p className="muted small">This lab has {item.quantity} units, so a slot is only blocked when all units are reserved.</p>}
        </section>
      </div>
    </div>
  );
}
