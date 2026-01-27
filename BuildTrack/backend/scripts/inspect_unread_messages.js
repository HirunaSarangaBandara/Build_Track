const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config({ path: path.join(__dirname, '..', '.env') });
const Message = require('../models/Message');
const Labor = require('../models/Labor');

async function main() {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI not set in .env');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  try {
    const labors = await Labor.find({}).select('_id name role').lean();
    console.log(`Found ${labors.length} labors`);

    for (const labor of labors) {
      const id = labor._id;
      const count = await Message.countDocuments({ receiver: id, read: false });
      if (count > 0) {
        console.log(`- ${labor.name} (${labor.role}) has ${count} unread`);
        const samples = await Message.find({ receiver: id, read: false }).limit(5).populate('sender','name role').lean();
        samples.forEach(m => {
          console.log('  sample:', m._id, '| sender=', m.sender?.name || m.sender, '| content=', (m.content||'').slice(0,50), '| createdAt=', m.createdAt);
        });
      }
    }

    // Check messages addressed to admin placeholder
    const ADMIN_ID = '000000000000000000000001';
    const adminCount = await Message.countDocuments({ receiver: ADMIN_ID, read: false });
    console.log(`Admin placeholder ${ADMIN_ID} has ${adminCount} unread`);
    const adminSamples = await Message.find({ receiver: ADMIN_ID, read: false }).limit(5).populate('sender','name role').lean();
    adminSamples.forEach(m => {
      console.log('  admin sample:', m._id, '| sender=', m.sender?.name || m.sender, '| content=', (m.content||'').slice(0,50), '| createdAt=', m.createdAt);
    });

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

main();
