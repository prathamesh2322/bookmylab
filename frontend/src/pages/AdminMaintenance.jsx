import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import useForm from '../hooks/useForm.js';
import { useToast } from '../context/ToastContext.jsx';
import { Alert, EmptyState, FormField, PageHeader, Spinner, StatusBadge } from '../components/ui.jsx';
import { fmtDate, todayISO } from '../utils.js';

function validate(v) {
  const e = {};
  if (!v.equipmentId) e.equipmentId = 'Select equipment';
  if (!v.reason.trim()) e.reason = 'Reason is required';
  if (!v.startDate) e.startDate = 'Start date is required';
  if (v.endDate && v.startDate && v.endDate < v.startDate) e.endDate = 'End date cannot be before start date';
  return e;
}

export default function AdminMaintenance() {
  const toast = useToast();
  const [records, setRecords] = useState(null);
  const [equipment, setEquipment] = useState([]);
  const [error, setError] = useState('');
  const [serverError, setServerError] = useState('');
  const form = useForm({ equipmentId: '', reason: '', startDate: todayISO(), endDate: '' }, validate);

  const load = useCallback(() => {
    Promise.all([api('/api/maintenance'), api('/api/equipment')])
      .then(([m, e]) => { setRecords(m); setEquipment(e); })
      .catch((err) => setError(err.message));
  }, []);
  useEffect(load, [load]);

  const submit = form.handleSubmit(async (v) => {
    setServerError('');
    try {
      await api('/api/maintenance', {
        method: 'POST',
        body: { equipmentId: Number(v.equipmentId), reason: v.reason.trim(), startDate: v.startDate, endDate: v.endDate || null }
      });
      toast.success('Maintenance logged. Equipment is now blocked from booking.');
      form.reset();
      load();
    } catch (e) { setServerError(e.message); }
  });

  const complete = async (m) => {
    try { await api(`/api/maintenance/${m.id}/complete`, { method: 'PUT' }); toast.success(`${m.equipmentName} is back in service`); load(); }
    catch (e) { toast.error(e.message); }
  };

  const remove = async (m) => {
    if (!window.confirm('Delete this maintenance record?')) return;
    try { await api(`/api/maintenance/${m.id}`, { method: 'DELETE' }); load(); } catch (e) { toast.error(e.message); }
  };

  const bind = (name) => ({ id: name, name, value: form.values[name], onChange: form.handleChange, onBlur: form.handleBlur });

  return (
    <div>
      <PageHeader title="Maintenance" subtitle="Log repairs and calibration. Equipment under maintenance cannot be booked." />
      {error && <Alert>{error}</Alert>}
      <div className="two-col wide-right">
        <section className="panel">
          <h2>Log maintenance</h2>
          {serverError && <Alert>{serverError}</Alert>}
          <form onSubmit={submit} noValidate>
            <FormField label="Equipment" name="equipmentId" error={form.errors.equipmentId} touched={form.touched.equipmentId}>
              <select {...bind('equipmentId')}>
                <option value="">— Select equipment —</option>
                {equipment.map((e) => <option key={e.id} value={e.id}>{e.name} ({e.code})</option>)}
              </select>
            </FormField>
            <FormField label="Reason" name="reason" error={form.errors.reason} touched={form.touched.reason}>
              <input type="text" placeholder="e.g. Probe calibration" {...bind('reason')} />
            </FormField>
            <div className="row-2">
              <FormField label="Start date" name="startDate" error={form.errors.startDate} touched={form.touched.startDate}>
                <input type="date" {...bind('startDate')} />
              </FormField>
              <FormField label="Expected end" name="endDate" error={form.errors.endDate} touched={form.touched.endDate}>
                <input type="date" {...bind('endDate')} />
              </FormField>
            </div>
            <button className="btn btn-primary btn-block">Log maintenance</button>
          </form>
        </section>

        <section className="panel">
          <h2>Maintenance history</h2>
          {!records && !error && <Spinner />}
          {records && records.length === 0 && <EmptyState icon="🛠️" title="No maintenance records" />}
          {records && records.length > 0 && (
            <div className="table-wrap">
              <table className="table compact">
                <thead><tr><th>Equipment</th><th>Reason</th><th>Period</th><th>Status</th><th aria-label="Actions" /></tr></thead>
                <tbody>
                  {records.map((m) => (
                    <tr key={m.id}>
                      <td><strong>{m.equipmentName}</strong></td>
                      <td>{m.reason}</td>
                      <td>{fmtDate(m.startDate)}{m.endDate ? ` → ${fmtDate(m.endDate)}` : ''}</td>
                      <td><StatusBadge status={m.status} /></td>
                      <td className="nowrap">
                        {m.status === 'ONGOING' && <button className="btn btn-sm btn-success" onClick={() => complete(m)}>Mark done</button>}{' '}
                        <button className="btn btn-sm btn-ghost" onClick={() => remove(m)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
