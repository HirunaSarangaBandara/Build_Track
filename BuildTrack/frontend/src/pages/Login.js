import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import "../styles/login.css";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // --- Store keys used in services/auth.js ---
  const TOKEN_KEY = 'authToken'; 
  const ROLE_KEY = 'userRole';
  const NAME_KEY = 'userName';
  const ID_KEY = 'userId'; 

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password.trim()) {
      setError("Please fill in both fields.");
      return;
    }

    setLoading(true);
    try {
      const res = await API.post("/auth/login", { username, password });
      
      // Destructure necessary data from the successful backend response
      const { token, role, name, id } = res.data;

      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(ROLE_KEY, role); 
      localStorage.setItem(NAME_KEY, name);
      localStorage.setItem(ID_KEY, id); 
      
      // redirect to dashboard
      navigate("/dashboard");
    } catch (err) {
      const msg =
        err.response?.data?.message || "Invalid credentials. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <form className="login-form" onSubmit={handleSubmit}>
          <h1>Welcome to BuildTrack!</h1>
          <h2>Login</h2>

          <input
            type="text"
            placeholder="Enter Email or Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />

          <div className="password-field">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Enter Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <span
              className="toggle-password"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? "🙈" : "👁️"}
            </span>
          </div>

          {error && <p className="error">{error}</p>}

          <button type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;