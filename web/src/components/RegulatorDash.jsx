import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { eventLabel } from '../lib/lexicon';
import strings from '../strings.json';

function detailText(details) {
  if (typeof details === 'string' && details) return details;
  if (details && typeof details === 'object') {
    return details.message || JSON.stringify(details);
  }
  return '—';
}

export default function RegulatorDash() {
  const [alerts, setAlerts] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const loadAlerts = () => {
      api.getAlerts().then((response) => {
        if (!active) return;
        const items = Array.isArray(response) ? response : response?.alerts || [];
        setAlerts([...items].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()));
        setError('');
      }).catch(() => { if (active) setError(strings.messages.alertsError); });
    };

    loadAlerts();
    const timer = setInterval(loadAlerts, 5000);
    return () => { active = false; clearInterval(timer); };
  }, []);

  const duplicateBatchAlerts = alerts.filter((alert) => alert.type === 'duplicate_batch');

  return (
    <main className="page-container">
      <section className="card">
        <h1>Regulator dashboard</h1>
        {error && <div className="alert alert--flag" role="alert">{error}</div>}
        {duplicateBatchAlerts.length > 0 && (
          <div className="alert alert--flag" role="status">
            {duplicateBatchAlerts.length} duplicate batch registration
            {duplicateBatchAlerts.length === 1 ? ' was' : 's were'} blocked. Review the newest rows below.
          </div>
        )}
        {!error && alerts.length === 0 ? (
          <p>{strings.messages.noAlerts}</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Type</th><th>At</th><th>Details</th><th>Serial</th></tr>
              </thead>
              <tbody>
                {alerts.map((alert, index) => (
                  <tr key={alert.id || `${alert.serial}-${alert.at}-${index}`}>
                    <td>{eventLabel(alert.type)}</td>
                    <td>{alert.at}</td>
                    <td>{detailText(alert.details)}</td>
                    <td>
                      {alert.serial
                        ? <Link to={`/v/${encodeURIComponent(alert.serial)}`}>{alert.serial}</Link>
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
