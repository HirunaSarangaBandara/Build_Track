const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

// Import models
const Site = require("./models/Site");
const Labor = require("./models/Labor");
const Inventory = require("./models/Inventory");
const User = require("./models/User");

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

// Default construction tasks
const DEFAULT_TASKS = [
  { name: "Create Foundation" },
  { name: "Build Ground Floor Walls" },
  { name: "Install Slab/Roofing" },
  { name: "Rough-in Electrical/Plumbing" },
  { name: "Interior Finishing (Plastering, Tiling)" },
  { name: "Exterior Finishing (Paint, Landscaping)" },
  { name: "Final Inspection and Handover" },
];

// Seed admin user
const seedAdminUser = {
  name: "Administrator",
  username: "admin",
  password: "admin123",
  role: "admin",
};

// Seed data
const seedSites = [
  {
    siteName: "Downtown Tower A",
    siteNameKey: "Downtown Tower A",
    status: "Active",
    currentStatus: "Foundation work in progress",
    tasks: DEFAULT_TASKS,
    startDate: new Date("2026-01-01"),
  },
  {
    siteName: "Riverside Apartments",
    siteNameKey: "Riverside Apartments",
    status: "Active",
    currentStatus: "Building ground floor walls",
    tasks: DEFAULT_TASKS,
    startDate: new Date("2026-01-10"),
  },
  {
    siteName: "Green Valley Complex",
    siteNameKey: "Green Valley Complex",
    status: "Planned",
    currentStatus: "Site planning and permits",
    tasks: DEFAULT_TASKS,
    startDate: new Date("2026-02-01"),
  },
  {
    siteName: "Sunset Boulevard Mall",
    siteNameKey: "Sunset Boulevard Mall",
    status: "On Hold",
    currentStatus: "Waiting for material delivery",
    tasks: DEFAULT_TASKS,
    startDate: new Date("2025-12-15"),
  },
  {
    siteName: "Oak Street Residence",
    siteNameKey: "Oak Street Residence",
    status: "Completed",
    currentStatus: "Project completed and handed over",
    tasks: DEFAULT_TASKS,
    startDate: new Date("2025-08-01"),
  },
  {
    siteName: "Harbor View Office",
    siteNameKey: "Harbor View Office",
    status: "Active",
    currentStatus: "Interior finishing",
    tasks: DEFAULT_TASKS,
    startDate: new Date("2025-11-20"),
  },
];

const seedWorkers = [
  {
    name: "John Mason",
    email: "john.mason@buildtrack.com",
    username: "johnmason1001",
    password: "password123",
    role: "Worker",
    category: "Mason",
    contact: "+1-555-0101",
    sites: ["Downtown Tower A"],
  },
  {
    name: "Mike Carpenter",
    email: "mike.carpenter@buildtrack.com",
    username: "mikecarpenter1002",
    password: "password123",
    role: "Worker",
    category: "Carpenter",
    contact: "+1-555-0102",
    sites: ["Riverside Apartments"],
  },
  {
    name: "Sarah Electrician",
    email: "sarah.elect@buildtrack.com",
    username: "sarahelectrician1003",
    password: "password123",
    role: "Worker",
    category: "Electrician",
    contact: "+1-555-0103",
    sites: ["Downtown Tower A", "Harbor View Office"],
  },
  {
    name: "Tom Plumber",
    email: "tom.plumber@buildtrack.com",
    username: "tomplumber1004",
    password: "password123",
    role: "Worker",
    category: "Plumber",
    contact: "+1-555-0104",
    sites: ["Riverside Apartments"],
  },
  {
    name: "Lisa Painter",
    email: "lisa.painter@buildtrack.com",
    username: "lisapainter1005",
    password: "password123",
    role: "Worker",
    category: "Painter",
    contact: "+1-555-0105",
    sites: ["Harbor View Office"],
  },
  {
    name: "David Welder",
    email: "david.welder@buildtrack.com",
    username: "davidwelder1006",
    password: "password123",
    role: "Worker",
    category: "Welder",
    contact: "+1-555-0106",
    sites: ["Downtown Tower A"],
  },
  {
    name: "Emma Supervisor",
    email: "emma.super@buildtrack.com",
    username: "emmasupervisor1007",
    password: "password123",
    role: "Worker",
    category: "Supervisor",
    contact: "+1-555-0107",
    sites: ["Downtown Tower A", "Riverside Apartments"],
  },
  {
    name: "Robert Helper",
    email: "robert.helper@buildtrack.com",
    username: "roberthelper1008",
    password: "password123",
    role: "Worker",
    category: "Helper",
    contact: "+1-555-0108",
    sites: ["Harbor View Office"],
  },
];

const seedInventory = [
  // Cement & Aggregates
  {
    name: "Portland Cement",
    category: "Cement & Aggregates",
    quantity: 150,
    unit: "bags",
  },
  {
    name: "River Sand",
    category: "Cement & Aggregates",
    quantity: 30,
    unit: "tons",
  },
  {
    name: "Gravel",
    category: "Cement & Aggregates",
    quantity: 5,
    unit: "tons",
  },

  // Steel & Metal
  {
    name: "Steel Rebar 12mm",
    category: "Steel & Metal",
    quantity: 200,
    unit: "pieces",
  },
  {
    name: "Steel Mesh",
    category: "Steel & Metal",
    quantity: 45,
    unit: "sheets",
  },
  {
    name: "Aluminum Sheets",
    category: "Steel & Metal",
    quantity: 0,
    unit: "sheets",
  },

  // Wood & Timber
  {
    name: "Plywood 4x8",
    category: "Wood & Timber",
    quantity: 80,
    unit: "sheets",
  },
  {
    name: "2x4 Lumber",
    category: "Wood & Timber",
    quantity: 25,
    unit: "pieces",
  },

  // Plumbing
  {
    name: "PVC Pipes 4 inch",
    category: "Plumbing",
    quantity: 100,
    unit: "pieces",
  },
  {
    name: "Copper Pipes",
    category: "Plumbing",
    quantity: 15,
    unit: "meters",
  },
  {
    name: "Water Valves",
    category: "Plumbing",
    quantity: 0,
    unit: "pieces",
  },

  // Electrical
  {
    name: "Electrical Wire 2.5mm",
    category: "Electrical",
    quantity: 500,
    unit: "meters",
  },
  {
    name: "Circuit Breakers",
    category: "Electrical",
    quantity: 40,
    unit: "pieces",
  },
  {
    name: "LED Light Fixtures",
    category: "Electrical",
    quantity: 10,
    unit: "pieces",
  },

  // Tools & Equipment
  {
    name: "Power Drill",
    category: "Tools & Equipment",
    quantity: 8,
    unit: "units",
  },
  {
    name: "Concrete Mixer",
    category: "Tools & Equipment",
    quantity: 3,
    unit: "units",
  },

  // Safety Gear
  {
    name: "Safety Helmets",
    category: "Safety Gear",
    quantity: 75,
    unit: "pieces",
  },
  {
    name: "Safety Gloves",
    category: "Safety Gear",
    quantity: 120,
    unit: "pairs",
  },
  {
    name: "Safety Goggles",
    category: "Safety Gear",
    quantity: 0,
    unit: "pieces",
  },

  // Finishing Materials
  {
    name: "White Paint 5L",
    category: "Finishing Materials",
    quantity: 60,
    unit: "cans",
  },
  {
    name: "Floor Tiles",
    category: "Finishing Materials",
    quantity: 35,
    unit: "boxes",
  },
  {
    name: "Wallpaper Rolls",
    category: "Finishing Materials",
    quantity: 5,
    unit: "rolls",
  },
];

const seedDatabase = async () => {
    await User.deleteMany({});

    console.log("Adding admin user...");
    const hashedAdminPassword = await bcrypt.hash(seedAdminUser.password, 10);
    await User.create({
      ...seedAdminUser,
      password: hashedAdminPassword,
    });
    console.log(`✅ Added admin user (username: admin, password: admin123)`);
  try {
    await connectDB();

    // Clear existing data
    console.log("Clearing existing data...");
    await Site.deleteMany({});
    await Labor.deleteMany({});
    await Inventory.deleteMany({});

    console.log("Adding sites...");
    await Site.insertMany(seedSites);
    console.log(`✅ Added ${seedSites.length} sites`);

    console.log("Adding workers...");
    // Hash passwords before inserting
    const workersWithHashedPasswords = await Promise.all(
      seedWorkers.map(async (worker) => ({
        ...worker,
        password: await bcrypt.hash(worker.password, 10),
      }))
    );
    await Labor.insertMany(workersWithHashedPasswords);
    console.log(`✅ Added ${seedWorkers.length} workers`);

    console.log("Adding inventory items...");
    await Inventory.insertMany(seedInventory);
    console.log(`✅ Added ${seedInventory.length} inventory items`);

    console.log("\n🎉 Database seeded successfully!");
    console.log("\nTest Data Summary:");
    console.log(`- Admin User: username=admin, password=admin123`);
    console.log(`- Sites: ${seedSites.length}`);
    console.log(
      `  • Active: ${seedSites.filter((s) => s.status === "Active").length}`
    );
    console.log(
      `  • Planned: ${seedSites.filter((s) => s.status === "Planned").length}`
    );
    console.log(
      `  • On Hold: ${seedSites.filter((s) => s.status === "On Hold").length}`
    );
    console.log(
      `  • Completed: ${
        seedSites.filter((s) => s.status === "Completed").length
      }`
    );
    console.log(`- Workers: ${seedWorkers.length}`);
    console.log(`- Inventory Items: ${seedInventory.length}`);

    process.exit(0);
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
};

seedDatabase();
