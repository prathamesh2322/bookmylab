import { useEffect, useState } from 'react';
import { api } from '../api.js';
import useForm from '../hooks/useForm.js';
import { useNav } from '../context/NavContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Alert, FormField, PageHeader, Spinner, StatusBadge } from '../components/ui.jsx';
import { fmtDate, fmtTime, todayISO } from '../utils.js';

function validate(v) {
  const e = {};
  if (!v.equipmentId) e.equipmentId = 'Select equipment';
  if (!v.date) e.date = 'Pick a date';
  else if (v.date < todayISO()) e.date = 'Date cannot be in the past';
  if (!v.startTime) e.startTime = 'Select a start time';
  if (!v.endTime) e.endTime = 'Select an end time';
  if (v.startTime && v.endTime && v.endTime <= v.startTime) e.endTime = 'End time must be after start time';
  if (!v.purpose.trim()) e.purpose = 'Please enter the purpose';
  else if (v.purpose.trim().length < 3) e.purpose = 'Purpose is too short';
  return e;
}

export default function BookEquipment() {
  const { params, navigate } = useNav();
  const toast = useToast();
  const [equipment, setEquipment] = useState(null);
  const [slots, setSlots] = useState([]);
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState(null);

  const form = useForm(
    { equipmentId: params.equipmentId ? String(params.equipmentId) : '', date: todayISO(), startTime: '10:00', endTime: '12:00', purpose: '' },
    validate
  );

  useEffect(() => {
    api('/api/equipment').then((list) => setEquipment(list.filter((i) => i.status === 'AVAILABLE' || i.status === 'BOOKED')));
  }, []);

  // Show the busy slots for whichever equipment is selected.
  useEffect(() => {
    if (!form.values.equipmentId) { setSlots([]); return; }
    api(`/api/equipment/${form.values.equipmentId}/schedule`).then(setSlots).catch(() => setSlots([]));
  }, [form.values.equipmentId, confirmation]);

  const submit = form.handleSubmit(async (v) => {
    setBusy(true);
    setServerError('');
    try {
      const booking = await api('/api/bookings', {
        method: 'POST',
        body: { equipmentId: Number(v.equipmentId), date: v.date, startTime: v.startTime, endTime: v.endTime, purpose: v.purpose.trim() }
      });
      setConfirmation(booking);
      toast.success(`Booking ${booking.bookingCode} created`);
    } catch (err) {
      setServerError(err.message); // e.g. "Equipment unavailable: Arduino ... already booked from ..."
    } finally {
      setBusy(false);
    }
  });

  if (!equipment) return <Spinner />;

  if (confirmation) {
    return (
      <div className="success-card">
        <div className="success-icon">✅</div>
        <h1>Booking Successful</h1>
        <dl className="detail-list center">
          <div><dt>Booking ID</dt><dd>{confirmation.bookingCode}</dd></div>
          <div><dt>Equipment</dt><dd>{confirmation.equipmentName}</dd></div>
          <div><dt>Date</dt><dd>{fmtDate(confirmation.date)}</dd></div>
          <div><dt>Time</dt><dd>{fmtTime(confirmation.startTime)} – {fmtTime(confirmation.endTime)}</dd></div>
          <div><dt>Status</dt><dd><StatusBadge status={confirmation.status} /></dd></div>
        </dl>
        <p className="muted">The lab assistant will review your request shortly.</p>
        <div className="hero-actions">
          <button className="btn btn-primary" onClick={() => navigate('myBookings')}>View My Bookings</button>
          <button className="btn btn-ghost" onClick={() => { setConfirmation(null); form.reset({ ...form.values, purpose: '' }); }}>Book another</button>
        </div>
      </div>
    );
  }

  const bind = (name) => ({ id: name, name, value: form.values[name], onChange: form.handleChange, onBlur: form.handleBlur });
  const selectedSlots = slots.filter((s) => s.date === form.values.date);

  return (
    <div>
      <PageHeader title="Book Equipment" subtitle="Choose equipment, date and time. Overlapping bookings are blocked automatically." />
      <div className="two-col">
        <section className="panel">
          {serverError && <Alert>❌ {serverError}</Alert>}
          <form onSubmit={submit} noValidate>
            <FormField label="Equipment" name="equipmentId" error={form.errors.equipmentId} touched={form.touched.equipmentId}>
              <select {...bind('equipmentId')}>
                <option value="">— Select equipment —</option>
                {equipment.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.code})</option>)}
              </select>
            </FormField>
            <FormField label="Date" name="date" error={form.errors.date} touched={form.touched.date}>
              <input type="date" min={todayISO()} {...bind('date')} />
            </FormField>
            <div className="row-2">
              <FormField label="Start time" name="startTime" error={form.errors.startTime} touched={form.touched.startTime}>
                <input type="time" {...bind('startTime')} />
              </FormField>
              <FormField label="End time" name="endTime" error={form.errors.endTime} touched={form.touched.endTime}>
                <input type="time" {...bind('endTime')} />
              </FormField>
            </div>
            <FormField label="Purpose" name="purpose" error={form.errors.purpose} touched={form.touched.purpose}>
              <input type="text" placeholder="e.g. Mini Project" maxLength={200} {...bind('purpose')} />
            </FormField>
            <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Checking availability…' : 'Confirm Booking'}</button>
          </form>
        </section>

        <aside className="panel">
          <h2>Already reserved on {form.values.date ? fmtDate(form.values.date) : 'this day'}</h2>
          {!form.values.equipmentId && <p className="muted">Select equipment to see its schedule.</p>}
          {form.values.equipmentId && selectedSlots.length === 0 && <p className="empty-line">🎉 Nothing reserved — the whole day is free.</p>}
          {selectedSlots.length > 0 && (
            <ul className="slot-list">
              {selectedSlots.map((s, i) => (
                <li key={i}><span>🕒 {fmtTime(s.startTime)} – {fmtTime(s.endTime)}</span><StatusBadge status={s.status} /></li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}
