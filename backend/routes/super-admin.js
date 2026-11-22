const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const checkAuth = require("../middleware/auth");
const Restaurant = require("../models/Restaurant");
const SubscriptionPlan = require("../models/SubscriptionPlan");
const Lead = require("../models/Lead");
const User = require("../models/User");
const Branch = require("../models/Branch");
const Table = require("../models/Table");
const Category = require("../models/Category");
const MenuItem = require("../models/MenuItem");
const Order = require("../models/Order");
const OrderItem = require("../models/OrderItem");
const Settings = require("../models/Settings");
const Theme = require("../models/Theme");
const Notification = require("../models/Notification");
const Coupon = require("../models/Coupon");
const QRCode = require("../models/QRCode");
const { sendWelcomeRegistrationEmail, isSmtpConfigured } = require("../services/email");


router.use(checkAuth(["SUPER_ADMIN"]));

// 1. RESTAURANTS
router.get("/restaurants", async (req, res) => {
  try {
    const list = await Restaurant.find({}).populate("subscriptionPlan").sort({ createdAt: -1 });
    return res.json({ success: true, data: list });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch restaurants" });
  }
});

router.patch("/restaurants", async (req, res) => {
  try {
    const {
      id,
      status,
      isActive,
      isSuspended,
      customDomain,
      subscriptionEndsAt,
      subscriptionPlan,
      subscriptionStatus,
      hasKitchen,
      hasStaff,
      enabledModules,
      businessType,
    } = req.body;
    const updateFields = {};
    if (status !== undefined) updateFields.status = status;
    if (isActive !== undefined) updateFields.isActive = isActive;
    if (isSuspended !== undefined) updateFields.isSuspended = isSuspended;
    if (customDomain !== undefined) updateFields.customDomain = customDomain;
    if (businessType !== undefined) updateFields.businessType = businessType;
    if (subscriptionEndsAt !== undefined) {
      updateFields.subscriptionEndsAt = subscriptionEndsAt ? new Date(subscriptionEndsAt) : null;
    }
    if (subscriptionPlan !== undefined) updateFields.subscriptionPlan = subscriptionPlan || null;
    if (subscriptionStatus !== undefined) updateFields.subscriptionStatus = subscriptionStatus;
    if (hasKitchen !== undefined) updateFields.hasKitchen = Boolean(hasKitchen);
    if (hasStaff !== undefined) updateFields.hasStaff = Boolean(hasStaff);
    if (enabledModules !== undefined) updateFields.enabledModules = enabledModules;

    const updated = await Restaurant.findByIdAndUpdate(id, updateFields, { new: true }).populate("subscriptionPlan");
    return res.json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ error: "Failed to update restaurant" });
  }
});

router.post("/restaurants/:id/resend-credentials", async (req, res) => {
  try {
    const { id } = req.params;
    const { tempPassword } = req.body || {};
    const restaurant = await Restaurant.findById(id).populate("subscriptionPlan");
    if (!restaurant) {
      return res.status(404).json({ error: "Restaurant tenant not found" });
    }

    const adminUser = await User.findOne({ restaurantId: id, role: "RESTAURANT_ADMIN" });
    if (!adminUser) {
      return res.status(404).json({ error: "No administrator account found for this restaurant" });
    }

    let passwordToSend = tempPassword;
    if (!passwordToSend) {
      passwordToSend = "Sd@" + Math.random().toString(36).substring(2, 8) + "!";
      adminUser.password = await bcrypt.hash(passwordToSend, 10);
      await adminUser.save();
    }

    const mailResult = await sendWelcomeRegistrationEmail({
      email: adminUser.email,
      name: adminUser.name,
      restaurantName: restaurant.name,
      password: passwordToSend,
      plan: restaurant.subscriptionPlan,
      hasKitchen: restaurant.hasKitchen,
      hasStaff: restaurant.hasStaff,
    });

    return res.json({
      success: true,
      emailSent: Boolean(mailResult?.success),
      emailSkipped: Boolean(mailResult?.skipped),
      message: mailResult?.success
        ? `Credentials email dispatched to ${adminUser.email}`
        : `Generated password for ${adminUser.email}: ${passwordToSend} (Configure SMTP in backend/.env to send via email)`,
      generatedPassword: passwordToSend,
    });
  } catch (error) {
    console.error("Resend credentials error:", error);
    return res.status(500).json({ error: error.message || "Failed to resend credentials" });
  }
});

// SMTP Status route
router.get("/smtp-status", (req, res) => {
  const configured = isSmtpConfigured();
  return res.json({
    success: true,
    isConfigured: configured,
    smtpUser: configured ? process.env.SMTP_USER : null,
    smtpHost: process.env.SMTP_HOST || "smtp.gmail.com",
    notice: configured
      ? "SMTP service is active."
      : "SMTP is not yet configured. Please add your real Gmail and 16-digit App Password to SMTP_USER and SMTP_PASS in backend/.env.",
  });
});

// Delete a restaurant tenant and all associated data
router.delete("/restaurants/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const restaurant = await Restaurant.findById(id);
    if (!restaurant) {
      return res.status(404).json({ error: "Restaurant tenant not found" });
    }

    // Cascade delete all associated collections for this restaurant
    await Promise.all([
      User.deleteMany({ restaurantId: id }),
      Branch.deleteMany({ restaurantId: id }),
      Table.deleteMany({ restaurantId: id }),
      Category.deleteMany({ restaurantId: id }),
      MenuItem.deleteMany({ restaurantId: id }),
      Order.deleteMany({ restaurantId: id }),
      OrderItem.deleteMany({ restaurantId: id }),
      Settings.deleteMany({ restaurantId: id }),
      Theme.deleteMany({ restaurantId: id }),
      Notification.deleteMany({ restaurantId: id }),
      Coupon.deleteMany({ restaurantId: id }),
      QRCode.deleteMany({ restaurantId: id }),
      Restaurant.findByIdAndDelete(id),
    ]);

    return res.json({
      success: true,
      message: `Restaurant '${restaurant.name}' and all its accounts have been permanently deleted.`,
    });
  } catch (error) {
    console.error("Delete restaurant error:", error);
    return res.status(500).json({ error: error.message || "Failed to delete restaurant" });
  }
});

// Clear all test restaurants (Leaves Super Admin untouched)
router.post("/restaurants/clear-all", async (req, res) => {
  try {
    await Promise.all([
      Restaurant.deleteMany({}),
      User.deleteMany({ role: { $ne: "SUPER_ADMIN" } }),
      Branch.deleteMany({}),
      Table.deleteMany({}),
      Category.deleteMany({}),
      MenuItem.deleteMany({}),
      Order.deleteMany({}),
      OrderItem.deleteMany({}),
      Settings.deleteMany({}),
      Theme.deleteMany({}),
      Notification.deleteMany({}),
      Coupon.deleteMany({}),
      QRCode.deleteMany({}),
    ]);
    return res.json({
      success: true,
      message: "All restaurant tenants and accounts have been cleared. Super Admin remains intact.",
    });
  } catch (error) {
    console.error("Clear all restaurants error:", error);
    return res.status(500).json({ error: "Failed to clear restaurants" });
  }
});

// 2. SUBSCRIPTION PLANS
router.get("/plans", async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find({}).sort({ price: 1 });
    return res.json({ success: true, data: plans });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch plans" });
  }
});

router.post("/plans", async (req, res) => {
  try {
    const { name, price, billingCycle, maxBranches, maxTablesPerBranch, maxMenuItems, features, isActive } = req.body;
    const plan = await SubscriptionPlan.create({
      name, price, billingCycle, maxBranches, maxTablesPerBranch, maxMenuItems, features, isActive
    });
    return res.json({ success: true, data: plan });
  } catch (error) {
    return res.status(500).json({ error: "Failed to create plan" });
  }
});

router.patch("/plans", async (req, res) => {
  try {
    const { id, name, price, billingCycle, maxBranches, maxTablesPerBranch, maxMenuItems, features, isActive } = req.body;
    const updateFields = {};
    if (name !== undefined) updateFields.name = name;
    if (price !== undefined) updateFields.price = price;
    if (billingCycle !== undefined) updateFields.billingCycle = billingCycle;
    if (maxBranches !== undefined) updateFields.maxBranches = maxBranches;
    if (maxTablesPerBranch !== undefined) updateFields.maxTablesPerBranch = maxTablesPerBranch;
    if (maxMenuItems !== undefined) updateFields.maxMenuItems = maxMenuItems;
    if (features !== undefined) updateFields.features = features;
    if (isActive !== undefined) updateFields.isActive = isActive;

    const updated = await SubscriptionPlan.findByIdAndUpdate(id, updateFields, { new: true });
    return res.json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ error: "Failed to update plan" });
  }
});

// 3. LEADS & INQUIRIES
router.get("/leads", async (req, res) => {
  try {
    const list = await Lead.find({}).sort({ createdAt: -1 });
    return res.json({ success: true, data: list });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch leads" });
  }
});

router.patch("/leads", async (req, res) => {
  try {
    const { id, status } = req.body;
    if (!id || !status) {
      return res.status(400).json({ error: "Lead ID and status are required" });
    }
    const updated = await Lead.findByIdAndUpdate(id, { status }, { new: true });
    if (!updated) {
      return res.status(404).json({ error: "Lead not found" });
    }
    return res.json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ error: "Failed to update lead status" });
  }
});

router.delete("/leads/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Lead.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ error: "Lead not found" });
    }
    return res.json({ success: true, message: "Lead deleted successfully" });
  } catch (error) {
    return res.status(500).json({ error: "Failed to delete lead" });
  }
});

module.exports = router;

