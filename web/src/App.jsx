import { Navigate, Route, Routes } from 'react-router-dom';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import PublicVerify from './pages/PublicVerify.jsx';
import SerialEntry from './pages/SerialEntry.jsx';
import { getStoredActor } from './api.js';

function Home() {
  const actor = getStoredActor();
  return <Navigate to={actor ? '/dashboard' : '/login'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/verify" element={<PublicVerify />} />
      <Route path="/verify/:serial" element={<PublicVerify />} />
      <Route path="/v/:serial" element={<PublicVerify />} />
      <Route path="/manufacturer" element={<Navigate to="/dashboard" replace />} />
      <Route path="/distributor" element={<Navigate to="/dashboard" replace />} />
      <Route path="/pharmacy" element={<Navigate to="/dashboard" replace />} />
      <Route path="/regulator" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
