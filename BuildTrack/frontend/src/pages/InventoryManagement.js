import React, { useState, useEffect } from "react";
import API from "../services/api";
import "../styles/inventoryManagement.css";
import { getRole } from "../services/auth";
import { useLanguage } from "../contexts/LanguageContext";

function InventoryManagement() {
  const { t } = useLanguage();
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
    } catch {
      showStatusMessage("error", "Failed to fetch inventory data.");
    }
  };

  const fetchSitesForAllocation = async () => {
    try {
      const { data } = await API.get("/sites");
      setSites(data);
    } catch {
      showStatusMessage("error", "Failed to fetch sites.");
    }
  };

  const handleNewItemChange = (e) => {
    const { name, value } = e.target;
    setNewItem({
      ...newItem,
      [name]: name === "quantity" ? Number(value) : value,
    });
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      await API.post("/inventory", newItem);
      showStatusMessage("success", "Item added successfully!");
      setNewItem({ name: "", category: "", quantity: 0, unit: "" });
      setShowAddForm(false);
      fetchInventory();
    } catch {
      showStatusMessage("error", "Failed to add item.");
    }
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    try {
      await API.patch(`/inventory/${updateData.id}`, {
        quantity: updateData.quantity,
      });
      showStatusMessage("success", "Quantity updated!");
      setUpdateData({ id: null, quantity: 0 });
      fetchInventory();
    } catch {
      showStatusMessage("error", "Update failed.");
    }
  };

  const confirmDeleteItem = async () => {
    try {
      await API.delete(`/inventory/${itemToDelete.id}`);
      showStatusMessage("success", "Item deleted!");
      fetchInventory();
    } catch {
      showStatusMessage("error", "Delete failed.");
    } finally {
      setItemToDelete(null);
    }
  };

  const handleAllocationChange = (e, itemId) => {
    const { name, value } = e.target;
    setAllocationData((prev) => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] || {}),
        [name]: name === "quantity" ? Number(value) : value,
      },
    }));
  };

  const handleAllocateToSite = async (item) => {
    const data = allocationData[item._id];
    if (!data?.siteId || !data?.quantity) return;

    try {
      await API.post("/inventory/allocate", {
        inventoryId: item._id,
        siteId: data.siteId,
        quantity: data.quantity,
      });
      showStatusMessage("success", "Allocated successfully!");
      fetchInventory();
    } catch {
      showStatusMessage("error", "Allocation failed.");
    }
  };

  return (
    <div className="inventory-page">
      <h1>{t("inventoryTitle")}</h1>

      {message.text && (
        <div className={`status-box status-box-${message.type}`}>
          {message.text}
        </div>
      )}

      {currentUserRole === "admin" && (
        <>
          <button onClick={() => setShowAddForm(!showAddForm)}>
            ➕ {t("addNewInventoryItem")}
          </button>

          {showAddForm && (
            <form onSubmit={handleAddSubmit}>
              <input name="name" placeholder="Item Name" onChange={handleNewItemChange} required />
              <select name="category" onChange={handleNewItemChange} required>
                <option value="">Select Category</option>
                {itemCategories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <input type="number" name="quantity" onChange={handleNewItemChange} required />
              <input name="unit" placeholder="Unit" onChange={handleNewItemChange} required />
              <button type="submit">Save</button>
            </form>
          )}
        </>
      )}

      <div className="inventory-grid">
        {inventory.map((item) => (
          <div key={item._id} className="inventory-card">
            <h3>{item.name}</h3>
            <p>{item.category}</p>
            <p>Available: {item.quantity} {item.unit}</p>

            {currentUserRole === "admin" && (
              <>
                <select
                  name="siteId"
                  onChange={(e) => handleAllocationChange(e, item._id)}
                >
                  <option value="">Select Site</option>
                  {sites.map((s) => (
                    <option key={s._id} value={s._id}>{s.siteName}</option>
                  ))}
                </select>

                <input
                  type="number"
                  name="quantity"
                  placeholder="Allocate qty"
                  onChange={(e) => handleAllocationChange(e, item._id)}
                />

                <button onClick={() => handleAllocateToSite(item)}>Allocate</button>
                <button onClick={() => setUpdateData({ id: item._id, quantity: item.quantity })}>
                  Update
                </button>
                <button onClick={() => setItemToDelete(item)}>Delete</button>
              </>
            )}
          </div>
        ))}
      </div>

      {updateData.id && (
        <form onSubmit={handleUpdateSubmit}>
          <input
            type="number"
            value={updateData.quantity}
            onChange={(e) => setUpdateData({ ...updateData, quantity: Number(e.target.value) })}
          />
          <button type="submit">Update</button>
        </form>
      )}

      {itemToDelete && (
        <div>
          <p>Delete {itemToDelete.name}?</p>
          <button onClick={confirmDeleteItem}>Yes</button>
          <button onClick={() => setItemToDelete(null)}>Cancel</button>
        </div>
      )}
    </div>
  );
}

export default InventoryManagement;
