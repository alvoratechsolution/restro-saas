const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const Restaurant = require("../models/Restaurant");
const Branch = require("../models/Branch");
const Category = require("../models/Category");
const MenuItem = require("../models/MenuItem");
const Variant = require("../models/Variant");
const Addon = require("../models/Addon");
const SubscriptionPlan = require("../models/SubscriptionPlan");
const Theme = require("../models/Theme");
const Coupon = require("../models/Coupon");
const Table = require("../models/Table");
const Settings = require("../models/Settings");
const Order = require("../models/Order");
const OrderItem = require("../models/OrderItem");
const Notification = require("../models/Notification");
const Lead = require("../models/Lead");
const { seedMasterMenuForRestaurant } = require("../data/masterMenu");


// 1. RESOLVE RESTAURANT SLUG & MENU
router.get("/menu", async (req, res) => {
  try {
    const { slug, tableNumber } = req.query;
    if (!slug) return res.status(400).json({ error: "Slug is required" });

    // Look for restaurant by slug first (lean query for maximum speed)
    const restaurant = await Restaurant.findOne({ slug }).populate("subscriptionPlan").lean();
    if (!restaurant) return res.status(404).json({ success: false, error: "Restaurant not found" });

    // If restaurant is suspended or inactive, return closed status cleanly for customer scanner
    if (restaurant.isSuspended || !restaurant.isActive) {
      return res.json({
        success: false,
        isSuspended: true,
        restaurant: {
          _id: restaurant._id,
          name: restaurant.name,
          slug: restaurant.slug,
          isSuspended: Boolean(restaurant.isSuspended),
          isActive: Boolean(restaurant.isActive),
        },
        message: restaurant.isSuspended
          ? "This restaurant's ordering service is temporarily suspended by administration."
          : "This restaurant is currently closed.",
      });
    }

    const cleanTable = tableNumber ? decodeURIComponent(tableNumber).trim() : null;

    // Parallel optimized query execution: Fetch all required data in a single parallel roundtrip
    const [tableDoc, defaultBranch, themeDoc, settingsDoc, initialCategories, initialMenuItems] = await Promise.all([
      cleanTable
        ? Table.findOne({
            restaurantId: restaurant._id,
            tableNumber: { $regex: new RegExp(`^${cleanTable.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, "i") },
          }).lean()
        : null,
      Branch.findOne({ restaurantId: restaurant._id, isActive: true }).select("_id").lean(),
      Theme.findOne({ restaurantId: restaurant._id }).lean(),
      Settings.findOne({ restaurantId: restaurant._id }).lean(),
      Category.find({ restaurantId: restaurant._id, isActive: true }).sort({ sortOrder: 1, name: 1 }).lean(),
      MenuItem.find({ restaurantId: restaurant._id, isActive: true })
        .populate("variants")
        .populate("addons")
        .sort({ name: 1 })
        .lean(),
    ]);

    let branchId = tableDoc?.branchId || defaultBranch?._id || null;
    let settings = settingsDoc || {
      currency: "INR",
      enableGst: true,
      cgstRate: 2.5,
      sgstRate: 2.5,
      enableSoundAlerts: true,
    };

    const theme = themeDoc || {
      primaryColor: "#ea580c",
      secondaryColor: "#1e293b",
      fontFamily: "Plus Jakarta Sans",
    };

    let categories = initialCategories;
    let menuItems = initialMenuItems;

    // Auto-seed complete Master Catalog (28 categories, 189 dishes) if brand-new restaurant or empty menu
    if (categories.length === 0 || menuItems.length === 0) {
      try {
        await seedMasterMenuForRestaurant(restaurant._id);
        const [freshCategories, freshMenuItems] = await Promise.all([
          Category.find({ restaurantId: restaurant._id, isActive: true }).sort({ sortOrder: 1, name: 1 }).lean(),
          MenuItem.find({ restaurantId: restaurant._id, isActive: true })
            .populate("variants")
            .populate("addons")
            .sort({ name: 1 })
            .lean(),
        ]);
        categories = freshCategories;
        menuItems = freshMenuItems;
      } catch (seedErr) {
        console.error("Auto-seed master menu error:", seedErr);
      }
    }

    const restaurantObj = { ...restaurant };
    if (branchId) {
      restaurantObj.branchId = branchId;
    }

    // Set fast HTTP caching header so mobile browsers load instantly on subsequent visits
    res.set("Cache-Control", "private, max-age=10, stale-while-revalidate=30");

    return res.json({ success: true, restaurant: restaurantObj, theme, categories, menuItems, settings });
  } catch (error) {
    console.error("Load menu error:", error);
    return res.status(500).json({ error: "Failed to load menu" });
  }
});

// 2. VALIDATE COUPON
router.post("/coupons/validate", async (req, res) => {
  try {
    const { restaurantId, code, subtotal } = req.body;
    if (!restaurantId || !code || subtotal === undefined) {
      return res.status(400).json({ error: "Missing parameters" });
    }

    const coupon = await Coupon.findOne({
      restaurantId,
      code: code.toUpperCase(),
      isActive: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() },
    });

    if (!coupon) return res.status(400).json({ error: "Invalid or expired coupon" });
    if (subtotal < coupon.minOrderValue) {
      return res.status(400).json({ error: `Min order value required is ₹${coupon.minOrderValue}` });
    }

    let discountAmount = 0;
    if (coupon.discountType === "percentage") {
      discountAmount = (subtotal * coupon.discountValue) / 100;
      if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
        discountAmount = coupon.maxDiscountAmount;
      }
    } else {
      discountAmount = coupon.discountValue;
    }

    return res.json({
      success: true,
      coupon: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        minOrderValue: coupon.minOrderValue,
      },
      discountAmount,
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to validate coupon" });
  }
});

// Helper: match table flexibly (e.g. "1" matches "1", "Table 1", "T1", "Table-1")
async function findTablesForNumber(restaurantId, tableNumberStr) {
  if (!tableNumberStr) return [];
  const cleanTable = decodeURIComponent(tableNumberStr).trim();
  const digitsOnly = cleanTable.replace(/\D/g, "");

  const conditions = [
    { tableNumber: { $regex: new RegExp(`^${cleanTable.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, "i") } }
  ];
  if (digitsOnly) {
    conditions.push(
      { tableNumber: { $regex: new RegExp(`^table\\s*${digitsOnly}$`, "i") } },
      { tableNumber: { $regex: new RegExp(`^t${digitsOnly}$`, "i") } },
      { tableNumber: digitsOnly }
    );
  }

  return await Table.find({
    restaurantId,
    $or: conditions
  });
}

// 3. PLACE OR APPEND ORDER (CONSOLIDATED TABLE BILLING)
router.post("/orders", async (req, res) => {
  try {
    const {
      restaurantId,
      tableNumber,
      customerName,
      customerPhone,
      items,
      couponCode,
      paymentMethod,
      existingOrderId,
      specialInstructions,
    } = req.body;

    if (!restaurantId || !tableNumber || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Missing order parameters" });
    }

    const restaurant = await Restaurant.findById(restaurantId).populate("subscriptionPlan");
    if (!restaurant || restaurant.isSuspended || !restaurant.isActive) {
      return res.status(403).json({
        success: false,
        isSuspended: true,
        error: "This restaurant is currently closed or suspended, orders cannot be accepted.",
      });
    }

    const cleanTableNumber = decodeURIComponent(tableNumber).trim();
    let matchingTables = await findTablesForNumber(restaurantId, tableNumber);
    let table = matchingTables[0];

    if (table) {
      if (!table.isActive) {
        table.isActive = true;
        await table.save();
      }
    } else {
      const Branch = require("../models/Branch");
      let branch = await Branch.findOne({ restaurantId });
      if (!branch) {
        branch = await Branch.create({
          restaurantId,
          name: "Main Branch",
          slug: "main",
          isActive: true
        });
      }
      table = await Table.create({
        restaurantId,
        branchId: branch._id,
        tableNumber: cleanTableNumber,
        seatingCapacity: 4,
        status: "available",
        isActive: true
      });
      matchingTables = [table];
    }

    const allTableIds = matchingTables.map(t => t._id);
    if (!allTableIds.some(id => id.toString() === table._id.toString())) {
      allTableIds.push(table._id);
    }

    const hasGstPlanFeature = !restaurant.subscriptionPlan?.features || restaurant.subscriptionPlan.features.includes("gst-billing");

    const branchId = table.branchId;
    const settings = await Settings.findOne({ branchId });
    const isGstEnabled = hasGstPlanFeature && (settings?.enableGst !== false);
    const cgstRate = isGstEnabled ? (settings?.cgstRate ?? 2.5) : 0;
    const sgstRate = isGstEnabled ? (settings?.sgstRate ?? 2.5) : 0;

    // CHECK IF WE SHOULD CONSOLIDATE INTO AN EXISTING ACTIVE TABLE ORDER
    let existingOrder = null;
    if (existingOrderId) {
      existingOrder = await Order.findById(existingOrderId);
      if (existingOrder && (existingOrder.status === "Completed" || existingOrder.status === "Cancelled" || existingOrder.paymentStatus === "Paid")) {
        existingOrder = null;
      }
    }
    if (!existingOrder) {
      existingOrder = await Order.findOne({
        tableId: { $in: allTableIds },
        status: { $nin: ["Completed", "Cancelled"] },
        paymentStatus: { $ne: "Paid" }
      }).sort({ createdAt: -1 });
    }

    if (existingOrder) {
      // APPEND ITEMS TO EXISTING ACTIVE ORDER (SINGLE CONSOLIDATED TABLE BILL)
      let addedSubtotal = 0;
      for (const item of items) {
        addedSubtotal += (Number(item.price) || 0) * (Number(item.quantity) || 1);
      }

      const newOrderItemIds = [];
      for (const item of items) {
        let normalizedVariant = undefined;
        if (typeof item.selectedVariant === "string") {
          normalizedVariant = { name: item.selectedVariant, price: 0 };
        } else if (item.selectedVariant && typeof item.selectedVariant === "object") {
          normalizedVariant = {
            name: item.selectedVariant.name || "Default",
            price: Number(item.selectedVariant.price) || 0
          };
        }

        let normalizedAddons = [];
        if (Array.isArray(item.selectedAddons)) {
          normalizedAddons = item.selectedAddons.map(a => {
            if (typeof a === "string") return { name: a, price: 0 };
            return {
              name: a.name || "Addon",
              price: Number(a.price) || 0
            };
          });
        }

        const mId = item.menuItemId || item.id || item._id;

        const doc = await OrderItem.create({
          orderId: existingOrder._id,
          menuItemId: mId,
          name: item.name,
          price: Number(item.price) || 0,
          quantity: Number(item.quantity) || 1,
          selectedVariant: normalizedVariant,
          selectedAddons: normalizedAddons,
          specialInstructions: item.specialInstructions || specialInstructions || "",
          status: "Pending",
        });
        newOrderItemIds.push(doc._id);
      }

      existingOrder.items.push(...newOrderItemIds);
      existingOrder.subtotal = Math.round((existingOrder.subtotal || 0) + addedSubtotal);

      const taxableAmount = Math.max(0, existingOrder.subtotal - (existingOrder.discount || 0));
      existingOrder.cgst = isGstEnabled ? Math.round((taxableAmount * cgstRate) / 100) : 0;
      existingOrder.sgst = isGstEnabled ? Math.round((taxableAmount * sgstRate) / 100) : 0;
      existingOrder.total = Math.round(taxableAmount + existingOrder.cgst + existingOrder.sgst);

      if (customerName && (!existingOrder.customerName || existingOrder.customerName === "Guest")) {
        existingOrder.customerName = customerName;
      }
      if (customerPhone && !existingOrder.customerPhone) {
        existingOrder.customerPhone = customerPhone;
      }
      if (specialInstructions) {
        existingOrder.specialInstructions = existingOrder.specialInstructions
          ? `${existingOrder.specialInstructions}; ${specialInstructions}`
          : specialInstructions;
      }

      // If order was marked ready, revert to preparing since new dishes are cooking
      if (existingOrder.status === "Ready" || existingOrder.status === "Accepted") {
        existingOrder.status = "Preparing";
      }

      await existingOrder.save();
      table.status = "occupied";
      await table.save();

      await Notification.create({
        restaurantId,
        branchId,
        title: "Dishes Added to Order",
        message: `Table ${cleanTableNumber} added ${items.length} new items to their bill (Consolidated Total: ₹${existingOrder.total})`,
        type: "new_order",
      });

      const io = req.app.get("io");
      if (io) {
        io.to(branchId.toString()).emit("order-received", {
          orderId: existingOrder._id,
          branchId: branchId.toString(),
          tableNumber: cleanTableNumber,
          isAddition: true,
        });
        io.to(branchId.toString()).emit("order-status-updated", {
          branchId: branchId.toString(),
          orderId: existingOrder._id,
          status: existingOrder.status,
        });
        io.to(existingOrder._id.toString()).emit("status-changed", {
          orderId: existingOrder._id,
          status: existingOrder.status,
        });
      }

      return res.json({
        success: true,
        message: "Dishes added to your table bill successfully!",
        orderId: existingOrder._id,
        total: existingOrder.total,
        branchId: branchId.toString(),
        isAppended: true,
      });
    }

    // FRESH NEW ORDER
    let subtotal = 0;
    for (const item of items) {
      subtotal += (Number(item.price) || 0) * (Number(item.quantity) || 1);
    }
    subtotal = Math.round(subtotal);

    let discount = 0;
    if (couponCode) {
      const coupon = await Coupon.findOne({
        restaurantId,
        code: couponCode.toUpperCase(),
        isActive: true,
        startDate: { $lte: new Date() },
        endDate: { $gte: new Date() },
      });
      if (coupon && subtotal >= coupon.minOrderValue) {
        discount = coupon.discountType === "percentage" ? (subtotal * coupon.discountValue) / 100 : coupon.discountValue;
        coupon.usageCount += 1;
        await coupon.save();
      }
    }

    const taxableAmount = Math.max(0, subtotal - discount);
    const cgst = isGstEnabled ? Math.round((taxableAmount * cgstRate) / 100) : 0;
    const sgst = isGstEnabled ? Math.round((taxableAmount * sgstRate) / 100) : 0;
    const total = Math.round(taxableAmount + cgst + sgst);

    const isTakeaway = /^takeaway|^counter|^parcel/i.test(cleanTableNumber);

    const order = new Order({
      restaurantId,
      branchId,
      tableId: table._id,
      customerName: customerName || "Guest",
      customerPhone: customerPhone || "",
      type: isTakeaway ? "takeaway" : "dine-in",
      status: "Pending",
      subtotal,
      cgst,
      sgst,
      igst: 0,
      serviceCharge: 0,
      deliveryCharge: 0,
      discount,
      total,
      couponCode,
      specialInstructions: specialInstructions || "",
      paymentStatus: "Pending",
      paymentMethod: paymentMethod || "Cash",
      items: [],
    });

    const savedOrder = await order.save();

    const orderItemIds = [];
    for (const item of items) {
      let normalizedVariant = undefined;
      if (typeof item.selectedVariant === "string") {
        normalizedVariant = { name: item.selectedVariant, price: 0 };
      } else if (item.selectedVariant && typeof item.selectedVariant === "object") {
        normalizedVariant = {
          name: item.selectedVariant.name || "Default",
          price: Number(item.selectedVariant.price) || 0
        };
      }

      let normalizedAddons = [];
      if (Array.isArray(item.selectedAddons)) {
        normalizedAddons = item.selectedAddons.map(a => {
          if (typeof a === "string") return { name: a, price: 0 };
          return {
            name: a.name || "Addon",
            price: Number(a.price) || 0
          };
        });
      }

      const mId = item.menuItemId || item.id || item._id;

      const doc = await OrderItem.create({
        orderId: savedOrder._id,
        menuItemId: mId,
        name: item.name,
        price: Number(item.price) || 0,
        quantity: Number(item.quantity) || 1,
        selectedVariant: normalizedVariant,
        selectedAddons: normalizedAddons,
        specialInstructions: item.specialInstructions || specialInstructions || "",
        status: "Pending",
      });
      orderItemIds.push(doc._id);
    }

    savedOrder.items = orderItemIds;
    await savedOrder.save();

    const isTakeaway = /^takeaway|^counter|^parcel/i.test(cleanTableNumber);
    if (!isTakeaway) {
      table.status = "occupied";
      await table.save();
    }

    await Notification.create({
      restaurantId,
      branchId,
      title: isTakeaway ? "New Counter/Takeaway Order" : "New Order Placed",
      message: isTakeaway
        ? `Counter Takeaway placed a new order for ${items.length} items (Total: ₹${total})`
        : `Table ${cleanTableNumber} placed a new order for ${items.length} items (Total: ₹${total})`,
      type: "new_order",
    });

    const io = req.app.get("io");
    if (io) {
      io.to(branchId.toString()).emit("order-received", {
        orderId: savedOrder._id,
        branchId: branchId.toString(),
        tableNumber: isTakeaway ? "Counter" : cleanTableNumber,
        isTakeaway,
        isAddition: false,
      });
    }

    return res.json({
      success: true,
      message: "Order placed successfully",
      orderId: savedOrder._id,
      total: savedOrder.total,
      branchId: branchId.toString(),
    });
  } catch (error) {
    console.error("Place order error:", error);
    return res.status(500).json({ error: "Failed to place order" });
  }
});

// 4. ORDER DETAILS (TRACKING)
router.get("/orders/track", async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "Order ID is required" });

    const order = await Order.findById(id).populate({
      path: "items",
      populate: { path: "menuItemId" },
    });

    if (!order) return res.status(404).json({ error: "Order not found" });
    return res.json({ success: true, data: order });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch order" });
  }
});

// 5. SUBMIT LEAD INQUIRY
router.post("/leads", async (req, res) => {
  try {
    const { restaurantName, ownerName, email, phone, message } = req.body;
    if (!restaurantName || !ownerName || !email || !phone) {
      return res.status(400).json({ error: "Missing required inquiry fields" });
    }

    const lead = await Lead.create({
      restaurantName,
      ownerName,
      email,
      phone,
      message,
    });

    return res.json({
      success: true,
      message: "Your inquiry has been submitted successfully! Our team will contact you shortly.",
      data: lead,
    });
  } catch (error) {
    console.error("Lead submission error:", error);
    return res.status(500).json({ error: "Failed to submit inquiry" });
  }
});

// 6. SUBMIT FEEDBACK
router.post("/feedback", async (req, res) => {
  try {
    const {
      restaurantId,
      branchId,
      orderId,
      customerName,
      customerPhone,
      ratingService,
      ratingFood,
      ratingAmbiance,
      ratingOverall,
      comment,
    } = req.body;

    if (!restaurantId || !branchId || !customerName || !ratingOverall) {
      return res.status(400).json({ error: "Missing required feedback fields" });
    }

    const Feedback = require("../models/Feedback");
    const feedback = await Feedback.create({
      restaurantId,
      branchId,
      orderId,
      customerName,
      customerPhone,
      ratingService: ratingService || ratingOverall,
      ratingFood: ratingFood || ratingOverall,
      ratingAmbiance: ratingAmbiance || ratingOverall,
      ratingOverall,
      comment,
    });

    return res.json({
      success: true,
      message: "Feedback submitted successfully",
      data: feedback,
    });
  } catch (error) {
    console.error("Feedback submission error:", error);
    return res.status(500).json({ error: "Failed to submit feedback" });
  }
});

// 7. GET ACTIVE ORDER FOR TABLE (CONSOLIDATED BILLING)
router.get("/active-order", async (req, res) => {
  try {
    const { slug, tableNumber } = req.query;
    if (!slug || !tableNumber) return res.status(400).json({ error: "Missing parameters" });

    const restaurant = await Restaurant.findOne({ slug });
    if (!restaurant) return res.status(404).json({ error: "Restaurant not found" });

    const matchingTables = await findTablesForNumber(restaurant._id, tableNumber);
    const allTableIds = matchingTables.map(t => t._id);
    if (allTableIds.length === 0) return res.json({ success: true, activeOrder: null });

    const activeOrder = await Order.findOne({
      tableId: { $in: allTableIds },
      status: { $nin: ["Completed", "Cancelled"] },
      paymentStatus: { $ne: "Paid" }
    })
      .sort({ createdAt: -1 })
      .populate({ path: "items", populate: { path: "menuItemId" } });

    return res.json({ success: true, activeOrder });
  } catch (error) {
    console.error("Get active order error:", error);
    return res.status(500).json({ error: "Failed to get active order" });
  }
});

// 8. CALL SERVICE / STAFF ASSISTANCE (FOR RESTAURANT TABLES & HOTEL ROOMS)
router.post("/call-waiter", async (req, res) => {
  try {
    const { restaurantId, branchId, tableNumber, reason, customerName } = req.body;
    if (!restaurantId || !tableNumber) {
      return res.status(400).json({ error: "Missing required details" });
    }

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant || restaurant.isSuspended || !restaurant.isActive) {
      return res.status(403).json({
        success: false,
        isSuspended: true,
        error: "This restaurant / service is currently closed.",
      });
    }

    const cleanTable = decodeURIComponent(tableNumber).trim();

    // Safely resolve branch to prevent CastError if branchId is empty string or not an ObjectId
    let validBranchId = null;
    if (branchId && mongoose.Types.ObjectId.isValid(branchId)) {
      validBranchId = branchId;
    } else {
      const defaultBranch = await Branch.findOne({ restaurantId: restaurant._id, isActive: true });
      if (defaultBranch) validBranchId = defaultBranch._id;
    }

    const isHotel = restaurant.businessType === "hotel";
    const unitLabel = isHotel ? "Room" : "Table";

    await Notification.create({
      restaurantId: restaurant._id,
      ...(validBranchId ? { branchId: validBranchId } : {}),
      title: "🛎️ Staff Assistance Requested",
      message: `${unitLabel} ${cleanTable} (${customerName || "Guest"}) requested assistance: ${reason || "Service Needed"}`,
      type: "waiter_call",
    });

    const io = req.app.get("io");
    if (io) {
      const payload = {
        tableNumber: cleanTable,
        unitLabel,
        customerName: customerName || "Guest",
        reason: reason || "Service Needed",
        time: new Date().toLocaleTimeString(),
      };
      if (validBranchId) {
        io.to(validBranchId.toString()).emit("waiter-called", payload);
      }
      io.emit("waiter-called", payload);
    }

    return res.json({
      success: true,
      message: `Staff alerted for ${unitLabel} ${cleanTable}!`,
    });
  } catch (error) {
    console.error("Call staff assistance error:", error);
    return res.status(500).json({ error: error.message || "Failed to call staff" });
  }
});

module.exports = router;

