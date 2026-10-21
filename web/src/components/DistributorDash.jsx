import { useCallback, useState } from 'react';
import useQrScanner, { SCANNER_ERROR_MESSAGES } from '../hooks/useQrScanner';
import { api } from '../api';
import strings from '../strings.json';

const SCANNER_ID = 'distributor-qr-reader';

function extractSerial(text) {
  const raw = String(text ?? '').trim();
  if (!raw) return '';
  const match = raw.match(/\/v\/([^/?#\s]+)/);
  return (match ? decodeURIComponent(match[1]) : raw).toUpperCase();
}

export default function DistributorDash() {
  const [serialInput, setSerialInput] = useState('');
  const [serialsList, setSerialsList] = useState([]);
  const [toActorId, setToActorId] = useState('3');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [cameraError, setCameraError] = useState('');
  const [transferring, setTransferring] = useState(false);

  const addSerial = useCallback((value) => {
    const clean = extractSerial(value);
    if (!clean) return;
    setSerialsList((current) => (current.includes(clean) ? current : [...current, clean]));
    setSerialInput('');
  }, []);

  const handleCamera = useCallback((value, camErr) => {
    if (camErr) {
      setCameraError(camErr.message || SCANNER_ERROR_MESSAGES.generic);
      return;
    }
    setCameraError('');
    addSerial(value);
  }, [addSerial]);

  useQrScanner(SCANNER_ID, handleCamera);

  async function submitTransfer(event) {
    event.preventDefault();
    if (!serialsList.length) return;
    const destActorId = parseInt(toActorId || '3', 10);
    setMessage('');
    setError('');
    setTransferring(true);
    try {
      await api.transferCustody(serialsList, destActorId);
      setMessage(strings.messages?.custodyTransferred || `Custody transferred for ${serialsList.length} serial(s)`);
      setSerialsList([]);
    } catch (err) {
      setError(err?.message || strings.messages?.custodyError || 'Failed to transfer custody.');
    } finally {
      setTransferring(false);
    }
  }

  return (
    <main className="page-container">
      <section className="card">
        <h1>Distributor dashboard</h1>
        <p className="muted">Scan packs into the transfer queue or enter 16-character serials manually.</p>

        {/* Side-by-side QR Scanner and Manual Entry */}
        <div
          className="scanner-manual-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.5rem',
            alignItems: 'start',
            marginTop: '1rem',
            marginBottom: '1.5rem'
          }}
        >
          <div className="scanner-pane" style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Camera QR Scanner</label>
            <div id={SCANNER_ID} className="qr-reader" style={{ minHeight: '220px', borderRadius: '6px', overflow: 'hidden' }} />
            {cameraError && (
              <div className="alert alert--flag" role="alert" style={{ marginTop: '0.5rem' }}>
                {cameraError}
              </div>
            )}
          </div>

          <div className="manual-pane" style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <form onSubmit={(event) => { event.preventDefault(); addSerial(serialInput); }}>
              <label htmlFor="distributor-serial" style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>
                Manual 16-character Serial Entry
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  id="distributor-serial"
                  value={serialInput}
                  onChange={(event) => setSerialInput(event.target.value.toUpperCase())}
                  placeholder="e.g. K7Q2M9XW4TBH3N8D"
                  maxLength={16}
                  autoComplete="off"
                  style={{ flex: 1, fontFamily: 'monospace' }}
                />
                <button type="submit" className="btn btn-primary" disabled={!serialInput.trim()}>
                  Add to Queue
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Queue of Serials */}
        {serialsList.length > 0 && (
          <section aria-label="Serials to transfer" style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
            <h2>Serials in Queue ({serialsList.length})</h2>
            <ul className="serial-list" style={{ listStyle: 'none', padding: 0 }}>
              {serialsList.map((serial) => (
                <li
                  key={serial}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.5rem 0.75rem',
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    marginBottom: '0.5rem'
                  }}
                >
                  <span className="mono" style={{ fontWeight: 600 }}>{serial}</span>
                  <button
                    type="button"
                    className="button--secondary btn secondary"
                    onClick={() => setSerialsList((current) => current.filter((item) => item !== serial))}
                    aria-label={`Remove ${serial}`}
                    style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Transfer Form to Destination Pharmacy (Actor ID 3) */}
        <form onSubmit={submitTransfer} style={{ marginTop: '1rem' }}>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label htmlFor="destination-pharmacy" style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>
              Destination Pharmacy Actor ID
            </label>
            <input
              id="destination-pharmacy"
              type="number"
              min="1"
              value={toActorId}
              onChange={(event) => setToActorId(event.target.value)}
              placeholder="3 (Mlimani Pharmacy)"
              required
              style={{ maxWidth: '300px' }}
            />
            <small style={{ display: 'block', color: '#64748b', marginTop: '0.25rem' }}>
              Default ID 3: Mlimani Pharmacy
            </small>
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!serialsList.length || transferring}
          >
            {transferring ? 'Transferring…' : `Bulk Transfer ${serialsList.length} Serial(s)`}
          </button>
        </form>

        {message && <div className="alert alert--ok banner banner-ok" role="status" style={{ marginTop: '1rem' }}>{message}</div>}
        {error && <div className="alert alert--flag banner banner-danger" role="alert" style={{ marginTop: '1rem' }}>{error}</div>}
      </section>
    </main>
  );
}
