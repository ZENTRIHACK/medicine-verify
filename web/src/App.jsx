import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import PublicVerify from './pages/PublicVerify.jsx'

function App() {
  const [actor, setActor] = useState(() => {
    const stored = localStorage.getItem('actor');
    return stored ? JSON.parse(stored) : null;
  });

  const navigate = useNavigate();

  const handleLogin = (actorData, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('actor', JSON.stringify(actorData));
    setActor(actorData);
    navigate('/dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('actor');
    setActor(null);
    navigate('/login');
  };

  return (
    <>
      {actor && (
        <header className="header">
          <h1>MedVerify — {actor.name}</h1>
          <button onClick={handleLogout}>Logout</button>
        </header>
      )}
      <Routes>
        <Route path="/login" element={
          actor ? <Navigate to="/dashboard" /> : <Login onLogin={handleLogin} />
        } />
        <Route path="/dashboard" element={
          actor ? <Dashboard actor={actor} /> : <Navigate to="/login" />
        } />
        <Route path="/v/:serial" element={<PublicVerify />} />
        <Route path="*" element={<Navigate to={actor ? "/dashboard" : "/login"} />} />
      </Routes>
    </>
  )
}

export default App
