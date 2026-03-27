import axios from "axios";

const api = axios.create();

api.interceptors.request.use((config) => {
  const storedUser = localStorage.getItem("smarthome_user");
  if (storedUser) {
    const user = JSON.parse(storedUser);
    config.headers["x-user-id"] = user.id;
    config.headers["x-user-role"] = user.role;
  }
  return config;
});

export default api;
