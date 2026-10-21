import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Factory,
  MapPin,
  Package,
  Pill,
  ShieldCheck,
  Store,
  Truck,
} from "lucide-react";
import { getScanById } from "../utils/scanStorage";

const records = {
  match: {
    product: "Aleron 500",
    batchNo: "ALR-2026-008",
    uniqueCode: "MS-K7P9-X2Q4",
    expiry: "2027-08",
    manufacturer: "Example Pharmaceuticals",
    distributor: "Example Medical Distributors",
    pharmacy: "Example Community Pharmacy",
    events: [
      {
        title: "Batch registered",
        party: "Example Pharmaceuticals",
        date: "Demo event · 1 June 2026",
        description:
          "Product and batch information entered into the sample registry.",
        icon: Factory,
      },
      {
        title: "Distribution recorded",
        party: "Example Medical Distributors",
        date: "Demo event · 8 June 2026",
        description: "A sample transfer to the distributor was recorded.",
        icon: Truck,
      },
      {
        title: "Pharmacy receipt recorded",
        party: "Example Community Pharmacy",
        date: "Demo event · 12 June 2026",
        description: "A sample stock receipt was recorded at the pharmacy.",
        icon: Store,
      },
    ],
  },

  mismatch: {
    product: "Nuvex 10",
    batchNo: "NVX-2026-031",
    uniqueCode: "MS-P4D8-M6R2",
    expiry: "2027-03",
    manufacturer: "Example Pharmaceuticals",
    distributor: "No verified transfer record",
    pharmacy: "Not recorded",
    events: [
      {
        title: "Sample batch record",
        party: "Example Pharmaceuticals",
        date: "Demo event",
        description:
          "A fictional batch entry exists in the sample registry.",
        icon: Factory,
      },
      {
        title: "Transfer not verified",
        party: "No confirmed recipient",
        date: "No recorded date",
        description:
          "The demonstration record does not contain a verified downstream transfer.",
        icon: Truck,
      },
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
    events: [],
  },
};

function DetailRow({ label, value }) {
  return (
    <div className="flex flex-col gap-1 border-b border-gray-100 py-4 last:border-0 sm:flex-row sm:justify-between sm:gap-5">
      <span className="text-sm text-gray-500">{label}</span>

      <span className="break-words text-sm font-semibold text-[#242039] sm:max-w-[60%] sm:text-right">
        {value || "Not available in this record"}
      </span>
    </div>
  );
}

function formatExpiry(value) {
  if (!value) return "Not available";

  const match = value.match(/^(\d{4})-(\d{2})$/);

  if (match) {
    const date = new Date(Number(match[1]), Number(match[2]) - 1, 1);

    return date.toLocaleDateString("en", {
      month: "long",
      year: "numeric",
    });
  }

  return value;
}

export default function MedicineDetails() {
  const [searchParams] = useSearchParams();

  const demoType = searchParams.get("demo") || "match";
  const savedId = searchParams.get("id");
  const wasDispensed = searchParams.get("used") === "true";

  // Load the selected record from localStorage when an ID is provided.
  const savedRecord = savedId ? getScanById(savedId) : null;

  // Use saved data first; otherwise, use the demonstration record.
  const sourceRecord =
    savedRecord || records[demoType] || records.match;

  // Normalize saved and demo record property names.
  const record = {
    ...sourceRecord,
    batchNo: sourceRecord.batchNo ?? sourceRecord.batch ?? null,
    uniqueCode: sourceRecord.uniqueCode ?? sourceRecord.code ?? null,
    expiry: sourceRecord.expiry ?? null,
    manufacturer: sourceRecord.manufacturer ?? null,
    distributor: sourceRecord.distributor ?? null,
    pharmacy: sourceRecord.pharmacy ?? null,
    events: Array.isArray(sourceRecord.events)
      ? sourceRecord.events
      : [],
  };

  const resultUrl = savedId
    ? `/results?scanId=${encodeURIComponent(savedId)}&demo=${encodeURIComponent(demoType)}&used=${wasDispensed}`
    : `/results?demo=${encodeURIComponent(demoType)}&used=${wasDispensed}`;

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6 sm:py-9">
      <Link
        to={resultUrl}
        className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-[#4926C8]"
      >
        <ArrowLeft size={17} />
        Back to scan result
      </Link>

      <header>
        <p className="text-[10px] font-extrabold tracking-[2px] text-[#4926C8]">
          MEDICINE RECORD
        </p>

        <h1 className="mt-2 text-3xl font-extrabold text-[#242039]">
          Full medicine details
        </h1>

        <p className="mt-2 text-sm leading-6 text-gray-500">
          Review the product identity and the supply-chain events recorded
          for this package.
        </p>
      </header>

      {(!savedRecord || savedRecord.demo) && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
          <strong>DEMO RECORD.</strong> This page contains fictional example
          data, not live registry information.
        </div>
      )}

      {/* Product identity */}
      <section className="rounded-3xl border border-[#E9E5F1] bg-white p-5 sm:p-7">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 text-[#4926C8]">
            <Pill size={24} />
          </div>

          <div>
            <p className="text-xs text-gray-500">Product name</p>

            <h2 className="mt-1 text-xl font-extrabold text-[#28145F]">
              {record.product || "Medicine not identified"}
            </h2>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-gray-50 p-4">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Package size={15} />
              Batch number
            </div>

            <p className="mt-2 break-all font-semibold text-[#242039]">
              {record.batchNo || "Not available"}
            </p>
          </div>

          <div className="rounded-xl bg-gray-50 p-4">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <CalendarDays size={15} />
              Expiry date
            </div>

            <p className="mt-2 font-semibold text-[#242039]">
              {formatExpiry(record.expiry)}
            </p>
          </div>

          <div className="rounded-xl bg-gray-50 p-4 sm:col-span-2">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <ShieldCheck size={15} />
              Unique pack code
            </div>

            <p className="mt-2 break-all font-mono font-semibold text-[#242039]">
              {record.uniqueCode || "Not available"}
            </p>
          </div>
        </div>

        {wasDispensed && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
            <Clock3 size={17} className="mt-0.5 shrink-0" />

            <p>
              This demonstration code has been marked as previously dispensed.
              This is a simulated status, not a real transaction record.
            </p>
          </div>
        )}
      </section>

      {/* Supply-chain participants */}
      <section className="rounded-3xl border border-[#E9E5F1] bg-white p-5 sm:p-7">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-100 text-[#4926C8]">
            <Building2 size={22} />
          </div>

          <div>
            <h2 className="font-bold text-[#242039]">
              Supply-chain participants
            </h2>

            <p className="mt-1 text-xs text-gray-500">
              Organizations listed in this record
            </p>
          </div>
        </div>

        <div className="mt-5">
          <DetailRow label="Manufacturer" value={record.manufacturer} />
          <DetailRow label="Distributor" value={record.distributor} />
          <DetailRow label="Pharmacy" value={record.pharmacy} />
        </div>
      </section>

      {/* Supply-chain timeline */}
      <section className="rounded-3xl border border-[#E9E5F1] bg-white p-5 sm:p-7">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-100 text-[#4926C8]">
            <MapPin size={22} />
          </div>

          <div>
            <h2 className="font-bold text-[#242039]">
              Supply-chain journey
            </h2>

            <p className="mt-1 text-xs text-gray-500">
              Recorded events, in chronological order
            </p>
          </div>
        </div>

        {record.events.length > 0 ? (
          <div className="mt-6 space-y-6">
            {record.events.map((event, index) => {
              const EventIcon = event.icon || Clock3;

              return (
                <div
                  key={`${event.title}-${index}`}
                  className="flex gap-4"
                >
                  <div className="flex flex-col items-center">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-[#4926C8]">
                      <EventIcon size={19} />
                    </div>

                    {index < record.events.length - 1 && (
                      <div className="mt-2 min-h-8 w-px flex-1 bg-purple-200" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1 pb-2">
                    <h3 className="text-sm font-bold text-[#242039]">
                      {event.title || "Recorded event"}
                    </h3>

                    <p className="mt-1 text-xs font-semibold text-[#4926C8]">
                      {event.party || "Participant not available"}
                    </p>

                    <p className="mt-1 text-[10px] text-gray-400">
                      {event.date || "Date not available"}
                    </p>

                    <p className="mt-2 text-xs leading-5 text-gray-500">
                      {event.description || "No additional details available."}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-5 rounded-xl bg-gray-50 p-5 text-sm leading-6 text-gray-500">
            No supply-chain events are saved for this scan yet. Events will
            appear here when they are available from the registry.
          </div>
        )}
      </section>

      <div className="flex items-start gap-3 rounded-2xl border border-purple-100 bg-purple-50 p-4 text-[#5B4A85]">
        <CheckCircle2 size={20} className="mt-0.5 shrink-0" />

        <p className="text-xs leading-6">
          Only events confirmed by the registry should be presented as verified.
          Missing events do not automatically establish that a medicine is
          counterfeit.
        </p>
      </div>

      <Link
        to="/history"
        className="inline-flex items-center gap-2 text-sm font-bold text-[#4926C8] hover:underline"
      >
        View scan history
        <ArrowRight size={16} />
      </Link>
    </div>
  );
}
