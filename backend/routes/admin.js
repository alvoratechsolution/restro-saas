const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const QRCodeGenerator = require("qrcode");

const checkAuth = require("../middleware/auth");
const checkFeature = require("../middleware/subscription");
const Category = require("../models/Category");
const MenuItem = require("../models/MenuItem");
const Variant = require("../models/Variant");
const Addon = require("../models/Addon");
const Table = require("../models/Table");
const QRCode = require("../models/QRCode");
const User = require("../models/User");
const Settings = require("../models/Settings");
const Coupon = require("../models/Coupon");
const Order = require("../models/Order");
const OrderItem = require("../models/OrderItem");
const Restaurant = require("../models/Restaurant");
const Notification = require("../models/Notification");
const { sendStaffInviteEmail } = require("../services/email");
const { seedMasterMenuForRestaurant } = require("../data/masterMenu");

// Apply authentication middleware to all sub-routes here
router.use(checkAuth(["RESTAURANT_ADMIN", "BRANCH_MANAGER", "KITCHEN", "STAFF", "CASHIER"]));

// 1. DASHBOARD ANALYTICS
router.get("/dashboard", async (req, res) => {
  try {
    const { restaurantId } = req.user;
    if (!restaurantId) {
      return res.status(400).json({ error: "Missing restaurant bound" });
    }

    const restroObjectId = new mongoose.Types.ObjectId(restaurantId);

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const todayOrders = await Order.find({
      restaurantId: restroObjectId,
      createdAt: { $gte: startOfToday, $lte: endOfToday }
    });

    const todayCount = todayOrders.length;
    const todayRevenue = Math.round(todayOrders
      .filter(o => o.paymentStatus === "Paid" || o.status === "Completed")
      .reduce((sum, o) => sum + (o.total || 0), 0));

    const allTimeOrders = await Order.find({ restaurantId: restroObjectId });
    const totalOrders = allTimeOrders.length;
    const totalRevenue = Math.round(allTimeOrders
      .filter(o => o.paymentStatus === "Paid" || o.status === "Completed")
      .reduce((sum, o) => sum + (o.total || 0), 0));

    const completedOrders = allTimeOrders.filter(o => o.status === "Completed").length;
    const cancelledOrders = allTimeOrders.filter(o => o.status === "Cancelled").length;

    // Top selling
    const topSelling = await Order.aggregate([
      { $match: { restaurantId: restroObjectId, status: "Completed" } },
      { $unwind: "$items" },
      { $lookup: {
          from: "orderitems",
          localField: "items",
          foreignField: "_id",
          as: "orderItem"
      }},
      { $unwind: "$orderItem" },
      { $group: {
          _id: "$orderItem.menuItemId",
          name: { $first: "$orderItem.name" },
          totalQty: { $sum: "$orderItem.quantity" },
          totalSales: { $sum: { $multiply: ["$orderItem.price", "$orderItem.quantity"] } }
      }},
      { $sort: { totalQty: -1 } },
      { $limit: 5 }
    ]);

    // Last 6 months trend
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const monthlySales = await Order.aggregate([
      { $match: {
          restaurantId: restroObjectId,
          $or: [{ paymentStatus: "Paid" }, { status: "Completed" }],
          createdAt: { $gte: sixMonthsAgo }
      }},
      { $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
          },
          revenue: { $sum: "$total" },
          orders: { $sum: 1 }
      }},
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    const monthsName = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const chartData = monthlySales.map(item => {
      const monthIndex = item._id.month - 1;
      return {
        name: `${monthsName[monthIndex]} ${item._id.year}`,
        revenue: item.revenue,
        orders: item.orders
      };
    });

    return res.json({
      success: true,
      data: {
        todayCount,
        todayRevenue,
        totalOrders,
        totalRevenue,
        completedOrders,
        cancelledOrders,
        topSelling,
        chartData
      }
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return res.status(500).json({ error: "Failed to fetch dashboard" });
  }
});

// 2. CATEGORIES
router.get("/categories", checkFeature("menu"), async (req, res) => {
  try {
    let categories = await Category.find({ restaurantId: req.user.restaurantId }).sort({ sortOrder: 1, name: 1 });
    if (categories.length === 0) {
      try {
        await seedMasterMenuForRestaurant(req.user.restaurantId);
        categories = await Category.find({ restaurantId: req.user.restaurantId }).sort({ sortOrder: 1, name: 1 });
      } catch (seedErr) {
        console.error("Auto-seed categories error:", seedErr);
      }
    }
    return res.json({ success: true, data: categories });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch categories" });
  }
});

router.post("/categories", checkFeature("menu"), async (req, res) => {
  try {
    const { name, description, sortOrder, isActive } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });

    const category = await Category.create({
      restaurantId: req.user.restaurantId,
      name,
      description,
      sortOrder: sortOrder || 0,
      isActive: isActive !== undefined ? isActive : true,
    });
    return res.json({ success: true, data: category });
  } catch (error) {
    return res.status(500).json({ error: "Failed to create category" });
  }
});

router.patch("/categories", checkFeature("menu"), async (req, res) => {
  try {
    const { id, name, description, sortOrder, isActive } = req.body;
    const updateFields = {};
    if (name !== undefined) updateFields.name = name;
    if (description !== undefined) updateFields.description = description;
    if (sortOrder !== undefined) updateFields.sortOrder = sortOrder;
    if (isActive !== undefined) updateFields.isActive = isActive;

    const updated = await Category.findOneAndUpdate(
      { _id: id, restaurantId: req.user.restaurantId },
      updateFields,
      { new: true }
    );
    return res.json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ error: "Failed to update category" });
  }
});

router.delete("/categories", checkFeature("menu"), async (req, res) => {
  try {
    const { id } = req.query;
    await Category.findOneAndDelete({ _id: id, restaurantId: req.user.restaurantId });
    return res.json({ success: true, message: "Category deleted" });
  } catch (error) {
    return res.status(500).json({ error: "Failed to delete" });
  }
});

// 3. MENU ITEMS
router.get("/menu", checkFeature("menu"), async (req, res) => {
  try {
    let menuItems = await MenuItem.find({ restaurantId: req.user.restaurantId })
      .populate("categoryId")
      .populate("variants")
      .populate("addons")
      .sort({ name: 1 });

    if (menuItems.length === 0) {
      try {
        await seedMasterMenuForRestaurant(req.user.restaurantId);
        menuItems = await MenuItem.find({ restaurantId: req.user.restaurantId })
          .populate("categoryId")
          .populate("variants")
          .populate("addons")
          .sort({ name: 1 });
      } catch (seedErr) {
        console.error("Auto-seed menu error:", seedErr);
      }
    }

    return res.json({ success: true, data: menuItems });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch menu items" });
  }
});

// Explicit endpoint to seed or reset the complete 28-category 189-item Master Catalog
router.post("/menu/load-master-menu", checkFeature("menu"), async (req, res) => {
  try {
    const { overwrite } = req.body;
    const result = await seedMasterMenuForRestaurant(req.user.restaurantId, { overwrite: Boolean(overwrite) });
    return res.json({
      success: true,
      message: `Master Menu loaded successfully (${result.categoriesCount} categories, ${result.itemsCount} dishes)!`,
      result,
    });
  } catch (error) {
    console.error("Load master menu error:", error);
    return res.status(500).json({ error: error.message || "Failed to load master menu" });
  }
});

router.post("/menu", checkFeature("menu"), async (req, res) => {
  try {
    const { restaurantId, branchId } = req.user;
    const {
      categoryId, name, description, price, images, foodType, spicyLevel,
      preparationTime, calories, isRecommended, isPopular, isOutOfStock, variants, addons
    } = req.body;

    const menuItem = await MenuItem.create({
      restaurantId,
      categoryId,
      name,
      description,
      price,
      images: images || [],
      foodType: foodType || "veg",
      spicyLevel: spicyLevel || 0,
      preparationTime,
      calories,
      isRecommended: isRecommended || false,
      isPopular: isPopular || false,
      isOutOfStock: isOutOfStock || false,
      branchAvailability: branchId ? [branchId] : [],
      isActive: true,
    });

    const variantIds = [];
    if (variants && Array.isArray(variants)) {
      for (const v of variants) {
        const doc = await Variant.create({
          restaurantId, menuItemId: menuItem._id, name: v.name, price: v.price, isActive: true
        });
        variantIds.push(doc._id);
      }
    }

    const addonIds = [];
    if (addons && Array.isArray(addons)) {
      for (const a of addons) {
        const doc = await Addon.create({
          restaurantId, menuItemId: menuItem._id, name: a.name, price: a.price, isActive: true
        });
        addonIds.push(doc._id);
      }
    }

    menuItem.variants = variantIds;
    menuItem.addons = addonIds;
    await menuItem.save();

    return res.json({ success: true, data: menuItem });
  } catch (error) {
    console.error("Create menu error:", error);
    return res.status(500).json({ error: "Failed to create menu item" });
  }
});

router.patch("/menu", checkFeature("menu"), async (req, res) => {
  try {
    const { restaurantId } = req.user;
    const {
      id, categoryId, name, description, price, images, foodType, spicyLevel,
      preparationTime, calories, isRecommended, isPopular, isOutOfStock, isActive, variants, addons
    } = req.body;

    const updateFields = {};
    if (categoryId !== undefined) updateFields.categoryId = categoryId;
    if (name !== undefined) updateFields.name = name;
    if (description !== undefined) updateFields.description = description;
    if (price !== undefined) updateFields.price = price;
    if (images !== undefined) updateFields.images = images;
    if (foodType !== undefined) updateFields.foodType = foodType;
    if (spicyLevel !== undefined) updateFields.spicyLevel = spicyLevel;
    if (preparationTime !== undefined) updateFields.preparationTime = preparationTime;
    if (calories !== undefined) updateFields.calories = calories;
    if (isRecommended !== undefined) updateFields.isRecommended = isRecommended;
    if (isPopular !== undefined) updateFields.isPopular = isPopular;
    if (isOutOfStock !== undefined) updateFields.isOutOfStock = isOutOfStock;
    if (isActive !== undefined) updateFields.isActive = isActive;

    if (variants && Array.isArray(variants)) {
      await Variant.deleteMany({ menuItemId: id, restaurantId });
      const ids = [];
      for (const v of variants) {
        const doc = await Variant.create({ restaurantId, menuItemId: id, name: v.name, price: v.price });
        ids.push(doc._id);
      }
      updateFields.variants = ids;
    }

    if (addons && Array.isArray(addons)) {
      await Addon.deleteMany({ menuItemId: id, restaurantId });
      const ids = [];
      for (const a of addons) {
        const doc = await Addon.create({ restaurantId, menuItemId: id, name: a.name, price: a.price });
        ids.push(doc._id);
      }
      updateFields.addons = ids;
    }

    const updated = await MenuItem.findOneAndUpdate(
      { _id: id, restaurantId },
      updateFields,
      { new: true }
    );
    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error("Update menu error:", error);
    return res.status(500).json({ error: "Failed to update menu item" });
  }
});

router.delete("/menu", checkFeature("menu"), async (req, res) => {
  try {
    const { id } = req.query;
    await MenuItem.findOneAndDelete({ _id: id, restaurantId: req.user.restaurantId });
    await Variant.deleteMany({ menuItemId: id, restaurantId: req.user.restaurantId });
    await Addon.deleteMany({ menuItemId: id, restaurantId: req.user.restaurantId });
    return res.json({ success: true, message: "Menu item deleted" });
  } catch (error) {
    return res.status(500).json({ error: "Failed to delete" });
  }
});

// 4. TABLES & QR CODES
router.get("/tables", checkFeature("qr-tables"), async (req, res) => {
  try {
    const rawTables = await Table.find({ branchId: req.user.branchId });
    // Sort tables naturally (e.g. 1, 2, 3 ... 35 or T1, T2 ... T35)
    const tables = rawTables.sort((a, b) => {
      const numA = parseInt(String(a.tableNumber).replace(/\D/g, ""), 10) || 0;
      const numB = parseInt(String(b.tableNumber).replace(/\D/g, ""), 10) || 0;
      if (numA !== numB) return numA - numB;
      return String(a.tableNumber).localeCompare(String(b.tableNumber), undefined, { numeric: true });
    });
    const qrcodes = await QRCode.find({ branchId: req.user.branchId });
    const restaurant = await Restaurant.findById(req.user.restaurantId);
    return res.json({
      success: true,
      tables,
      qrcodes,
      restaurant: restaurant ? { name: restaurant.name, slug: restaurant.slug, address: restaurant.address, phone: restaurant.phone } : null
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch tables" });
  }
});

// Bulk create / ensure 35 tables
router.post("/tables/bulk-create-35", checkFeature("qr-tables"), async (req, res) => {
  try {
    const { restaurantId, branchId } = req.user;
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) return res.status(404).json({ error: "Restaurant not found" });

    const totalToEnsure = 35;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.headers.origin || "https://servedesk.tech";
    const createdTables = [];

    for (let i = 1; i <= totalToEnsure; i++) {
      const tableNumber = String(i);
      let table = await Table.findOne({ branchId, tableNumber });
      if (!table) {
        // Natural seating capacity (2, 4, 6, 8 seaters)
        const seatingCapacity = i % 5 === 0 ? 6 : i % 3 === 0 ? 4 : i % 7 === 0 ? 8 : 2;
        table = await Table.create({
          restaurantId,
          branchId,
          tableNumber,
          seatingCapacity,
          status: "available",
          isActive: true
        });
        createdTables.push(table);
      }

      // Ensure QR Code exists
      let qr = await QRCode.findOne({ branchId, tableId: table._id });
      if (!qr) {
        const qrUrl = `${appUrl}/${restaurant.slug}/table/${tableNumber}`;
        const dataUrl = await QRCodeGenerator.toDataURL(qrUrl, {
          width: 500,
          margin: 2,
          color: { dark: "#0f172a", light: "#ffffff" }
        });
        await QRCode.create({
          restaurantId,
          branchId,
          tableId: table._id,
          type: "table",
          qrCodeUrl: dataUrl
        });
      }
    }

    return res.json({
      success: true,
      message: `35 tables are active! Created ${createdTables.length} new tables with QR codes.`,
      createdCount: createdTables.length
    });
  } catch (error) {
    console.error("Bulk create 35 tables error:", error);
    return res.status(500).json({ error: "Failed to generate 35 tables" });
  }
});

router.post("/tables", checkFeature("qr-tables"), async (req, res) => {
  try {
    const { restaurantId, branchId } = req.user;
    const { tableNumber, seatingCapacity } = req.body;

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) return res.status(404).json({ error: "Restaurant not found" });

    const existing = await Table.findOne({ branchId, tableNumber });
    if (existing) return res.status(400).json({ error: "Table already exists" });

    const table = await Table.create({
      restaurantId, branchId, tableNumber, seatingCapacity: seatingCapacity || 2, status: "available"
    });

    // Generate QR URL based on target app URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.headers.origin || "https://servedesk.tech";
    const qrUrl = `${appUrl}/${restaurant.slug}/table/${tableNumber}`;

    const dataUrl = await QRCodeGenerator.toDataURL(qrUrl, {
      width: 500, margin: 2, color: { dark: "#0f172a", light: "#ffffff" }
    });

    const qrcode = await QRCode.create({
      restaurantId, branchId, tableId: table._id, type: "table", qrCodeUrl: dataUrl
    });

    return res.json({ success: true, table, qrcode });
  } catch (error) {
    console.error("Table create error:", error);
    return res.status(500).json({ error: "Failed to create table" });
  }
});

// Regenerate all table QR codes to production domain
router.post("/tables/regenerate-qrs", checkFeature("qr-tables"), async (req, res) => {
  try {
    const { restaurantId, branchId } = req.user;
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) return res.status(404).json({ error: "Restaurant not found" });

    const tables = await Table.find({ branchId });
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://servedesk.tech";

    let updatedCount = 0;
    for (const table of tables) {
      const qrUrl = `${appUrl}/${restaurant.slug}/table/${table.tableNumber}`;
      const dataUrl = await QRCodeGenerator.toDataURL(qrUrl, {
        width: 500, margin: 2, color: { dark: "#0f172a", light: "#ffffff" }
      });

      await QRCode.findOneAndUpdate(
        { branchId, tableId: table._id },
        { restaurantId, branchId, tableId: table._id, type: "table", qrCodeUrl: dataUrl },
        { upsert: true, new: true }
      );
      updatedCount++;
    }

    return res.json({
      success: true,
      message: `Successfully regenerated ${updatedCount} QR codes to ${appUrl}`
    });
  } catch (error) {
    console.error("Regenerate QR error:", error);
    return res.status(500).json({ error: "Failed to regenerate QR codes" });
  }
});

router.delete("/tables", checkFeature("qr-tables"), async (req, res) => {
  try {
    const { id } = req.query;
    await Table.findOneAndDelete({ _id: id, branchId: req.user.branchId });
    await QRCode.findOneAndDelete({ tableId: id, branchId: req.user.branchId });
    return res.json({ success: true, message: "Table and QR removed" });
  } catch (error) {
    return res.status(500).json({ error: "Failed to delete table" });
  }
});

// 5. STAFF CREDENTIALS
router.get("/staff", checkFeature("staff"), async (req, res) => {
  try {
    const staff = await User.find({
      restaurantId: req.user.restaurantId,
      role: { $in: ["BRANCH_MANAGER", "KITCHEN", "STAFF", "CASHIER"] }
    }).sort({ createdAt: -1 });
    return res.json({ success: true, data: staff });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch staff" });
  }
});

router.post("/staff", checkFeature("staff"), async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ error: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role,
      restaurantId: req.user.restaurantId,
      branchId: req.user.branchId,
      isActive: true,
    });

    try {
      const rest = await Restaurant.findById(req.user.restaurantId);
      await sendStaffInviteEmail(email, name, role, rest ? rest.name : "Restaurant", password);
    } catch (mailErr) {
      console.warn("Staff invite email notice:", mailErr.message);
    }

    return res.json({ success: true, data: user });
  } catch (error) {
    return res.status(500).json({ error: "Failed to create user" });
  }
});

router.delete("/staff", checkFeature("staff"), async (req, res) => {
  try {
    const { id } = req.query;
    if (id === req.user.id) return res.status(400).json({ error: "Cannot delete yourself" });
    await User.findOneAndDelete({ _id: id, restaurantId: req.user.restaurantId });
    return res.json({ success: true, message: "User deleted" });
  } catch (error) {
    return res.status(500).json({ error: "Failed to delete" });
  }
});

// 6. COUPONS
router.get("/coupons", checkFeature("coupons"), async (req, res) => {
  try {
    const coupons = await Coupon.find({ restaurantId: req.user.restaurantId }).sort({ endDate: -1 });
    return res.json({ success: true, data: coupons });
  } catch (error) {
    return res.status(500).json({ error: "Failed to load coupons" });
  }
});

router.post("/coupons", checkFeature("coupons"), async (req, res) => {
  try {
    const { code, discountType, discountValue, minOrderValue, endDate } = req.body;
    const existing = await Coupon.findOne({ restaurantId: req.user.restaurantId, code: code.toUpperCase() });
    if (existing) return res.status(400).json({ error: "Coupon already exists" });

    const coupon = await Coupon.create({
      restaurantId: req.user.restaurantId,
      code: code.toUpperCase(),
      discountType,
      discountValue,
      minOrderValue: minOrderValue || 0,
      endDate: new Date(endDate),
    });
    return res.json({ success: true, data: coupon });
  } catch (error) {
    return res.status(500).json({ error: "Failed to create coupon" });
  }
});

router.delete("/coupons", checkFeature("coupons"), async (req, res) => {
  try {
    const { id } = req.query;
    await Coupon.findOneAndDelete({ _id: id, restaurantId: req.user.restaurantId });
    return res.json({ success: true, message: "Coupon deleted" });
  } catch (error) {
    return res.status(500).json({ error: "Failed to delete" });
  }
});

// 7. BRANCH SETTINGS
router.get("/settings", async (req, res) => {
  try {
    let settings = await Settings.findOne({ branchId: req.user.branchId });
    if (!settings) {
      settings = await Settings.create({
        restaurantId: req.user.restaurantId,
        branchId: req.user.branchId,
        currency: "INR",
        cgstRate: 2.5,
        sgstRate: 2.5,
        enableSoundAlerts: true,
      });
    }
    return res.json({ success: true, data: settings });
  } catch (error) {
    return res.status(500).json({ error: "Failed to load settings" });
  }
});

router.patch("/settings", async (req, res) => {
  try {
    const updated = await Settings.findOneAndUpdate(
      { branchId: req.user.branchId },
      req.body,
      { new: true, upsert: true }
    );
    return res.json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ error: "Failed to update settings" });
  }
});

// 8. ORDERS MANAGEMENT
router.get("/orders", checkFeature("orders"), async (req, res) => {
  try {
    const { status } = req.query;
    const query = { branchId: req.user.branchId };
    if (status) query.status = status;

    const orders = await Order.find(query)
      .populate({ path: "items", populate: { path: "menuItemId" } })
      .populate("tableId")
      .sort({ createdAt: -1 });

    // Auto-consolidate any duplicate active unpaid orders for the same table into one unified order
    const tableActiveMap = new Map();
    for (const ord of orders) {
      if (ord.tableId && ord.status !== "Completed" && ord.status !== "Cancelled" && ord.paymentStatus !== "Paid") {
        const rawTable = ord.tableId.tableNumber || "";
        const tableKey = rawTable.toLowerCase().replace(/table\s*/i, "").replace(/t/i, "").trim() || rawTable.trim().toLowerCase();
        if (!tableActiveMap.has(tableKey)) {
          tableActiveMap.set(tableKey, [ord]);
        } else {
          tableActiveMap.get(tableKey).push(ord);
        }
      }
    }

    let needRefetch = false;
    for (const [, activeList] of tableActiveMap.entries()) {
      if (activeList.length > 1) {
        // Keep earliest as primary
        activeList.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        const primary = activeList[0];
        for (let i = 1; i < activeList.length; i++) {
          const secondary = activeList[i];
          if (secondary.items && secondary.items.length > 0) {
            const itemIds = secondary.items.map(it => it._id);
            await OrderItem.updateMany({ _id: { $in: itemIds } }, { orderId: primary._id });
            const primaryItemIds = primary.items.map(it => it._id.toString());
            for (const sItem of secondary.items) {
              if (!primaryItemIds.includes(sItem._id.toString())) {
                primary.items.push(sItem._id);
              }
            }
            primary.subtotal = Math.round((primary.subtotal || 0) + (secondary.subtotal || 0));
            primary.cgst = Math.round((primary.cgst || 0) + (secondary.cgst || 0));
            primary.sgst = Math.round((primary.sgst || 0) + (secondary.sgst || 0));
            primary.total = Math.round((primary.total || 0) + (secondary.total || 0));
            if (secondary.specialInstructions) {
              primary.specialInstructions = primary.specialInstructions
                ? `${primary.specialInstructions}; ${secondary.specialInstructions}`
                : secondary.specialInstructions;
            }
            await primary.save();
          }
          await Order.findByIdAndDelete(secondary._id);
          needRefetch = true;
        }
      }
    }

    const finalOrders = needRefetch
      ? await Order.find(query).populate({ path: "items", populate: { path: "menuItemId" } }).populate("tableId").sort({ createdAt: -1 })
      : orders;

    const restaurant = await Restaurant.findById(req.user.restaurantId);
    return res.json({
      success: true,
      data: finalOrders,
      restaurant: restaurant ? { name: restaurant.name, slug: restaurant.slug, address: restaurant.address, phone: restaurant.phone } : null
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch orders" });
  }
});

router.patch("/orders", checkFeature("orders"), async (req, res) => {
  try {
    const { id, status, paymentStatus, paymentMethod } = req.body;
    const order = await Order.findOne({ _id: id, branchId: req.user.branchId });
    if (!order) return res.status(404).json({ error: "Order not found" });

    const updateFields = {};
    if (status !== undefined) {
      updateFields.status = status;
      const mapping = { "Pending": "Pending", "Preparing": "Preparing", "Ready": "Ready", "Completed": "Served", "Cancelled": "Cancelled" };
      const itemStatus = mapping[status];
      if (itemStatus) {
        await OrderItem.updateMany({ orderId: id }, { status: itemStatus });
      }
      if ((status === "Completed" || status === "Cancelled") && order.tableId) {
        await Table.findByIdAndUpdate(order.tableId, { status: "available" });
      }
      if (status === "Completed") {
        updateFields.paymentStatus = "Paid";
      }
    }
    if (paymentStatus !== undefined) updateFields.paymentStatus = paymentStatus;
    if (paymentMethod !== undefined) updateFields.paymentMethod = paymentMethod;

    const updated = await Order.findByIdAndUpdate(id, updateFields, { new: true })
      .populate({ path: "items", populate: { path: "menuItemId" } });

    return res.json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ error: "Failed to update order" });
  }
});

// 8. RESTAURANT DETAILS
router.get("/restaurant-info", async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.user.restaurantId).populate("subscriptionPlan");
    if (!restaurant) return res.status(404).json({ error: "Restaurant not found" });
    return res.json({ success: true, data: restaurant });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch restaurant details" });
  }
});

// 9. NOTIFICATIONS & WAITER CALLS
router.get("/notifications", async (req, res) => {
  try {
    const notifs = await Notification.find({ restaurantId: req.user.restaurantId })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();
    const unreadCount = await Notification.countDocuments({
      restaurantId: req.user.restaurantId,
      isRead: false,
    });
    return res.json({ success: true, data: notifs, unreadCount });
  } catch (error) {
    console.error("Fetch notifications error:", error);
    return res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

router.put("/notifications/:id/read", async (req, res) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, restaurantId: req.user.restaurantId },
      { isRead: true }
    );
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: "Failed to mark notification as read" });
  }
});

router.put("/notifications/mark-all-read", async (req, res) => {
  try {
    await Notification.updateMany(
      { restaurantId: req.user.restaurantId, isRead: false },
      { isRead: true }
    );
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: "Failed to mark all as read" });
  }
});

router.delete("/notifications/clear", async (req, res) => {
  try {
    await Notification.deleteMany({ restaurantId: req.user.restaurantId });
    return res.json({ success: true, message: "Cleared all notifications" });
  } catch (error) {
    return res.status(500).json({ error: "Failed to clear notifications" });
  }
});

module.exports = router;
