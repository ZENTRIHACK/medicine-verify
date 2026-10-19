
import { NavLink } from "react-router-dom";
import {
  House,
  ScanLine,
  History,
  Database,
  ShieldCheck,
  Settings,
} from "lucide-react";

const links = [
  { name: "Home", path: "/", icon: House },
  { name: "Scan Medicine", path: "/scan", icon: ScanLine },
  { name: "Scan History", path: "/history", icon: History },
  { name: "Medicine Registry", path: "/registry", icon: Database },
  { name: "Safety Information", path: "/safety", icon: ShieldCheck },
  { name: "Settings", path: "/settings", icon: Settings },
];

export default function Navbar() {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-64 flex-col bg-[#28145F] px-5 py-6 text-white z-50">
        <NavLink to="/" className="flex items-center gap-3 mb-10">
          <span className="bg-white/15 p-2.5 rounded-xl">
            <ShieldCheck size={25} />
          </span>

          <span className="text-2xl font-extrabold">
            MediScan
          </span>
        </NavLink>

        <nav className="flex flex-col gap-2">
          {links.map(({ name, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  isActive
                    ? "bg-white/20 text-white"
                    : "text-purple-200 hover:bg-white/10 hover:text-white"
                }`
              }
            >
              <Icon size={19} />
              <span>{name}</span>
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto rounded-xl bg-white/10 p-3 text-xs leading-5 text-purple-100">
          <ShieldCheck size={19} className="mb-2" />
          This check compares pack details with a registry record. It does
          not test the medicine inside.
        </div>

        <div className="mt-5 flex items-center gap-3 border-t border-white/20 pt-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-200 font-bold text-purple-800">
            MS
          </div>

          <div>
            <p className="text-sm font-semibold">MediScan User</p>
            <p className="text-xs text-purple-200">Demo account</p>
          </div>
        </div>
      </aside>

      {/* Mobile bottom navigation */}
      <nav className="fixed bottom-0 left-0 z-50 grid w-full grid-cols-4 border-t border-purple-100 bg-white px-2 py-2 md:hidden">
        {links
          .filter(({ path }) =>
            ["/", "/scan", "/history", "/registry"].includes(path)
          )
          .map(({ name, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === "/"}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-2 text-[10px] font-semibold ${
                  isActive ? "text-[#4926C8]" : "text-gray-400"
                }`
              }
            >
              <Icon size={21} />

              <span>
                {{
                  "/": "Home",
                  "/scan": "Scan",
                  "/history": "History",
                  "/registry": "Registry",
                }[path]}
              </span>
            </NavLink>
          ))}
      </nav>
    </>
  );
}
