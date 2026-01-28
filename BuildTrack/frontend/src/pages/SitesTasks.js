import React, { useState, useEffect } from 'react';
import API from '../services/api';
import { getRole, getUserId, getUserName } from '../services/auth';
import '../styles/sitesTasks.css'; 
import { useLanguage } from "../contexts/LanguageContext";

const BACKEND_HOST = "http://localhost:5000"; 
const DEFAULT_IMAGE_URL = `${BACKEND_HOST}/uploads/default-site.jpg`; 
const COMMENT_MAX = 280;

function SitesTasks() {
    const { t } = useLanguage();
    const [sites, setSites] = useState([]);
    const [showAddForm, setShowAddForm] = useState(false);
    
    // Data States
    const [managers, setManagers] = useState([]); 
    const [allWorkers, setAllWorkers] = useState([]); 
    const [siteInventory, setSiteInventory] = useState({}); 
    const [usageInputs, setUsageInputs] = useState({});

    const [formData, setFormData] = useState({
        siteName: '', managerId: '', managerName: '', siteImage: null, otherDetails: '',
    });
    
    // --- UI States for Modals ---
    const [showUpdateModal, setShowUpdateModal] = useState(null); 
    const [updateComment, setUpdateComment] = useState('');
    
    const [showWorkerModal, setShowWorkerModal] = useState(null); 
    const [selectedCategory, setSelectedCategory] = useState('');
    const [availableWorkers, setAvailableWorkers] = useState([]); 

    // Manager Modal States
    const [showManagerModal, setShowManagerModal] = useState(null);
    const [selectedManagerId, setSelectedManagerId] = useState('');
    
    // Status & Confirmation
    const [message, setMessage] = useState({ type: '', text: '' }); 
    const [confirmationData, setConfirmationData] = useState(null); 
    
    const currentUserRole = getRole();
    const currentUserId = getUserId(); 
    const currentUserName = getUserName(); 
    
    const workerCategories = [
        "Mason", "Plumber", "Electrician", "Carpenter", "Painter", 
        "Welder", "Steel Fixer", "Supervisor", "Helper",
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
            setManagers(data.filter(labor => labor.role === 'Manager' || labor.role === 'admin'));
            setAllWorkers(data.filter(labor => labor.role === 'Worker'));
        } catch (error) {
            showStatusMessage('error', 'Failed to fetch manager and worker data.');
        }
    };

    const loadAllSitesInventory = async (sitesList) => {
        try {
            const result = {};
            await Promise.all(sitesList.map(async (s) => {
                try {
                    const { data } = await API.get(`/sites/inventory/${s._id}`);
                    result[s._id] = data;
                } catch { result[s._id] = []; }
            }));
            setSiteInventory(result);
        } catch {}
    };

    const fetchSiteInventory = async (siteId) => {
        try {
            const { data } = await API.get(`/sites/inventory/${siteId}`);
            setSiteInventory(prev => ({ ...prev, [siteId]: data }));
        } catch {
            showStatusMessage('error', 'Failed to fetch site inventory.');
        }
    };

    const fetchSites = async () => {
        try {
            const { data } = await API.get('/sites');
            setSites(data);
            loadAllSitesInventory(data);
        } catch (error) {
            showStatusMessage('error', 'Failed to fetch site data.');
        }
    };

    // --- RBAC Helpers ---
    const isCurrentUserManager = (siteManagerId) => currentUserId && siteManagerId && currentUserId === siteManagerId;
    const isAuthorizedToUpdate = (site) => currentUserRole === 'admin' || isCurrentUserManager(site.managerId);
    const isAuthorizedToAssignWorkers = (site) => currentUserRole === 'admin' || isCurrentUserManager(site.managerId);
    const isAuthorizedToAssignManager = (site) => currentUserRole === 'admin';

    const calculateProgress = (tasks) => {
        if (!tasks || tasks.length === 0) return 0;
        const completed = tasks.filter(t => t.isCompleted).length;
        return ((completed / tasks.length) * 100).toFixed(0);
    };
    const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleDateString() : 'N/A';

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleManagerSelect = (e) => {
        const selectedManager = managers.find(m => m._id === e.target.value);
        setFormData({
            ...formData,
            managerId: selectedManager ? selectedManager._id : '',
            managerName: selectedManager ? selectedManager.name : '',
        });
    };

    const handleFileChange = (e) => setFormData({ ...formData, siteImage: e.target.files[0] });

    // --- Inventory Usage ---
    const handleUsageInputChange = (siteId, inventoryId, value) => {
        setUsageInputs(prev => ({
            ...prev,
            [siteId]: { ...(prev[siteId] || {}), [inventoryId]: Number(value) },
        }));
    };

    const handleUseAllocatedInventory = async (siteId, inventoryId) => {
        const qty = usageInputs[siteId]?.[inventoryId] || 0;
        if (qty <= 0) return showStatusMessage('error', 'Enter a positive quantity.');

        try {
            await API.patch(`/sites/inventory-usage/${siteId}`, { inventoryId, quantityUsed: qty });
            showStatusMessage('success', 'Inventory usage recorded.');
            setUsageInputs(prev => ({
                ...prev,
                [siteId]: { ...(prev[siteId] || {}), [inventoryId]: 0 },
            }));
            fetchSiteInventory(siteId);
            fetchSites();
        } catch (error) {
            showStatusMessage('error', `❌ Failed to record usage: ${error.response?.data?.message}`);
        }
    };

    // --- Add Site ---
    const handleAddSubmit = async (e) => {
        e.preventDefault();
        if (currentUserRole !== 'admin') return showStatusMessage('error', '❌ Permission Denied.');
        
        const data = new FormData();
        data.append('siteName', formData.siteName);
        data.append('managerId', formData.managerId);
        data.append('managerName', formData.managerName);
        data.append('otherDetails', formData.otherDetails);
        if (formData.siteImage) data.append('siteImage', formData.siteImage);
        
        try {
            await API.post('/sites', data, { headers: { "Content-Type": "multipart/form-data" }});
            showStatusMessage('success', '✅ Site added!');
            setFormData({ siteName: '', managerId: '', managerName: '', siteImage: null, otherDetails: '' });
            setShowAddForm(false);
            fetchSites();
            fetchManagersAndWorkers(); 
        } catch (error) {
            showStatusMessage('error', `❌ Failed to add site: ${error.response?.data?.message}`);
        }
    };
    
    // --- Worker Logic ---
    const openWorkerModal = (site) => {
        if (!isAuthorizedToAssignWorkers(site)) return showStatusMessage('error', "❌ Not authorized.");
        setShowWorkerModal(site);
        setSelectedCategory('');
        setAvailableWorkers([]);
    };

    const handleCategoryChange = (e) => {
        const category = e.target.value;
        setSelectedCategory(category);
        if (category) {
            const available = allWorkers.filter(w => w.category === category && (!w.sites || w.sites.length === 0));
            setAvailableWorkers(available);
        } else {
            setAvailableWorkers([]);
        }
    };
    
    const handleAssignWorker = async (workerId, workerName) => {
        try {
            await API.patch(`/labors/${workerId}`, { site: showWorkerModal.siteName });
            showStatusMessage('success', `✅ ${workerName} assigned!`);
            fetchSites();
            fetchManagersAndWorkers();
            setShowWorkerModal(null); 
        } catch (error) {
            showStatusMessage('error', `❌ Failed to assign: ${error.response?.data?.message}`);
        }
    };

    const initiateReleaseWorker = (workerId, workerName, siteName) => {
        setConfirmationData({ type: 'releaseWorker', workerId, workerName, siteName });
    };
    
    const executeReleaseWorker = async () => {
        const { workerId, workerName, siteName } = confirmationData;
        try {
            await API.patch(`/labors/${workerId}`, { site: null });
            showStatusMessage('success', `✅ ${workerName} released!`);
            fetchSites();
            fetchManagersAndWorkers();
            setShowWorkerModal(null); 
        } catch (error) {
            showStatusMessage('error', `❌ Failed to release: ${error.response?.data?.message}`);
        } finally {
            setConfirmationData(null);
        }
    };

    // --- Manager Logic (Dedicated Modal) ---
    const openManagerModal = (site) => {
        if (!isAuthorizedToAssignManager(site)) return showStatusMessage('error', '❌ Not authorized.');
        setShowManagerModal(site);
        setSelectedManagerId(site.managerId || '');
    };

    const handleAssignManager = async () => {
        if (!selectedManagerId) return showStatusMessage('error', 'Please select a manager.');
        const manager = managers.find(m => m._id === selectedManagerId);
        if (!manager) return showStatusMessage('error', 'Manager not found.');

        const siteId = showManagerModal._id;
        const oldManagerId = showManagerModal.managerId;
        const siteName = showManagerModal.siteName;

        try {
            // 1. Unassign old
            if (oldManagerId) {
                await API.patch(`/labors/manager-site/${oldManagerId}`, { siteName, action: 'deassign' }).catch(console.error);
            }
            // 2. Assign new
            await API.patch(`/labors/manager-site/${manager._id}`, { siteName, action: 'assign' });
            // 3. Update Site
            await API.patch(`/sites/${siteId}`, { managerId: manager._id, managerName: manager.name });

            showStatusMessage('success', `✅ Manager assigned to ${siteName}.`);
            setShowManagerModal(null);
            fetchSites();
            fetchManagersAndWorkers();
        } catch (error) {
            showStatusMessage('error', `❌ Failed to assign manager: ${error.response?.data?.message}`);
        }
    };

    const initiateReleaseManager = (siteId, siteName) => {
        if (currentUserRole !== 'admin') return showStatusMessage('error', "❌ Only Admin can release managers.");
        setConfirmationData({ type: 'releaseManager', id: siteId, siteName });
    };

    const executeReleaseManager = async () => {
        const { id: siteId } = confirmationData;
        try {
            await API.patch(`/sites/manager-release/${siteId}`);
            setShowManagerModal(null); 
            setShowUpdateModal(null); 
            fetchSites();
            fetchManagersAndWorkers();
            showStatusMessage('success', "Manager released.");
        } catch (error) {
            showStatusMessage('error', `❌ Failed: ${error.response?.data?.message}`);
        } finally {
            setConfirmationData(null);
        }
    };
    
    // --- Update & Status Logic ---
    const handleTaskToggle = async (siteId, taskId, isCompleted, siteManagerId) => {
        if (!isAuthorizedToUpdate({ _id: siteId, managerId: siteManagerId })) return showStatusMessage('error', "❌ Not authorized.");
        try {
            await API.patch(`/sites/${siteId}`, { taskId, isCompleted: !isCompleted });
            fetchSites(); 
        } catch (error) {
            showStatusMessage('error', `❌ Failed to update task: ${error.response?.data?.message}`);
        }
    };

    const handleCommentSubmit = async (e) => {
        e.preventDefault();
        const siteId = showUpdateModal._id;
        if (!isAuthorizedToUpdate(showUpdateModal) || !updateComment.trim()) return showStatusMessage('error', "❌ Invalid comment.");

        if (updateComment.length > COMMENT_MAX) {
            return showStatusMessage('error', `Comment exceeds ${COMMENT_MAX} characters.`);
        }

        try {
            await API.patch(`/sites/${siteId}`, { comment: updateComment.trim() });
            setUpdateComment('');
            setShowUpdateModal(null); 
            fetchSites();
            showStatusMessage('success', '✅ Comment added.');
        } catch (error) {
            showStatusMessage('error', `❌ Failed: ${error.response?.data?.message}`);
        }
    };
    
    const handleStatusChange = async (newStatus) => {
        if (!isAuthorizedToUpdate(showUpdateModal)) return showStatusMessage('error', "❌ Not authorized.");
        const siteId = showUpdateModal._id;
        try {
            await API.patch(`/sites/status/${siteId}`, { status: newStatus });
            showStatusMessage('success', `✅ Status updated.`);
            setShowUpdateModal(null);
            fetchSites();
        } catch (error) {
            showStatusMessage('error', `❌ Failed: ${error.response?.data?.message}`);
        }
    };

    // --- Delete Logic ---
    const initiateDeleteSite = (siteId, siteName) => {
        if (currentUserRole !== 'admin') return showStatusMessage('error', "❌ Only Admin can delete sites.");
        setConfirmationData({ type: 'deleteSite', id: siteId, siteName });
    };
    
    const executeDeleteSite = async () => {
        const { id: siteId, siteName } = confirmationData;
        try {
            await API.delete(`/sites/${siteId}`);
            showStatusMessage('success', `✅ Site "${siteName}" deleted.`);
            fetchSites(); 
            fetchManagersAndWorkers();
        } catch (error) {
            showStatusMessage('error', `❌ Failed to delete: ${error.response?.data?.message}`);
        } finally {
            setConfirmationData(null);
        }
    };

    // --- Inventory Render ---
    const renderAllocatedInventorySection = (site) => {
        const allocations = siteInventory[site._id] || [];
        const canUse = isAuthorizedToUpdate(site);
        return (
            <div className="allocated-inventory-section">
                <h4>Allocated Inventory</h4>
                {allocations.length > 0 ? (
                    <div className="inventory-card">
                        <div className="inventory-header">
                            <span>Item</span><span>Allocated</span><span>Used</span><span>Left</span>{canUse && <span>Action</span>}
                        </div>
                        <div className="inventory-body">
                            {allocations.map(alloc => {
                                const remaining = alloc.allocatedQuantity - alloc.usedQuantity;
                                const usageValue = usageInputs[site._id]?.[alloc.inventoryItem] || 0;
                                return (
                                    <div key={alloc.inventoryItem} className="inventory-row">
                                        <div className="inv-item"><span className="inv-name">{alloc.itemName}</span><span className="inv-unit">{alloc.unit}</span></div>
                                        <span>{alloc.allocatedQuantity}</span><span>{alloc.usedQuantity}</span>
                                        <span className={remaining === 0 ? 'inv-zero' : ''}>{remaining}</span>
                                        {canUse ? (remaining > 0 ? (
                                                <div className="inv-actions">
                                                    <input type="number" min="1" max={remaining} value={usageValue} onChange={(e) => handleUsageInputChange(site._id, alloc.inventoryItem, e.target.value)} placeholder="Qty" />
                                                    <button type="button" onClick={() => handleUseAllocatedInventory(site._id, alloc.inventoryItem)}>Use</button>
                                                </div>
                                            ) : <span className="inv-tag-full">Fully used</span>
                                        ) : <span className="inv-tag-view">View only</span>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : <p className="no-allocated-message">No inventory allocated yet.</p>}
            </div>
        );
    };

    // --- Modals Render ---
    const renderConfirmationModal = () => {
        if (!confirmationData) return null;
        const { type, siteName, workerName } = confirmationData;
        let title = "Confirm", message = "", action = null, actionLabel = "Confirm", isDestructive = false;

        if (type === 'deleteSite') {
            title = "⚠️ Delete Site Warning"; message = `Permanently delete "${siteName}"?`; action = executeDeleteSite; actionLabel = "Delete"; isDestructive = true;
        } else if (type === 'releaseWorker') {
            title = "Release Worker"; message = `Release ${workerName} from ${siteName}?`; action = executeReleaseWorker; actionLabel = "Release";
        } else if (type === 'releaseManager') {
            title = "Release Manager"; message = `Release manager from ${siteName}?`; action = executeReleaseManager; actionLabel = "Release";
        }

        return (
            <div className="confirmation-overlay"> 
                <div className="confirmation-modal">
                    <h3>{title}</h3><p>{message}</p>
                    <div className="modal-actions">
                        <button type="button" className={isDestructive ? 'btn-delete' : 'btn-action'} onClick={action}>{actionLabel}</button>
                        <button type="button" className="btn-cancel" onClick={() => setConfirmationData(null)}>Cancel</button>
                    </div>
                </div>
            </div>
        );
    };

    const renderManagerModal = () => {
        if (!showManagerModal) return null;
        return (
            <div className="modal-overlay">
                <div className="manager-assignment-modal">
                    <h3>Manage Manager: {showManagerModal.siteName}</h3>
                    <div className="current-manager-block">
                        <p><strong>Current:</strong> {showManagerModal.managerName || 'Unassigned'}</p>
                    </div>
                    <h4>Assign New Manager</h4>
                    <select className="select-manager" value={selectedManagerId} onChange={(e) => setSelectedManagerId(e.target.value)}>
                        <option value="">Select manager</option>
                        {managers.map(m => (<option key={m._id} value={m._id}>{m.name} ({m.role})</option>))}
                    </select>
                    <div className="modal-actions">
                        <button type="button" className="btn-action" onClick={handleAssignManager}>Save Manager</button>
                        {showManagerModal.managerId && (
                            <button type="button" className="btn-release-manager" onClick={() => initiateReleaseManager(showManagerModal._id, showManagerModal.siteName)}>Unassign Manager</button>
                        )}
                        <button type="button" className="btn-cancel" onClick={() => { setShowManagerModal(null); setSelectedManagerId(''); }}>Close</button>
                    </div>
                </div>
            </div>
        );
    };

    const renderWorkerModal = () => {
        if (!showWorkerModal) return null;
        return (
            <div className="modal-overlay">
                <div className="worker-assignment-modal">
                    <h3>Manage Team for: {showWorkerModal.siteName}</h3>
                    <h4>Current Team ({showWorkerModal.team.length}):</h4>
                    <div className="team-management-list">
                        {showWorkerModal.team.length > 0 ? showWorkerModal.team.map(worker => (
                            <div key={worker._id} className="team-member-item">
                                <span>{worker.name} ({worker.category})</span>
                                <button className="btn-release" onClick={() => initiateReleaseWorker(worker._id, worker.name, showWorkerModal.siteName)}>Release</button>
                            </div>
                        )) : <p className="no-workers-msg">No workers assigned.</p>}
                    </div>
                    <h4>Assign New Worker:</h4>
                    <select value={selectedCategory} onChange={handleCategoryChange} className="select-category">
                        <option value="">Select Worker Category</option>
                        {workerCategories.map(cat => (<option key={cat} value={cat}>{cat}</option>))}
                    </select>
                    <div className="available-worker-list">
                        {selectedCategory ? (availableWorkers.length > 0 ? availableWorkers.map(worker => (
                            <div key={worker._id} className="available-worker-item">
                                <span>{worker.name}</span>
                                <button className="btn-assign" onClick={() => handleAssignWorker(worker._id, worker.name)}>Assign</button>
                            </div>
                        )) : <p className="no-workers-msg">No unassigned workers available.</p>) : <p className="no-workers-msg">Select a category.</p>}
                    </div>
                    <div className="modal-actions"><button type="button" className="btn-cancel" onClick={() => setShowWorkerModal(null)}>Close</button></div>
                </div>
            </div>
        );
    };

    const renderUpdateModal = () => {
        if (!showUpdateModal) return null;
        return (
            <div className="modal-overlay">
                <form className="site-update-modal" onSubmit={handleCommentSubmit}>
                    <h3>Update Site: {showUpdateModal.siteName}</h3>
                    
                    {/* 1. Tasks List */}
                    <h4>Tasks Progress ({calculateProgress(showUpdateModal.tasks)}%):</h4>
                    <div className="task-list">
                        {showUpdateModal.tasks.map(task => (
                            <div key={task._id} className={`task-item ${task.isCompleted ? 'completed' : ''}`}>
                                <label>
                                    <input type="checkbox" checked={task.isCompleted} onChange={() => handleTaskToggle(showUpdateModal._id, task._id, task.isCompleted, showUpdateModal.managerId)}/>
                                    {task.name}
                                </label>
                            </div>
                        ))}
                    </div>

                    {/* 2. Inventory Section */}
                    {renderAllocatedInventorySection(showUpdateModal)}

                    {/* 3. Admin Controls (Status) */}
                    {currentUserRole === 'admin' && (
                        <div className="admin-controls-group">
                            <h4>Admin Controls</h4>
                            <div className="control-item">
                                <label>Change Status:</label>
                                <select value={showUpdateModal.status} onChange={(e) => handleStatusChange(e.target.value)}>
                                    <option value="Active">Active</option><option value="Planned">Planned</option>
                                    <option value="On Hold">On Hold</option><option value="Completed">Completed</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {/* 4. Detailed Comment Section */}
                    <div className="comment-section">
                        <div className="comment-meta">
                            <span>Update as {currentUserName}</span>
                            <span className={updateComment.length > COMMENT_MAX ? "comment-remaining over-limit" : "comment-remaining"}>
                                {updateComment.length}/{COMMENT_MAX}
                            </span>
                        </div>
                        <p className="comment-helper">
                            Add an optional status comment. This will appear as the latest update on the site card.
                        </p>
                        <textarea
                            className="comment-textarea"
                            value={updateComment}
                            onChange={(e) => setUpdateComment(e.target.value)}
                            maxLength={COMMENT_MAX + 20}
                            placeholder="Eg: Completed slab work and started brickwork on the first floor."
                            rows="4"
                        />
                    </div>

                    <div className="modal-actions">
                        <button type="submit" className="btn-action">Save Update</button>
                        <button type="button" className="btn-cancel" onClick={() => setShowUpdateModal(null)}>Cancel</button>
                    </div>
                </form>
            </div>
        );
    };

    const renderActionButtons = (site) => {
        const canUpdate = isAuthorizedToUpdate(site);
        const canAssignWorker = isAuthorizedToAssignWorkers(site);
        const canAssignManager = isAuthorizedToAssignManager(site); // Admin only

        return (
            <div className="site-actions">
                {/* Manage Workers Button */}
                {canAssignWorker && (
                    <button className="btn-assign-worker" onClick={() => openWorkerModal(site)}>
                        <span className="btn-icon-span">👷</span>
                        Manage Workers
                    </button>
                )}
                
                {/* Manage Manager Button */}
                {canAssignManager && (
                    <button className="btn-assign-manager" onClick={() => openManagerModal(site)}>
                        <span className="btn-icon-span">👔</span>
                        Manage Manager
                    </button>
                )}

                {canUpdate ? (
                    <>
                        {/* Update Button */}
                        <button className="btn-update-progress" onClick={() => { setShowUpdateModal(site); fetchSiteInventory(site._id); }}>
                            <span className="btn-icon-span">✏️</span>
                            Update Tasks & Status
                        </button>
                        
                        {/* Delete Button */}
                        {currentUserRole === 'admin' && (
                            <button className="btn-delete" onClick={() => initiateDeleteSite(site._id, site.siteName)}>
                                <span className="btn-icon-span">🗑️</span>
                                Delete
                            </button>
                        )}
                    </>
                ) : (
                    /* View Only Tag (Hidden if actions exist) */
                    (!canAssignWorker && !canAssignManager) && (
                        <span className="view-only-tag">View Only</span>
                    )
                )}
            </div>
        );
    };

    return (
        <div className="sites-page">
            <h1>{t('sitesTitle')}</h1>
            {message.text && <div className={`status-box status-box-${message.type}`}>{message.text}</div>}
            {renderConfirmationModal()} 
            {renderManagerModal()} {/* Render Manager Modal */}

            {currentUserRole === 'admin' ? (
                <>
                    <button className="btn-toggle-form" onClick={() => setShowAddForm(!showAddForm)}>
                        {showAddForm ? 'Hide Add Site Form' : `➕ ${t('addSite')}`}
                    </button>
                    {showAddForm && (
                        <form className="site-add-form" onSubmit={handleAddSubmit} encType="multipart/form-data">
                            <h2>Add New Site</h2>
                            <input type="text" name="siteName" placeholder="Site Name" value={formData.siteName} onChange={handleChange} required />
                            <select name="managerId" value={formData.managerId} onChange={handleManagerSelect} required>
                                <option value="">Select Site Manager</option>
                                {managers.map(m => (<option key={m._id} value={m._id}>{m.name} ({m.role})</option>))}
                            </select>
                            <input type="file" name="siteImage" accept=".png, .jpg, .jpeg" onChange={handleFileChange} />
                            <textarea name="otherDetails" placeholder="Other Details" value={formData.otherDetails} onChange={handleChange} rows="2" />
                            <button type="submit">Create Site</button>
                        </form>
                    )}
                </>
            ) : <div className="site-add-form permission-message"><p>🔒 <strong>View Only Mode</strong></p></div>}
            
            {renderUpdateModal()}
            {renderWorkerModal()}

            <div className="site-list">
                <h2>Active Sites ({sites.length})</h2>
                <div className="site-grid">
                    {sites.map(site => (
                        <div key={site._id} className={`site-card status-${site.status.toLowerCase().replace(/\s/g, '')}`}>
                            <img src={site.siteImage ? `${BACKEND_HOST}${site.siteImage}` : DEFAULT_IMAGE_URL} alt={site.siteName} className="site-image"/>
                            <div className="card-content">
                                <h3>{site.siteName}</h3>
                                <p><strong>Manager:</strong> {site.managerName || 'Unassigned'}</p>
                                <p><strong>Current Step:</strong> {site.currentStatus}</p>
                                <p><strong>Total Progress:</strong> <span className="progress-value">{calculateProgress(site.tasks)}%</span></p>
                                <p><strong>Overall Status:</strong> <span className={`status-badge status-${site.status.toLowerCase().replace(/\s/g, '')}`}>{site.status}</span></p>
                                <div className="team-list">
                                    <p className="team-header"><strong>Team ({site.team?.length || 0}):</strong></p>
                                    {site.team && site.team.length > 0 ? <ul>{site.team.map(member => (<li key={member._id} className={`team-role-${member.role.toLowerCase()}`}>{member.name} ({member.category || member.role})</li>))}</ul> : <p className="unassigned-message">No workers assigned.</p>}
                                </div>
                                {site.updates.length > 0 && <div className="latest-update"><strong>Latest:</strong> {site.updates[site.updates.length - 1].comment} <small>— {site.updates[site.updates.length - 1].userName} ({formatDate(site.updates[site.updates.length - 1].date)})</small></div>}
                            </div>
                            
                            {/* Inventory Summary on Card */}
                            {renderAllocatedInventorySection(site)}
                            
                            {/* Block Action Buttons */}
                            {renderActionButtons(site)}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default SitesTasks;