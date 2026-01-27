const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config({ path: path.join(__dirname, '..', '.env') });
const Message = require('../models/Message');

async function main() {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI not set in .env');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  try {
    const count = await Message.countDocuments({});
    console.log(`Found ${count} message(s) in the collection.`);
    if (count === 0) {
      console.log('No messages to delete. Exiting.');
      process.exit(0);
    }

    const res = await Message.deleteMany({});
    console.log(`Deleted ${res.deletedCount} messages.`);
  } catch (err) {
    console.error('Error deleting messages:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

main();
