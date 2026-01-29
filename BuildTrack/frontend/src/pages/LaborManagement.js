import React, { useState, useEffect, useCallback, memo } from "react";
import API from "../services/api";
import "../styles/laborManagement.css";
import { getRole } from "../services/auth";
import { useLanguage } from "../contexts/LanguageContext";

const LaborManagement = memo(() => {
  const { t } = useLanguage();

  const [labors, setLabors] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "",
    category: "",
    contact: "",
  });

  const currentUserRole = getRole();
  const [showAddForm, setShowAddForm] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [modalData, setModalData] = useState(null);

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

  const [attendanceSummary, setAttendanceSummary] = useState({});

  const showStatusMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type, text: "" }), 6000);
  };

  const fetchLabors = useCallback(async () => {
    try {
      const { data } = await API.get("/labors");
      setLabors(data);

      const workers = data.filter((l) => l.role === "Worker");
      const summaries = {};

      await Promise.all(
        workers.map(async (w) => {
          try {
            const { data: s } = await API.get(
              `/labors/${w._id}/attendance-summary?months=3`
            );
            summaries[w._id] = s;
          } catch {
            summaries[w._id] = { summary: [], hasTodayRecord: false };
          }
        })
      );

      setAttendanceSummary(summaries);
    } catch (error) {
      console.error("Error fetching labors:", error);
      showStatusMessage("error", "Failed to load labor data.");
    }
  }, []);

  useEffect(() => {
    fetchLabors();
  }, [fetchLabors]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let newFormData = { ...formData, [name]: value };
    if (name === "role") newFormData.category = "";
    setFormData(newFormData);
  };

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (currentUserRole !== "admin") {
        showStatusMessage(
          "error",
          "❌ Permission Denied: Only administrators can add new users."
        );
        return;
      }
      try {
        await API.post("/labors", formData);
        setFormData({
          name: "",
          email: "",
          role: "",
          category: "",
          contact: "",
        });
        await fetchLabors();
        showStatusMessage(
          "success",
          "✅ User added successfully! Credentials usually sent to email."
        );
        setShowAddForm(false);
      } catch (error) {
        const msg = error.response?.data?.message || error.message;
        console.error("Error adding labor:", msg);
        if (
          msg.includes("E11000 duplicate key error") ||
          msg.includes("duplicate key error")
        ) {
          showStatusMessage(
            "error",
            "❌ Failed: The username or email is already taken."
          );
        } else {
          showStatusMessage("error", `❌ Failed to add user: ${msg}`);
        }
      }
    },
    [currentUserRole, formData, fetchLabors]
  );

  const initiateDeleteLabor = useCallback(
    (labor) => {
      if (currentUserRole !== "admin") {
        showStatusMessage(
          "error",
          "❌ Permission Denied: Only administrators can delete users."
        );
        return;
      }
      setModalData({ type: "delete", labor });
    },
    [currentUserRole]
  );

  const executeDeleteLabor = useCallback(async () => {
    if (!modalData || modalData.type !== "delete") return;
    const { _id: id, name } = modalData.labor;
    setModalData(null);
    try {
      await API.delete(`/labors/${id}`);
      showStatusMessage("success", `🗑️ User ${name} deleted successfully.`);
      await fetchLabors();
    } catch (error) {
      const msg = error.response?.data?.message || error.message;
      console.error("Error deleting labor:", msg);
      showStatusMessage("error", `❌ Failed to delete user: ${msg}`);
    }
  }, [modalData, fetchLabors]);

  const initiateViewLabor = useCallback((labor) => {
    setModalData({ type: "view", labor });
  }, []);

  const renderModal = () => {
    if (!modalData) return null;
    const { type, labor } = modalData;
    const currentSites = labor.sites || [];
    const siteDisplay =
      labor.role === "Worker"
        ? currentSites[0] || "Unassigned"
        : currentSites.length > 0
        ? currentSites.join(", ")
        : "Unassigned";
    const siteLabel = labor.role === "Worker" ? "Current Site" : "Managed Sites";

    const att = attendanceSummary[labor._id] || {
      summary: [],
      hasTodayRecord: false,
    };

    if (type === "delete") {
      return (
        <div className="confirmation-overlay">
          <div className="confirmation-modal">
            <h3>Confirm Delete</h3>
            <p>
              Are you sure you want to permanently delete{" "}
              <strong>{labor.name}</strong>?
            </p>
            <div className="labor-details-view">
              <p>
                <strong>Role:</strong> {labor.role}
              </p>
              <p>
                <strong>Category:</strong> {labor.category || "N/A"}
              </p>
              <p>
                <strong>Email:</strong> {labor.email}
              </p>
              <p>
                <strong>Contact:</strong> {labor.contact}
              </p>
              <p>
                <strong>{siteLabel}:</strong> {siteDisplay}
              </p>
            </div>
            <div className="modal-actions">
              <button
                className="delete-btn"
                type="button"
                onClick={executeDeleteLabor}
              >
                Yes, Delete
              </button>
              <button
                className="cancel-btn"
                type="button"
                onClick={() => setModalData(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (type === "view") {
      return (
        <div className="confirmation-overlay">
          <div className="confirmation-modal view-modal">
            <h3>Labor Details</h3>
            <div className="labor-details-view">
              <p>
                <strong>Name:</strong> {labor.name}
              </p>
              <p>
                <strong>Role:</strong> {labor.role}
              </p>
              <p>
                <strong>Category:</strong> {labor.category || "N/A"}
              </p>
              <p>
                <strong>Email:</strong> {labor.email}
              </p>
              <p>
                <strong>Contact:</strong> {labor.contact}
              </p>
              <p>
                <strong>{siteLabel}:</strong> {siteDisplay}
              </p>

              {labor.role === "Worker" && (
                <div className="monthly-hours-block">
                  <h4>Working Hours for Last Three Months</h4>
                  {att.summary.length === 0 ? (
                    <p>No attendance recorded.</p>
                  ) : (
                    att.summary.map((m) => (
                      <div className="monthly-hours-item" key={m.label}>
                        <div className="labor-month-row">
                          <span className="labor-month-label">{m.label}</span>
                          <span className="labor-month-hours">
                            {m.hours} hrs
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button
                className="view-btn"
                type="button"
                onClick={() => setModalData(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  const renderLaborCard = (lab) => {
    const currentSites = lab.sites || [];
    const siteDisplay =
      lab.role === "Worker"
        ? currentSites[0] || "Unassigned"
        : currentSites.length > 0
        ? currentSites.join(", ")
        : "Unassigned";
    const siteLabel = lab.role === "Worker" ? "Current Site" : "Managed Sites";

    const att = attendanceSummary[lab._id] || {
      summary: [],
      hasTodayRecord: false,
    };

    return (
      <div
        key={lab._id}
        className={`labor-card ${
          lab.role === "Manager" || lab.role === "admin"
            ? "manager-card"
            : "worker-card"
        }`}
      >
        <h3>{lab.name}</h3>

        <p>
          <strong>Role:</strong> {lab.role}
        </p>
        <p>
          <strong>Category:</strong> {lab.category || "-"}
        </p>
        <p>
          <strong>Email:</strong> {lab.email}
        </p>
        <p>
          <strong>Contact:</strong> {lab.contact}
        </p>
        <p className="current-site-display">
          <strong>{siteLabel}:</strong> {siteDisplay}
        </p>

        {lab.role === "Worker" && (
          <div className="labor-hours-block">
            <div className="labor-hours-title">
              Working Hours for Last Three Months
            </div>
            <div className="monthly-hours-inline">
              {att.summary.length === 0 ? (
                <span className="monthly-inline-none">No data</span>
              ) : (
                att.summary.map((m) => (
                  <div className="monthly-inline-chip" key={m.label}>
                    <span className="labor-month-label">{m.label}</span>
                    <span className="labor-month-hours">{m.hours} hrs</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        <div className="labor-actions">
          <button
            className="view-btn"
            type="button"
            onClick={() => initiateViewLabor(lab)}
          >
            View
          </button>
          {currentUserRole === "admin" && (
            <button
              className="delete-btn"
              type="button"
              onClick={() => initiateDeleteLabor(lab)}
            >
              Delete
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="labor-page">
      <h1>{t("Labor Management") || "Labor Management"}</h1>

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
          {showAddForm ? "Hide Add User Form" : "Add New User"}
        </button>
      )}

      {showAddForm && (
        <form className="labor-form" onSubmit={handleSubmit}>
          <h2>Add New User</h2>

          {currentUserRole !== "admin" ? (
            <div className="permission-message labor-form permission-message">
              <p>
                View Only Mode: You do not have permission to add new users.
              </p>
            </div>
          ) : (
            <>
              <input
                type="text"
                name="name"
                placeholder="Full Name"
                value={formData.name}
                onChange={handleChange}
                required
              />
              <input
                type="email"
                name="email"
                placeholder="Email Address"
                value={formData.email}
                onChange={handleChange}
                required
              />
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                required
              >
                <option value="">Select Role</option>
                <option value="Manager">Manager</option>
                <option value="Worker">Worker</option>
                <option value="admin">Admin</option>
              </select>
              {formData.role === "Worker" && (
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Category</option>
                  {workerCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              )}
              <input
                type="text"
                name="contact"
                placeholder="Contact Number"
                value={formData.contact}
                onChange={handleChange}
                required
              />
              <button type="submit">Create User</button>
            </>
          )}
        </form>
      )}

      <div className="labor-card-container">
        {labors.length === 0 ? (
          <p className="no-labors">No users added yet.</p>
        ) : (
          labors.map((lab) => renderLaborCard(lab))
        )}
      </div>

      {renderModal()}
    </div>
  );
});

export default LaborManagement;