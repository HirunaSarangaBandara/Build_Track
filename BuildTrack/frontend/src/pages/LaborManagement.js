import React, { useState, useEffect } from "react";
import API from "../services/api";
import "../styles/laborManagement.css";
import { getRole } from "../services/auth"; 

function LaborManagement() {
  const [labors, setLabors] = useState([]);
  const [sites, setSites] = useState([]); // State to hold existing site names
  const [formData, setFormData] = useState({
    name: "", email: "", role: "", category: "", contact: "", site: "",
  });
  
  const currentUserRole = getRole(); 

  const workerCategories = [
    "Mason", "Plumber", "Electrician", "Carpenter", "Painter", 
    "Welder", "Steel Fixer", "Supervisor", "Helper",
  ];

  useEffect(() => { 
    fetchLabors(); 
    fetchSites();
  }, []);

  const fetchLabors = async () => {
    try {
      const { data } = await API.get("/labors");
      setLabors(data);
    } catch (error) {
      console.error("Error fetching labors:", error);
    }
  };
  
  const fetchSites = async () => {
    try {
        const { data } = await API.get("/sites");
        setSites(data); 
    } catch (error) {
        console.error("Error fetching sites list:", error);
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
    
    if (currentUserRole !== 'admin') {
        alert("❌ Permission Denied: Only administrators can add new users.");
        return;
    }
    
    // Front-end validation for uniqueness
    const selectedSiteName = formData.site;
    if (selectedSiteName) { 
        const assignmentConflict = labors.some(labor => labor.site === selectedSiteName);
        
        if (assignmentConflict) {
             alert(`❌ Assignment Conflict: Site "${selectedSiteName}" is already assigned to another user.`);
             return; 
        }
    }
    
    try {
      await API.post("/labors", formData);
      setFormData({ name: "", email: "", role: "", category: "", contact: "", site: "" });
      fetchLabors();
      alert("✅ User added successfully! Credentials sent to email.");
    } catch (error) {
      const message = error.response?.data?.message || error.message;
      console.error("Error adding labor:", message);
      
      if (message.includes('E11000 duplicate key error') || message.includes('duplicate key error')) {
          alert('❌ Failed: The selected site is already assigned, or the username/email is taken.');
      } else {
          alert(`❌ Failed to add user: ${message}`);
      }
    }
  };
  
  const handleDeleteLabor = async (laborId, laborName) => {
      if (currentUserRole !== 'admin') {
          alert("❌ Permission Denied: Only administrators can delete users.");
          return;
      }
      
      if (window.confirm(`⚠️ Are you sure you want to delete ${laborName}? This action cannot be undone.`)) {
          try {
              await API.delete(`/labors/${laborId}`);
              alert(`🗑️ User ${laborName} deleted successfully.`);
              fetchLabors();
          } catch (error) {
              const message = error.response?.data?.message || error.message;
              console.error("Error deleting labor:", message);
              alert(`❌ Failed to delete user: ${message}`);
          }
      }
  };

  return (
    <div className="labor-page">
      <h1>Labor & Manager Management</h1>

      {currentUserRole === 'admin' ? (
        <form className="labor-form" onSubmit={handleSubmit}>
          <input type="text" name="name" placeholder="Full Name" value={formData.name} onChange={handleChange} required />
          <input type="email" name="email" placeholder="Email Address" value={formData.email} onChange={handleChange} required />
          
          <select name="role" value={formData.role} onChange={handleChange} required>
            <option value="">Select Role</option>
            <option value="Manager">Manager</option>
            <option value="Worker">Worker</option>
          </select>

          {formData.role === "Worker" && (
            <select name="category" value={formData.category} onChange={handleChange} required>
              <option value="">Select Worker Category</option>
              {workerCategories.map((cat, index) => (<option key={index} value={cat}>{cat}</option>))}
            </select>
          )}

          <input type="text" name="contact" placeholder="Contact Number" value={formData.contact} onChange={handleChange} required />
          
          {/* Site Dropdown using fetched sites */}
          <select 
              name="site" 
              value={formData.site} 
              onChange={handleChange}
          >
            <option value="">Unassigned (Leave Empty)</option> 
            {sites.map((site) => (
                <option key={site._id} value={site.siteName}>
                    {site.siteName}
                </option>
            ))}
          </select>
          
          <button type="submit">Add</button>
        </form>
      ) : (
        <div className="labor-form permission-message">
            <p>🔒 **View Only Mode:** You do not have permission to add new users.</p>
        </div>
      )}

      {/* Labor Cards */}
      <div className="labor-card-container">
        {labors.length === 0 ? (
          <p className="no-labors">No users added yet.</p>
        ) : (
          labors.map((lab, index) => (
            <div key={lab._id || index} className={`labor-card ${lab.role === "Manager" ? "manager-card" : "worker-card"}`}>
              <h3>{lab.name}</h3>
              <p><strong>Role:</strong> {lab.role}</p>
              {lab.role === "Worker" && (<p><strong>Category:</strong> {lab.category || "-"}</p>)}
              <p><strong>Email:</strong> {lab.email}</p>
              <p><strong>Contact:</strong> {lab.contact}</p>
              
              {/* Display current site prominently */}
              <p className="current-site-display">
                  <strong>Current Site:</strong> {lab.site || "Unassigned"} 🚧
              </p> 

              <div className="labor-actions">
                <button className="view-btn" onClick={() => alert(`👷 ${lab.name}\nRole: ${lab.role}\nContact: ${lab.contact}`)}>
                  View
                </button>
                
                {currentUserRole === 'admin' && (
                    <button className="delete-btn" onClick={() => handleDeleteLabor(lab._id, lab.name)}>
                      Delete
                    </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default LaborManagement;