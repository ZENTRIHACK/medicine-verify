
import {
  Activity,
  ArrowUpRight,
  CheckCircle2,
  Database,
  History,
  Image as ImageIcon,
  ScanLine,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";

import { Link } from "react-router-dom";
import MedicineBanner from "../components/MedicineBanner";
import StatCard from "../components/StatCard";
import RecentScans from "../components/RecentScans";

const statistics = [
  {
    title: "Total scans",
    value: "128",
    note: "Demo account",
    icon: ScanLine,
    color: "purple",
  },
  {
    title: "Registry matches",
    value: "104",
    note: "Demo account",
    icon: CheckCircle2,
    color: "green",
  },
  {
    title: "Mismatches",
    value: "14",
    note: "Demo account",
    icon: TriangleAlert,
    color: "orange",
  },
  {
    title: "Unreadable",
    value: "10",
    note: "Demo account",
    icon: ImageIcon,
    color: "red",
  },
];

const shortcuts = [
  {
    title: "Scan History",
    description: "Review previous checks",
    icon: History,
    path: "/history",
    color: "bg-[#4926C8] text-white",
  },
  {
    title: "Medicine Information",
    description: "Explore registry records",
    icon: Database,
    path: "/registry",
    color: "bg-purple-100 text-[#4926C8]",
  },
  {
    title: "Safety Information",
    description: "Photo and checking tips",
    icon: ShieldCheck,
    path: "/safety",
    color: "bg-emerald-50 text-emerald-700",
  },
];

const weeklyActivity = [
  { day: "M", value: 10 },
  { day: "T", value: 16 },
  { day: "W", value: 12 },
  { day: "T", value: 20 },
  { day: "F", value: 15 },
  { day: "S", value: 20 },
  { day: "S", value: 19 },
];

function ActivityChart() {
  return (
    <section className="rounded-2xl border border-[#E9E5F1] bg-white p-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-bold text-[#242039]">
            Verification activity
          </h2>

          <p className="mt-1 text-xs text-gray-500">
            Illustrative weekly activity
          </p>
        </div>

        <Activity className="text-[#4926C8]" size={21} />
      </div>

      <div className="mt-6 flex h-48 gap-3">
        <div className="flex flex-col justify-between pb-6 text-[10px] text-gray-400">
          <span>20</span>
          <span>10</span>
          <span>0</span>
        </div>

        <div className="relative flex flex-1 items-end justify-around border-b border-gray-100">
          {/* Background guide lines */}
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-between pb-6">
            <div className="border-t border-dashed border-gray-100" />
            <div className="border-t border-dashed border-gray-100" />
            <div className="border-t border-dashed border-gray-100" />
          </div>

          {weeklyActivity.map((item, index) => (
            <div
              key={`${item.day}-${index}`}
              className="relative z-10 flex h-full w-7 flex-col items-center justify-end gap-2"
            >
              <div className="flex h-[calc(100%-24px)] w-full items-end">
                <div
                  className="w-full rounded-t-md bg-gradient-to-t from-[#4926C8] to-[#9575F5]"
                  style={{ height: `${(item.value / 20) * 100}%` }}
                  title={`${item.value} demonstration scans`}
                />
              </div>

              <span className="pb-1 text-[10px] text-gray-400">
                {item.day}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between text-xs">
        <span className="flex items-center gap-2 text-gray-500">
          <span className="h-2 w-2 rounded-full bg-[#4926C8]" />
          Demo scans this week
        </span>

        <strong className="text-[#242039]">42</strong>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <div className="mx-auto max-w-[1700px] space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
      {/* Page heading */}
      <header className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-extrabold tracking-[2px] text-[#4926C8]">
            MEDISCAN DASHBOARD
          </p>

          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-[#242039] sm:text-3xl">
            Welcome back!
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Here's your medicine verification overview.
          </p>
        </div>

        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-purple-100 text-xs font-bold text-[#4926C8]"
          title="Demo account"
        >
          MS
        </div>
      </header>

      {/* Main banner */}
      <MedicineBanner />

      {/* Quick links */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {shortcuts.map(({ title, description, icon: Icon, path, color }) => (
          <Link
            key={path}
            to={path}
            className="group flex min-w-0 items-center gap-3 rounded-2xl border border-[#F0EDF6] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5"
          >
            <span
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${color}`}
            >
              <Icon size={21} />
            </span>

            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-[#242039]">
                {title}
              </span>

              <span className="mt-1 block text-xs text-gray-500">
                {description}
              </span>
            </span>

            <ArrowUpRight
              size={18}
              className="shrink-0 text-gray-400 transition group-hover:text-[#4926C8]"
            />
          </Link>
        ))}
      </section>

      {/* Statistics */}
      <section
        className="grid grid-cols-2 gap-3 xl:grid-cols-4"
        aria-label="Demonstration statistics"
      >
        {statistics.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </section>

      {/* Recent scans and activity */}
      <section className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[1.5fr_0.9fr]">
        <RecentScans />
        <ActivityChart />
      </section>

      {/* Safety disclaimer */}
      <footer className="flex items-start gap-3 rounded-2xl border border-purple-100 bg-purple-50 p-4 text-[#5B4A85]">
        <ShieldCheck size={20} className="mt-0.5 shrink-0" />

        <p className="text-xs leading-6">
          This check confirms whether extracted pack details match a registry
          record. It does not test the medicine inside.
        </p>
      </footer>
    </div>
  );
}
