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
import SuperAdminLayout from "./pages/Admin/SuperAdminLayout";
import DentistLayout from "./pages/Dentist/DentistLayout";
import DentistAppointmentsPage from "./pages/Dentist/DentistAppointmentsPage";
import DentistPatientsPage from "./pages/Dentist/DentistPatientsPage";
import ReceptionistLayout from "./pages/Receptionist/ReceptionistLayout";
import ReceptionistAppointmentsPage from "./pages/Receptionist/ReceptionistAppointmentsPage";
import PatientLayout from "./pages/Patient/PatientLayout";
import PatientHomePage from "./pages/Patient/PatientHomePage";
import PatientAppointmentsPage from "./pages/Patient/PatientAppointmentsPage";
import PatientProfilePage from "./pages/Patient/PatientProfilePage";
import PatientClinicDetailsPage from "./pages/Patient/PatientClinicDetailsPage";
import PatientBookAppointmentPage from "./pages/Patient/PatientBookAppointmentPage";
import PatientRegistrationPage from "./pages/PatientRegistration/PatientRegistrationPage";

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
      <Route path="/registro" element={<PatientRegistrationPage />} />

      <Route element={<ProtectedLayout />}>
        <Route element={<RoleGuard allowedRoles={["super_admin"]} />}>
          <Route element={<SuperAdminLayout />}>
            <Route path="/clinics" element={<ClinicsPage />} />
            <Route path="/clinics/:clinicId" element={<ClinicDetailPage />} />
            <Route path="/clinics/:clinicId/dentists" element={<DentistsPage />} />
            <Route path="/clinics/:clinicId/patients" element={<PatientsPage />} />
            <Route path="/specialties" element={<AdminSpecialtiesPage />} />
            <Route path="/services" element={<AdminServicesPage />} />
          </Route>
        </Route>

        <Route element={<RoleGuard allowedRoles={["admin"]} />}>
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

        <Route element={<RoleGuard allowedRoles={["receptionist"]} />}>
          <Route path="/receptionist" element={<ReceptionistLayout />}>
            <Route index element={<Navigate to="/receptionist/appointments" replace />} />
            <Route path="appointments" element={<ReceptionistAppointmentsPage />} />
            <Route path="patients" element={<PatientsPage />} />
          </Route>
        </Route>

        <Route element={<RoleGuard allowedRoles={["dentist"]} />}>
          <Route path="/dentist" element={<DentistLayout />}>
            <Route index element={<Navigate to="/dentist/appointments" replace />} />
            <Route path="appointments" element={<DentistAppointmentsPage />} />
            <Route path="patients" element={<DentistPatientsPage />} />
          </Route>
        </Route>

        <Route element={<RoleGuard allowedRoles={["pacient"]} />}>
          <Route path="/patient" element={<PatientLayout />}>
            <Route index element={<PatientHomePage />} />
            <Route path="appointments" element={<PatientAppointmentsPage />} />
            <Route path="services" element={<PatientClinicDetailsPage />} />
            <Route path="book" element={<PatientBookAppointmentPage />} />
            <Route path="profile" element={<PatientProfilePage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
