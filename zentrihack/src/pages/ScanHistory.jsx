import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  FileSearch,
  History,
  Search,
  ShieldAlert,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { getScans, deleteScan } from "../utils/scanStorage";

const statusOptions = [
  { label: "All scans", value: "all" },
  { label: "Matches registry", value: "match" },
  { label: "Verification concerns", value: "mismatch" },
  { label: "Unable to verify", value: "unreadable" },
];

const statusStyles = {
  match: {
    label: "Matches registry",
    icon: CheckCircle2,
    className: "bg-emerald-50 text-emerald-700",
  },
  mismatch: {
    label: "Verification concern",
    icon: ShieldAlert,
    className: "bg-amber-50 text-amber-800",
  },
  unreadable: {
    label: "Unable to verify",
    icon: TriangleAlert,
    className: "bg-red-50 text-red-700",
  },
};

function formatDate(dateString) {
  if (!dateString) return "Date unavailable";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return date.toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function ScanHistory() {
  const [scans, setScans] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [confirmClear, setConfirmClear] = useState(null);

  useEffect(() => {
    function refreshScans() {
      setScans(getScans());
    }

    refreshScans();

    window.addEventListener("storage", refreshScans);
    window.addEventListener("mediscan-history-updated", refreshScans);

    return () => {
      window.removeEventListener("storage", refreshScans);
      window.removeEventListener(
        "mediscan-history-updated",
        refreshScans
      );
    };
  }, []);

  const filteredScans = useMemo(() => {
    const term = search.trim().toLowerCase();

    return scans.filter((scan) => {
      const matchesFilter =
        filter === "all" || scan.status === filter;

      const searchableText = [
        scan.product,
        scan.batchNo,
        scan.uniqueCode,
        scan.manufacturer,
        scan.distributor,
        scan.pharmacy,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return matchesFilter && searchableText.includes(term);
    });
  }, [scans, search, filter]);

  function handleDelete(id) {
    deleteScan(id);
    setScans(getScans());
    setConfirmClear(null);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 sm:py-9">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-[#4926C8]"
      >
        <ArrowLeft size={17} />
        Back to dashboard
      </Link>

      <header>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 text-[#4926C8]">
          <History size={25} />
        </div>

        <h1 className="mt-5 text-3xl font-extrabold text-[#242039]">
          Scan history
        </h1>

        <p className="mt-2 text-sm leading-6 text-gray-500">
          Review your previous medicine checks, including scans saved on this
          device. You do not need an account to view local history.
        </p>
      </header>

      <div className="rounded-xl border border-purple-100 bg-purple-50 p-4 text-xs leading-5 text-[#5B4A85]">
        Your current history is saved in this browser on this device. It will
        not automatically appear on another device until account and server
        synchronization are implemented.
      </div>

      {/* Summary */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: "Total scans",
            value: scans.length,
          },
          {
            label: "Matches",
            value: scans.filter((scan) => scan.status === "match").length,
          },
          {
            label: "Concerns",
            value: scans.filter((scan) => scan.status === "mismatch").length,
          },
          {
            label: "Unreadable",
            value: scans.filter((scan) => scan.status === "unreadable").length,
          },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-[#E9E5F1] bg-white p-4"
          >
            <p className="text-xs text-gray-500">{item.label}</p>
            <p className="mt-2 text-2xl font-extrabold text-[#242039]">
              {item.value}
            </p>
          </div>
        ))}
      </section>

      {/* Search */}
      <section className="rounded-2xl border border-[#E9E5F1] bg-white p-4 sm:p-5">
        <label
          htmlFor="scan-search"
          className="mb-2 block text-sm font-bold text-[#242039]"
        >
          Search your scans
        </label>

        <div className="flex items-center gap-3 rounded-xl border border-gray-200 px-3">
          <Search size={19} className="shrink-0 text-gray-400" />

          <input
            id="scan-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search medicine, batch or unique code"
            className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-gray-400"
          />
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {statusOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFilter(option.value)}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition ${
                filter === option.value
                  ? "bg-[#4926C8] text-white"
                  : "border border-gray-200 bg-white text-gray-600 hover:bg-purple-50"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      {/* Scan list */}
      <section className="overflow-hidden rounded-2xl border border-[#E9E5F1] bg-white">
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 p-5">
          <div>
            <h2 className="font-bold text-[#242039]">Previous checks</h2>
            <p className="mt-1 text-xs text-gray-500">
              {filteredScans.length} result
              {filteredScans.length === 1 ? "" : "s"}
            </p>
          </div>

          <Clock size={20} className="text-[#4926C8]" />
        </div>

        {filteredScans.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-100 text-[#4926C8]">
              <FileSearch size={27} />
            </div>

            <h3 className="mt-4 font-bold text-[#242039]">
              {scans.length === 0
                ? "No saved scans yet"
                : "No matching scans"}
            </h3>

            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-gray-500">
              {scans.length === 0
                ? "Your scans will appear here after the results page saves them."
                : "Try another search term or select a different status filter."}
            </p>

            {scans.length === 0 && (
              <Link
                to="/scan"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#4926C8] px-5 py-3 text-sm font-bold text-white hover:bg-[#381BA8]"
              >
                Scan medicine
                <ArrowRight size={16} />
              </Link>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredScans.map((scan) => {
              const status = statusStyles[scan.status] || statusStyles.unreadable;
              const StatusIcon = status.icon;

              return (
                <article
                  key={scan.id}
                  className="flex flex-col gap-4 p-5 transition hover:bg-gray-50 sm:flex-row sm:items-center"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-[#4926C8]">
                    <span className="text-sm font-extrabold">
                      {(scan.product || "M").charAt(0).toUpperCase()}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-bold text-[#242039]">
                      {scan.product || "Medicine not identified"}
                    </h3>

                    <p className="mt-1 text-xs text-gray-500">
                      {formatDate(scan.createdAt)}
                    </p>

                    <p className="mt-1 break-all text-xs text-gray-500">
                      {scan.uniqueCode || scan.batchNo || "No code available"}
                    </p>

                    <span
                      className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold ${status.className}`}
                    >
                      <StatusIcon size={13} />
                      {status.label}
                    </span>

                    {scan.codeStatus === "dispensed" && (
                      <p className="mt-2 text-xs font-semibold text-amber-700">
                        Previously recorded as dispensed
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <Link
                      to={`/medicine-details?id=${encodeURIComponent(scan.id)}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#4926C8] hover:underline"
                    >
                      Details
                      <ArrowRight size={15} />
                    </Link>

                    <button
                      type="button"
                      title="Delete this local history record"
                      onClick={() => setConfirmClear(scan.id)}
                      className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>

                  {confirmClear === scan.id && (
                    <div className="w-full rounded-xl border border-red-100 bg-red-50 p-3 sm:w-auto">
                      <p className="text-xs text-red-800">
                        Delete this saved record from this device?
                      </p>

                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleDelete(scan.id)}
                          className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white"
                        >
                          Delete
                        </button>

                        <button
                          type="button"
                          onClick={() => setConfirmClear(null)}
                          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
