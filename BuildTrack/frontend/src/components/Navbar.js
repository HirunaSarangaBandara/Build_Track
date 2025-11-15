import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import "../styles/Navbar.css";
import { logout, getRole } from "../services/auth";

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const role = getRole();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header className="navbar">
      <div className="navbar-left">
        <h2 className="navbar-logo" onClick={() => navigate("/dashboard")}>
          BuildTrack
        </h2>
      </div>

      {/* Hamburger for mobile */}
      <div
        className={`hamburger ${menuOpen ? "open" : ""}`}
        onClick={() => setMenuOpen(!menuOpen)}
      >
        <span></span>
        <span></span>
        <span></span>
      </div>

      {/* Navigation Links */}
      <nav className={`navbar-links ${menuOpen ? "show" : ""}`}>
        <NavLink to="/dashboard" className="nav-item">
          Dashboard
        </NavLink>
        <NavLink to="/sites-tasks" className="nav-item">
          Sites & Tasks
        </NavLink>
        <NavLink to="/labor-management" className="nav-item">
          Labor
        </NavLink>
        <NavLink to="/inventory" className="nav-item">
          Inventory
        </NavLink>
        <NavLink to="/communication" className="nav-item">
          Communication
        </NavLink>
        <NavLink to="/reports" className="nav-item">
          Reports
        </NavLink>
      </nav>

      <div className="navbar-right">
        <span className="role-badge">{role?.toUpperCase()}</span>
        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </header>
  );
}

export default Navbar;