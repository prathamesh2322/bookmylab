import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useNav } from '../context/NavContext.jsx';
import { Alert, EmptyState, PageHeader, Spinner, StatCard, StatusBadge } from '../components/ui.jsx';
import { fmtDate, fmtTime } from '../utils.js';

export function StudentDashboard() {
  const { user } = useAuth();
  const { navigate } = useNav();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/api/dashboard/student').then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <Alert>{error}</Alert>;
  if (!data) return <Spinner />;

  return (
    <div>
      <PageHeader title={`Hi ${user.name.split(' ')[0]} 👋`} subtitle="Here is what is happening with your lab bookings.">
        <button className="btn btn-primary" onClick={() => navigate('book')}>＋ Book Equipment</button>
      </PageHeader>

      <section className="stat-grid" aria-label="Your booking summary">
        <StatCard label="My bookings" value={data.totalBookings} icon="📚" tone="indigo" />
        <StatCard label="Pending" value={data.pendingBookings} icon="⏳" tone="amber" />
        <StatCard label="Approved" value={data.approvedBookings} icon="✅" tone="green" />
        <StatCard label="Equipment available" value={data.availableEquipment} icon="🔬" tone="teal" />
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Upcoming bookings</h2>
          <button className="link-btn" onClick={() => navigate('myBookings')}>See all →</button>
        </div>
        {data.upcoming.length === 0 ? (
          <EmptyState icon="🗓️" title="Nothing scheduled" text="Book equipment for your next project.">
            <button className="btn btn-primary" onClick={() => navigate('equipment')}>Browse Equipment</button>
          </EmptyState>
        ) : (
          <ul className="timeline">
            {data.upcoming.map((b) => (
              <li key={b.id}>
                <div className="timeline-date"><strong>{fmtDate(b.date).slice(0, 6)}</strong><span>{fmtTime(b.startTime)}</span></div>
                <div className="timeline-body">
                  <h3>{b.equipmentName}</h3>
                  <p className="muted small">{b.bookingCode} · until {fmtTime(b.endTime)} · {b.purpose}</p>
                </div>
                <StatusBadge status={b.status} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function BarRow({ label, value, max, tone }) {
  return (
    <li className="bar-row">
      <span className="bar-label">{label}</span>
      <div className="bar-track"><div className={`bar-fill tone-${tone}`} style={{ width: `${max ? (value / max) * 100 : 0}%` }} /></div>
      <span className="bar-value">{value}</span>
    </li>
  );
}

export function AdminDashboard() {
  const { navigate } = useNav();
  const [d, setD] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/api/dashboard/admin').then(setD).catch((e) => setError(e.message));
  }, []);

  if (error) return <Alert>{error}</Alert>;
  if (!d) return <Spinner />;

  const bookingBars = [
    ['Pending', d.pendingBookings, 'amber'],
    ['Approved', d.approvedBookings, 'green'],
    ['Completed', d.completedBookings, 'indigo'],
    ['Rejected', d.rejectedBookings, 'red'],
    ['Cancelled', d.cancelledBookings, 'gray']
  ];
  const maxBooking = Math.max(...bookingBars.map((b) => b[1]), 1);
  const maxTop = Math.max(...d.topEquipment.map((t) => t.count), 1);

  return (
    <div>
      <PageHeader title="Admin Dashboard" subtitle="Live overview of equipment and booking activity.">
        <button className="btn btn-ghost" onClick={() => navigate('manageEquipment')}>Manage Equipment</button>
        <button className="btn btn-primary" onClick={() => navigate('manageBookings')}>
          Review Requests{d.pendingBookings > 0 && <span className="count-dot">{d.pendingBookings}</span>}
        </button>
      </PageHeader>

      <h2 className="group-title">Equipment</h2>
      <section className="stat-grid">
        <StatCard label="Total equipment" value={d.totalEquipment} icon="🧰" tone="indigo" />
        <StatCard label="Available" value={d.availableEquipment} icon="🟢" tone="green" />
        <StatCard label="Booked now" value={d.bookedEquipment} icon="📅" tone="amber" />
        <StatCard label="Maintenance" value={d.maintenanceEquipment} icon="🛠️" tone="red" />
      </section>

      <h2 className="group-title">Bookings</h2>
      <section className="stat-grid">
        <StatCard label="Total bookings" value={d.totalBookings} icon="📚" tone="indigo" />
        <StatCard label="Pending" value={d.pendingBookings} icon="⏳" tone="amber" />
        <StatCard label="Approved" value={d.approvedBookings} icon="✅" tone="green" />
        <StatCard label="Completed" value={d.completedBookings} icon="🏁" tone="teal" />
      </section>

      <div className="two-col">
        <section className="panel">
          <h2>Bookings by status</h2>
          <ul className="bars">{bookingBars.map(([l, v, t]) => <BarRow key={l} label={l} value={v} max={maxBooking} tone={t} />)}</ul>
          <p className="muted small">👩‍🎓 {d.totalStudents} students registered · ⏱️ {d.totalBookedHours} hours booked</p>
        </section>
        <section className="panel">
          <h2>Most booked equipment</h2>
          {d.topEquipment.length === 0 ? <p className="muted">No bookings yet.</p> : (
            <ul className="bars">{d.topEquipment.map((t) => <BarRow key={t.name} label={t.name} value={t.count} max={maxTop} tone="indigo" />)}</ul>
          )}
        </section>
      </div>

      <section className="panel">
        <h2>Recent booking requests</h2>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>ID</th><th>Student</th><th>Equipment</th><th>When</th><th>Status</th></tr></thead>
            <tbody>
              {d.recentBookings.map((b) => (
                <tr key={b.id}>
                  <td><strong>{b.bookingCode}</strong></td>
                  <td>{b.studentName}</td>
                  <td>{b.equipmentName}</td>
                  <td>{fmtDate(b.date)} · {fmtTime(b.startTime)}</td>
                  <td><StatusBadge status={b.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
