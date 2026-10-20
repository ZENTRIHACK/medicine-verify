import { useState } from "react";
import { Bell, Database, Info, Trash2, ShieldCheck } from "lucide-react";
import { clearScanHistory, getScans } from "../utils/scanStorage";

export default function Settings() {
  const [showMessages, setShowMessages] = useState(() => localStorage.getItem("mediscan_navigation_messages") !== "false");
  const [historyCount, setHistoryCount] = useState(() => getScans().length);
  const [notice, setNotice] = useState("");

  function clearHistory() {
    if (!window.confirm("Clear all MediScan scan history saved in this browser? This cannot be undone.")) return;
    const success = clearScanHistory();
    setHistoryCount(getScans().length);
    setNotice(success ? "Local scan history cleared." : "History could not be cleared in this browser.");
  }

  return <div className="mx-auto max-w-4xl px-4 py-7 sm:px-6 sm:py-10"><div className="flex items-start gap-4"><div className="rounded-2xl bg-purple-100 p-3 text-[#4926C8]"><ShieldCheck size={27}/></div><div><p className="text-xs font-extrabold tracking-[2px] text-[#4926C8]">PREFERENCES</p><h1 className="mt-1 text-3xl font-extrabold text-[#242039]">Settings</h1><p className="mt-2 text-sm leading-6 text-gray-500">Manage local demo settings and data on this device.</p></div></div>
    {notice && <p role="status" className="mt-5 rounded-xl bg-purple-50 p-3 text-sm text-[#4926C8]">{notice}</p>}
    <section className="mt-6 divide-y divide-gray-100 rounded-2xl border border-[#E9E5F1] bg-white px-5"><div className="flex items-center gap-4 py-5"><div className="rounded-xl bg-purple-50 p-3 text-[#4926C8]"><Bell size={21}/></div><div className="flex-1"><h2 className="font-bold text-[#242039]">Navigation messages</h2><p className="mt-1 text-sm text-gray-500">Show a short message when a main navigation link is opened.</p></div><button type="button" role="switch" aria-checked={showMessages} onClick={() => { const next = !showMessages; setShowMessages(next); localStorage.setItem("mediscan_navigation_messages", String(next)); window.dispatchEvent(new CustomEvent("mediscan-setting-changed", { detail: next })); setNotice(next ? "Navigation messages enabled." : "Navigation messages disabled."); }} className={`relative h-6 w-11 rounded-full transition ${showMessages ? "bg-[#4926C8]" : "bg-gray-300"}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${showMessages ? "left-6" : "left-1"}`}/></button></div>
    <div className="flex items-center gap-4 py-5"><div className="rounded-xl bg-purple-50 p-3 text-[#4926C8]"><Database size={21}/></div><div className="flex-1"><h2 className="font-bold text-[#242039]">Local scan history</h2><p className="mt-1 text-sm text-gray-500">{historyCount} scan record{historyCount === 1 ? "" : "s"} saved in this browser. This data is not synced to a server.</p></div><button type="button" onClick={clearHistory} className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50"><Trash2 size={15}/><span className="hidden sm:inline">Clear</span></button></div></section>
    <div className="mt-5 flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-900"><Info size={20} className="mt-0.5 shrink-0"/><p><strong>Demo mode:</strong> these preferences and scan records are stored in this browser only. Clearing browser site data may remove them. Account login and server-side synchronization have not been implemented.</p></div>
  </div>;
}
