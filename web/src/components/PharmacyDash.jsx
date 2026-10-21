import { useState, useEffect, useRef } from 'react';
import {
  Store,
  Package,
  Activity,
  AlertTriangle,
  Camera,
  CheckCircle2,
  BadgeCheck,
  ShieldCheck,
  Send
} from 'lucide-react';
import { api } from '../api';
import strings from '../strings.json';

const inputClass =
  'mt-1.5 w-full rounded-xl border border-[#E5E1EF] bg-white px-3.5 py-3 text-sm text-[#242039] outline-none transition focus:border-[#18794E] focus:ring-2 focus:ring-emerald-100';
const labelClass = 'block text-xs font-bold text-[#514B67]';
const primaryButtonClass =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-[#18794E] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#136340] disabled:cursor-not-allowed disabled:opacity-50';
const secondaryButtonClass =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-[#E5E1EF] bg-white px-4 py-3 text-sm font-bold text-[#242039] transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50';

function Metric({ icon: Icon, label, value, detail, alert }) {
  return (
    <div className="rounded-2xl border border-[#E9E5F1] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-500">{label}</span>
        <span
          className={`rounded-xl p-2.5 ${
            alert ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-[#18794E]'
          }`}
        >
          <Icon size={20} />
        </span>
      </div>
      <p className="mt-4 text-3xl font-extrabold text-[#242039]">{value}</p>
      <p className="mt-1 text-xs text-gray-400">{detail}</p>
    </div>
  );
}

/**
 * Releases a camera scanner cleanly without uncaught exceptions.
 */
async function releaseScanner(scanner) {
  if (!scanner) return;
  try {
    if (scanner.isScanning) await scanner.stop();
  } catch {
    /* already stopped or never started */
  }
  try {
    const cleared = scanner.clear();
    if (cleared && typeof cleared.catch === 'function') await cleared.catch(console.error);
  } catch (err) {
    console.error(err);
  }
}

export default function PharmacyDash({ actor }) {
  const [serial, setSerial] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [scanning, setScanning] = useState(false);
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

  useEffect(() => {
    return () => {
      const scanner = scannerRef.current;
      scannerRef.current = null;
      if (scanner) {
        if (scanner.isScanning) {
          scanner.stop().then(() => scanner.clear().catch(console.error)).catch(console.error);
        }
        return scanner.clear().catch(console.error);
      }
    };
  }, []);

  const startScanner = async () => {
    if (scannerRef.current) {
      const previous = scannerRef.current;
      scannerRef.current = null;
      await releaseScanner(previous);
    }

    setScanning(true);
    setResult(null);
    setError(null);

    const { Html5Qrcode } = await import('html5-qrcode');
    const scanner = new Html5Qrcode('pharmacy-qr-reader');
    const origClear = scanner.clear.bind(scanner);
    scanner.clear = () => {
      try {
        const res = origClear();
        return Promise.resolve(res);
      } catch (err) {
        return Promise.reject(err);
      }
    };
    scannerRef.current = scanner;

    try {
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          let scannedSerial = String(decodedText || '').trim();
          const match = scannedSerial.match(/\/v\/([^/?#\s]+)/);
          if (match) scannedSerial = decodeURIComponent(match[1]);
          scannedSerial = scannedSerial.trim().toUpperCase();

          void releaseScanner(scanner);
          setScanning(false);
          handleDispense(scannedSerial);
        },
        () => {} // ignore interim frame failures
      );
    } catch (err) {
      setScanning(false);
      setError('Could not access camera: ' + (err?.message || err));
    }
  };

  const stopScanner = async () => {
    const previous = scannerRef.current;
    scannerRef.current = null;
    await releaseScanner(previous);
    setScanning(false);
  };

  const handleDispense = async (dispenseSerial) => {
    const cleanSerial = String(dispenseSerial || '').trim().toUpperCase();
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
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    const cleanSerial = serial.trim().toUpperCase();
    if (!cleanSerial) return;
    if (scannerRef.current) {
      void releaseScanner(scannerRef.current);
      scannerRef.current = null;
      setScanning(false);
    }
    handleDispense(cleanSerial);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10">
      {/* Top Status Bar */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-xs font-bold text-[#18794E]">
          <ShieldCheck size={15} /> Authenticated Pharmacy Node · {actor?.name || 'Mlimani Pharmacy'}
        </span>
      </div>

      {/* Hero Section matching Friend's Netlify Design */}
      <section className="overflow-hidden rounded-3xl bg-[#0D3823] text-white shadow-sm">
        <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-[10px] font-extrabold tracking-[2.4px] text-emerald-200 uppercase">
              LAST-MILE DISPENSING
            </p>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Pharmacy portal
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-100">
              Record pharmacy stock receipt and dispensing events so a pack&apos;s journey can be reviewed later.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold">
                Traceable pack records
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold">
                Double-dispense prevention
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold">
                Patient Care Verification
              </span>
            </div>
          </div>
          <div className="flex h-24 w-24 items-center justify-center rounded-3xl border border-white/15 bg-white/10">
            <Store size={48} className="text-emerald-200" />
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
      <section className="mt-7 rounded-3xl border border-[#E9E5F1] bg-white p-5 shadow-sm sm:p-6">
        <div>
          <p className="text-[10px] font-extrabold tracking-[2px] text-[#18794E] uppercase">
            POINT OF CARE WORKSPACE
          </p>
          <h2 className="mt-1 text-xl font-extrabold text-[#242039]">
            Verify and dispense medicine
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Scan the pack QR code or enter the 16-character serial before handing the medicine to the patient.
          </p>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* Scanner Pane */}
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-[#514B67] flex items-center gap-2">
                <Camera size={18} className="text-[#18794E]" />
                Dispense Camera Scanner
              </label>
            </div>
            <div
              id="pharmacy-qr-reader"
              className="overflow-hidden rounded-xl bg-white border border-gray-200"
              style={{ minHeight: '220px' }}
            />
            <div className="mt-3">
              {!scanning ? (
                <button
                  type="button"
                  className={primaryButtonClass}
                  onClick={startScanner}
                  style={{ width: '100%' }}
                >
                  <Camera size={16} /> Start Camera Scanner
                </button>
              ) : (
                <button
                  type="button"
                  className={secondaryButtonClass}
                  onClick={stopScanner}
                  style={{ width: '100%' }}
                >
                  Stop Camera Scanner
                </button>
              )}
            </div>
          </div>

          {/* Manual Entry Pane */}
          <div className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-gray-50 p-4">
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
              <span className="mt-2 block text-xs text-gray-500">
                16-character Base32 serial printed under the pack QR code.
              </span>
            </form>

            <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-xs leading-5 text-emerald-900 border border-emerald-100">
              Double-dispense protection active: if this pack was previously dispensed anywhere in the country, an immediate conflict alert is raised.
            </div>
          </div>
        </div>

        {/* Loading indicator */}
        {loading && (
          <p className="mt-4 text-sm font-semibold text-gray-600">
            Processing dispense request on central registry…
          </p>
        )}

        {/* Standard Error banner */}
        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
            {error}
          </div>
        )}

        {/* Dispense OK Result */}
        {result && result.result === 'ok' && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
            <strong className="block text-sm font-bold">
              ✓ {strings.messages?.dispenseOk || 'Dispensed successfully'}
            </strong>
            {result.txHash && (
              <p className="font-mono text-xs text-emerald-700 mt-1">
                Transaction Hash: {result.txHash}
              </p>
            )}
            {result.flags && result.flags.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs text-emerald-700">
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
            backgroundColor: 'rgba(185, 28, 28, 0.90)',
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
            className="conflict-modal rounded-3xl bg-white p-6 shadow-2xl sm:p-8 max-w-lg w-full border-4 border-red-600 text-center"
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600 mb-4">
              <AlertTriangle size={36} />
            </div>

            <h2
              id="conflict-alert-title"
              className="text-2xl font-black text-red-700 tracking-tight"
            >
              {strings.status?.conflict || 'DOUBLE DISPENSE CONFLICT'}
            </h2>

            <p className="mt-2 text-sm text-gray-600">
              This pack has already been recorded as dispensed. Do NOT release this medicine to the patient.
            </p>

            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-left">
              <p className="text-sm text-red-900 mb-2">
                <span className="font-bold">Previously dispensed by:</span>{' '}
                <span className="font-extrabold text-gray-900">
                  {result.conflictWith?.actorName || 'Unknown'}
                </span>
              </p>
              <p className="text-sm text-red-900">
                <span className="font-bold">At:</span>{' '}
                <span className="font-extrabold text-gray-900">
                  {result.conflictWith?.at
                    ? new Date(result.conflictWith.at).toLocaleString()
                    : 'Unknown'}
                </span>
              </p>
            </div>

            {result.flags && result.flags.length > 0 && (
              <div className="mt-4 text-left">
                <strong className="text-xs font-bold text-red-700 uppercase tracking-wide">
                  Flags recorded:
                </strong>
                <ul className="mt-1 list-disc pl-5 text-xs text-red-700 space-y-1">
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
                className="w-full rounded-xl bg-red-600 py-3.5 text-sm font-extrabold text-white transition hover:bg-red-700 shadow-lg"
              >
                Acknowledge Alert
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Friend's Bottom Sections: Activity & Workflow */}
      <section className="mt-7 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#E9E5F1] bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-50 p-2.5 text-[#18794E]">
              <Activity size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-[#242039]">Recent supply activity</h3>
              <p className="text-xs text-gray-500">Latest pharmacy dispensing events</p>
            </div>
          </div>
          <div className="mt-4 space-y-4">
            {activityLogs.length === 0 ? (
              <p className="text-xs text-gray-400">No events logged in this session yet.</p>
            ) : (
              activityLogs.map((log) => (
                <div key={log.id} className="flex gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-[#18794E]">
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
              <p className="text-xs text-gray-500">How pharmacies safeguard patients</p>
            </div>
          </div>
          <ol className="mt-4 space-y-3">
            {[
              'Record receipt from the distributor.',
              'Keep the pack code associated with stock records.',
              'Record dispensing so the pack can be flagged as used.'
            ].map((item, i) => (
              <li key={item} className="flex gap-3 text-sm leading-6 text-gray-600">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#EBF7F0] text-xs font-extrabold text-[#18794E]">
                  {i + 1}
                </span>
                {item}
              </li>
            ))}
          </ol>
          <div className="mt-5 rounded-xl bg-[#F8F6FC] p-3 text-xs leading-5 text-gray-500">
            Dispensing updates the central registry in real-time, locking the pack so it cannot be re-dispensed or reused.
          </div>
        </div>
      </section>
    </div>
  );
}
