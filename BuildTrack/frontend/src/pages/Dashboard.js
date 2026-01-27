import React, { useState, useEffect } from "react";
import API from "../services/api";
import "../styles/dashboard.css";

function Dashboard() {
  const [siteStats, setSiteStats] = useState({
    planned: 0,
    active: 0,
    onHold: 0,
    completed: 0,
    total: 0
  });
  const [workerStats, setWorkerStats] = useState([]);
  const [inventoryStats, setInventoryStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSiteStats();
    fetchWorkerStats();
    fetchInventoryStats();
  }, []);

  const fetchSiteStats = async () => {
    try {
      console.log("Fetching sites from /sites");
      const response = await API.get("/sites");
      console.log("Sites response:", response.data);
      const sites = response.data;

      // Count sites by status
      const stats = {
        planned: sites.filter(site => site.status === 'Planned').length,
        active: sites.filter(site => site.status === 'Active').length,
        onHold: sites.filter(site => site.status === 'On Hold').length,
        completed: sites.filter(site => site.status === 'Completed').length,
        total: sites.length
      };

      setSiteStats(stats);
    } catch (error) {
      console.error("Error fetching site stats:", error);
    }
  };

  const fetchWorkerStats = async () => {
    try {
      console.log("Fetching labors from /labors");
      const response = await API.get("/labors");
      console.log("Labors response:", response.data);
      const labors = response.data;

      // Filter only workers and count by category
      const workers = labors.filter(labor => labor.role === 'Worker');
      
      const categoryMap = {};
      workers.forEach(worker => {
        const category = worker.category || 'Uncategorized';
        categoryMap[category] = (categoryMap[category] || 0) + 1;
      });

      // Convert to array and sort by count
      const categoryStats = Object.entries(categoryMap)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count);

      setWorkerStats(categoryStats);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching worker stats:", error);
      setLoading(false);
    }
  };

  const fetchInventoryStats = async () => {
    try {
      console.log("Fetching inventory from /inventory");
      const response = await API.get("/inventory");
      console.log("Inventory response:", response.data);
      const items = response.data;

      // Group by category and calculate totals
      const categoryMap = {};
      items.forEach(item => {
        const category = item.category || 'Other';
        if (!categoryMap[category]) {
          categoryMap[category] = {
            totalItems: 0,
            totalAllocated: 0,
            availableStock: 0,
            usedStock: 0,
            inStock: 0,
            lowStock: 0,
            outOfStock: 0
          };
        }
        categoryMap[category].totalItems++;
        categoryMap[category].totalAllocated += item.quantity;
        
        // Calculate available (In Stock items) vs used/consumed (Low/Out of Stock)
        if (item.availability === 'In Stock') {
          categoryMap[category].inStock++;
          categoryMap[category].availableStock += item.quantity;
        } else if (item.availability === 'Low Stock') {
          categoryMap[category].lowStock++;
          categoryMap[category].usedStock += (50 - item.quantity); // Estimated used
          categoryMap[category].availableStock += item.quantity;
        } else if (item.availability === 'Out of Stock') {
          categoryMap[category].outOfStock++;
          categoryMap[category].usedStock += 50; // Estimated fully used
        }
      });

      // Convert to array
      const categoryStats = Object.entries(categoryMap)
        .map(([category, stats]) => ({ 
          category, 
          ...stats,
          usagePercentage: stats.totalAllocated > 0 
            ? Math.round((stats.usedStock / (stats.totalAllocated + stats.usedStock)) * 100) 
            : 0
        }))
        .sort((a, b) => b.totalAllocated - a.totalAllocated);

      setInventoryStats(categoryStats);
    } catch (error) {
      console.error("Error fetching inventory stats:", error);
    }
  };

  const stats = [
    { 
      title: "Planned Sites", 
      value: loading ? "..." : siteStats.planned, 
      detail: "Sites in planning",
      icon: "📋",
      color: "#FFA500"
    },
    { 
      title: "Active Sites", 
      value: loading ? "..." : siteStats.active, 
      detail: "Currently running",
      icon: "🚧",
      color: "#28a745"
    },
    { 
      title: "On Hold Sites", 
      value: loading ? "..." : siteStats.onHold, 
      detail: "Temporarily paused",
      icon: "⏸️",
      color: "#FFC107"
    },
    { 
      title: "Completed Sites", 
      value: loading ? "..." : siteStats.completed, 
      detail: "Successfully finished",
      icon: "✅",
      color: "#007bff"
    },
  ];

  return (
    <div className="dashboard">
      <div className="dashboard-description">
        <p>
          Welcome to BuildTrack - your comprehensive construction project management system. 
          Monitor active sites, track workforce allocation, manage inventory, and oversee project progress 
          all in one centralized platform. Stay updated with real-time insights across all your construction operations.
        </p>
      </div>

      <div className="stats-grid">
        {stats.map((item, i) => (
          <div key={i} className="stats-card" style={{ borderLeft: `4px solid ${item.color}` }}>
            <div className="stats-icon" style={{ color: item.color }}>{item.icon}</div>
            <h3>{item.title}</h3>
            <p className="value" style={{ color: item.color }}>{item.value}</p>
            <span>{item.detail}</span>
          </div>
        ))}

      <div className="dashboard-section">
        <h2>📦 Inventory by Category</h2>
        {loading ? (
          <p>Loading inventory data...</p>
        ) : inventoryStats.length > 0 ? (
          <div className="inventory-categories-grid">
            {inventoryStats.map((item, i) => (
              <div key={i} className="inventory-category-card">
                <div className="inventory-header">
                  <h4>{item.category}</h4>
                  <span className="total-items">{item.totalItems} items</span>
                </div>
                <div className="inventory-stats">
                  <div className="allocation-section">
                    <div className="inventory-stat">
                      <span className="stat-label">📊 Total Allocated:</span>
                      <span className="stat-value allocated">{item.totalAllocated + item.usedStock}</span>
                    </div>
                    <div className="inventory-stat">
                      <span className="stat-label">✅ Available Stock:</span>
                      <span className="stat-value available">{item.availableStock}</span>
                    </div>
                    <div className="inventory-stat">
                      <span className="stat-label">📉 Used/Consumed:</span>
                      <span className="stat-value used">{item.usedStock}</span>
                    </div>
                  </div>
                  <div className="inventory-availability">
                    <div className="avail-item in-stock">
                      <span className="avail-dot"></span>
                      <span>{item.inStock} In Stock</span>
                    </div>
                    <div className="avail-item low-stock">
                      <span className="avail-dot"></span>
                      <span>{item.lowStock} Low Stock</span>
                    </div>
                    <div className="avail-item out-stock">
                      <span className="avail-dot"></span>
                      <span>{item.outOfStock} Out of Stock</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p>No inventory items found in the system.</p>
        )}
      </div>
      </div>

      <div className="dashboard-section">
        <h2>Site Overview</h2>
        <div className="overview-summary">
          <p>📊 <strong>Total Sites:</strong> {loading ? "..." : siteStats.total}</p>
          <p>🏗️ <strong>Active Projects:</strong> {loading ? "..." : siteStats.active} sites currently in progress</p>
        </div>
      </div>

      <div className="dashboard-section">
        <h2>👷 Workers by Category</h2>
        {loading ? (
          <p>Loading worker data...</p>
        ) : workerStats.length > 0 ? (
          <div className="worker-categories-grid">
            {workerStats.map((item, i) => (
              <div key={i} className="worker-category-card">
                <div className="category-info">
                  <span className="category-name">{item.category}</span>
                  <span className="category-count">{item.count}</span>
                </div>
                <div className="category-bar">
                  <div 
                    className="category-bar-fill" 
                    style={{ 
                      width: `${(item.count / Math.max(...workerStats.map(s => s.count))) * 100}%` 
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p>No workers found in the system.</p>
        )}
      </div>
    </div>
  );
}

export default Dashboard;