import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../api';

export default function ManufacturerDash() {
  const [batch, setBatch] = useState({ productName: '', batchNo: '', expiry: '', quantity: '' });
  const [serials, setSerials] = useState([]);
  const [transferSerials, setTransferSerials] = useState('');
  const [toActorId, setToActorId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function createBatch(event) {
    event.preventDefault();
    setMessage(''); setError('');
    try {
      const response = await api.registerBatch({ ...batch, quantity: Number(batch.quantity) });
      setSerials(response.serials || []);
      setMessage('Batch registered successfully.');
    } catch { setError('Unable to register this batch.'); }
  }

  async function transfer(event) {
    event.preventDefault();
    const list = transferSerials.split(/[\s,]+/).map((item) => item.trim()).filter(Boolean);
    if (!list.length || !toActorId.trim()) return;
    setMessage(''); setError('');
    try {
      await api.transferCustody(list, toActorId.trim());
      setMessage('Custody transfer submitted successfully.');
    } catch { setError('Unable to transfer custody.'); }
  }

  return <main className="page-container manufacturer-dashboard">
    <section className="card no-print">
      <h1>Manufacturer dashboard</h1><h2>Create Batch</h2>
      <form onSubmit={createBatch}>
        <label htmlFor="product-name">Product name</label>
        <input id="product-name" value={batch.productName} onChange={(event) => setBatch({ ...batch, productName: event.target.value })} required />
        <label htmlFor="batch-number">Batch number</label>
        <input id="batch-number" value={batch.batchNo} onChange={(event) => setBatch({ ...batch, batchNo: event.target.value })} required />
        <label htmlFor="batch-expiry">Expiry</label>
        <input id="batch-expiry" type="date" value={batch.expiry} onChange={(event) => setBatch({ ...batch, expiry: event.target.value })} required />
        <label htmlFor="batch-quantity">Quantity</label>
        <input id="batch-quantity" type="number" min="1" step="1" value={batch.quantity} onChange={(event) => setBatch({ ...batch, quantity: event.target.value })} required />
        <button type="submit">Create Batch</button>
      </form>
    </section>
    {serials.length > 0 && <section className="card print-area">
      <div className="print-controls no-print"><h2>Batch QR codes</h2><button type="button" onClick={() => window.print()}>Print</button></div>
      <div className="qr-grid">{serials.map((serial) => <article className="qr-card" key={serial}>
        <QRCodeSVG value={`${window.location.origin}/v/${serial}`} size={144} />
        <span>{serial}</span>
      </article>)}</div>
    </section>}
    <section className="card no-print">
      <h2>Transfer Custody</h2>
      <form onSubmit={transfer}>
        <label htmlFor="transfer-serials">Serials</label>
        <textarea id="transfer-serials" rows="4" value={transferSerials} onChange={(event) => setTransferSerials(event.target.value)} placeholder="Enter serials separated by spaces, commas, or new lines" required />
        <label htmlFor="to-actor-id">Destination actor ID</label>
        <input id="to-actor-id" value={toActorId} onChange={(event) => setToActorId(event.target.value)} required />
        <button type="submit">Transfer Custody</button>
      </form>
    </section>
    {message && <div className="alert alert--ok no-print" role="status">{message}</div>}
    {error && <div className="alert alert--flag no-print" role="alert">{error}</div>}
  </main>;
}
