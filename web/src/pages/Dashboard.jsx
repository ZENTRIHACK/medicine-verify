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
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-[#E9E5F1] bg-white/95 px-4 py-3.5 backdrop-blur shadow-sm sm:px-6 sticky-top-nav">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#28145F] text-xs font-black text-white shadow-sm">
              ZV
            </span>
            <span className="brand-logo text-base sm:text-lg font-black tracking-tight text-[#242039]">
              ZENTRIQ
            </span>
          </div>
          <span className="hidden sm:inline text-[#CBD5E1]">|</span>
          <div className="flex flex-wrap items-center gap-2">
            <strong className="actor-name text-sm font-bold text-[#242039]">
              {actor.name}
            </strong>
            <span
              className={`role-badge rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${
                actor.role === 'manufacturer'
                  ? 'bg-purple-100 text-[#4926C8]'
                  : actor.role === 'distributor'
                  ? 'bg-sky-100 text-[#0369A1]'
                  : actor.role === 'pharmacy'
                  ? 'bg-emerald-100 text-[#15803D]'
                  : 'bg-amber-100 text-[#B45309]'
              }`}
            >
              {actor.role}
            </span>
            {actor.place && (
              <span className="actor-place flex items-center gap-1 text-xs text-gray-500">
                <span>📍</span> {actor.place}
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="logout-btn inline-flex items-center gap-1.5 rounded-xl border border-[#E5E1EF] px-3.5 py-2 text-xs font-bold text-gray-600 transition hover:bg-gray-100 hover:text-[#242039]"
        >
          Logout
        </button>
      </header>

      <main className="dashboard-main-content">
        {renderRoleDashboard()}
      </main>
    </div>
  );
}
