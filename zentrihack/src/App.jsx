
import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import ScanMedicine from "./pages/ScanMedicine";

function Placeholder({ title }) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <h1 className="text-3xl font-bold text-[#28145F]">{title}</h1>

      <p className="mt-3 text-sm text-gray-500">
        We'll build this section next.
      </p>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />

        <Route
          path="history"
          element={<Placeholder title="Scan History" />}
        />

        <Route
          path="registry"
          element={<Placeholder title="Medicine Registry" />}
        />

        <Route
          path="safety"
          element={<Placeholder title="Safety Information" />}
        />

        <Route
          path="settings"
          element={<Placeholder title="Settings" />}
        />

        <Route
        path="scan"
        element={<ScanMedicine />}
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
