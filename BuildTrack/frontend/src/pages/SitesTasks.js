import React, { useState, useEffect } from "react";
import API from "../services/api";
import { getRole, getUserId, getUserName } from "../services/auth";
import "../styles/sitesTasks.css";
import { useLanguage } from "../contexts/LanguageContext";

const BACKEND_HOST = "http://localhost:5000";
const DEFAULT_IMAGE_URL = `${BACKEND_HOST}/uploads/default-site.jpg`;
const COMMENT_MAX = 280;

function SitesTasks() {
  const { t } = useLanguage();
  const [sites, setSites] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);

  const [managers, setManagers] = useState([]);
  const [allWorkers, setAllWorkers] = useState([]);
  const [siteInventory, setSiteInventory] = useState({});
  const [usageInputs, setUsageInputs] = useState({});

  const [formData, setFormData] = useState({
    siteName: "",
    managerId: "",        // "" means Unassign (No manager)
    managerName: "",
    siteImage: null,
    otherDetails: "",
  });

  const [showUpdateModal, setShowUpdateModal] = useState(null);
  const [updateComment, setUpdateComment] = useState("");
  const [showWorkerModal, setShowWorkerModal] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [availableWorkers, setAvailableWorkers] = useState([]);
  const [showManagerModal, setShowManagerModal] = useState(null);
  const [selectedManagerId, setSelectedManagerId] = useState("");

  const [message, setMessage] = useState({ type: "", text: "" });
  const [confirmationData, setConfirmationData] = useState(null);

  const currentUserRole = getRole();
  const currentUserId = getUserId();
  const currentUserName = getUserName();

  const workerCategories = [
    "Mason",
    "Plumber",
    "Electrician",
    "Carpenter",
    "Painter",
    "Welder",
    "Steel Fixer",
    "Supervisor",
    "Helper",
  ];

  const [attendanceInputs, setAttendanceInputs] = useState({});
  const [attendanceLocks, setAttendanceLocks] = useState({});

  const showStatusMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type, text: "" }), 6000);
  };

  useEffect(() => {
    fetchSites();
    if (currentUserRole === "admin" || currentUserRole === "Manager") {
      fetchManagersAndWorkers();
    }
  }, [currentUserRole]);

  const fetchManagersAndWorkers = async () => {
    try {
      const { data } = await API.get("/labors");
      setManagers(
        data.filter(
          (labor) => labor.role === "Manager" || labor.role === "admin"
        )
      );
      setAllWorkers(data.filter((labor) => labor.role === "Worker"));
    } catch {
      showStatusMessage("error", "Failed to fetch manager and worker data.");
    }
  };

  const loadAllSitesInventory = async (sitesList) => {
    try {
      const result = {};
      await Promise.all(
        sitesList.map(async (s) => {
          try {
            const { data } = await API.get(`/sites/inventory/${s._id}`);
            result[s._id] = data;
          } catch {
            result[s._id] = [];
          }
        })
      );
      setSiteInventory(result);
    } catch {
      // ignore
    }
  };

  const fetchSiteInventory = async (siteId) => {
    try {
      const { data } = await API.get(`/sites/inventory/${siteId}`);
      setSiteInventory((prev) => ({ ...prev, [siteId]: data }));
    } catch {
      showStatusMessage("error", "Failed to fetch site inventory.");
    }
  };

  const fetchSites = async () => {
    try {
      const { data } = await API.get("/sites");
      setSites(data);
      loadAllSitesInventory(data);
      await refreshAttendanceLocks(data);
    } catch {
      showStatusMessage("error", "Failed to fetch site data.");
    }
  };

  const isCurrentUserManager = (siteManagerId) =>
    currentUserId && siteManagerId && currentUserId === siteManagerId;

  const isAuthorizedToUpdate = (site) =>
    currentUserRole === "admin" || isCurrentUserManager(site.managerId);

  const isAuthorizedToAssignWorkers = (site) =>
    currentUserRole === "admin" || isCurrentUserManager(site.managerId);

  const isAuthorizedToAssignManager = (site) => currentUserRole === "admin";

  const calculateProgress = (tasks) => {
    if (!tasks || tasks.length === 0) return 0;
    const completed = tasks.filter((t) => t.isCompleted).length;
    return ((completed / tasks.length) * 100).toFixed(0);
  };

  const formatDate = (dateString) =>
    dateString ? new Date(dateString).toLocaleDateString() : "N/A";

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  // Create-form manager select (with "Unassign (No manager)")
  const handleManagerSelect = (e) => {
    const value = e.target.value;
    if (!value) {
      // Unassign
      setFormData((prev) => ({
        ...prev,
        managerId: "",
        managerName: "",
      }));
    } else {
      const selectedManager = managers.find((m) => m._id === value);
      setFormData((prev) => ({
        ...prev,
        managerId: selectedManager ? selectedManager._id : "",
        managerName: selectedManager ? selectedManager.name : "",
      }));
    }
  };

  const handleFileChange = (e) =>
    setFormData({ ...formData, siteImage: e.target.files[0] });

  const handleUsageInputChange = (siteId, inventoryId, value) => {
    setUsageInputs((prev) => ({
      ...prev,
      [siteId]: { ...(prev[siteId] || {}), [inventoryId]: Number(value) },
    }));
  };

  const handleUseAllocatedInventory = async (siteId, inventoryId) => {
    const qty = usageInputs[siteId]?.[inventoryId] || 0;
    if (qty <= 0)
      return showStatusMessage("error", "Enter a positive quantity.");

    try {
      await API.patch(`/sites/inventory-usage/${siteId}`, {
        inventoryId,
        quantityUsed: qty,
      });
      showStatusMessage("success", "Inventory usage recorded.");
      setUsageInputs((prev) => ({
        ...prev,
        [siteId]: { ...(prev[siteId] || {}), [inventoryId]: 0 },
      }));
      fetchSiteInventory(siteId);
      fetchSites();
    } catch (error) {
      showStatusMessage(
        "error",
        `❌ Failed to record usage: ${error.response?.data?.message}`
      );
    }
  };

  // Create site – DO NOT send managerId when unassigned
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (currentUserRole !== "admin")
      return showStatusMessage("error", "❌ Permission Denied.");

    const data = new FormData();
    data.append("siteName", formData.siteName.trim());
    data.append("otherDetails", formData.otherDetails || "");

    if (formData.managerId) {
      data.append("managerId", formData.managerId);
      data.append("managerName", formData.managerName || "");
    }
    if (formData.siteImage) {
      data.append("siteImage", formData.siteImage);
    }

    try {
      await API.post("/sites", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      showStatusMessage("success", "✅ Site added!");
      setFormData({
        siteName: "",
        managerId: "",
        managerName: "",
        siteImage: null,
        otherDetails: "",
      });
      setShowAddForm(false);
      fetchSites();
      fetchManagersAndWorkers();
    } catch (error) {
      showStatusMessage(
        "error",
        `❌ Failed to add site: ${
          error.response?.data?.message || "Server error"
        }`
      );
    }
  };

  const openWorkerModal = (site) => {
    if (!isAuthorizedToAssignWorkers(site))
      return showStatusMessage("error", "❌ Not authorized.");
    setShowWorkerModal(site);
    setSelectedCategory("");
    setAvailableWorkers([]);
  };

  const handleCategoryChange = (e) => {
    const category = e.target.value;
    setSelectedCategory(category);
    if (category) {
      const available = allWorkers.filter(
        (w) => w.category === category && (!w.sites || w.sites.length === 0)
      );
      setAvailableWorkers(available);
    } else {
      setAvailableWorkers([]);
    }
  };

  const handleAssignWorker = async (workerId, workerName) => {
    try {
      await API.patch(`/labors/${workerId}`, { site: showWorkerModal.siteName });
      showStatusMessage("success", `✅ ${workerName} assigned!`);
      fetchSites();
      fetchManagersAndWorkers();
      setShowWorkerModal(null);
    } catch (error) {
      showStatusMessage(
        "error",
        `❌ Failed to assign: ${error.response?.data?.message}`
      );
    }
  };

  const initiateReleaseWorker = (workerId, workerName, siteName) => {
    setConfirmationData({ type: "releaseWorker", workerId, workerName, siteName });
  };

  const executeReleaseWorker = async () => {
    const { workerId, workerName } = confirmationData;
    try {
      await API.patch(`/labors/${workerId}`, { site: null });
      showStatusMessage("success", `✅ ${workerName} released!`);
      fetchSites();
      fetchManagersAndWorkers();
      setShowWorkerModal(null);
    } catch (error) {
      showStatusMessage(
        "error",
        `❌ Failed to release: ${error.response?.data?.message}`
      );
    } finally {
      setConfirmationData(null);
    }
  };

  const openManagerModal = (site) => {
    if (!isAuthorizedToAssignManager(site))
      return showStatusMessage("error", "❌ Not authorized.");
    setShowManagerModal(site);
    setSelectedManagerId(site.managerId || "");
  };

  // Save in manager modal – if Unassign selected, use existing release flow
  const handleAssignManager = async () => {
    if (!selectedManagerId) {
      // Unassign
      initiateReleaseManager(showManagerModal._id, showManagerModal.siteName);
      return;
    }

    const manager = managers.find((m) => m._id === selectedManagerId);
    if (!manager) return showStatusMessage("error", "Manager not found.");

    const siteId = showManagerModal._id;
    const oldManagerId = showManagerModal.managerId;
    const siteName = showManagerModal.siteName;

    try {
      if (oldManagerId) {
        await API.patch(`/labors/manager-site/${oldManagerId}`, {
          siteName,
          action: "deassign",
        }).catch(console.error);
      }

      await API.patch(`/labors/manager-site/${manager._id}`, {
        siteName,
        action: "assign",
      });

      await API.patch(`/sites/${siteId}`, {
        managerId: manager._id,
        managerName: manager.name,
      });

      showStatusMessage("success", `✅ Manager assigned to ${siteName}.`);
      setShowManagerModal(null);
      fetchSites();
      fetchManagersAndWorkers();
    } catch (error) {
      showStatusMessage(
        "error",
        `❌ Failed to assign manager: ${error.response?.data?.message}`
      );
    }
  };

  const initiateReleaseManager = (siteId, siteName) => {
    if (currentUserRole !== "admin")
      return showStatusMessage(
        "error",
        "❌ Only Admin can release managers."
      );
    setConfirmationData({ type: "releaseManager", id: siteId, siteName });
  };

  const executeReleaseManager = async () => {
    const { id: siteId } = confirmationData;
    try {
      await API.patch(`/sites/manager-release/${siteId}`);
      setShowManagerModal(null);
      setShowUpdateModal(null);
      fetchSites();
      fetchManagersAndWorkers();
      showStatusMessage("success", "Manager released.");
    } catch (error) {
      showStatusMessage(
        "error",
        `❌ Failed: ${error.response?.data?.message}`
      );
    } finally {
      setConfirmationData(null);
    }
  };

  const handleTaskToggle = async (siteId, taskId, isCompleted, siteManagerId) => {
    if (!isAuthorizedToUpdate({ _id: siteId, managerId: siteManagerId }))
      return showStatusMessage("error", "❌ Not authorized.");

    try {
      await API.patch(`/sites/${siteId}`, {
        taskId,
        isCompleted: !isCompleted,
      });
      fetchSites();
    } catch (error) {
      showStatusMessage(
        "error",
        `❌ Failed to update task: ${error.response?.data?.message}`
      );
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    const siteId = showUpdateModal._id;

    if (!isAuthorizedToUpdate(showUpdateModal) || !updateComment.trim())
      return showStatusMessage("error", "❌ Invalid comment.");

    if (updateComment.length > COMMENT_MAX) {
      return showStatusMessage(
        "error",
        `Comment exceeds ${COMMENT_MAX} characters.`
      );
    }

    try {
      await API.patch(`/sites/${siteId}`, {
        comment: updateComment.trim(),
      });
      setUpdateComment("");
      setShowUpdateModal(null);
      fetchSites();
      showStatusMessage("success", "✅ Comment added.");
    } catch (error) {
      showStatusMessage("error", `❌ Failed: ${error.response?.data?.message}`);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!isAuthorizedToUpdate(showUpdateModal))
      return showStatusMessage("error", "❌ Not authorized.");
    const siteId = showUpdateModal._id;

    try {
      await API.patch(`/sites/status/${siteId}`, { status: newStatus });
      showStatusMessage("success", `✅ Status updated.`);
      setShowUpdateModal(null);
      fetchSites();
    } catch (error) {
      showStatusMessage(
        "error",
        `❌ Failed: ${error.response?.data?.message}`
      );
    }
  };

  const initiateDeleteSite = (siteId, siteName) => {
    if (currentUserRole !== "admin")
      return showStatusMessage(
        "error",
        "❌ Only Admin can delete sites."
      );
    setConfirmationData({ type: "deleteSite", id: siteId, siteName });
  };

  const executeDeleteSite = async () => {
    const { id: siteId, siteName } = confirmationData;
    try {
      await API.delete(`/sites/${siteId}`);
      showStatusMessage("success", `✅ Site "${siteName}" deleted.`);
      fetchSites();
      fetchManagersAndWorkers();
    } catch (error) {
      showStatusMessage(
        "error",
        `❌ Failed to delete: ${error.response?.data?.message}`
      );
    } finally {
      setConfirmationData(null);
    }
  };

  const handleAttendanceInputChange = (workerId, siteName, field, value) => {
    setAttendanceInputs((prev) => ({
      ...prev,
      [workerId]: {
        ...(prev[workerId] || {}),
        [siteName]: {
          ...(prev[workerId]?.[siteName] || { hours: "", present: true }),
          [field]: field === "hours" ? value : value,
        },
      },
    }));
  };

  const handleSaveAttendance = async (worker, siteName) => {
    const workerId = worker._id;
    const site = sites.find((s) => s.siteName === siteName);

    if (!site || !isAuthorizedToUpdate(site)) {
      return showStatusMessage(
        "error",
        "❌ Only the assigned manager or admin can update work hours."
      );
    }

    const entry = attendanceInputs[workerId]?.[siteName] || {};
    const hours = Number(entry.hours || 0);
    const present = entry.present !== false;

    if (!present || hours <= 0) {
      return showStatusMessage(
        "error",
        "Enter positive hours and mark worker as present."
      );
    }

    try {
      await API.post(`/labors/${workerId}/attendance`, {
        siteName,
        date: new Date().toISOString(),
        hoursWorked: hours,
      });
      showStatusMessage(
        "success",
        `✅ Attendance saved for ${worker.name} at ${siteName}.`
      );

      setAttendanceLocks((prev) => ({
        ...prev,
        [workerId]: {
          ...(prev[workerId] || {}),
          [siteName]: true,
        },
      }));

      setAttendanceInputs((prev) => ({
        ...prev,
        [workerId]: {
          ...(prev[workerId] || {}),
          [siteName]: { hours: "", present: true },
        },
      }));
    } catch (error) {
      showStatusMessage(
        "error",
        `❌ Failed to save attendance: ${error.response?.data?.message}`
      );
    }
  };

  const refreshAttendanceLocks = async (sitesList) => {
    try {
      const workers = allWorkers;
      const locks = {};

      await Promise.all(
        workers.map(async (w) => {
          try {
            const { data } = await API.get(
              `/labors/${w._id}/attendance-summary?months=3`
            );
            const workerLocks = {};
            if (data.hasTodayRecord) {
              sitesList.forEach((site) => {
                if (
                  site.team &&
                  site.team.some((member) => member._id === w._id)
                ) {
                  workerLocks[site.siteName] = true;
                }
              });
            }
            locks[w._id] = workerLocks;
          } catch {
            locks[w._id] = {};
          }
        })
      );

      setAttendanceLocks(locks);
    } catch {
      // ignore
    }
  };

  const renderAllocatedInventorySection = (site) => {
    const allocations = siteInventory[site._id] || [];
    const canUse = isAuthorizedToUpdate(site);

    if (!allocations.length) {
      return <p className="no-allocated-message">No inventory allocated yet.</p>;
    }

    return (
      <div className="allocated-inventory-section">
        <h4>Allocated Inventory</h4>
        <div className="inventory-card">
          <div className="inventory-header">
            <span>Item</span>
            <span>Allocated</span>
            <span>Used</span>
            <span>Left</span>
            <span>Action</span>
          </div>
          <div className="inventory-body">
            {allocations.map((alloc) => {
              const left = alloc.allocatedQuantity - alloc.usedQuantity;
              return (
                <div className="inventory-row" key={alloc._id}>
                  <span className="inv-item">
                    <span className="inv-name">{alloc.itemName}</span>
                    <span className="inv-unit">{alloc.unit}</span>
                  </span>
                  <span>{alloc.allocatedQuantity}</span>
                  <span>{alloc.usedQuantity}</span>
                  <span className={left === 0 ? "inv-zero" : ""}>{left}</span>
                  <span className="inv-actions">
                    {canUse ? (
                      <>
                        <input
                          type="number"
                          min="0"
                          value={
                            usageInputs[site._id]?.[alloc.inventoryItem] || ""
                          }
                          onChange={(e) =>
                            handleUsageInputChange(
                              site._id,
                              alloc.inventoryItem,
                              e.target.value
                            )
                          }
                        />
                        <button
                          type="button"
                          onClick={() =>
                            handleUseAllocatedInventory(
                              site._id,
                              alloc.inventoryItem
                            )
                          }
                        >
                          Use
                        </button>
                      </>
                    ) : (
                      <span className="inv-tag-view">View only</span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="sites-page">
      <h1>{t("Sites & Tasks") || "Sites & Tasks"}</h1>

      {message.text && (
        <div
          className={`status-box ${
            message.type === "success"
              ? "status-box-success"
              : message.type === "error"
              ? "status-box-error"
              : ""
          }`}
        >
          {message.text}
        </div>
      )}

      {currentUserRole === "admin" && (
        <button
          className="btn-toggle-form"
          onClick={() => setShowAddForm((prev) => !prev)}
        >
          {showAddForm ? "Hide Add Site Form" : "Add New Site"}
        </button>
      )}

      {showAddForm && currentUserRole === "admin" && (
        <form className="site-add-form" onSubmit={handleAddSubmit}>
          <h2>Add New Site</h2>
          <input
            type="text"
            name="siteName"
            placeholder="Site Name"
            value={formData.siteName}
            onChange={handleChange}
            required
          />
          <select
            name="managerId"
            value={formData.managerId}
            onChange={handleManagerSelect}
          >
            <option value="">
              Unassign (No manager)
            </option>
            {managers.map((m) => (
              <option key={m._id} value={m._id}>
                {m.name} ({m.role})
              </option>
            ))}
          </select>
          <textarea
            name="otherDetails"
            placeholder="Other details"
            value={formData.otherDetails}
            onChange={handleChange}
          />
          <input type="file" accept="image/*" onChange={handleFileChange} />
          <button type="submit">Save Site</button>
        </form>
      )}

      <div className="site-list">
        <h2>All Sites</h2>
        <div className="site-grid">
          {sites.map((site) => {
            const progress = calculateProgress(site.tasks || []);
            const latestUpdate =
              site.updates && site.updates.length > 0
                ? site.updates[site.updates.length - 1]
                : null;

            const canUpdate = isAuthorizedToUpdate(site);

            return (
              <div
                className={`site-card status-${(site.status || "planned")
                  .toLowerCase()
                  .replace(/\s+/g, "")}`}
                key={site._id}
              >
                <img
                  src={
                    site.siteImage
                      ? `${BACKEND_HOST}${site.siteImage}`
                      : DEFAULT_IMAGE_URL
                  }
                  alt={site.siteName}
                  className="site-image"
                />
                <div className="card-content">
                  <h3>
                    {site.siteName}
                    {site.status && (
                      <span
                        className={`status-badge status-${site.status
                          .toLowerCase()
                          .replace(/\s+/g, "")}`}
                      >
                        {site.status}
                      </span>
                    )}
                  </h3>

                  <p>
                    <strong>Manager:</strong> {site.managerName || "Unassigned"}
                  </p>
                  <p>
                    <strong>Current Step:</strong> {site.currentStatus}
                  </p>
                  <p>
                    <strong>Progress:</strong> {progress}%
                  </p>
                  {site.startDate && (
                    <p>
                      <strong>Start Date:</strong> {formatDate(site.startDate)}
                    </p>
                  )}
                  {site.endDate && (
                    <p>
                      <strong>End Date:</strong> {formatDate(site.endDate)}
                    </p>
                  )}

                  {latestUpdate && (
                    <div className="latest-update">
                      <strong>{latestUpdate.userName}</strong>
                      <span>{latestUpdate.comment}</span>
                      <small>
                        {new Date(
                          latestUpdate.createdAt || latestUpdate.date
                        ).toLocaleString()}
                      </small>
                    </div>
                  )}

                  <div className="team-list">
                    <p className="team-header">Team</p>
                    {site.team && site.team.length > 0 ? (
                      <ul>
                        {site.team.map((member) => {
                          const att =
                            attendanceInputs[member._id]?.[site.siteName] || {};
                          const locked =
                            attendanceLocks[member._id]?.[site.siteName] ||
                            false;

                          return (
                            <li
                              key={member._id}
                              className="team-role-worker site-worker-row"
                            >
                              <span className="site-worker-name">
                                {member.name} ({member.category || "Worker"})
                              </span>
                              {canUpdate && (
                                <>
                                  <input
                                    type="number"
                                    min="0"
                                    className="site-worker-hours-input"
                                    placeholder="Hours"
                                    value={att.hours || ""}
                                    disabled={locked}
                                    onChange={(e) =>
                                      handleAttendanceInputChange(
                                        member._id,
                                        site.siteName,
                                        "hours",
                                        e.target.value
                                      )
                                    }
                                  />
                                  <label className="site-worker-present-label">
                                    <input
                                      type="checkbox"
                                      checked={att.present !== false}
                                      disabled={locked}
                                      onChange={(e) =>
                                        handleAttendanceInputChange(
                                          member._id,
                                          site.siteName,
                                          "present",
                                          e.target.checked
                                        )
                                      }
                                    />
                                    Present
                                  </label>
                                  <button
                                    type="button"
                                    className="site-worker-save-btn"
                                    disabled={locked}
                                    onClick={() =>
                                      handleSaveAttendance(
                                        member,
                                        site.siteName
                                      )
                                    }
                                  >
                                    {locked ? "Saved" : "Save"}
                                  </button>
                                </>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="unassigned-message">
                        No workers assigned.
                      </p>
                    )}
                  </div>

                  {renderAllocatedInventorySection(site)}
                </div>

                <div className="site-actions">
                  {canUpdate ? (
                    <>
                      <button
                        type="button"
                        className="btn-assign-worker"
                        onClick={() => openWorkerModal(site)}
                      >
                        <span className="btn-icon-span">👷‍♂️</span>
                        Assign Workers
                      </button>
                      <button
                        type="button"
                        className="btn-assign-manager"
                        onClick={() => openManagerModal(site)}
                      >
                        <span className="btn-icon-span">👨‍💼</span>
                        Assign Manager
                      </button>
                      <button
                        type="button"
                        className="btn-update-progress"
                        onClick={() => setShowUpdateModal(site)}
                      >
                        <span className="btn-icon-span">📋</span>
                        Update / Comment
                      </button>
                      {currentUserRole === "admin" && (
                        <button
                          type="button"
                          className="btn-delete"
                          onClick={() =>
                            initiateDeleteSite(site._id, site.siteName)
                          }
                        >
                          <span className="btn-icon-span">🗑️</span>
                          Delete
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="view-only-tag">
                      View Only Mode – You are not the manager/admin.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showWorkerModal && (
        <div className="modal-overlay">
          <div className="worker-assignment-modal">
            <h3>Assign Workers to {showWorkerModal.siteName}</h3>

            <select
              className="select-category"
              value={selectedCategory}
              onChange={handleCategoryChange}
            >
              <option value="">Select Category</option>
              {workerCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            <div className="available-worker-list">
              {selectedCategory && availableWorkers.length === 0 && (
                <p className="no-workers-msg">
                  No unassigned workers for this category.
                </p>
              )}
              {!selectedCategory && (
                <p className="no-workers-msg">Select a category.</p>
              )}
              {availableWorkers.map((worker) => (
                <div key={worker._id} className="available-worker-item">
                  <span>
                    {worker.name} ({worker.category})
                  </span>
                  <button
                    type="button"
                    className="btn-assign"
                    onClick={() =>
                      handleAssignWorker(worker._id, worker.name)
                    }
                  >
                    Assign
                  </button>
                </div>
              ))}
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setShowWorkerModal(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showManagerModal && (
        <div className="modal-overlay">
          <div className="manager-assignment-modal">
            <h3>Assign / Change Manager</h3>
            <div className="current-manager-block">
              <strong>Current:</strong>{" "}
              {showManagerModal.managerName || "Unassigned"}
            </div>
            <select
              className="select-manager"
              value={selectedManagerId}
              onChange={(e) => setSelectedManagerId(e.target.value)}
            >
              <option value="">
                Unassign (No manager)
              </option>
              {managers.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.name} ({m.role})
                </option>
              ))}
            </select>
            <div className="modal-actions">
              {showManagerModal.managerId && (
                <button
                  type="button"
                  className="btn-release-manager"
                  onClick={() =>
                    initiateReleaseManager(
                      showManagerModal._id,
                      showManagerModal.siteName
                    )
                  }
                >
                  Release Manager
                </button>
              )}
              <button
                type="button"
                className="btn-action"
                onClick={handleAssignManager}
              >
                Save
              </button>
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setShowManagerModal(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showUpdateModal && (
        <div className="modal-overlay">
          <div className="site-update-modal">
            <h3>Update {showUpdateModal.siteName}</h3>

            <div className="admin-controls-group">
              <h4>Admin Controls</h4>
              <div className="control-item">
                <label>Status</label>
                <select
                  value={showUpdateModal.status || "Planned"}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  disabled={!isAuthorizedToUpdate(showUpdateModal)}
                >
                  <option value="Planned">Planned</option>
                  <option value="Active">Active</option>
                  <option value="On Hold">On Hold</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
            </div>

            <div className="task-list">
              {(showUpdateModal.tasks || []).map((task) => (
                <div
                  key={task._id}
                  className={`task-item ${
                    task.isCompleted ? "completed" : ""
                  }`}
                >
                  <label>
                    <input
                      type="checkbox"
                      checked={!!task.isCompleted}
                      disabled={!isAuthorizedToUpdate(showUpdateModal)}
                      onChange={() =>
                        handleTaskToggle(
                          showUpdateModal._id,
                          task._id,
                          task.isCompleted,
                          showUpdateModal.managerId
                        )
                      }
                    />
                    {task.name}
                  </label>
                </div>
              ))}
            </div>

            <form onSubmit={handleCommentSubmit}>
              <div className="comment-section">
                <p className="comment-helper">
                  Add a brief update comment (max {COMMENT_MAX} characters).
                </p>
                <textarea
                  value={updateComment}
                  onChange={(e) => setUpdateComment(e.target.value)}
                  maxLength={COMMENT_MAX}
                  placeholder="Type your update here..."
                />
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn-action">
                  Save Comment
                </button>
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowUpdateModal(null)}
                >
                  Close
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmationData && (
        <div className="confirmation-overlay">
          <div className="confirmation-modal">
            <h3>Confirm Action</h3>
            <p>
              {confirmationData.type === "deleteSite" &&
                `Are you sure you want to delete site "${confirmationData.siteName}"?`}
              {confirmationData.type === "releaseManager" &&
                `Release manager from site "${confirmationData.siteName}"?`}
              {confirmationData.type === "releaseWorker" &&
                `Release worker ${confirmationData.workerName} from site "${confirmationData.siteName}"?`}
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn-delete"
                onClick={() => {
                  if (confirmationData.type === "deleteSite") {
                    executeDeleteSite();
                  } else if (
                    confirmationData.type === "releaseManager"
                  ) {
                    executeReleaseManager();
                  } else if (
                    confirmationData.type === "releaseWorker"
                  ) {
                    executeReleaseWorker();
                  }
                }}
              >
                Confirm
              </button>
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setConfirmationData(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SitesTasks;