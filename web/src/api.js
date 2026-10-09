const useMocks = import.meta.env.VITE_USE_MOCKS === 'true';

function getHeaders() {
  const token = localStorage.getItem('token');
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const api = {
  login: async (username) => {
    if (useMocks) {
      if (username === 'zenocare') {
        return { token: 'mock-token-zenocare', actor: { id: 1, role: 'manufacturer', name: 'Zenocare Labs (demo)', place: 'Nairobi' } };
      } else if (username === 'afyalink') {
        return { token: 'mock-token-afyalink', actor: { id: 2, role: 'distributor', name: 'AfyaLink Distributors (demo)', place: 'Nairobi' } };
      } else if (username === 'mlimani') {
        return { token: 'mock-token-mlimani', actor: { id: 3, role: 'pharmacy', name: 'Mlimani Pharmacy (demo)', place: 'Meru' } };
      }
      throw new Error('Unknown user');
    }
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Login failed');
    }
    return res.json();
  },

  registerBatch: async (data) => {
    if (useMocks) {
      return { batchId: 1, serials: ['ABC123XYZ0000001', 'ABC123XYZ0000002'] };
    }
    const res = await fetch('/api/batches', {
      method: 'POST',
      headers: { ...getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Batch registration failed');
    }
    return res.json();
  },

  transferCustody: async (serials, toActorId) => {
    if (useMocks) {
      return { ok: true, transferred: serials.length, txHashes: ['0xmock123'] };
    }
    const res = await fetch('/api/custody/transfer', {
      method: 'POST',
      headers: { ...getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ serials, toActorId })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Transfer failed');
    }
    return res.json();
  },

  dispense: async (serial) => {
    if (useMocks) {
      if (serial === 'CONFLICT') {
        return {
          result: 'conflict',
          txHash: '0xmock456',
          flags: [],
          conflictWith: { actorName: 'Kaaga Chemist (demo)', at: new Date().toISOString() }
        };
      }
      return { result: 'ok', txHash: '0xmock789', flags: [] };
    }
    const res = await fetch('/api/dispense', {
      method: 'POST',
      headers: { ...getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ serial })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Dispense failed');
    }
    return res.json();
  },

  verifySerial: async (serial) => {
    if (useMocks) {
      if (serial === 'UNKNOWN') {
        return { serial, status: 'unknown', product: null, currentHolder: null, trail: [], flags: [] };
      }
      return {
        serial,
        status: 'registered',
        product: { productName: 'Paracetamol', batchNo: 'B123', expiry: '2026-12-31' },
        currentHolder: { name: 'Zenocare Labs (demo)', place: 'Nairobi' },
        trail: [
          { type: 'registered', actorName: 'Zenocare Labs (demo)', place: 'Nairobi', at: new Date().toISOString(), txHash: '0xabc' }
        ],
        flags: []
      };
    }
    const res = await fetch(`/api/verify/${serial}`);
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Verification failed');
    }
    return res.json();
  },

  verifyOcr: async (file, serial) => {
    if (useMocks) {
      return {
        extracted: { batchNo: 'B123', expiry: '2026-12-31', manufacturer: 'Zenocare Labs' },
        confidence: 0.98,
        match: 'match',
        differences: []
      };
    }
    const formData = new FormData();
    formData.append('image', file);
    formData.append('serial', serial);

    const res = await fetch('/api/verify/ocr', {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'OCR verification failed');
    }
    return res.json();
  }
};
