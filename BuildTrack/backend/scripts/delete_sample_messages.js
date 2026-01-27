const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

// Load .env from backend root
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const Message = require('../models/Message');

async function main() {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI not set in .env');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // Delete criteria: unread messages with missing sender or sample content
  const sampleRegex = /hello|test|sample|sample message|lorem ipsum/i;

  // Cutoff to limit scope (1 year)
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 365);

  const filter = {
    read: false,
    createdAt: { $gte: cutoff },
    $or: [
      { sender: { $exists: false } },
      { sender: null },
      { content: { $regex: sampleRegex } }
    ],
  };

  try {
    const toDelete = await Message.find(filter).lean();
    console.log(`Found ${toDelete.length} message(s) matching filter.`);
    if (toDelete.length === 0) {
      console.log('No messages to delete. Exiting.');
      process.exit(0);
    }

    const ids = toDelete.map(m => m._id);
    const res = await Message.deleteMany({ _id: { $in: ids } });
    console.log(`Deleted ${res.deletedCount} messages.`);
  } catch (err) {
    console.error('Error deleting messages:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

main();
