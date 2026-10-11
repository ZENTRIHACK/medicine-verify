const TOKEN_KEY = 'trustlayer.token';

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true';
const API_BASE = import.meta.env.VITE_API_URL || '/api';

function readToken() {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getToken() {
  return readToken();
}

export function setToken(token) {
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable; token stays in memory for this session only */
  }
  return token;
}

export function clearToken() {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export class ApiError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

async function request(path, { method = 'GET', body, auth = true, headers = {} } = {}) {
  const finalHeaders = { ...headers };

  if (auth) {
    const token = readToken();
    if (!token) throw new ApiError('You are not signed in.', 401);
    finalHeaders.Authorization = `Bearer ${token}`;
  }

  let payload = body;
  if (payload !== undefined && !(payload instanceof FormData)) {
    finalHeaders['Content-Type'] = 'application/json';
    payload = JSON.stringify(payload);
  }

  const response = await fetch(`${API_BASE}${path}`, { method, headers: finalHeaders, body: payload });

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const message = (data && (data.message || data.error)) || `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, data);
  }

  return data === null ? {} : data;
}

/* ------------------------------ mock mode ------------------------------ */

const MOCK_SERIALS = ['3F7K2Q9WM4XB8TDA', '8H2N5PRVJ6YC1MZK', 'K4T9WQZ7B2NH6XSD'];

function mockLogin(username) {
  const known = { zenocare: 'manufacturer', afyalink: 'distributor', mlimani: 'pharmacy', regulator: 'regulator' };
  return {
    token: `mock-token-${username}`,
    actor: { id: 1, role: known[username] || 'manufacturer', name: `${username} (mock)`, place: 'Nairobi' }
  };
}

function mockRegisterBatch({ quantity = 1 }) {
  const serials = Array.from({ length: Number(quantity) || 1 }, (_, index) => `MOCK${String(index + 1).padStart(4, '0')}`);
  return { batchId: Date.now(), serials, txHash: `0xmock${Math.random().toString(16).slice(2)}` };
}

/* ------------------------------ api surface ------------------------------ */

export const api = {
  async login(username) {
    if (USE_MOCKS) return mockLogin(username);
    return request('/login', { method: 'POST', body: { username }, auth: false });
  },

  async registerBatch(batch) {
    if (USE_MOCKS) return mockRegisterBatch(batch);
    return request('/batches', { method: 'POST', body: batch });
  },

  async transferCustody(serials, toActorId) {
    if (USE_MOCKS) return { transferred: serials.length, toActorId: Number(toActorId) };
    return request('/custody/transfer', { method: 'POST', body: { serials, toActorId } });
  },

  async dispense(serial) {
    if (USE_MOCKS) {
      return MOCK_SERIALS.includes(serial)
        ? { serial, result: 'ok', status: 'dispensed', at: new Date().toISOString() }
        : { serial, result: 'conflict', status: 'dispensed', conflictWith: { actorName: 'Another pharmacy', at: new Date().toISOString() } };
    }
    return request('/dispense', { method: 'POST', body: { serial } });
  },

  async verifySerial(serial) {
    if (USE_MOCKS) {
      return {
        serial,
        status: MOCK_SERIALS.includes(serial) ? 'in_custody' : 'unknown',
        product: MOCK_SERIALS.includes(serial)
          ? { productName: 'Amoxicillin 500mg', batchNo: 'BATCH-2026-001', expiry: '2027-06-30', quantity: 100 }
          : null,
        currentHolder: MOCK_SERIALS.includes(serial)
          ? { id: 2, name: 'AfyaLink Distributors (demo)', role: 'distributor', place: 'Nairobi' }
          : null,
        trail: MOCK_SERIALS.includes(serial)
          ? [{ type: 'registered', actorName: 'Zenocare Labs (demo)', place: 'Nairobi', at: '2026-01-05T08:00:00.000Z' }]
          : [],
        flags: []
      };
    }
    return request(`/verify/${encodeURIComponent(serial)}`, { auth: false });
  },

  async verifyOcr(file, serial) {
    const form = new FormData();
    form.append('image', file);
    if (serial) form.append('serial', serial);
    if (USE_MOCKS) return { match: 'unreadable', differences: [] };
    return request('/verify/ocr', { method: 'POST', body: form, auth: false });
  },

  async getAlerts() {
    if (USE_MOCKS) return { alerts: [] };
    return request('/alerts');
  }
};

export default api;
