import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../api';
import strings from '../strings.json';

export default function ManufacturerDash({ actor }) {
  // Batch registration state
  const [batchForm, setBatchForm] = useState({ productName: '', batchNo: '', expiry: '', quantity: '' });
  const [serials, setSerials] = useState(null);
  const [batchId, setBatchId] = useState(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchError, setBatchError] = useState(null);

  // Batches history for dropdown auto-population
  const [batches, setBatches] = useState(() => {
    try {
      const stored = localStorage.getItem('zentriq_manufacturer_batches');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [selectedBatchId, setSelectedBatchId] = useState('');

  // Transfer state
  const [transferSerials, setTransferSerials] = useState('');
  const [toActorId, setToActorId] = useState('2');
  const [transferResult, setTransferResult] = useState(null);
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferError, setTransferError] = useState(null);

  const handleBatchChange = (e) => {
    setBatchForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleBatchSubmit = async (e) => {
    e.preventDefault();
    setBatchLoading(true);
    setBatchError(null);
    setSerials(null);
    try {
      const data = await api.registerBatch({
        ...batchForm,
        quantity: parseInt(batchForm.quantity, 10)
      });
      const generatedSerials = Array.isArray(data.serials) ? data.serials : [];
      setBatchId(data.batchId);
      setSerials(generatedSerials);

      const newBatch = {
        batchId: data.batchId,
        productName: batchForm.productName,
        batchNo: batchForm.batchNo,
        expiry: batchForm.expiry,
        quantity: generatedSerials.length || parseInt(batchForm.quantity, 10),
        serials: generatedSerials
      };

      setBatches(prev => {
        const next = [newBatch, ...prev.filter(b => b.batchId !== data.batchId)];
        try {
          localStorage.setItem('zentriq_manufacturer_batches', JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
      setSelectedBatchId(String(data.batchId));
    } catch (err) {
      setBatchError(err.message || strings.messages?.batchError);
    } finally {
      setBatchLoading(false);
    }
  };

  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    setTransferLoading(true);
    setTransferError(null);
    setTransferResult(null);
    try {
      const serialsArray = transferSerials
        .split(/[\n,]+/)
        .map(s => s.trim())
        .filter(Boolean);
      const data = await api.transferCustody(serialsArray, parseInt(toActorId, 10));
      setTransferResult(data);
    } catch (err) {
      setTransferError(err.message || strings.messages?.custodyError);
    } finally {
      setTransferLoading(false);
    }
  };

  return (
    <div>
      <h2 className="page-title">Manufacturer Dashboard</h2>

      {/* Form 1: Create Batch */}
      <div className="section card" style={{ marginBottom: '2rem' }}>
        <h2>Register Batch</h2>
        <form onSubmit={handleBatchSubmit}>
          <div className="form-group">
            <label htmlFor="productName">Product Name</label>
            <input id="productName" name="productName" type="text" value={batchForm.productName}
              onChange={handleBatchChange} placeholder="e.g. Amoxicillin 500mg" required />
          </div>
          <div className="form-group">
            <label htmlFor="batchNo">Batch Number</label>
            <input id="batchNo" name="batchNo" type="text" value={batchForm.batchNo}
              onChange={handleBatchChange} placeholder="e.g. AMX-2026-001" required />
          </div>
          <div className="form-group">
            <label htmlFor="expiry">Expiry Date</label>
            <input id="expiry" name="expiry" type="date" value={batchForm.expiry}
              onChange={handleBatchChange} required />
          </div>
          <div className="form-group">
            <label htmlFor="quantity">Quantity</label>
            <input id="quantity" name="quantity" type="number" min="1" value={batchForm.quantity}
              onChange={handleBatchChange} placeholder="e.g. 10" required />
          </div>
          <button className="btn btn-primary" type="submit" disabled={batchLoading}>
            {batchLoading ? 'Registering…' : 'Register Batch'}
          </button>
        </form>

        {batchError && <div className="banner banner-danger" style={{ marginTop: '0.75rem' }}>{batchError}</div>}

        {/* QR Print View */}
        {serials && serials.length > 0 && (
          <div style={{ marginTop: '2rem' }}>
            <div className="banner banner-ok" style={{ marginBottom: '1rem' }}>
              ✓ Batch #{batchId} registered — {serials.length} serial(s) created
            </div>

            {/* Actions Toolbar directly above QR grid */}
            <div className="no-print" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setTransferSerials(serials.join('\n'));
                    document.getElementById('transfer-custody-card')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  ⚡ Auto-Fill Transfer Form
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => window.print()}
                >
                  🖨️ Print QR Codes
                </button>
              </div>
              <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>
                {serials.length} serials generated for Batch #{batchId}
              </span>
            </div>

            {/* QR Card Grid with exact typography and spacing */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-4">
              {serials.map(s => (
                <div
                  key={s}
                  className="flex flex-col items-center justify-center p-4 border rounded-xl bg-white shadow-sm hover:shadow-md transition-all break-inside-avoid"
                >
                  <div className="mb-3 p-2 bg-white rounded border">
                    <QRCodeSVG value={window.location.origin + '/v/' + s} size={150} />
                  </div>
                  <span className="font-mono text-xs text-gray-700 tracking-wider break-all select-all mt-2 text-center">
                    {s}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Form 2: Transfer Custody */}
      <div id="transfer-custody-card" className="section card">
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0 }}>Transfer Custody</h2>
          {/* Inline Batch Selector Dropdown */}
          <div className="inline-batch-selector" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label htmlFor="batch-select-dropdown" style={{ fontWeight: 600, fontSize: '0.875rem', color: '#475569' }}>
              Transfer entire batch:
            </label>
            <select
              id="batch-select-dropdown"
              value={selectedBatchId}
              onChange={(e) => {
                const bId = e.target.value;
                setSelectedBatchId(bId);
                const found = batches.find(b => String(b.batchId) === String(bId));
                if (found && found.serials?.length) {
                  setTransferSerials(found.serials.join('\n'));
                }
              }}
              style={{
                padding: '0.4rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              <option value="">[ Select Batch ▾ ]</option>
              {batches.map(b => (
                <option key={b.batchId} value={b.batchId}>
                  Batch #{b.batchId} — {b.productName} ({b.batchNo}) [{b.serials?.length || 0} serials]
                </option>
              ))}
            </select>
          </div>
        </div>

        <form onSubmit={handleTransferSubmit}>
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <label htmlFor="transferSerials" style={{ fontWeight: 600, margin: 0 }}>
                Serials (one per line or comma-separated)
              </label>
              {serials && serials.length > 0 && (
                <button
                  type="button"
                  className="btn secondary"
                  style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem' }}
                  onClick={() => setTransferSerials(serials.join('\n'))}
                >
                  Select All Serials from Batch #{batchId}
                </button>
              )}
            </div>
            <textarea
              id="transferSerials"
              value={transferSerials}
              onChange={(e) => setTransferSerials(e.target.value)}
              placeholder="ABC123XYZ0000001&#10;ABC123XYZ0000002"
              rows={5}
              style={{ fontFamily: 'monospace' }}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="toActorId">Recipient Actor ID</label>
            <input
              id="toActorId"
              type="number"
              min="1"
              value={toActorId}
              onChange={(e) => setToActorId(e.target.value)}
              placeholder="e.g. 2 (AfyaLink)"
              required
            />
            <small style={{ display: 'block', color: '#64748b', marginTop: '0.25rem' }}>
              Default ID 2: AfyaLink Distributors
            </small>
          </div>
          <button className="btn btn-primary" type="submit" disabled={transferLoading || !transferSerials.trim()}>
            {transferLoading ? 'Transferring…' : 'Transfer'}
          </button>
        </form>

        {transferError && <div className="banner banner-danger" style={{ marginTop: '0.75rem' }}>{transferError}</div>}
        {transferResult && (
          <div className="banner banner-ok" style={{ marginTop: '0.75rem' }}>
            ✓ {strings.messages?.custodyTransferred || `Transferred ${transferResult.transferred} serial(s)`}
          </div>
        )}
      </div>
    </div>
  );
}
