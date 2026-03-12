import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/Login/LoginPage";
import ClinicsPage from "./pages/Clinics/ClinicsPage";
import DentistsPage from "./pages/Dentists/DentistsPage";
import PatientsPage from "./pages/Patients/PatientsPage";
import ClinicDetailPage from "./pages/Clinics/ClinicDetailPage";

function HomeRedirect() {
  const token = localStorage.getItem("authToken");
  return <Navigate to={token ? "/clinics" : "/login"} replace />;
}

function ProtectedLayout() {
  const token = localStorage.getItem("authToken");
  if (!token) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedLayout />}>
        <Route path="/clinics" element={<ClinicsPage />} />
        <Route path="/clinics/:clinicId" element={<ClinicDetailPage />} />
        <Route path="/clinics/:clinicId/dentists" element={<DentistsPage />} />
        <Route path="/clinics/:clinicId/patients" element={<PatientsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
