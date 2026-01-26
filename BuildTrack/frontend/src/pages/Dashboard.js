import React from "react";
import "../styles/dashboard.css";
import { useLanguage } from "../contexts/LanguageContext";

function Dashboard() {
  const { t } = useLanguage();
  const stats = [
    { title: t("activeSites"), value: 12, detail: t("currentlyRunning") },
    { title: t("pendingTasks"), value: 8, detail: t("awaitingApproval") },
    { title: t("workersStat"), value: 45, detail: t("onSiteToday") },
    { title: t("reportsStat"), value: 3, detail: t("newThisWeek") },
  ];

  return (
    <div className="dashboard">
      <h1 className="dashboard-title">{t("dashboardTitle")}</h1>

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
        <h2>{t("recentActivities")}</h2>
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