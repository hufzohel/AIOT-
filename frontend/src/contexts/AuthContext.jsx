import { createContext, useContext, useEffect, useMemo, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("smarthome_user");
    const storedToken = localStorage.getItem("smarthome_token");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    if (storedToken) {
      setToken(storedToken);
    }
    setLoading(false);
  }, []);

  const login = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem("smarthome_user", JSON.stringify(userData));
    localStorage.setItem("smarthome_token", authToken);
  };

  const updateUser = (userData) => {
    setUser(userData);
    localStorage.setItem("smarthome_user", JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("smarthome_user");
    localStorage.removeItem("smarthome_token");
  };

  const value = useMemo(
    () => ({ user, token, loading, login, logout, updateUser }),
    [user, token, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
