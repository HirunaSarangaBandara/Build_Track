import API from "./api";

// --- Consistent Keys ---
const TOKEN_KEY = "authToken";
const ROLE_KEY = "userRole";
const NAME_KEY = "userName";
const ID_KEY = "userId";

export const login = async (username, password) => {
  try {
    // Backend returns { token, role, name, id }
    const res = await API.post("/auth/login", { username, password });
    const { token, role, name, id } = res.data;

    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(ROLE_KEY, role);
    localStorage.setItem(NAME_KEY, name);
    localStorage.setItem(ID_KEY, id);

    return role;
  } catch (err) {
    throw new Error(err.response?.data?.message || "Login failed");
  }
};

export const logout = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(NAME_KEY);
  localStorage.removeItem(ID_KEY);
};

// --- Exported Getters ---
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const getRole = () => localStorage.getItem(ROLE_KEY);
export const getUserId = () => localStorage.getItem(ID_KEY);
export const getUserName = () => localStorage.getItem(NAME_KEY);
export const isAuthenticated = () => !!localStorage.getItem(TOKEN_KEY);