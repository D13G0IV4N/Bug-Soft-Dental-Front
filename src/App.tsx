import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/Login/LoginPage";
import ClinicsPage from "./pages/Clinics/ClinicsPage";
import DentistsPage from "./pages/Dentists/DentistsPage";
import PatientsPage from "./pages/Patients/PatientsPage";
import ClinicDetailPage from "./pages/Clinics/ClinicDetailPage";
import { getPostLoginRoute, getStoredRole, isAuthenticated, type AppRole } from "./utils/auth";
import AdminLayout from "./pages/Admin/AdminLayout";
import AdminDashboardPage from "./pages/Admin/AdminDashboardPage";
import AdminDentistsPage from "./pages/Admin/AdminDentistsPage";
import AdminReceptionistsPage from "./pages/Admin/AdminReceptionistsPage";
import AdminAppointmentsPage from "./pages/Admin/AdminAppointmentsPage";
import AdminSpecialtiesPage from "./pages/Admin/AdminSpecialtiesPage";
import AdminServicesPage from "./pages/Admin/AdminServicesPage";

function HomeRedirect() {
  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  return <Navigate to={getPostLoginRoute(getStoredRole())} replace />;
}

function ProtectedLayout() {
  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  return <Outlet />;
}

function RoleGuard({ allowedRoles }: { allowedRoles: AppRole[] }) {
  const role = getStoredRole();

  if (!role) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(role)) return <Navigate to={getPostLoginRoute(role)} replace />;

  return <Outlet />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedLayout />}>
        <Route element={<RoleGuard allowedRoles={["super_admin"]} />}>
          <Route path="/clinics" element={<ClinicsPage />} />
          <Route path="/clinics/:clinicId" element={<ClinicDetailPage />} />
          <Route path="/clinics/:clinicId/dentists" element={<DentistsPage />} />
          <Route path="/clinics/:clinicId/patients" element={<PatientsPage />} />
        </Route>

        <Route element={<RoleGuard allowedRoles={["admin", "receptionist"]} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboardPage />} />
            <Route element={<RoleGuard allowedRoles={["admin"]} />}>
              <Route path="users" element={<Navigate to="/admin/dentists" replace />} />
              <Route path="dentists" element={<AdminDentistsPage />} />
              <Route path="receptionists" element={<AdminReceptionistsPage />} />
              <Route path="specialties" element={<AdminSpecialtiesPage />} />
              <Route path="services" element={<AdminServicesPage />} />
            </Route>
            <Route path="patients" element={<PatientsPage />} />
            <Route path="appointments" element={<AdminAppointmentsPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
