import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import ManufacturerDash from '../components/ManufacturerDash.jsx';
import DistributorDash from '../components/DistributorDash.jsx';
import PharmacyDash from '../components/PharmacyDash.jsx';
import RegulatorDash from '../components/RegulatorDash.jsx';
import { clearSession } from '../api.js';
import { useAuth } from '../auth.jsx';

export default function Dashboard() {
  const navigate = useNavigate();
  const auth = useAuth();

  const getActorFromStorage = () => {
    try {
      const raw = localStorage.getItem('actor') || localStorage.getItem('zentriq_actor');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  const [actor, setActor] = useState(getActorFromStorage);

  if (!actor) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = () => {
    clearSession();
    try {
      localStorage.removeItem('actor');
      localStorage.removeItem('token');
      localStorage.removeItem('zentriq_actor');
      localStorage.removeItem('zentriq_token');
    } catch {
      /* ignore */
    }
    if (auth && typeof auth.logout === 'function') {
      auth.logout();
    }
    setActor(null);
    navigate('/login', { replace: true });
  };

  const renderRoleDashboard = () => {
    switch (actor.role) {
      case 'manufacturer':
        return <ManufacturerDash actor={actor} />;
      case 'distributor':
        return <DistributorDash actor={actor} />;
      case 'pharmacy':
        return <PharmacyDash actor={actor} />;
      case 'regulator':
        return <RegulatorDash actor={actor} />;
      default:
        return (
          <div className="container">
            <div className="banner banner-danger">Unknown role: {actor.role}</div>
          </div>
        );
    }
  };

  return (
    <div className="dashboard-wrapper">
      <header
        className="sticky-top-nav"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.85rem 1.5rem',
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <span className="brand-logo" style={{ fontWeight: 800, letterSpacing: '0.05em', color: '#0284c7' }}>
            ZENTRIQ
          </span>
          <span style={{ color: '#cbd5e1' }}>|</span>
          <strong className="actor-name" style={{ fontSize: '1rem', color: '#0f172a' }}>
            {actor.name}
          </strong>
          <span
            className="role-badge"
            style={{
              textTransform: 'capitalize',
              padding: '0.2rem 0.6rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 600,
              backgroundColor: '#e0f2fe',
              color: '#0369a1'
            }}
          >
            {actor.role}
          </span>
          {actor.place && (
            <span className="actor-place" style={{ fontSize: '0.85rem', color: '#64748b' }}>
              📍 {actor.place}
            </span>
          )}
        </div>
        <button
          type="button"
          className="btn btn-secondary logout-btn"
          onClick={handleLogout}
          style={{
            padding: '0.4rem 0.85rem',
            fontSize: '0.85rem',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Logout
        </button>
      </header>

      <main className="dashboard-main-content" style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
        {renderRoleDashboard()}
      </main>
    </div>
  );
}
