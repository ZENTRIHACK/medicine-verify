import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Store,
  Package,
  Activity,
  AlertTriangle,
  Camera,
  Image as ImageIcon,
  CheckCircle2,
  BadgeCheck,
  ShieldCheck,
  Send
} from 'lucide-react';
import { api } from '../api';
import strings from '../strings.json';

const SCANNER_ID = 'pharmacy-reader';

const inputClass =
  'mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-3 text-sm text-white placeholder-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30';
const labelClass = 'block text-xs font-bold text-slate-300';
const primaryButtonClass =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-lg shadow-blue-500/30 px-5 py-3 text-sm transition disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer';

function extractSerial(text) {
  const raw = String(text ?? '').trim();
  if (!raw) return '';
  const match = raw.match(/\/v\/([^/?#\s]+)/);
  return (match ? decodeURIComponent(match[1]) : raw).toUpperCase();
}

function Metric({ icon: Icon, label, value, detail, alert }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-sky-400">{label}</span>
        <span
          className={`rounded-xl p-2.5 border ${
            alert
              ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
              : 'bg-sky-500/15 text-sky-400 border-sky-500/30'
          }`}
        >
          <Icon size={20} />
        </span>
      </div>
      <p className="mt-4 text-3xl font-extrabold text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{detail}</p>
    </div>
  );
}

export default function PharmacyDash({ actor }) {
  const [serial, setSerial] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cameraError, setCameraError] = useState('');
  const scannerRef = useRef(null);

  const [dispensedCount, setDispensedCount] = useState(0);
  const [conflictCount, setConflictCount] = useState(0);

  const [activityLogs, setActivityLogs] = useState(() => {
    try {
      const stored = localStorage.getItem('zentriq_pharmacy_logs');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const handleDispense = useCallback(async (dispenseSerial) => {
    const cleanSerial = extractSerial(dispenseSerial);
    if (!cleanSerial) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await api.dispense(cleanSerial);
      setResult(data);

      if (data.result === 'ok') {
        setDispensedCount((c) => c + 1);
        const newLog = {
          id: Date.now(),
          type: 'dispensed_ok',
          title: `Pack dispensed: ${cleanSerial}`,
          detail: 'Dispense recorded on registry',
          at: new Date().toLocaleTimeString()
        };
        setActivityLogs((prev) => {
          const next = [newLog, ...prev.slice(0, 9)];
          try {
            localStorage.setItem('zentriq_pharmacy_logs', JSON.stringify(next));
          } catch {
            /* ignore */
          }
          return next;
        });
      } else if (data.result === 'conflict') {
        setConflictCount((c) => c + 1);
        const newLog = {
          id: Date.now(),
          type: 'dispensed_conflict',
          title: `Double-dispense alert: ${cleanSerial}`,
          detail: `Conflict with ${data.conflictWith?.actorName || 'previous dispenser'}`,
          at: new Date().toLocaleTimeString()
        };
        setActivityLogs((prev) => {
          const next = [newLog, ...prev.slice(0, 9)];
          try {
            localStorage.setItem('zentriq_pharmacy_logs', JSON.stringify(next));
          } catch {
            /* ignore */
          }
          return next;
        });
      }
    } catch (err) {
      setError(err?.message || 'Dispense request failed');
    } finally {
      setLoading(false);
    }
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
            if (isMounted) handleDispense(decodedText);
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
  }, [handleDispense]);

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
        handleDispense(decodedText);
      }
    } catch (err) {
      console.warn('QR file scan failed:', err);
      setCameraError('No QR code detected in the selected image. Please try another image or enter the serial manually.');
    } finally {
      event.target.value = '';
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    const cleanSerial = extractSerial(serial);
    if (!cleanSerial) return;
    handleDispense(cleanSerial);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10">
      {/* Top Status Bar with Luminous Sky Tag */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/15 px-3.5 py-1.5 text-xs font-bold text-sky-400">
          <ShieldCheck size={15} /> Authenticated Pharmacy Node · {actor?.name || 'Mlimani Pharmacy'}
        </span>
      </div>

      {/* Hero Section */}
      <section className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 md:p-8 backdrop-blur-xl shadow-2xl mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/15 text-sky-400 border border-sky-500/30 uppercase tracking-wider mb-3">
              LAST-MILE DISPENSING
            </span>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight mb-2">
              Pharmacy portal
            </h1>
            <p className="text-slate-400 text-sm md:text-base max-w-2xl">
              Record pharmacy stock receipt and dispensing events so a pack&apos;s journey can be reviewed later.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800/80 text-slate-300 border border-slate-700/50">
                Traceable pack records
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800/80 text-slate-300 border border-slate-700/50">
                Double-dispense prevention
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800/80 text-slate-300 border border-slate-700/50">
                Point-of-sale verification
              </span>
            </div>
          </div>
          <div className="flex h-20 w-20 md:h-24 md:w-24 shrink-0 items-center justify-center rounded-2xl border border-slate-700/50 bg-slate-800/50 shadow-inner">
            <Store size={40} className="text-blue-400" />
          </div>
        </div>
      </section>

      {/* Metrics Row */}
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <Metric
          icon={Package}
          label="Packs dispensed"
          value={dispensedCount}
          detail="Recorded in this session"
        />
        <Metric
          icon={AlertTriangle}
          label="Conflict alerts"
          value={conflictCount}
          detail="Double-dispense prevented"
          alert={conflictCount > 0}
        />
        <Metric
          icon={Activity}
          label="Registry events"
          value={activityLogs.length}
          detail="Patient handoffs recorded"
        />
      </div>

      {/* Main Workspace: Side-by-side Scanner and Manual 16-character Entry */}
      <section className="mt-7 rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl sm:p-8">
        <div>
          <p className="text-[10px] font-extrabold tracking-[2px] text-sky-400 uppercase">
            POINT OF CARE WORKSPACE
          </p>
          <h2 className="mt-1 text-xl font-extrabold text-white">
            Verify and dispense medicine
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Scan the pack QR code, upload a QR image from gallery, or enter the 16-character serial before handing the medicine to the patient.
          </p>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* Scanner Pane */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
                  <Camera size={18} className="text-sky-400" />
                  Dispense Camera Scanner
                </label>
              </div>

              {/* The guaranteed DOM container */}
              <div
                id={SCANNER_ID}
                className="overflow-hidden rounded-xl bg-slate-900 border border-slate-800"
                style={{ minHeight: '220px' }}
              />

              {cameraError && (
                <div className="mt-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 p-2.5 text-xs text-amber-300" role="alert">
                  {cameraError}
                </div>
              )}
            </div>

            {/* Gallery QR Image Fallback Button */}
            <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
              <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3.5 py-2 text-xs font-semibold transition">
                <ImageIcon size={15} className="text-sky-400" />
                Upload QR Image from Gallery
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleQrImageUpload}
                  style={{ display: 'none' }}
                />
              </label>
              <span className="text-[11px] text-slate-400">Instant scan</span>
            </div>
          </div>

          {/* Manual Entry Pane */}
          <div className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-950 p-4">
            <form onSubmit={handleManualSubmit}>
              <label htmlFor="pharmacy-serial-input" className={labelClass}>
                Manual 16-character serial entry
              </label>
              <div className="mt-2 flex gap-2">
                <input
                  id="pharmacy-serial-input"
                  type="text"
                  value={serial}
                  onChange={(e) => setSerial(e.target.value.toUpperCase())}
                  placeholder="e.g. K7Q2M9XW4TBH3N8D"
                  maxLength={16}
                  autoComplete="off"
                  className={`${inputClass} font-mono mt-0`}
                />
                <button
                  type="submit"
                  className={primaryButtonClass}
                  disabled={!serial.trim() || loading}
                >
                  <Send size={16} /> Dispense
                </button>
              </div>
              <span className="mt-2 block text-xs text-slate-400 font-normal">
                16-character Base32 serial printed under the pack QR code.
              </span>
            </form>

            <div className="mt-4 rounded-xl bg-sky-500/10 p-3 text-xs leading-5 text-sky-200 border border-sky-500/20">
              Double-dispense protection active: if this pack was previously dispensed anywhere in the country, an immediate conflict alert is raised.
            </div>
          </div>
        </div>

        {/* Loading indicator */}
        {loading && (
          <p className="mt-4 text-sm font-semibold text-sky-400 animate-pulse">
            Processing dispense request on central registry…
          </p>
        )}

        {/* Standard Error banner */}
        {error && (
          <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300 font-medium" role="alert">
            {error}
          </div>
        )}

        {/* Dispense OK Result */}
        {result && result.result === 'ok' && (
          <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-300">
            <strong className="block text-sm font-bold">
              ✓ {strings.messages?.dispenseOk || 'Dispensed successfully'}
            </strong>
            {result.txHash && (
              <p className="font-mono text-xs text-emerald-400 mt-1">
                Transaction Hash: {result.txHash}
              </p>
            )}
            {result.flags && result.flags.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs text-emerald-400">
                {result.flags.map((flag, i) => (
                  <li key={i}>• {flag}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      {/* High-Priority Red Alert Overlay on Conflict */}
      {result && result.result === 'conflict' && (
        <div
          className="conflict-overlay"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="conflict-alert-title"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(5px)',
            WebkitBackdropFilter: 'blur(5px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem'
          }}
        >
          <div
            className="conflict-modal rounded-3xl bg-slate-900 p-6 shadow-2xl sm:p-8 max-w-lg w-full border-4 border-rose-600 text-center"
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/20 text-rose-400 mb-4 border border-rose-500/30">
              <AlertTriangle size={36} />
            </div>

            <h2
              id="conflict-alert-title"
              className="text-2xl font-black text-rose-400 tracking-tight"
            >
              {strings.status?.conflict || 'DOUBLE DISPENSE CONFLICT'}
            </h2>

            <p className="mt-2 text-sm text-slate-300">
              This pack has already been recorded as dispensed. Do NOT release this medicine to the patient.
            </p>

            <div className="mt-5 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-left">
              <p className="text-sm text-rose-200 mb-2">
                <span className="font-bold">Previously dispensed by:</span>{' '}
                <span className="font-extrabold text-white">
                  {result.conflictWith?.actorName || 'Unknown'}
                </span>
              </p>
              <p className="text-sm text-rose-200">
                <span className="font-bold">At:</span>{' '}
                <span className="font-extrabold text-white">
                  {result.conflictWith?.at
                    ? new Date(result.conflictWith.at).toLocaleString()
                    : 'Unknown'}
                </span>
              </p>
            </div>

            {result.flags && result.flags.length > 0 && (
              <div className="mt-4 text-left">
                <strong className="text-xs font-bold text-rose-400 uppercase tracking-wide">
                  Flags recorded:
                </strong>
                <ul className="mt-1 list-disc pl-5 text-xs text-rose-300 space-y-1">
                  {result.flags.map((flag, i) => (
                    <li key={i}>{flag}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-6">
              <button
                type="button"
                onClick={() => setResult(null)}
                className="w-full rounded-xl bg-rose-600 hover:bg-rose-500 py-3.5 text-sm font-extrabold text-white transition shadow-lg cursor-pointer"
              >
                Acknowledge Alert
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Activity & Workflow */}
      <section className="mt-7 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-sky-500/15 p-2.5 text-sky-400 border border-sky-500/30">
              <Activity size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-white">Recent supply activity</h3>
              <p className="text-xs text-slate-400">Latest pharmacy dispensing events</p>
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
              <p className="text-xs text-slate-400">How pharmacies safeguard patients</p>
            </div>
          </div>
          <ol className="mt-4 space-y-3">
            {[
              'Record receipt from the distributor.',
              'Keep the pack code associated with stock records.',
              'Record dispensing so the pack can be flagged as used.'
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
            Dispensing updates the central registry in real-time, locking the pack so it cannot be re-dispensed or reused.
          </div>
        </div>
      </section>
    </div>
  );
}
