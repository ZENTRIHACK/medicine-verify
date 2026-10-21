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
            <div className="banner conflict">Unknown role: {actor.role}</div>
          </div>
        );
    }
  };

  const roleTheme = {
    manufacturer: {
      page: 'bg-[#F7F5FC]',
      border: 'border-purple-100',
      icon: 'bg-purple-100 text-[#4926C8]',
      badge: 'bg-purple-50 text-[#4926C8]',
      workspace: 'Manufacturer workspace'
    },
    distributor: {
      page: 'bg-[#F3F9FC]',
      border: 'border-sky-100',
      icon: 'bg-sky-100 text-sky-700',
      badge: 'bg-sky-50 text-sky-700',
      workspace: 'Distributor workspace'
    },
    pharmacy: {
      page: 'bg-[#F2FAF5]',
      border: 'border-emerald-100',
      icon: 'bg-emerald-100 text-emerald-700',
      badge: 'bg-emerald-50 text-emerald-700',
      workspace: 'Pharmacy workspace'
    },
    regulator: {
      page: 'bg-[#FAF9FC]',
      border: 'border-amber-200',
      icon: 'bg-amber-50 text-amber-700',
      badge: 'bg-amber-50 text-amber-800',
      workspace: 'Regulator workspace'
    }
  }[actor.role] || {
    page: 'bg-[#FAF9FC]',
    border: 'border-[#E9E5F1]',
    icon: 'bg-purple-50 text-[#4926C8]',
    badge: 'bg-purple-50 text-[#4926C8]',
    workspace: 'Workspace'
  };

  return (
    <div className={`dashboard-wrapper min-h-screen text-[#242039] ${roleTheme.page}`}>
      <header
        className={`sticky top-0 z-50 border-b bg-white px-3 py-3 backdrop-blur sm:px-6 sm:py-3.5 sticky-top-nav ${roleTheme.border}`}
        style={{ position: 'sticky' }}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
            <div className="flex items-center gap-3 shrink-0">
              <span className={`flex h-9 w-9 items-center justify-center rounded-xl text-xs font-extrabold ${roleTheme.icon}`}>
                ZV
              </span>
              <div>
                <span className="brand-logo block text-base sm:text-lg font-extrabold tracking-tight text-[#242039]">
                  ZENTRIQ
                </span>
                <span className="hidden sm:block text-xs text-gray-500">
                  {roleTheme.workspace}
                </span>
              </div>
            </div>
            <span className="hidden sm:inline text-gray-300">|</span>
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <strong className="actor-name text-sm font-bold text-[#242039] truncate max-w-[140px] sm:max-w-none">
                {actor.name}
              </strong>
              <span className={`role-badge rounded-full px-2.5 py-0.5 text-xs font-bold capitalize shrink-0 ${roleTheme.badge}`}>
                {actor.role}
              </span>
              {actor.place && (
                <span className="actor-place flex items-center gap-1 text-xs text-gray-500 shrink-0">
                  <span>📍</span> {actor.place}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="logout-btn inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-[#E5E1EF] bg-white px-3 py-2 text-xs sm:px-4 sm:text-sm font-semibold text-[#242039] transition hover:bg-gray-50 cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>
      </header>

      <main className="dashboard-main-content">
        {renderRoleDashboard()}
      </main>
    </div>
  );
}
