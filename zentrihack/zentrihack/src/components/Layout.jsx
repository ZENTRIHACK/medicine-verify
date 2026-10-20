import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Info, X } from "lucide-react";
import Navbar from "./Navbar";

export default function Layout() {
  const [toast, setToast] = useState("");
  const location = useLocation();

  useEffect(() => {
    function onToast(event) {
      setToast(event.detail || "Page opened.");
    }
    window.addEventListener("mediscan-toast", onToast);
    return () => window.removeEventListener("mediscan-toast", onToast);
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(""), 4200);
    return () => window.clearTimeout(timeout);
  }, [toast, location.pathname]);

  return (
    <div className="min-h-screen bg-[#F5F3FA]">
      <Navbar />
      {toast && <div role="status" aria-live="polite" className="fixed right-4 top-4 z-[100] flex max-w-sm items-start gap-3 rounded-2xl border border-purple-100 bg-white px-4 py-3 text-sm text-[#28145F] shadow-xl md:right-6 md:top-6"><Info size={19} className="mt-0.5 shrink-0 text-[#4926C8]" /><span className="flex-1 leading-5">{toast}</span><button type="button" aria-label="Dismiss message" onClick={() => setToast("")} className="text-gray-400 hover:text-gray-700"><X size={17} /></button></div>}
      <main className="min-h-screen pb-24 md:ml-64 md:pb-0"><Outlet /></main>
    </div>
  );
}
