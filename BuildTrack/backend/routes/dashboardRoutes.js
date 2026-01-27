const express = require('express');
const router = express.Router();
const Site = require('../models/Site');
const Labor = require('../models/Labor');
const Inventory = require('../models/Inventory');

// GET aggregated dashboard data
router.get('/', async (req, res) => {
  try {
    // Active sites count
    const activeSites = await Site.countDocuments({ status: 'Active' });

    // Pending work = total number of incomplete tasks across all sites
    const sites = await Site.find({}).select('siteName tasks status').lean();
    let pendingTasks = 0;
    const sitesProgress = sites.map((s) => {
      const total = (s.tasks || []).length;
      const completed = (s.tasks || []).filter((t) => t.isCompleted).length;
      const pending = Math.max(0, total - completed);
      pendingTasks += pending;
      const progress = total === 0 ? 0 : Math.round((completed / total) * 100);
      return { _id: s._id, siteName: s.siteName, status: s.status, progress, total, completed, pending };
    });

    // Prepare per-site pending task details for dashboard
    const pendingTasksDetails = sitesProgress
      .filter(s => s.pending > 0)
      .map(s => ({ _id: s._id, siteName: s.siteName, pending: s.pending }));

    // Workers count and breakdown
    const workersCount = await Labor.countDocuments({ role: 'Worker' });
    const managersCount = await Labor.countDocuments({ role: 'Manager' });
    const workers = await Labor.find({ role: 'Worker' }).select('name contact category sites createdAt').lean();

    // Inventory summary and full item list (name, category, quantity)
    const inventoryCount = await Inventory.countDocuments();
    const availabilitySummaryAgg = await Inventory.aggregate([
      { $group: { _id: '$availability', count: { $sum: 1 } } }
    ]);
    const availabilitySummary = availabilitySummaryAgg.reduce((acc, cur) => {
      acc[cur._id] = cur.count; return acc;
    }, {});

    const inventoryItems = await Inventory.find({}).select('name category quantity').lean();

    // Recent activities: latest site updates
    const recentSites = await Site.find({}).sort({ createdAt: -1 }).limit(5).select('siteName currentStatus updates createdAt').lean();

    // Unread messages for the current user (respect admin special id)
    const ADMIN_ID = '000000000000000000000001';
    const myId = req.user && req.user.role === 'admin' ? ADMIN_ID : req.user && req.user.id ? req.user.id : null;
    let unreadMessages = [];
    let unreadCount = 0;
    if (myId) {
      const Message = require('../models/Message');

      // Exclude obvious sample/test messages and anything older than 30 days
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);

      const sampleRegex = /hello|test|sample|sample message|lorem ipsum/i;

      // Ensure sender exists (not null) and filter out likely sample messages
      const baseFilter = {
        receiver: myId,
        read: false,
        createdAt: { $gte: cutoff },
        content: { $not: sampleRegex },
        sender: { $exists: true, $ne: null },
      };

      unreadCount = await Message.countDocuments(baseFilter);

      let rawUnread = await Message.find(baseFilter)
        .sort({ createdAt: -1 })
        .limit(20) // fetch more so we can filter and still return up to 5 valid alerts
        .populate('sender', 'name role')
        .lean();

      // normalize sender info but DO NOT include message content (only alert info)
      unreadMessages = rawUnread
        .map(m => ({
          _id: m._id,
          senderName: m.sender?.name || null,
          senderRole: m.sender?.role || null,
          createdAt: m.createdAt,
          alertText: m.sender?.name ? `${m.sender.name} sent you a message` : 'You have a new message',
        }))
        .filter(x => x.senderName) // drop entries with no sender name
        .slice(0, 5);
    }

    res.json({
      activeSites,
      pendingTasks,
      pendingTasksDetails,
      workersCount,
      managersCount,
      workers: workers.slice(0, 10),
      inventoryCount,
      availabilitySummary,
      inventoryItems,
      sitesProgress,
      recentSites,
      unreadCount,
      unreadMessages,
    });
  } catch (err) {
    console.error('Error building dashboard:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
