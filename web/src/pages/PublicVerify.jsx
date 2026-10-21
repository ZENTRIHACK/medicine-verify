import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  CheckCircle2,
  ShieldAlert,
  CircleAlert,
  TriangleAlert,
  Search,
  Camera,
  Image as ImageIcon,
  Package,
  Building2,
  CalendarDays,
  Clock3,
  Factory,
  Truck,
  Store,
  Pill,
  ShieldCheck,
  ArrowRight,
  X,
  FileSearch,
  FileCheck2
} from 'lucide-react';
import { api } from '../api';
import strings from '../strings.json';
import { eventLabel, ocrText, alertText } from '../lib/lexicon';

function displayValue(value) {
  if (value == null || value === '') return '—';
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

function extractSerial(text) {
  const raw = String(text ?? '').trim();
  if (!raw) return '';
  const match = raw.match(/\/v\/([^/?#\s]+)/);
  return (match ? decodeURIComponent(match[1]) : raw).toUpperCase();
}

/**
 * Releases a camera scanner cleanly.
 */
async function releaseScanner(scanner) {
  if (!scanner) return;
  try {
    if (scanner.isScanning) await scanner.stop();
  } catch {
    /* already stopped */
  }
  try {
    const cleared = scanner.clear();
    if (cleared && typeof cleared.catch === 'function') await cleared.catch(console.error);
  } catch (err) {
    console.error(err);
  }
}

export default function PublicVerify() {
  const { serial: routeSerial } = useParams();
  const navigate = useNavigate();

  const [serialInput, setSerialInput] = useState(routeSerial || '');
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(Boolean(routeSerial));
  const [error, setError] = useState('');

  // Scanner modal state
  const [showScanner, setShowScanner] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const scannerRef = useRef(null);

  // OCR state
  const [ocrResult, setOcrResult] = useState(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrFile, setOcrFile] = useState(null);
  const [ocrError, setOcrError] = useState('');

  const currentSerial = routeSerial || (record ? record.serial : '');

  // Fetch record whenever routeSerial changes
  useEffect(() => {
    let active = true;
    if (!routeSerial) {
      setLoading(false);
      setRecord(null);
      setError('');
      return;
    }

    setLoading(true);
    setError('');
    setRecord(null);
    setOcrResult(null);
    setOcrFile(null);
    setOcrError('');
    setSerialInput(routeSerial);

    // Support both api.getSerial and api.verifySerial
    const fetchSerial = typeof api.getSerial === 'function' ? api.getSerial : api.verifySerial;

    fetchSerial(routeSerial)
      .then((result) => {
        if (active) setRecord(result);
      })
      .catch((err) => {
        if (active) setError(err?.message || 'Unable to load verification details for this serial.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [routeSerial]);

  // Clean up scanner on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        void releaseScanner(scannerRef.current);
        scannerRef.current = null;
      }
    };
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const clean = extractSerial(serialInput);
    if (!clean) return;
    navigate(`/v/${encodeURIComponent(clean)}`);
  };

  const startCameraScanner = async () => {
    setShowScanner(true);
    setCameraError('');

    // Pre-flight: check if camera hardware is available (fails on HTTP or denied perms)
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
      setCameraError('Camera unavailable. Your browser may require HTTPS, or camera permissions are denied. Use gallery upload or manual input below.');
      return;
    }

    try {
      const { Html5Qrcode } = await import('html5-qrcode');

      // Wait for the modal DOM container to mount (React batches state updates)
      let container = null;
      let isMounted = true;
      for (let attempt = 0; attempt < 15; attempt++) {
        container = document.getElementById('public-search-qr-reader');
        if (container) break;
        await new Promise((r) => setTimeout(r, 100));
      }
      if (!container || !isMounted) {
        setCameraError('Scanner container failed to mount. Please close and retry.');
        return;
      }

      const scanner = new Html5Qrcode('public-search-qr-reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decodedText) => {
          const clean = extractSerial(decodedText);
          if (clean) {
            void releaseScanner(scanner);
            scannerRef.current = null;
            setShowScanner(false);
            navigate(`/v/${encodeURIComponent(clean)}`);
          }
        },
        () => { /* ignore per-frame parse noise */ }
      );
    } catch (err) {
      console.warn('Camera scanner start failed:', err);
      setCameraError('Camera access failed: ' + (err?.message || err) + '. Try gallery upload below.');
    }
  };

  const closeScanner = async () => {
    if (scannerRef.current) {
      await releaseScanner(scannerRef.current);
      scannerRef.current = null;
    }
    setShowScanner(false);
    setCameraError('');
  };

  /** Gallery QR fallback: decode a QR code from a user-selected image file */
  const handleGalleryQrUpload = async (event) => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    event.currentTarget.value = '';

    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode('public-gallery-qr-scratch');
      const result = await scanner.scanFile(file, /* showImage= */ false);
      scanner.clear();
      const clean = extractSerial(result);
      if (clean) {
        await closeScanner();
        navigate(`/v/${encodeURIComponent(clean)}`);
      } else {
        setCameraError('Could not extract a serial from the QR image. Try a clearer photo.');
      }
    } catch (err) {
      setCameraError('QR decode from image failed: ' + (err?.message || err));
    }
  };

  const handleOcrUpload = async (event) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    if (!currentSerial) {
      setOcrError('Please search or scan a pack serial number first.');
      return;
    }

    setOcrFile(file);
    setOcrLoading(true);
    setOcrError('');
    setOcrResult(null);

    try {
      const result = await api.verifyOcr(file, currentSerial);
      setOcrResult(result);
    } catch (err) {
      setOcrError(err?.message || 'Unable to process the pack photograph. Please try again.');
    } finally {
      setOcrLoading(false);
      input.value = '';
    }
  };

  // Determine status configuration
  const status = record?.status;
  let statusBanner = {
    title: strings.status[status] || strings.status.unknown,
    icon: CheckCircle2,
    badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    iconBg: 'bg-emerald-100 text-emerald-700',
    note: 'Packaging details correspond with the registry record.'
  };

  if (status === 'dispensed') {
    statusBanner = {
      title: strings.status.dispensed || 'Dispensed',
      icon: CircleAlert,
      badgeBg: 'bg-amber-50 text-amber-900 border-amber-200',
      iconBg: 'bg-white/80 text-amber-700',
      note: 'This pack has already been recorded as dispensed to a patient. A repeated scan requires verification.'
    };
  } else if (status === 'conflict') {
    statusBanner = {
      title: strings.status.conflict || 'Conflict: needs review',
      icon: ShieldAlert,
      badgeBg: 'bg-red-50 text-red-900 border-red-200',
      iconBg: 'bg-white/80 text-red-700',
      note: 'Multiple conflicting dispensing events recorded. Do not release this pack.'
    };
  } else if (!status || status === 'unknown' || error) {
    statusBanner = {
      title: strings.status.unknown || 'No registered record found',
      icon: TriangleAlert,
      badgeBg: 'bg-[#F8F6FC] text-[#242039] border-[#E5E1EF]',
      iconBg: 'bg-gray-200 text-[#514B67]',
      note: 'This 16-character identifier does not correspond to an active medicine registry entry.'
    };
  }

  const StatusIcon = statusBanner.icon;

  return (
    <div className="min-h-screen bg-[#F5F3FA] text-[#242039]">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
      {/* Top Breadcrumb / Home Link */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-[#4926C8] transition"
        >
          <span>←</span> Back to home
        </Link>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-bold text-[#4926C8]">
          <ShieldCheck size={14} /> National Medicine Registry
        </span>
      </div>

      {/* 1. Hero Search Section */}
      <section className="rounded-3xl border border-[#E9E5F1] bg-white p-6 shadow-sm sm:p-8">
        <div className="max-w-2xl">
          <p className="text-[10px] font-extrabold tracking-[2px] text-[#4926C8] uppercase">
            PUBLIC VERIFICATION PORTAL
          </p>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-[#242039] sm:text-3xl">
            Verify medicine packaging
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Enter the 16-character pack serial number, scan the box QR code, or check a photograph of printed batch details.
          </p>
        </div>

        {/* Search Bar + Controls - Mobile/Desktop Responsive */}
        <form
          onSubmit={handleSearchSubmit}
          className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full max-w-2xl mx-auto"
        >
          <div className="relative flex-1">
            <input
              type="text"
              value={serialInput}
              onChange={(e) => setSerialInput(e.target.value.toUpperCase())}
              placeholder="Enter 16-character serial (e.g. K7Q2M9XW4TBH3N8D)"
              maxLength={16}
              autoComplete="off"
              className="w-full rounded-xl border border-[#E5E1EF] bg-white px-4 py-3 text-sm font-mono font-bold text-[#242039] placeholder:text-gray-400 outline-none transition focus:border-[#8067DE] focus:ring-2 focus:ring-purple-100"
            />
          </div>
          <button
            type="submit"
            disabled={!serialInput.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#4926C8] hover:bg-[#3920A1] text-white font-semibold shadow-sm px-5 py-3 text-sm transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
          >
            <Search size={16} /> Check Serial
          </button>
        </form>

        {/* Quick Action Buttons - Stack vertically on mobile, horizontally on desktop */}
        <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2 pt-3 border-t border-[#EEEAF5] max-w-2xl mx-auto">
          <span className="text-xs font-semibold text-gray-500 text-center mr-1">Direct options:</span>
          <button
            type="button"
            onClick={startCameraScanner}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#E5E1EF] bg-[#F8F6FC] hover:bg-purple-50 px-3.5 py-2 text-xs font-bold text-[#514B67] transition cursor-pointer"
          >
            <Camera size={14} className="text-[#4926C8]" /> Scan QR with Camera
          </button>
          <a
            href="#ocr-pack-section"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#E5E1EF] bg-[#F8F6FC] hover:bg-purple-50 px-3.5 py-2 text-xs font-bold text-[#514B67] transition"
          >
            <ImageIcon size={14} className="text-[#4926C8]" /> Check Pack Photo (OCR)
          </a>
        </div>
      </section>

      {/* Camera Scanner Modal */}
      {showScanner && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          style={{ backgroundColor: 'rgba(40, 20, 95, 0.78)' }}
          role="dialog"
          aria-modal="true"
        >
          <div className="max-w-md w-full mx-auto overflow-hidden rounded-2xl bg-white p-6 shadow-2xl border border-[#E9E5F1]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-[#242039] flex items-center gap-2">
                <Camera size={18} className="text-[#4926C8]" /> Scan Pack QR Code
              </h3>
              <button
                type="button"
                onClick={closeScanner}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-purple-50 transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
            <div
              id="public-search-qr-reader"
              className="overflow-hidden rounded-xl bg-purple-50 border border-[#E9E5F1]"
              style={{ minHeight: '260px' }}
            />
            {cameraError && (
              <div className="mt-3 rounded-xl bg-red-50 p-2.5 text-xs text-red-700 border border-red-200">
                {cameraError}
              </div>
            )}
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-gray-500">
                Align the QR code inside the viewfinder, or upload a QR photo:
              </p>
              <label className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E1EF] bg-[#F8F6FC] hover:bg-purple-50 px-3 py-1.5 text-xs font-bold text-[#514B67] transition cursor-pointer shrink-0 ml-2">
                <ImageIcon size={14} className="text-[#4926C8]" /> Upload QR Image
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleGalleryQrUpload}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
            {/* Hidden scratch container for gallery QR decode */}
            <div id="public-gallery-qr-scratch" style={{ display: 'none' }} />
          </div>
        </div>
      )}

      {/* Loading indicator */}
      {loading && (
        <div className="mt-8 text-center py-12">
          <p className="text-sm font-semibold text-gray-600">
            Querying central registry for serial {routeSerial}…
          </p>
        </div>
      )}

      {/* Verification Results Display */}
      {!loading && (
        <div className="mt-6 space-y-6">
          {/* Error Banner if any */}
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
              <strong>Query notice:</strong> {error}
            </div>
          )}

          {/* 2. High-Visibility Status Banner matching friend's VerificationResult design */}
          <section className={`rounded-3xl border p-6 sm:p-8 ${statusBanner.badgeBg}`}>
            <div className="flex items-start gap-4">
              <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${statusBanner.iconBg} shadow-sm`}>
                <StatusIcon size={30} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-extrabold uppercase tracking-[1.5px] opacity-90">
                  Verification status
                </p>
                <h2 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">
                  {statusBanner.title}
                </h2>
                <p className="mt-2 text-sm leading-6 opacity-90 font-medium">
                  {statusBanner.note}
                </p>
                {currentSerial && (
                  <p className="mt-2 font-mono text-xs font-bold">
                    Serial: {currentSerial}
                  </p>
                )}
              </div>
            </div>

            {record && record.flags?.length > 0 && (
              <div className="mt-5 rounded-2xl border border-red-200 bg-white/90 p-4">
                <p className="text-xs font-bold text-red-700 uppercase tracking-wide">
                  Noted registry alerts:
                </p>
                <ul className="mt-2 space-y-3 text-xs text-red-700">
                  {record.flags.map((flag, idx) => (
                    <li key={idx} className="flex items-center gap-1.5 font-medium">
                      <span>•</span> {alertText(flag)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {/* 3. Product & Current Holder Cards */}
          {record && (
            <div className="grid gap-6 md:grid-cols-2">
              {/* Product Details Card */}
              <section className="rounded-3xl border border-[#E9E5F1] bg-white p-5 sm:p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-[#4926C8]">
                    <Package size={22} />
                  </div>
                  <div>
                    <h2 className="font-extrabold text-[#242039]">Medicine details</h2>
                    <p className="text-xs text-gray-500">Registered product specification</p>
                  </div>
                </div>

                <div className="divide-y divide-gray-100">
                  <div className="py-2 flex justify-between items-center text-sm">
                    <span className="text-gray-500 font-medium">Product name</span>
                    <span className="font-bold text-[#242039] text-right">
                      {record.product?.productName || '—'}
                    </span>
                  </div>
                  <div className="py-2 flex justify-between items-center text-sm">
                    <span className="text-gray-500 font-medium">Batch number</span>
                    <span className="font-mono font-bold text-[#242039]">
                      {record.product?.batchNo || '—'}
                    </span>
                  </div>
                  <div className="py-2 flex justify-between items-center text-sm">
                    <span className="text-gray-500 font-medium">Expiry date</span>
                    <span className="font-bold text-[#242039]">
                      {record.product?.expiry || '—'}
                    </span>
                  </div>
                  <div className="py-2 flex justify-between items-center text-sm">
                    <span className="text-gray-500 font-medium">Pack quantity</span>
                    <span className="font-bold text-[#242039]">
                      {record.product?.quantity || '—'}
                    </span>
                  </div>
                </div>
              </section>

              {/* Current Holder Card */}
              <section className="rounded-3xl border border-[#E9E5F1] bg-white p-5 sm:p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-[#4926C8]">
                    <Building2 size={22} />
                  </div>
                  <div>
                    <h2 className="font-extrabold text-[#242039]">Current custody</h2>
                    <p className="text-xs text-gray-500">Authorized organization holding stock</p>
                  </div>
                </div>

                {record.currentHolder ? (
                  <div className="divide-y divide-gray-100">
                    <div className="py-2 flex justify-between items-center text-sm">
                      <span className="text-gray-500 font-medium">Organization</span>
                      <span className="font-bold text-[#242039] text-right">
                        {record.currentHolder.name}
                      </span>
                    </div>
                    <div className="py-2 flex justify-between items-center text-sm">
                      <span className="text-gray-500 font-medium">Role</span>
                      <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-bold capitalize text-[#514B67]">
                        {record.currentHolder.role}
                      </span>
                    </div>
                    <div className="py-2 flex justify-between items-center text-sm">
                      <span className="text-gray-500 font-medium">Location</span>
                      <span className="font-bold text-[#242039] flex items-center gap-1">
                        📍 {record.currentHolder.place || '—'}
                      </span>
                    </div>
                    <div className="py-2 flex justify-between items-center text-sm">
                      <span className="text-gray-500 font-medium">Node ID</span>
                      <span className="font-mono text-xs text-gray-600">
                        Actor #{record.currentHolder.id}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 py-4">No current holder assigned.</p>
                )}
              </section>
            </div>
          )}

          {/* 4. Interactive Custody Timeline */}
          {record && (
            <section className="rounded-3xl border border-[#E9E5F1] bg-white p-6 shadow-sm sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-[#4926C8]">
                  <Clock3 size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-[#242039]">Custody timeline</h2>
                  <p className="text-xs text-gray-500">
                    Verifiable chronological path from manufacturing to dispensing
                  </p>
                </div>
              </div>

              {record.trail?.length ? (
                <div className="space-y-6 relative before:absolute before:inset-0 before:left-4.5 before:w-0.5 before:bg-gray-200">
                  {record.trail.map((entry, index) => {
                    const isLast = index === record.trail.length - 1;
                    const isDispense = /dispense/i.test(entry.type);
                    const isTransfer = /transfer|custody/i.test(entry.type);

                    return (
                      <div key={`${entry.at || 'event'}-${index}`} className="relative flex items-start gap-4">
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 ${
                            isDispense
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
                              : isTransfer
                              ? 'border-purple-200 bg-purple-50 text-[#4926C8]'
                              : 'border-purple-200 bg-purple-50 text-[#4926C8]'
                          } shadow-sm z-10`}
                        >
                          {isDispense ? (
                            <Pill size={16} />
                          ) : isTransfer ? (
                            <Truck size={16} />
                          ) : (
                            <Factory size={16} />
                          )}
                        </div>

                        <div className="min-w-0 flex-1 rounded-2xl border border-[#E9E5F1] bg-[#F8F6FC] p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-sm font-extrabold text-[#242039]">
                              {eventLabel(entry.type)}
                            </span>
                            <span className="text-xs font-medium text-gray-500">
                              {entry.at ? new Date(entry.at).toLocaleString() : '—'}
                            </span>
                          </div>

                          <div className="mt-2 grid gap-1 text-xs text-gray-600">
                            <p>
                              <strong className="text-[#514B67]">Handler:</strong>{' '}
                              {entry.actorName || 'Registered Actor'}
                            </p>
                            {entry.place && (
                              <p>
                                <strong className="text-[#514B67]">Facility:</strong> 📍 {entry.place}
                              </p>
                            )}
                            {entry.txHash && (
                              <p className="font-mono text-[11px] text-[#4926C8] break-all">
                                Tx: {entry.txHash}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-500">No custody movements recorded on the registry.</p>
              )}
            </section>
          )}

          {/* 5. OCR Box Photo Card / Modal */}
          <section id="ocr-pack-section" className="rounded-3xl border border-[#E9E5F1] bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-[#4926C8]">
                <FileCheck2 size={22} />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-[#242039]">Pack photograph check</h2>
                <p className="text-xs text-gray-500">
                  Compare printed physical batch & expiry text on your box against the official record
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-[#E9E5F1] bg-[#F8F6FC] p-5">
              <p className="text-xs font-semibold text-[#514B67] mb-3">
                Upload or capture a clear photo of the printed batch number and expiry date:
              </p>

              {/* Dual Action Buttons for Camera Capture and Gallery Picker */}
              <div className="flex flex-wrap gap-3">
                <label className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#4926C8] hover:bg-[#3920A1] text-white font-semibold shadow-sm px-4 py-3 text-sm transition cursor-pointer">
                  <Camera size={16} /> Take Photo (Camera)
                  <input
                    id="ocr-camera-input"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleOcrUpload}
                    style={{ display: 'none' }}
                  />
                </label>

                <label className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#E5E1EF] bg-white hover:bg-[#F8F6FC] text-[#514B67] font-semibold px-4 py-3 text-sm transition cursor-pointer">
                  <ImageIcon size={16} className="text-[#4926C8]" /> Choose from Gallery
                  <input
                    id="ocr-gallery-input"
                    type="file"
                    accept="image/*"
                    onChange={handleOcrUpload}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>

              {ocrFile && (
                <p className="mt-3 text-xs text-[#4926C8] font-semibold">
                  Selected: {ocrFile.name}
                </p>
              )}

              {ocrLoading && (
                <p className="mt-3 text-xs font-semibold text-gray-600">
                  Extracting packaging text with OCR engine and verifying match…
                </p>
              )}

              {ocrError && (
                <div className="mt-3 rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700">
                  {ocrError}
                </div>
              )}

              {/* OCR Match Results */}
              {ocrResult && (
                <div className="mt-5 rounded-2xl border border-[#E9E5F1] bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-[#EEEAF5] pb-3 mb-3">
                    <span className="text-sm font-extrabold text-[#242039]">
                      OCR Result: {ocrText(ocrResult.match)}
                    </span>
                    {typeof ocrResult.confidence === 'number' && (
                      <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-bold text-[#4926C8]">
                        Reading confidence: {Math.round(ocrResult.confidence * 100)}%
                      </span>
                    )}
                  </div>

                  {ocrResult.differences?.length > 0 ? (
                    <div className="rounded-xl bg-amber-50 border border-amber-200 p-3">
                      <p className="text-xs font-bold text-amber-900 mb-1">Differences detected:</p>
                      <ul className="text-xs text-amber-800 space-y-3" style={{ listStyleType: 'disc', paddingLeft: '1rem' }}>
                        {ocrResult.differences.map((diff, index) => (
                          <li key={index}>
                            {diff && typeof diff === 'object'
                              ? displayValue(diff.message ?? diff.field ?? diff)
                              : displayValue(diff)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-xs text-emerald-700 font-medium">
                      ✓ Printed batch and expiry details match the registered manufacturer record.
                    </p>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* Footer Disclaimer */}
          <footer className="mt-8 flex items-start gap-3 rounded-2xl border border-[#E9E5F1] bg-white p-4 text-gray-600 shadow-sm">
            <ShieldCheck size={20} className="mt-0.5 shrink-0 text-[#4926C8]" />
            <p className="text-xs leading-5">
              {strings.disclaimer}
            </p>
          </footer>
        </div>
      )}
      </div>
    </div>
  );
}
