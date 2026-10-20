import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  FileSearch,
  History,
  ScanLine,
  ShieldAlert,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { saveScan } from "../utils/scanStorage";

const demoRecords = {
  match: {
    product: "Aleron 500",
    batchNo: "ALR-2026-008",
    uniqueCode: "MS-K7P9-X2Q4",
    expiry: "2027-08",
    manufacturer: "Example Pharmaceuticals",
    distributor: "Example Medical Distributors",
    pharmacy: "Example Community Pharmacy",
    outcome: "match",
    codeStatus: "unused",
    differences: [],
  },
  mismatch: {
    product: "Nuvex 10",
    batchNo: "NVX-2026-031",
    uniqueCode: "MS-P4D8-M6R2",
    expiry: "2027-03",
    manufacturer: "Example Pharmaceuticals",
    distributor: "No verified transfer record",
    pharmacy: "Not recorded",
    outcome: "mismatch",
    codeStatus: "unused",
    differences: [
      "The extracted batch details differ from the demonstration registry record.",
    ],
  },
  unreadable: {
    product: "Medicine not identified",
    batchNo: null,
    uniqueCode: null,
    expiry: null,
    manufacturer: null,
    distributor: null,
    pharmacy: null,
    outcome: "unreadable",
    codeStatus: "unknown",
    differences: [],
  },
};

const outcomes = {
  match: {
    title: "Matches registry",
    description:
      "The available packaging details match the demonstration registry record.",
    icon: CheckCircle2,
    classes: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
  mismatch: {
    title: "Verification concern",
    description:
      "Some details do not match the demonstration registry record. Further investigation is needed.",
    icon: ShieldAlert,
    classes: "border-amber-200 bg-amber-50 text-amber-900",
  },
  unreadable: {
    title: "Unable to verify",
    description:
      "We could not read enough information to complete the comparison.",
    icon: TriangleAlert,
    classes: "border-red-200 bg-red-50 text-red-800",
  },
};

export default function VerificationResult() {
  const [searchParams, setSearchParams] = useSearchParams();

  const demoType = searchParams.get("demo") || "match";
  const isUploadedImage = searchParams.get("source") === "upload";
  const record = demoRecords[demoType] || demoRecords.match;

  // Stable ID for each demonstration scenario.
  // The real scanning flow will generate a unique ID for each scan.
  const scanId = searchParams.get("scanId") || `demo-${demoType}`;

  const [codeStatus, setCodeStatus] = useState(
    searchParams.get("used") === "true"
      ? "dispensed"
      : record.codeStatus
  );

  const result = outcomes[record.outcome];
  const ResultIcon = result.icon;

  useEffect(() => {
    const saved = saveScan({
      id: scanId,
      product: record.product,
      batchNo: record.batchNo,
      uniqueCode: record.uniqueCode,
      expiry: record.expiry,
      manufacturer: record.manufacturer,
      distributor: record.distributor,
      pharmacy: record.pharmacy,
      status: record.outcome,
      codeStatus,
      differences: record.differences,
      events: [],
      demo: true,
    });

    if (!saved) {
      console.error("MediScan could not save this result locally.");
    }
  }, [scanId, record, codeStatus]);

  function changeDemoStatus(value) {
    setCodeStatus(value);

    setSearchParams({
      demo: demoType,
      scanId,
      used: value === "dispensed" ? "true" : "false",
    });
  }

  const hasConcern =
    record.outcome !== "match" || codeStatus === "dispensed";

  const detailsUrl =
    `/medicine-details?id=${encodeURIComponent(scanId)}` +
    `&demo=${encodeURIComponent(demoType)}` +
    `&used=${codeStatus === "dispensed"}`;

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6 sm:py-9">
      <Link
        to="/scan"
        className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-[#4926C8]"
      >
        <ScanLine size={17} />
        Scan another medicine
      </Link>

      <header>
        <p className="text-[10px] font-extrabold tracking-[2px] text-[#4926C8]">
          MEDISCAN VERIFICATION
        </p>

        <h1 className="mt-2 text-3xl font-extrabold text-[#242039]">
          Your scan result
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          {isUploadedImage ? "Your scan is ready for backend integration." : "Here's what we found in this demonstration record."}
        </p>
      </header>

      <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
        <strong>{isUploadedImage ? "SCAN RECEIVED — VERIFICATION NOT RUN." : "DEMO PREVIEW."}</strong>{" "}
        {isUploadedImage
          ? "Your image was selected, but OCR and the live registry API are not connected yet. No medicine authenticity conclusion has been made."
          : "This result uses fictional sample data. It has not been checked against a live registry."}
      </div>

      {/* Main verification outcome */}
      <section
        className={`rounded-3xl border p-6 sm:p-8 ${result.classes}`}
      >
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/80">
            <ResultIcon size={30} />
          </div>

          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[1.5px]">
              Verification outcome
            </p>

            <h2 className="mt-2 text-2xl font-extrabold">
              {result.title}
            </h2>

            <p className="mt-3 text-sm leading-6 opacity-90">
              {result.description}
            </p>
          </div>
        </div>

        {hasConcern && (
          <div className="mt-5 flex items-start gap-3 rounded-xl bg-white/80 p-4 text-sm leading-6">
            <CircleAlert size={20} className="mt-0.5 shrink-0" />

            <p>
              Do not rely on this demonstration result to decide whether to
              use a medicine. If you have concerns, seek advice from a
              qualified pharmacist or healthcare professional.
            </p>
          </div>
        )}
      </section>

      {/* Unique pack code */}
      {record.uniqueCode && (
        <section className="rounded-2xl border border-[#E9E5F1] bg-white p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-[#4926C8]">
              <ShieldCheck size={22} />
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="font-bold text-[#242039]">
                Unique pack code
              </h2>

              <p className="mt-1 break-all font-mono text-sm text-gray-600">
                {record.uniqueCode}
              </p>

              <div className="mt-4 flex items-start gap-2">
                {codeStatus === "dispensed" ? (
                  <CircleAlert
                    size={18}
                    className="mt-0.5 shrink-0 text-amber-600"
                  />
                ) : (
                  <CheckCircle2
                    size={18}
                    className="mt-0.5 shrink-0 text-emerald-600"
                  />
                )}

                <div>
                  <p className="text-sm font-bold text-[#242039]">
                    {codeStatus === "dispensed"
                      ? "Previously recorded as dispensed"
                      : codeStatus === "unknown"
                        ? "Code status unknown"
                        : "No prior dispensing recorded"}
                  </p>

                  <p className="mt-1 text-xs leading-5 text-gray-500">
                    {codeStatus === "dispensed"
                      ? "This demonstration code has a previous dispensing record. A repeated scan or copied code requires investigation."
                      : codeStatus === "unknown"
                        ? "The code status could not be established."
                        : "This demonstration record contains no prior dispensing event. That does not prove the package is genuine or unused."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Basic product information */}
      <section className="rounded-2xl border border-[#E9E5F1] bg-white p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-100 text-[#4926C8]">
            <FileSearch size={22} />
          </div>

          <div>
            <h2 className="font-bold text-[#242039]">
              Medicine identified
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Basic product information
            </p>
          </div>
        </div>

        <h3 className="mt-5 text-xl font-extrabold text-[#28145F]">
          {record.product}
        </h3>

        <p className="mt-2 text-sm text-gray-500">
          Batch: {record.batchNo || "Not available"}
        </p>

        <Link
          to={detailsUrl}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#4926C8] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#381BA8] sm:w-auto"
        >
          View full medicine details
          <ArrowRight size={17} />
        </Link>
      </section>

      {/* Supply chain summary */}
      <section className="rounded-2xl border border-[#E9E5F1] bg-white p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <History size={21} className="text-[#4926C8]" />

          <div>
            <h2 className="font-bold text-[#242039]">
              Recorded supply chain
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Sample information, where available
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {[
            ["Manufacturer", record.manufacturer],
            ["Distributor", record.distributor],
            ["Pharmacy", record.pharmacy],
          ].map(([label, value], index) => (
            <div key={label} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={`h-3 w-3 rounded-full ${
                    value &&
                    !value.startsWith("No ") &&
                    value !== "Not recorded"
                      ? "bg-[#4926C8]"
                      : "bg-gray-300"
                  }`}
                />

                {index < 2 && (
                  <span className="my-1 h-6 w-px bg-gray-200" />
                )}
              </div>

              <div className="-mt-1 min-w-0 pb-2">
                <p className="text-xs text-gray-500">{label}</p>
                <p className="mt-1 break-words text-sm font-semibold text-[#242039]">
                  {value || "Not available"}
                </p>
              </div>
            </div>
          ))}
        </div>

        <Link
          to={detailsUrl}
          className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-[#4926C8] hover:underline"
        >
          Explore full history
          <ArrowRight size={16} />
        </Link>
      </section>

      {/* Developer-only demonstration control */}
      <details className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4">
        <summary className="cursor-pointer text-sm font-bold text-gray-600">
          Developer preview: simulate a dispensing record
        </summary>

        <p className="mt-3 text-xs leading-5 text-gray-500">
          This control is for UI testing only. It does not mark a real
          medicine as dispensed or update a backend database.
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => changeDemoStatus("unused")}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold"
          >
            No prior dispensing
          </button>

          <button
            type="button"
            onClick={() => changeDemoStatus("dispensed")}
            className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800"
          >
            Previously dispensed
          </button>
        </div>
      </details>

      <footer className="flex items-start gap-3 rounded-2xl border border-purple-100 bg-purple-50 p-4 text-[#5B4A85]">
        <ShieldCheck size={20} className="mt-0.5 shrink-0" />
        <p className="text-xs leading-6">
          Registry matching and code history do not test the medicine inside.
          If you are concerned about its effectiveness, speak with a qualified
          healthcare professional.
        </p>
      </footer>
    </div>
  );
}
