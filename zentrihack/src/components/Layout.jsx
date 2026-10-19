import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";

export default function Layout() {
  return (
    <div className="min-h-screen bg-[#F5F3FA]">
      <Navbar />

      <main className="min-h-screen pb-24 md:ml-64 md:pb-0">
        <Outlet />
      </main>
    </div>
  );
}
