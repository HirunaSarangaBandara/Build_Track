import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Lottie from "react-lottie-player";

import animationData from "../assets/City Building.json";
import "../styles/login.css";

import { useLanguage } from "../contexts/LanguageContext";
import { login as authLogin } from "../services/auth";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { t, lang, setLang } = useLanguage();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password.trim()) {
      setError(t("fillFields"));
      return;
    }

    setLoading(true);
    try {
      await authLogin(username, password);
      navigate("/dashboard");
    } catch (err) {
      const msg = err.message || t("invalidCredentials");
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-root">
      {/* Top-right language selector */}
      <div className="login-lang-wrapper">
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

      <div className="login-card">
        <div className="login-left">
          <Lottie
            loop
            play
            animationData={animationData}
            className="login-animation"
          />
        </div>

        <div className="login-right">
          {/* Greeting block */}
          <div className="login-header">
            <h1>Welcome to BuildTrack</h1>
            <p className="login-subtitle">
              Sign in with your username and password to manage your projects.
            </p>
          </div>

          {error && <div className="login-error">{error}</div>}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label>{t("placeholderUsername")}</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t("placeholderUsername")}
              />
            </div>

            <div className="form-group">
              <label>{t("placeholderPassword")}</label>
              <div className="password-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("placeholderPassword")}
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="login-button"
              disabled={loading}
            >
              {loading ? t("loggingIn") : t("loginButton")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;