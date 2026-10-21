import { useCallback, useState } from 'react';
import {
  Truck,
  Package,
  Store,
  Activity,
  Send,
  Plus,
  Trash2,
  CheckCircle2,
  BadgeCheck,
  ShieldCheck,
  Camera
} from 'lucide-react';
import useQrScanner, { SCANNER_ERROR_MESSAGES } from '../hooks/useQrScanner';
import { api } from '../api';
import strings from '../strings.json';

const SCANNER_ID = 'distributor-qr-reader';

const inputClass =
  'mt-1.5 w-full rounded-xl border border-[#E5E1EF] bg-white px-3.5 py-3 text-sm text-[#242039] outline-none transition focus:border-[#176B87] focus:ring-2 focus:ring-sky-100';
const labelClass = 'block text-xs font-bold text-[#514B67]';
const primaryButtonClass =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-[#176B87] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#125B73] disabled:cursor-not-allowed disabled:opacity-50';

function extractSerial(text) {
  const raw = String(text ?? '').trim();
  if (!raw) return '';
  const match = raw.match(/\/v\/([^/?#\s]+)/);
  return (match ? decodeURIComponent(match[1]) : raw).toUpperCase();
}

function Metric({ icon: Icon, label, value, detail }) {
  return (
    <div className="rounded-2xl border border-[#E9E5F1] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-500">{label}</span>
        <span className="rounded-xl bg-sky-50 p-2.5 text-[#176B87]">
          <Icon size={20} />
        </span>
      </div>
      <p className="mt-4 text-3xl font-extrabold text-[#242039]">{value}</p>
      <p className="mt-1 text-xs text-gray-400">{detail}</p>
    </div>
  );
}

export default function DistributorDash({ actor }) {
  const [serialInput, setSerialInput] = useState('');
  const [serialsList, setSerialsList] = useState([]);
  const [toActorId, setToActorId] = useState('3');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [cameraError, setCameraError] = useState('');
  const [transferring, setTransferring] = useState(false);

  const [activityLogs, setActivityLogs] = useState(() => {
    try {
      const stored = localStorage.getItem('zentriq_distributor_logs');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const addSerial = useCallback((value) => {
    const clean = extractSerial(value);
    if (!clean) return;
    setSerialsList((current) => (current.includes(clean) ? current : [...current, clean]));
    setSerialInput('');
  }, []);

  const handleCamera = useCallback(
    (value, camErr) => {
      if (camErr) {
        setCameraError(camErr.message || SCANNER_ERROR_MESSAGES.generic);
        return;
      }
      setCameraError('');
      addSerial(value);
    },
    [addSerial]
  );

  useQrScanner(SCANNER_ID, handleCamera);

  async function submitTransfer(event) {
    event.preventDefault();
    if (!serialsList.length) return;
    const destActorId = parseInt(toActorId || '3', 10);
    setMessage('');
    setError('');
    setTransferring(true);
    try {
      await api.transferCustody(serialsList, destActorId);
      setMessage(
        strings.messages?.custodyTransferred ||
          `Custody transferred for ${serialsList.length} serial(s)`
      );

      const newLog = {
        id: Date.now(),
        type: 'custody_dispatched',
        title: `Dispatched to Pharmacy Actor #${destActorId}`,
        detail: `${serialsList.length} pack serials transferred`,
        at: new Date().toLocaleTimeString()
      };
      setActivityLogs((prev) => {
        const next = [newLog, ...prev.slice(0, 9)];
        try {
          localStorage.setItem('zentriq_distributor_logs', JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });

      setSerialsList([]);
    } catch (err) {
      setError(err?.message || strings.messages?.custodyError || 'Failed to transfer custody.');
    } finally {
      setTransferring(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10">
      {/* Top Status Bar */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3.5 py-1.5 text-xs font-bold text-[#176B87]">
          <ShieldCheck size={15} /> Authenticated Distributor Node · {actor?.name || 'AfyaLink Distributors'}
        </span>
      </div>

      {/* Hero Section matching Friend's Netlify Design */}
      <section className="overflow-hidden rounded-3xl bg-[#102C38] text-white shadow-sm">
        <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-[10px] font-extrabold tracking-[2.4px] text-sky-200 uppercase">
              SUPPLY CHAIN MOVEMENT
            </p>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Distributor portal
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-sky-100">
              Record stock received from manufacturers and log dispatches to pharmacies with traceable hand-off details.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold">
                Traceable pack records
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold">
                Custody handoff
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold">
                Bulk Dispatch Queue
              </span>
            </div>
          </div>
          <div className="flex h-24 w-24 items-center justify-center rounded-3xl border border-white/15 bg-white/10">
            <Truck size={48} className="text-sky-200" />
          </div>
        </div>
      </section>

      {/* Metrics Row */}
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <Metric
          icon={Package}
          label="Packs in queue"
          value={serialsList.length}
          detail="Awaiting dispatch transfer"
        />
        <Metric
          icon={Store}
          label="Destination"
          value={`Actor #${toActorId || '3'}`}
          detail="Mlimani Pharmacy (default)"
        />
        <Metric
          icon={Activity}
          label="Handoff events"
          value={activityLogs.length}
          detail="Dispatches logged this session"
        />
      </div>

      {/* Main Workspace: Side-by-side Scanner and Manual Input */}
      <section className="mt-7 rounded-3xl border border-[#E9E5F1] bg-white p-5 shadow-sm sm:p-6">
        <div>
          <p className="text-[10px] font-extrabold tracking-[2px] text-[#176B87] uppercase">
            SUPPLY CHAIN WORKSPACE
          </p>
          <h2 className="mt-1 text-xl font-extrabold text-[#242039]">
            Record stock intake and dispatch
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Scan QR codes with the camera or enter 16-character pack serials manually to build a transfer queue.
          </p>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* Scanner Pane */}
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Camera size={18} className="text-[#176B87]" />
              <label className="text-xs font-bold text-[#514B67]">
                Camera QR Scanner
              </label>
            </div>
            <div
              id={SCANNER_ID}
              className="qr-reader overflow-hidden rounded-xl bg-white border border-gray-200"
              style={{ minHeight: '220px' }}
            />
            {cameraError && (
              <div className="mt-2 rounded-xl bg-red-50 p-2 text-xs text-red-700" role="alert">
                {cameraError}
              </div>
            )}
          </div>

          {/* Manual Entry Pane */}
          <div className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addSerial(serialInput);
              }}
            >
              <label htmlFor="distributor-serial" className={labelClass}>
                Manual 16-character serial entry
              </label>
              <div className="mt-2 flex gap-2">
                <input
                  id="distributor-serial"
                  value={serialInput}
                  onChange={(e) => setSerialInput(e.target.value.toUpperCase())}
                  placeholder="e.g. K7Q2M9XW4TBH3N8D"
                  maxLength={16}
                  autoComplete="off"
                  className={`${inputClass} font-mono mt-0`}
                />
                <button
                  type="submit"
                  className={primaryButtonClass}
                  disabled={!serialInput.trim()}
                >
                  <Plus size={16} /> Add
                </button>
              </div>
              <span className="mt-2 block text-xs text-gray-500">
                16-character Base32 serial printed under pack QR code.
              </span>
            </form>

            <div className="mt-4 rounded-xl bg-sky-50 p-3 text-xs leading-5 text-sky-900 border border-sky-100">
              Only scan or add serials for stock physically received in your warehouse or staged for immediate dispatch.
            </div>
          </div>
        </div>

        {/* Queue of Serials */}
        {serialsList.length > 0 && (
          <div className="mt-6 border-t border-[#EEEAF5] pt-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-[#242039]">
                Transfer Queue ({serialsList.length} packs staged)
              </h3>
              <button
                type="button"
                onClick={() => setSerialsList([])}
                className="text-xs font-bold text-red-600 hover:underline"
              >
                Clear Queue
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto rounded-xl border border-gray-200 bg-gray-50 p-2 divide-y divide-gray-100">
              {serialsList.map((serial) => (
                <div
                  key={serial}
                  className="flex items-center justify-between px-3 py-2 bg-white rounded-lg my-1 shadow-xs"
                >
                  <span className="font-mono text-xs font-bold text-gray-800 tracking-wider">
                    {serial}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setSerialsList((current) => current.filter((item) => item !== serial))
                    }
                    className="p-1 text-gray-400 hover:text-red-600 transition"
                    aria-label={`Remove ${serial}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transfer Action to Destination Pharmacy */}
        <form onSubmit={submitTransfer} className="mt-6 border-t border-[#EEEAF5] pt-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>
              Destination pharmacy actor ID *
              <input
                id="destination-pharmacy"
                type="number"
                min="1"
                value={toActorId}
                onChange={(e) => setToActorId(e.target.value)}
                placeholder="3 (Mlimani Pharmacy)"
                className={inputClass}
                required
              />
              <span className="mt-1 block text-xs text-gray-500 font-normal">
                Default ID 3: Mlimani Pharmacy
              </span>
            </label>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              className={primaryButtonClass}
              disabled={!serialsList.length || transferring}
            >
              <Send size={16} />
              {transferring
                ? 'Transferring…'
                : `Bulk Transfer ${serialsList.length} Serial(s) to Pharmacy`}
            </button>
          </div>
        </form>

        {message && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            ✓ {message}
          </div>
        )}
        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
            {error}
          </div>
        )}
      </section>

      {/* Friend's Bottom Sections: Activity & Workflow */}
      <section className="mt-7 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#E9E5F1] bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-sky-50 p-2.5 text-[#176B87]">
              <Activity size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-[#242039]">Recent supply activity</h3>
              <p className="text-xs text-gray-500">Latest distribution and custody transfers</p>
            </div>
          </div>
          <div className="mt-4 space-y-4">
            {activityLogs.length === 0 ? (
              <p className="text-xs text-gray-400">No events logged in this session yet.</p>
            ) : (
              activityLogs.map((log) => (
                <div key={log.id} className="flex gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-50 text-[#176B87]">
                    <CheckCircle2 size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-[#242039]">{log.title}</p>
                    <p className="mt-0.5 text-xs text-gray-500">{log.detail}</p>
                    <p className="mt-1 text-[11px] text-gray-400">{log.at}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-[#E9E5F1] bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700">
              <BadgeCheck size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-[#242039]">Recommended workflow</h3>
              <p className="text-xs text-gray-500">How distributors maintain chain-of-custody</p>
            </div>
          </div>
          <ol className="mt-4 space-y-3">
            {[
              'Find the registered batch and confirm stock received.',
              'Record dispatch to the named destination pharmacy.',
              'Add location and reference details for each hand-off.'
            ].map((item, i) => (
              <li key={item} className="flex gap-3 text-sm leading-6 text-gray-600">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#E8F3F7] text-xs font-extrabold text-[#176B87]">
                  {i + 1}
                </span>
                {item}
              </li>
            ))}
          </ol>
          <div className="mt-5 rounded-xl bg-[#F8F6FC] p-3 text-xs leading-5 text-gray-500">
            Each custody transfer moves currentHolderId in the central database and appends an immutable event to the custody trail.
          </div>
        </div>
      </section>
    </div>
  );
}
