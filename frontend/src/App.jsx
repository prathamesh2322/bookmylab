import { useEffect, useState } from 'react';
import { useAuth } from './context/AuthContext.jsx';
import { useNav } from './context/NavContext.jsx';
import Home from './pages/Home.jsx';
import AuthPage from './pages/AuthPage.jsx';
import EquipmentList from './pages/EquipmentList.jsx';
import EquipmentDetails from './pages/EquipmentDetails.jsx';
import BookEquipment from './pages/BookEquipment.jsx';
import MyBookings from './pages/MyBookings.jsx';
import { AdminDashboard, StudentDashboard } from './pages/Dashboards.jsx';
import AdminEquipment from './pages/AdminEquipment.jsx';
import AdminBookings from './pages/AdminBookings.jsx';
import AdminMaintenance from './pages/AdminMaintenance.jsx';
import KotlinDemo from './pages/KotlinDemo.jsx';

const STUDENT_MENU = [
  ['dashboard', '🏠', 'Dashboard'],
  ['equipment', '🔬', 'Equipment'],
  ['book', '📅', 'Book Equipment'],
  ['myBookings', '📚', 'My Bookings'],
  ['kotlin', '🧪', 'Kotlin Lab']
];

const ADMIN_MENU = [
  ['dashboard', '📊', 'Dashboard'],
  ['manageEquipment', '🛠️', 'Equipment'],
  ['manageBookings', '📋', 'Bookings'],
  ['maintenance', '🔧', 'Maintenance'],
  ['equipment', '🔬', 'Catalogue view'],
  ['kotlin', '🧪', 'Kotlin Lab']
];

const PUBLIC_MENU = [
  ['home', 'Home'],
  ['equipment', 'Equipment'],
  ['kotlin', 'Kotlin Lab']
];

function renderPage(page, user, isAdmin) {
  // Pages that need a login or a specific role fall back to the login screen.
  const needsLogin = ['dashboard', 'book', 'myBookings', 'manageEquipment', 'manageBookings', 'maintenance'];
  if (needsLogin.includes(page) && !user) return <AuthPage />;
  if (['manageEquipment', 'manageBookings', 'maintenance'].includes(page) && !isAdmin) return <StudentDashboard />;
  if (['book', 'myBookings'].includes(page) && isAdmin) return <AdminDashboard />;

  switch (page) {
    case 'home': return <Home />;
    case 'login': return <AuthPage />;
    case 'equipment': return <EquipmentList />;
    case 'equipmentDetails': return <EquipmentDetails />;
    case 'book': return <BookEquipment />;
    case 'myBookings': return <MyBookings />;
    case 'dashboard': return isAdmin ? <AdminDashboard /> : <StudentDashboard />;
    case 'manageEquipment': return <AdminEquipment />;
    case 'manageBookings': return <AdminBookings />;
    case 'maintenance': return <AdminMaintenance />;
    case 'kotlin': return <KotlinDemo />;
    default: return <Home />;
  }
}

export default function App() {
  const { user, isAdmin, logout } = useAuth();
  const { page, navigate } = useNav();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close the mobile drawer whenever the page changes.
  useEffect(() => setMenuOpen(false), [page]);

  const handleLogout = () => { logout(); navigate('home'); };

  // ---- Public layout (not logged in) ----
  if (!user) {
    return (
      <div className="public-shell">
        <header className="topbar">
          <button className="brand" onClick={() => navigate('home')}>🔬 BookMyLab</button>
          <nav aria-label="Main">
            <ul className="topnav">
              {PUBLIC_MENU.map(([key, label]) => (
                <li key={key}><button className={page === key ? 'active' : ''} onClick={() => navigate(key)}>{label}</button></li>
              ))}
            </ul>
          </nav>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('login')}>Login</button>
        </header>
        <main className="content narrow-pad">{renderPage(page, user, isAdmin)}</main>
        <footer className="footer">BookMyLab · Laboratory Equipment Booking System</footer>
      </div>
    );
  }

  // ---- Dashboard layout (student / admin) ----
  const menu = isAdmin ? ADMIN_MENU : STUDENT_MENU;
  const activeKey = page === 'equipmentDetails' ? 'equipment' : page;

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">🔬 <span>BookMyLab</span></div>
        <nav aria-label="Main">
          <ul className="side-menu">
            {menu.map(([key, icon, label]) => (
              <li key={key}>
                <button className={activeKey === key ? 'active' : ''} onClick={() => navigate(key)}>
                  <span className="menu-icon">{icon}</span>{label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <div className="sidebar-user">
          <div className="avatar" aria-hidden="true">{user.name.charAt(0).toUpperCase()}</div>
          <div className="user-meta">
            <strong>{user.name}</strong>
            <span>{isAdmin ? 'Lab Admin' : 'Student'}</span>
          </div>
          <button className="icon-btn light" onClick={handleLogout} title="Logout" aria-label="Logout">⎋</button>
        </div>
      </aside>

      {menuOpen && <div className="scrim" onClick={() => setMenuOpen(false)} />}

      <div className="main-col">
        <header className="mobile-bar">
          <button className="icon-btn" onClick={() => setMenuOpen(true)} aria-label="Open menu">☰</button>
          <strong>🔬 BookMyLab</strong>
          <button className="icon-btn" onClick={handleLogout} aria-label="Logout">⎋</button>
        </header>
        <main className="content">{renderPage(page, user, isAdmin)}</main>
      </div>
    </div>
  );
}
