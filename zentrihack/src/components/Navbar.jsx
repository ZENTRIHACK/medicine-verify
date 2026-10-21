import { NavLink } from "react-router-dom";
import { House, ScanLine, History, Database, ShieldCheck, Settings, Workflow } from "lucide-react";

const links = [
  { name: "Home", path: "/", icon: House, message: "Welcome to your MediScan dashboard." },
  { name: "Scan Medicine", path: "/scan", icon: ScanLine, message: "Upload or capture a medicine package to begin a scan." },
  { name: "Scan History", path: "/history", icon: History, message: "Review scans saved in this browser." },
  { name: "Medicine Registry", path: "/registry", icon: Database, message: "Search the sample medicine registry. Entries are demo data." },
  { name: "Safety Information", path: "/safety", icon: ShieldCheck, message: "Read important medicine verification and safety guidance." },
  { name: "Settings", path: "/settings", icon: Settings, message: "Manage local demo preferences and scan history." },
];

function announce(message) {
  if (localStorage.getItem("mediscan_navigation_messages") === "false") return;
  window.dispatchEvent(new CustomEvent("mediscan-toast", { detail: message }));
}

export default function Navbar() {
  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
      isActive ? "bg-white/20 text-white" : "text-purple-200 hover:bg-white/10 hover:text-white"
    }`;

  return (
    <>
      <aside className="fixed left-0 top-0 z-50 hidden h-screen w-64 flex-col bg-[#28145F] px-5 py-6 text-white md:flex">
        <NavLink to="/" onClick={() => announce(links[0].message)} className="mb-10 flex items-center gap-3">
          <span className="rounded-xl bg-white/15 p-2.5"><ShieldCheck size={25} /></span>
          <span className="text-2xl font-extrabold">MediScan</span>
        </NavLink>
        <nav className="flex flex-col gap-2" aria-label="Main navigation">
          {links.map(({ name, path, icon: Icon, message }) => (
            <NavLink key={path} to={path} end={path === "/"} onClick={() => announce(message)} className={linkClass}>
              <Icon size={19} /><span>{name}</span>
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto rounded-xl bg-white/10 p-3 text-xs leading-5 text-purple-100">
          <ShieldCheck size={19} className="mb-2" />
          This check compares pack details with a registry record. It does not test the medicine inside.
        </div>
        <div className="mt-5 flex items-center gap-3 border-t border-white/20 pt-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-200 font-bold text-purple-800">MS</div>
          <div><p className="text-sm font-semibold">MediScan User</p><p className="text-xs text-purple-200">Guest demo</p></div>
        </div>
      </aside>

      <nav className="fixed bottom-0 left-0 z-50 grid w-full grid-cols-5 border-t border-purple-100 bg-white px-1 py-2 md:hidden" aria-label="Mobile navigation">
        {links.filter(({ path }) => ["/", "/scan", "/history", "/registry", "/partners"].includes(path)).map(({ path, icon: Icon, message }) => (
          <NavLink key={path} to={path} end={path === "/"} onClick={() => announce(message)} className={({ isActive }) => `flex flex-col items-center gap-1 py-2 text-[10px] font-semibold ${isActive ? "text-[#4926C8]" : "text-gray-400"}`}>
            <Icon size={21} /><span>{{ "/": "Home", "/scan": "Scan", "/history": "History", "/registry": "Registry" }[path]}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
}
