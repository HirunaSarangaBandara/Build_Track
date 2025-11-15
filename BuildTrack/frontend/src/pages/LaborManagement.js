import React, { useState, useEffect } from "react";
import API from "../services/api";
import "../styles/laborManagement.css";

function LaborManagement() {
  const [labors, setLabors] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "",
    category: "",
    contact: "",
    site: "",
  });

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

  useEffect(() => {
    fetchLabors();
  }, []);

  const fetchLabors = async () => {
    try {
      const { data } = await API.get("/labors");
      setLabors(data);
    } catch (error) {
      console.error("Error fetching labors:", error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let newFormData = { ...formData, [name]: value };
    if (name === "role") newFormData.category = "";
    setFormData(newFormData);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await API.post("/labors", formData);
      setFormData({
        name: "",
        email: "",
        role: "",
        category: "",
        contact: "",
        site: "",
      });
      fetchLabors();
      alert("✅ User added successfully! Credentials sent to email.");
    } catch (error) {
      console.error("Error adding labor:", error);
      alert("❌ Failed to add user. Check console for details.");
    }
  };

  return (
    <div className="labor-page">
      <h1>Labor & Manager Management</h1>

      {/* Add Labor Form */}
      <form className="labor-form" onSubmit={handleSubmit}>
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

        <input
          type="text"
          name="site"
          placeholder="Assigned Site"
          value={formData.site}
          onChange={handleChange}
        />

        <button type="submit">Add</button>
      </form>

      {/* Labor Cards */}
      <div className="labor-card-container">
        {labors.length === 0 ? (
          <p className="no-labors">No users added yet.</p>
        ) : (
          labors.map((lab, index) => (
            <div
              key={index}
              className={`labor-card ${lab.role === "Manager" ? "manager-card" : "worker-card"}`}
            >
              <h3>{lab.name}</h3>
              <p><strong>Role:</strong> {lab.role}</p>
              {lab.role === "Worker" && (
                <p><strong>Category:</strong> {lab.category || "-"}</p>
              )}
              <p><strong>Email:</strong> {lab.email}</p>
              <p><strong>Contact:</strong> {lab.contact}</p>
              <p><strong>Site:</strong> {lab.site || "-"}</p>

              {/* Interactive hover icons */}
              <div className="labor-actions">
                <button
                  className="view-btn"
                  onClick={() =>
                    alert(`👷 ${lab.name}\nRole: ${lab.role}\nContact: ${lab.contact}`)
                  }
                >
                  👁️ View
                </button>
                <button
                  className="delete-btn"
                  onClick={() => alert("🗑️ Delete feature coming soon!")}
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default LaborManagement;