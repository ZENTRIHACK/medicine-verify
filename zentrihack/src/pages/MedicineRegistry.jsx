import { useMemo, useState } from "react";
import { Search, Database, ShieldCheck, PackageSearch } from "lucide-react";

const sampleMedicines = [
  { name: "Aleron 500", ingredient: "Paracetamol (sample record)", batch: "ALR-2026-008", manufacturer: "Example Pharmaceuticals", expiry: "Aug 2027", status: "Sample entry" },
  { name: "Nuvex 10", ingredient: "Sample medicine record", batch: "NVX-2026-031", manufacturer: "Example Pharmaceuticals", expiry: "Mar 2027", status: "Sample entry" },
  { name: "Cefalex 250", ingredient: "Sample medicine record", batch: "CFX-2026-014", manufacturer: "Example Health Labs", expiry: "Nov 2027", status: "Sample entry" },
];

export default function MedicineRegistry() {
  const [query, setQuery] = useState("");
  const results = useMemo(() => sampleMedicines.filter((item) => Object.values(item).some((value) => value.toLowerCase().includes(query.toLowerCase()))), [query]);

  return <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-10">
    <div className="flex items-start gap-4"><div className="rounded-2xl bg-purple-100 p-3 text-[#4926C8]"><Database size={27}/></div><div><p className="text-xs font-extrabold tracking-[2px] text-[#4926C8]">MEDICINE DATA</p><h1 className="mt-1 text-3xl font-extrabold text-[#242039]">Medicine Registry</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">Search sample medicine and batch entries. In the complete system, these records will come from the trusted registry API.</p></div></div>
    <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900"><ShieldCheck className="mt-0.5 shrink-0" size={20}/><p><strong>Demo data only.</strong> These fictional entries are for testing the interface. They are not an official medicine registry and must not be used to determine whether a medicine matches a registry record.</p></div>
    <label className="mt-6 flex items-center gap-3 rounded-2xl border border-[#E9E5F1] bg-white px-4 py-3 shadow-sm"><Search size={20} className="shrink-0 text-gray-400"/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by medicine, batch, or manufacturer..." className="w-full bg-transparent text-sm outline-none" aria-label="Search medicine registry"/></label>
    <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{results.map((item) => <article key={item.batch} className="rounded-2xl border border-[#E9E5F1] bg-white p-5"><div className="flex items-start justify-between gap-3"><div className="rounded-xl bg-purple-50 p-2.5 text-[#4926C8]"><PackageSearch size={21}/></div><span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-bold text-gray-500">{item.status}</span></div><h2 className="mt-4 text-lg font-bold text-[#242039]">{item.name}</h2><p className="mt-1 text-xs text-gray-500">{item.ingredient}</p><dl className="mt-4 space-y-3 text-sm"><div className="flex justify-between gap-3"><dt className="text-gray-500">Batch number</dt><dd className="text-right font-semibold text-[#242039]">{item.batch}</dd></div><div className="flex justify-between gap-3"><dt className="text-gray-500">Manufacturer</dt><dd className="max-w-[60%] text-right font-semibold text-[#242039]">{item.manufacturer}</dd></div><div className="flex justify-between gap-3"><dt className="text-gray-500">Expiry</dt><dd className="font-semibold text-[#242039]">{item.expiry}</dd></div></dl></article>)}</div>
    {results.length === 0 && <div className="mt-5 rounded-2xl border border-dashed border-purple-200 bg-white p-10 text-center"><PackageSearch size={30} className="mx-auto text-gray-300"/><h2 className="mt-3 font-bold text-[#242039]">No sample records found</h2><p className="mt-1 text-sm text-gray-500">Try another medicine name or batch number.</p></div>}
  </div>;
}
