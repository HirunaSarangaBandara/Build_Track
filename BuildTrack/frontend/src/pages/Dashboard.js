import React from "react";
import "../styles/dashboard.css";

function Dashboard() {
  const stats = [
    { title: "Active Sites", value: 12, detail: "Currently running" },
    { title: "Pending Tasks", value: 8, detail: "Awaiting approval" },
    { title: "Workers", value: 45, detail: "On-site today" },
    { title: "Reports", value: 3, detail: "New this week" },
  ];

  return (
    <div className="dashboard">
      <h1 className="dashboard-title">🏗️ BuildTrack Dashboard</h1>

      <div className="stats-grid">
        {stats.map((item, i) => (
          <div key={i} className="stats-card">
            <h3>{item.title}</h3>
            <p className="value">{item.value}</p>
            <span>{item.detail}</span>
          </div>
        ))}
      </div>

      <div className="dashboard-section">
        <h2>Recent Activities</h2>
        <ul>
          <li>✅ Site A — Safety inspection passed</li>
          <li>🚧 Site B — Foundation work completed</li>
          <li>📦 Warehouse — Inventory restocked</li>
          <li>📊 Report generated on workforce allocation</li>
        </ul>
      </div>
    </div>
  );
}

export default Dashboard;