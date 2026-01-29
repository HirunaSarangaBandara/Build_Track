import React, { useEffect, useState } from "react";
import "../styles/dashboard.css";
import { useLanguage } from "../contexts/LanguageContext";
import API from "../services/api";
import { getRole, getUserId } from "../services/auth";

const ProgressIcon = () => (
  <div className="dash-icon dash-icon-progress" aria-hidden="true">
    <svg
      viewBox="0 0 24 24"
      className="dash-icon-svg"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="4" y="10" width="4" height="8" rx="1.5" fill="white" />
      <rect x="10" y="6" width="4" height="12" rx="1.5" fill="white" />
      <rect x="16" y="3" width="4" height="15" rx="1.5" fill="white" />
    </svg>
  </div>
);

const TasksIcon = () => (
  <div className="dash-icon dash-icon-time" aria-hidden="true">
    <svg
      viewBox="0 0 24 24"
      className="dash-icon-svg"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" r="7" stroke="white" strokeWidth="2" fill="none" />
      <path
        d="M12 8v4l2.5 2.5"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </div>
);

const TeamIcon = () => (
  <div className="dash-icon dash-icon-team" aria-hidden="true">
    <svg
      viewBox="0 0 24 24"
      className="dash-icon-svg"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="9" cy="9" r="3" fill="white" />
      <circle cx="16" cy="10" r="2.5" fill="white" opacity="0.85" />
      <path
        d="M5.5 17c0-2 1.8-3.5 3.5-3.5s3.5 1.5 3.5 3.5"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M13.5 17c0-1.5 1.2-2.7 2.5-2.7 1.3 0 2.5 1.2 2.5 2.7"
        stroke="white"
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
        opacity="0.85"
      />
    </svg>
  </div>
);

const InventoryIcon = () => (
  <div className="dash-icon dash-icon-budget" aria-hidden="true">
    <svg
      viewBox="0 0 24 24"
      className="dash-icon-svg"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="4"
        y="7"
        width="16"
        height="11"
        rx="2"
        ry="2"
        stroke="white"
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M8 10h8M8 13h4"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <rect x="9" y="4" width="6" height="3" rx="1.2" fill="white" />
    </svg>
  </div>
);

function Dashboard() {
  const { t } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const role = getRole();
  const userId = getUserId();

  useEffect(() => {
    let mounted = true;

    const fetchDashboard = async () => {
      try {
        const res = await API.get("/dashboard");
        if (mounted) setData(res.data);
      } catch (err) {
        console.error("Failed to load dashboard", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchDashboard();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="dash-root">
        <div className="dash-loading-wrapper">
          <div className="dash-spinner" />
          <div className="dash-loading-text">Loading dashboard…</div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="dash-root">
        <div className="dash-header dash-header-center">
          <h1 className="dash-title">Dashboard</h1>
        </div>
      </div>
    );
  }

  let {
    activeSites,
    pendingTasks,
    workersCount,
    managersCount,
    inventoryCount,
    availabilitySummary,
    sitesProgress,
    recentSites,
    pendingTasksDetails,
    unreadCount,
    unreadMessages,
    inventoryItems,
    workers,
  } = data;

  const isAdmin = role && role.toLowerCase() === "admin";
  const isManager = role === "Manager";
  const isWorker = role === "Worker";

  if (!isAdmin && userId) {
    const currentWorker = (workers || []).find((w) => w._id === userId);

    let allowedSiteNames = [];

    if (isWorker && currentWorker) {
      allowedSiteNames = currentWorker.sites || [];
    } else if (isManager) {
      const managing = (workers || []).filter(
        (w) => w.role === "Manager" && w._id === userId
      );
      managing.forEach((m) => {
        (m.sites || []).forEach((sName) => {
          if (!allowedSiteNames.includes(sName)) allowedSiteNames.push(sName);
        });
      });
    }

    if (allowedSiteNames.length > 0) {
      const filterByName = (arr) =>
        (arr || []).filter((s) => allowedSiteNames.includes(s.siteName));

      sitesProgress = filterByName(sitesProgress);
      recentSites = filterByName(recentSites);
      pendingTasksDetails = filterByName(pendingTasksDetails);

      activeSites = sitesProgress.filter((s) => s.status === "Active").length;
      pendingTasks = pendingTasksDetails.reduce(
        (sum, s) => sum + (s.pending || 0),
        0
      );
    } else {
      sitesProgress = [];
      recentSites = [];
      pendingTasksDetails = [];
      activeSites = 0;
      pendingTasks = 0;
    }

    if (!isAdmin) {
      inventoryItems = [];
    }
  }

  const totalTeam = (workersCount ?? 0) + (managersCount ?? 0);

  const overviewCards = [
    {
      id: "progress",
      label: "Active sites",
      value: activeSites ?? 0,
      helper: "Sites currently in progress",
      Icon: ProgressIcon,
    },
    {
      id: "tasks",
      label: "Pending tasks",
      value: pendingTasks ?? 0,
      helper: "Tasks waiting for completion",
      Icon: TasksIcon,
    },
    {
      id: "team",
      label: "Team members",
      value: totalTeam,
      helper: `${managersCount ?? 0} managers • ${workersCount ?? 0} workers`,
      Icon: TeamIcon,
    },
    {
      id: "inventory",
      label: "Inventory items",
      value: inventoryCount ?? 0,
      helper: "Materials being tracked",
      Icon: InventoryIcon,
    },
  ];

  return (
    <div className="dash-root">
      {/* Centered header */}
      <div className="dash-header dash-header-center">
        <h1 className="dash-title">Dashboard</h1>
      </div>

      {/* Overview metric cards */}
      <div className="dash-overview-grid">
        {overviewCards.map((card) => (
          <div key={card.id} className="dash-overview-card">
            <card.Icon />
            <div className="dash-overview-body">
              <div className="dash-overview-label">{card.label}</div>
              <div className="dash-overview-value">{card.value}</div>
              <div className="dash-overview-helper">{card.helper}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Main content grid (unchanged) */}
      <div className="dash-main-grid">
        <div className="dash-col">
          <section className="dash-section">
            <div className="dash-section-header">
              <h2>Site progress</h2>
            </div>
            {sitesProgress && sitesProgress.length > 0 ? (
              <ul className="dash-timeline">
                {sitesProgress.slice(0, 6).map((site) => (
                  <li key={site._id} className="dash-timeline-item">
                    <div className="dash-timeline-dot-wrapper">
                      <span className="dash-timeline-dot" />
                      <span className="dash-timeline-line" />
                    </div>

                    <div className="dash-timeline-content">
                      <div className="dash-timeline-header-row">
                        <div className="dash-timeline-title">
                          {site.siteName}
                        </div>
                        <span
                          className={`dash-status-pill dash-status-${site.status}`}
                        >
                          {site.status}
                        </span>
                      </div>
                      <div className="dash-timeline-sub">
                        {site.completed} of {site.total} tasks complete
                      </div>

                      <div className="dash-progress-bar">
                        <div
                          className="dash-progress-fill"
                          style={{ width: `${site.progress || 0}%` }}
                        />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="dash-empty">
                No site data available for your role yet.
              </p>
            )}
          </section>

          <section className="dash-section">
            <div className="dash-section-header">
              <h2>Tasks to follow up</h2>
            </div>
            {pendingTasksDetails && pendingTasksDetails.length > 0 ? (
              <ul className="dash-simple-list">
                {pendingTasksDetails.slice(0, 6).map((s) => (
                  <li key={s._id} className="dash-simple-item">
                    <div className="dash-simple-title">{s.siteName}</div>
                    <div className="dash-simple-meta">
                      {s.pending} tasks pending
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="dash-empty">
                There are no pending tasks for the sites you are assigned to.
              </p>
            )}
          </section>
        </div>

        <div className="dash-col">
          <section className="dash-section">
            <div className="dash-section-header">
              <h2>Inventory at a glance</h2>
            </div>
            {availabilitySummary ? (
              <>
                <div className="dash-inventory-row">
                  <div className="dash-inventory-chip">
                    <span className="dash-inv-dot in" />
                    <span>In stock</span>
                    <strong>{availabilitySummary["In Stock"] || 0}</strong>
                  </div>
                  <div className="dash-inventory-chip">
                    <span className="dash-inv-dot low" />
                    <span>Low stock</span>
                    <strong>{availabilitySummary["Low Stock"] || 0}</strong>
                  </div>
                  <div className="dash-inventory-chip">
                    <span className="dash-inv-dot out" />
                    <span>Out of stock</span>
                    <strong>{availabilitySummary["Out of Stock"] || 0}</strong>
                  </div>
                </div>

                {isAdmin && inventoryItems && inventoryItems.length > 0 && (
                  <ul className="dash-simple-list dash-inventory-list">
                    {inventoryItems.slice(0, 5).map((item) => (
                      <li key={item._id} className="dash-simple-item">
                        <div className="dash-simple-title">
                          {item.name}
                          <span className="dash-tag">
                            {item.category || "Uncategorized"}
                          </span>
                        </div>
                        <div className="dash-simple-meta">
                          {item.quantity} {item.unit}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <p className="dash-empty">
                Inventory metrics are not available yet.
              </p>
            )}
          </section>

          <section className="dash-section">
            <div className="dash-section-header">
              <h2>Recent site updates</h2>
            </div>
            {recentSites && recentSites.length > 0 ? (
              <ul className="dash-simple-list">
                {recentSites.slice(0, 5).map((s) => (
                  <li key={s._id} className="dash-simple-item">
                    <div className="dash-simple-title">{s.siteName}</div>
                    <div className="dash-simple-meta">
                      {s.currentStatus || "Status not set"}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="dash-empty">
                No recent changes for the sites you are assigned to.
              </p>
            )}
          </section>

          <section className="dash-section">
            <div className="dash-section-header">
              <h2>Unread messages</h2>
            </div>
            {unreadCount > 0 ? (
              <>
                <p className="dash-section-intro">
                  You have {unreadCount} unread message
                  {unreadCount > 1 ? "s" : ""}.
                </p>
                {unreadMessages && unreadMessages.length > 0 && (
                  <ul className="dash-simple-list">
                    {unreadMessages.map((m) => (
                      <li key={m._id} className="dash-simple-item">
                        <div className="dash-simple-title">
                          {m.senderName || "Unknown sender"}
                        </div>
                        <div className="dash-simple-meta">
                          {m.alertText || "New message received"}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <p className="dash-empty">
                You are up to date. There are no unread messages.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;