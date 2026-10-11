import { Navigate, Route, Routes } from 'react-router-dom';
import ManufacturerDash from './components/ManufacturerDash';
import DistributorDash from './components/DistributorDash';
import PharmacyDash from './components/PharmacyDash';
import RegulatorDash from './components/RegulatorDash';
import PublicVerify from './pages/PublicVerify';
import SerialEntry from './pages/SerialEntry';

const DASHBOARDS = [
  { path: '/manufacturer', label: 'Manufacturer', component: ManufacturerDash },
  { path: '/distributor', label: 'Distributor', component: DistributorDash },
  { path: '/pharmacy', label: 'Pharmacy', component: PharmacyDash },
  { path: '/regulator', label: 'Regulator', component: RegulatorDash }
];

export default function App() {
  return (
    <>
      <header className="site-header">
        <nav className="page-container" aria-label="Dashboards">
          <a href="/">Verify a pack</a>
          {DASHBOARDS.map(({ path, label }) => (
            <a key={path} href={path}>{label}</a>
          ))}
        </nav>
      </header>
      <Routes>
        <Route path="/" element={<SerialEntry />} />
        <Route path="/v/:serial" element={<PublicVerify />} />
        {DASHBOARDS.map(({ path, component: Component }) => (
          <Route key={path} path={path} element={<Component />} />
        ))}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
