import { Outlet } from "react-router-dom";
import { Truck, ShieldCheck } from "lucide-react";
export default function DistributorLayout() {
  return <div className="min-h-screen bg-[#F3F9FC] text-[#242039]">
    <header className="border-b border-sky-100 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3"><span className="rounded-xl bg-sky-100 p-2.5 text-sky-700"><Truck size={23}/></span><div><p className="text-lg font-extrabold">MediScan</p><p className="text-xs text-gray-500">Distributor workspace</p></div></div>
        <span className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-2 text-xs font-bold text-sky-700"><ShieldCheck size={15}/> Distributor access</span>
      </div>
    </header><main className="mx-auto max-w-7xl px-4 py-6 sm:px-6"><Outlet/></main>
    <footer className="border-t border-sky-100 bg-white px-4 py-4 text-center text-xs text-gray-500">Distributor workspace · Organization authentication will be enforced by the backend.</footer>
  </div>;
}
