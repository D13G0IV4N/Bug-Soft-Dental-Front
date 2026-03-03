import { Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/Login/LoginPage";
import ClinicsPage from "./pages/Clinics/ClinicsPage";

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

      {/* ✅ cualquier ruta rara -> home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}