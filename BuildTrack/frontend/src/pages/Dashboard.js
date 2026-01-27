import React, { useEffect, useState } from "react";
import "../styles/dashboard.css";
import { useLanguage } from "../contexts/LanguageContext";
import API from "../services/api";

function Dashboard() {
  const { t } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchDashboard = async () => {
      try {
        const res = await API.get('/dashboard');
        if (mounted) setData(res.data);
      } catch (err) {
        console.error('Failed to load dashboard', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchDashboard();
    return () => { mounted = false; };
  }, []);

  if (loading) return <div className="dashboard">{t('loading') || 'Loading...'}</div>;

  const stats = [
    { title: t("activeSites"), value: data?.activeSites || 0, detail: t("currentlyRunning") },
    { title: t("pendingTasks"), value: data?.pendingTasks || 0, detail: t("awaitingApproval") },
    { title: t("workersStat"), value: data?.workersCount || 0, detail: t("onSiteToday") },
    { title: t("inventoryStat"), value: data?.inventoryCount || 0, detail: t("itemsCategories") },
  ];

  return (
    <div className="dashboard">
      <h1 className="dashboard-title">{t("dashboardTitle")}</h1>

      {/* Message Alerts */}
      {data?.unreadCount > 0 && (
        <div className="dashboard-alerts">
          <strong>{data.unreadCount} unread message{data.unreadCount > 1 ? 's' : ''}</strong>
          <ul>
            {data.unreadMessages?.map((m) => {
              const time = new Date(m.createdAt).toLocaleString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit' });
              return (
                <li key={m._id}>{m.alertText || (m.senderName || 'Unknown') + ' sent you a message'} — {time}</li>
              );
            })}
          </ul>
        </div>
      )}

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
        <h2>{t("pendingTasks") || 'Pending Tasks'}</h2>
        {data?.pendingTasksDetails && data.pendingTasksDetails.length > 0 ? (
          <ul>
            {data.pendingTasksDetails.map((p) => (
              <li key={p._id}>{p.siteName} — {p.pending} pending</li>
            ))}
          </ul>
        ) : (
          <p>No pending tasks.</p>
        )}
      </div>

      <div className="dashboard-section">
        <h2>{t("sitesProgress") || 'Sites Progress'}</h2>
        <ul>
          {data?.sitesProgress?.map((s) => (
            <li key={s._id}>{s.siteName} — {s.progress}% ({s.completed}/{s.total})</li>
          ))}
        </ul>
      </div>

      <div className="dashboard-section">
        <h2>{t("workersDetails") || 'Workers'}</h2>
        <ul>
          {data?.workers?.map((w, i) => (
            <li key={i}>{w.name} — {w.category || 'N/A'} — {w.contact}</li>
          ))}
        </ul>
      </div>

      <div className="dashboard-section">
        <h2>{t("inventorySummary") || 'Inventory Summary'}</h2>
        <div className="inventory-overview">
          <ul>
            <li>In Stock: {data?.availabilitySummary?.['In Stock'] || 0}</li>
            <li>Low Stock: {data?.availabilitySummary?.['Low Stock'] || 0}</li>
            <li>Out of Stock: {data?.availabilitySummary?.['Out of Stock'] || 0}</li>
          </ul>

          <h4 style={{ marginTop: '10px' }}>{t('inventoryItems') || 'Inventory Items'}</h4>
          <ul>
            {data?.inventoryItems?.map((item) => (
              <li key={item._id}>{item.name} — {item.category} — Qty: {item.quantity}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="dashboard-section">
        <h2>{t("recentActivities")}</h2>
        <ul>
          {data?.recentSites?.map((s) => (
            <li key={s._id}>{s.siteName} — {s.currentStatus}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default Dashboard;