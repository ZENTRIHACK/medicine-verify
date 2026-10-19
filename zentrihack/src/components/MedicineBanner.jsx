
import { ArrowRight, ScanLine } from "lucide-react";
import { Link } from "react-router-dom";

export default function MedicineBanner() {
  return (
    <section className="relative flex min-h-[280px] items-center justify-between gap-8 overflow-hidden rounded-3xl bg-[#28145F] px-8 py-8 text-white sm:px-10">
      <div className="relative z-10 max-w-lg">
        <div className="flex items-center gap-2 text-[10px] font-bold tracking-[2px] text-purple-200">
          <ScanLine size={16} />
          AI-POWERED PACK CHECK
        </div>

        <h2 className="mt-7 text-3xl font-extrabold tracking-tight sm:text-4xl">
          Verify a Medicine
        </h2>

        <p className="mt-3 max-w-sm text-sm leading-6 text-purple-200">
          Scan the printed batch number and expiry date to compare the details
          with registry records.
        </p>

        <Link
          to="/scan"
          className="mt-6 inline-flex items-center gap-3 rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#28145F] transition hover:-translate-y-0.5 hover:shadow-lg"
        >
          <ScanLine size={18} />
          Scan Medicine
          <ArrowRight size={16} />
        </Link>
      </div>

      {/* Fictional demonstration pack */}
      <div className="relative z-10 hidden w-64 shrink-0 rotate-[-6deg] rounded-md border border-purple-100 bg-gradient-to-br from-white to-purple-100 p-5 text-gray-800 shadow-2xl sm:block">
        <p className="text-[8px] font-bold tracking-[2px] text-gray-400">
          DEMO PACK
        </p>

        <h3 className="mt-3 text-2xl font-extrabold text-[#4926C8]">
          Aleron 500
        </h3>

        <p className="mt-4 text-[10px]">BATCH ALR-24-08B</p>
        <p className="mt-1 text-[10px]">EXP 08/2027</p>

        <div
          className="mt-4 h-8"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg,#292238 0px,#292238 2px,transparent 2px,transparent 4px,#292238 4px,#292238 5px,transparent 5px,transparent 8px)",
          }}
        />

        <p className="mt-2 text-[8px] text-gray-500">
          Fictional sample data
        </p>
      </div>

      <div className="pointer-events-none absolute -bottom-20 -right-12 h-64 w-64 rounded-full bg-purple-600/20 blur-2xl" />
    </section>
  );
}
