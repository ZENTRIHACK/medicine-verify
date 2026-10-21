import { Outlet } from "react-router-dom";
import { Store, ShieldCheck } from "lucide-react";
export default function PharmacyLayout() {
  return <div className="min-h-screen bg-[#F2FAF5] text-[#242039]">
    <header className="border-b border-emerald-100 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3"><span className="rounded-xl bg-emerald-100 p-2.5 text-emerald-700"><Store size={23}/></span><div><p className="text-lg font-extrabold">MediScan</p><p className="text-xs text-gray-500">Pharmacy workspace</p></div></div>
        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700"><ShieldCheck size={15}/> Pharmacy access</span>
      </div>
    </header><main className="mx-auto max-w-7xl px-4 py-6 sm:px-6"><Outlet/></main>
    <footer className="border-t border-emerald-100 bg-white px-4 py-4 text-center text-xs text-gray-500">Pharmacy workspace · Organization authentication will be enforced by the backend.</footer>
  </div>;
}
