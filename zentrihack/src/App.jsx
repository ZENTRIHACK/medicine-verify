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
import ManufacturerLayout from "./portals/manufacturer/ManufacturerLayout";
import ManufacturerPortal from "./portals/manufacturer/ManufacturerPortal";
import DistributorLayout from "./portals/distributor/DistributorLayout";
import DistributorPortal from "./portals/distributor/DistributorPortal";
import PharmacyLayout from "./portals/pharmacy/PharmacyLayout";
import PharmacyPortal from "./portals/pharmacy/PharmacyPortal";

export default function App() {
  return <Routes>
    {/* Patient-facing application has its own navigation and layout. */}
    <Route path="/" element={<Layout />}>
      <Route index element={<Home />} />
      <Route path="history" element={<ScanHistory />} />
      <Route path="registry" element={<MedicineRegistry />} />
      <Route path="safety" element={<SafetyInformation />} />
      <Route path="settings" element={<Settings />} />
      <Route path="scan" element={<ScanMedicine />} />
      <Route path="results" element={<VerificationResult />} />
      <Route path="medicine-details" element={<MedicineDetails />} />
    </Route>

    {/* Each supply-chain role has a separate route root and isolated layout.
        There are deliberately no links between partner workspaces. */}
    <Route path="/manufacturer" element={<ManufacturerLayout />}>
      <Route index element={<ManufacturerPortal />} />
      <Route path="dashboard" element={<ManufacturerPortal />} />
      <Route path="*" element={<Navigate to="/manufacturer" replace />} />
    </Route>
    <Route path="/distributor" element={<DistributorLayout />}>
      <Route index element={<DistributorPortal />} />
      <Route path="dashboard" element={<DistributorPortal />} />
      <Route path="*" element={<Navigate to="/distributor" replace />} />
    </Route>
    <Route path="/pharmacy" element={<PharmacyLayout />}>
      <Route index element={<PharmacyPortal />} />
      <Route path="dashboard" element={<PharmacyPortal />} />
      <Route path="*" element={<Navigate to="/pharmacy" replace />} />
    </Route>

    {/* Old shared portal selector is intentionally disabled. */}
    <Route path="/partners/*" element={<Navigate to="/" replace />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>;
}
