import { useEffect, useMemo, useState } from "react";

import {
  Activity, ArrowRight, BadgeCheck, CheckCircle2, ClipboardList,
  Factory, FilePlus2, Package, Plus, Search, Send, ShieldCheck, Store,
  Truck, X, AlertTriangle,
} from "lucide-react";
import { addMedicineRecord, getSupplyRecords, recordSupplyEvent, subscribeSupplyRecords } from "../utils/supplyChainStorage";

const roleConfig = {
  manufacturer: {
    title: "Manufacturer portal", eyebrow: "ORIGIN OF THE SUPPLY CHAIN", icon: Factory,
    subtitle: "Register medicine batches and assign a unique identifier to each pack before it leaves the manufacturing site.",
    action: "Register medicine batch", actionHint: "Create a demo batch record", accent: "#4926C8",
  },
  distributor: {
    title: "Distributor portal", eyebrow: "SUPPLY CHAIN MOVEMENT", icon: Truck,
    subtitle: "Record stock received from manufacturers and log dispatches to pharmacies with traceable hand-off details.",
    action: "Record stock movement", actionHint: "Record a receipt or dispatch", accent: "#176B87",
  },
  pharmacy: {
    title: "Pharmacy portal", eyebrow: "LAST-MILE DISPENSING", icon: Store,
    subtitle: "Record pharmacy stock receipt and dispensing events so a pack's journey can be reviewed later.",
    action: "Update pharmacy stock", actionHint: "Receive or dispense a pack", accent: "#18794E",
  },
};

const inputClass = "mt-1.5 w-full rounded-xl border border-[#E5E1EF] bg-white px-3.5 py-3 text-sm text-[#242039] outline-none transition focus:border-[#8067DE] focus:ring-2 focus:ring-purple-100";
const labelClass = "block text-xs font-bold text-[#514B67]";
const buttonClass = "inline-flex items-center justify-center gap-2 rounded-xl bg-[#4926C8] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#3920A1] disabled:cursor-not-allowed disabled:opacity-50";

function Field({ label, children }) { return <label className={labelClass}>{label}{children}</label>; }
function formatDate(date) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}
function statusClass(status) {
  if (/dispensed/i.test(status)) return "bg-emerald-50 text-emerald-700";
  if (/pharmacy|received/i.test(status)) return "bg-sky-50 text-sky-700";
  if (/dispatch/i.test(status)) return "bg-amber-50 text-amber-700";
  return "bg-purple-50 text-[#4926C8]";
}

export default function SupplyChainPortal({ role: roleProp }) {
  const role = roleProp || "manufacturer";
  const config = roleConfig[role] || roleConfig.manufacturer;
  const RoleIcon = config.icon;
  const [records, setRecords] = useState(() => getSupplyRecords());
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState("");
  const [form, setForm] = useState({
    medicineName: "", ingredient: "", batchNo: "", uniqueCode: "", manufacturer: "",
    distributor: "", pharmacy: "", manufactureDate: "", expiryDate: "", quantity: "",
    manufacturingLocation: "", actor: "", location: "", note: "", eventType: "received", recordId: "",
  });

  useEffect(() => subscribeSupplyRecords(() => setRecords(getSupplyRecords())), []);
  const filtered = useMemo(() => records.filter((record) =>
    [record.medicineName, record.batchNo, record.uniqueCode, record.manufacturer, record.distributor, record.pharmacy, record.status]
      .some((value) => String(value || "").toLowerCase().includes(query.toLowerCase()))
  ), [records, query]);

  const roleRecords = useMemo(() => {
    if (role === "manufacturer") return records.filter((r) => r.manufacturer);
    if (role === "distributor") return records.filter((r) => r.manufacturer);
    return records.filter((r) => r.pharmacy);
  }, [records, role]);

  function updateField(event) { setForm((current) => ({ ...current, [event.target.name]: event.target.value })); }
  function openForm() {
    setForm((current) => ({ ...current, actor: role === "manufacturer" ? current.manufacturer : role === "distributor" ? current.distributor : current.pharmacy }));
    setShowForm(true);
  }
  function submitManufacturer(event) {
    event.preventDefault();
    const record = addMedicineRecord({
      medicineName: form.medicineName.trim(), ingredient: form.ingredient.trim() || "Not provided",
      batchNo: form.batchNo.trim(), uniqueCode: form.uniqueCode.trim(), manufacturer: form.manufacturer.trim(),
      distributor: form.distributor.trim() || "Not assigned", pharmacy: form.pharmacy.trim() || "Not assigned",
      manufactureDate: form.manufactureDate, expiryDate: form.expiryDate, quantity: Number(form.quantity),
      manufacturingLocation: form.manufacturingLocation.trim(),
    });
    setRecords(getSupplyRecords()); setShowForm(false);
    setForm((current) => ({ ...current, medicineName: "", ingredient: "", batchNo: "", uniqueCode: "", manufactureDate: "", expiryDate: "", quantity: "", manufacturingLocation: "" }));
    notify(`Demo batch ${record.batchNo} registered in this browser.`);
  }
  function submitMovement(event) {
    event.preventDefault();
    const record = records.find((item) => item.id === form.recordId);
    if (!record) return;
    const actor = form.actor.trim() || (role === "distributor" ? record.distributor : record.pharmacy);
    const type = role === "distributor" ? form.eventType : role === "pharmacy" ? form.eventType : "manufactured";
    const status = type === "dispatched" ? "Dispatched" : type === "received" ? (role === "pharmacy" ? "At pharmacy" : "Received by distributor") : type === "dispensed" ? "Dispensed" : record.status;
    recordSupplyEvent(record.id, {
      type, actor: actor || "Demo operator", location: form.location.trim() || "Not provided",
      note: form.note.trim() || `Demo ${type} event`, recordUpdates: { status },
    });
    setRecords(getSupplyRecords()); setShowForm(false);
    setForm((current) => ({ ...current, recordId: "", actor: "", location: "", note: "" }));
    notify(`${record.medicineName}: ${type} event saved locally.`);
  }
  function notify(message) { setToast(message); window.setTimeout(() => setToast(""), 4200); }

  const counts = {
    total: roleRecords.length,
    batches: new Set(roleRecords.map((r) => r.batchNo)).size,
    movement: roleRecords.reduce((sum, r) => sum + (r.events?.length || 0), 0),
  };

  return <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800"><AlertTriangle size={14}/> Demo workspace · no login</span>
    </div>

    <section className="overflow-hidden rounded-3xl bg-[#28145F] text-white shadow-sm">
      <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
        <div><p className="text-[10px] font-extrabold tracking-[2.4px] text-purple-200">{config.eyebrow}</p><h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">{config.title}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-purple-100">{config.subtitle}</p>
          <div className="mt-5 flex flex-wrap gap-2"><span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold">Traceable pack records</span><span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold">Event history</span><span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold">Browser demo</span></div>
        </div>
        <div className="flex h-24 w-24 items-center justify-center rounded-3xl border border-white/15 bg-white/10"><RoleIcon size={48}/></div>
      </div>
    </section>

    <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900"><ShieldCheck size={20} className="mt-0.5 shrink-0"/><p><strong>Prototype notice:</strong> records are saved only in this browser using localStorage. These pages do not authenticate organizations or publish to the public medicine registry yet. Do not enter confidential or real patient data.</p></div>

    <div className="mt-5 grid gap-4 sm:grid-cols-3">
      <Metric icon={Package} label="Pack records" value={counts.total} detail="Available in this demo"/>
      <Metric icon={ClipboardList} label="Batch numbers" value={counts.batches} detail="Distinct registered batches"/>
      <Metric icon={Activity} label="Supply events" value={counts.movement} detail="Manufacture, receipt, dispatch"/>
    </div>

    <section className="mt-7 rounded-3xl border border-[#E9E5F1] bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] font-extrabold tracking-[2px] text-[#4926C8]">SUPPLY CHAIN WORKSPACE</p><h2 className="mt-1 text-xl font-extrabold text-[#242039]">Medicine and pack records</h2><p className="mt-1 text-sm text-gray-500">Search a pack or batch, then record the next hand-off.</p></div><button type="button" onClick={openForm} className={buttonClass}>{role === "manufacturer" ? <FilePlus2 size={17}/> : <Plus size={17}/>} {config.action}</button></div>
      <label className="mt-5 flex items-center gap-3 rounded-xl border border-[#E9E5F1] bg-[#FAF9FC] px-4 py-3"><Search size={18} className="text-gray-400"/><input value={query} onChange={(e) => setQuery(e.target.value)} className="w-full bg-transparent text-sm outline-none" placeholder="Search medicine, batch, unique pack code..." aria-label="Search supply-chain records"/></label>
      <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] border-collapse text-left text-sm"><thead><tr className="border-b border-[#EEEAF5] text-[11px] uppercase tracking-wide text-gray-400"><th className="px-3 py-3 font-bold">Medicine / pack code</th><th className="px-3 py-3 font-bold">Batch</th><th className="px-3 py-3 font-bold">Expiry</th><th className="px-3 py-3 font-bold">Current status</th><th className="px-3 py-3 font-bold">Journey</th><th className="px-3 py-3 font-bold">Action</th></tr></thead><tbody>
        {filtered.map((record) => <tr key={record.id} className="border-b border-[#F1EEF6] last:border-0"><td className="px-3 py-4"><p className="font-bold text-[#242039]">{record.medicineName}</p><p className="mt-1 font-mono text-xs text-gray-500">{record.uniqueCode || "No unique code"}</p></td><td className="px-3 py-4 font-mono text-xs text-gray-600">{record.batchNo}</td><td className="px-3 py-4 text-gray-600">{formatDate(record.expiryDate)}</td><td className="px-3 py-4"><span className={`rounded-full px-2.5 py-1.5 text-[11px] font-bold ${statusClass(record.status)}`}>{record.status}</span></td><td className="px-3 py-4 text-gray-600">{record.events?.length || 0} events</td><td className="px-3 py-4"><button type="button" onClick={() => { setForm((current) => ({ ...current, recordId: record.id, eventType: role === "pharmacy" ? "received" : "received", actor: role === "distributor" ? record.distributor : role === "pharmacy" ? record.pharmacy : record.manufacturer })); setShowForm(true); }} className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E1EF] px-3 py-2 text-xs font-bold text-[#4926C8] hover:bg-purple-50">Update <ArrowRight size={14}/></button></td></tr>)}
      </tbody></table>
      {filtered.length === 0 && <div className="py-12 text-center"><PackageSearchIcon/><p className="mt-3 font-bold text-[#242039]">No records found</p><p className="mt-1 text-sm text-gray-500">Try another search or use the action above to update records available to this workspace.</p></div>}</div>
    </section>

    <section className="mt-6 grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border border-[#E9E5F1] bg-white p-5"><div className="flex items-center gap-3"><div className="rounded-xl bg-purple-50 p-2.5 text-[#4926C8]"><Activity size={20}/></div><div><h3 className="font-extrabold text-[#242039]">Recent supply activity</h3><p className="text-xs text-gray-500">Latest events from the local demo records</p></div></div><div className="mt-4 space-y-4">{records.flatMap((r) => (r.events || []).map((e) => ({ ...e, medicineName: r.medicineName, batchNo: r.batchNo }))).sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0,4).map((event) => <div key={event.id} className="flex gap-3"><span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-50 text-[#4926C8]"><CheckCircle2 size={16}/></span><div className="min-w-0 flex-1"><p className="text-sm font-bold text-[#242039]">{event.medicineName} · {event.type}</p><p className="mt-0.5 text-xs text-gray-500">{event.actor} · {event.batchNo}</p><p className="mt-1 text-[11px] text-gray-400">{formatDate(event.date)}</p></div></div>)}</div></div>
      <div className="rounded-2xl border border-[#E9E5F1] bg-white p-5"><div className="flex items-center gap-3"><div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700"><BadgeCheck size={20}/></div><div><h3 className="font-extrabold text-[#242039]">Recommended workflow</h3><p className="text-xs text-gray-500">How each organization contributes</p></div></div><ol className="mt-4 space-y-3">{(role === "manufacturer" ? ["Register the medicine and batch details.", "Assign a unique code to each individual pack.", "Share the batch with an authorized distributor."] : role === "distributor" ? ["Find the registered batch and confirm stock received.", "Record dispatch to the named pharmacy.", "Add location and reference details for each hand-off."] : ["Record receipt from the distributor.", "Keep the pack code associated with stock records.", "Record dispensing so the pack can be flagged as used."]).map((item, i) => <li key={item} className="flex gap-3 text-sm leading-6 text-gray-600"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F0ECFF] text-xs font-extrabold text-[#4926C8]">{i+1}</span>{item}</li>)}</ol><div className="mt-5 rounded-xl bg-[#F8F6FC] p-3 text-xs leading-5 text-gray-500">For the production system, each event should be authenticated, timestamped by the server, and validated against the organization's permissions.</div></div>
    </section>

    {showForm && <div className="fixed inset-0 z-[100] flex items-end justify-center bg-[#171126]/50 p-0 backdrop-blur-sm sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-labelledby="portal-form-title"><div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-7"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-extrabold tracking-[2px] text-[#4926C8]">{config.actionHint.toUpperCase()}</p><h2 id="portal-form-title" className="mt-1 text-2xl font-extrabold text-[#242039]">{role === "manufacturer" && !form.recordId ? "Register a medicine batch" : "Record a supply event"}</h2><p className="mt-2 text-sm text-gray-500">This action updates the shared local demo data only.</p></div><button onClick={() => setShowForm(false)} type="button" className="rounded-xl p-2 text-gray-400 hover:bg-gray-100" aria-label="Close form"><X size={20}/></button></div>
      {role === "manufacturer" && !form.recordId ? <form onSubmit={submitManufacturer} className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field label="Medicine / product name *"><input className={inputClass} name="medicineName" value={form.medicineName} onChange={updateField} required placeholder="e.g. Sample Paracetamol 500 mg"/></Field>
        <Field label="Active ingredient (optional)"><input className={inputClass} name="ingredient" value={form.ingredient} onChange={updateField} placeholder="Ingredient and strength"/></Field>
        <Field label="Batch number *"><input className={inputClass} name="batchNo" value={form.batchNo} onChange={updateField} required placeholder="e.g. BATCH-2026-001"/></Field>
        <Field label="Unique pack code *"><input className={inputClass} name="uniqueCode" value={form.uniqueCode} onChange={updateField} required placeholder="Unique identifier for this pack"/></Field>
        <Field label="Manufacturer / company name *"><input className={inputClass} name="manufacturer" value={form.manufacturer} onChange={updateField} required placeholder="Registered organization name"/></Field>
        <Field label="Manufacturing location"><input className={inputClass} name="manufacturingLocation" value={form.manufacturingLocation} onChange={updateField} placeholder="Town / facility"/></Field>
        <Field label="Manufacture date *"><input className={inputClass} type="date" name="manufactureDate" value={form.manufactureDate} onChange={updateField} required/></Field>
        <Field label="Expiry date *"><input className={inputClass} type="date" min={form.manufactureDate || undefined} name="expiryDate" value={form.expiryDate} onChange={updateField} required/></Field>
        <Field label="Pack quantity in batch *"><input className={inputClass} type="number" min="1" name="quantity" value={form.quantity} onChange={updateField} required placeholder="e.g. 1000"/></Field>
        <Field label="Distributor (optional)"><input className={inputClass} name="distributor" value={form.distributor} onChange={updateField} placeholder="Planned distributor"/></Field>
        <Field label="Pharmacy (optional)"><input className={inputClass} name="pharmacy" value={form.pharmacy} onChange={updateField} placeholder="Planned destination pharmacy"/></Field>
        <div className="sm:col-span-2 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">Prototype note: this form records one example pack code per record. A production batch flow should generate and validate a different code for every physical pack.</div>
        <div className="flex justify-end gap-3 pt-1 sm:col-span-2"><button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-gray-200 px-4 py-3 text-sm font-bold text-gray-600">Cancel</button><button type="submit" className={buttonClass}><FilePlus2 size={17}/> Save demo batch</button></div>
      </form> : <form onSubmit={submitMovement} className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field label="Medicine / pack record *"><select className={inputClass} name="recordId" value={form.recordId} onChange={updateField} required><option value="">Select a medicine record</option>{records.map((record) => <option key={record.id} value={record.id}>{record.medicineName} — {record.batchNo} ({record.uniqueCode})</option>)}</select></Field>
        <Field label="Event type *"><select className={inputClass} name="eventType" value={form.eventType} onChange={updateField} required>{(role === "manufacturer" ? [{value:"dispatched",label:"Dispatched to distributor"}] : role === "distributor" ? [{value:"received",label:"Stock received"},{value:"dispatched",label:"Dispatched to pharmacy"}] : [{value:"received",label:"Stock received"},{value:"dispensed",label:"Medicine dispensed"}]).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field>
        <Field label="Organization / staff name"><input className={inputClass} name="actor" value={form.actor} onChange={updateField} placeholder="Organization or authorized staff"/></Field>
        <Field label="Location"><input className={inputClass} name="location" value={form.location} onChange={updateField} placeholder="Town, branch, or facility"/></Field>
        <div className="sm:col-span-2"><Field label="Delivery / dispensing note"><textarea className={inputClass} rows="3" name="note" value={form.note} onChange={updateField} placeholder="Optional reference, quantity, or hand-off note"/></Field></div>
        <div className="sm:col-span-2 rounded-xl bg-sky-50 p-3 text-xs leading-5 text-sky-900">Only select a status when the corresponding event actually happened. This prototype does not verify delivery documents or staff identity.</div>
        <div className="flex justify-end gap-3 pt-1 sm:col-span-2"><button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-gray-200 px-4 py-3 text-sm font-bold text-gray-600">Cancel</button><button type="submit" className={buttonClass}><Send size={17}/> Save supply event</button></div>
      </form>}
    </div></div>}
    {toast && <div role="status" className="fixed bottom-24 right-4 z-[120] flex max-w-sm items-start gap-3 rounded-2xl bg-[#242039] px-4 py-3 text-sm font-semibold text-white shadow-xl md:bottom-6"><CheckCircle2 size={19} className="shrink-0 text-emerald-300"/>{toast}</div>}
  </div>;
}

function Metric({ icon: Icon, label, value, detail }) {
  return <div className="rounded-2xl border border-[#E9E5F1] bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><span className="text-sm font-semibold text-gray-500">{label}</span><span className="rounded-xl bg-purple-50 p-2.5 text-[#4926C8]"><Icon size={20}/></span></div><p className="mt-4 text-3xl font-extrabold text-[#242039]">{value}</p><p className="mt-1 text-xs text-gray-400">{detail}</p></div>;
}
function PackageSearchIcon() { return <Package size={30} className="mx-auto text-gray-300"/>; }
