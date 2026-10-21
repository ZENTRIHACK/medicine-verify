import { useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import useQrScanner, { SCANNER_ERROR_MESSAGES } from '../hooks/useQrScanner';

function extractSerial(text) {
  const raw = String(text ?? '').trim();
  if (!raw) return '';
  const match = raw.match(/\/v\/([^/?#\s]+)/);
  return (match ? decodeURIComponent(match[1]) : raw).toUpperCase();
}

export default function SerialEntry() {
  const navigate = useNavigate();
  const { serial: routeSerial } = useParams();
  const [manualSerial, setManualSerial] = useState(routeSerial || '');
  const [cameraError, setCameraError] = useState('');

  const scannerId = 'public-qr-reader';

  const go = useCallback((value) => {
    const clean = extractSerial(value);
    if (!clean) return;
    navigate(`/v/${encodeURIComponent(clean)}`);
  }, [navigate]);

  const handleCamera = useCallback((value, error) => {
    if (error) {
      setCameraError(error.message || SCANNER_ERROR_MESSAGES.generic);
      return;
    }
    go(value);
  }, [go]);

  useQrScanner(scannerId, handleCamera);

  return (
    <main className="page-container">
      <section className="card">
        <h1>Verify a pack</h1>
        <p className="muted">Scan the QR code on the pack, or type the 16-character serial number printed on the packaging.</p>

        {/* Side-by-side QR Scanner and Manual 16-character Entry */}
        <div
          className="scanner-manual-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.5rem',
            alignItems: 'start',
            marginTop: '1rem',
            marginBottom: '1rem'
          }}
        >
          <div className="scanner-pane" style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Camera QR Scanner</label>
            <div id={scannerId} className="qr-reader" style={{ minHeight: '220px', borderRadius: '6px', overflow: 'hidden' }} />
            {cameraError && <div className="alert alert--flag" role="alert" style={{ marginTop: '0.5rem' }}>{cameraError}</div>}
          </div>

          <div className="manual-pane" style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <form onSubmit={(event) => { event.preventDefault(); go(manualSerial); }}>
              <label htmlFor="public-serial" style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>
                Manual 16-character Serial Entry
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  id="public-serial"
                  value={manualSerial}
                  onChange={(event) => setManualSerial(event.target.value.toUpperCase())}
                  placeholder="e.g. K7Q2M9XW4TBH3N8D"
                  maxLength={16}
                  autoComplete="off"
                  style={{ flex: 1, fontFamily: 'monospace' }}
                />
                <button type="submit" className="btn btn-primary" disabled={!manualSerial.trim()}>
                  Verify
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
