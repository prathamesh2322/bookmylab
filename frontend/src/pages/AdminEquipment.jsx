import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import useForm from '../hooks/useForm.js';
import { useToast } from '../context/ToastContext.jsx';
import { Alert, EmptyState, FormField, Modal, PageHeader, Spinner, StatusBadge } from '../components/ui.jsx';
import { EQUIPMENT_STATUS_OPTIONS } from '../utils.js';

const EMPTY = { name: '', category: '', quantity: '1', location: '', condition: 'Good', description: '', status: 'AVAILABLE' };

function validate(v) {
  const e = {};
  if (!v.name.trim()) e.name = 'Name is required';
  if (!v.category.trim()) e.category = 'Category is required';
  const q = Number(v.quantity);
  if (v.quantity === '' || !Number.isInteger(q) || q < 1) e.quantity = 'Quantity must be a whole number ≥ 1';
  if (!v.location.trim()) e.location = 'Location is required';
  return e;
}

function EquipmentForm({ initial, onSaved, onClose }) {
  const toast = useToast();
  const [serverError, setServerError] = useState('');
  const editing = Boolean(initial?.id);
  const form = useForm(
    initial ? {
      name: initial.name, category: initial.category, quantity: String(initial.quantity), location: initial.location,
      condition: initial.condition, description: initial.description || '',
      status: EQUIPMENT_STATUS_OPTIONS.includes(initial.status) ? initial.status : 'AVAILABLE'
    } : EMPTY,
    validate
  );

  const submit = form.handleSubmit(async (v) => {
    setServerError('');
    const body = { ...v, quantity: Number(v.quantity) };
    try {
      if (editing) await api(`/api/equipment/${initial.id}`, { method: 'PUT', body });
      else await api('/api/equipment', { method: 'POST', body });
      toast.success(editing ? 'Equipment updated' : 'Equipment added');
      onSaved();
    } catch (err) {
      setServerError(err.message);
    }
  });

  const bind = (name) => ({ id: name, name, value: form.values[name], onChange: form.handleChange, onBlur: form.handleBlur });

  return (
    <Modal title={editing ? `Edit ${initial.name}` : 'Add Equipment'} onClose={onClose}>
      {serverError && <Alert>{serverError}</Alert>}
      <form onSubmit={submit} noValidate>
        <FormField label="Name" name="name" error={form.errors.name} touched={form.touched.name}>
          <input type="text" placeholder="Arduino Uno" {...bind('name')} />
        </FormField>
        <div className="row-2">
          <FormField label="Category" name="category" error={form.errors.category} touched={form.touched.category}>
            <input type="text" list="category-options" placeholder="Electronics" {...bind('category')} />
            <datalist id="category-options">
              {['Microcontroller', 'IoT', 'Electronics', 'Sensors', 'Robotics'].map((c) => <option key={c} value={c} />)}
            </datalist>
          </FormField>
          <FormField label="Quantity" name="quantity" error={form.errors.quantity} touched={form.touched.quantity}>
            <input type="number" min="1" {...bind('quantity')} />
          </FormField>
        </div>
        <div className="row-2">
          <FormField label="Location" name="location" error={form.errors.location} touched={form.touched.location}>
            <input type="text" placeholder="AIML Lab" {...bind('location')} />
          </FormField>
          <FormField label="Condition" name="condition" error={form.errors.condition} touched={form.touched.condition}>
            <select {...bind('condition')}>
              {['Good', 'Fair', 'Needs calibration', 'Poor'].map((c) => <option key={c}>{c}</option>)}
            </select>
          </FormField>
        </div>
        <FormField label="Status" name="status" hint="“Booked” is set automatically when every unit is reserved.">
          <select {...bind('status')}>
            {EQUIPMENT_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
          </select>
        </FormField>
        <FormField label="Description" name="description">
          <textarea rows="3" {...bind('description')} />
        </FormField>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary">{editing ? 'Save changes' : 'Add equipment'}</button>
        </div>
      </form>
    </Modal>
  );
}

export default function AdminEquipment() {
  const toast = useToast();
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [editor, setEditor] = useState(null); // null | {} (new) | equipment (edit)
  const [search, setSearch] = useState('');

  const load = useCallback(() => {
    api('/api/equipment').then(setItems).catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  const remove = async (i) => {
    if (!window.confirm(`Delete ${i.name}? All its bookings and maintenance records will be removed too.`)) return;
    try { await api(`/api/equipment/${i.id}`, { method: 'DELETE' }); toast.success(`${i.name} deleted`); load(); }
    catch (e) { toast.error(e.message); }
  };

  const quickStatus = async (i, status) => {
    try {
      await api(`/api/equipment/${i.id}`, {
        method: 'PUT',
        body: { name: i.name, category: i.category, quantity: i.quantity, location: i.location, condition: i.condition, description: i.description, status }
      });
      toast.success(`${i.name} marked ${status.toLowerCase()}`);
      load();
    } catch (e) { toast.error(e.message); }
  };

  const q = search.trim().toLowerCase();
  const visible = (items || []).filter((i) => !q || i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q) || i.category.toLowerCase().includes(q));

  return (
    <div>
      <PageHeader title="Manage Equipment" subtitle="Create, read, update and delete laboratory equipment.">
        <button className="btn btn-primary" onClick={() => setEditor({})}>＋ Add Equipment</button>
      </PageHeader>

      <div className="toolbar">
        <input type="search" placeholder="🔍  Search equipment…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search equipment" />
      </div>

      {error && <Alert>{error}</Alert>}
      {!items && !error && <Spinner />}
      {items && visible.length === 0 && <EmptyState title="No equipment found" />}

      {visible.length > 0 && (
        <div className="table-wrap panel flush">
          <table className="table">
            <thead>
              <tr><th>ID</th><th>Name</th><th>Category</th><th>Qty</th><th>Free now</th><th>Location</th><th>Status</th><th>Set status</th><th aria-label="Actions" /></tr>
            </thead>
            <tbody>
              {visible.map((i) => (
                <tr key={i.id}>
                  <td><strong>{i.code}</strong></td>
                  <td>{i.name}<br /><small className="muted">{i.condition}</small></td>
                  <td>{i.category}</td>
                  <td>{i.quantity}</td>
                  <td>{i.availableQuantity}</td>
                  <td>{i.location}</td>
                  <td><StatusBadge status={i.status} /></td>
                  <td>
                    <select className="select-sm" value={EQUIPMENT_STATUS_OPTIONS.includes(i.status) ? i.status : 'AVAILABLE'} onChange={(e) => quickStatus(i, e.target.value)} aria-label={`Status of ${i.name}`}>
                      {EQUIPMENT_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
                    </select>
                  </td>
                  <td className="nowrap">
                    <button className="btn btn-sm btn-outline" onClick={() => setEditor(i)}>Edit</button>{' '}
                    <button className="btn btn-sm btn-danger-outline" onClick={() => remove(i)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editor && <EquipmentForm initial={editor.id ? editor : null} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); load(); }} />}
    </div>
  );
}
