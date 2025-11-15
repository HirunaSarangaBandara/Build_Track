import API from "./api";

export const login = async (username, password) => {
  try {
    const res = await API.post("/auth/login", { username, password });

    // Backend should return token + role
    const { token, role } = res.data;

    // Save them locally
    localStorage.setItem("token", token);
    localStorage.setItem("role", role);

    return role; // return for further use
  } catch (err) {
    throw new Error(err.response?.data?.message || "Login failed");
  }
};

export const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
};

export const getRole = () => localStorage.getItem("role");

export const isAuthenticated = () => !!localStorage.getItem("token");