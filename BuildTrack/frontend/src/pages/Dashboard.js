import React, { useEffect, useState } from "react";
import { logout } from "../services/auth";
import "../styles/dashboard.css";

function Dashboard() {
  const [role, setRole] = useState("");
  const [username, setUsername] = useState("");

  useEffect(() => {
    const storedRole = localStorage.getItem("role");
    const storedUser = localStorage.getItem("username");
    if (!storedRole) window.location.href = "/";
    setRole(storedRole);
    setUsername(storedUser);
  }, []);

  const handleLogout = () => {
    logout();
    window.location.href = "/";
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h2>BuildTrack Dashboard</h2>
        <div className="user-info">
          <span>{username} ({role})</span>
          <button onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <div className="dashboard-content">
        <div className="card">
          <h3>📋 Tasks Overview</h3>
          <p>View your assigned tasks.</p>
          <button>View Tasks</button>
        </div>

        {role === "admin" && (
          <div className="card">
            <h3>👥 Manage Users</h3>
            <p>Create or remove Managers & Workers.</p>
            <button>Create User</button>
          </div>
        )}

        {role === "manager" && (
          <div className="card">
            <h3>🏗️ Site Management</h3>
            <p>Manage site tasks and track workers.</p>
            <button>Manage Sites</button>
          </div>
        )}

        {role === "worker" && (
          <div className="card">
            <h3>🕒 Attendance</h3>
            <p>Mark your attendance for today.</p>
            <button>Mark Attendance</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;