import React, { useState, useEffect, useCallback } from 'react';
import API from '../services/api';
import { getRole, getUserId, getUserName } from '../services/auth';
import '../styles/sitesTasks.css'; 

// Define the base URL for fetching static assets (images)
const BACKEND_HOST = "http://localhost:5000"; 
// Define the full URL path to the default image in the backend's static folder
const DEFAULT_IMAGE_URL = `${BACKEND_HOST}/uploads/default-site.jpg`; 

function SitesTasks() {
    const [sites, setSites] = useState([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [managers, setManagers] = useState([]); 
    const [allWorkers, setAllWorkers] = useState([]); // All workers state
    const [formData, setFormData] = useState({
        siteName: '', managerId: '', managerName: '', siteImage: null,
        otherDetails: '',
    });
    
    // UI States for Modals/Messages
    const [showUpdateModal, setShowUpdateModal] = useState(null); 
    const [updateComment, setUpdateComment] = useState('');
    const [showWorkerModal, setShowWorkerModal] = useState(null); 
    const [selectedCategory, setSelectedCategory] = useState('');
    const [availableWorkers, setAvailableWorkers] = useState([]); 
    
    // NEW: Status and Confirmation States
    const [message, setMessage] = useState({ type: '', text: '' }); 
    const [confirmationData, setConfirmationData] = useState(null); // { type: 'deleteSite' | 'releaseWorker' | 'releaseManager', id, name, siteName, ... }
    
    const currentUserRole = getRole();
    const currentUserId = getUserId(); 
    const currentUserName = getUserName(); 
    
    const workerCategories = [
        "Mason", "Plumber", "Electrician", "Carpenter", "Painter", 
        "Welder", "Steel Fixer", "Supervisor", "Helper",
    ];

    // NEW: Helper function to show status messages
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
    
    // New combined fetch function for managers and workers
    const fetchManagersAndWorkers = async () => {
        try {
            const { data } = await API.get('/labors');
            // Include Admin in the manager list for site assignment dropdown
            setManagers(data.filter(labor => labor.role === 'Manager' || labor.role === 'admin'));
            // Filter out Admin/Manager roles to only include actual Workers for assignment
            setAllWorkers(data.filter(labor => labor.role === 'Worker'));
        } catch (error) {
            console.error('Error fetching managers/workers:', error);
            showStatusMessage('error', 'Failed to fetch manager and worker data.');
        }
    };

    const fetchSites = async () => {
        try {
            const { data } = await API.get('/sites');
            setSites(data);
        } catch (error) {
            console.error('Error fetching sites:', error);
            showStatusMessage('error', 'Failed to fetch site data.');
        }
    };

    // --- RBAC & Helper Functions ---
    const isCurrentUserManager = (siteManagerId) => {
        return currentUserId && siteManagerId && currentUserId === siteManagerId;
    }
    const isAuthorizedToUpdate = (site) => currentUserRole === 'admin' || isCurrentUserManager(site.managerId);
    const isAuthorizedToAssignWorkers = (site) => currentUserRole === 'admin' || isCurrentUserManager(site.managerId);
    
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
        setFormData({ ...formData, [name]: value });
    };

    const handleManagerSelect = (e) => {
        const selectedManager = managers.find(m => m._id === e.target.value);
        setFormData({
            ...formData,
            managerId: selectedManager ? selectedManager._id : '',
            managerName: selectedManager ? selectedManager.name : '',
        });
    };

    const handleFileChange = (e) => {
        setFormData({ ...formData, siteImage: e.target.files[0] });
    };

    // --- ADD Site (Handles Optional File Upload) ---
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
        
        if (formData.siteImage) {
            data.append('siteImage', formData.siteImage); 
        }
        
        try {
            await API.post('/sites', data, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
        });
            showStatusMessage('success', '✅ Site added successfully!');
            setFormData({ siteName: '', managerId: '', managerName: '', siteImage: null, otherDetails: '' });
            setShowAddForm(false);
            fetchSites();
            fetchManagersAndWorkers(); 
        } catch (error) {
            showStatusMessage('error', `❌ Failed to add site: ${error.response?.data?.message || 'Check console.'}`);
        }
    };
    
    // --- Worker Assignment Logic ---
    const openWorkerModal = (site) => {
        if (!isAuthorizedToAssignWorkers(site)) {
            showStatusMessage('error', "❌ Not authorized to assign/release workers for this site.");
            return;
        }
        setShowWorkerModal(site);
        setSelectedCategory(''); // Reset category
        setAvailableWorkers([]); // Reset workers
    };

    const handleCategoryChange = (e) => {
        const category = e.target.value;
        setSelectedCategory(category);
        
        if (category) {
            // Filter workers who match the category AND are unassigned 
            const available = allWorkers.filter(
                worker => worker.category === category && (!worker.sites || worker.sites.length === 0)
            );
            setAvailableWorkers(available);
        } else {
            setAvailableWorkers([]);
        }
    };
    
    const handleAssignWorker = async (workerId, workerName) => {
        const siteName = showWorkerModal.siteName;
        
        try {
            // Update labor document to assign site 
            await API.patch(`/labors/${workerId}`, { site: siteName });
            
            showStatusMessage('success', `✅ ${workerName} assigned to ${siteName}!`);
            
            fetchSites();
            fetchManagersAndWorkers();
            
            setShowWorkerModal(null); 

        } catch (error) {
            showStatusMessage('error', `❌ Failed to assign worker: ${error.response?.data?.message || 'Check console.'}`);
        }
    };

    // NEW: Initiate worker release confirmation
    const initiateReleaseWorker = (workerId, workerName, siteName) => {
        setConfirmationData({
            type: 'releaseWorker',
            workerId,
            workerName,
            siteName
        });
    };
    
    // NEW: Execute worker release after confirmation
    const executeReleaseWorker = async () => {
        const { workerId, workerName, siteName } = confirmationData;
        
        try {
            // Update labor document to set site to null
            await API.patch(`/labors/${workerId}`, { site: null });
            
            showStatusMessage('success', `✅ ${workerName} released from ${siteName}!`);
            
            fetchSites();
            fetchManagersAndWorkers();
            
            setShowWorkerModal(null); 
            
        } catch (error) {
            showStatusMessage('error', `❌ Failed to release worker: ${error.response?.data?.message || 'Check console.'}`);
        } finally {
            setConfirmationData(null);
        }
    };
    
    // --- Other Update/Delete Logic ---
    const handleTaskToggle = async (siteId, taskId, isCompleted, siteManagerId) => {
        if (!isAuthorizedToUpdate({ _id: siteId, managerId: siteManagerId })) {
            showStatusMessage('error', "❌ Not authorized to complete tasks.");
            return;
        }
        try {
            await API.patch(`/sites/${siteId}`, { taskId, isCompleted: !isCompleted });
            fetchSites(); 
        } catch (error) {
            showStatusMessage('error', `❌ Failed to update task: ${error.response?.data?.message || 'Check console.'}`);
        }
    };

    const handleCommentSubmit = async (e) => {
        e.preventDefault();
        const siteId = showUpdateModal._id;
        
        if (!isAuthorizedToUpdate(showUpdateModal) || !updateComment.trim()) {
            showStatusMessage('error', "❌ Invalid action or comment.");
            return;
        }

        try {
            await API.patch(`/sites/${siteId}`, { comment: updateComment.trim() });
            setUpdateComment('');
            setShowUpdateModal(null); 
            fetchSites();
            showStatusMessage('success', '✅ Comment added successfully.');
        } catch (error) {
            showStatusMessage('error', `❌ Failed to add comment: ${error.response?.data?.message || 'Check console.'}`);
        }
    };
    
    // NEW: Handle Site Status Update (Admin/Manager)
    const handleStatusChange = async (newStatus) => {
        if (!isAuthorizedToUpdate(showUpdateModal)) {
            return showStatusMessage('error', "❌ Not authorized to change site status.");
        }
        const siteId = showUpdateModal._id;
        try {
            await API.patch(`/sites/status/${siteId}`, { status: newStatus });
            showStatusMessage('success', `✅ Site status updated to ${newStatus}.`);
            setShowUpdateModal(null);
            fetchSites();
        } catch (error) {
            showStatusMessage('error', `❌ Failed to update status: ${error.response?.data?.message || 'Check console.'}`);
        }
    };

    // NEW: Handle Manager Re-assignment (Admin Only)
    const handleManagerReassign = async (newManagerId, newManagerName) => {
        if (currentUserRole !== 'admin') return showStatusMessage('error', "❌ Only Admin can change the manager.");
        if (!newManagerId) return; 

        const siteId = showUpdateModal._id;
        const oldManagerId = showUpdateModal.managerId;
        const siteName = showUpdateModal.siteName;
        
        // 1. Unassign old manager from his Labor.sites array
        if (oldManagerId) {
            try {
                await API.patch(`/labors/manager-site/${oldManagerId}`, { siteName: siteName, action: 'deassign' });
            } catch (error) {
                 console.error('Error deassigning old manager:', error);
                 showStatusMessage('error', 'Error cleaning up old manager assignment.');
            }
        }
        
        try {
            // 2. Assign new manager to his Labor.sites array
            await API.patch(`/labors/manager-site/${newManagerId}`, { siteName: siteName, action: 'assign' });
            
            // 3. Update Site Document's Manager fields 
            await API.patch(`/sites/${siteId}`, { managerId: newManagerId, managerName: newManagerName });

            showStatusMessage('success', `✅ Site manager successfully updated to ${newManagerName}.`);
            setShowUpdateModal(null);
            fetchSites();
            fetchManagersAndWorkers();

        } catch (error) {
            showStatusMessage('error', `❌ Failed to reassign manager: ${error.response?.data?.message || 'Check console.'}`);
        }
    };
    
    // NEW: Initiate manager release confirmation
    const initiateReleaseManager = (siteId, siteName) => {
        if (currentUserRole !== 'admin') {
            return showStatusMessage('error', "❌ Only Admin can release managers.");
        }
        setConfirmationData({
            type: 'releaseManager',
            id: siteId,
            siteName
        });
    };
    
    // NEW: Execute manager release after confirmation
    const executeReleaseManager = async () => {
        const { id: siteId } = confirmationData;
        
        try {
            await API.patch(`/sites/manager-release/${siteId}`);
            
            setShowUpdateModal(null);
            fetchSites();
            fetchManagersAndWorkers();
            showStatusMessage('success', "Manager successfully released from site.");
        } catch (error) {
            showStatusMessage('error', `❌ Failed to release manager: ${error.response?.data?.message || 'Check console.'}`);
        } finally {
            setConfirmationData(null);
        }
    };

    // NEW: Initiate site deletion confirmation
    const initiateDeleteSite = (siteId, siteName) => {
        if (currentUserRole !== 'admin') {
            return showStatusMessage('error', "❌ Only Admin can delete sites.");
        }
        setConfirmationData({
            type: 'deleteSite',
            id: siteId,
            siteName
        });
    };
    
    // NEW: Execute site deletion after confirmation
    const executeDeleteSite = async () => {
        const { id: siteId, siteName } = confirmationData;
        
        try {
            await API.delete(`/sites/${siteId}`);
            showStatusMessage('success', `✅ Site "${siteName}" deleted successfully.`);
            fetchSites(); 
            fetchManagersAndWorkers();
        } catch (error) {
            showStatusMessage('error', `❌ Failed to delete site: ${error.response?.data?.message || 'Check console.'}`);
        } finally {
            setConfirmationData(null);
        }
    };

    // --- Render Confirmation Modal ---
    const renderConfirmationModal = () => {
        if (!confirmationData) return null;
        
        const { type, siteName, workerName } = confirmationData;
        let title = "Confirm Action";
        let message = "";
        let action = executeDeleteSite; // Default action
        let actionLabel = "Confirm";
        let isDestructive = false;

        switch (type) {
            case 'deleteSite':
                title = "⚠️ Delete Site Warning";
                message = `WARNING: This will permanently delete the site "${siteName}", unassign all current workers and manager(s). Continue?`;
                action = executeDeleteSite;
                actionLabel = "Yes, Delete Site";
                isDestructive = true;
                break;
            case 'releaseWorker':
                title = "Release Worker";
                message = `Are you sure you want to release ${workerName} from site ${siteName}?`;
                action = executeReleaseWorker;
                actionLabel = "Yes, Release Worker";
                break;
            case 'releaseManager':
                title = "Release Manager";
                message = `Are you sure you want to unassign the current manager from site ${siteName}?`;
                action = executeReleaseManager;
                actionLabel = "Yes, Release Manager";
                break;
            default:
                return null;
        }

        return (
            // FIX: Use only .confirmation-overlay, relying on CSS for fixed position and high Z-index
            <div className="confirmation-overlay"> 
                <div className="confirmation-modal">
                    <h3>{title}</h3>
                    <p>{message}</p>
                    <div className="modal-actions">
                        <button 
                            type="button" 
                            className={isDestructive ? 'btn-delete' : 'btn-action'} 
                            onClick={action}
                        >
                            {actionLabel}
                        </button>
                        <button type="button" className="btn-cancel" onClick={() => setConfirmationData(null)}>
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        );
    };


    const renderActionButtons = (site) => {
        const authorizedToUpdate = isAuthorizedToUpdate(site);
        const authorizedToAssign = isAuthorizedToAssignWorkers(site);

        return (
            <div className="site-actions">
                {authorizedToAssign && (
                    <button 
                        className="btn-assign-worker"
                        onClick={() => openWorkerModal(site)}
                    >
                        Manage Team
                    </button>
                )}
                
                {authorizedToUpdate ? (
                    <>
                        <button 
                            className="btn-update-progress"
                            onClick={() => setShowUpdateModal(site)}
                        >
                            Update
                        </button>
                        {currentUserRole === 'admin' && (
                            <button 
                                className="btn-delete"
                                onClick={() => initiateDeleteSite(site._id, site.siteName)}
                            >
                                Delete
                            </button>
                        )}
                    </>
                ) : (
                    <span className="view-only-tag">View Only</span>
                )}
            </div>
        );
    };
    
    const renderWorkerModal = () => {
        if (!showWorkerModal) return null;
        
        return (
            <div className="modal-overlay">
                <div className="worker-assignment-modal">
                    <h3>Manage Team for: {showWorkerModal.siteName}</h3>
                    
                    {/* Current Assigned Workers */}
                    <h4>Current Team ({showWorkerModal.team.length}):</h4>
                    <div className="team-management-list">
                        {showWorkerModal.team.length > 0 ? (
                            showWorkerModal.team.map(worker => (
                                <div key={worker._id} className="team-member-item">
                                    <span>{worker.name} ({worker.category})</span>
                                    <button 
                                        className="btn-release" 
                                        onClick={() => initiateReleaseWorker(worker._id, worker.name, showWorkerModal.siteName)}
                                    >
                                        Release
                                    </button>
                                </div>
                            ))
                        ) : (
                            <p className="no-workers-msg">No workers assigned to this site yet.</p>
                        )}
                    </div>

                    {/* Add New Worker Section */}
                    <h4>Assign New Worker:</h4>
                    <select value={selectedCategory} onChange={handleCategoryChange} className="select-category">
                        <option value="">Select Worker Category</option>
                        {workerCategories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                    
                    <div className="available-worker-list">
                        {selectedCategory ? (
                            availableWorkers.length > 0 ? (
                                availableWorkers.map(worker => (
                                    <div key={worker._id} className="available-worker-item">
                                        <span>{worker.name}</span>
                                        <button className="btn-assign" onClick={() => handleAssignWorker(worker._id, worker.name)}>
                                            Assign
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <p className="no-workers-msg">
                                    No <strong>unassigned</strong> workers available in the <strong>{selectedCategory}</strong> category.
                                </p>
                            )
                        ) : (
                            <p className="no-workers-msg">Select a category to see available workers.</p>
                        )}
                    </div>
                    
                    <div className="modal-actions">
                        <button type="button" onClick={() => setShowWorkerModal(null)}>Close</button>
                    </div>
                </div>
            </div>
        );
    };

    const renderUpdateModal = () => {
        if (!showUpdateModal) return null;
        
        // Find the currently selected manager to pre-fill the dropdown
        const currentManager = managers.find(m => m._id === showUpdateModal.managerId);
        const initialManagerId = currentManager ? currentManager._id : '';

        return (
            <div className="modal-overlay">
                <form className="site-update-modal" onSubmit={handleCommentSubmit}>
                    <h3>Update Site: {showUpdateModal.siteName}</h3>
                    
                    {/* Admin-only: Manager Reassignment and Status Control */}
                    {currentUserRole === 'admin' && (
                        <div className="admin-controls-group">
                            <h4>Admin Controls</h4>
                            
                            {/* Manager Selection */}
                            <div className="control-item">
                                <label>Change Manager:</label>
                                <select 
                                    defaultValue={initialManagerId}
                                    onChange={(e) => {
                                        const newManager = managers.find(m => m._id === e.target.value);
                                        if (newManager) {
                                            handleManagerReassign(newManager._id, newManager.name);
                                        } else if (e.target.value === '') {
                                            initiateReleaseManager(showUpdateModal._id, showUpdateModal.siteName);
                                        }
                                    }}
                                >
                                    <option value="">--- Select New Manager ---</option>
                                    {managers.map(m => (
                                        <option key={m._id} value={m._id} disabled={m._id === initialManagerId}>
                                            {m.name} ({m.role}) {m._id === initialManagerId ? '(Current)' : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            
                            {/* Site Status Control */}
                            <div className="control-item">
                                <label>Change Status:</label>
                                <select 
                                    value={showUpdateModal.status}
                                    onChange={(e) => handleStatusChange(e.target.value)}
                                >
                                    <option value="Active">Active</option>
                                    <option value="Planned">Planned</option>
                                    <option value="On Hold">On Hold</option>
                                    <option value="Completed">Completed</option>
                                </select>
                            </div>
                            <hr/>
                        </div>
                    )}
                    
                    {/* Task Progress */}
                    <h4>Tasks Progress ({calculateProgress(showUpdateModal.tasks)}%):</h4>
                    <div className="task-list">
                        {showUpdateModal.tasks.map(task => (
                            <div key={task._id} className={`task-item ${task.isCompleted ? 'completed' : ''}`}>
                                <label>
                                    <input 
                                        type="checkbox" 
                                        checked={task.isCompleted} 
                                        onChange={() => handleTaskToggle(showUpdateModal._id, task._id, task.isCompleted, showUpdateModal.managerId)}
                                    />
                                    {task.name}
                                </label>
                            </div>
                        ))}
                    </div>
                    
                    {/* Comment Section */}
                    <h4>Add New Update Comment:</h4>
                    <textarea
                        value={updateComment}
                        onChange={(e) => setUpdateComment(e.target.value)}
                        placeholder={`Type your status update comment here (Posted by: ${currentUserName || 'N/A'})`}
                        rows="3"
                    />
                    
                    <div className="modal-actions">
                        <button type="submit">Submit Update</button>
                        {currentUserRole === 'admin' && showUpdateModal.managerId && (
                            <button 
                                type="button" 
                                className="btn-release-manager" 
                                onClick={() => initiateReleaseManager(showUpdateModal._id, showUpdateModal.siteName)}
                            >
                                Release Manager
                            </button>
                        )}
                        <button type="button" onClick={() => setShowUpdateModal(null)}>Cancel</button>
                    </div>
                </form>
            </div>
        );
    };

    return (
        <div className="sites-page">
            <h1>Site & Task Management</h1>

            {/* --- 0. Status Message --- */}
            {message.text && (
                <div className={`status-box status-box-${message.type}`}>
                    {message.text}
                </div>
            )}
            
            {/* --- 0. Confirmation Modal --- */}
            {renderConfirmationModal()} 

            {/* --- 1. Admin Add Button & Form / View Only Message --- */}
            {currentUserRole === 'admin' ? (
                <>
                    <button className="btn-toggle-form" onClick={() => setShowAddForm(!showAddForm)}>
                        {showAddForm ? 'Hide Add Site Form' : '➕ Add New Site'}
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
                            
                            <textarea name="otherDetails" placeholder="Other Details (e.g., Location, Scope)" value={formData.otherDetails} onChange={handleChange} rows="2" />
                            <button type="submit">Create Site</button>
                        </form>
                    )}
                </>
            ) : (
                <div className="site-add-form permission-message">
                    <p>🔒 <strong>View Only Mode</strong> You do not have permission to add new sites.</p>
                </div>
            )}
            
            {/* --- 2. Progress Update Modal/Form --- */}
            {renderUpdateModal()}
            
            {/* --- 3. Worker Assignment Modal --- */}
            {renderWorkerModal()}


            {/* --- 4. Sites List --- */}
            <div className="site-list">
                <h2>Active Sites ({sites.length})</h2>
                <div className="site-grid">
                    {sites.map(site => (
                        <div key={site._id} className={`site-card status-${site.status.toLowerCase().replace(/\s/g, '')}`}>
                            
                            {/* FINAL FIX: Construct the full URL for the image */}
                            <img 
                                src={site.siteImage 
                                        ? `${BACKEND_HOST}${site.siteImage}` 
                                        : DEFAULT_IMAGE_URL} 
                                alt={site.siteName} 
                                className="site-image"
                            />
                            
                            <div className="card-content">
                                <h3>{site.siteName}</h3>
                                <p><strong>Manager:</strong> {site.managerName || 'Unassigned'}</p>
                                <p><strong>Current Step:</strong> {site.currentStatus}</p>
                                <p><strong>Total Progress:</strong> <span className="progress-value">{calculateProgress(site.tasks)}%</span></p>
                                <p><strong>Overall Status:</strong> <span className={`status-badge status-${site.status.toLowerCase().replace(/\s/g, '')}`}>{site.status}</span></p>
                                
                                {/* Display Assigned Team Details */}
                                <div className="team-list">
                                    <p className="team-header"><strong>Team ({site.team?.length || 0}):</strong></p>
                                    {site.team && site.team.length > 0 ? (
                                        <ul>
                                            {site.team.map(member => (
                                                <li key={member._id} className={`team-role-${member.role.toLowerCase()}`}>
                                                    {member.name} ({member.category || member.role})
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="unassigned-message">No workers assigned.</p>
                                    )}
                                </div>
                                
                                {site.updates.length > 0 && (
                                    <div className="latest-update">
                                        <strong>Latest Update:</strong> 
                                        {site.updates[site.updates.length - 1].comment} 
                                        <small>— {site.updates[site.updates.length - 1].userName} ({formatDate(site.updates[site.updates.length - 1].date)})</small>
                                    </div>
                                )}
                            </div>

                            {renderActionButtons(site)}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default SitesTasks;