import React, { useState, useEffect } from 'react';
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
    const [formData, setFormData] = useState({
        siteName: '', managerId: '', managerName: '', siteImage: null,
        otherDetails: '',
    });
    
    const [showUpdateModal, setShowUpdateModal] = useState(null); 
    const [updateComment, setUpdateComment] = useState('');

    const currentUserRole = getRole();
    const currentUserId = getUserId(); 
    const currentUserName = getUserName(); 

    useEffect(() => {
        fetchSites();
        if (currentUserRole === 'admin') {
            fetchManagers();
        }
    }, [currentUserRole]);

    const fetchSites = async () => {
        try {
            const { data } = await API.get('/sites');
            setSites(data);
        } catch (error) {
            console.error('Error fetching sites:', error);
        }
    };

    const fetchManagers = async () => {
        try {
            const { data } = await API.get('/labors');
            setManagers(data.filter(labor => labor.role === 'Manager' || labor.role === 'admin')); 
        } catch (error) {
            console.error('Error fetching managers:', error);
        }
    };
    
    // --- RBAC & Helper Functions ---
    const isCurrentUserManager = (siteManagerId) => {
        // Ensure both IDs are valid strings before comparing
        return currentUserId && siteManagerId && currentUserId === siteManagerId;
    }
    const isAuthorizedToUpdate = (site) => currentUserRole === 'admin' || isCurrentUserManager(site.managerId);
    
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
        if (currentUserRole !== 'admin') return; 
        
        const data = new FormData();
        data.append('siteName', formData.siteName);
        data.append('managerId', formData.managerId);
        data.append('managerName', formData.managerName);
        data.append('otherDetails', formData.otherDetails);
        
        if (formData.siteImage) {
            data.append('siteImage', formData.siteImage); 
        }
        
        try {
            await API.post('/sites', data);
            alert('✅ Site added successfully!');
            setFormData({ siteName: '', managerId: '', managerName: '', siteImage: null, otherDetails: '' });
            setShowAddForm(false);
            fetchSites();
        } catch (error) {
            alert(`❌ Failed to add site: ${error.response?.data?.message || 'Check console.'}`);
        }
    };
    
    // --- Update/Delete Logic ---
    const handleTaskToggle = async (siteId, taskId, isCompleted, siteManagerId) => {
        if (!isAuthorizedToUpdate({ _id: siteId, managerId: siteManagerId })) {
            alert("❌ Not authorized to complete tasks.");
            return;
        }
        try {
            await API.patch(`/sites/${siteId}`, { taskId, isCompleted: !isCompleted });
            fetchSites(); 
        } catch (error) {
            alert(`❌ Failed to update task: ${error.response?.data?.message || 'Check console.'}`);
        }
    };

    const handleCommentSubmit = async (e) => {
        e.preventDefault();
        const siteId = showUpdateModal._id;
        
        if (!isAuthorizedToUpdate(showUpdateModal) || !updateComment.trim()) {
            alert("❌ Invalid action or comment.");
            return;
        }

        try {
            await API.patch(`/sites/${siteId}`, { comment: updateComment.trim() });
            setUpdateComment('');
            setShowUpdateModal(null); 
            fetchSites();
        } catch (error) {
            alert(`❌ Failed to add comment: ${error.response?.data?.message || 'Check console.'}`);
        }
    };
    
    const handleReleaseManager = async (siteId) => {
        if (currentUserRole !== 'admin') return alert("❌ Only Admin can release managers.");
        if (!window.confirm("Are you sure you want to unassign the current manager?")) return;
        
        try {
            await API.patch(`/sites/${siteId}`, { managerId: null, managerName: null });
            setShowUpdateModal(null);
            fetchSites();
            alert("Manager successfully released from site.");
        } catch (error) {
            alert(`❌ Failed to release manager: ${error.response?.data?.message || 'Check console.'}`);
        }
    };

    const handleDeleteSite = async (siteId, siteName) => {
        if (currentUserRole !== 'admin') return alert("❌ Only Admin can delete sites.");
        if (!window.confirm(`⚠️ WARNING: This will permanently delete the site "${siteName}" and unassign all current workers. Continue?`)) return;

        try {
            await API.delete(`/sites/${siteId}`);
            alert(`✅ Site "${siteName}" deleted successfully.`);
            fetchSites(); 
        } catch (error) {
            alert(`❌ Failed to delete site: ${error.response?.data?.message || 'Check console.'}`);
        }
    };


    const renderActionButtons = (site) => {
        const authorized = isAuthorizedToUpdate(site);

        return (
            <div className="site-actions">
                {authorized ? (
                    <>
                        <button 
                            className="btn-update-progress"
                            onClick={() => setShowUpdateModal(site)}
                        >
                            Update Progress
                        </button>
                        {currentUserRole === 'admin' && (
                            <button 
                                className="btn-delete"
                                onClick={() => handleDeleteSite(site._id, site.siteName)}
                            >
                                Delete Site
                            </button>
                        )}
                    </>
                ) : (
                    <span className="view-only-tag">View Only</span>
                )}
            </div>
        );
    };


    return (
        <div className="sites-page">
            <h1>Site & Task Management</h1>

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
                    <p>🔒 **View Only Mode** You do not have permission to add new sites.</p>
                </div>
            )}
            
            {/* --- 2. Progress Update Modal/Form --- */}
            {showUpdateModal && (
                <div className="modal-overlay">
                    <form className="site-update-modal" onSubmit={handleCommentSubmit}>
                        <h3>Update Site: {showUpdateModal.siteName}</h3>
                        
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
                        
                        <h4>Add New Update Comment:</h4>
                        <textarea
                            value={updateComment}
                            onChange={(e) => setUpdateComment(e.target.value)}
                            placeholder={`Type your status update comment here (Posted by: ${currentUserName || 'N/A'})`}
                            rows="3"
                            required
                        />
                        <div className="modal-actions">
                            <button type="submit">Submit Update</button>
                            {currentUserRole === 'admin' && (
                                <button type="button" className="btn-release" onClick={() => handleReleaseManager(showUpdateModal._id)}>
                                    Release Manager
                                </button>
                            )}
                            <button type="button" onClick={() => setShowUpdateModal(null)}>Cancel</button>
                        </div>
                    </form>
                </div>
            )}


            {/* --- 3. Sites List --- */}
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