import { useState, useEffect, useRef } from 'react'
import { api } from '../api'
import strings from '../strings.json'

/**
 * Releases a camera scanner without ever throwing.
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

    // dynamic import to avoid SSR issues
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
          // Extract serial from URL if scanned a full URL
          let scannedSerial = decodedText;
          const match = decodedText.match(/\/v\/(.+)$/);
          if (match) scannedSerial = match[1];

          void releaseScanner(scanner);
          setScanning(false);
          handleDispense(scannedSerial);
        },
        () => {} // ignore scan failures
      );
    } catch (err) {
      setScanning(false);
      setError('Could not access camera: ' + err);
    }
  };

  const stopScanner = async () => {
    const previous = scannerRef.current;
    scannerRef.current = null;
    await releaseScanner(previous);
    setScanning(false);
  };

  const handleDispense = async (dispenseSerial) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await api.dispense(dispenseSerial);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!serial.trim()) return;
    if (scannerRef.current) {
      void releaseScanner(scannerRef.current);
      scannerRef.current = null;
      setScanning(false);
    }
    handleDispense(serial.trim());
  };

  return (
    <div>
      <h2 className="page-title">Pharmacy — Dispense</h2>

      {/* Scanner */}
      <div className="scanner-container">
        <div id="pharmacy-qr-reader" />
        {!scanning ? (
          <button className="btn btn-primary" onClick={startScanner} style={{ marginTop: '0.5rem' }}>
            Scan QR Code
          </button>
        ) : (
          <button className="btn btn-secondary" onClick={stopScanner} style={{ marginTop: '0.5rem' }}>
            Stop Scanner
          </button>
        )}
      </div>

      {/* Manual Input */}
      <form onSubmit={handleManualSubmit} className="manual-input">
        <input
          type="text"
          value={serial}
          onChange={(e) => setSerial(e.target.value)}
          placeholder="Or enter serial manually"
        />
        <button type="submit" className="btn btn-primary">Submit</button>
      </form>

      {/* Loading */}
      {loading && <p className="loading">Processing…</p>}

      {/* Error */}
      {error && <div className="banner banner-danger" style={{ marginTop: '1rem' }}>{error}</div>}

      {/* Result */}
      {result && result.result === 'ok' && (
        <div className="banner banner-ok" style={{ marginTop: '1rem' }}>
          ✓ {strings.messages?.dispenseOk || 'Dispensed successfully'}
          {result.flags && result.flags.length > 0 && (
            <ul className="flag-list" style={{ marginTop: '0.5rem' }}>
              {result.flags.map((flag, i) => <li key={i} className="flag-item">{flag}</li>)}
            </ul>
          )}
        </div>
      )}

      {result && result.result === 'conflict' && (
        <div className="banner banner-danger" style={{ marginTop: '1rem' }}>
          ⚠ {strings.status.conflict}
          <div className="conflict-details">
            <p>Previously dispensed by: <strong>{result.conflictWith?.actorName || 'Unknown'}</strong></p>
            <p>At: {result.conflictWith?.at ? new Date(result.conflictWith.at).toLocaleString() : 'Unknown'}</p>
          </div>
          {result.flags && result.flags.length > 0 && (
            <ul className="flag-list" style={{ marginTop: '0.5rem' }}>
              {result.flags.map((flag, i) => <li key={i} className="flag-item">{flag}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
