const express = require("express");
const router = express.Router();

const Restaurant = require("../models/Restaurant");
const Category = require("../models/Category");
const MenuItem = require("../models/MenuItem");
const Theme = require("../models/Theme");
const Coupon = require("../models/Coupon");
const Table = require("../models/Table");
const Settings = require("../models/Settings");
const Order = require("../models/Order");
const OrderItem = require("../models/OrderItem");
const Notification = require("../models/Notification");
const Lead = require("../models/Lead");


// 1. RESOLVE RESTAURANT SLUG & MENU
router.get("/menu", async (req, res) => {
  try {
    const { slug, tableNumber } = req.query;
    if (!slug) return res.status(400).json({ error: "Slug is required" });

    const restaurant = await Restaurant.findOne({ slug, isActive: true, isSuspended: false }).populate("subscriptionPlan");
    if (!restaurant) return res.status(404).json({ error: "Restaurant not found or inactive" });

    let branchId = null;
    let settings = null;
    if (tableNumber) {
      const cleanTable = decodeURIComponent(tableNumber).trim();
      let table = await Table.findOne({
        restaurantId: restaurant._id,
        tableNumber: { $regex: new RegExp(`^${cleanTable.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, "i") }
      });
      if (!table) {
        table = await Table.findOne({ restaurantId: restaurant._id });
      }
      if (table) {
        branchId = table.branchId;
        settings = await Settings.findOne({ branchId });
      }
    }

    if (!settings) {
      settings = await Settings.findOne({ restaurantId: restaurant._id }) || {
        currency: "INR",
        cgstRate: 2.5,
        sgstRate: 2.5,
        enableSoundAlerts: true,
      };
    }

    const theme = await Theme.findOne({ restaurantId: restaurant._id }) || {
      primaryColor: "#ea580c",
      secondaryColor: "#1e293b",
      fontFamily: "Plus Jakarta Sans",
    };

    const categories = await Category.find({ restaurantId: restaurant._id, isActive: true }).sort({ sortOrder: 1, name: 1 });
    const menuItems = await MenuItem.find({ restaurantId: restaurant._id, isActive: true })
      .populate("variants")
      .populate("addons")
      .sort({ name: 1 });

    const restaurantObj = restaurant.toObject();
    if (branchId) {
      restaurantObj.branchId = branchId;
    }

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
    } = req.body;

    if (!restaurantId || !tableNumber || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Missing order parameters" });
    }

    const cleanTableNumber = decodeURIComponent(tableNumber).trim();
    let table = await Table.findOne({
      restaurantId,
      tableNumber: { $regex: new RegExp(`^${cleanTableNumber.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, "i") }
    });

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
    }

    const restaurant = await Restaurant.findById(restaurantId).populate("subscriptionPlan");
    if (!restaurant) return res.status(400).json({ error: "Restaurant not found" });

    const hasGstBilling = restaurant.subscriptionPlan && restaurant.subscriptionPlan.features && restaurant.subscriptionPlan.features.includes("gst-billing");

    const branchId = table.branchId;
    const settings = await Settings.findOne({ branchId });
    const cgstRate = hasGstBilling ? (settings?.cgstRate || 0) : 0;
    const sgstRate = hasGstBilling ? (settings?.sgstRate || 0) : 0;

    // CHECK IF WE SHOULD CONSOLIDATE INTO AN EXISTING ACTIVE TABLE ORDER
    let existingOrder = null;
    if (existingOrderId) {
      existingOrder = await Order.findOne({
        _id: existingOrderId,
        restaurantId,
        status: { $nin: ["Completed", "Cancelled"] },
        paymentStatus: { $ne: "Paid" }
      });
    }
    if (!existingOrder) {
      existingOrder = await Order.findOne({
        tableId: table._id,
        restaurantId,
        status: { $in: ["Pending", "Accepted", "Preparing", "Ready"] },
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
          specialInstructions: item.specialInstructions || "",
          status: "Pending",
        });
        newOrderItemIds.push(doc._id);
      }

      existingOrder.items.push(...newOrderItemIds);
      existingOrder.subtotal = Math.round((existingOrder.subtotal || 0) + addedSubtotal);

      const taxableAmount = Math.max(0, existingOrder.subtotal - (existingOrder.discount || 0));
      existingOrder.cgst = hasGstBilling ? Math.round((taxableAmount * cgstRate) / 100) : 0;
      existingOrder.sgst = hasGstBilling ? Math.round((taxableAmount * sgstRate) / 100) : 0;
      existingOrder.total = Math.round(taxableAmount + existingOrder.cgst + existingOrder.sgst);

      if (customerName && (!existingOrder.customerName || existingOrder.customerName === "Guest")) {
        existingOrder.customerName = customerName;
      }
      if (customerPhone && !existingOrder.customerPhone) {
        existingOrder.customerPhone = customerPhone;
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
    const cgst = hasGstBilling ? Math.round((taxableAmount * cgstRate) / 100) : 0;
    const sgst = hasGstBilling ? Math.round((taxableAmount * sgstRate) / 100) : 0;
    const total = Math.round(taxableAmount + cgst + sgst);

    const order = new Order({
      restaurantId,
      branchId,
      tableId: table._id,
      customerName: customerName || "Guest",
      customerPhone: customerPhone || "",
      type: "dine-in",
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
        specialInstructions: item.specialInstructions || "",
        status: "Pending",
      });
      orderItemIds.push(doc._id);
    }

    savedOrder.items = orderItemIds;
    await savedOrder.save();

    table.status = "occupied";
    await table.save();

    await Notification.create({
      restaurantId,
      branchId,
      title: "New Order Placed",
      message: `Table ${cleanTableNumber} placed a new order for ${items.length} items (Total: ₹${total})`,
      type: "new_order",
    });

    const io = req.app.get("io");
    if (io) {
      io.to(branchId.toString()).emit("order-received", {
        orderId: savedOrder._id,
        branchId: branchId.toString(),
        tableNumber: cleanTableNumber,
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

    const cleanTableNumber = decodeURIComponent(tableNumber).trim();
    const table = await Table.findOne({
      restaurantId: restaurant._id,
      tableNumber: { $regex: new RegExp(`^${cleanTableNumber.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, "i") }
    });
    if (!table) return res.json({ success: true, activeOrder: null });

    const activeOrder = await Order.findOne({
      restaurantId: restaurant._id,
      tableId: table._id,
      status: { $in: ["Pending", "Accepted", "Preparing", "Ready"] },
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

// 8. CALL WAITER / STAFF ASSISTANCE
router.post("/call-waiter", async (req, res) => {
  try {
    const { restaurantId, branchId, tableNumber, reason, customerName } = req.body;
    if (!restaurantId || !tableNumber) {
      return res.status(400).json({ error: "Missing required details" });
    }
    const cleanTable = decodeURIComponent(tableNumber).trim();

    await Notification.create({
      restaurantId,
      branchId,
      title: "🛎️ Waiter Assistance Requested",
      message: `Table ${cleanTable} (${customerName || "Guest"}) requested assistance: ${reason || "General Assistance"}`,
      type: "waiter_call",
    });

    const io = req.app.get("io");
    if (io && branchId) {
      io.to(branchId.toString()).emit("waiter-called", {
        tableNumber: cleanTable,
        customerName: customerName || "Guest",
        reason: reason || "General Assistance",
        time: new Date().toLocaleTimeString(),
      });
    }

    return res.json({ success: true, message: `Waiter alerted for Table ${cleanTable}!` });
  } catch (error) {
    console.error("Call waiter error:", error);
    return res.status(500).json({ error: "Failed to call waiter" });
  }
});

module.exports = router;

