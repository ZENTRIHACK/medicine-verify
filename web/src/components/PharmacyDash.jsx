import { useCallback, useRef, useState } from 'react';
import useQrScanner, { SCANNER_ERROR_MESSAGES } from '../hooks/useQrScanner';
import { api } from '../api';
import { strings } from '../lib/lexicon';

const SCANNER_ID = 'pharmacy-qr-reader';

export default function PharmacyDash() {
  const [serial, setSerial] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [cameraError, setCameraError] = useState('');
  const busyRef = useRef(false);

  const submitSerial = useCallback(async (value) => {
    const clean = typeof value === 'string' ? value.trim() : '';
    if (!clean || busyRef.current) return;
    busyRef.current = true;
    setResult(null);
    setError('');
    setCameraError('');
    try {
      const response = await api.dispense(clean);
      setResult(response);
      if (response?.result === 'ok') setSerial('');
    } catch {
      setError('Unable to submit this serial. Please try again.');
    } finally {
      busyRef.current = false;
    }
  }, []);

  const handleCamera = useCallback((value, cameraError) => {
    if (cameraError) {
      setCameraError(cameraError.message || SCANNER_ERROR_MESSAGES.generic);
      return;
    }
    setCameraError('');
    void submitSerial(value);
  }, [submitSerial]);

  useQrScanner(SCANNER_ID, handleCamera);

  return (
    <main className="page-container">
      <section className="card">
        <h1>Pharmacy dashboard</h1>
        <div id={SCANNER_ID} className="qr-reader" />
        {cameraError && <div className="alert alert--flag" role="alert">{cameraError}</div>}
        <form onSubmit={(event) => { event.preventDefault(); void submitSerial(serial); }}>
          <label htmlFor="pharmacy-serial">Serial</label>
          <input
            id="pharmacy-serial"
            value={serial}
            onChange={(event) => setSerial(event.target.value)}
            placeholder="Scan or enter a serial"
            autoComplete="off"
          />
          <button type="submit" disabled={!serial.trim() || busyRef.current}>Submit</button>
        </form>
        {error && <div className="alert alert--flag" role="alert">{error}</div>}
        {result?.result === 'ok' && <div className="alert alert--ok" role="status">Dispensing recorded successfully.</div>}
        {result?.result === 'conflict' && (
          <div className="alert alert--conflict" role="alert">
            <strong>{strings.status.conflict}</strong>
            <p>Actor: {result.conflictWith?.actorName || '—'}</p>
            <p>At: {result.conflictWith?.at || '—'}</p>
          </div>
        )}
        {result?.result === 'unknown' && (
          <div className="alert alert--flag" role="alert">
            <strong>{strings.status.unknown}</strong>
            <p>{result.serial || '—'}</p>
          </div>
        )}
      </section>
    </main>
  );
}
