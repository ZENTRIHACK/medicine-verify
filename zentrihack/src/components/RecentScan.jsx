
import { ArrowRight, Clock3 } from "lucide-react";
import { Link } from "react-router-dom";

const scans = [
  {
    id: 1,
    name: "Aleron 500",
    batch: "ALR-24-08B",
    date: "Today, 10:42 AM",
    status: "match",
    label: "Matches registry",
  },
  {
    id: 2,
    name: "Nuvex 10",
    batch: "NVX-3301",
    date: "Yesterday, 4:18 PM",
    status: "mismatch",
    label: "Does not match registry",
  },
  {
    id: 3,
    name: "Name unavailable",
    batch: "Details not readable",
    date: "May 18, 9:05 AM",
    status: "unreadable",
    label: "Unable to read details",
  },
];

const statusStyles = {
  match: "bg-emerald-50 text-emerald-700",
  mismatch: "bg-orange-50 text-orange-700",
  unreadable: "bg-red-50 text-red-700",
};

export default function RecentScans() {
  return (
    <section className="min-w-0 rounded-2xl border border-[#E9E5F1] bg-white p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[#242039]">
            Recent scans
          </h2>

          <p className="mt-1 text-xs text-gray-500">
            Fictional demonstration data
          </p>
        </div>

        <Link
          to="/history"
          className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-[#4926C8] hover:underline"
        >
          View all <ArrowRight size={15} />
        </Link>
      </div>

      <div>
        {scans.map((scan) => (
          <div
            key={scan.id}
            className="flex flex-wrap items-center gap-3 border-t border-gray-100 py-4"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100 font-bold text-[#4926C8]">
              {scan.name === "Name unavailable"
                ? "?"
                : scan.name.charAt(0)}
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="truncate text-xs font-bold text-[#242039]">
                {scan.name}
              </h3>

              <p className="mt-1 flex items-center gap-1 text-[10px] text-gray-500">
                <Clock3 size={12} />
                {scan.date}
              </p>

              <p className="mt-1 truncate text-[10px] text-gray-400">
                {scan.batch}
              </p>
            </div>

            <span
              className={`rounded-full px-2.5 py-1.5 text-[9px] font-bold ${statusStyles[scan.status]}`}
            >
              {scan.label}
            </span>
          </div>
        ))}
      </div>

      <p className="mt-2 text-[10px] leading-5 text-gray-400">
        These sample outcomes are illustrative only, not actual medicine
        verification results.
      </p>
    </section>
  );
}
