const mongoose = require("mongoose");
const dns = require("dns");

// Only set custom DNS fallback in local environment if needed, avoid overriding Cloud DNS on Render/Vercel
if (process.env.NODE_ENV !== "production") {
  try {
    dns.setServers(["8.8.8.8", "1.1.1.1"]);
  } catch (err) {
    // Ignore DNS set errors
  }
}

const dbConnect = async () => {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    console.error("Error: Please define MONGODB_URI in your environment variables.");
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 15000,
    });
    console.log("Connected to MongoDB Atlas successfully");
    await ensureInitialData();
  } catch (error) {
    console.error("Database connection failure:", error);
    process.exit(1);
  }
};

const ensureInitialData = async () => {
  try {
    const User = require("../models/User");
    const SubscriptionPlan = require("../models/SubscriptionPlan");
    const bcrypt = require("bcrypt");

    // 1. Ensure Super Admin exists
    const superAdminExists = await User.findOne({ role: "SUPER_ADMIN" });
    if (!superAdminExists) {
      const hashedPassword = await bcrypt.hash("SuperAdminPassword123!", 10);
      await User.create({
        name: "ServeDesk Super Admin",
        email: "superadmin@servedesk.com",
        password: hashedPassword,
        role: "SUPER_ADMIN",
        isActive: true,
      });
      console.log("[DB Init] Created default Super Admin: superadmin@servedesk.com / SuperAdminPassword123!");
    }

    // 2. Ensure default Subscription Plans exist
    const planCount = await SubscriptionPlan.countDocuments();
    if (planCount === 0) {
      await SubscriptionPlan.create([
        {
          name: "Trial Plan",
          price: 0,
          billingCycle: "monthly",
          maxBranches: 1,
          maxTablesPerBranch: 50,
          maxMenuItems: 50,
          features: ["menu", "orders", "qr-tables", "gst-billing"],
          isActive: true,
        },
        {
          name: "Premium Plan",
          price: 4900,
          billingCycle: "monthly",
          maxBranches: 3,
          maxTablesPerBranch: 30,
          maxMenuItems: 200,
          features: ["menu", "orders", "qr-tables", "inventory", "split-bill", "gst-billing"],
          isActive: true,
        },
        {
          name: "Enterprise Plan",
          price: 14900,
          billingCycle: "monthly",
          maxBranches: 10,
          maxTablesPerBranch: 100,
          maxMenuItems: 1000,
          features: ["menu", "orders", "qr-tables", "inventory", "split-bill", "white-label", "custom-domain", "gst-billing"],
          isActive: true,
        },
      ]);
      console.log("[DB Init] Created default Subscription Plans (Trial, Premium, Enterprise).");
    }
  } catch (err) {
    console.warn("[DB Init Notice] Auto-init check:", err.message);
  }
};

module.exports = dbConnect;
