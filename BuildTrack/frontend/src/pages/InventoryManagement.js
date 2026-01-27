import React, { useState, useEffect } from "react";
import API from "../services/api";
import "../styles/inventoryManagement.css";
import { getRole } from "../services/auth";

function InventoryManagement() {
  const [inventory, setInventory] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({
    name: "",
    category: "",
    quantity: 0,
    unit: "",
  });
  const [updateData, setUpdateData] = useState({ id: null, quantity: 0 });
  const [message, setMessage] = useState({ type: "", text: "" });
  const [itemToDelete, setItemToDelete] = useState(null);

  const [sites, setSites] = useState([]);
  const [allocationData, setAllocationData] = useState({});

  const currentUserRole = getRole();

  const itemCategories = [
    "Cement & Aggregates",
    "Steel & Metal",
    "Wood & Timber",
    "Plumbing",
    "Electrical",
    "Tools & Equipment",
    "Safety Gear",
    "Finishing Materials",
    "Other",
  ];

  useEffect(() => {
    fetchInventory();
    if (currentUserRole === "admin") {
      fetchSitesForAllocation();
    }
  }, [currentUserRole]);

  const showStatusMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type, text: "" }), 5000);
  };

  const fetchInventory = async () => {
    try {
      const { data } = await API.get("/inventory/with-allocation");
      setInventory(data);
    } catch (error) {
      console.error("Error fetching inventory:", error);
      showStatusMessage("error", "Failed to fetch inventory data.");
    }
  };

  const fetchSitesForAllocation = async () => {
    try {
      const { data } = await API.get("/sites");
      setSites(data);
    } catch (error) {
      console.error("Error fetching sites for allocation:", error);
      showStatusMessage("error", "Failed to fetch sites for allocation.");
    }
  };

  const handleNewItemChange = (e) => {
    const { name, value } = e.target;
    setNewItem({
      ...newItem,
      [name]: name === "quantity" ? Number(value) : value,
    });
  };

  const handleShowUpdateForm = (id, currentQuantity) => {
    if (currentUserRole !== "admin") {
      showStatusMessage(
        "error",
        "❌ Access Denied: Only administrators can update inventory items."
      );
      return;
    }
    setUpdateData({ id, quantity: currentQuantity });
  };

  const handleToggleAddForm = () => {
    if (currentUserRole !== "admin") {
      showStatusMessage(
        "error",
        "❌ Access Denied: Only administrators can add new inventory items."
      );
      return;
    }
    setShowAddForm(!showAddForm);
    setNewItem({ name: "", category: "", quantity: 0, unit: "" });
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (currentUserRole !== "admin") return;

    try {
      await API.post("/inventory", newItem);
      showStatusMessage("success", "✅ Item added successfully!");
      setNewItem({ name: "", category: "", quantity: 0, unit: "" });
      setShowAddForm(false);
      fetchInventory();
    } catch (error) {
      const msg = error.response?.data?.message || error.message;
      console.error("Error adding item:", msg);
      if (error.response?.status === 403) {
        showStatusMessage(
          "error",
          "❌ Permission Denied: Only administrators can add new inventory items."
        );
      } else {
        showStatusMessage("error", `❌ Failed to add item: ${msg}`);
      }
    }
  };

  const initiateDeleteItem = (id, name) => {
    if (currentUserRole !== "admin") {
      showStatusMessage(
        "error",
        "❌ Access Denied: Only administrators can delete inventory items."
      );
      return;
    }
    setItemToDelete({ id, name });
  };

  const confirmDeleteItem = async () => {
    if (!itemToDelete) return;
    const { id, name } = itemToDelete;

    try {
      await API.delete(`/inventory/${id}`);
      showStatusMessage("success", `🗑️ ${name} deleted successfully!`);
      fetchInventory();
    } catch (error) {
      const msg = error.response?.data?.message || error.message;
      console.error("Error deleting item:", msg);
      if (error.response?.status === 403) {
        showStatusMessage(
          "error",
          "❌ Permission Denied: Only administrators can delete inventory items."
        );
      } else {
        showStatusMessage("error", `❌ Failed to delete item: ${msg}`);
      }
    } finally {
      setItemToDelete(null);
    }
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    if (currentUserRole !== "admin") {
      showStatusMessage(
        "error",
        "❌ Permission Denied: Only administrators can update inventory items."
      );
      setUpdateData({ id: null, quantity: 0 });
      return;
    }
    if (!updateData.id) return;

    try {
      await API.patch(`/inventory/${updateData.id}`, {
        quantity: updateData.quantity,
      });
      showStatusMessage("success", "✅ Quantity updated successfully!");
      setUpdateData({ id: null, quantity: 0 });
      fetchInventory();
    } catch (error) {
      const msg = error.response?.data?.message || error.message;
      console.error("Error updating item:", msg);
      if (error.response?.status === 403) {
        showStatusMessage(
          "error",
          "❌ Permission Denied: You do not have permission to update items."
        );
      } else {
        showStatusMessage("error", `❌ Failed to update item: ${msg}`);
      }
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case "Low Stock":
        return "status-low";
      case "Out of Stock":
        return "status-out";
      case "In Stock":
        return "status-in";
      default:
        return "";
    }
  };

  const handleAllocationChange = (e, itemId) => {
    const { name, value } = e.target;
    setAllocationData((prev) => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] || { siteId: "", quantity: 0 }),
        [name]: name === "quantity" ? Number(value) : value,
      },
    }));
  };

  const handleAllocateToSite = async (item) => {
    if (currentUserRole !== "admin") {
      showStatusMessage(
        "error",
        "❌ Permission Denied: Only administrators can allocate inventory to sites."
      );
      return;
    }

    const dataForItem = allocationData[item._id] || { siteId: "", quantity: 0 };
    const { siteId, quantity } = dataForItem;

    if (!siteId || !quantity || quantity <= 0) {
      showStatusMessage(
        "error",
        "Please select a site and enter a positive quantity to allocate."
      );
      return;
    }

    try {
      await API.post("/inventory/allocate", {
        siteId,
        inventoryId: item._id,
        quantity,
      });
      showStatusMessage(
        "success",
        `✅ Allocated ${quantity} ${item.unit} of ${item.name} to selected site.`
      );
      setAllocationData((prev) => ({
        ...prev,
        [item._id]: { siteId: "", quantity: 0 },
      }));
      fetchInventory();
    } catch (error) {
      const msg = error.response?.data?.message || error.message;
      console.error("Error allocating inventory:", msg);
      showStatusMessage("error", `❌ Failed to allocate: ${msg}`);
    }
  };

  return (
    <div className="inventory-page">
      <h1>Construction Inventory Management</h1>

      {message.text && (
        <div className={`status-box status-box-${message.type}`}>
          {message.text}
        </div>
      )}

      {itemToDelete && (
        <div className="confirmation-overlay">
          <div className="confirmation-modal">
            <h3>⚠️ Confirm Deletion</h3>
            <p>
              Are you sure you want to permanently delete{" "}
              <strong>{itemToDelete.name}</strong>?
            </p>
            <div className="modal-actions">
              <button className="btn-delete" onClick={confirmDeleteItem}>
                Yes, Delete
              </button>
              <button
                className="cancel-btn"
                onClick={() => setItemToDelete(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {currentUserRole === "admin" ? (
        <>
          <button className="btn-toggle-form" onClick={handleToggleAddForm}>
            {showAddForm ? "Hide Add Item Form" : "➕ Add New Inventory Item"}
          </button>

          {showAddForm && (
            <form className="inventory-add-form" onSubmit={handleAddSubmit}>
              <h2>Add New Item</h2>
              <input
                type="text"
                name="name"
                placeholder="Item Name (e.g., Cement Bag)"
                value={newItem.name}
                onChange={handleNewItemChange}
                required
              />
              <select
                name="category"
                value={newItem.category}
                onChange={handleNewItemChange}
                required
              >
                <option value="">Select Category</option>
                {itemCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <input
                type="number"
                name="quantity"
                placeholder="Initial Quantity"
                value={newItem.quantity}
                onChange={handleNewItemChange}
                min="0"
                required
              />
              <input
                type="text"
                name="unit"
                placeholder="Unit (e.g., bags, kg, pieces)"
                value={newItem.unit}
                onChange={handleNewItemChange}
                required
              />
              <button type="submit">Submit New Item</button>
            </form>
          )}
        </>
      ) : (
        <div className="inventory-add-form permission-message">
          <p>
            🔒 <strong>View Only Mode</strong> You do not have permission to
            modify inventory.
          </p>
        </div>
      )}

      {updateData.id && (
        <form className="inventory-update-form" onSubmit={handleUpdateSubmit}>
          <h2>Update Quantity</h2>
          <input
            type="number"
            placeholder="New Quantity"
            value={updateData.quantity}
            onChange={(e) =>
              setUpdateData({ ...updateData, quantity: Number(e.target.value) })
            }
            min="0"
            required
          />
          <button type="submit" className="update-btn">
            Update Quantity
          </button>
          <button
            type="button"
            className="cancel-btn"
            onClick={() => setUpdateData({ id: null, quantity: 0 })}
          >
            Cancel
          </button>
        </form>
      )}

      <div className="inventory-list">
        <h2>Current Inventory ({inventory.length} Items)</h2>
        <div className="inventory-grid">
          {inventory.length === 0 ? (
            <p className="no-items-message">
              No inventory items found. Add one to get started!
            </p>
          ) : (
            inventory.map((item) => {
              const allocState = allocationData[item._id] || {
                siteId: "",
                quantity: 0,
              };

              const availablePlusAllocated =
                (item.quantity || 0) + (item.totalAllocated || 0);
              const remaining =
                availablePlusAllocated - (item.totalUsed || 0);
              const safeRemaining = remaining < 0 ? 0 : remaining;

              return (
                <div key={item._id} className="inventory-card">
                  <h3>{item.name}</h3>
                  <p>
                    <strong>Category:</strong> {item.category}
                  </p>
                  <p>
                    <strong>Availability:</strong>
                    <span
                      className={`inventory-status ${getStatusClass(
                        item.availability
                      )}`}
                    >
                      {item.availability}
                    </span>
                  </p>

                  <p className="inventory-meta-row">
                    <span className="chip chip-available">
                      Available: {item.quantity} {item.unit}
                    </span>
                    <span className="chip chip-allocated">
                      Allocated: {item.totalAllocated || 0} {item.unit}
                    </span>
                    <span className="chip chip-used">
                      Used: {item.totalUsed || 0} {item.unit}
                    </span>
                    <span className="chip chip-remaining">
                      Remaining: {safeRemaining} {item.unit}
                    </span>
                  </p>

                  {currentUserRole === "admin" && (
                    <div className="inventory-allocation-section">
                      <h4>Allocate to Site</h4>
                      <select
                        name="siteId"
                        value={allocState.siteId}
                        onChange={(e) => handleAllocationChange(e, item._id)}
                      >
                        <option value="">Select Site</option>
                        {sites.map((s) => (
                          <option key={s._id} value={s._id}>
                            {s.siteName}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        name="quantity"
                        placeholder="Quantity to allocate"
                        value={allocState.quantity}
                        onChange={(e) => handleAllocationChange(e, item._id)}
                        min="1"
                      />
                      <button
                        type="button"
                        className="btn-allocate"
                        onClick={() => handleAllocateToSite(item)}
                      >
                        Allocate
                      </button>
                    </div>
                  )}

                  <div className="inventory-actions">
                    {currentUserRole === "admin" ? (
                      <>
                        <button
                          className="btn-update-qty"
                          onClick={() =>
                            handleShowUpdateForm(item._id, item.quantity)
                          }
                        >
                          ✏️ Update Qty
                        </button>
                        <button
                          className="btn-delete"
                          onClick={() =>
                            initiateDeleteItem(item._id, item.name)
                          }
                        >
                          🗑️ Delete
                        </button>
                      </>
                    ) : (
                      <p className="view-only-tag">View Only</p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default InventoryManagement;