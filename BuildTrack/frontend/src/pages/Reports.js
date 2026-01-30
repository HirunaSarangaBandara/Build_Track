import React, { useEffect, useMemo, useState } from "react";
import "../styles/reports.css";
import API from "../services/api";
import ReportViewer from "../components/ReportViewer";
import { getRole, getUserId } from "../services/auth";

function Reports() {
  const [reportType, setReportType] = useState("site");
  const [period, setPeriod] = useState("daily");
  const [scope, setScope] = useState("all");
  const [selectedId, setSelectedId] = useState("");

  const [sites, setSites] = useState([]);
  const [labors, setLabors] = useState([]);
  const [items, setItems] = useState([]);

  const [error, setError] = useState("");
  const [reportData, setReportData] = useState(null);
  const [showViewer, setShowViewer] = useState(false);

  const currentUserRole = getRole();    // "admin" | "Manager" | "Worker"
  const currentUserId = getUserId();

  const isAdmin = currentUserRole === "admin";
  const isManager = currentUserRole === "Manager";
  const isWorker = currentUserRole === "Worker";

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      try {
        setError("");
        const [sitesRes, laborRes, invRes] = await Promise.all([
          API.get("/sites"),
          API.get("/labors"),
          API.get("/inventory"),
        ]);
        if (!mounted) return;
        setSites(sitesRes.data || []);
        setLabors(laborRes.data || []);
        setItems(invRes.data || []);
      } catch {
        if (mounted) {
          setError("Failed to load data for reports. Please try again.");
        }
      }
    };
    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  const isCurrentUserManager = (siteManagerId) =>
    currentUserId && siteManagerId && currentUserId === siteManagerId;

  const { visibleSites, visibleLabors, visibleItems } = useMemo(() => {
    if (isAdmin) {
      return { visibleSites: sites, visibleLabors: labors, visibleItems: items };
    }
    if (isManager) {
      const mySites = sites.filter((s) => isCurrentUserManager(s.managerId));
      const mySiteIds = new Set(mySites.map((s) => String(s._id)));

      const myLabors = labors.filter((l) => {
        if (Array.isArray(l.sites) && l.sites.length > 0) {
          return l.sites.some((s) =>
            mySiteIds.has(String(s._id || s.siteId || s))
          );
        }
        if (l.site) {
          return mySites.some((site) => site.siteName === l.site);
        }
        return false;
      });

      return {
        visibleSites: mySites,
        visibleLabors: myLabors,
        visibleItems: items,
      };
    }
    return { visibleSites: [], visibleLabors: [], visibleItems: [] };
  }, [sites, labors, items, isAdmin, isManager, currentUserId, isCurrentUserManager]);

  const getDateRange = () => {
    const now = new Date();
    const endDate = new Date(now);
    let startDate = new Date(now);

    if (period === "daily") {
      startDate.setHours(0, 0, 0, 0);
    } else if (period === "weekly") {
      const day = startDate.getDay();
      const diff = day === 0 ? 6 : day - 1;
      startDate.setDate(startDate.getDate() - diff);
      startDate.setHours(0, 0, 0, 0);
    } else if (period === "monthly") {
      startDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      startDate.setHours(0, 0, 0, 0);
    }
    return { startDate, endDate };
  };

  const inRange = (dateStr, start, end) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d >= start && d <= end;
  };

  const buildSiteReport = () => {
    const { startDate, endDate } = getDateRange();
    const selectedSites =
      scope === "all"
        ? visibleSites
        : visibleSites.filter((s) => String(s._id) === String(selectedId));

    const siteReports = selectedSites.map((site) => {
      const tasks = Array.isArray(site.tasks) ? site.tasks : [];
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(
        (t) => (t.isCompleted || (t.status || "").toLowerCase() === "completed")
      ).length;
      const progress =
        totalTasks > 0
          ? Math.round((completedTasks / totalTasks) * 100)
          : 0;

      const timelineTasks = tasks.filter((t) =>
        t.endDate ? inRange(t.endDate, startDate, endDate) : false
      );

      const allocations = Array.isArray(site.allocatedInventory)
        ? site.allocatedInventory
        : [];

      const materialUsage = allocations.map((a) => {
        const used = a.usedQuantity || 0;
        const allocated = a.allocatedQuantity || 0;
        const remaining = allocated - used;
        const usage =
          allocated > 0 ? Math.round((used / allocated) * 100) : 0;
        return {
          itemId: a.inventoryItem || a.itemId || a._id,
          itemName: a.itemName || "Unnamed item",
          unit: a.unit || "",
          allocated,
          used,
          remaining,
          usage,
        };
      });

      return {
        siteId: site._id,
        siteName: site.siteName || "Unnamed Site",
        status: site.status || "Unknown",
        managerName: site.managerName || "Unassigned",
        period,
        dateRange: { startDate, endDate },
        totalTasks,
        completedTasks,
        progress,
        timeline: timelineTasks.map((t) => ({
          id: t._id || t.taskId,
          name: t.name || t.taskName || "Task",
          status:
            typeof t.isCompleted === "boolean"
              ? t.isCompleted
                ? "Completed"
                : "Pending"
              : t.status || "",
          startDate: t.startDate || "",
          endDate: t.endDate || "",
        })),
        materialUsage,
      };
    });

    return {
      type: "site",
      period,
      dateRange: { startDate, endDate },
      scope,
      sites: siteReports,
    };
  };

  // *** FIXED: count any positive hours as present ***
  const buildLaborReport = () => {
    const { startDate, endDate } = getDateRange();
    const selectedLabors =
      scope === "all"
        ? visibleLabors
        : visibleLabors.filter((lab) => String(lab._id) === String(selectedId));

    const laborReports = selectedLabors.map((lab) => {
      const records = Array.isArray(lab.attendanceRecords)
        ? lab.attendanceRecords
        : [];

      const filtered = records.filter((r) =>
        inRange(r.date, startDate, endDate)
      );
      const totalDays = filtered.length;

      const presentDays = filtered.filter((r) => {
        const hours = Number(r.hoursWorked || 0);
        if (hours > 0) return true;

        const raw = (r.status ?? r.attendanceStatus ?? "").toString();
        const status = raw.trim().toLowerCase();
        if (!status) return false;
        return ["present", "p", "pr", "presented"].includes(status);
      }).length;

      const absentDays = totalDays - presentDays;
      const attendancePercent =
        totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(1) : "0.0";

      const totalHours = filtered.reduce(
        (sum, r) => sum + (Number(r.hoursWorked) || 0),
        0
      );
      const avgHoursPerDay =
        totalDays > 0 ? (totalHours / totalDays).toFixed(2) : "0.00";

      const name =
        lab.name ||
        `${lab.firstName || ""} ${lab.lastName || ""}`.trim() ||
        "Unnamed Labor";

      let laborSites = [];
      if (Array.isArray(lab.sites) && lab.sites.length > 0) {
        laborSites = lab.sites;
      } else if (lab.site) {
        laborSites = [{ siteName: lab.site }];
      }

      return {
        laborId: lab._id,
        name,
        category: lab.category || "",
        role: lab.role || "",
        period,
        dateRange: { startDate, endDate },
        totalDays,
        presentDays,
        absentDays,
        attendancePercent,
        totalHours: totalHours.toFixed(2),
        avgHoursPerDay,
        sites: laborSites,
        details: filtered,
      };
    });

    return {
      type: "labor",
      period,
      dateRange: { startDate, endDate },
      scope,
      labors: laborReports,
    };
  };

  const buildInventoryReport = () => {
    const { startDate, endDate } = getDateRange();

    const allocationsByItem = {};
    visibleSites.forEach((site) => {
      const arr = Array.isArray(site.allocatedInventory)
        ? site.allocatedInventory
        : [];
      arr.forEach((a) => {
        const id = a.inventoryItem || a.itemId || a._id;
        if (!id) return;
        if (!allocationsByItem[id]) allocationsByItem[id] = [];
        allocationsByItem[id].push({
          siteId: site._id,
          siteName: site.siteName || "Unnamed Site",
          allocated: a.allocatedQuantity || 0,
          used: a.usedQuantity || 0,
        });
      });
    });

    const selectedItems =
      scope === "all"
        ? visibleItems
        : visibleItems.filter((i) => String(i._id) === String(selectedId));

    const itemReports = selectedItems.map((item) => {
      const warehouseQty = item.quantity || 0;
      const allocs = allocationsByItem[item._id] || [];

      const totalAllocated = allocs.reduce(
        (sum, r) => sum + (r.allocated || 0),
        0
      );
      const totalUsed = allocs.reduce((sum, r) => sum + (r.used || 0), 0);
      const available = warehouseQty - totalUsed;
      const usagePercent =
        warehouseQty > 0
          ? ((totalUsed / warehouseQty) * 100).toFixed(1)
          : "0.0";

      const itemName =
        item.itemName || item.name || item.title || "Unnamed Item";

      return {
        itemId: item._id,
        itemName,
        category: item.category || "",
        unit: item.unit || "",
        period,
        dateRange: { startDate, endDate },
        warehouseQuantity: warehouseQty,
        totalAllocated,
        totalUsed,
        available,
        usagePercent,
        allocations: allocs,
      };
    });

    return {
      type: "inventory",
      period,
      dateRange: { startDate, endDate },
      scope,
      items: itemReports,
    };
  };

  const handleGenerate = () => {
    if (isWorker) return;
    if (scope === "single" && !selectedId) {
      setError("Please select a specific item for this report.");
      return;
    }
    setError("");

    let payload;
    if (reportType === "site") payload = buildSiteReport();
    else if (reportType === "labor") payload = buildLaborReport();
    else payload = buildInventoryReport();

    setReportData(payload);
    setShowViewer(true);
  };

  const scopeLabel =
    reportType === "site"
      ? "site"
      : reportType === "labor"
      ? "labor"
      : "item";

  const generateDisabled = isWorker || (!isAdmin && !isManager);

  const renderScopeSelectOptions = () => {
    if (reportType === "site") {
      return (
        <>
          <option value="all">All sites</option>
          {visibleSites.map((s) => (
            <option key={s._id} value={s._id}>
              {s.siteName || "Unnamed Site"}
            </option>
          ))}
        </>
      );
    }
    if (reportType === "labor") {
      return (
        <>
          <option value="all">All labors</option>
          {visibleLabors.map((lab) => {
            const name =
              lab.name ||
              `${lab.firstName || ""} ${lab.lastName || ""}`.trim() ||
              "Unnamed Labor";
            return (
              <option key={lab._id} value={lab._id}>
                {name}
              </option>
            );
          })}
        </>
      );
    }
    return (
      <>
        <option value="all">All items</option>
        {visibleItems.map((i) => {
          const label =
            i.itemName || i.name || i.title || "Unnamed Item";
          return (
            <option key={i._id} value={i._id}>
              {label}
            </option>
          );
        })}
      </>
    );
  };

  return (
    <div className="report-root">
      <div className="dash-header dash-header-center">
        <h1 className="dash-title">Reports</h1>
      </div>

      <div className="report-card">
        {error && <div className="report-error">{error}</div>}

        {generateDisabled && (
          <div className="report-info">
            You do not have permission to generate reports. Only Admin and site
            Managers can generate reports.
          </div>
        )}

        <div className="report-top-grid">
          <div className="report-section-block">
            <div className="report-section-header">
              <h2>Report type</h2>
              <p className="report-section-intro">
                Generate site, labor or inventory reports.
              </p>
            </div>
            <div className="report-type-grid">
              <button
                type="button"
                className={
                  reportType === "site"
                    ? "report-type-card active"
                    : "report-type-card"
                }
                onClick={() => {
                  setReportType("site");
                  setScope("all");
                  setSelectedId("");
                }}
                disabled={generateDisabled}
              >
                <div className="report-type-label">Site reports</div>
                <div className="report-type-desc">
                  Site progress, timeline and material usage.
                </div>
              </button>

              <button
                type="button"
                className={
                  reportType === "labor"
                    ? "report-type-card active"
                    : "report-type-card"
                }
                onClick={() => {
                  setReportType("labor");
                  setScope("all");
                  setSelectedId("");
                }}
                disabled={generateDisabled}
              >
                <div className="report-type-label">Labor reports</div>
                <div className="report-type-desc">
                  Working hours and attendance by labor.
                </div>
              </button>

              <button
                type="button"
                className={
                  reportType === "inventory"
                    ? "report-type-card active"
                    : "report-type-card"
                }
                onClick={() => {
                  setReportType("inventory");
                  setScope("all");
                  setSelectedId("");
                }}
                disabled={generateDisabled}
              >
                <div className="report-type-label">Inventory reports</div>
                <div className="report-type-desc">
                  Usage and balance of materials.
                </div>
              </button>
            </div>
          </div>

          <div className="report-section-block">
            <div className="report-section-header">
              <h2>Time period</h2>
              <p className="report-section-intro">
                Daily, weekly or monthly summary.
              </p>
            </div>
            <div className="report-period-grid">
              <button
                type="button"
                className={
                  period === "daily"
                    ? "report-period-chip active"
                    : "report-period-chip"
                }
                onClick={() => setPeriod("daily")}
                disabled={generateDisabled}
              >
                Daily
              </button>
              <button
                type="button"
                className={
                  period === "weekly"
                    ? "report-period-chip active"
                    : "report-period-chip"
                }
                onClick={() => setPeriod("weekly")}
                disabled={generateDisabled}
              >
                Weekly
              </button>
              <button
                type="button"
                className={
                  period === "monthly"
                    ? "report-period-chip active"
                    : "report-period-chip"
                }
                onClick={() => setPeriod("monthly")}
                disabled={generateDisabled}
              >
                Monthly
              </button>
            </div>
          </div>
        </div>

        <div className="report-scope-row">
          <div>
            <h2 className="report-scope-title">Scope</h2>
            <p className="report-scope-helper">
              Choose “All” or a specific {scopeLabel} for this report.
            </p>
          </div>
          <div className="report-scope-select-wrap">
            <select
              className="report-scope-select"
              value={scope === "all" ? "all" : selectedId || "all"}
              onChange={(e) => {
                if (e.target.value === "all") {
                  setScope("all");
                  setSelectedId("");
                } else {
                  setScope("single");
                  setSelectedId(e.target.value);
                }
              }}
              disabled={generateDisabled}
            >
              {renderScopeSelectOptions()}
            </select>
          </div>
        </div>

        <div className="report-actions-row">
          <button
            type="button"
            className="report-generate-btn"
            onClick={handleGenerate}
            disabled={generateDisabled}
          >
            Generate report
          </button>
          <p className="report-actions-hint">
            Report will open in a document view. You can print or save as PDF.
          </p>
        </div>
      </div>

      {showViewer && reportData && (
        <ReportViewer data={reportData} onClose={() => setShowViewer(false)} />
      )}
    </div>
  );
}

export default Reports;