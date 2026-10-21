
"use strict";

const { createWorker } = require("tesseract.js");

const MIN_CONFIDENCE = 0.6;
const MIN_CLASSIFICATION_CONFIDENCE = 0.35;

const PACKAGING_SIGNALS = [
  /\b(?:BATCH|BATCH\s*(?:NO|NUMBER)|LOT\s*(?:NO|NUMBER)?)\b/i,
  /\b(?:EXP|EXPIRY|EXPIRATION|USE\s*BY)\b/i,
  /\b(?:MFG|MANUFACTURED|MANUFACTURING)\b/i,
  /\b(?:TABLETS?|CAPSULES?|SYRUP|SUSPENSION|INJECTION|ORAL\s+SOLUTION)\b/i,
  /\b(?:MG|MCG|MICROGRAMS?|MILLIGRAMS?|ML|IU)\b/i,
  /\b(?:DOSAGE|ACTIVE\s+INGREDIENT|COMPOSITION|PHARMACEUTICAL)\b/i,
  /\b(?:KEEP\s+OUT\s+OF\s+REACH|STORE\s+BELOW|PRESCRIPTION\s+ONLY)\b/i
];

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

  match = s.match(/^(\d{4})[-/.](\d{1,2})(?:[-/.]\d{1,2})?$/);

  if (match) {
    const month = Number(match[2]);

    if (month < 1 || month > 12) return null;

    return `${match[1]}-${String(month).padStart(2, "0")}`;
  }

  match = s.match(/^(\d{1,2})[/. -](\d{1,2})[/. -](\d{4})$/);

  if (match) {
    const first = Number(match[1]);
    const second = Number(match[2]);

    // Preserve the original interpretation where possible.
    const month = first > 12 ? second : second > 12 ? first : second;

    if (month < 1 || month > 12) return null;

    return `${match[3]}-${String(month).padStart(2, "0")}`;
  }

  match = s.match(/^(\d{1,2})[-/.](\d{4})$/);

  if (match) {
    const month = Number(match[1]);

    if (month < 1 || month > 12) return null;

    return `${match[2]}-${String(month).padStart(2, "0")}`;
  }

  const months = {
    JAN: "01", JANUARY: "01",
    FEB: "02", FEBRUARY: "02",
    MAR: "03", MARCH: "03",
    APR: "04", APRIL: "04",
    MAY: "05",
    JUN: "06", JUNE: "06",
    JUL: "07", JULY: "07",
    AUG: "08", AUGUST: "08",
    SEP: "09", SEPT: "09", SEPTEMBER: "09",
    OCT: "10", OCTOBER: "10",
    NOV: "11", NOVEMBER: "11",
    DEC: "12", DECEMBER: "12"
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

  const normalized = raw
    .toUpperCase()
    .replace(/[\s-]/g, "")
    .replace(/O/g, "0")
    .replace(/I/g, "1");

  // Do not allow sentinel values or arbitrary punctuation to pass.
  if (!/^[A-Z0-9]{4,40}$/.test(normalized)) return null;
  if (/^(?:UNREADABLE|UNKNOWN|N\/A|NONE|null|undefined)$/i.test(raw)) {
    return null;
  }

  return normalized;
}

function normalizeManufacturer(value) {
  const raw = cleanString(value);
  if (!raw) return null;

  if (/^(?:UNKNOWN|UNREADABLE|N\/A|NONE)$/i.test(raw)) {
    return null;
  }

  return raw
    .replace(/\([^)]*\)/g, " ")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function extractBatchNo(text) {
  const lines = text.split(/\r?\n/);

  const patterns = [
    /\b(?:BATCH|LOT)\s*(?:NO\.?|NUMBER|#)?\s*[:#-]?\s*([A-Z0-9][A-Z0-9-]{3,39})\b/i
  ];

  for (const line of lines) {
    for (const pattern of patterns) {
      const match = line.trim().match(pattern);

      if (match && normalizeBatch(match[1])) {
        return match[1].replace(/[^A-Z0-9-]/gi, "");
      }
    }
  }

  return null;
}

function extractExpiry(text) {
  const lines = text.split(/\r?\n/);

  const patterns = [
    /\b(?:EXP|EXPIRY|EXPIRATION|USE\s*BY)\s*[:#-]?\s*(\d{4}[-/.]\d{1,2}(?:[-/.]\d{1,2})?)/i,
    /\b(?:EXP|EXPIRY|EXPIRATION|USE\s*BY)\s*[:#-]?\s*(\d{1,2}[-/.]\d{1,2}[-/.]\d{4})/i,
    /\b(?:EXP|EXPIRY|EXPIRATION|USE\s*BY)\s*[:#-]?\s*(\d{1,2}[-/.]\d{4})/i,
    /\b(?:EXP|EXPIRY|EXPIRATION|USE\s*BY)\s*[:#-]?\s*([A-Z]{3,9}[\s-]+\d{4})/i
  ];

  for (const line of lines) {
    for (const pattern of patterns) {
      const match = line.trim().match(pattern);

      if (match && match[1]) {
        const normalized = normalizeExpiry(match[1]);

        if (normalized) return normalized;
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
      if (cleanLine.includes(manufacturer)) return manufacturer;
    }
  }

  // Do not guess a manufacturer from an arbitrary uppercase line.
  return null;
}

function classifyMedicinePackage(text) {
  const normalizedText = cleanString(text);

  if (!normalizedText) {
    return {
      isMedicinePackage: false,
      classificationConfidence: 0
    };
  }

  const signalCount = PACKAGING_SIGNALS.reduce(
    (count, pattern) => count + Number(pattern.test(normalizedText)),
    0
  );

  /*
   * This is a text-signal heuristic, NOT a visual classifier.
   * Multiple independent signals are required to reduce false positives.
   */
  const isMedicinePackage = signalCount >= 2;

  return {
    isMedicinePackage,
    classificationConfidence: Math.min(
      signalCount / 4,
      1
    )
  };
}

function failureResult() {
  return {
    isMedicinePackage: false,
    batchNo: null,
    expiry: null,
    manufacturer: null,
    confidence: 0,
    classificationConfidence: 0
  };
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
        logger: message => {
          if (message.status === "recognizing text") {
            console.log(
              `OCR progress: ${Math.round(message.progress * 100)}%`
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

      console.error(
        "Failed to initialize Tesseract worker:",
        error.message
      );

      throw error;
    }
  })();

  return initPromise;
}

async function extractPackFields(imageBuffer, mimeType) {
  if (
    !Buffer.isBuffer(imageBuffer) ||
    imageBuffer.length === 0 ||
    !["image/jpeg", "image/png", "image/webp"].includes(mimeType)
  ) {
    return failureResult();
  }

  try {
    const ocrWorker = await initializeWorker();

    const { data } = await ocrWorker.recognize(imageBuffer);

    const text = typeof data.text === "string" ? data.text : "";
    const confidence = Number(data.confidence) / 100;

    if (!text.trim() || !Number.isFinite(confidence)) {
      return failureResult();
    }

    const classification = classifyMedicinePackage(text);

    if (!classification.isMedicinePackage) {
      return {
        ...failureResult(),
        classificationConfidence:
          classification.classificationConfidence
      };
    }

    const batchNo = extractBatchNo(text);
    const expiry = extractExpiry(text);
    const manufacturer = extractManufacturer(text);

    return {
      isMedicinePackage: true,
      batchNo,
      expiry,
      manufacturer,
      confidence: Math.max(0, Math.min(confidence, 1)),
      classificationConfidence:
        classification.classificationConfidence
    };
  } catch (error) {
    console.error(
      "Tesseract OCR extraction failed:",
      error.message
    );

    return failureResult();
  }
}

function comparePack(extracted, record) {
  const fields =
    extracted && typeof extracted === "object" ? extracted : {};

  const registered =
    record && typeof record === "object" ? record : {};

  const confidence = Number(fields.confidence);

  if (fields.isMedicinePackage !== true) {
    return {
      match: "not_medicine",
      differences: [
        "The image could not be identified as medicine packaging."
      ]
    };
  }

  const extractedBatch = normalizeBatch(fields.batchNo);
  const registeredBatch = normalizeBatch(registered.batchNo);

  const extractedExpiry = normalizeExpiry(fields.expiry);
  const registeredExpiry = normalizeExpiry(registered.expiry);

  if (
    !Number.isFinite(confidence) ||
    confidence < MIN_CONFIDENCE ||
    !extractedBatch ||
    !registeredBatch ||
    !extractedExpiry ||
    !registeredExpiry
  ) {
    return {
      match: "unreadable",
      differences: [
        ...(!extractedBatch || !registeredBatch
          ? ["A valid extracted and registered batch number is required."]
          : []),
        ...(!extractedExpiry || !registeredExpiry
          ? ["A valid extracted and registered expiry date is required."]
          : []),
        ...(!Number.isFinite(confidence) || confidence < MIN_CONFIDENCE
          ? ["OCR confidence is below the verification threshold."]
          : [])
      ]
    };
  }

  const differences = [];

  if (extractedBatch !== registeredBatch) {
    differences.push(
      `Batch number on pack is ${fields.batchNo}; registered batch number is ${registered.batchNo}.`
    );
  }

  if (extractedExpiry !== registeredExpiry) {
    differences.push(
      `Expiry on pack is ${extractedExpiry}; registered expiry is ${registeredExpiry}.`
    );
  }

  const extractedManufacturer = normalizeManufacturer(fields.manufacturer);
  const registeredManufacturer = normalizeManufacturer(registered.manufacturer);

  /*
   * If the trusted record has a manufacturer, extracted manufacturer
   * data is required and must match. Missing data is not a match.
   */
  if (registeredManufacturer) {
    if (!extractedManufacturer) {
      differences.push(
        "The manufacturer could not be read from the package."
      );
    } else if (extractedManufacturer !== registeredManufacturer) {
      differences.push(
        `Manufacturer on pack is ${fields.manufacturer}; registered manufacturer is ${registered.manufacturer}.`
      );
    }
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
