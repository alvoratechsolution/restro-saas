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
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
    });
    console.log("Connected to MongoDB Atlas successfully");
    await ensureInitialData();
  } catch (error) {
    console.error("Database connection failure:", error);
    // Don't kill process immediately on transient network hiccups, retry
    setTimeout(dbConnect, 5000);
  }
};

const ensureInitialData = async () => {
  try {
    const User = require("../models/User");
    const SubscriptionPlan = require("../models/SubscriptionPlan");
    const bcrypt = require("bcrypt");

    // 1. Ensure Super Admin exists or sync with environment variables
    const superAdminEmail = (process.env.SUPER_ADMIN_EMAIL || "superadmin@servedesk.com").toLowerCase().trim();
    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD;

    let superAdmin = await User.findOne({ role: "SUPER_ADMIN" });
    if (!superAdmin) {
      const defaultPass = superAdminPassword || "AdminPass@" + Math.random().toString(36).substring(2, 10);
      const hashedPassword = await bcrypt.hash(defaultPass, 10);
      await User.create({
        name: "ServeDesk Super Admin",
        email: superAdminEmail,
        password: hashedPassword,
        role: "SUPER_ADMIN",
        isActive: true,
      });
      console.log(`[DB Init] Super Admin ready: ${superAdminEmail}`);
    } else if (superAdminPassword) {
      // Sync password if explicitly specified in environment
      const isMatch = await bcrypt.compare(superAdminPassword, superAdmin.password);
      if (!isMatch) {
        superAdmin.password = await bcrypt.hash(superAdminPassword, 10);
        if (process.env.SUPER_ADMIN_EMAIL) {
          superAdmin.email = superAdminEmail;
        }
        await superAdmin.save();
        console.log(`[DB Init] Super Admin credentials synced successfully.`);
      }
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
