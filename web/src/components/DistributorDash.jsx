import { useCallback, useRef, useState } from 'react';
import useQrScanner, { SCANNER_ERROR_MESSAGES } from '../hooks/useQrScanner';
import { api } from '../api';
import strings from '../strings.json';

const SCANNER_ID = 'distributor-qr-reader';

export default function DistributorDash() {
  const [serialInput, setSerialInput] = useState('');
  const [serialsList, setSerialsList] = useState([]);
  const [toActorId, setToActorId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [cameraError, setCameraError] = useState('');

  const addSerial = useCallback((value) => {
    const clean = typeof value === 'string' ? value.trim() : '';
    if (!clean) return;
    setSerialsList((current) => (current.includes(clean) ? current : [...current, clean]));
    setSerialInput('');
  }, []);

  const handleCamera = useCallback((value, cameraError) => {
    if (cameraError) {
      setCameraError(cameraError.message || SCANNER_ERROR_MESSAGES.generic);
      return;
    }
    setCameraError('');
    addSerial(value);
  }, [addSerial]);

  useQrScanner(SCANNER_ID, handleCamera);

  async function submitTransfer(event) {
    event.preventDefault();
    if (!serialsList.length || !toActorId.trim()) return;
    setMessage('');
    setError('');
    try {
      await api.transferCustody(serialsList, toActorId.trim());
      setMessage(strings.messages.custodyTransferred);
      setSerialsList([]);
    } catch {
      setError(strings.messages.custodyError);
    }
  }

  return (
    <main className="page-container">
      <section className="card">
        <h1>Distributor dashboard</h1>
        <div id={SCANNER_ID} className="qr-reader" />
        {cameraError && <div className="alert alert--flag" role="alert">{cameraError}</div>}
        <form onSubmit={(event) => { event.preventDefault(); addSerial(serialInput); }}>
          <label htmlFor="distributor-serial">Serial</label>
          <input
            id="distributor-serial"
            value={serialInput}
            onChange={(event) => setSerialInput(event.target.value)}
            placeholder="Scan or enter a serial"
            autoComplete="off"
          />
          <button type="submit" disabled={!serialInput.trim()}>Add serial</button>
        </form>
        {serialsList.length > 0 && (
          <section aria-label="Serials to transfer">
            <h2>Serials ({serialsList.length})</h2>
            <ul className="serial-list">
              {serialsList.map((serial) => (
                <li key={serial}>
                  <span>{serial}</span>
                  <button
                    type="button"
                    className="button--secondary"
                    onClick={() => setSerialsList((current) => current.filter((item) => item !== serial))}
                    aria-label={`Remove ${serial}`}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
        <form onSubmit={submitTransfer}>
          <label htmlFor="destination-pharmacy">Destination pharmacy actor ID</label>
          <input
            id="destination-pharmacy"
            value={toActorId}
            onChange={(event) => setToActorId(event.target.value)}
            required
          />
          <button type="submit" disabled={!serialsList.length}>Transfer Custody</button>
        </form>
        {message && <div className="alert alert--ok" role="status">{message}</div>}
        {error && <div className="alert alert--flag" role="alert">{error}</div>}
      </section>
    </main>
  );
}
