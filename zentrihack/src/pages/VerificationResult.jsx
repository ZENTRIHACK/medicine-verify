
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  FileSearch,
  ScanLine,
  ShieldAlert,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";

const demoResults = {
  match: {
    title: "Matches registry",
    description:
      "The extracted packaging details match the selected demonstration registry record.",
    icon: CheckCircle2,
    color: "green",
    batch: "DEMO-2026-001",
    expiry: "2027-03",
    manufacturer: "Example Pharmaceuticals",
    differences: [],
  },

  mismatch: {
    title: "Does not match registry",
    description:
      "One or more extracted details differ from the demonstration registry record.",
    icon: ShieldAlert,
    color: "orange",
    batch: "DEMO-2026-009",
    expiry: "2027-03",
    manufacturer: "Example Pharmaceuticals",
    differences: [
      "The extracted batch number differs from the demonstration registry record.",
    ],
  },

  unreadable: {
    title: "Unable to read details",
    description:
      "The required details could not be read reliably. Try taking a clearer photograph.",
    icon: TriangleAlert,
    color: "red",
    batch: null,
    expiry: null,
    manufacturer: null,
    differences: [],
  },
};

export default function VerificationResult() {
  const [searchParams] = useSearchParams();
  const demoStatus = searchParams.get("demo");
  const result = demoResults[demoStatus];

  if (!result) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <div className="rounded-3xl border border-[#E9E5F1] bg-white p-8 text-center sm:p-12">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-100 text-[#4926C8]">
            <FileSearch size={30} />
          </div>

          <h1 className="mt-5 text-2xl font-extrabold text-[#242039]">
            No verification result yet
          </h1>

          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-gray-500">
            Upload or capture a medicine-pack image first. Actual results will
            appear here after the OCR and registry API are connected.
          </p>

          <Link
            to="/scan"
            className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#4926C8] px-5 py-3 text-sm font-bold text-white hover:bg-[#381BA8]"
          >
            <ScanLine size={17} />
            Go to Scan Medicine
          </Link>
        </div>
      </div>
    );
  }

  const Icon = result.icon;

  const styles = {
    green: {
      panel: "border-emerald-200 bg-emerald-50",
      icon: "bg-emerald-100 text-emerald-700",
      title: "text-emerald-900",
      badge: "bg-emerald-100 text-emerald-800",
    },
    orange: {
      panel: "border-orange-200 bg-orange-50",
      icon: "bg-orange-100 text-orange-700",
      title: "text-orange-900",
      badge: "bg-orange-100 text-orange-800",
    },
    red: {
      panel: "border-red-200 bg-red-50",
      icon: "bg-red-100 text-red-700",
      title: "text-red-900",
      badge: "bg-red-100 text-red-800",
    },
  };

  const style = styles[result.color];

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6 sm:py-9">
      <Link
        to="/scan"
        className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-[#4926C8]"
      >
        <ArrowLeft size={17} />
        Back to scanning
      </Link>

      <header>
        <p className="text-[10px] font-extrabold tracking-[2px] text-[#4926C8]">
          MEDICINE VERIFICATION
        </p>

        <h1 className="mt-2 text-3xl font-extrabold text-[#242039]">
          Verification result
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          Review the comparison outcome and the details available.
        </p>
      </header>

      <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
        <strong>DEMO PREVIEW — NOT A REAL VERIFICATION.</strong> This result
        uses fictional sample data and is not based on your uploaded image or a
        live medicine registry.
      </div>

      <section className={`rounded-3xl border p-6 sm:p-8 ${style.panel}`}>
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <div
            className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl ${style.icon}`}
          >
            <Icon size={34} />
          </div>

          <div>
            <span
              className={`inline-block rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide ${style.badge}`}
            >
              Demo outcome
            </span>

            <h2 className={`mt-2 text-2xl font-extrabold ${style.title}`}>
              {result.title}
            </h2>

            <p className="mt-2 max-w-xl text-sm leading-6 text-gray-600">
              {result.description}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[#E9E5F1] bg-white p-5 sm:p-7">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-[#4926C8]">
            <FileSearch size={21} />
          </div>

          <div>
            <h2 className="font-bold text-[#242039]">Extracted details</h2>
            <p className="mt-1 text-xs text-gray-500">
              Fictional example fields
            </p>
          </div>
        </div>

        <div className="mt-5 divide-y divide-gray-100">
          {[
            ["Batch number", result.batch],
            ["Expiry date", result.expiry],
            ["Manufacturer", result.manufacturer],
          ].map(([label, value]) => (
            <div
              key={label}
              className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
            >
              <span className="text-sm text-gray-500">{label}</span>

              <span className="break-words text-sm font-semibold text-[#242039] sm:text-right">
                {value || "Not available"}
              </span>
            </div>
          ))}
        </div>
      </section>

      {result.differences.length > 0 && (
        <section className="rounded-2xl border border-orange-200 bg-white p-5 sm:p-7">
          <div className="flex items-center gap-3">
            <CircleAlert className="text-orange-600" size={22} />
            <h2 className="font-bold text-[#242039]">
              Differences identified
            </h2>
          </div>

          <ul className="mt-4 space-y-3">
            {result.differences.map((difference) => (
              <li
                key={difference}
                className="flex items-start gap-3 text-sm leading-6 text-gray-600"
              >
                <TriangleAlert
                  size={17}
                  className="mt-1 shrink-0 text-orange-600"
                />
                {difference}
              </li>
            ))}
          </ul>
        </section>
      )}

      {demoStatus === "unreadable" && (
        <section className="rounded-2xl border border-red-100 bg-white p-5 sm:p-7">
          <h2 className="font-bold text-[#242039]">Try another photograph</h2>

          <p className="mt-2 text-sm leading-6 text-gray-500">
            Use good lighting, keep the text in focus, and capture the side of
            the package containing the batch number and expiry date.
          </p>
        </section>
      )}

      <section className="flex items-start gap-3 rounded-2xl border border-purple-100 bg-purple-50 p-4 text-[#5B4A85]">
        <ShieldCheck size={21} className="mt-0.5 shrink-0" />

        <p className="text-xs leading-6">
          A registry comparison does not test the medicine inside. Do not use
          this demonstration screen to make decisions about a medicine.
        </p>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          to="/scan"
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#4926C8] px-5 py-3.5 text-sm font-bold text-white hover:bg-[#381BA8]"
        >
          <ScanLine size={17} />
          Scan another package
        </Link>

        <Link
          to="/"
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-purple-200 bg-white px-5 py-3.5 text-sm font-bold text-[#4926C8] hover:bg-purple-50"
        >
          Back to dashboard
          <ArrowRight size={17} />
        </Link>
      </div>
    </div>
  );
}
