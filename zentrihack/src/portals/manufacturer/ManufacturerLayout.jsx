import { Outlet } from "react-router-dom";
import { Factory, ShieldCheck } from "lucide-react";
export default function ManufacturerLayout() {
  return <div className="min-h-screen bg-[#F7F5FC] text-[#242039]">
    <header className="border-b border-purple-100 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3"><span className="rounded-xl bg-purple-100 p-2.5 text-[#4926C8]"><Factory size={23}/></span><div><p className="text-lg font-extrabold">MediScan</p><p className="text-xs text-gray-500">Manufacturer workspace</p></div></div>
        <span className="inline-flex items-center gap-2 rounded-full bg-purple-50 px-3 py-2 text-xs font-bold text-[#4926C8]"><ShieldCheck size={15}/> Manufacturer access</span>
      </div>
    </header><main className="mx-auto max-w-7xl px-4 py-6 sm:px-6"><Outlet/></main>
    <footer className="border-t border-purple-100 bg-white px-4 py-4 text-center text-xs text-gray-500">Manufacturer workspace · Organization authentication will be enforced by the backend.</footer>
  </div>;
}
