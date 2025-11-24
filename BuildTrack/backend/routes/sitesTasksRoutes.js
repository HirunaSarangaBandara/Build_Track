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

// GET All Sites (View) - CRITICAL: Attaches all assigned workers
router.get('/', async (req, res) => {
    try {
        const sites = await Site.find().sort({ startDate: -1 });
        
        // 1. Get all labors that are currently assigned to any site
        const labors = await Labor.find({ site: { $ne: null, $ne: "" } }).select('name site role category');
        
        // 2. Map labors to their siteName for efficient lookup (Key: Site Name, Value: [Workers])
        const siteTeamMap = labors.reduce((acc, labor) => {
            if (labor.site) {
                const siteKey = labor.site;
                if (!acc[siteKey]) acc[siteKey] = [];
                acc[siteKey].push(labor);
            }
            return acc;
        }, {});
        
        // 3. Attach worker teams to each site document
        const sitesWithTeams = sites.map(site => {
            const siteObject = site.toObject(); 
            siteObject.team = siteTeamMap[siteObject.siteName] || []; 
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
        return res.status(400).json({ message: req.fileValidationError });
    }
    
    const { siteName, managerId, managerName, otherDetails } = req.body;
    
    try {
        const imagePath = req.file ? `/uploads/site_images/${req.file.filename}` : null; 
        
        const newSite = new Site({ 
            siteName, 
            siteNameKey: siteName, 
            managerId, 
            managerName, 
            otherDetails,
            siteImage: imagePath,
            tasks: DEFAULT_TASKS,
            currentStatus: "Foundation Phase",
        });
        await newSite.save();
        res.status(201).json(newSite);
    } catch (err) {
        if (req.file) { fs.unlinkSync(req.file.path); } 
        res.status(400).json({ message: err.message });
    }
});

// PATCH Update Task/Comment/Manager Reassignment (ADMIN OR ASSIGNED MANAGER)
router.patch('/:id', authAdminOrManager, async (req, res) => {
    const siteId = req.params.id;
    const { taskId, isCompleted, comment, status, managerId, managerName } = req.body;
    
    const userId = req.user.id;
    const userName = req.user.name; 

    try {
        const site = await Site.findById(siteId);
        if (!site) return res.status(404).json({ message: "Site not found." });

        // 1. Handle Manager Reassignment (Only Admins can set/unset manager fields)
        if (req.user.role === 'admin' && (managerId !== undefined || managerName !== undefined)) {
            site.managerId = managerId || null; 
            site.managerName = managerName || null;
            
            if (managerId === null && site.managerId) { 
                await Labor.findByIdAndUpdate(site.managerId, { site: null });
            }
        }

        // 2. Handle Task Completion Update
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
                site.status = "Completed"; 
            }
        }
        
        // 3. Handle Comment Addition
        if (comment) {
            site.updates.push({ userId, userName, comment });
        }
        
        // 4. Handle Overall Status Change 
        if (status) {
            site.status = status;
        }

        await site.save();
        res.json(site);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE Site (ADMIN ONLY) - CRITICAL: Deletes site, unassigns workers, and deletes file
router.delete('/:id', authAdmin, async (req, res) => {
    try {
        const site = await Site.findById(req.params.id);
        if (!site) {
            return res.status(404).json({ message: "Site not found." });
        }
        
        const siteName = site.siteName;

        // 1. Unassign ALL labors
        await Labor.updateMany(
            { site: siteName }, 
            { $set: { site: null } }
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

        res.json({ message: "Site deleted successfully, and workers unassigned." });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;