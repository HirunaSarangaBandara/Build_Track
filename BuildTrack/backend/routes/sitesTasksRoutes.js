const express = require('express');
const router = express.Router();
const Site = require('../models/Site');
const Labor = require('../models/Labor'); 
const multer = require('multer'); 
const path = require('path');
const fs = require('fs'); 

// --- Middleware Imports ---
const { authorizeRoles } = require('../middleware/authMiddleware');

// Predefined construction steps
const DEFAULT_TASKS = [
    { name: "Create Foundation" }, { name: "Build Ground Floor Walls" }, 
    { name: "Install Slab/Roofing" }, { name: "Rough-in Electrical/Plumbing" }, 
    { name: "Interior Finishing (Plastering, Tiling)" }, { name: "Exterior Finishing (Paint, Landscaping)" }, 
    { name: "Final Inspection and Handover" },
]; 

// --- Multer Storage Configuration ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '..', 'uploads', 'site_images');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath); 
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (
            file.mimetype === 'image/jpeg' || file.mimetype === 'image/png' || 
            file.mimetype === 'image/jpg' || file.mimetype === 'image/gif' ||
            file.mimetype === 'image/webp'
        ) {
            cb(null, true);
        } else {
            cb(null, false);
            req.fileValidationError = 'Invalid file type. Only JPG, PNG, GIF, and WebP format allowed!';
        }
    },
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});


// --- Security Middleware ---
const authAdmin = authorizeRoles('admin');

const authAdminOrManager = async (req, res, next) => {
    const siteId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (userRole === 'admin') {
        return next();
    }

    try {
        const site = await Site.findById(siteId);
        if (!site) {
            return res.status(404).json({ message: "Site not found." });
        }
        
        if (site.managerId && site.managerId.toString() === userId) {
            next();
        } else {
            res.status(403).json({ message: "Forbidden: You are not the assigned manager for this site." });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


// --- ROUTES IMPLEMENTATION ---

// GET All Sites (View) 
router.get('/', async (req, res) => {
    try {
        const sites = await Site.find().sort({ startDate: -1 });
        
        // 1. Get all labors that are currently assigned to ANY site (Worker or Manager)
        const labors = await Labor.find({ sites: { $exists: true, $ne: [] } }).select('name sites role category _id'); 
        
        // 2. Map labors to their siteName for efficient lookup
        const siteTeamMap = {};
        labors.forEach(labor => {
            labor.sites.forEach(siteName => { 
                if (!siteTeamMap[siteName]) siteTeamMap[siteName] = [];
                siteTeamMap[siteName].push(labor.toObject()); 
            });
        });
        
        // 3. Attach worker teams to each site document
        const sitesWithTeams = sites.map(site => {
            const siteObject = site.toObject(); 
            const fullTeam = siteTeamMap[siteObject.siteName] || [];
            // Filter the team to only include Workers for the primary 'team' display on the card
            siteObject.team = fullTeam.filter(member => member.role === 'Worker');
            return siteObject;
        });

        res.json(sitesWithTeams);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST Add New Site (ADMIN ONLY, with optional file upload)
router.post('/', upload.single('siteImage'), authAdmin, async (req, res) => {
    
    if (req.fileValidationError) {
        if (req.file) { fs.unlinkSync(req.file.path); } 
        return res.status(400).json({ message: req.fileValidationError });
    }
    
    const { siteName, managerId, managerName, otherDetails } = req.body;
    
    if (!siteName || !siteName.toString().trim()) {
        if (req.file) { try { fs.unlinkSync(req.file.path); } catch {} }
        return res.status(400).json({ message: "Missing required field: siteName" });
    }
    try {
        const imagePath = req.file ? `/uploads/site_images/${req.file.filename}` : null; 
        
        const sanitizedKey = siteName.toString().trim().toLowerCase().replace(/\s+/g, '-');

        const newSite = new Site({ 
            siteName, 
            siteNameKey: sanitizedKey, 
            managerId, 
            managerName, 
            otherDetails,
            siteImage: imagePath,
            tasks: DEFAULT_TASKS,
            currentStatus: "Foundation Phase",
        });
        await newSite.save();
        
        if (managerId) {
            await Labor.findByIdAndUpdate(managerId, { $addToSet: { sites: siteName } }); 
        }
        
        res.status(201).json(newSite);
    } catch (err) {
        if (req.file) { 
            try { fs.unlinkSync(req.file.path); } catch (cleanupError) { console.error('Error deleting file:', cleanupError); }
        }
        console.error(err);
        res.status(400).json({ message: err.message });
    }
});

// PATCH Update Task/Comment/Manager (Admin/Manager)
router.patch('/:id', authAdminOrManager, async (req, res) => {
    const siteId = req.params.id;
    const { taskId, isCompleted, comment, managerId, managerName } = req.body;
    
    const userId = req.user.id;
    const userName = req.user.name; 

    try {
        const site = await Site.findById(siteId);
        if (!site) return res.status(404).json({ message: "Site not found." });

        // 1. Handle Task Completion Update
        if (taskId !== undefined) { 
            const task = site.tasks.id(taskId);
            if (!task) return res.status(404).json({ message: "Task not found." });

            task.isCompleted = isCompleted;
            task.completedAt = isCompleted ? new Date() : null;
            
            const nextIncompleteTask = site.tasks.find(t => !t.isCompleted);
            if (nextIncompleteTask) {
                site.currentStatus = `Working on: ${nextIncompleteTask.name}`;
            } else {
                site.currentStatus = "All major tasks complete.";
            }
        }
        
        // 2. Handle Comment Addition
        if (comment) {
            site.updates.push({ userId, userName, comment });
        }
        
        // 3. Handle Manager Re-assignment
        if (managerId !== undefined && req.user.role === 'admin') {
            site.managerId = managerId;
            site.managerName = managerName;
        }
        
        await site.save();
        res.json(site);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Dedicated PATCH route for Site Status Change (Admin/Manager)
router.patch('/status/:id', authAdminOrManager, async (req, res) => {
    const siteId = req.params.id;
    const { status } = req.body;
    
    if (!status || !['Planned', 'Active', 'On Hold', 'Completed'].includes(status)) {
        return res.status(400).json({ message: "Invalid status value provided." });
    }
    
    try {
        const site = await Site.findByIdAndUpdate(
            siteId, 
            { $set: { status: status } },
            { new: true, runValidators: true }
        );
        if (!site) return res.status(404).json({ message: "Site not found." });

        res.json({ message: `Site status updated to ${status}`, site });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


// PATCH route for Manager Release (ADMIN ONLY) 
router.patch('/manager-release/:id', authAdmin, async (req, res) => {
    const siteId = req.params.id;
    
    try {
        const site = await Site.findById(siteId);
        if (!site) return res.status(404).json({ message: "Site not found." });

        const siteName = site.siteName;
        const managerId = site.managerId;

        // 1. Unassign manager from the Site document
        site.managerId = null;
        site.managerName = null;
        await site.save();

        // 2. Remove the site name from the manager's Labor.sites array
        if (managerId) {
            await Labor.findByIdAndUpdate(managerId, { $pull: { sites: siteName } });
        }

        res.json({ message: `Manager released from site ${siteName}.` });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// DELETE Site (ADMIN ONLY) 
router.delete('/:id', authAdmin, async (req, res) => {
    try {
        const site = await Site.findById(req.params.id);
        if (!site) {
            return res.status(404).json({ message: "Site not found." });
        }
        
        const siteName = site.siteName;

        // 1. Unassign ALL labors (Workers and Managers) from the deleted site
        await Labor.updateMany(
            { sites: siteName }, 
            { $pull: { sites: siteName } } 
        );
        
        // 2. Delete the file from the server disk
        if (site.siteImage) {
            const filePath = path.join(__dirname, '..', site.siteImage);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        // 3. Delete the site document
        await Site.findByIdAndDelete(req.params.id);

        res.json({ message: "Site deleted successfully, and all users unassigned." });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ===================================================================
// NEW: Inventory allocations and usage per site
// ===================================================================

// GET /sites/inventory/:id -> allocated inventory for a site
router.get('/inventory/:id', authAdminOrManager, async (req, res) => {
    const siteId = req.params.id;

    try {
        const site = await Site.findById(siteId);
        if (!site) {
            return res.status(404).json({ message: "Site not found." });
        }

        res.json(site.allocatedInventory || []);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PATCH /sites/inventory-usage/:id -> mark allocated inventory as used
router.patch('/inventory-usage/:id', authAdminOrManager, async (req, res) => {
    const siteId = req.params.id;
    const { inventoryId, quantityUsed } = req.body;

    if (!inventoryId || typeof quantityUsed !== 'number' || quantityUsed <= 0) {
        return res.status(400).json({
            message: "inventoryId and a positive quantityUsed are required.",
        });
    }

    try {
        const site = await Site.findById(siteId);
        if (!site) {
            return res.status(404).json({ message: "Site not found." });
        }

        const allocation = site.allocatedInventory.find(
            (a) => a.inventoryItem.toString() === inventoryId.toString()
        );
        if (!allocation) {
            return res.status(404).json({
                message: "No allocation found for this inventory item on this site.",
            });
        }

        const availableForUse = allocation.allocatedQuantity - allocation.usedQuantity;

        if (quantityUsed > availableForUse) {
            return res.status(400).json({
                message: "Usage exceeds allocated remaining quantity.",
                remaining: availableForUse,
            });
        }

        allocation.usedQuantity += quantityUsed;
        await site.save();

        res.json({
            message: "Inventory usage recorded successfully.",
            allocation,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;