import { Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/Login/LoginPage";
import ClinicsPage from "./pages/Clinics/ClinicsPage";
import DentistsPage from "./pages/Dentists/DentistsPage";
import PatientsPage from "./pages/Patients/PatientsPage";

function HomeRedirect() {
  const token = localStorage.getItem("authToken");
  // si hay token lo mandas a clínicas, si no al login
  return <Navigate to={token ? "/clinics" : "/login"} replace />;
}

export default function App() {
  return (
    <Routes>
      {/* ✅ cuando abres localhost:5173 */}
      <Route path="/" element={<HomeRedirect />} />

      <Route path="/login" element={<LoginPage />} />
      <Route path="/clinics" element={<ClinicsPage />} />
      <Route path="/clinics/:clinicId/dentists" element={<DentistsPage />} />
      <Route path="/clinics/:clinicId/patients" element={<PatientsPage />} />

      {/* ✅ cualquier ruta rara -> home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
