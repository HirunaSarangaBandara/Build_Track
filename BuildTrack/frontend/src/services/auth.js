import API from "./api";

export const login = async (username, password) => {
  const res = await API.post("/auth/login", { username, password });
  localStorage.setItem("token", res.data.token);
  localStorage.setItem("role", res.data.role);
  localStorage.setItem("username", username);
  return res.data;
};

export const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  localStorage.removeItem("username");
};