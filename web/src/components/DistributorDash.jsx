import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { api } from '../api';

const SCANNER_ID = 'distributor-qr-reader';

export default function DistributorDash() {
  const scannerRef = useRef(null);
  const [serialInput, setSerialInput] = useState('');
  const [serialsList, setSerialsList] = useState([]);
  const [toActorId, setToActorId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  function addSerial(value) {
    const clean = value.trim();
    if (!clean) return;
    setSerialsList((current) => current.includes(clean) ? current : [...current, clean]);
    setSerialInput('');
  }

  useEffect(() => {
    let active = true;
    let scanner;
    try {
      scanner = new Html5Qrcode(SCANNER_ID);
      scannerRef.current = scanner;
      scanner.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 240, height: 240 } },
        (decoded) => { if (active) addSerial(decoded); }, () => {})
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

  async function submitTransfer(event) {
    event.preventDefault();
    if (!serialsList.length || !toActorId.trim()) return;
    setMessage(''); setError('');
    try {
      await api.transferCustody(serialsList, toActorId.trim());
      setMessage('Custody transfer submitted successfully.');
      setSerialsList([]);
    } catch { setError('Unable to transfer custody.'); }
  }

  return <main className="page-container"><section className="card">
    <h1>Distributor dashboard</h1>
    <div id={SCANNER_ID} className="qr-reader" />
    <form onSubmit={(event) => { event.preventDefault(); addSerial(serialInput); }}>
      <label htmlFor="distributor-serial">Serial</label>
      <input id="distributor-serial" value={serialInput} onChange={(event) => setSerialInput(event.target.value)} placeholder="Scan or enter a serial" />
      <button type="submit" disabled={!serialInput.trim()}>Add serial</button>
    </form>
    {serialsList.length > 0 && <section aria-label="Serials to transfer">
      <h2>Serials ({serialsList.length})</h2>
      <ul className="serial-list">{serialsList.map((serial) => <li key={serial}>
        <span>{serial}</span>
        <button type="button" className="button--secondary" onClick={() => setSerialsList((current) => current.filter((item) => item !== serial))} aria-label={`Remove ${serial}`}>Remove</button>
      </li>)}</ul>
    </section>}
    <form onSubmit={submitTransfer}>
      <label htmlFor="destination-pharmacy">Destination pharmacy actor ID</label>
      <input id="destination-pharmacy" value={toActorId} onChange={(event) => setToActorId(event.target.value)} required />
      <button type="submit" disabled={!serialsList.length}>Transfer Custody</button>
    </form>
    {message && <div className="alert alert--ok" role="status">{message}</div>}
    {error && <div className="alert alert--flag" role="alert">{error}</div>}
  </section></main>;
}
