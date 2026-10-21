const STORAGE_KEY = "mediscan_supply_chain_records";
const EVENT_NAME = "mediscan-supply-chain-updated";

const seedRecords = [
  {
    id: "demo-pack-001",
    medicineName: "Aleron 500",
    ingredient: "Paracetamol (demo record)",
    batchNo: "ALR-2026-008",
    uniqueCode: "MS-ALR-008-0001",
    manufacturer: "Example Pharmaceuticals",
    distributor: "Northstar Medical Distribution",
    pharmacy: "Community Care Pharmacy",
    manufactureDate: "2026-02-01",
    expiryDate: "2027-08-01",
    quantity: 500,
    status: "At pharmacy",
    events: [
      { id: "e1", type: "manufactured", actor: "Example Pharmaceuticals", location: "Nairobi, Kenya", date: "2026-02-01T09:00:00.000Z", note: "Demo batch registered" },
      { id: "e2", type: "dispatched", actor: "Northstar Medical Distribution", location: "Nairobi, Kenya", date: "2026-02-05T10:00:00.000Z", note: "Demo receipt and dispatch record" },
      { id: "e3", type: "received", actor: "Community Care Pharmacy", location: "Nairobi, Kenya", date: "2026-02-07T12:00:00.000Z", note: "Demo stock receipt" },
    ],
    demo: true,
    createdAt: "2026-02-01T09:00:00.000Z",
  },
];

function readRecords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedRecords;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : seedRecords;
  } catch {
    return seedRecords;
  }
}

function writeRecords(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  window.dispatchEvent(new Event(EVENT_NAME));
}

export function getSupplyRecords() {
  return readRecords();
}

export function addMedicineRecord(input) {
  const records = readRecords();
  const record = {
    ...input,
    id: `pack-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    status: "Manufactured",
    events: [{
      id: `event-${Date.now()}`,
      type: "manufactured",
      actor: input.manufacturer,
      location: input.manufacturingLocation || "Not provided",
      date: new Date().toISOString(),
      note: "Batch and pack code registered in this browser demo",
    }],
    demo: true,
    createdAt: new Date().toISOString(),
  };
  writeRecords([record, ...records]);
  return record;
}

export function recordSupplyEvent(recordId, event) {
  const records = readRecords();
  const updated = records.map((record) => {
    if (record.id !== recordId) return record;
    const nextEvent = { ...event, id: `event-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, date: new Date().toISOString() };
    return { ...record, ...event.recordUpdates, events: [...(record.events || []), nextEvent], updatedAt: new Date().toISOString() };
  });
  writeRecords(updated);
  return updated.find((record) => record.id === recordId) || null;
}

export function subscribeSupplyRecords(callback) {
  window.addEventListener(EVENT_NAME, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT_NAME, callback);
    window.removeEventListener("storage", callback);
  };
}
