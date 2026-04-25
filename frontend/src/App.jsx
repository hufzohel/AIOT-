import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Layout from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import DevicesPage from "./pages/DevicesPage";
import UsersPage from "./pages/UsersPage";
import UserDetailPage from "./pages/UserDetailPage";
import LogsPage from "./pages/LogsPage";
import ProfilePage from "./pages/ProfilePage";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  // FORCE UPPERCASE & BOUNCE TO NEUTRAL GROUND
  if (user?.role?.toUpperCase() !== "ADMIN") return <Navigate to="/devices" replace />;
  return children;
}

function MemberRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  // FORCE UPPERCASE & BOUNCE TO NEUTRAL GROUND
  if (user?.role?.toUpperCase() !== "USER") return <Navigate to="/devices" replace />;
  return children;
}

// function MemberRoute({ children }) {
//   const { user, loading } = useAuth();
//   if (loading) return null;
//   if (!user) return <Navigate to="/login" replace />;
  
//   const role = user?.role?.toUpperCase();
  
//   // THE FIX: Allow both "MEMBER" and "USER" to enter the dashboard
//   if (role !== "MEMBER" && role !== "USER") {
//     return <Navigate to="/devices" replace />;
//   }
  
//   return children;
// }

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) {
    return <Navigate to={user?.role?.toUpperCase() === "ADMIN" ? "/users" : "/dashboard"} replace />;
  }
  return children;
}

function DefaultRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user?.role?.toUpperCase() === "ADMIN" ? "/users" : "/dashboard"} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DefaultRedirect />} />
            <Route
              path="dashboard"
              element={
                <MemberRoute>
                  <DashboardPage />
                </MemberRoute>
              }
            />
            <Route
              path="devices"
              element={
                <ProtectedRoute>
                  <DevicesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="users"
              element={
                <AdminRoute>
                  <UsersPage />
                </AdminRoute>
              }
            />
            <Route
              path="users/:id"
              element={
                <AdminRoute>
                  <UserDetailPage />
                </AdminRoute>
              }
            />
            <Route
              path="logs"
              element={
                <AdminRoute>
                  <LogsPage />
                </AdminRoute>
              }
            />
          </Route>

          <Route path="*" element={<DefaultRedirect />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
