import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import ScanMedicine from "./pages/ScanMedicine";
import VerificationResult from "./pages/VerificationResult";
import MedicineDetails from "./pages/MedicineDetails";
import ScanHistory from "./pages/ScanHistory";
import MedicineRegistry from "./pages/MedicineRegistry";
import SafetyInformation from "./pages/SafetyInformation";
import Settings from "./pages/Settings";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="history" element={<ScanHistory />} />
        <Route path="registry" element={<MedicineRegistry />} />
        <Route path="safety" element={<SafetyInformation />} />
        <Route path="settings" element={<Settings />} />
        <Route path="scan" element={<ScanMedicine />} />
        <Route path="results" element={<VerificationResult />} />
        <Route path="medicine-details" element={<MedicineDetails />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
