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
  const [workerModalMessage, setWorkerModalMessage] = useState({ type: '', text: '' });

  const [showManagerModal, setShowManagerModal] = useState(null);
  const [selectedManagerId, setSelectedManagerId] = useState('');
  const [managerModalMessage, setManagerModalMessage] = useState({ type: '', text: '' });

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
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
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

  const fetchSites = async () => {
    try {
      const { data } = await API.get('/sites');
      setSites(data);
    } catch {
      showStatusMessage('error', 'Failed to fetch site data.');
    }
  };

  const isCurrentUserManager = (managerId) =>
    currentUserId && managerId && currentUserId === managerId;

  const isAuthorized = (site) =>
    currentUserRole === 'admin' || isCurrentUserManager(site.managerId);

  const calculateProgress = (tasks) => {
    if (!tasks || tasks.length === 0) return 0;
    const completed = tasks.filter(t => t.isCompleted).length;
    return ((completed / tasks.length) * 100).toFixed(0);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleManagerSelect = (e) => {
    const manager = managers.find(m => m._id === e.target.value);
    setFormData(prev => ({
      ...prev,
      managerId: manager?._id || '',
      managerName: manager?.name || '',
    }));
  };

  const handleFileChange = (e) => {
    setFormData(prev => ({ ...prev, siteImage: e.target.files[0] }));
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (currentUserRole !== 'admin') return;

    const data = new FormData();
    Object.entries(formData).forEach(([k, v]) => v && data.append(k, v));

    try {
      await API.post('/sites', data);
      showStatusMessage('success', '✅ Site added successfully');
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
    } catch (err) {
      showStatusMessage('error', '❌ Failed to add site');
    }
  };

  const openWorkerModal = (site) => {
    if (!isAuthorized(site)) return;
    setShowWorkerModal(site);
    setSelectedCategory('');
    setAvailableWorkers([]);
    setWorkerModalMessage({ type: '', text: '' });
  };

  const handleCategoryChange = (e) => {
    const category = e.target.value;
    setSelectedCategory(category);

    if (!category) return setAvailableWorkers([]);

    setAvailableWorkers(
      allWorkers.filter(
        w => w.category === category && (!w.sites || w.sites.length === 0)
      )
    );
  };

  const assignWorkerToSite = async (worker, site) => {
    try {
      await API.patch(`/labors/assign-site/${worker._id}`, {
        siteName: site.siteName,
      });
      showStatusMessage('success', `✅ ${worker.name} assigned`);
      fetchSites();
      fetchManagersAndWorkers();
    } catch {
      showStatusMessage('error', '❌ Failed to assign worker');
    }
  };

  return (
    <div className="sites-page">
      <h1>Sites & Tasks Management</h1>

      {message.text && (
        <div className={`status-box status-${message.type}`}>
          {message.text}
        </div>
      )}

      {currentUserRole === 'admin' && (
        <>
          <button onClick={() => setShowAddForm(!showAddForm)}>
            {showAddForm ? 'Hide Form' : '➕ Add New Site'}
          </button>

          {showAddForm && (
            <form onSubmit={handleAddSubmit} className="site-add-form">
              <input name="siteName" value={formData.siteName} onChange={handleChange} placeholder="Site Name" required />
              <select onChange={handleManagerSelect} value={formData.managerId}>
                <option value="">Select Manager</option>
                {managers.map(m => (
                  <option key={m._id} value={m._id}>{m.name}</option>
                ))}
              </select>
              <input type="file" onChange={handleFileChange} />
              <textarea name="otherDetails" value={formData.otherDetails} onChange={handleChange} />
              <button type="submit">Create Site</button>
            </form>
          )}
        </>
      )}

      <div className="site-grid">
        {sites.map(site => (
          <div key={site._id} className="site-card">
            <img
              src={site.siteImage ? `${BACKEND_HOST}${site.siteImage}` : DEFAULT_IMAGE_URL}
              alt={site.siteName}
            />
            <h3>{site.siteName}</h3>
            <p><b>Manager:</b> {site.managerName || 'Unassigned'}</p>
            <p><b>Progress:</b> {calculateProgress(site.tasks)}%</p>

            {isAuthorized(site) && (
              <button onClick={() => openWorkerModal(site)}>👷 Manage Workers</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default SitesTasks;
