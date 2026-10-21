import { useCallback, useState, useEffect, useRef } from 'react';
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
  Camera,
  Image as ImageIcon
} from 'lucide-react';
import { api } from '../api';
import strings from '../strings.json';

const SCANNER_ID = 'distributor-reader';

const inputClass =
  'mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100';
const labelClass = 'block text-xs font-bold text-slate-700';
const primaryButtonClass =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-lg shadow-blue-500/20 px-4 py-3 text-sm transition disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer';

function extractSerial(text) {
  const raw = String(text ?? '').trim();
  if (!raw) return '';
  const match = raw.match(/\/v\/([^/?#\s]+)/);
  return (match ? decodeURIComponent(match[1]) : raw).toUpperCase();
}

function Metric({ icon: Icon, label, value, detail }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-500">{label}</span>
        <span className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
          <Icon size={20} />
        </span>
      </div>
      <p className="mt-4 text-3xl font-extrabold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
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
  const scannerRef = useRef(null);

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

  // Async camera lifecycle management
  useEffect(() => {
    let html5QrcodeScanner;
    let isMounted = true;

    const startScanner = async () => {
      try {
        const container = document.getElementById(SCANNER_ID);
        if (!container || !isMounted) return;

        const { Html5Qrcode } = await import('html5-qrcode');
        if (!isMounted) return;

        html5QrcodeScanner = new Html5Qrcode(SCANNER_ID);
        scannerRef.current = html5QrcodeScanner;

        await html5QrcodeScanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            if (isMounted) addSerial(decodedText);
          },
          (errorMessage) => {
            /* ignore minor frame parse errors */
          }
        );
      } catch (err) {
        console.warn('Camera auto-start failed:', err);
        if (isMounted) {
          setCameraError('Camera unavailable. Use gallery upload or manual input below.');
        }
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      if (html5QrcodeScanner && html5QrcodeScanner.isScanning) {
        html5QrcodeScanner
          .stop()
          .then(() => html5QrcodeScanner.clear().catch(console.error))
          .catch(console.error);
      } else if (html5QrcodeScanner) {
        html5QrcodeScanner.clear().catch(console.error);
      }
    };
  }, [addSerial]);

  // Gallery QR Image Upload Fallback
  const handleQrImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setCameraError('');

    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      let scanner = scannerRef.current;
      if (!scanner) {
        scanner = new Html5Qrcode(SCANNER_ID);
        scannerRef.current = scanner;
      }
      const decodedText = await scanner.scanFile(file, false);
      if (decodedText) {
        addSerial(decodedText);
      }
    } catch (err) {
      console.warn('QR file scan failed:', err);
      setCameraError('No QR code detected in the selected image. Please try another image or enter the serial manually.');
    } finally {
      event.target.value = '';
    }
  };

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
        <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3.5 py-1.5 text-xs font-bold text-blue-700">
          <ShieldCheck size={15} /> Authenticated Distributor Node · {actor?.name || 'AfyaLink Distributors'}
        </span>
      </div>

      {/* Hero Header — Bright Clinical Blue */}
      <section className="bg-slate-900 border border-blue-500/40 rounded-2xl p-6 md:p-8 shadow-xl shadow-blue-500/10 mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-blue-600 text-white tracking-wider uppercase mb-3 shadow-md shadow-blue-600/20">
              SUPPLY CHAIN MOVEMENT
            </span>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight mb-2">
              Distributor portal
            </h1>
            <p className="text-slate-300 text-sm md:text-base max-w-2xl">
              Record stock received from manufacturers and log dispatches to pharmacies with traceable hand-off details.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-950/70 text-blue-300 border border-blue-500/30">
                Traceable pack records
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-950/70 text-blue-300 border border-blue-500/30">
                Custody handoff
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-950/70 text-blue-300 border border-blue-500/30">
                Bulk Dispatch Queue
              </span>
            </div>
          </div>
          <div className="flex h-20 w-20 md:h-24 md:w-24 shrink-0 items-center justify-center rounded-2xl border border-blue-500/30 bg-blue-950/40 shadow-inner">
            <Truck size={40} className="text-blue-400" />
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
      <section className="mt-7 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div>
          <p className="text-[10px] font-extrabold tracking-[2px] text-blue-600 uppercase">
            SUPPLY CHAIN WORKSPACE
          </p>
          <h2 className="mt-1 text-xl font-extrabold text-slate-900">
            Record stock intake and dispatch
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Scan QR codes with the camera, upload a QR image from your gallery, or enter 16-character pack serials manually.
          </p>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* Scanner Pane with Camera + Gallery Upload Fallback */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-2">
                  <Camera size={18} className="text-blue-600" />
                  Camera QR Scanner
                </label>
              </div>

              {/* The guaranteed DOM container */}
              <div
                id={SCANNER_ID}
                className="qr-reader overflow-hidden rounded-xl bg-white border border-slate-200"
                style={{ minHeight: '220px' }}
              />

              {cameraError && (
                <div className="mt-2.5 rounded-xl bg-amber-50 border border-amber-200 p-2.5 text-xs text-amber-800" role="alert">
                  {cameraError}
                </div>
              )}
            </div>

            {/* Gallery QR Image Fallback Button */}
            <div className="mt-3 pt-3 border-t border-slate-200/80 flex items-center justify-between gap-2">
              <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 px-3 py-2 text-xs font-semibold transition">
                <ImageIcon size={15} className="text-blue-600" />
                Upload QR Image from Gallery
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleQrImageUpload}
                  style={{ display: 'none' }}
                />
              </label>
              <span className="text-[11px] text-slate-500">Instant scan</span>
            </div>
          </div>

          {/* Manual Entry Pane */}
          <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4">
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
              <span className="mt-2 block text-xs text-slate-500 font-normal">
                16-character Base32 serial printed under pack QR code.
              </span>
            </form>

            <div className="mt-4 rounded-xl bg-blue-50 p-3 text-xs leading-5 text-blue-900 border border-blue-200">
              Only scan or add serials for stock physically received in your warehouse or staged for immediate dispatch.
            </div>
          </div>
        </div>

        {/* Queue of Serials */}
        {serialsList.length > 0 && (
          <div className="mt-6 border-t border-slate-200 pt-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900">
                Transfer Queue ({serialsList.length} packs staged)
              </h3>
              <button
                type="button"
                onClick={() => setSerialsList([])}
                className="text-xs font-bold text-red-600 hover:underline cursor-pointer"
              >
                Clear Queue
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-2 divide-y divide-slate-100">
              {serialsList.map((serial) => (
                <div
                  key={serial}
                  className="flex items-center justify-between px-3 py-2 bg-white rounded-lg my-1 border border-slate-200 shadow-xs"
                >
                  <span className="font-mono text-xs font-bold text-slate-900 tracking-wider">
                    {serial}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setSerialsList((current) => current.filter((item) => item !== serial))
                    }
                    className="p-1 text-slate-400 hover:text-red-600 transition cursor-pointer"
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
        <form onSubmit={submitTransfer} className="mt-6 border-t border-slate-200 pt-6">
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
              <span className="mt-1 block text-xs text-slate-500 font-normal">
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
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 font-medium">
            ✓ {message}
          </div>
        )}
        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
            {error}
          </div>
        )}
      </section>

      {/* Activity & Workflow */}
      <section className="mt-7 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
              <Activity size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900">Recent supply activity</h3>
              <p className="text-xs text-slate-500">Latest distribution and custody transfers</p>
            </div>
          </div>
          <div className="mt-4 space-y-4">
            {activityLogs.length === 0 ? (
              <p className="text-xs text-slate-400">No events logged in this session yet.</p>
            ) : (
              activityLogs.map((log) => (
                <div key={log.id} className="flex gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                    <CheckCircle2 size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900">{log.title}</p>
                    <p className="mt-0.5 text-xs text-slate-600">{log.detail}</p>
                    <p className="mt-1 text-[11px] text-slate-400">{log.at}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700">
              <BadgeCheck size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900">Recommended workflow</h3>
              <p className="text-xs text-slate-500">How distributors maintain chain-of-custody</p>
            </div>
          </div>
          <ol className="mt-4 space-y-3">
            {[
              'Find the registered batch and confirm stock received.',
              'Record dispatch to the named destination pharmacy.',
              'Add location and reference details for each hand-off.'
            ].map((item, i) => (
              <li key={item} className="flex gap-3 text-sm leading-6 text-slate-700">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-extrabold text-blue-600">
                  {i + 1}
                </span>
                {item}
              </li>
            ))}
          </ol>
          <div className="mt-5 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600 border border-slate-200">
            Each custody transfer moves currentHolderId in the central database and appends an immutable event to the custody trail.
          </div>
        </div>
      </section>
    </div>
  );
}
