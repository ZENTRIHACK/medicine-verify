import strings from '../../../spec/strings.json';

export { strings };

export const STATUS_KEYS = Object.keys(strings.status);

const EVENT_LABELS = {
  registered: 'Registered by manufacturer',
  transferred: 'Custody transferred',
  dispensed: 'Dispensed',
  conflict: 'Conflict: needs review',
  double_dispense: 'Conflict: needs review',
  unknown: 'Unrecognized event'
};

const OCR_LABELS = {
  match: strings.ocr.match,
  mismatch: strings.ocr.mismatch,
  unreadable: strings.ocr.unreadable
};

export function statusText(status) {
  if (typeof status !== 'string') return strings.status.unknown;
  return strings.status[status] || strings.status.unknown;
}

export function statusClass(status) {
  return STATUS_KEYS.includes(status) ? status : 'unknown';
}

export function eventLabel(type) {
  if (typeof type !== 'string') return EVENT_LABELS.unknown;
  return EVENT_LABELS[type] || EVENT_LABELS.unknown;
}

export function ocrText(match) {
  if (typeof match !== 'string') return strings.ocr.unreadable;
  return OCR_LABELS[match] || strings.ocr.unreadable;
}

export function alertText(alert) {
  if (alert && typeof alert === 'object' && typeof alert.message === 'string' && alert.message) {
    return alert.message;
  }
  return EVENT_LABELS.conflict;
}
