import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import { api, getStoredActor } from '../api.js';
import { useAuth } from '../auth.jsx';

const DEMO_ACCOUNTS = [
  { username: 'zenocare', label: 'zenocare', role: 'Manufacturer' },
  { username: 'afyalink', label: 'afyalink', role: 'Distributor' },
  { username: 'mlimani', label: 'mlimani', role: 'Pharmacy' },
  { username: 'regulator', label: 'regulator', role: 'Regulator' }
];

export default function Login() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const currentActor = getStoredActor();
  if (currentActor) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleLogin(targetUsername) {
    const name = String(targetUsername || username).trim();
    if (!name) return;
    setBusy(true);
    setError('');
    try {
      const res = await api.login(name);
      const actorData = {
        id: res.actor.id,
        role: res.actor.role,
        name: res.actor.name,
        place: res.actor.place
      };
      localStorage.setItem('token', res.token);
      localStorage.setItem('actor', JSON.stringify(actorData));
      if (auth && typeof auth.login === 'function') {
        // keep context in sync
        try {
          await auth.login(name);
        } catch {
          /* session already stored in localStorage */
        }
      }
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err?.message || 'Login failed. Check the username and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Layout>
      <div className="card">
        <h1>Staff login</h1>
        <form onSubmit={(e) => { e.preventDefault(); handleLogin(username); }}>
          <div className="field">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="username"
              required
              placeholder="Enter staff username"
            />
          </div>
          {error && <p className="notice" role="alert">{error}</p>}
          <button className="btn block" type="submit" disabled={busy || !username.trim()}>
            {busy ? 'Signing in…' : 'Log in'}
          </button>
        </form>

        <div className="quick-login-section" style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color, #e2e8f0)' }}>
          <p className="hint" style={{ marginBottom: '0.75rem', fontWeight: 600 }}>
            Demo Accounts (Quick Login):
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.username}
                type="button"
                className="badge btn-quick-login"
                onClick={() => {
                  setUsername(acc.username);
                  handleLogin(acc.username);
                }}
                disabled={busy}
                style={{
                  padding: '0.4rem 0.8rem',
                  borderRadius: '9999px',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <strong>{acc.username}</strong>
                <span style={{ color: '#64748b', fontSize: '0.8rem' }}>({acc.role})</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
