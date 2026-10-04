import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { useNav } from '../context/NavContext.jsx';
import { Alert, EmptyState, PageHeader, Spinner, StatusBadge, categoryIcon } from '../components/ui.jsx';

export default function EquipmentList() {
  const { navigate } = useNav();
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');
  const [status, setStatus] = useState('ALL');

  useEffect(() => {
    api('/api/equipment').then(setItems).catch((e) => setError(e.message));
  }, []);

  const categories = useMemo(() => (items ? [...new Set(items.map((i) => i.category))].sort() : []), [items]);

  const visible = useMemo(() => {
    if (!items) return [];
    const q = search.trim().toLowerCase();
    return items
      .filter((i) => category === 'ALL' || i.category === category)
      .filter((i) => status === 'ALL' || i.status === status)
      .filter((i) => !q || i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q));
  }, [items, search, category, status]);

  return (
    <div>
      <PageHeader title="Laboratory Equipment" subtitle="Browse everything available in the lab and check live availability." />

      <form className="toolbar" onSubmit={(e) => e.preventDefault()} role="search">
        <input type="search" placeholder="🔍  Search by name or code…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search equipment" />
        <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category">
          <option value="ALL">All categories</option>
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
          <option value="ALL">All statuses</option>
          <option value="AVAILABLE">Available</option>
          <option value="BOOKED">Booked</option>
          <option value="MAINTENANCE">Maintenance</option>
          <option value="UNAVAILABLE">Unavailable</option>
        </select>
      </form>

      {error && <Alert>{error}</Alert>}
      {!items && !error && <Spinner />}
      {items && visible.length === 0 && <EmptyState icon="🔎" title="No equipment found" text="Try a different search or filter." />}

      <ul className="card-grid">
        {visible.map((i) => (
          <li key={i.id} className="eq-card">
            <div className="eq-top">
              <span className="eq-icon">{categoryIcon(i.category)}</span>
              <StatusBadge status={i.status} />
            </div>
            <h3>{i.name}</h3>
            <p className="muted">{i.category} · {i.location}</p>
            <div className="eq-meter" title={`${i.availableQuantity} of ${i.quantity} free right now`}>
              <div style={{ width: `${(i.availableQuantity / i.quantity) * 100}%` }} />
            </div>
            <p className="eq-count"><strong>{i.availableQuantity}</strong> of {i.quantity} free now</p>
            <button className="btn btn-outline btn-block" onClick={() => navigate('equipmentDetails', { id: i.id })}>View Details</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
