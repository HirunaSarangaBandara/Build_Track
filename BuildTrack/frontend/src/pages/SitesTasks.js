import React, { useState, useEffect } from 'react';
import API from '../services/api';
import { getRole, getUserId, getUserName } from '../services/auth';
import '../styles/sitesTasks.css';

const BACKEND_HOST = "http://localhost:5000";
const DEFAULT_IMAGE_URL = `${BACKEND_HOST}/uploads/default-site.jpg`;
const COMMENT_MAX = 280;

function SitesTasks() {
  const [sites, setSites] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [managers, setManagers] = useState([]);
  const [allWorkers, setAllWorkers] = useState([]);

  const [formData, setFormData] = useState({
    siteName: '',
    managerId: '',
    managerName: '',
    siteImage: null,
    otherDetails: '',
  });

  const [showUpdateModal, setShowUpdateModal] = useState(null);
  const [updateComment, setUpdateComment] = useState('');

  const [showWorkerModal, setShowWorkerModal] = useState(null);
  const [workerModalMessage, setWorkerModalMessage] = useState({
    type: '',
    text: '',
  });

  const [showManagerModal, setShowManagerModal] = useState(null);
  const [selectedManagerId, setSelectedManagerId] = useState('');
  const [managerModalMessage, setManagerModalMessage] = useState({
    type: '',
    text: '',
  });

  const [selectedCategory, setSelectedCategory] = useState('');
  const [availableWorkers, setAvailableWorkers] = useState([]);

  const [message, setMessage] = useState({ type: '', text: '' });
  const [confirmationData, setConfirmationData] = useState(null);

  const [siteInventory, setSiteInventory] = useState({});
  const [usageInputs, setUsageInputs] = useState({});

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

  const showStatusMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 6000);
  };

  useEffect(() => {
    fetchSites();
    if (currentUserRole === 'admin' || currentUserRole === 'Manager') {
      fetchManagersAndWorkers();
    }
  }, [currentUserRole]);

  const fetchManagersAndWorkers = async () => {
    try {
      const { data } = await API.get('/labors');
      setManagers(data.filter(l => l.role === 'Manager' || l.role === 'admin'));
      setAllWorkers(data.filter(l => l.role === 'Worker'));
    } catch {
      showStatusMessage('error', 'Failed to fetch manager and worker data.');
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

  const fetchSites = async () => {
    try {
      const { data } = await API.get('/sites');
      setSites(data);
      loadAllSitesInventory(data);
    } catch {
      showStatusMessage('error', 'Failed to fetch site data.');
    }
  };

  const isCurrentUserManager = (siteManagerId) =>
    currentUserId && siteManagerId && currentUserId === siteManagerId;

  const isAuthorizedToUpdate = (site) =>
    currentUserRole === 'admin' || isCurrentUserManager(site.managerId);

  const isAuthorizedToAssignWorkers = (site) =>
    currentUserRole === 'admin' || isCurrentUserManager(site.managerId);

  const isAuthorizedToAssignManager = (site) =>
    currentUserRole === 'admin' || isCurrentUserManager(site.managerId);

  const calculateProgress = (tasks) => {
    if (!tasks || tasks.length === 0) return 0;
    const completed = tasks.filter(t => t.isCompleted).length;
    return ((completed / tasks.length) * 100).toFixed(0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let newFormData = { ...formData, [name]: value };
    if (name === "role") newFormData.category = "";
    setFormData(newFormData);
  };

  const handleManagerSelect = (e) => {
    const selectedManager = managers.find(m => m._id === e.target.value);
    setFormData(prev => ({
      ...prev,
      managerId: selectedManager ? selectedManager._id : '',
      managerName: selectedManager ? selectedManager.name : '',
    }));
  };

  const handleFileChange = (e) => {
    setFormData(prev => ({ ...prev, siteImage: e.target.files[0] }));
  };

  // --- Add Site ---
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (currentUserRole !== 'admin') {
      showStatusMessage('error', '❌ Permission Denied: Only administrators can add sites.');
      return;
    }

    const data = new FormData();
    data.append('siteName', formData.siteName);
    data.append('managerId', formData.managerId);
    data.append('managerName', formData.managerName);
    data.append('otherDetails', formData.otherDetails);
    if (formData.siteImage) data.append('siteImage', formData.siteImage);

    try {
      await API.post('/sites', data);
      showStatusMessage('success', '✅ Site added successfully!');
      setFormData({
        siteName: '',
        managerId: '',
        managerName: '',
        siteImage: null,
        otherDetails: '',
      });
      setShowAddForm(false);
      fetchSites();
      fetchManagersAndWorkers();
    } catch (error) {
      showStatusMessage(
        'error',
        `❌ Failed to add site: ${error.response?.data?.message || 'Check console.'}`
      );
    }
  };

  // --- Worker Assignment Logic ---
  const openWorkerModal = (site) => {
    if (!isAuthorizedToAssignWorkers(site)) {
      showStatusMessage('error', "❌ Not authorized to assign/release workers for this site.");
      return;
    }
    setShowWorkerModal(site);
    setSelectedCategory('');
    setAvailableWorkers([]);
    setWorkerModalMessage({ type: '', text: '' });
  };

  const handleCategoryChange = (e) => {
    const category = e.target.value;
    setSelectedCategory(category);

    if (category) {
      const available = allWorkers.filter(
        worker =>
          worker.category === category &&
          (!worker.sites || worker.sites.length === 0)
      );
      setAvailableWorkers(available);
    } else {
      setAvailableWorkers([]);
    }
  };

  const assignWorkerToSite = async (worker, site) => {
    try {
      await API.patch(`/labors/assign-site/${worker._id}`, {
        siteName: site.siteName,
      });
      const text = `✅ ${worker.name} assigned to ${site.siteName}.`;
      showStatusMessage('success', text);
      setWorkerModalMessage({ type: 'success', text });
      fetchSites();
      fetchManagersAndWorkers();
    } catch (error) {
      const msg = error.response?.data?.message || error.message;
      const text = `❌ Failed to assign worker: ${msg}`;
      showStatusMessage('error', text);
      setWorkerModalMessage({ type: 'error', text });
    }
  };

  const releaseWorkerFromSite = async (workerId, siteName) => {
    try {
      await API.patch(`/labors/release-site/${workerId}`, { siteName });
      const text = `✅ Worker released from ${siteName}.`;
      showStatusMessage('success', text);
      setWorkerModalMessage({ type: 'success', text });
      fetchSites();
      fetchManagersAndWorkers();
    } catch (error) {
      const msg = error.response?.data?.message || error.message;
      const text = `❌ Failed to release worker: ${msg}`;
      showStatusMessage('error', text);
      setWorkerModalMessage({ type: 'error', text });
    }
  };

  // --- Manager assign/unassign modal logic ---
  const openManagerModal = (site) => {
    if (!isAuthorizedToAssignManager(site)) {
      showStatusMessage('error', '❌ Not authorized to change manager for this site.');
      return;
    }
    setShowManagerModal(site);
    setSelectedManagerId(site.managerId || '');
    setManagerModalMessage({ type: '', text: '' });
  };

  const closeManagerModal = () => {
    setShowManagerModal(null);
    setSelectedManagerId('');
    setManagerModalMessage({ type: '', text: '' });
  };

  const handleAssignManager = async () => {
    if (!showManagerModal) return;
    if (!selectedManagerId) {
      const text = 'Please select a manager.';
      setManagerModalMessage({ type: 'error', text });
      return;
    }

    const manager = managers.find(m => m._id === selectedManagerId);
    if (!manager) {
      const text = 'Selected manager not found.';
      setManagerModalMessage({ type: 'error', text });
      return;
    }

    try {
      await API.patch(`/sites/${showManagerModal._id}`, {
        managerId: manager._id,
        managerName: manager.name,
      });

      await API.patch(`/labors/manager-site/${manager._id}`, {
        siteName: showManagerModal.siteName,
        action: 'assign',
      });

      const text = `✅ Manager assigned to ${showManagerModal.siteName}.`;
      showStatusMessage('success', text);
      setManagerModalMessage({ type: 'success', text });

      await fetchSites();
    } catch (error) {
      const msg = error.response?.data?.message || error.message;
      const text = `❌ Failed to assign manager: ${msg}`;
      showStatusMessage('error', text);
      setManagerModalMessage({ type: 'error', text });
    }
  };

  // --- Site Update Modal open/close ---
  const openUpdateModal = (site) => {
    if (!isAuthorizedToUpdate(site)) {
      showStatusMessage('error', "❌ Not authorized to update this site.");
      return;
    }
    setShowUpdateModal(site);
    setUpdateComment('');
    fetchSiteInventory(site._id);
  };

  const closeUpdateModal = () => {
    setShowUpdateModal(null);
    setUpdateComment('');
  };

  // --- Task toggle + comment submit ---
  const handleTaskToggle = async (site, task) => {
    try {
      await API.patch(`/sites/${site._id}`, {
        taskId: task._id,
        isCompleted: !task.isCompleted,
      });
      fetchSites();
    } catch (error) {
      showStatusMessage(
        'error',
        `❌ Failed to update task: ${error.response?.data?.message || 'Check console.'}`
      );
    }
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!showUpdateModal) return;

    const trimmed = updateComment.trim();
    if (trimmed.length > COMMENT_MAX) {
      showStatusMessage('error', `Comment cannot exceed ${COMMENT_MAX} characters.`);
      return;
    }

    try {
      await API.patch(`/sites/${showUpdateModal._id}`, {
        comment: trimmed || undefined,
      });
      showStatusMessage('success', '✅ Site updated successfully.');
      closeUpdateModal();
      fetchSites();
    } catch (error) {
      showStatusMessage(
        'error',
        `❌ Failed to update site: ${error.response?.data?.message || 'Check console.'}`
      );
    }
  };

  // --- Site status change ---
  const handleStatusChange = async (siteId, status) => {
    try {
      await API.patch(`/sites/status/${siteId}`, { status });
      showStatusMessage('success', `✅ Status updated to ${status}.`);
      fetchSites();
    } catch (error) {
      showStatusMessage(
        'error',
        `❌ Failed to update status: ${error.response?.data?.message || 'Check console.'}`
      );
    }
  };

  // --- confirmations ---
  const confirmAction = (data) => setConfirmationData(data);
  const closeConfirmation = () => setConfirmationData(null);

  const handleConfirmedAction = async () => {
    if (!confirmationData) return;
    const { type, siteId, workerId, siteName, managerId } = confirmationData;

    try {
      if (type === 'deleteSite') {
        await API.delete(`/sites/${siteId}`);
        showStatusMessage('success', '🗑️ Site deleted successfully.');
      } else if (type === 'releaseManager') {
        await API.patch(`/sites/manager-release/${siteId}`);
        if (managerId) {
          await API.patch(`/labors/manager-site/${managerId}`, {
            siteName,
            action: 'deassign',
          });
        }
        const text = '✅ Manager released from site.';
        showStatusMessage('success', text);
        setManagerModalMessage({ type: 'success', text });
      } else if (type === 'releaseWorker') {
        await API.patch(`/labors/release-site/${workerId}`, { siteName });
        const text = `✅ Worker released from ${siteName}.`;
        showStatusMessage('success', text);
        setWorkerModalMessage({ type: 'success', text });
      }
      await fetchSites();
      await fetchManagersAndWorkers();
    } catch (error) {
      const msg = error.response?.data?.message || error.message;
      const text = `❌ Action failed: ${msg}`;
      showStatusMessage('error', text);
      setWorkerModalMessage(prev => prev.text ? prev : { type: 'error', text });
      setManagerModalMessage(prev => prev.text ? prev : { type: 'error', text });
    } finally {
      closeConfirmation();
    }
  };

  // --- inventory ---
  const fetchSiteInventory = async (siteId) => {
    try {
      const { data } = await API.get(`/sites/inventory/${siteId}`);
      setSiteInventory(prev => ({ ...prev, [siteId]: data }));
    } catch {
      showStatusMessage('error', 'Failed to fetch site inventory.');
    }
  };

  const handleUsageInputChange = (siteId, inventoryId, value) => {
    setUsageInputs(prev => ({
      ...prev,
      [siteId]: {
        ...(prev[siteId] || {}),
        [inventoryId]: Number(value),
      },
    }));
  };

  const handleUseAllocatedInventory = async (siteId, inventoryId) => {
    const qty = usageInputs[siteId]?.[inventoryId] || 0;
    if (qty <= 0) {
      showStatusMessage('error', 'Enter a positive quantity to mark as used.');
      return;
    }

    try {
      await API.patch(`/sites/inventory-usage/${siteId}`, {
        inventoryId,
        quantityUsed: qty,
      });
      showStatusMessage('success', 'Inventory usage recorded successfully.');
      setUsageInputs(prev => ({
        ...prev,
        [siteId]: { ...(prev[siteId] || {}), [inventoryId]: 0 },
      }));
      fetchSiteInventory(siteId);
      fetchSites();
    } catch (error) {
      const msg = error.response?.data?.message || error.message;
      showStatusMessage('error', `❌ Failed to record usage: ${msg}`);
    }
  };

  // --- Rendering helpers ---

  const renderActionButtons = (site) => {
    const canUpdate = isAuthorizedToUpdate(site);
    const canAssignWorkers = isAuthorizedToAssignWorkers(site);
    const canAssignManager = isAuthorizedToAssignManager(site);

    return (
      <div className="site-actions">
        {canAssignWorkers && (
          <button
            className="btn-assign-worker"
            type="button"
            onClick={() => openWorkerModal(site)}
          >
            👷 Manage Workers
          </button>
        )}

        {canAssignManager && (
          <button
            className="btn-assign-manager"
            type="button"
            onClick={() => openManagerModal(site)}
          >
            👔 Manage Manager
          </button>
        )}

        {canUpdate && (
          <button
            className="btn-update-progress"
            type="button"
            onClick={() => openUpdateModal(site)}
          >
            ✏️ Update Tasks & Status
          </button>
        )}

        {currentUserRole === 'admin' && (
          <button
            className="btn-delete"
            type="button"
            onClick={() =>
              confirmAction({
                type: 'deleteSite',
                siteId: site._id,
                siteName: site.siteName,
              })
            }
          >
            🗑️ Delete
          </button>
        )}

        {!canUpdate && !canAssignWorkers && !canAssignManager && (
          <span className="view-only-tag">View Only</span>
        )}
      </div>
    );
  };

  const renderAllocatedInventorySection = (site) => {
    const allocations = siteInventory[site._id] || [];
    const canUse = isAuthorizedToUpdate(site);

    return (
      <div className="allocated-inventory-section">
        <h4>Allocated Inventory</h4>
        {allocations.length > 0 ? (
          <div className="inventory-card">
            <div className="inventory-header">
              <span>Item</span>
              <span>Allocated</span>
              <span>Used</span>
              <span>Remaining</span>
              {canUse && <span>Action</span>}
            </div>
            <div className="inventory-body">
              {allocations.map(alloc => {
                const remaining =
                  alloc.allocatedQuantity - alloc.usedQuantity;
                const usageValue =
                  usageInputs[site._id]?.[alloc.inventoryItem] || 0;

                return (
                  <div
                    key={alloc.inventoryItem}
                    className="inventory-row"
                  >
                    <div className="inv-item">
                      <span className="inv-name">
                        {alloc.itemName}
                      </span>
                      <span className="inv-unit">
                        {alloc.unit}
                      </span>
                    </div>
                    <span>{alloc.allocatedQuantity}</span>
                    <span>{alloc.usedQuantity}</span>
                    <span className={remaining === 0 ? 'inv-zero' : ''}>
                      {remaining}
                    </span>

                    {canUse ? (
                      remaining > 0 ? (
                        <div className="inv-actions">
                          <input
                            type="number"
                            min="1"
                            max={remaining}
                            value={usageValue}
                            onChange={(e) =>
                              handleUsageInputChange(
                                site._id,
                                alloc.inventoryItem,
                                e.target.value
                              )
                            }
                            placeholder="Qty"
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
                        </div>
                      ) : (
                        <span className="inv-tag-full">Fully used</span>
                      )
                    ) : (
                      <span className="inv-tag-view">
                        View only
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="no-allocated-message">
            No inventory allocated yet for this site.
          </p>
        )}
      </div>
    );
  };

  // --- JSX ---

  return (
    <div className="sites-page">
      <h1>Sites & Tasks Management</h1>

      {message.text && (
        <div className={`status-box status-box-${message.type}`}>
          {message.text}
        </div>
      )}

      {/* Confirmation modal */}
      {confirmationData && (
        <div className="confirmation-overlay">
          <div className="confirmation-modal">
            <h3>⚠️ Confirm Action</h3>
            <p>
              {confirmationData.type === 'deleteSite' &&
                `Are you sure you want to permanently delete site "${confirmationData.siteName}"?`}
              {confirmationData.type === 'releaseManager' &&
                `Release the manager from site "${confirmationData.siteName}"?`}
              {confirmationData.type === 'releaseWorker' &&
                `Release this worker from site "${confirmationData.siteName}"?`}
            </p>
            <div className="modal-actions">
              <button className="btn-delete" onClick={handleConfirmedAction}>
                Yes, Confirm
              </button>
              <button className="btn-cancel" onClick={closeConfirmation}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add site form or permission message */}
      {currentUserRole === 'admin' ? (
        <>
          <button
            className="btn-toggle-form"
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            {showAddForm ? 'Hide Add Site Form' : '➕ Add New Site'}
          </button>

          {showAddForm && (
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
                <option value="">Select Manager (optional)</option>
                {managers.map(m => (
                  <option key={m._id} value={m._id}>
                    {m.name} ({m.role})
                  </option>
                ))}
              </select>
              <textarea
                name="otherDetails"
                placeholder="Other details / description"
                value={formData.otherDetails}
                onChange={handleChange}
                rows={3}
              />
              <input type="file" accept="image/*" onChange={handleFileChange} />
              <button type="submit">Submit New Site</button>
            </form>
          )}
        </>
      ) : (
        <div className="site-add-form permission-message">
          <p>
            🔒 <strong>View Only Mode</strong> You do not have permission to add sites.
          </p>
        </div>
      )}

      {/* Update modal */}
      {showUpdateModal && (
        <div className="modal-overlay">
          <div className="site-update-modal">
            <h3>Update Site: {showUpdateModal.siteName}</h3>

            {/* Tasks */}
            <h4>Tasks</h4>
            <div className="task-list">
              {showUpdateModal.tasks.map(task => (
                <div
                  key={task._id}
                  className={`task-item ${task.isCompleted ? 'completed' : ''}`}
                >
                  <label>
                    <input
                      type="checkbox"
                      checked={task.isCompleted}
                      onChange={() => handleTaskToggle(showUpdateModal, task)}
                    />
                    {task.name}
                  </label>
                </div>
              ))}
            </div>

            {/* Allocated inventory */}
            {renderAllocatedInventorySection(showUpdateModal)}

            {/* Admin controls */}
            {currentUserRole === 'admin' && (
              <div className="admin-controls-group">
                <h4>Admin Controls</h4>
                <div className="control-item">
                  <label>Overall Status</label>
                  <select
                    value={showUpdateModal.status}
                    onChange={(e) =>
                      handleStatusChange(showUpdateModal._id, e.target.value)
                    }
                  >
                    <option value="Planned">Planned</option>
                    <option value="Active">Active</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>
            )}

            {/* Comment section */}
            <form onSubmit={handleUpdateSubmit}>
              <div className="comment-section">
                <div className="comment-meta">
                  <span>Update as {currentUserName}</span>
                  <span
                    className={
                      updateComment.length > COMMENT_MAX
                        ? 'comment-remaining over-limit'
                        : 'comment-remaining'
                    }
                  >
                    {updateComment.length}/{COMMENT_MAX}
                  </span>
                </div>
                <p className="comment-helper">
                  Add an optional status comment. This will appear as the latest
                  update on the site card.
                </p>
                <textarea
                  className="comment-textarea"
                  value={updateComment}
                  onChange={(e) => setUpdateComment(e.target.value)}
                  maxLength={COMMENT_MAX + 20}
                  placeholder="Eg: Completed slab work and started brickwork on the first floor."
                />
              </div>

              <div className="modal-actions">
                <button type="submit" className="btn-action">
                  Save Update
                </button>
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={closeUpdateModal}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Worker assignment modal */}
      {showWorkerModal && (
        <div className="modal-overlay">
          <div className="worker-assignment-modal">
            <h3>Manage Team: {showWorkerModal.siteName}</h3>

            {workerModalMessage.text && (
              <div className={`inline-status inline-status-${workerModalMessage.type}`}>
                {workerModalMessage.text}
              </div>
            )}

            <h4>Current Team</h4>
            <div className="team-management-list">
              {showWorkerModal.team && showWorkerModal.team.length > 0 ? (
                showWorkerModal.team.map(member => (
                  <div key={member._id} className="team-member-item">
                    <span>
                      {member.name} ({member.category || member.role})
                    </span>
                    <button
                      className="btn-release"
                      type="button"
                      onClick={() =>
                        confirmAction({
                          type: 'releaseWorker',
                          workerId: member._id,
                          siteName: showWorkerModal.siteName,
                        })
                      }
                    >
                      Release
                    </button>
                  </div>
                ))
              ) : (
                <p className="no-workers-msg">No workers assigned yet.</p>
              )}
            </div>

            <h4>Assign New Workers</h4>
            <select
              className="select-category"
              value={selectedCategory}
              onChange={handleCategoryChange}
            >
              <option value="">Filter by category</option>
              {workerCategories.map(cat => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            <div className="available-worker-list">
              {availableWorkers.length > 0 ? (
                availableWorkers.map(worker => (
                  <div key={worker._id} className="available-worker-item">
                    <span>
                      {worker.name} ({worker.category})
                    </span>
                    <button
                      className="btn-assign"
                      type="button"
                      onClick={() =>
                        assignWorkerToSite(worker, showWorkerModal)
                      }
                    >
                      Assign
                    </button>
                  </div>
                ))
              ) : (
                <p className="no-workers-msg">
                  {selectedCategory
                    ? 'No available workers in this category.'
                    : 'Select a category to see available workers.'}
                </p>
              )}
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => {
                  setShowWorkerModal(null);
                  setWorkerModalMessage({ type: '', text: '' });
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manager assignment modal */}
      {showManagerModal && (
        <div className="modal-overlay">
          <div className="manager-assignment-modal">
            <h3>Manage Manager: {showManagerModal.siteName}</h3>

            {managerModalMessage.text && (
              <div className={`inline-status inline-status-${managerModalMessage.type}`}>
                {managerModalMessage.text}
              </div>
            )}

            <div className="current-manager-block">
              <p>
                <strong>Current:</strong>{' '}
                {showManagerModal.managerName || 'Unassigned'}
              </p>
            </div>

            <h4>Assign New Manager</h4>
            <select
              className="select-manager"
              value={selectedManagerId}
              onChange={(e) => setSelectedManagerId(e.target.value)}
            >
              <option value="">Select manager</option>
              {managers.map(m => (
                <option key={m._id} value={m._id}>
                  {m.name} ({m.role})
                </option>
              ))}
            </select>

            <div className="modal-actions">
              <button
                type="button"
                className="btn-action"
                onClick={handleAssignManager}
              >
                Save Manager
              </button>

              {showManagerModal.managerId && (
                <button
                  type="button"
                  className="btn-release-manager"
                  onClick={() =>
                    confirmAction({
                      type: 'releaseManager',
                      siteId: showManagerModal._id,
                      siteName: showManagerModal.siteName,
                      managerId: showManagerModal.managerId,
                    })
                  }
                >
                  Unassign Manager
                </button>
              )}

              <button
                type="button"
                className="btn-cancel"
                onClick={closeManagerModal}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sites list */}
      <div className="site-list">
        <h2>Active Sites ({sites.length})</h2>
        <div className="site-grid">
          {sites.map(site => {
            const lastUpdate =
              site.updates && site.updates.length > 0
                ? site.updates[site.updates.length - 1]
                : null;

            return (
              <div
                key={site._id}
                className={`site-card status-${site.status
                  .toLowerCase()
                  .replace(/\s/g, '')}`}
              >
                <img
                  src={
                    site.siteImage
                      ? `${BACKEND_HOST}${site.siteImage}`
                      : DEFAULT_IMAGE_URL
                  }
                  alt={site.siteName}
                  className="site-image"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = DEFAULT_IMAGE_URL;
                  }}
                />

                <div className="card-content">
                  <h3>{site.siteName}</h3>
                  <p>
                    <strong>Manager:</strong>{' '}
                    {site.managerName || 'Unassigned'}
                  </p>
                  <p>
                    <strong>Current Step:</strong> {site.currentStatus}
                  </p>
                  <p>
                    <strong>Total Progress:</strong>{' '}
                    <span className="progress-value">
                      {calculateProgress(site.tasks)}%
                    </span>
                  </p>
                  <p>
                    <strong>Overall Status:</strong>{' '}
                    <span
                      className={`status-badge status-${site.status
                        .toLowerCase()
                        .replace(/\s/g, '')}`}
                    >
                      {site.status}
                    </span>
                  </p>

                  {/* Team display */}
                  <div className="team-list">
                    <p className="team-header">
                      <strong>Team ({site.team?.length || 0}):</strong>
                    </p>
                    {site.team && site.team.length > 0 ? (
                      <ul>
                        {site.team.map(member => (
                          <li
                            key={member._id}
                            className={`team-role-${member.role
                              .toLowerCase()
                              .replace(/\s/g, '')}`}
                          >
                            {member.name} ({member.category || member.role})
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="unassigned-message">No workers assigned.</p>
                    )}
                  </div>

                  {/* Latest update card */}
                  {lastUpdate && (
                    <div className="latest-update-card">
                      <div className="latest-update-header">
                        <span className="latest-update-label">
                          Latest update
                        </span>
                        <span className="latest-update-date">
                          {formatDate(lastUpdate.date)}
                        </span>
                      </div>
                      <p className="latest-update-comment">
                        {lastUpdate.comment}
                      </p>
                      <div className="latest-update-footer">
                        <span className="latest-update-author">
                          {lastUpdate.userName}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {renderAllocatedInventorySection(site)}
                {renderActionButtons(site)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default SitesTasks;