import { useState } from 'react';
import Scanner from './Scanner.jsx';
import { normalizeSerial } from '../utils.js';

// Manual 16-character serial entry plus side-by-side optional camera scan.
export default function SerialEntry({ onSerial, submitLabel = 'Use serial', clearOnSubmit = false }) {
  const [value, setValue] = useState('');

  function submit(e) {
    e.preventDefault();
    const s = normalizeSerial(value);
    if (!s) return;
    onSerial(s);
    if (clearOnSubmit) setValue('');
  }

  function scanned(text) {
    const s = normalizeSerial(text);
    if (!s) return;
    setValue(clearOnSubmit ? '' : s);
    onSerial(s);
  }

  return (
    <div
      className="serial-entry-container"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '1.25rem',
        alignItems: 'start',
        margin: '1rem 0'
      }}
    >
      <div className="manual-pane" style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="serial-input" style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>
              Manual 16-character Serial Entry
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                id="serial-input"
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value.toUpperCase())}
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                maxLength={16}
                placeholder="e.g. K7Q2M9XW4TBH3N8D"
                style={{ flex: 1, fontFamily: 'monospace' }}
              />
              <button type="submit" className="btn btn-primary" disabled={!value.trim()}>
                {submitLabel}
              </button>
            </div>
          </div>
        </form>
      </div>
      <div className="scanner-pane" style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Camera QR Scanner</label>
        <Scanner onScan={scanned} />
      </div>
    </div>
  );
}
