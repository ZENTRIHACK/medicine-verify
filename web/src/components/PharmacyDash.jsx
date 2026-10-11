import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { api } from '../api';
import strings from '../../../spec/strings.json';

const SCANNER_ID = 'pharmacy-qr-reader';

export default function PharmacyDash() {
  const scannerRef = useRef(null);
  const busyRef = useRef(false);
  const [serial, setSerial] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  async function submitSerial(value = serial) {
    const clean = value.trim();
    if (!clean || busyRef.current) return;
    busyRef.current = true;
    setResult(null);
    setError('');
    try {
      const response = await api.dispense(clean);
      setResult(response);
      if (response.result === 'ok') setSerial('');
    } catch {
      setError('Unable to submit this serial. Please try again.');
    } finally {
      busyRef.current = false;
    }
  }

  useEffect(() => {
    let active = true;
    let scanner;
    try {
      scanner = new Html5Qrcode(SCANNER_ID);
      scannerRef.current = scanner;
      scanner.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 240, height: 240 } },
        (decoded) => { if (active) void submitSerial(decoded); }, () => {})
        .then(() => {
          if (!active && scanner.isScanning) return scanner.stop().catch(() => {}).finally(() => scanner.clear());
          return undefined;
        })
        .catch(() => {});
    } catch { /* Manual serial entry remains available. */ }
    return () => {
      active = false;
      const current = scannerRef.current;
      scannerRef.current = null;
      if (current?.isScanning) current.stop().catch(() => {}).finally(() => current.clear());
      else current?.clear();
    };
  }, []);

  return <main className="page-container"><section className="card">
    <h1>Pharmacy dashboard</h1>
    <div id={SCANNER_ID} className="qr-reader" />
    <form onSubmit={(event) => { event.preventDefault(); void submitSerial(); }}>
      <label htmlFor="pharmacy-serial">Serial</label>
      <input id="pharmacy-serial" value={serial} onChange={(event) => setSerial(event.target.value)} placeholder="Scan or enter a serial" />
      <button type="submit" disabled={!serial.trim() || busyRef.current}>Submit</button>
    </form>
    {error && <div className="alert alert--flag" role="alert">{error}</div>}
    {result?.result === 'ok' && <div className="alert alert--ok" role="status">Dispensing recorded successfully.</div>}
    {result?.result === 'conflict' && <div className="alert alert--conflict" role="alert">
      <strong>{strings.status.conflict}</strong>
      <p>Actor: {result.conflictWith?.actorName || '—'}</p>
      <p>At: {result.conflictWith?.at || '—'}</p>
    </div>}
  </section></main>;
}
