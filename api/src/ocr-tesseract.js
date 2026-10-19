
"use strict";

const { createWorker } = require("tesseract.js");

const MIN_CONFIDENCE = 0.6;
const OCR_TIMEOUT_MS = 60_000;

function failureResult() {
  return {
    batchNo: null,
    expiry: null,
    manufacturer: null,
    confidence: 0
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

  const s = raw
    .toUpperCase()
    .replace(/,/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  let match;

  // YYYY-MM or YYYY-MM-DD
  match = s.match(/^(\d{4})[-/.](\d{1,2})(?:[-/.]\d{1,2})?$/);
  if (match) {
    const month = Number(match[2]);

    if (month < 1 || month > 12) return null;

    return `${match[1]}-${String(month).padStart(2, "0")}`;
  }

  // DD/MM/YYYY or MM/DD/YYYY.
  // When ambiguous, prefer DD/MM/YYYY, common in Kenya.
  match = s.match(/^(\d{1,2})[/. -](\d{1,2})[/. -](\d{4})$/);
  if (match) {
    const first = Number(match[1]);
    const second = Number(match[2]);

    let month;

    if (first > 12) {
      month = second;
    } else if (second > 12) {
      month = first;
    } else {
      month = second;
    }

    if (month < 1 || month > 12) return null;

    return `${match[3]}-${String(month).padStart(2, "0")}`;
  }

  // MM-YYYY
  match = s.match(/^(\d{1,2})[-/.](\d{4})$/);
  if (match) {
    const month = Number(match[1]);

    if (month < 1 || month > 12) return null;

    return `${match[2]}-${String(month).padStart(2, "0")}`;
  }

  // JAN 2027, JANUARY 2027, etc.
  const months = {
    JAN: "01",
    JANUARY: "01",
    FEB: "02",
    FEBRUARY: "02",
    MAR: "03",
    MARCH: "03",
    APR: "04",
    APRIL: "04",
    MAY: "05",
    JUN: "06",
    JUNE: "06",
    JUL: "07",
    JULY: "07",
    AUG: "08",
    AUGUST: "08",
    SEP: "09",
    SEPT: "09",
    SEPTEMBER: "09",
    OCT: "10",
    OCTOBER: "10",
    NOV: "11",
    NOVEMBER: "11",
    DEC: "12",
    DECEMBER: "12"
  };

  match = s.match(/^([A-Z]+)[ -]+(\d{4})$/);

  if (match && months[match[1]]) {
    return `${match[2]}-${months[match[1]]}`;
  }

  return null;
}

function normalizeBatch(value) {
  const raw = cleanString(value);
  if (!raw) return null;

  // Normalize common OCR character confusions.
  return raw
    .toUpperCase()
    .replace(/[\s-]/g, "")
    .replace(/O/g, "0")
    .replace(/I/g, "1");
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
  const lines = text.split(/\r?\n/);

  const patterns = [
    /\b(?:BATCH|LOT)(?:\s*(?:NO|NUMBER|#))?\s*[:#-]?\s*([A-Z0-9][A-Z0-9-]{4,})\b/i,
    /\b([A-Z]{2,4}[0-9]{4,}[A-Z0-9-]*)\b/i
  ];

  for (const line of lines) {
    const cleanLine = line.trim();

    for (const pattern of patterns) {
      const match = cleanLine.match(pattern);

      if (match && match[1]) {
        const candidate = match[1]
          .toUpperCase()
          .replace(/[^A-Z0-9-]/g, "");

        // Avoid treating short labels as batch numbers.
        if (candidate.length >= 6) {
          return candidate;
        }
      }
    }
  }

  return null;
}

function extractExpiry(text) {
  const lines = text.split(/\r?\n/);

  const patterns = [
    /\b(?:EXP|EXPIRY|EXPIRATION|USE\s*BY|BEST\s*BEFORE)\s*[:#-]?\s*(\d{4}[-/.]\d{1,2}(?:[-/.]\d{1,2})?)/i,
    /\b(?:EXP|EXPIRY|EXPIRATION|USE\s*BY|BEST\s*BEFORE)\s*[:#-]?\s*(\d{1,2}[/. -]\d{1,2}[/. -]\d{4})/i,
    /\b(?:EXP|EXPIRY|EXPIRATION|USE\s*BY|BEST\s*BEFORE)\s*[:#-]?\s*(\d{1,2}[-/.]\d{4})/i,
    /\b(\d{4}[-/.]\d{1,2}[-/.]\d{1,2})\b/,
    /\b(\d{1,2}[/. -]\d{1,2}[/. -]\d{4})\b/,
    /\b(\d{1,2}[-/.]\d{4})\b/,
    /\b([A-Z]{3,9}[\s-]+\d{4})\b/i
  ];

  for (const line of lines) {
    const cleanLine = line.trim();

    for (const pattern of patterns) {
      const match = cleanLine.match(pattern);

      if (match && match[1]) {
        const normalized = normalizeExpiry(match[1]);

        if (normalized) {
          return normalized;
        }
      }
    }
  }

  return null;
}

function extractManufacturer(text) {
  const lines = text.split(/\r?\n/);

  const knownManufacturers = [
    "ZENOCARE",
    "AFYALINK",
    "MLIMANI",
    "KAAGA",
    "LAKEVIEW"
  ];

  for (const line of lines) {
    const cleanLine = line.trim().toUpperCase();

    for (const manufacturer of knownManufacturers) {
      if (cleanLine.includes(manufacturer)) {
        return manufacturer;
      }
    }
  }

  const candidates = lines
    .map((line) => line.trim())
    .filter((line) => {
      return (
        line.length > 3 &&
        /^[A-Z][A-Z\s&.'()-]*$/i.test(line) &&
        !/^(BATCH|LOT|EXP|EXPIRY|MFG|MANUFACTURED|MEDICINE|TABLETS|CAPSULES)$/i.test(line)
      );
    });

  return candidates[0] || null;
}

let worker = null;
let workerReady = false;
let initPromise = null;
let initError = null;

async function initializeWorker() {
  if (workerReady) return worker;
  if (initError) throw initError;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      console.log("Initializing Tesseract OCR worker...");

      worker = await createWorker("eng", 1, {
        logger: (message) => {
          if (message.status === "recognizing text") {
            console.log(
              `OCR progress: ${Math.round(message.progress * 100)}%`
            );
          } else if (
            message.status === "loading language" ||
            message.status === "initializing tesseract"
          ) {
            console.log(
              `OCR init: ${message.status} ${
                message.progress
                  ? `${Math.round(message.progress * 100)}%`
                  : ""
              }`
            );
          }
        }
      });

      workerReady = true;
      console.log("Tesseract OCR worker ready");

      return worker;
    } catch (error) {
      initError = error;
      initPromise = null;

      console.error("Failed to initialize Tesseract worker:", error);
      throw error;
    }
  })();

  return initPromise;
}

async function extractPackFields(imageBuffer, mimeType) {
  if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length === 0) {
    throw new Error("OCR received an empty or invalid image buffer");
  }

  if (typeof mimeType !== "string" || !mimeType.startsWith("image/")) {
    throw new Error("OCR received an unsupported file type");
  }

  try {
    const activeWorker = await initializeWorker();

    let timeoutId;

    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`OCR timed out after ${OCR_TIMEOUT_MS} ms`));
      }, OCR_TIMEOUT_MS);
    });

    let result;

    try {
      result = await Promise.race([
        activeWorker.recognize(imageBuffer),
        timeoutPromise
      ]);
    } finally {
      clearTimeout(timeoutId);
    }

    const data = result && result.data ? result.data : {};
    const text = typeof data.text === "string" ? data.text : "";
    const confidence = Number(data.confidence) / 100;

    if (!text.trim() || !Number.isFinite(confidence) || confidence < 0.1) {
      console.warn("OCR completed but could not read enough text.");
      return failureResult();
    }

    const fields = {
      batchNo: extractBatchNo(text),
      expiry: extractExpiry(text),
      manufacturer: extractManufacturer(text),
      confidence: Math.round(confidence * 100) / 100
    };

    console.log("OCR extraction completed:", {
      batchDetected: Boolean(fields.batchNo),
      expiryDetected: Boolean(fields.expiry),
      manufacturerDetected: Boolean(fields.manufacturer),
      confidence: fields.confidence
    });

    return fields;
  } catch (error) {
    console.error("Tesseract OCR extraction failed:", error);
    throw error;
  }
}

function comparePack(extracted, record) {
  const fields =
    extracted && typeof extracted === "object" ? extracted : {};

  const registered =
    record && typeof record === "object" ? record : {};

  const confidence = Number(fields.confidence);

  if (
    !cleanString(fields.batchNo) ||
    !cleanString(fields.expiry) ||
    !Number.isFinite(confidence) ||
    confidence < MIN_CONFIDENCE
  ) {
    return {
      match: "unreadable",
      differences: []
    };
  }

  const differences = [];

  const extractedBatch = normalizeBatch(fields.batchNo);
  const registeredBatch = normalizeBatch(registered.batchNo);

  if (
    !extractedBatch ||
    !registeredBatch ||
    extractedBatch !== registeredBatch
  ) {
    differences.push(
      `Batch number on pack is ${
        cleanString(fields.batchNo) || "unreadable"
      }, registered batch number is ${
        cleanString(registered.batchNo) || "unavailable"
      }`
    );
  }

  const extractedExpiry = normalizeExpiry(fields.expiry);
  const registeredExpiry = normalizeExpiry(registered.expiry);

  if (
    !extractedExpiry ||
    !registeredExpiry ||
    extractedExpiry !== registeredExpiry
  ) {
    differences.push(
      `Expiry on pack is ${
        extractedExpiry || cleanString(fields.expiry) || "unreadable"
      }, registered expiry is ${
        registeredExpiry || cleanString(registered.expiry) || "unavailable"
      }`
    );
  }

  const extractedManufacturer = normalizeManufacturer(fields.manufacturer);
  const registeredManufacturer = normalizeManufacturer(
    registered.manufacturer
  );

  if (
    extractedManufacturer &&
    registeredManufacturer &&
    extractedManufacturer !== registeredManufacturer
  ) {
    differences.push(
      `Manufacturer on pack is ${
        cleanString(fields.manufacturer)
      }, registered manufacturer is ${
        cleanString(registered.manufacturer)
      }`
    );
  }

  return {
    match: differences.length ? "mismatch" : "match",
    differences
  };
}

module.exports = {
  extractPackFields,
  comparePack
};
