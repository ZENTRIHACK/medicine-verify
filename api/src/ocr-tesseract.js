"use strict";

const { createWorker } = require("tesseract.js");

const MIN_CONFIDENCE = 0.6;
const MIN_CLASSIFICATION_CONFIDENCE = 0.35;

const PACKAGING_SIGNALS = [
  /\b(?:BATCH|BATCH\s*(?:NO|NUMBER)|LOT\s*(?:NO|NUMBER)?)\b/i,
  /\b(?:EXP|EXPIRY|EXPIRATION|USE\s*BY|BB|BEST\s*BEFORE)\b/i,
  /\b(?:MFG|MANUFACTURED|MANUFACTURING|MFR)\b/i,
  /\b(?:TABLETS?|CAPSULES?|SYRUP|SUSPENSION|INJECTION|ORAL\s+SOLUTION|DROPS|OINTMENT)\b/i,
  /\b(?:MG|MCG|MICROGRAMS?|MILLIGRAMS?|ML|IU|G|GM)\b/i,
  /\b(?:DOSAGE|ACTIVE\s+INGREDIENT|COMPOSITION|PHARMACEUTICAL|MEDICINE)\b/i,
  /\b(?:KEEP\s+OUT\s+OF\s+REACH|STORE\s+BELOW|PRESCRIPTION\s+ONLY|FOR\s+ORAL\s+USE)\b/i,
  /\b(?:ZENOCARE|AFYALINK|MLIMANI|KAAGA|LAKEVIEW|KILIMO|LABS|PHARMA)\b/i
];

function cleanString(value) {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  return cleaned.length ? cleaned : null;
}

/**
 * Normalizes raw extracted text: uppercase, trim whitespace, remove non-printable characters.
 */
function normalizeRawOcrText(text) {
  if (typeof text !== "string") return "";
  return text
    .replace(/[^\x20-\x7E\r\n]/g, " ")
    .toUpperCase()
    .replace(/[ \t]+/g, " ")
    .trim();
}

/**
 * Parses multiple date formats (YYYY-MM-DD, MM/YY, MM/YYYY, DD/MM/YYYY, Month YYYY)
 * and returns standard YYYY-MM format.
 */
function normalizeDateString(raw) {
  if (!raw) return null;
  const s = raw.toUpperCase().replace(/\s+/g, " ").trim();

  // YYYY-MM or YYYY-MM-DD
  let match = s.match(/^(\d{4})[-/.](\d{1,2})(?:[-/.]\d{1,2})?$/);
  if (match) {
    const month = Number(match[2]);
    if (month >= 1 && month <= 12) {
      return `${match[1]}-${String(month).padStart(2, "0")}`;
    }
  }

  // DD/MM/YYYY or MM/DD/YYYY
  match = s.match(/^(\d{1,2})[/. -](\d{1,2})[/. -](\d{4})$/);
  if (match) {
    const first = Number(match[1]);
    const second = Number(match[2]);
    const month = first > 12 ? second : second > 12 ? first : second;
    if (month >= 1 && month <= 12) {
      return `${match[3]}-${String(month).padStart(2, "0")}`;
    }
  }

  // MM/YYYY
  match = s.match(/^(\d{1,2})[-/.](\d{4})$/);
  if (match) {
    const month = Number(match[1]);
    if (month >= 1 && month <= 12) {
      return `${match[2]}-${String(month).padStart(2, "0")}`;
    }
  }

  // MM/YY (2-digit year, e.g. 03/27 -> 2027-03)
  match = s.match(/^(\d{1,2})[-/.](\d{2})$/);
  if (match) {
    const month = Number(match[1]);
    const year = 2000 + Number(match[2]);
    if (month >= 1 && month <= 12) {
      return `${year}-${String(month).padStart(2, "0")}`;
    }
  }

  // Named month formats, e.g. MAR 2027, MARCH 2027, MAR-27
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

  match = s.match(/([A-Z]{3,9})[ -]+(\d{4}|\d{2})/);
  if (match && months[match[1]]) {
    let year = match[2];
    if (year.length === 2) year = String(2000 + Number(year));
    return `${year}-${months[match[1]]}`;
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

  if (!/^[A-Z0-9]{3,40}$/.test(normalized)) return null;
  if (/^(?:UNREADABLE|UNKNOWN|N\/A|NONE|NULL|UNDEFINED)$/i.test(raw)) {
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

/**
 * Substring & Fuzzy Batch Matching:
 * If the expected batch number (e.g. "B123") appears anywhere in the OCR text string,
 * set batchNo match to expected.batchNo. Otherwise, extract potential batch strings using regex.
 */
function extractBatchNo(text, expectedBatch) {
  if (!text) return null;
  const upper = text.toUpperCase();

  // 1. Substring match against expected batch number if provided
  if (expectedBatch) {
    const rawExpected = String(expectedBatch).trim().toUpperCase();
    const cleanExpected = rawExpected.replace(/[^A-Z0-9]/g, "");

    // Direct substring in text
    if (upper.includes(rawExpected) && rawExpected.length >= 3) {
      return expectedBatch;
    }

    // Normalized alphanumeric substring
    const normText = upper.replace(/[^A-Z0-9]/g, "");
    if (cleanExpected.length >= 3 && normText.includes(cleanExpected)) {
      return expectedBatch;
    }
  }

  // 2. Regex fallback: /BATCH[:\s#]*([A-Z0-9]+)/i or /LOT[:\s#]*([A-Z0-9]+)/i
  const lines = text.split(/\r?\n/);
  const patterns = [
    /\b(?:BATCH|LOT)\s*(?:NO\.?|NUMBER|#)?\s*[:#-]?\s*([A-Z0-9][A-Z0-9-]{2,39})\b/i,
    /(?:BATCH|LOT)[:\s#]*([A-Z0-9]{3,40})/i,
    /\bB\/N[:\s#]*([A-Z0-9]{3,40})/i,
    /\bLOT[:\s#]*([A-Z0-9]{3,40})/i
  ];

  for (const line of lines) {
    for (const pattern of patterns) {
      const match = line.trim().match(pattern);
      if (match && match[1]) {
        const cleaned = match[1].replace(/[^A-Z0-9-]/gi, "");
        if (normalizeBatch(cleaned)) {
          return cleaned;
        }
      }
    }
  }

  // Check full text block if line-by-line missed
  for (const pattern of patterns) {
    const match = upper.match(pattern);
    if (match && match[1]) {
      const cleaned = match[1].replace(/[^A-Z0-9-]/gi, "");
      if (normalizeBatch(cleaned)) {
        return cleaned;
      }
    }
  }

  return null;
}

/**
 * Date Normalization: Parse date formats (YYYY-MM-DD, MM/YY, MM/YYYY, DD/MM/YYYY).
 * Convert extracted month/year to match expected expiry year and month.
 */
function extractExpiry(text, expectedExpiry) {
  if (!text) return null;
  const upper = text.toUpperCase();

  let expectedYear = null;
  let expectedMonth = null;
  if (expectedExpiry) {
    const mExp = String(expectedExpiry).match(/(\d{4})[-/.](\d{1,2})/);
    if (mExp) {
      expectedYear = mExp[1];
      expectedMonth = String(Number(mExp[2])).padStart(2, "0");
    }
  }

  const lines = text.split(/\r?\n/);
  const patterns = [
    /\b(?:EXP|EXPIRY|EXPIRATION|USE\s*BY|BB|BEST\s*BEFORE)\s*[:#-]?\s*(\d{4}[-/.]\d{1,2}(?:[-/.]\d{1,2})?)/i,
    /\b(?:EXP|EXPIRY|EXPIRATION|USE\s*BY|BB|BEST\s*BEFORE)\s*[:#-]?\s*(\d{1,2}[-/.]\d{1,2}[-/.]\d{4})/i,
    /\b(?:EXP|EXPIRY|EXPIRATION|USE\s*BY|BB|BEST\s*BEFORE)\s*[:#-]?\s*(\d{1,2}[-/.]\d{4})/i,
    /\b(?:EXP|EXPIRY|EXPIRATION|USE\s*BY|BB|BEST\s*BEFORE)\s*[:#-]?\s*(\d{1,2}[-/.]\d{2})\b/i,
    /\b(?:EXP|EXPIRY|EXPIRATION|USE\s*BY|BB|BEST\s*BEFORE)\s*[:#-]?\s*([A-Z]{3,9}[\s-]+\d{4})/i,
    /\b(?:EXP|EXPIRY|EXPIRATION|USE\s*BY|BB|BEST\s*BEFORE)\s*[:#-]?\s*([A-Z]{3,9}[\s-]+\d{2})\b/i
  ];

  for (const line of lines) {
    for (const pattern of patterns) {
      const match = line.trim().match(pattern);
      if (match && match[1]) {
        const normalized = normalizeDateString(match[1]);
        if (normalized) {
          // If expected year and month exist, verify match
          if (expectedYear && expectedMonth) {
            const [y, m] = normalized.split("-");
            if (y === expectedYear && m === expectedMonth) {
              return `${expectedYear}-${expectedMonth}`;
            }
          }
          return normalized;
        }
      }
    }
  }

  // If expected year and month appear in the text
  if (expectedYear && expectedMonth) {
    if (upper.includes(expectedYear) && (upper.includes(expectedMonth) || upper.includes(`/${expectedMonth}`) || upper.includes(`-${expectedMonth}`))) {
      return `${expectedYear}-${expectedMonth}`;
    }
  }

  return null;
}

/**
 * Flexible Manufacturer Detection:
 * Performs a case-insensitive fuzzy search for vendor keywords (e.g. "ZENOCARE" or "LABS").
 */
function extractManufacturer(text, expectedManufacturer) {
  if (!text) return null;
  const upper = text.toUpperCase();

  const knownVendors = [
    { canonical: "Zenocare Labs (demo)", key: "ZENOCARE", keywords: ["ZENOCARE", "ZENO CARE", "LABS"] },
    { canonical: "AfyaLink Distributors (demo)", key: "AFYALINK", keywords: ["AFYALINK", "AFYA LINK", "AFYA"] },
    { canonical: "Mlimani Pharmacy (demo)", key: "MLIMANI", keywords: ["MLIMANI"] },
    { canonical: "Kaaga Chemist (demo)", key: "KAAGA", keywords: ["KAAGA"] },
    { canonical: "Lakeview Pharmacy (demo)", key: "LAKEVIEW", keywords: ["LAKEVIEW"] },
    { canonical: "Kilimo Pharma Ltd (demo)", key: "KILIMO", keywords: ["KILIMO", "PHARMA"] }
  ];

  // If expected manufacturer is known, check its keywords first
  if (expectedManufacturer) {
    const expUpper = String(expectedManufacturer).toUpperCase();
    for (const vendor of knownVendors) {
      if (expUpper.includes(vendor.key) || vendor.keywords.some(k => expUpper.includes(k))) {
        if (vendor.keywords.some(k => upper.includes(k))) {
          return expectedManufacturer;
        }
      }
    }
  }

  // Check known vendors in OCR text
  for (const vendor of knownVendors) {
    if (vendor.keywords.some(k => upper.includes(k))) {
      return vendor.canonical;
    }
  }

  return null;
}

function classifyMedicinePackage(text, hasDetectedFields) {
  const normalizedText = cleanString(text);

  if (!normalizedText) {
    return {
      isMedicinePackage: false,
      classificationConfidence: 0
    };
  }

  // If batch or expiry was extracted, that is strong evidence of a medicine package
  if (hasDetectedFields) {
    return {
      isMedicinePackage: true,
      classificationConfidence: 0.95
    };
  }

  const signalCount = PACKAGING_SIGNALS.reduce(
    (count, pattern) => count + Number(pattern.test(normalizedText)),
    0
  );

  const isMedicinePackage = signalCount >= 2;

  return {
    isMedicinePackage,
    classificationConfidence: Math.min(signalCount / 4, 1)
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
            console.log(`OCR progress: ${Math.round(message.progress * 100)}%`);
          }
        }
      });

      workerReady = true;
      console.log("Tesseract OCR worker ready");

      return worker;
    } catch (error) {
      initError = error;
      initPromise = null;
      console.error("Failed to initialize Tesseract worker:", error.message);
      throw error;
    }
  })();

  return initPromise;
}

/**
 * Refactored extractPackFields(imageBuffer, mimeType, expectedRecord)
 * - Normalizes raw text
 * - Substring & fuzzy batch matching with expected batch
 * - Date normalization across multiple formats
 * - Flexible manufacturer keyword detection
 * - Dynamic confidence score based on character confidence and match count
 */
async function extractPackFields(imageBuffer, mimeType, expected) {
  if (
    !Buffer.isBuffer(imageBuffer) ||
    imageBuffer.length === 0 ||
    !["image/jpeg", "image/png", "image/webp"].includes(mimeType)
  ) {
    return failureResult();
  }

  const expectedBatch = expected?.batchNo || null;
  const expectedExpiry = expected?.expiry || null;
  const expectedMfr = expected?.manufacturer || null;

  try {
    const ocrWorker = await initializeWorker();
    const { data } = await ocrWorker.recognize(imageBuffer);

    const rawText = typeof data.text === "string" ? data.text : "";
    const cleanText = normalizeRawOcrText(rawText);
    const rawConfidence = Number(data.confidence) / 100;

    if (!cleanText || !Number.isFinite(rawConfidence)) {
      return failureResult();
    }

    const batchNo = extractBatchNo(cleanText, expectedBatch);
    const expiry = extractExpiry(cleanText, expectedExpiry);
    const manufacturer = extractManufacturer(cleanText, expectedMfr);

    const hasDetectedFields = Boolean(batchNo || expiry);
    const classification = classifyMedicinePackage(cleanText, hasDetectedFields);

    if (!classification.isMedicinePackage) {
      return {
        ...failureResult(),
        classificationConfidence: classification.classificationConfidence
      };
    }

    // Dynamic confidence score based on OCR character confidence and match count
    let matchCount = 0;
    if (batchNo) matchCount += 1;
    if (expiry) matchCount += 1;
    if (manufacturer) matchCount += 1;

    // Field match factor: 3 fields = 1.0
    const fieldFactor = matchCount / 3;
    let dynamicConfidence = Math.min(1, Math.max(0, (rawConfidence * 0.4) + (fieldFactor * 0.6)));

    // Boost confidence if detected fields align with expected record
    if (expectedBatch && batchNo && normalizeBatch(batchNo) === normalizeBatch(expectedBatch)) {
      dynamicConfidence = Math.max(dynamicConfidence, 0.85);
    }

    return {
      isMedicinePackage: true,
      batchNo,
      expiry,
      manufacturer,
      confidence: Math.max(0, Math.min(dynamicConfidence, 1)),
      classificationConfidence: classification.classificationConfidence
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

  if (fields.isMedicinePackage !== true) {
    return {
      match: "not_medicine",
      differences: ["The image could not be identified as medicine packaging."]
    };
  }

  const extractedBatch = normalizeBatch(fields.batchNo);
  const registeredBatch = normalizeBatch(registered.batchNo);
  const extractedExpiry = normalizeDateString(fields.expiry);
  const registeredExpiry = normalizeDateString(registered.expiry);

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

  if (registeredManufacturer) {
    if (!extractedManufacturer) {
      differences.push("The manufacturer could not be read from the package.");
    } else if (
      extractedManufacturer !== registeredManufacturer &&
      !extractedManufacturer.includes(registeredManufacturer) &&
      !registeredManufacturer.includes(extractedManufacturer)
    ) {
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
  comparePack,
  normalizeRawOcrText,
  normalizeDateString,
  normalizeBatch,
  normalizeManufacturer
};
