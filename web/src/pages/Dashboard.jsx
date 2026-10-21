import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import ManufacturerDash from '../components/ManufacturerDash.jsx';
import DistributorDash from '../components/DistributorDash.jsx';
import PharmacyDash from '../components/PharmacyDash.jsx';
import RegulatorDash from '../components/RegulatorDash.jsx';
import { clearSession } from '../api.js';
import { useAuth } from '../auth.jsx';

export default function Dashboard() {
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
      localStorage.clear();
    } catch {
      /* storage access denied — ignore */
    }
    if (auth && typeof auth.logout === 'function') {
      auth.logout();
    }
    setActor(null);
    window.location.href = '/login';
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
      <header className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-900/95 px-3 py-3 backdrop-blur shadow-lg sm:px-6 sm:py-3.5 sticky-top-nav">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-xs font-black text-white shadow-lg shadow-blue-500/30">
              ZV
            </span>
            <span className="brand-logo text-base sm:text-lg font-black tracking-tight text-white">
              ZENTRIQ
            </span>
          </div>
          <span className="hidden sm:inline text-slate-600">|</span>
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <strong className="actor-name text-sm font-bold text-white truncate max-w-[140px] sm:max-w-none">
              {actor.name}
            </strong>
            <span
              className={`role-badge rounded-full px-2.5 py-0.5 text-xs font-bold capitalize shrink-0 ${
                actor.role === 'manufacturer'
                  ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                  : actor.role === 'distributor'
                  ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                  : actor.role === 'pharmacy'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
              }`}
            >
              {actor.role}
            </span>
            {actor.place && (
              <span className="actor-place flex items-center gap-1 text-xs text-slate-400 shrink-0">
                <span>📍</span> {actor.place}
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="logout-btn inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-4 py-2 text-xs sm:text-sm font-semibold text-rose-400 border border-rose-500/20 bg-rose-500/10 transition-all hover:bg-rose-500/20 cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Logout
        </button>
      </header>

      <main className="dashboard-main-content">
        {renderRoleDashboard()}
      </main>
    </div>
  );
}
