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

function AdminRoute({ children }) {
  const { user } = useAuth();
  if (user?.role !== "ADMIN") return <Navigate to="/dashboard" replace />;
  return children;
}

function UserRoute({ children }) {
  const { user } = useAuth();
  if (user?.role !== "USER") return <Navigate to="/users" replace />;
  return children;
}

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) {
    return <Navigate to={user.role === "ADMIN" ? "/users" : "/dashboard"} replace />;
  }
  return children;
}

function DefaultRedirect() {
  const { user } = useAuth();
  if (user?.role === "ADMIN") return <Navigate to="/users" replace />;
  return <Navigate to="/dashboard" replace />;
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
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route index element={<DefaultRedirect />} />
            <Route
              path="dashboard"
              element={
                <UserRoute>
                  <DashboardPage />
                </UserRoute>
              }
            />
            <Route
              path="devices"
              element={
                <UserRoute>
                  <DevicesPage />
                </UserRoute>
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
            <Route path="profile" element={<ProfilePage />} />
          </Route>
          <Route path="*" element={<DefaultRedirect />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
