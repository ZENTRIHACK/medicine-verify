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
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return SCANNER_ERROR_MESSAGES.camera_denied;
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || name === 'OverconstrainedError') {
    return SCANNER_ERROR_MESSAGES.camera_unavailable;
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return SCANNER_ERROR_MESSAGES.camera_in_use;
  }
  return SCANNER_ERROR_MESSAGES.generic;
}

function serializedTeardown(elementId, scanner) {
  const previous = teardownChains.get(elementId) || Promise.resolve();

  const next = previous
    .catch(() => {})
    .then(async () => {
      if (!scanner) return;
      try {
        if (scanner.isScanning) await scanner.stop();
      } catch (error) {
        console.error('[scanner] stop failed:', error);
      }
      try {
        await scanner.clear();
      } catch (error) {
        console.error('[scanner] clear failed:', error);
      }
    })
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
      await pendingTeardown(elementId);
      if (!active) return;

      try {
        scanner = new Html5Qrcode(elementId);
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
        if (active) {
          await serializedTeardown(elementId, scanner);
          notify(new Error(messageForError(error)));
        }
      }
    };

    void boot();

    return () => {
      active = false;
      const instance = scannerRef.current || scanner;
      scannerRef.current = null;
      void serializedTeardown(elementId, instance);
    };
  }, [elementId]);
}
