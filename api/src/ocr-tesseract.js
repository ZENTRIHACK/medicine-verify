"use strict";

const { createWorker } = require("tesseract.js");

const MIN_CONFIDENCE = 0.6;

function failureResult() {
  return {
    batchNo: "UNREADABLE",
    expiry: "UNREADABLE",
    manufacturer: "UNKNOWN",
    confidence: 0.1
  };
}

function cleanString(value) {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  return cleaned.length ? cleaned : null;
}

function normalizeExpiry(value) {
  const raw = cleanString(value);
  if (!raw) return null;

  const s = raw.toUpperCase().replace(/,/g, " ").replace(/\s+/g, " ").trim();
  let match;

  match = s.match(/^(\d{4})[-/.](\d{1,2})(?:[-/.]\d{1,2})?$/);
  if (match) return `${match[1]}-${String(Number(match[2])).padStart(2, "0")}`;

  match = s.match(/^(\d{1,2})[/. -](\d{1,2})[/. -](\d{4})$/);
  if (match) {
    const first = Number(match[1]);
    const second = Number(match[2]);
    const month = first > 12 ? second : (second > 12 ? first : second);
    if (month >= 1 && month <= 12) return `${match[3]}-${String(month).padStart(2, "0")}`;
    return null;
  }

  match = s.match(/^(\d{1,2})[-/.](\d{4})$/);
  if (match && Number(match[1]) >= 1 && Number(match[1]) <= 12) {
    return `${match[2]}-${String(Number(match[1])).padStart(2, "0")}`;
  }

  const months = {
    JAN: "01", JANUARY: "01", FEB: "02", FEBRUARY: "02",
    MAR: "03", MARCH: "03", APR: "04", APRIL: "04",
    MAY: "05", JUN: "06", JUNE: "06", JUL: "07", JULY: "07",
    AUG: "08", AUGUST: "08", SEP: "09", SEPT: "09", SEPTEMBER: "09",
    OCT: "10", OCTOBER: "10", NOV: "11", NOVEMBER: "11",
    DEC: "12", DECEMBER: "12"
  };
  match = s.match(/^([A-Z]+)[ -]+(\d{4})$/);
  if (match && months[match[1]]) return `${match[2]}-${months[match[1]]}`;

  return null;
}

function normalizeBatch(value) {
  const raw = cleanString(value);
  if (!raw) return null;
  return raw.toUpperCase().replace(/[\s-]/g, "").replace(/O/g, "0").replace(/I/g, "1");
}

function normalizeManufacturer(value) {
  const raw = cleanString(value);
  if (!raw) return null;
  return raw
    .replace(/\([^)]*\)/g, " ")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function extractBatchNo(text) {
  const lines = text.split("\n");
  const patterns = [
    /(?:BATCH|LOT|BATCH\s*NO|LOT\s*NO)[\s:]*([A-Z0-9-]{6,})/i,
    /(?:BATCH|LOT)[\s:]*([A-Z0-9-]{6,})/i,
    /\b([A-Z]{2,4}[0-9]{4,}[A-Z0-9-]*)\b/,
    /\b([A-Z0-9]{8,})\b/
  ];

  for (const line of lines) {
    const cleanLine = line.trim().toUpperCase();
    for (const pattern of patterns) {
      const match = cleanLine.match(pattern);
      if (match && match[1]) {
        const candidate = match[1].replace(/[^A-Z0-9-]/g, "");
        if (candidate.length >= 6) return candidate;
      }
    }
  }
  return null;
}

function extractExpiry(text) {
  const lines = text.split("\n");
  const patterns = [
    /(?:EXP|EXPIRY|EXPIRATION|USE\s*BY)[\s:]*(\d{4}[-/.]\d{1,2}[-/.]?\d{0,2})/i,
    /(?:EXP|EXPIRY|EXPIRATION|USE\s*BY)[\s:]*(\d{1,2}[-/.]\d{1,2}[-/.]\d{4})/i,
    /(?:EXP|EXPIRY|EXPIRATION|USE\s*BY)[\s:]*(\d{1,2}[-/.]\d{4})/i,
    /\b(\d{4}[-/.]\d{1,2}[-/.]\d{1,2})\b/,
    /\b(\d{1,2}[-/.]\d{1,2}[-/.]\d{4})\b/,
    /\b(\d{1,2}[-/.]\d{4})\b/,
    /\b([A-Z]{3,9}[\s-]+\d{4})\b/i
  ];

  for (const line of lines) {
    const cleanLine = line.trim();
    for (const pattern of patterns) {
      const match = cleanLine.match(pattern);
      if (match && match[1]) {
        const normalized = normalizeExpiry(match[1]);
        if (normalized) return normalized;
      }
    }
  }
  return null;
}

function extractManufacturer(text) {
  const lines = text.split("\n");
  const knownManufacturers = [
    "ZENOCARE", "AFYALINK", "MLIMANI", "KAAGA", "LAKEVIEW"
  ];

  for (const line of lines) {
    const cleanLine = line.trim().toUpperCase();
    for (const mfr of knownManufacturers) {
      if (cleanLine.includes(mfr)) return mfr;
    }
  }

  const candidates = lines
    .map(l => l.trim())
    .filter(l => l.length > 3 && /^[A-Z\s&]+$/i.test(l))
    .slice(0, 5);

  return candidates[0] || null;
}

let worker = null;
let workerReady = false;
let initPromise = null;
let initError = null;

function initializeWorker() {
  if (workerReady) return Promise.resolve(worker);
  if (initError) return Promise.reject(initError);
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      console.log("Initializing Tesseract OCR worker...");
      worker = await createWorker("eng", 1, {
        logger: m => {
          if (m.status === "recognizing text") {
            console.log(`OCR progress: ${Math.round(m.progress * 100)}%`);
          } else if (m.status === "loading language" || m.status === "initializing tesseract") {
            console.log(`OCR init: ${m.status} ${m.progress ? Math.round(m.progress * 100) : ""}%`);
          }
        }
      });
      workerReady = true;
      console.log("Tesseract OCR worker ready");
      return worker;
    } catch (error) {
      initError = error;
      console.error("Failed to initialize Tesseract worker:", error.message);
      throw error;
    }
  })();

  return initPromise;
}

async function extractPackFields(imageBuffer, mimeType) {
  try {
    if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length === 0) return failureResult();
    if (typeof mimeType !== "string" || !mimeType.startsWith("image/")) return failureResult();

    if (!workerReady) {
      await initializeWorker();
    }

    const { data } = await Promise.race([
      worker.recognize(imageBuffer),
      new Promise((_, reject) => setTimeout(() => reject(new Error("OCR timeout")), 60000))
    ]);

    const text = data.text || "";
    const confidence = data.confidence ? data.confidence / 100 : 0;

    if (!text.trim() || confidence < 0.1) {
      return failureResult();
    }

    const batchNo = extractBatchNo(text);
    const expiry = extractExpiry(text);
    const manufacturer = extractManufacturer(text);

    return {
      batchNo,
      expiry,
      manufacturer,
      confidence: Math.round(confidence * 100) / 100
    };
  } catch (error) {
    console.error("Tesseract OCR extraction failed:", error.message);
    return failureResult();
  }
}

function comparePack(extracted, record) {
  const fields = extracted && typeof extracted === "object" ? extracted : {};
  const registered = record && typeof record === "object" ? record : {};
  const confidence = Number(fields.confidence);

  if (
    !cleanString(fields.batchNo) ||
    !cleanString(fields.expiry) ||
    !Number.isFinite(confidence) ||
    confidence < MIN_CONFIDENCE
  ) {
    return { match: "unreadable", differences: [] };
  }

  const differences = [];
  const extractedBatch = normalizeBatch(fields.batchNo);
  const registeredBatch = normalizeBatch(registered.batchNo);

  if (!extractedBatch || !registeredBatch || extractedBatch !== registeredBatch) {
    differences.push(`Batch number on pack is ${cleanString(fields.batchNo) || "unreadable"}, registered batch number is ${cleanString(registered.batchNo) || "unavailable"}`);
  }

  const extractedExpiry = normalizeExpiry(fields.expiry);
  const registeredExpiry = normalizeExpiry(registered.expiry);
  if (!extractedExpiry || !registeredExpiry || extractedExpiry !== registeredExpiry) {
    differences.push(`Expiry on pack is ${extractedExpiry || cleanString(fields.expiry) || "unreadable"}, registered expiry is ${registeredExpiry || cleanString(registered.expiry) || "unavailable"}`);
  }

  const extractedManufacturer = normalizeManufacturer(fields.manufacturer);
  const registeredManufacturer = normalizeManufacturer(registered.manufacturer);
  if (extractedManufacturer && registeredManufacturer && extractedManufacturer !== registeredManufacturer) {
    differences.push(`Manufacturer on pack is ${cleanString(fields.manufacturer)}, registered manufacturer is ${cleanString(registered.manufacturer)}`);
  }

  return { match: differences.length ? "mismatch" : "match", differences };
}

function cleanString(value) {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  return cleaned.length ? cleaned : null;
}

function normalizeExpiry(value) {
  const raw = cleanString(value);
  if (!raw) return null;

  const s = raw.toUpperCase().replace(/,/g, " ").replace(/\s+/g, " ").trim();
  let match;

  match = s.match(/^(\d{4})[-/.](\d{1,2})(?:[-/.]\d{1,2})?$/);
  if (match) return `${match[1]}-${String(Number(match[2])).padStart(2, "0")}`;

  match = s.match(/^(\d{1,2})[/. -](\d{1,2})[/. -](\d{4})$/);
  if (match) {
    const first = Number(match[1]);
    const second = Number(match[2]);
    const month = first > 12 ? second : (second > 12 ? first : second);
    if (month >= 1 && month <= 12) return `${match[3]}-${String(month).padStart(2, "0")}`;
    return null;
  }

  match = s.match(/^(\d{1,2})[-/.](\d{4})$/);
  if (match && Number(match[1]) >= 1 && Number(match[1]) <= 12) {
    return `${match[2]}-${String(Number(match[1])).padStart(2, "0")}`;
  }

  const months = {
    JAN: "01", JANUARY: "01", FEB: "02", FEBRUARY: "02",
    MAR: "03", MARCH: "03", APR: "04", APRIL: "04",
    MAY: "05", JUN: "06", JUNE: "06", JUL: "07", JULY: "07",
    AUG: "08", AUGUST: "08", SEP: "09", SEPT: "09", SEPTEMBER: "09",
    OCT: "10", OCTOBER: "10", NOV: "11", NOVEMBER: "11",
    DEC: "12", DECEMBER: "12"
  };
  match = s.match(/^([A-Z]+)[ -]+(\d{4})$/);
  if (match && months[match[1]]) return `${match[2]}-${months[match[1]]}`;

  return null;
}

function normalizeBatch(value) {
  const raw = cleanString(value);
  if (!raw) return null;
  return raw.toUpperCase().replace(/[\s-]/g, "").replace(/O/g, "0").replace(/I/g, "1");
}

function normalizeManufacturer(value) {
  const raw = cleanString(value);
  if (!raw) return null;
  return raw
    .replace(/\([^)]*\)/g, " ")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function extractBatchNo(text) {
  const lines = text.split("\n");
  const patterns = [
    /(?:BATCH|LOT|BATCH\s*NO|LOT\s*NO)[\s:]*([A-Z0-9-]{6,})/i,
    /(?:BATCH|LOT)[\s:]*([A-Z0-9-]{6,})/i,
    /\b([A-Z]{2,4}[0-9]{4,}[A-Z0-9-]*)\b/,
    /\b([A-Z0-9]{8,})\b/
  ];

  for (const line of lines) {
    const cleanLine = line.trim().toUpperCase();
    for (const pattern of patterns) {
      const match = cleanLine.match(pattern);
      if (match && match[1]) {
        const candidate = match[1].replace(/[^A-Z0-9-]/g, "");
        if (candidate.length >= 6) return candidate;
      }
    }
  }
  return null;
}

function extractExpiry(text) {
  const lines = text.split("\n");
  const patterns = [
    /(?:EXP|EXPIRY|EXPIRATION|USE\s*BY)[\s:]*(\d{4}[-/.]\d{1,2}[-/.]?\d{0,2})/i,
    /(?:EXP|EXPIRY|EXPIRATION|USE\s*BY)[\s:]*(\d{1,2}[-/.]\d{1,2}[-/.]\d{4})/i,
    /(?:EXP|EXPIRY|EXPIRATION|USE\s*BY)[\s:]*(\d{1,2}[-/.]\d{4})/i,
    /\b(\d{4}[-/.]\d{1,2}[-/.]\d{1,2})\b/,
    /\b(\d{1,2}[-/.]\d{1,2}[-/.]\d{4})\b/,
    /\b(\d{1,2}[-/.]\d{4})\b/,
    /\b([A-Z]{3,9}[\s-]+\d{4})\b/i
  ];

  for (const line of lines) {
    const cleanLine = line.trim();
    for (const pattern of patterns) {
      const match = cleanLine.match(pattern);
      if (match && match[1]) {
        const normalized = normalizeExpiry(match[1]);
        if (normalized) return normalized;
      }
    }
  }
  return null;
}

function extractManufacturer(text) {
  const lines = text.split("\n");
  const knownManufacturers = [
    "ZENOCARE", "AFYALINK", "MLIMANI", "KAAGA", "LAKEVIEW"
  ];

  for (const line of lines) {
    const cleanLine = line.trim().toUpperCase();
    for (const mfr of knownManufacturers) {
      if (cleanLine.includes(mfr)) return mfr;
    }
  }

  const candidates = lines
    .map(l => l.trim())
    .filter(l => l.length > 3 && /^[A-Z\s&]+$/i.test(l))
    .slice(0, 5);

  return candidates[0] || null;
}

module.exports = { extractPackFields, comparePack };