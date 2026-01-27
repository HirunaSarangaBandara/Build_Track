import React, { useState, useEffect, useCallback, memo } from "react";
import API from "../services/api";
import "../styles/laborManagement.css";
import { getRole } from "../services/auth";

// Use memo for performance optimization
const LaborManagement = memo(() => {
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
  
  // Custom Status Message State
  const [message, setMessage] = useState({ type: '', text: '' }); 
  // Custom Modal State: { type: 'delete' | 'view', labor: {id, name, ...} }
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
  
  // Function to show transient status messages
  const showStatusMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 6000);
  };

  // Use useCallback to memoize the function, avoiding unnecessary recreation
  const fetchLabors = useCallback(async () => {
    try {
      const { data } = await API.get("/labors");
      setLabors(data);
    } catch (error) {
      console.error("Error fetching labors:", error);
      showStatusMessage('error', 'Failed to load labor data.');
    }
  }, []); // Empty dependency array means it's created once

  useEffect(() => {
    fetchLabors();
  }, [fetchLabors]); // Include fetchLabors in dependency array

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
        showStatusMessage('error', "❌ Permission Denied: Only administrators can add new users.");
        return;
      }

      try {
        await API.post("/labors", formData);
        setFormData({ name: "", email: "", role: "", category: "", contact: "" });
        await fetchLabors(); 
        showStatusMessage('success', "✅ User added successfully! Credentials usually sent to email.");
        setShowAddForm(false);
      } catch (error) {
        const msg = error.response?.data?.message || error.message;
        console.error("Error adding labor:", msg);

        if (
          msg.includes("E11000 duplicate key error") ||
          msg.includes("duplicate key error")
        ) {
          showStatusMessage('error', "❌ Failed: The username or email is already taken.");
        } else {
          showStatusMessage('error', `❌ Failed to add user: ${msg}`);
        }
      }
    },
    [currentUserRole, formData, fetchLabors]
  );

  // Function to initiate deletion (show modal)
  const initiateDeleteLabor = useCallback((labor) => {
    if (currentUserRole !== "admin") {
      showStatusMessage("error", "❌ Permission Denied: Only administrators can delete users.");
      return;
    }
    setModalData({ type: 'delete', labor: labor });
  }, [currentUserRole]);
  
  // Function to execute deletion after confirmation
  const executeDeleteLabor = useCallback(
    async () => {
      if (!modalData || modalData.type !== 'delete') return;
      const { _id: id, name } = modalData.labor;
      setModalData(null); // Close modal

      try {
        await API.delete(`/labors/${id}`);
        showStatusMessage('success', `🗑️ User ${name} deleted successfully.`);
        await fetchLabors();
      } catch (error) {
        const msg = error.response?.data?.message || error.message;
        console.error("Error deleting labor:", msg);
        showStatusMessage('error', `❌ Failed to delete user: ${msg}`);
      }
    },
    [modalData, fetchLabors]
  );
  
  // Function to initiate viewing (show modal with details)
  const initiateViewLabor = useCallback((labor) => {
    setModalData({ type: 'view', labor: labor });
  }, []);


  const renderModal = () => {
    if (!modalData) return null;
    const { type, labor } = modalData;
    
    // Determine the site(s) to display based on role
    const currentSites = labor.sites || [];
    const siteDisplay =
        labor.role === "Worker"
          ? currentSites[0] || "Unassigned"
          : currentSites.length > 0
          ? currentSites.join(", ")
          : "Unassigned";
    const siteLabel = labor.role === "Worker" ? "Current Site" : "Managed Sites";


    if (type === 'delete') {
      return (
        <div className="confirmation-overlay">
          <div className="confirmation-modal">
            <h3>⚠️ Confirm Deletion</h3>
            <p>Are you sure you want to permanently delete **{labor.name}**?</p>
            <div className="modal-actions">
              <button className="delete-btn" onClick={executeDeleteLabor}>Yes, Delete</button>
              <button className="cancel-btn" onClick={() => setModalData(null)}>Cancel</button>
            </div>
          </div>
        </div>
      );
    }

    if (type === 'view') {
      return (
        <div className="confirmation-overlay">
          <div className="confirmation-modal view-modal">
            <h3>👷 User Details: {labor.name}</h3>
            <div className="labor-details-view">
                <p><strong>Role:</strong> {labor.role}</p>
                {labor.role === "Worker" && <p><strong>Category:</strong> {labor.category || "N/A"}</p>}
                <p><strong>Email:</strong> {labor.email}</p>
                <p><strong>Contact:</strong> {labor.contact}</p>
                <p><strong>{siteLabel}:</strong> {siteDisplay}</p>
            </div>
            <div className="modal-actions single-action">
              <button className="view-btn" onClick={() => setModalData(null)}>Close</button>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="labor-page">
      <h1>Labor & Manager Management</h1>

      {/* Render the confirmation/view modal */}
      {renderModal()} 

      {/* Status Message Display */}
      {message.text && (
        <div className={`status-box status-box-${message.type}`}>
          {message.text}
        </div>
      )}


      {/* --- Toggle Form Button --- */}
      {currentUserRole === "admin" && (
        <button
          className="btn-toggle-form"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? "Hide Add User Form" : "➕ Add New User"}
        </button>
      )}

      {/* --- Add New User Form (Admin Only) --- */}
      {currentUserRole === "admin" ? (
        showAddForm && (
          <form className="labor-form" onSubmit={handleSubmit}>
            <h2>Add New User</h2>
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

            <select name="role" value={formData.role} onChange={handleChange} required>
              <option value="">Select Role</option>
              <option value="Manager">Manager</option>
              <option value="Worker">Worker</option>
            </select>

            {formData.role === "Worker" && (
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
              >
                <option value="">Select Worker Category</option>
                {workerCategories.map((cat, index) => (
                  <option key={index} value={cat}>
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

            <button type="submit">Add User</button>
          </form>
        )
      ) : (
        <div className="labor-form permission-message">
          <p>
            🔒 <strong>View Only Mode:</strong> You do not have permission to add new users.
          </p>
        </div>
      )}

      {/* --- Labor Cards --- */}
      <div className="labor-card-container">
        {labors.length === 0 ? (
          <p className="no-labors">No users added yet.</p>
        ) : (
          labors.map((lab) => { 
            // Determine the site(s) to display based on role
            const currentSites = lab.sites || [];
            const siteDisplay =
              lab.role === "Worker"
                ? currentSites[0] || "Unassigned"
                : currentSites.length > 0
                ? currentSites.join(", ")
                : "Unassigned";

            const siteLabel = lab.role === "Worker" ? "Current Site" : "Managed Sites";

            return (
              <div
                key={lab._id} 
                className={`labor-card ${
                  lab.role === "Manager" ? "manager-card" : "worker-card"
                }`}
              >
                <h3>{lab.name}</h3>
                <p>
                  <strong>Role:</strong> {lab.role}
                </p>
                {lab.role === "Worker" && (
                  <p>
                    <strong>Category:</strong> {lab.category || "-"}
                  </p>
                )}
                <p>
                  <strong>Email:</strong> {lab.email}
                </p>
                <p>
                  <strong>Contact:</strong> {lab.contact}
                </p>

                {/* Display current site(s) prominently */}
                <p className="current-site-display">
                  <strong>{siteLabel}:</strong> {siteDisplay} 🚧
                </p>

                <div className="labor-actions">
                  <button
                    className="view-btn"
                    onClick={() => initiateViewLabor(lab)} 
                  >
                    View
                  </button>

                  {currentUserRole === "admin" && (
                    <button
                      className="delete-btn"
                      onClick={() => initiateDeleteLabor(lab)} 
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
});

export default LaborManagement;