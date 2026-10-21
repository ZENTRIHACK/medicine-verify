import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Factory,
  FilePlus2,
  Package,
  ClipboardList,
  Activity,
  Send,
  Printer,
  Zap,
  CheckCircle2,
  BadgeCheck,
  ShieldCheck
} from 'lucide-react';
import { api } from '../api';
import strings from '../strings.json';

const inputClass =
  'mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-3 text-sm text-white placeholder-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30';
const labelClass = 'block text-xs font-bold text-slate-300';
const primaryButtonClass =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-lg shadow-blue-500/30 px-5 py-3 text-sm transition disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer';
const secondaryButtonClass =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer';

function Metric({ icon: Icon, label, value, detail }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-sky-400">{label}</span>
        <span className="rounded-xl bg-sky-500/15 p-2.5 text-sky-400 border border-sky-500/30">
          <Icon size={20} />
        </span>
      </div>
      <p className="mt-4 text-3xl font-extrabold text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{detail}</p>
    </div>
  );
}

export default function ManufacturerDash({ actor }) {
  // Batch registration state
  const [batchForm, setBatchForm] = useState({
    productName: '',
    batchNo: '',
    expiry: '',
    quantity: ''
  });
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

  // Activity log state
  const [activityLogs, setActivityLogs] = useState(() => {
    try {
      const stored = localStorage.getItem('zentriq_manufacturer_logs');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const handleBatchChange = (e) => {
    setBatchForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
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

      setBatches((prev) => {
        const next = [newBatch, ...prev.filter((b) => b.batchId !== data.batchId)];
        try {
          localStorage.setItem('zentriq_manufacturer_batches', JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
      setSelectedBatchId(String(data.batchId));

      const newLog = {
        id: Date.now(),
        type: 'batch_registered',
        title: `Batch registered: ${batchForm.productName}`,
        detail: `${generatedSerials.length} pack serials generated for batch ${batchForm.batchNo}`,
        at: new Date().toLocaleTimeString()
      };
      setActivityLogs((prev) => {
        const next = [newLog, ...prev.slice(0, 9)];
        try {
          localStorage.setItem('zentriq_manufacturer_logs', JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
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
        .map((s) => s.trim())
        .filter(Boolean);
      const data = await api.transferCustody(serialsArray, parseInt(toActorId, 10));
      setTransferResult(data);

      const newLog = {
        id: Date.now(),
        type: 'custody_transferred',
        title: `Custody transferred to Actor #${toActorId}`,
        detail: `${serialsArray.length} serials dispatched`,
        at: new Date().toLocaleTimeString()
      };
      setActivityLogs((prev) => {
        const next = [newLog, ...prev.slice(0, 9)];
        try {
          localStorage.setItem('zentriq_manufacturer_logs', JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
    } catch (err) {
      setTransferError(err.message || strings.messages?.custodyError);
    } finally {
      setTransferLoading(false);
    }
  };

  const totalSerialsCount = batches.reduce((sum, b) => sum + (b.serials?.length || b.quantity || 0), 0);
  const totalBatchesCount = batches.length;
  const totalActivitiesCount = activityLogs.length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10">
      {/* Top Status Bar with Luminous Sky Badge */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/15 px-3.5 py-1.5 text-xs font-bold text-sky-400">
          <ShieldCheck size={15} /> Authenticated Manufacturer Node · {actor?.name || 'Zenocare Labs'}
        </span>
      </div>

      {/* Hero Section */}
      <section className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 md:p-8 backdrop-blur-xl shadow-2xl mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/15 text-sky-400 border border-sky-500/30 uppercase tracking-wider mb-3">
              ORIGIN OF THE SUPPLY CHAIN
            </span>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight mb-2">
              Manufacturer portal
            </h1>
            <p className="text-slate-400 text-sm md:text-base max-w-2xl">
              Register medicine batches and assign a unique identifier to each pack before it leaves the manufacturing site.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800/80 text-slate-300 border border-slate-700/50">
                Traceable pack records
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800/80 text-slate-300 border border-slate-700/50">
                Event history
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800/80 text-slate-300 border border-slate-700/50">
                Cryptographic 16-Char Serials
              </span>
            </div>
          </div>
          <div className="flex h-20 w-20 md:h-24 md:w-24 shrink-0 items-center justify-center rounded-2xl border border-slate-700/50 bg-slate-800/50 shadow-inner">
            <Factory size={40} className="text-blue-400" />
          </div>
        </div>
      </section>

      {/* Metrics Row */}
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <Metric
          icon={Package}
          label="Pack records"
          value={totalSerialsCount}
          detail="Pack identifiers registered"
        />
        <Metric
          icon={ClipboardList}
          label="Batch numbers"
          value={totalBatchesCount}
          detail="Distinct registered batches"
        />
        <Metric
          icon={Activity}
          label="Supply events"
          value={totalActivitiesCount}
          detail="Batch registrations & custody transfers"
        />
      </div>

      {/* Form 1: Batch Registration Card */}
      <section className="mt-7 rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl sm:p-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-extrabold tracking-[2px] text-sky-400 uppercase">
              SUPPLY CHAIN WORKSPACE
            </p>
            <h2 className="mt-1 text-xl font-extrabold text-white">
              Register medicine batch
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Generate unique 16-character cryptographic serials and printable QR codes for each physical unit.
            </p>
          </div>
        </div>

        <form onSubmit={handleBatchSubmit} className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className={labelClass}>
            Medicine / product name *
            <input
              className={inputClass}
              id="productName"
              name="productName"
              type="text"
              value={batchForm.productName}
              onChange={handleBatchChange}
              placeholder="e.g. Paracetamol 500mg"
              required
            />
          </label>

          <label className={labelClass}>
            Batch number *
            <input
              className={inputClass}
              id="batchNo"
              name="batchNo"
              type="text"
              value={batchForm.batchNo}
              onChange={handleBatchChange}
              placeholder="e.g. BATCH-2026-001"
              required
            />
          </label>

          <label className={labelClass}>
            Expiry date *
            <input
              className={inputClass}
              id="expiry"
              name="expiry"
              type="date"
              value={batchForm.expiry}
              onChange={handleBatchChange}
              required
            />
          </label>

          <label className={labelClass}>
            Pack quantity in batch *
            <input
              className={inputClass}
              id="quantity"
              name="quantity"
              type="number"
              min="1"
              value={batchForm.quantity}
              onChange={handleBatchChange}
              placeholder="e.g. 10"
              required
            />
          </label>

          <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
            <button
              className={primaryButtonClass}
              type="submit"
              disabled={batchLoading}
            >
              <FilePlus2 size={17} />
              {batchLoading ? 'Registering…' : 'Register medicine batch'}
            </button>
          </div>
        </form>

        {batchError && (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300" role="alert">
            {batchError}
          </div>
        )}

        {/* QR Print View & Auto-fill Actions */}
        {serials && serials.length > 0 && (
          <div className="mt-6 border-t border-slate-800 pt-6">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-300">
              <strong className="block text-sm font-bold">
                ✓ Batch #{batchId} registered — {serials.length} pack serial(s) generated
              </strong>
              <span className="text-xs text-emerald-400">
                Print QR codes for pack application or auto-fill the transfer form below to dispatch to a distributor.
              </span>
            </div>

            {/* Actions Toolbar directly above QR grid */}
            <div className="no-print mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={primaryButtonClass}
                  onClick={() => {
                    setTransferSerials(serials.join('\n'));
                    document.getElementById('transfer-custody-card')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  <Zap size={16} /> Auto-Fill Transfer Form
                </button>
                <button
                  type="button"
                  className={secondaryButtonClass}
                  onClick={() => window.print()}
                >
                  <Printer size={16} /> Print QR Codes
                </button>
              </div>
              <span className="text-xs font-semibold text-slate-400">
                {serials.length} serials for Batch #{batchId}
              </span>
            </div>

            {/* QR Card Grid with exact typography and spacing */}
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-6 p-4 rounded-2xl bg-slate-950 border border-slate-800">
              {serials.map((s) => (
                <div
                  key={s}
                  className="flex flex-col items-center justify-center p-4 border border-slate-800 rounded-xl bg-slate-900 shadow-sm hover:border-slate-700 transition-all break-inside-avoid"
                >
                  <div className="mb-3 p-2 bg-white rounded border border-slate-700">
                    <QRCodeSVG value={window.location.origin + '/v/' + s} size={150} />
                  </div>
                  <span className="font-mono text-xs text-slate-300 tracking-wider break-all select-all mt-2 text-center">
                    {s}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Form 2: Custody Transfer Card */}
      <section
        id="transfer-custody-card"
        className="mt-7 rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl sm:p-8"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-extrabold tracking-[2px] text-sky-400 uppercase">
              DOWNSTREAM HANDOFF
            </p>
            <h2 className="mt-1 text-xl font-extrabold text-white">
              Transfer custody to distributor
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Select an entire batch or enter serials to transfer ownership down the supply chain.
            </p>
          </div>

          {/* Inline Batch Selector Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-300">Transfer entire batch:</span>
            <select
              id="batch-select-dropdown"
              value={selectedBatchId}
              onChange={(e) => {
                const bId = e.target.value;
                setSelectedBatchId(bId);
                const found = batches.find((b) => String(b.batchId) === String(bId));
                if (found && found.serials?.length) {
                  setTransferSerials(found.serials.join('\n'));
                }
              }}
              className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-bold text-white outline-none transition focus:border-blue-500"
            >
              <option value="">[ Select Batch ▾ ]</option>
              {batches.map((b) => (
                <option key={b.batchId} value={b.batchId}>
                  Batch #{b.batchId} — {b.productName} ({b.batchNo}) [{b.serials?.length || 0} serials]
                </option>
              ))}
            </select>
          </div>
        </div>

        <form onSubmit={handleTransferSubmit} className="mt-6 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="transferSerials" className={labelClass}>
                Serials (one per line or comma-separated) *
              </label>
              {serials && serials.length > 0 && (
                <button
                  type="button"
                  className="text-xs font-bold text-sky-400 hover:underline cursor-pointer"
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
              rows={4}
              className={`${inputClass} font-mono`}
              required
            />
          </div>

          <label className={labelClass}>
            Recipient actor ID *
            <input
              id="toActorId"
              type="number"
              min="1"
              value={toActorId}
              onChange={(e) => setToActorId(e.target.value)}
              placeholder="e.g. 2 (AfyaLink Distributors)"
              className={inputClass}
              required
            />
            <span className="mt-1 block text-xs text-slate-400 font-normal">
              Default ID 2: AfyaLink Distributors
            </span>
          </label>

          <div className="flex justify-end pt-1">
            <button
              className={primaryButtonClass}
              type="submit"
              disabled={transferLoading || !transferSerials.trim()}
            >
              <Send size={16} />
              {transferLoading ? 'Transferring…' : 'Transfer custody'}
            </button>
          </div>
        </form>

        {transferError && (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300" role="alert">
            {transferError}
          </div>
        )}
        {transferResult && (
          <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
            ✓ {strings.messages?.custodyTransferred || `Transferred ${transferResult.transferred} serial(s)`}
          </div>
        )}
      </section>

      {/* Activity & Workflow */}
      <section className="mt-7 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-sky-500/15 p-2.5 text-sky-400 border border-sky-500/30">
              <Activity size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-white">Recent supply activity</h3>
              <p className="text-xs text-slate-400">Latest manufacturing and dispatch events</p>
            </div>
          </div>
          <div className="mt-4 space-y-4">
            {activityLogs.length === 0 ? (
              <p className="text-xs text-slate-500">No events logged in this session yet.</p>
            ) : (
              activityLogs.map((log) => (
                <div key={log.id} className="flex gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30">
                    <CheckCircle2 size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-white">{log.title}</p>
                    <p className="mt-0.5 text-xs text-slate-400">{log.detail}</p>
                    <p className="mt-1 text-[11px] text-slate-500">{log.at}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-500/15 p-2.5 text-emerald-400 border border-emerald-500/30">
              <BadgeCheck size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-white">Recommended workflow</h3>
              <p className="text-xs text-slate-400">How manufacturing contributes to the supply chain</p>
            </div>
          </div>
          <ol className="mt-4 space-y-3">
            {[
              'Register the medicine and batch details.',
              'Assign a unique code to each individual pack.',
              'Share the batch with an authorized distributor.'
            ].map((item, i) => (
              <li key={item} className="flex gap-3 text-sm leading-6 text-slate-300">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-500/15 text-xs font-extrabold text-sky-400 border border-sky-500/30">
                  {i + 1}
                </span>
                {item}
              </li>
            ))}
          </ol>
          <div className="mt-5 rounded-xl bg-slate-950 p-3 text-xs leading-5 text-slate-400 border border-slate-800">
            For the production system, each event is cryptographically timestamped, recorded on the registry, and validated against the organization&apos;s permissions.
          </div>
        </div>
      </section>
    </div>
  );
}
