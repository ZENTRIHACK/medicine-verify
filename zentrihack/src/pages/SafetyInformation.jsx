import { AlertTriangle, CheckCircle2, ShieldCheck, Stethoscope } from "lucide-react";

const tips = [
  { title: "Check the packaging", text: "Look for broken seals, unusual spelling, damaged packaging, or details that appear to have been altered." },
  { title: "Compare the printed details", text: "Check the medicine name, batch number, manufacturer, and expiry date against trusted information." },
  { title: "Ask a qualified professional", text: "If a package looks suspicious or you are unsure about a medicine, speak with a licensed pharmacist or healthcare professional." },
];

export default function SafetyInformation() {
  return <div className="mx-auto max-w-5xl px-4 py-7 sm:px-6 sm:py-10"><div className="flex items-start gap-4"><div className="rounded-2xl bg-purple-100 p-3 text-[#4926C8]"><ShieldCheck size={27}/></div><div><p className="text-xs font-extrabold tracking-[2px] text-[#4926C8]">STAY INFORMED</p><h1 className="mt-1 text-3xl font-extrabold text-[#242039]">Safety Information</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">Use MediScan as a supporting tool, not as a replacement for professional advice or official regulatory checks.</p></div></div>
    <div className="mt-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-900"><AlertTriangle size={23} className="mt-0.5 shrink-0"/><div><h2 className="font-extrabold">Important limitation</h2><p className="mt-1 text-sm leading-6">A package scan cannot confirm the chemical contents, quality, storage conditions, or effectiveness of the medicine inside. A matching record does not guarantee that a medicine is safe.</p></div></div>
    <div className="mt-6 grid gap-4 md:grid-cols-3">{tips.map((tip, i) => <section key={tip.title} className="rounded-2xl border border-[#E9E5F1] bg-white p-5"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-[#4926C8]"><CheckCircle2 size={21}/></div><p className="mt-4 text-xs font-extrabold tracking-widest text-[#4926C8]">STEP 0{i+1}</p><h2 className="mt-2 font-bold text-[#242039]">{tip.title}</h2><p className="mt-2 text-sm leading-6 text-gray-500">{tip.text}</p></section>)}</div>
    <section className="mt-6 rounded-2xl border border-[#E9E5F1] bg-white p-5 sm:p-6"><div className="flex items-start gap-3"><Stethoscope size={23} className="mt-0.5 text-[#4926C8]"/><div><h2 className="font-bold text-[#242039]">If you suspect a medicine is unsafe</h2><p className="mt-2 text-sm leading-6 text-gray-500">Do not rely on a demo result or use an uncertain scan as proof of authenticity. Contact a qualified pharmacist or healthcare professional and follow guidance from the relevant medicines regulator.</p></div></div></section>
  </div>;
}
