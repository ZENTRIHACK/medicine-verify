import { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import strings from '../strings.json';

/**
 * Releases a camera scanner cleanly without uncaught exceptions.
 */
async function releaseScanner(scanner) {
  if (!scanner) return;
  try {
    if (scanner.isScanning) await scanner.stop();
  } catch {
    /* already stopped or never started */
  }
  try {
    const cleared = scanner.clear();
    if (cleared && typeof cleared.catch === 'function') await cleared.catch(console.error);
  } catch (err) {
    console.error(err);
  }
}

export default function PharmacyDash({ actor }) {
  const [serial, setSerial] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef(null);

  useEffect(() => {
    return () => {
      const scanner = scannerRef.current;
      scannerRef.current = null;
      if (scanner) {
        if (scanner.isScanning) {
          scanner.stop().then(() => scanner.clear().catch(console.error)).catch(console.error);
        }
        return scanner.clear().catch(console.error);
      }
    };
  }, []);

  const startScanner = async () => {
    if (scannerRef.current) {
      const previous = scannerRef.current;
      scannerRef.current = null;
      await releaseScanner(previous);
    }

    setScanning(true);
    setResult(null);
    setError(null);

    const { Html5Qrcode } = await import('html5-qrcode');
    const scanner = new Html5Qrcode('pharmacy-qr-reader');
    const origClear = scanner.clear.bind(scanner);
    scanner.clear = () => {
      try {
        const res = origClear();
        return Promise.resolve(res);
      } catch (err) {
        return Promise.reject(err);
      }
    };
    scannerRef.current = scanner;

    try {
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          let scannedSerial = String(decodedText || '').trim();
          const match = scannedSerial.match(/\/v\/([^/?#\s]+)/);
          if (match) scannedSerial = decodeURIComponent(match[1]);
          scannedSerial = scannedSerial.trim().toUpperCase();

          void releaseScanner(scanner);
          setScanning(false);
          handleDispense(scannedSerial);
        },
        () => {} // ignore interim frame failures
      );
    } catch (err) {
      setScanning(false);
      setError('Could not access camera: ' + (err?.message || err));
    }
  };

  const stopScanner = async () => {
    const previous = scannerRef.current;
    scannerRef.current = null;
    await releaseScanner(previous);
    setScanning(false);
  };

  const handleDispense = async (dispenseSerial) => {
    const cleanSerial = String(dispenseSerial || '').trim().toUpperCase();
    if (!cleanSerial) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await api.dispense(cleanSerial);
      setResult(data);
    } catch (err) {
      setError(err?.message || 'Dispense request failed');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    const cleanSerial = serial.trim().toUpperCase();
    if (!cleanSerial) return;
    if (scannerRef.current) {
      void releaseScanner(scannerRef.current);
      scannerRef.current = null;
      setScanning(false);
    }
    handleDispense(cleanSerial);
  };

  return (
    <div className="pharmacy-container">
      <h2 className="page-title">Pharmacy — Dispense</h2>
      <p className="muted">Dispense a pack to a patient. Scan QR code or enter the 16-character serial manually.</p>

      {/* Side-by-side QR Scanner and Manual 16-character Entry */}
      <div
        className="scanner-manual-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.5rem',
          alignItems: 'start',
          margin: '1.5rem 0'
        }}
      >
        <div className="scanner-pane" style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Dispense Camera Scanner</label>
          <div id="pharmacy-qr-reader" style={{ minHeight: '220px', borderRadius: '6px', overflow: 'hidden' }} />
          {!scanning ? (
            <button type="button" className="btn btn-primary" onClick={startScanner} style={{ marginTop: '0.75rem', width: '100%' }}>
              Start Camera Scanner
            </button>
          ) : (
            <button type="button" className="btn btn-secondary" onClick={stopScanner} style={{ marginTop: '0.75rem', width: '100%' }}>
              Stop Camera Scanner
            </button>
          )}
        </div>

        <div className="manual-pane" style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <form onSubmit={handleManualSubmit} className="manual-input">
            <label htmlFor="pharmacy-serial-input" style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>
              Manual 16-character Serial Entry
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                id="pharmacy-serial-input"
                type="text"
                value={serial}
                onChange={(e) => setSerial(e.target.value.toUpperCase())}
                placeholder="e.g. K7Q2M9XW4TBH3N8D"
                maxLength={16}
                autoComplete="off"
                style={{ flex: 1, fontFamily: 'monospace' }}
              />
              <button type="submit" className="btn btn-primary" disabled={!serial.trim() || loading}>
                Dispense
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Loading state */}
      {loading && <p className="loading" style={{ margin: '1rem 0', fontWeight: 500 }}>Processing dispense request…</p>}

      {/* Standard Error banner */}
      {error && <div className="banner banner-danger" style={{ marginTop: '1rem' }}>{error}</div>}

      {/* Dispense OK Result */}
      {result && result.result === 'ok' && (
        <div className="banner banner-ok" style={{ marginTop: '1rem', padding: '1rem', borderRadius: '8px' }}>
          <strong style={{ fontSize: '1.1rem' }}>✓ {strings.messages?.dispenseOk || 'Dispensed successfully'}</strong>
          {result.txHash && <p className="mono" style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>Tx: {result.txHash}</p>}
          {result.flags && result.flags.length > 0 && (
            <ul className="flag-list" style={{ marginTop: '0.5rem' }}>
              {result.flags.map((flag, i) => <li key={i} className="flag-item">{flag}</li>)}
            </ul>
          )}
        </div>
      )}

      {/* High-Priority Red Alert Overlay on Conflict */}
      {result && result.result === 'conflict' && (
        <div
          className="conflict-overlay"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="conflict-alert-title"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(185, 28, 28, 0.88)',
            backdropFilter: 'blur(5px)',
            WebkitBackdropFilter: 'blur(5px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem'
          }}
        >
          <div
            className="conflict-modal card"
            style={{
              backgroundColor: '#ffffff',
              border: '4px solid #dc2626',
              borderRadius: '12px',
              maxWidth: '560px',
              width: '100%',
              padding: '2rem',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
              textAlign: 'center'
            }}
          >
            <div style={{ fontSize: '3.5rem', lineHeight: 1, marginBottom: '0.75rem', color: '#dc2626' }}>
              ⚠️
            </div>
            <h2
              id="conflict-alert-title"
              style={{
                color: '#b91c1c',
                fontSize: '1.6rem',
                margin: '0 0 1rem',
                fontWeight: 800,
                letterSpacing: '-0.025em'
              }}
            >
              {strings.status?.conflict || 'DOUBLE DISPENSE CONFLICT'}
            </h2>
            <div
              style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                padding: '1.25rem',
                marginBottom: '1.5rem',
                textAlign: 'left'
              }}
            >
              <p style={{ margin: '0 0 0.75rem', fontSize: '1rem', color: '#991b1b' }}>
                <strong>Previously dispensed by:</strong>{' '}
                <span className="conflict-actor-name" style={{ fontWeight: 700, color: '#111827' }}>
                  {result.conflictWith?.actorName || 'Unknown'}
                </span>
              </p>
              <p style={{ margin: '0', fontSize: '1rem', color: '#991b1b' }}>
                <strong>At:</strong>{' '}
                <span className="conflict-at" style={{ fontWeight: 700, color: '#111827' }}>
                  {result.conflictWith?.at ? new Date(result.conflictWith.at).toLocaleString() : 'Unknown'}
                </span>
              </p>
            </div>
            {result.flags && result.flags.length > 0 && (
              <div style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
                <strong style={{ color: '#b91c1c', fontSize: '0.9rem' }}>Flags:</strong>
                <ul className="flag-list" style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem', color: '#b91c1c' }}>
                  {result.flags.map((flag, i) => (
                    <li key={i} className="flag-item">{flag}</li>
                  ))}
                </ul>
              </div>
            )}
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setResult(null)}
              style={{
                backgroundColor: '#dc2626',
                borderColor: '#dc2626',
                color: '#ffffff',
                padding: '0.75rem 2.25rem',
                fontSize: '1rem',
                fontWeight: 700,
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Acknowledge Alert
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
