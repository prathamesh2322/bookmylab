import { useNav } from '../context/NavContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function Home() {
  const { navigate } = useNav();
  const { user } = useAuth();

  const steps = [
    ['🔍', 'Browse', 'See every lab item and whether it is free right now.'],
    ['📅', 'Pick a slot', 'Choose a date and time range for your project work.'],
    ['✅', 'Get approved', 'The lab assistant approves and you track it live.']
  ];

  return (
    <div className="home">
      <section className="hero">
        <p className="eyebrow">🔬 Laboratory Equipment Reservation</p>
        <h1>Book lab equipment in seconds, <span>never double-booked.</span></h1>
        <p className="hero-text">
          BookMyLab replaces registers, WhatsApp groups and Excel sheets with one place to check availability,
          reserve Arduino, Raspberry Pi, sensors and more, and track every booking.
        </p>
        <div className="hero-actions">
          <button className="btn btn-primary btn-lg" onClick={() => navigate('equipment')}>Browse Equipment</button>
          {!user && <button className="btn btn-ghost btn-lg" onClick={() => navigate('login')}>Login / Register</button>}
          {user && <button className="btn btn-ghost btn-lg" onClick={() => navigate('dashboard')}>Go to Dashboard</button>}
        </div>
      </section>

      <section aria-labelledby="how">
        <h2 id="how" className="section-title">How it works</h2>
        <ol className="steps">
          {steps.map(([icon, title, text], i) => (
            <li key={title} className="step">
              <span className="step-no">{i + 1}</span>
              <span className="step-icon">{icon}</span>
              <h3>{title}</h3>
              <p className="muted">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="feature-band">
        <h2 className="section-title">Why labs love it</h2>
        <ul className="features">
          <li>⭐ <strong>No double booking</strong> — overlapping time slots are blocked automatically.</li>
          <li>📚 <strong>Complete history</strong> — every booking, status and decision is stored.</li>
          <li>🛠️ <strong>Maintenance aware</strong> — equipment under repair cannot be reserved.</li>
          <li>🔐 <strong>Secure login</strong> — separate Student and Admin access with JWT.</li>
        </ul>
      </section>
    </div>
  );
}
