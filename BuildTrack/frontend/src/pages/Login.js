import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import Lottie from "react-lottie-player";
import animationData from "../assets/City Building.json";
import "../styles/login.css";
import { useLanguage } from "../contexts/LanguageContext";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();

  const TOKEN_KEY = "authToken";
  const ROLE_KEY = "userRole";
  const NAME_KEY = "userName";
  const ID_KEY = "userId";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password.trim()) {
      setError(t("fillFields"));
      return;
    }

    setLoading(true);
    try {
      const res = await API.post("/auth/login", { username, password });
      const { token, role, name, id } = res.data;

      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(ROLE_KEY, role);
      localStorage.setItem(NAME_KEY, name);
      localStorage.setItem(ID_KEY, id);

      navigate("/dashboard");
    } catch (err) {
      const msg =
        err.response?.data?.message || t("invalidCredentials");
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">

      {/* 🔹 Lottie Animated Background */}
      <Lottie
        loop
        play
        animationData={animationData}
        className="login-lottie"
      />

      <div className="login-container">
        <form className="login-form" onSubmit={handleSubmit}>
          <LanguageSelector />
          <h1>{t("welcome")}</h1>
          <h2>{t("loginTitle")}</h2>

          <input
            type="text"
            placeholder={t("placeholderUsername")}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />

          <div className="password-field">
            <input
              type={showPassword ? "text" : "password"}
              placeholder={t("placeholderPassword")}
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
            {loading ? t("loggingIn") : t("loginButton")}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;

function LanguageSelector() {
  const { lang, setLang, t } = useLanguage();

  return (
    <div style={{ width: "100%" }}>
      <select
        className="language-select"
        value={lang}
        onChange={(e) => setLang(e.target.value)}
        aria-label={t("loginTitle") + " language selector"}
      >
        <option value="en">English</option>
        <option value="ta">தமிழ்</option>
        <option value="si">සිංහල</option>
      </select>
    </div>
  );
}