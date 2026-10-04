import { useEffect } from 'react';

// Exp 3: small reusable components written with JSX and props.

export function StatusBadge({ status }) {
  return <span className={`badge badge-${String(status).toLowerCase()}`}>{status}</span>;
}

export function StatCard({ label, value, icon, tone = 'indigo', hint }) {
  return (
    <article className={`stat-card tone-${tone}`}>
      <div className="stat-icon" aria-hidden="true">{icon}</div>
      <div>
        <p className="stat-value">{value}</p>
        <p className="stat-label">{label}</p>
        {hint && <p className="stat-hint">{hint}</p>}
      </div>
    </article>
  );
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      <div className="page-actions">{children}</div>
    </header>
  );
}

export function FormField({ label, name, error, touched, children, hint }) {
  const showError = touched && error;
  return (
    <div className={`field ${showError ? 'has-error' : ''}`}>
      <label htmlFor={name}>{label}</label>
      {children}
      {hint && !showError && <small className="muted">{hint}</small>}
      {showError && <small className="error-text" role="alert">{error}</small>}
    </div>
  );
}

export function Spinner({ text = 'Loading…' }) {
  return (
    <div className="spinner-wrap" role="status">
      <div className="spinner" />
      <p className="muted">{text}</p>
    </div>
  );
}

export function EmptyState({ icon = '📭', title, text, children }) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      {text && <p className="muted">{text}</p>}
      {children}
    </div>
  );
}

export function Alert({ kind = 'error', children }) {
  return <div className={`alert alert-${kind}`} role="alert">{children}</div>;
}

export function Modal({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section className="modal" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">×</button>
        </header>
        {children}
      </section>
    </div>
  );
}

export function categoryIcon(category = '') {
  const c = category.toLowerCase();
  if (c.includes('micro')) return '🔌';
  if (c.includes('iot')) return '📡';
  if (c.includes('sensor')) return '📟';
  if (c.includes('robot')) return '🤖';
  if (c.includes('electronic')) return '🔬';
  return '🧰';
}
