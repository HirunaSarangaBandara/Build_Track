import React from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import "../styles/reportViewer.css";

const fmtDate = (d) => {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString();
  } catch {
    return "";
  }
};

const fmtDateTime = (d) => {
  if (!d) return "";
  try {
    return new Date(d).toLocaleString();
  } catch {
    return "";
  }
};

function ReportViewer({ data, onClose }) {
  if (!data) return null;

  const { type, period, dateRange, scope } = data;
  const generatedAt = new Date();

  const title =
    type === "site"
      ? "Site report"
      : type === "labor"
      ? "Labor report"
      : "Inventory report";

  const periodLabel =
    period === "daily"
      ? "Daily"
      : period === "weekly"
      ? "Weekly"
      : "Monthly";

  const handlePrint = () => {
    window.print();
  };

  // A4, margins, extra gap between logical pages
  const handleDownloadPdf = async () => {
    const reportEl = document.querySelector(".report-page");
    if (!reportEl) return;

    reportEl.scrollTop = 0;

    const canvas = await html2canvas(reportEl, {
      scale: 2,
      useCORS: true,
      scrollY: -window.scrollY,
    });

    const imgData = canvas.toDataURL("image/png");

    // A4 portrait
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();   // ~210
    const pageHeight = pdf.internal.pageSize.getHeight(); // ~297

    const margin = 12;           // outer margin
    const pageGap = 10;          // visual gap between logical pages
    const usableWidth = pageWidth - margin * 2;
    const usableHeight = pageHeight - margin * 2 - pageGap;

    const imgWidth = usableWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let offsetY = margin;

    // first page
    pdf.addImage(imgData, "PNG", margin, offsetY, imgWidth, imgHeight);
    heightLeft -= usableHeight;

    // additional pages; pageGap keeps cuts away from card borders
    while (heightLeft > 0) {
      pdf.addPage();
      offsetY = margin - (imgHeight - heightLeft) + pageGap / 2;
      pdf.addImage(imgData, "PNG", margin, offsetY, imgWidth, imgHeight);
      heightLeft -= usableHeight;
    }

    pdf.save(`${title.replace(/\s+/g, "_")}.pdf`);
  };

  const renderSites = () =>
    data.sites.map((site, index) => (
      <section key={site.siteId || index} className="report-section">
        <h3 className="report-section-title">{site.siteName}</h3>

        <div className="section-card">
          <h4>Site status</h4>
          <div className="inventory-grid">
            <div className="inventory-item">
              <span className="label">Status</span>
              <span className="value">{site.status}</span>
            </div>
            <div className="inventory-item">
              <span className="label">Site manager</span>
              <span className="value">{site.managerName}</span>
            </div>
            <div className="inventory-item">
              <span className="label">Tasks</span>
              <span className="value">
                {site.completedTasks} / {site.totalTasks}
              </span>
            </div>
            <div className="inventory-item">
              <span className="label">Progress</span>
              <span className="value">{site.progress}%</span>
            </div>
          </div>
        </div>

        <div className="section-card">
          <h4>Project progress</h4>
          <div className="progress-grid">
            <div className="progress-item">
              <span className="label">Overall progress</span>
              <div className="progress-bar-container">
                <div
                  className="progress-bar"
                  style={{ width: `${site.progress || 0}%` }}
                />
              </div>
              <span className="percentage">{site.progress || 0}%</span>
            </div>
          </div>
        </div>

        <div className="section-card">
          <h4>Timeline</h4>
          {site.timeline && site.timeline.length > 0 ? (
            <ul className="timeline-list">
              {site.timeline.map((task, i) => (
                <li key={task.id || i} className="timeline-item">
                  <div className="timeline-dot-col">
                    <span
                      className={
                        "timeline-dot " +
                        (task.status &&
                        task.status.toLowerCase() === "completed"
                          ? "completed"
                          : "pending")
                      }
                    />
                    <span className="timeline-line" />
                  </div>
                  <div className="timeline-content">
                    <div className="timeline-header-row">
                      <span className="timeline-title">{task.name}</span>
                      <span className="timeline-status-text">
                        {task.status || "Unknown"}
                      </span>
                    </div>
                    <p className="timeline-meta">
                      {task.startDate && (
                        <>
                          Start: {fmtDate(task.startDate)}{" "}
                        </>
                      )}
                      {task.endDate && <>| End: {fmtDate(task.endDate)}</>}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="report-empty">No tasks in this period.</p>
          )}
        </div>

        <div className="section-card">
          <h4>Material usage</h4>
          {site.materialUsage && site.materialUsage.length > 0 ? (
            <table className="report-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Allocated</th>
                  <th>Used</th>
                  <th>Remaining</th>
                  <th>Usage %</th>
                </tr>
              </thead>
              <tbody>
                {site.materialUsage.map((m, i) => {
                  const totalAllocated = m.allocated || 0;
                  const totalUsed = m.used || 0;
                  const remaining = totalAllocated - totalUsed;
                  const usagePercent =
                    totalAllocated > 0
                      ? ((totalUsed / totalAllocated) * 100).toFixed(1)
                      : 0;
                  return (
                    <tr key={m.itemId || i}>
                      <td>{m.itemName}</td>
                      <td>
                        {totalAllocated} {m.unit}
                      </td>
                      <td>
                        {totalUsed} {m.unit}
                      </td>
                      <td>
                        {remaining} {m.unit}
                      </td>
                      <td>{usagePercent}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="report-empty">No material allocations found.</p>
          )}
        </div>
      </section>
    ));

  const renderLabors = () =>
    data.labors.map((lab, index) => (
      <section key={lab.laborId || index} className="report-section">
        <h3 className="report-section-title">{lab.name}</h3>

        <div className="section-card">
          <h4>Attendance summary</h4>
          <div className="attendance-grid">
            <div className="stat-box">
              <span className="stat-label">Total days</span>
              <span className="stat-value">{lab.totalDays}</span>
            </div>
            <div className="stat-box">
              <span className="stat-label">Present</span>
              <span className="stat-value present">
                {lab.presentDays}
              </span>
            </div>
            <div className="stat-box">
              <span className="stat-label">Absent</span>
              <span className="stat-value absent">
                {lab.absentDays}
              </span>
            </div>
            <div className="stat-box">
              <span className="stat-label">Attendance %</span>
              <span className="stat-value">{lab.attendancePercent}%</span>
            </div>
          </div>
        </div>

        <div className="section-card">
          <h4>Working hours</h4>
          <div className="info-row">
            <span className="label">Total hours</span>
            <span className="value">{lab.totalHours} hrs</span>
          </div>
          <div className="info-row">
            <span className="label">Average per day</span>
            <span className="value">{lab.avgHoursPerDay} hrs</span>
          </div>
        </div>

        <div className="section-card">
          <h4>Sites assigned</h4>
          {lab.sites && lab.sites.length > 0 ? (
            <div className="sites-badge-row">
              {lab.sites.map((s, i) => (
                <span key={i} className="site-pill">
                  {s.siteName || s}
                </span>
              ))}
            </div>
          ) : (
            <p className="report-empty">No sites assigned in this period.</p>
          )}
        </div>

        <div className="section-card">
          <h4>Attendance details</h4>
          {lab.details && lab.details.length > 0 ? (
            <table className="report-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Hours worked</th>
                </tr>
              </thead>
              <tbody>
                {lab.details.map((r, i) => (
                  <tr key={i}>
                    <td>{fmtDate(r.date)}</td>
                    <td>{r.status || r.attendanceStatus}</td>
                    <td>{r.hoursWorked || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="report-empty">
              No attendance records for this period.
            </p>
          )}
        </div>
      </section>
    ));

  const renderItems = () =>
    data.items.map((item, index) => {
      const totalAllocated = item.totalAllocated || 0;
      const totalUsed = item.totalUsed || 0;
      const usagePercent =
        totalAllocated > 0
          ? ((totalUsed / totalAllocated) * 100).toFixed(1)
          : 0;

      return (
        <section key={item.itemId || index} className="report-section">
          <h3 className="report-section-title">{item.itemName}</h3>

          <div className="section-card">
            <h4>Inventory status</h4>
            <div className="inventory-grid">
              <div className="inventory-item">
                <span className="label">Category</span>
                <span className="value">{item.category}</span>
              </div>
              <div className="inventory-item">
                <span className="label">Unit</span>
                <span className="value">{item.unit}</span>
              </div>
              <div className="inventory-item">
                <span className="label">Warehouse quantity</span>
                <span className="value">{item.warehouseQuantity}</span>
              </div>
              <div className="inventory-item">
                <span className="label">Available</span>
                <span className="value">{item.available}</span>
              </div>
            </div>
          </div>

          <div className="section-card">
            <h4>Usage</h4>
            <div className="usage-grid">
              <div className="usage-card">
                <span className="label">Total allocated</span>
                <span className="value">{totalAllocated}</span>
              </div>
              <div className="usage-card">
                <span className="label">Total used</span>
                <span className="value">{totalUsed}</span>
              </div>
              <div className="usage-card">
                <span className="label">Usage %</span>
                <span className="value highlight">{usagePercent}%</span>
              </div>
            </div>
          </div>

          <div className="section-card">
            <h4>Site‑wise allocations</h4>
            {item.allocations && item.allocations.length > 0 ? (
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Site</th>
                    <th>Allocated</th>
                    <th>Used</th>
                    <th>Remaining</th>
                  </tr>
                </thead>
                <tbody>
                  {item.allocations.map((a, i) => {
                    const allocated = a.allocated || 0;
                    const used = a.used || 0;
                    const remaining = allocated - used;
                    return (
                      <tr key={i}>
                        <td>{a.siteName}</td>
                        <td>{allocated}</td>
                        <td>{used}</td>
                        <td>{remaining}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <p className="report-empty">No allocations for this item.</p>
            )}
          </div>
        </section>
      );
    });

  return (
    <div className="report-viewer-overlay">
      {/* OUTER SHELL – toolbar only */}
      <div className="report-shell">
        <div className="report-shell-header">
          <h2 className="report-shell-title">{title}</h2>
          <div className="report-shell-buttons">
            <button
              type="button"
              className="toolbar-btn print"
              onClick={handlePrint}
            >
              🖨️ Print
            </button>
            <button
              type="button"
              className="toolbar-btn download"
              onClick={handleDownloadPdf}
            >
              ⬇️ Download PDF
            </button>
            <button
              type="button"
              className="toolbar-btn close"
              onClick={onClose}
            >
              ✕
            </button>
          </div>
        </div>

        {/* INNER SCROLLABLE, PRINTABLE CARD */}
        <div className="report-shell-body">
          <article className="report-page">
            <header className="report-header-row">
              <div className="report-logo-block">
                <h1>BuildTrack</h1>
                <p>Construction Management System</p>
              </div>
              <div className="report-title-block">
                <h2>{title}</h2>
                <p className="report-subtitle">
                  {periodLabel} report ({scope === "all" ? "All" : "Single"})
                </p>
              </div>
            </header>

            <section className="report-meta-row">
              <div className="meta-item">
                <span className="label">Period</span>
                <span className="value">{periodLabel}</span>
              </div>
              <div className="meta-item">
                <span className="label">Date range</span>
                <span className="value">
                  {fmtDate(dateRange.startDate)} –{" "}
                  {fmtDate(dateRange.endDate)}
                </span>
              </div>
              <div className="meta-item">
                <span className="label">Generated</span>
                <span className="value">{fmtDateTime(generatedAt)}</span>
              </div>
            </section>

            <main className="report-body">
              {type === "site" && renderSites()}
              {type === "labor" && renderLabors()}
              {type === "inventory" && renderItems()}
            </main>

            <footer className="report-footer">
              <p>© {new Date().getFullYear()} BuildTrack. All rights reserved.</p>
            </footer>
          </article>
        </div>
      </div>
    </div>
  );
}

export default ReportViewer;