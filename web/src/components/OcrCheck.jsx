import { useState } from 'react';
import strings from '../strings.json';
import { api, USE_MOCKS } from '../api.js';

const FIELDS = [
  ['batchNo', 'Batch'],
  ['expiry', 'Expiry'],
  ['manufacturer', 'Manufacturer'],
];

// Photo check: uploads the pack photo and shows the OCR status text from strings.json.
export default function OcrCheck({ serial, product }) {
  const [file, setFile] = useState(null);
  const [mockOutcome, setMockOutcome] = useState('match');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setError('');
    setResult(null);
    try {
      setResult(await api.ocr(serial, file, mockOutcome));
    } catch {
      setError('The photo could not be checked. Try again.');
    } finally {
      setBusy(false);
    }
  }

  const key = result && result.match in strings.ocr ? result.match : 'unreadable';
  const extracted = (result && result.extracted) || {};
  const differences = result && Array.isArray(result.differences) ? result.differences : [];

  return (
    <section className="card">
      <h2>Check a photo of the pack</h2>
      <p className="muted">Take or choose a clear photo of the printed batch and expiry details.</p>
      <form onSubmit={submit}>
        <div className="field">
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Pack photo source</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <label
              className="btn"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                padding: '0.5rem 1rem',
                borderRadius: '6px'
              }}
            >
              📷 Take Photo
              <input
                id="pack-photo-camera"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => {
                  setFile(e.target.files && e.target.files[0] ? e.target.files[0] : null);
                  setResult(null);
                }}
                style={{ display: 'none' }}
              />
            </label>
            <label
              className="btn secondary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                padding: '0.5rem 1rem',
                borderRadius: '6px'
              }}
            >
              🖼️ Choose from Gallery
              <input
                id="pack-photo-gallery"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  setFile(e.target.files && e.target.files[0] ? e.target.files[0] : null);
                  setResult(null);
                }}
                style={{ display: 'none' }}
              />
            </label>
          </div>
          {file && (
            <p style={{ margin: '0.25rem 0', fontSize: '0.875rem', color: '#16a34a', fontWeight: 500 }}>
              ✓ Selected photo: {file.name}
            </p>
          )}
        </div>

        {USE_MOCKS && (
          <div className="field">
            <label htmlFor="mock-outcome">Demo mode: photo result to simulate</label>
            <select id="mock-outcome" value={mockOutcome} onChange={(e) => setMockOutcome(e.target.value)}>
              <option value="match">Details match the record</option>
              <option value="mismatch">Expiry date changed</option>
              <option value="unreadable">Blurry photo</option>
            </select>
          </div>
        )}

        <button type="submit" className="btn block" disabled={!file || busy}>
          {busy ? 'Checking…' : 'Check photo'}
        </button>
      </form>

      {error && <p className="notice" role="alert">{error}</p>}

      {result && (
        <div style={{ marginTop: '1rem' }}>
          <div className={`banner ${key}`} role="status">
            {strings.ocr[key]}
            {typeof result.confidence === 'number' && (
              <small>Reading confidence: {Math.round(result.confidence * 100)}%</small>
            )}
          </div>

          <table className="diff">
            <thead>
              <tr>
                <th>Field</th>
                <th>Registered</th>
                <th>Detected</th>
              </tr>
            </thead>
            <tbody>
              {FIELDS.map(([f, label]) => {
                const reg = product ? product[f] : '';
                const det = extracted[f] || '';
                const differs = Boolean(reg && det && reg !== det);
                return (
                  <tr key={f} className={differs ? 'differs' : undefined}>
                    <td>{label}</td>
                    <td>{reg || '—'}</td>
                    <td>{det || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {differences.length > 0 && (
            <>
              <h3 style={{ marginTop: '0.8rem' }}>Differences</h3>
              <ul className="plain">
                {differences.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </section>
  );
}
