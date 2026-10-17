import { useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import useQrScanner, { SCANNER_ERROR_MESSAGES } from '../hooks/useQrScanner';

export default function SerialEntry() {
  const navigate = useNavigate();
  const { serial: routeSerial } = useParams();
  const [manualSerial, setManualSerial] = useState(routeSerial || '');
  const [cameraError, setCameraError] = useState('');

  const scannerId = 'public-qr-reader';

  const go = useCallback((value) => {
    const clean = String(value || '').trim();
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
        <p>Scan the code on the pack, or type the serial number printed beneath it.</p>
        <div id={scannerId} className="qr-reader" />
        {cameraError && <div className="alert alert--flag" role="alert">{cameraError}</div>}
        <form onSubmit={(event) => { event.preventDefault(); go(manualSerial); }}>
          <label htmlFor="public-serial">Serial</label>
          <input
            id="public-serial"
            value={manualSerial}
            onChange={(event) => setManualSerial(event.target.value)}
            placeholder="Scan or enter a serial"
            autoComplete="off"
          />
          <button type="submit" disabled={!manualSerial.trim()}>Submit</button>
        </form>
      </section>
    </main>
  );
}
