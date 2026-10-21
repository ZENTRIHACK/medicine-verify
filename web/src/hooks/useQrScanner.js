import { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export const SCANNER_CONFIG = {
  fps: 10,
  qrbox: { width: 240, height: 240 },
  aspectRatio: 1.0
};

export const SCANNER_ERROR_MESSAGES = {
  camera_denied: 'Camera permission was denied. Enter the serial manually below.',
  camera_unavailable: 'No camera is available on this device. Enter the serial manually below.',
  camera_in_use: 'The camera is already in use by another application.',
  generic: 'The camera could not be started. Enter the serial manually below.'
};

const teardownChains = new Map();

function messageForError(error) {
  const name = error && error.name ? String(error.name) : '';
  const message = error && error.message ? String(error.message) : '';
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || /permission|denied/i.test(message)) {
    return SCANNER_ERROR_MESSAGES.camera_denied;
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || name === 'OverconstrainedError' || /no camera|not found/i.test(message)) {
    return SCANNER_ERROR_MESSAGES.camera_unavailable;
  }
  if (name === 'NotReadableError' || name === 'TrackStartError' || /could not start|in use/i.test(message)) {
    return SCANNER_ERROR_MESSAGES.camera_in_use;
  }
  return SCANNER_ERROR_MESSAGES.generic;
}

/**
 * Releases a scanner instance.
 */
function releaseScanner(scanner) {
  if (!scanner) return Promise.resolve();

  let stopping = Promise.resolve();
  try {
    if (scanner.isScanning) stopping = scanner.stop();
  } catch (error) {
    console.error('[scanner] stop threw:', error);
  }

  const stopSettled = stopping && typeof stopping.catch === 'function'
    ? stopping.catch((error) => console.error('[scanner] stop rejected:', error))
    : Promise.resolve();

  return stopSettled
    .then(() => {
      try {
        const outcome = scanner.clear();
        if (outcome && typeof outcome.catch === 'function') return outcome.catch(console.error);
        return undefined;
      } catch (error) {
        console.error('[scanner] clear threw:', error);
        return undefined;
      }
    })
    .catch((error) => console.error('[scanner] teardown failed:', error));
}

function serializedTeardown(elementId, scanner) {
  const previous = teardownChains.get(elementId) || Promise.resolve();
  const next = previous
    .catch(() => {})
    .then(() => releaseScanner(scanner))
    .catch((error) => console.error('[scanner] teardown failed:', error));
  teardownChains.set(elementId, next);
  return next;
}

function pendingTeardown(elementId) {
  return teardownChains.get(elementId) || Promise.resolve();
}

export default function useQrScanner(elementId, onScan) {
  const onScanRef = useRef(onScan);
  const scannerRef = useRef(null);

  onScanRef.current = onScan;

  useEffect(() => {
    let active = true;
    let scanner = null;

    const notify = (error) => {
      if (!active || typeof onScanRef.current !== 'function') return;
      onScanRef.current(null, error);
    };

    const boot = async () => {
      // StrictMode mounts, unmounts and remounts. Wait for the previous
      // instance to fully release the device before claiming it again,
      // otherwise the second mount races a half-torn-down camera.
      await pendingTeardown(elementId);
      if (!active) return;

      try {
        scanner = new Html5Qrcode(elementId);
        const origClear = scanner.clear.bind(scanner);
        scanner.clear = () => {
          try {
            const res = origClear();
            return Promise.resolve(res);
          } catch (err) {
            return Promise.reject(err);
          }
        };
      } catch (error) {
        console.error('[scanner] init failed:', error);
        notify(new Error(messageForError(error)));
        return;
      }

      scannerRef.current = scanner;

      try {
        await scanner.start(
          { facingMode: 'environment' },
          SCANNER_CONFIG,
          (decodedText) => {
            if (!active) return;
            const value = typeof decodedText === 'string' ? decodedText.trim() : '';
            if (!value || typeof onScanRef.current !== 'function') return;
            onScanRef.current(value, null);
          },
          () => {}
        );
        if (!active) await serializedTeardown(elementId, scanner);
      } catch (error) {
        await serializedTeardown(elementId, scanner);
        notify(new Error(messageForError(error)));
      }
    };

    void boot();

    return () => {
      active = false;
      const instance = scannerRef.current || scanner;
      scannerRef.current = null;
      void serializedTeardown(elementId, instance);
      if (instance) {
        return instance.clear().catch(console.error);
      }
    };
  }, [elementId]);
}
