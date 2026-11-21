"use client";

import React, { use, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import apiFetch from "@/lib/api";
import useCart from "@/store/useCart";
import useSocket from "@/hooks/useSocket";
import Swal from "sweetalert2";
import {
  UtensilsCrossed,
  BellRing,
  ShoppingBag,
  Plus,
  Minus,
  Sparkles,
  Loader2,
  X,
  Clock,
  ArrowRight,
  User,
  Phone,
  Receipt,
  Tag,
  CheckCircle2,
} from "lucide-react";
import Button from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface Variant {
  _id: string;
  name: string;
  price: number;
}

interface Addon {
  _id: string;
  name: string;
  price: number;
}

interface Category {
  _id: string;
  name: string;
}

interface MenuItem {
  _id: string;
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  images: string[];
  foodType: "veg" | "non-veg" | "egg";
  spicyLevel: number;
  isRecommended: boolean;
  isPopular: boolean;
  isOutOfStock: boolean;
  variants: Variant[];
  addons: Addon[];
}

interface Restaurant {
  _id: string;
  name: string;
  slug: string;
  branchId?: string;
  subscriptionPlan?: {
    _id: string;
    name: string;
    price: number;
    features: string[];
  };
}

interface Theme {
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
}

interface SettingsData {
  currency: string;
  cgstRate: number;
  sgstRate: number;
  serviceChargeRate: number;
  deliveryChargeRate: number;
}

interface MenuResponse {
  success: boolean;
  restaurant: Restaurant;
  theme: Theme;
  categories: Category[];
  menuItems: MenuItem[];
  settings?: SettingsData;
}

export default function TableOrderingPage({
  params,
}: {
  params: Promise<{ restaurantSlug: string; tableNumber: string }>;
}) {
  const router = useRouter();
  const { restaurantSlug, tableNumber } = use(params);

  // Zustand cart state
  const {
    items,
    coupon,
    addItem,
    removeItem,
    updateQuantity,
    setCoupon,
    clearCart,
    setSession,
    customerName: verifiedName,
    customerPhone: verifiedPhone,
    isVerified,
    setCustomerDetails,
  } = useCart();

  // Selected Category
  const [selectedCat, setSelectedCat] = useState<string>("All");

  // Filter food type
  const [filterType, setFilterType] = useState<"all" | "veg" | "non-veg">("all");

  // Customize Item Dialog Modal
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<Addon[]>([]);
  const [instructions, setInstructions] = useState("");

  // Customer credentials state
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");

  // Welcome gateway form states
  const [tempName, setTempName] = useState("");
  const [tempPhone, setTempPhone] = useState("");
  const [validationError, setValidationError] = useState("");

  // Show Cart Drawer
  const [cartOpen, setCartOpen] = useState(false);

  // Coupon state
  const [couponCodeText, setCouponCodeText] = useState("");
  const [couponValidationLoading, setCouponValidationLoading] = useState(false);

  // Order submission loading
  const [submittingOrder, setSubmittingOrder] = useState(false);

  // Query menu
  const { data: menuResponse, isLoading, error } = useQuery<MenuResponse>({
    queryKey: ["customer", "menu", restaurantSlug],
    queryFn: () => apiFetch(`/api/customer/menu?slug=${restaurantSlug}&tableNumber=${tableNumber}`),
  });

  const restaurant = menuResponse?.restaurant;
  const menuItems = menuResponse?.menuItems || [];
  const categories = menuResponse?.categories || [];
  const theme = menuResponse?.theme || { primaryColor: "#ea580c" };
  const primaryCol = theme.primaryColor || "#ea580c";

  // Establish live socket connection
  const socket = useSocket(undefined, undefined);

  useEffect(() => {
    if (restaurantSlug && tableNumber) {
      setSession(restaurantSlug, tableNumber);
    }
  }, [restaurantSlug, tableNumber, setSession]);

  useEffect(() => {
    if (verifiedName) setCustomerName(verifiedName);
    if (verifiedPhone) setCustomerPhone(verifiedPhone);
  }, [verifiedName, verifiedPhone]);

  // Loading Screen
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] text-slate-600 font-sans p-4">
        <div className="flex flex-col items-center gap-3 bg-white p-8 rounded-3xl shadow-sm border border-slate-200/80">
          <Loader2 className="h-9 w-9 text-orange-500 animate-spin" />
          <p className="text-sm font-bold text-slate-700">Loading Table {tableNumber} Menu...</p>
        </div>
      </div>
    );
  }

  // Error Screen
  if (error || !menuResponse?.success || !restaurant) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#f8fafc] px-4 text-center text-slate-800 font-sans">
        <div className="h-16 w-16 rounded-3xl bg-orange-50 flex items-center justify-center mb-4 border border-orange-200">
          <UtensilsCrossed className="h-8 w-8 text-orange-500" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 mb-2">Menu Unavailable</h1>
        <p className="text-slate-500 text-sm max-w-xs">
          The table QR code link is invalid or the restaurant is currently not accepting digital orders.
        </p>
      </div>
    );
  }

  // Handle direct 1-step verification submission
  const handleWelcomeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError("");

    const trimmedName = tempName.trim();
    const cleanPhone = tempPhone.replace(/\D/g, "");

    if (!trimmedName) {
      setValidationError("Please enter your name");
      return;
    }

    if (cleanPhone.length !== 10) {
      setValidationError("Please enter a valid 10-digit mobile number");
      return;
    }

    setCustomerDetails(trimmedName, cleanPhone, true);
    setCustomerName(trimmedName);
    setCustomerPhone(cleanPhone);
  };

  // Allow browsing menu first (enters without name, will prompt at checkout)
  const handleBrowseFirst = () => {
    setCustomerDetails("Guest", "", true);
  };

  // If customer is not verified, render the clean, mobile-responsive Welcome Screen
  if (!isVerified) {
    return (
      <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col items-center justify-center p-4 relative font-sans">
        {/* Soft background ambient gradient meshes */}
        <div
          className="absolute top-[-10%] left-[-20%] w-[80vw] h-[80vw] max-w-[450px] rounded-full blur-[140px] opacity-[0.18] pointer-events-none"
          style={{ backgroundColor: primaryCol }}
        />
        <div
          className="absolute bottom-[-10%] right-[-20%] w-[70vw] h-[70vw] max-w-[400px] rounded-full blur-[120px] opacity-[0.15] pointer-events-none"
          style={{ backgroundColor: "#f59e0b" }}
        />

        <div className="w-full max-w-sm z-10 space-y-6 my-auto">
          {/* Restaurant Branding */}
          <div className="text-center space-y-2">
            <div
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl text-white font-black text-2xl shadow-xl shadow-orange-500/20"
              style={{ backgroundImage: `linear-gradient(135deg, ${primaryCol}, #f97316)` }}
            >
              {restaurant.name.charAt(0)}
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-snug pt-1">
              {restaurant.name}
            </h1>
            <div className="inline-flex items-center gap-1.5 bg-orange-50 border border-orange-200/80 px-3.5 py-1 rounded-full text-orange-700 text-xs font-black">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              TABLE {tableNumber}
            </div>
            <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed pt-1">
              Enter your details to view our menu and order directly from your mobile.
            </p>
          </div>

          {/* Clean Light Form Card */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xl shadow-slate-200/50 space-y-5">
            <form onSubmit={handleWelcomeSubmit} className="space-y-4">
              {validationError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-bold p-3 rounded-xl text-center">
                  {validationError}
                </div>
              )}

              {/* Name Input */}
              <div className="space-y-1.5 text-left">
                <label className="text-xs font-bold text-slate-700">Your Name *</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Enter your name"
                    value={tempName}
                    onChange={(e) => {
                      setTempName(e.target.value);
                      if (validationError) setValidationError("");
                    }}
                    required
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 rounded-2xl text-base focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all font-medium outline-none"
                  />
                </div>
              </div>

              {/* Mobile Number Input */}
              <div className="space-y-1.5 text-left">
                <label className="text-xs font-bold text-slate-700">Mobile Number *</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                  <input
                    type="tel"
                    inputMode="numeric"
                    placeholder="10-digit mobile number"
                    maxLength={10}
                    value={tempPhone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      if (val.length <= 10) setTempPhone(val);
                      if (validationError) setValidationError("");
                    }}
                    required
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 rounded-2xl text-base focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all font-medium outline-none"
                  />
                </div>
                <p className="text-[11px] text-slate-400 pl-1">For kitchen order status and table billing</p>
              </div>

              {/* Submit CTA */}
              <Button
                type="submit"
                className="w-full text-white font-extrabold h-12 rounded-2xl flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-[0.98] cursor-pointer border-none text-sm mt-2"
                style={{
                  backgroundImage: `linear-gradient(135deg, ${primaryCol}, #f97316)`,
                  boxShadow: `0 8px 20px -4px ${primaryCol}40`,
                }}
              >
                View Menu & Order
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>

            <div className="text-center pt-1 border-t border-slate-100">
              <button
                type="button"
                onClick={handleBrowseFirst}
                className="text-xs font-bold text-slate-500 hover:text-orange-600 transition-colors py-1 cursor-pointer"
              >
                Browse Menu First →
              </button>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 text-center">
            Powered by <strong className="text-slate-600">ServeDesk</strong>
          </p>
        </div>
      </div>
    );
  }

  // Handle Waiter Request Calls
  const handleCallWaiter = () => {
    Swal.fire({
      title: "🛎️ Call Waiter?",
      text: `Notify restaurant staff to assist Table ${tableNumber}?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, Call Waiter",
      cancelButtonText: "Cancel",
      confirmButtonColor: primaryCol,
    }).then((result) => {
      if (result.isConfirmed) {
        if (socket && restaurant) {
          socket.emit("call-waiter", {
            branchId: (restaurant as unknown as { branchId?: string })?.branchId || "",
            tableNumber,
          });
          Swal.fire({
            icon: "success",
            title: "Waiter Notified!",
            text: "A floor staff member is on their way to Table " + tableNumber,
            timer: 2000,
            showConfirmButton: false,
          });
        } else {
          Swal.fire({
            icon: "warning",
            title: "Connecting...",
            text: "Connecting to restaurant server. Please try again in a moment.",
            confirmButtonColor: primaryCol,
          });
        }
      }
    });
  };

  // Open item customizing options or directly add to cart
  const handleAddItemClick = (item: MenuItem) => {
    if (item.variants?.length > 0 || item.addons?.length > 0) {
      setCustomizingItem(item);
      setSelectedVariant(item.variants?.[0] || null);
      setSelectedAddons([]);
      setInstructions("");
    } else {
      addItem({
        menuItemId: item._id,
        name: item.name,
        price: item.price,
        quantity: 1,
        selectedAddons: [],
      });
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: `Added ${item.name} to order`,
        showConfirmButton: false,
        timer: 1400,
      });
    }
  };

  const handleConfirmCustomization = () => {
    if (!customizingItem) return;

    const basePrice = selectedVariant ? selectedVariant.price : customizingItem.price;
    const addonsPrice = selectedAddons.reduce((acc, a) => acc + a.price, 0);
    const finalItemPrice = basePrice + addonsPrice;

    addItem({
      menuItemId: customizingItem._id,
      name: customizingItem.name,
      price: finalItemPrice,
      quantity: 1,
      selectedVariant: selectedVariant ? { name: selectedVariant.name, price: selectedVariant.price } : undefined,
      selectedAddons: selectedAddons.map((a) => ({ name: a.name, price: a.price })),
      specialInstructions: instructions || undefined,
    });

    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: `Added ${customizingItem.name}`,
      showConfirmButton: false,
      timer: 1400,
    });
    setCustomizingItem(null);
  };

  const handleAddonToggle = (addon: Addon) => {
    if (selectedAddons.some((a) => a._id === addon._id)) {
      setSelectedAddons(selectedAddons.filter((a) => a._id !== addon._id));
    } else {
      setSelectedAddons([...selectedAddons, addon]);
    }
  };

  // Validate coupon
  const handleValidateCoupon = async () => {
    if (!couponCodeText) return;
    setCouponValidationLoading(true);

    try {
      const res = await apiFetch("/api/customer/coupons/validate", {
        method: "POST",
        body: JSON.stringify({
          restaurantId: restaurant._id,
          code: couponCodeText,
          subtotal,
        }),
      });

      if (res.success) {
        setCoupon({
          code: res.coupon.code,
          discountType: res.coupon.discountType === "percentage" ? "percentage" : "fixed",
          discountValue: res.coupon.discountValue,
          minOrderValue: res.coupon.minOrderValue,
        });
        Swal.fire({
          icon: "success",
          title: "🎉 Coupon Applied!",
          text: `Saved ₹${res.discountAmount} on your order!`,
          timer: 1800,
          showConfirmButton: false,
        });
        setCouponCodeText("");
      }
    } catch (err: unknown) {
      Swal.fire({
        icon: "error",
        title: "Invalid Coupon",
        text: (err as Error).message || "Invalid coupon code",
        confirmButtonColor: primaryCol,
      });
    } finally {
      setCouponValidationLoading(false);
    }
  };

  // Order placing handler
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "Empty Cart",
        text: "Please add dishes from the menu before placing an order.",
        confirmButtonColor: primaryCol,
      });
      return;
    }

    const trimmedName = customerName.trim();
    const cleanPhone = customerPhone.replace(/\D/g, "");

    if (!trimmedName || !cleanPhone) {
      Swal.fire({
        icon: "warning",
        title: "Details Required",
        text: "Please enter your name and phone number for the order.",
        confirmButtonColor: primaryCol,
      });
      return;
    }

    if (cleanPhone.length !== 10) {
      Swal.fire({
        icon: "warning",
        title: "Invalid Phone Number",
        text: "Phone number must be exactly 10 digits.",
        confirmButtonColor: primaryCol,
      });
      return;
    }

    setSubmittingOrder(true);
    try {
      const payload = {
        restaurantId: restaurant._id,
        tableNumber,
        customerName: trimmedName,
        customerPhone: cleanPhone,
        paymentMethod,
        couponCode: coupon?.code || undefined,
        items: items.map((i) => ({
          menuItemId: i.menuItemId,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
          selectedVariant: i.selectedVariant?.name || undefined,
          selectedAddons: i.selectedAddons.map((a) => ({ name: a.name, price: a.price })),
          specialInstructions: i.specialInstructions,
        })),
      };

      const res = await apiFetch("/api/customer/orders", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (res.success) {
        if (socket) {
          socket.emit("new-order", {
            branchId: res.branchId,
            orderId: res.orderId,
            tableNumber,
          });
        }

        clearCart();
        setCartOpen(false);

        await Swal.fire({
          icon: "success",
          title: "🎉 Order Sent to Kitchen!",
          text: `Table ${tableNumber} order #${res.orderId.slice(-5).toUpperCase()} is being prepared!`,
          timer: 1800,
          showConfirmButton: false,
        });

        router.push(`/${restaurantSlug}/table/${tableNumber}/track/${res.orderId}`);
      }
    } catch (err: unknown) {
      Swal.fire({
        icon: "error",
        title: "Order Failed",
        text: (err as Error).message || "Failed to place order. Please try again.",
        confirmButtonColor: primaryCol,
      });
    } finally {
      setSubmittingOrder(false);
    }
  };

  // Financial calculations
  const subtotal = items.reduce((acc, i) => acc + i.price * i.quantity, 0);

  let discount = 0;
  if (coupon) {
    discount =
      coupon.discountType === "percentage" ? (subtotal * coupon.discountValue) / 100 : coupon.discountValue;
  }
  const taxableAmount = Math.max(0, subtotal - discount);

  const hasGstBilling = restaurant?.subscriptionPlan?.features?.includes("gst-billing");
  const cgstRate = hasGstBilling ? (menuResponse?.settings?.cgstRate ?? 2.5) : 0;
  const sgstRate = hasGstBilling ? (menuResponse?.settings?.sgstRate ?? 2.5) : 0;

  const cgst = (taxableAmount * cgstRate) / 100;
  const sgst = (taxableAmount * sgstRate) / 100;
  const total = taxableAmount + cgst + sgst;

  const totalQty = items.reduce((acc, i) => acc + i.quantity, 0);

  const filteredItems = menuItems.filter((item) => {
    const matchesCat = selectedCat === "All" || item.categoryId === selectedCat;
    const matchesType =
      filterType === "all" ||
      (filterType === "veg" && item.foodType === "veg") ||
      (filterType === "non-veg" && item.foodType === "non-veg");
    return matchesCat && matchesType;
  });

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col pb-28 relative overflow-x-hidden font-sans">
      {/* Soft background ambient gradient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-80 bg-gradient-to-b from-orange-100/40 via-amber-50/20 to-transparent pointer-events-none blur-3xl" />

      {/* Clean Mobile-First Header */}
      <header className="sticky top-0 backdrop-blur-xl bg-white/90 border-b border-slate-200/80 px-4 py-3.5 z-30 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="h-10 w-10 rounded-2xl text-white flex items-center justify-center font-black text-lg shadow-md shadow-orange-500/15 shrink-0"
            style={{ backgroundImage: `linear-gradient(135deg, ${primaryCol}, #f97316)` }}
          >
            {restaurant.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <h1 className="font-black text-slate-900 text-sm sm:text-base tracking-tight leading-tight truncate">
              {restaurant.name}
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] text-orange-600 font-extrabold uppercase tracking-wider">
                Table {tableNumber}
              </span>
              {verifiedName && verifiedName !== "Guest" && (
                <span className="text-[10px] text-slate-400 font-medium truncate">
                  · {verifiedName}
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={handleCallWaiter}
          className="flex items-center gap-1.5 px-3 py-2 bg-orange-50 hover:bg-orange-100 border border-orange-200/80 text-orange-700 rounded-xl text-xs font-extrabold transition-transform active:scale-95 shadow-xs cursor-pointer shrink-0"
        >
          <BellRing className="h-4 w-4 text-orange-600" />
          <span className="hidden xs:inline">Call Waiter</span>
        </button>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto w-full px-4 mt-4 space-y-5 flex-1 z-10">
        {/* Table Welcome Banner */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-4 sm:p-5 shadow-xs flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-orange-600 text-[10px] font-black uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5" /> Table Dining
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
              Table {tableNumber} Digital Menu
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Select dishes, customize options, and send orders straight to the kitchen.
            </p>
          </div>
          <div className="hidden sm:flex flex-col items-end shrink-0 bg-slate-50 border border-slate-200 px-3 py-2 rounded-2xl text-right">
            <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500">
              <Clock className="h-3.5 w-3.5" /> Prep Time
            </div>
            <span className="text-xs font-black text-slate-900 mt-0.5">~ 15-20 Mins</span>
          </div>
        </div>

        {/* Dietary Preference Filter */}
        <div className="flex items-center gap-1.5 bg-slate-100/90 border border-slate-200 p-1 rounded-2xl w-full">
          <button
            onClick={() => setFilterType("all")}
            className={`flex-1 py-2 rounded-xl text-xs font-extrabold tracking-wide uppercase transition-all duration-200 cursor-pointer text-center ${
              filterType === "all"
                ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterType("veg")}
            className={`flex-1 py-2 rounded-xl text-xs font-extrabold tracking-wide uppercase flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer text-center ${
              filterType === "veg"
                ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/20"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-emerald-200" />
            Veg
          </button>
          <button
            onClick={() => setFilterType("non-veg")}
            className={`flex-1 py-2 rounded-xl text-xs font-extrabold tracking-wide uppercase flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer text-center ${
              filterType === "non-veg"
                ? "bg-rose-500 text-white shadow-sm shadow-rose-500/20"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-rose-200" />
            Non-Veg
          </button>
        </div>

        {/* Categories Horizontal Bar */}
        <div className="relative">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none scroll-smooth">
            <button
              onClick={() => setSelectedCat("All")}
              className={`px-4 py-2 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all duration-200 cursor-pointer border ${
                selectedCat === "All"
                  ? "text-white shadow-md shadow-orange-500/20 border-transparent"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-900"
              }`}
              style={{
                backgroundColor: selectedCat === "All" ? primaryCol : undefined,
              }}
            >
              All Items
            </button>
            {categories.map((cat) => {
              const isSel = selectedCat === cat._id;
              return (
                <button
                  key={cat._id}
                  onClick={() => setSelectedCat(cat._id)}
                  className={`px-4 py-2 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all duration-200 cursor-pointer border ${
                    isSel
                      ? "text-white shadow-md shadow-orange-500/20 border-transparent"
                      : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-900"
                  }`}
                  style={{
                    backgroundColor: isSel ? primaryCol : undefined,
                  }}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Menu Items Responsive List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredItems.length === 0 ? (
            <div className="md:col-span-2 text-center py-16 text-slate-400 text-xs bg-white border border-slate-200/80 rounded-3xl">
              <UtensilsCrossed className="h-9 w-9 text-slate-300 mx-auto mb-2" />
              No matching dishes found in this category.
            </div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item._id}
                className={`p-3.5 sm:p-4 bg-white border border-slate-200/80 hover:border-orange-500/30 rounded-3xl flex items-center justify-between gap-3.5 transition-all duration-200 shadow-xs hover:shadow-md ${
                  item.isOutOfStock ? "opacity-55 pointer-events-none" : ""
                }`}
              >
                {/* Image */}
                <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl bg-slate-100 flex items-center justify-center overflow-hidden shrink-0 border border-slate-200/60 relative">
                  {item.images?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.images[0]}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <UtensilsCrossed className="h-7 w-7 text-slate-300" />
                  )}
                  {/* Food type badge */}
                  <span
                    className={`absolute top-2 left-2 p-0.5 rounded-md bg-white/95 border ${
                      item.foodType === "veg" ? "border-emerald-500" : "border-rose-500"
                    } flex items-center justify-center h-4.5 w-4.5 shadow-xs`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        item.foodType === "veg" ? "bg-emerald-500" : "bg-rose-500"
                      }`}
                    />
                  </span>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch py-0.5">
                  <div className="space-y-1">
                    <div className="flex items-start justify-between gap-1.5">
                      <h3 className="text-sm font-black text-slate-900 leading-tight truncate">
                        {item.name}
                      </h3>
                      {item.isRecommended && (
                        <span className="bg-orange-50 border border-orange-200 text-orange-700 text-[9px] font-black px-1.5 py-0.5 rounded shrink-0">
                          Top
                        </span>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-slate-500 text-xs line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-sm sm:text-base font-black text-slate-900">
                      ₹{item.price}
                    </span>

                    {item.isOutOfStock ? (
                      <span className="text-[10px] text-red-500 font-bold bg-red-50 px-2 py-0.5 rounded border border-red-200">
                        Sold Out
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleAddItemClick(item)}
                        className="text-white font-black py-1.5 px-3.5 h-auto text-xs rounded-xl shadow-md transition-transform active:scale-95 cursor-pointer border-none"
                        style={{
                          backgroundImage: `linear-gradient(135deg, ${primaryCol}, #f97316)`,
                        }}
                      >
                        Add +
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Footer Branding */}
      <footer className="w-full max-w-4xl mx-auto px-4 mt-12 mb-20 text-center space-y-2 border-t border-slate-200/80 pt-6">
        <div className="flex items-center justify-center gap-1.5 text-slate-400">
          <UtensilsCrossed className="h-4 w-4" />
          <span className="text-xs uppercase font-black tracking-wider text-slate-500">
            {restaurant.name}
          </span>
        </div>
        <p className="text-[11px] text-slate-400 font-medium">
          Powered by <strong className="text-slate-600">ServeDesk Dining OS</strong>
        </p>
      </footer>

      {/* Floating Bottom Cart Island (Sticky on Mobile) */}
      {totalQty > 0 && (
        <div className="fixed bottom-4 inset-x-4 max-w-md mx-auto z-40">
          <button
            onClick={() => setCartOpen(true)}
            className="w-full text-white p-3.5 sm:p-4 rounded-3xl font-black flex items-center justify-between shadow-2xl transition-transform active:scale-[0.98] cursor-pointer border-none"
            style={{
              backgroundImage: `linear-gradient(135deg, ${primaryCol}, #f97316)`,
              boxShadow: `0 10px 25px -5px ${primaryCol}50`,
            }}
          >
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 bg-white/20 rounded-2xl flex items-center justify-center">
                <ShoppingBag className="h-5 w-5 text-white" />
              </div>
              <div className="text-left">
                <span className="text-sm font-black block leading-none">
                  {totalQty} {totalQty === 1 ? "Item" : "Items"} in Cart
                </span>
                <span className="text-[10px] text-white/80 font-semibold mt-0.5 block">
                  Table {tableNumber}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base font-black">₹{total.toFixed(0)}</span>
              <div className="h-8 w-8 bg-white/20 rounded-xl flex items-center justify-center">
                <ArrowRight className="h-4 w-4 text-white" />
              </div>
            </div>
          </button>
        </div>
      )}

      {/* Customise Item Modal (Bottom Sheet on Mobile) */}
      {customizingItem && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-xs p-0 sm:p-4">
          <div className="bg-white border-t sm:border border-slate-200 rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[85vh] overflow-hidden shadow-2xl flex flex-col animate-in slide-in-from-bottom duration-200">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/70">
              <div>
                <h3 className="text-base font-black text-slate-900">{customizingItem.name}</h3>
                <p className="text-xs text-slate-500">Choose portion and extra toppings</p>
              </div>
              <button
                onClick={() => setCustomizingItem(null)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Portion Options */}
              {customizingItem.variants?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-slate-600 uppercase tracking-wider">
                    Select Portion
                  </h4>
                  <div className="grid grid-cols-2 gap-2.5">
                    {customizingItem.variants.map((v) => (
                      <button
                        key={v._id}
                        type="button"
                        onClick={() => setSelectedVariant(v)}
                        className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                          selectedVariant?.name === v.name
                            ? "bg-orange-50/90 border-orange-500 text-slate-900 font-bold shadow-xs"
                            : "bg-slate-50 border-slate-200 text-slate-600"
                        }`}
                      >
                        <span className="text-xs font-bold">{v.name}</span>
                        <span className="text-sm font-black text-slate-900 mt-1">₹{v.price}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Addons Selection */}
              {customizingItem.addons?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-slate-600 uppercase tracking-wider">
                    Add Extras
                  </h4>
                  <div className="space-y-2">
                    {customizingItem.addons.map((a) => {
                      const isSel = selectedAddons.some((addon) => addon._id === a._id);
                      return (
                        <button
                          key={a._id}
                          type="button"
                          onClick={() => handleAddonToggle(a)}
                          className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                            isSel
                              ? "bg-orange-50/90 border-orange-500 text-slate-900 font-bold shadow-xs"
                              : "bg-slate-50 border-slate-200 text-slate-600"
                          }`}
                        >
                          <span className="text-xs font-bold">{a.name}</span>
                          <span className="text-xs font-black text-slate-900">+ ₹{a.price}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Special Instructions Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-600 uppercase tracking-wider">
                  Special Notes
                </label>
                <textarea
                  placeholder="e.g. Less spicy, extra napkins..."
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl p-3 text-base sm:text-xs focus:bg-white focus:outline-none focus:border-orange-500 h-20 resize-none font-medium"
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/70">
              <Button
                onClick={handleConfirmCustomization}
                className="w-full text-white font-black py-3 rounded-2xl flex items-center justify-center gap-2 shadow-lg border-none text-xs cursor-pointer"
                style={{
                  backgroundImage: `linear-gradient(135deg, ${primaryCol}, #f97316)`,
                  boxShadow: `0 8px 20px -4px ${primaryCol}40`,
                }}
              >
                Confirm & Add
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Cart Drawer Panel (Mobile Bottom/Side Sheet) */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md h-full flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/60">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-orange-50 flex items-center justify-center">
                  <Receipt className="h-4.5 w-4.5 text-orange-600" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900">Table {tableNumber} Bill Review</h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    {items.length} {items.length === 1 ? "Dish" : "Dishes"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCartOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Dish List & Checkout Form */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
              {/* Dish Items */}
              <div className="space-y-3">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-start gap-3 pb-3 border-b border-slate-100 last:border-0 last:pb-0"
                  >
                    <div className="flex-1 text-xs space-y-1">
                      <p className="font-black text-slate-900">{item.name}</p>
                      {item.selectedVariant && (
                        <p className="text-[11px] text-slate-500 font-semibold">
                          Portion: {item.selectedVariant.name}
                        </p>
                      )}
                      {item.selectedAddons?.length > 0 && (
                        <p className="text-[11px] text-orange-600 font-semibold">
                          + {item.selectedAddons.map((a) => a.name).join(", ")}
                        </p>
                      )}
                      {item.specialInstructions && (
                        <p className="text-[11px] text-slate-400 italic">
                          Note: {item.specialInstructions}
                        </p>
                      )}

                      <div className="flex items-center gap-2 pt-1.5">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="h-7 w-7 bg-slate-100 hover:bg-slate-200 border border-slate-200 flex items-center justify-center rounded-xl text-slate-600 cursor-pointer"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="text-slate-900 font-black w-5 text-center text-xs">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="h-7 w-7 bg-slate-100 hover:bg-slate-200 border border-slate-200 flex items-center justify-center rounded-xl text-slate-600 cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-black text-slate-900">
                        ₹{item.price * item.quantity}
                      </span>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="block text-[11px] text-red-500 hover:underline mt-1 cursor-pointer font-bold"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Coupon Code Input */}
              <div className="border-t border-slate-100 pt-4 space-y-2">
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5 text-orange-500" /> Discount Coupon
                </h4>
                {coupon ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-black text-emerald-800">Coupon: {coupon.code}</p>
                      <p className="text-emerald-600 text-[11px]">
                        Saved: {coupon.discountType === "percentage" ? `${coupon.discountValue}%` : `₹${coupon.discountValue}`}
                      </p>
                    </div>
                    <button
                      onClick={() => setCoupon(null)}
                      className="text-red-500 hover:text-red-700 font-black cursor-pointer text-xs"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="ENTER COUPON CODE"
                      value={couponCodeText}
                      onChange={(e) => setCouponCodeText(e.target.value.toUpperCase())}
                      className="flex-1 bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl px-3.5 py-2.5 text-base sm:text-xs font-bold focus:bg-white focus:outline-none focus:border-orange-500 transition-colors uppercase"
                    />
                    <Button
                      onClick={handleValidateCoupon}
                      disabled={couponValidationLoading}
                      className="bg-slate-900 hover:bg-slate-800 text-white text-xs px-4 rounded-2xl cursor-pointer font-black border-none"
                    >
                      {couponValidationLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                    </Button>
                  </div>
                )}
              </div>

              {/* Customer Details Form (Never zooms on mobile) */}
              <form
                onSubmit={handlePlaceOrder}
                id="cartPlaceOrderForm"
                className="border-t border-slate-100 pt-4 space-y-3"
              >
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">
                  Diner Details
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Your Name *</label>
                    <input
                      type="text"
                      placeholder="Name for the bill"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      required
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 rounded-2xl px-4 py-3 text-base sm:text-sm font-medium focus:bg-white focus:outline-none focus:border-orange-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Mobile Number *</label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      placeholder="10-digit number"
                      maxLength={10}
                      value={customerPhone}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        if (val.length <= 10) setCustomerPhone(val);
                      }}
                      required
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 rounded-2xl px-4 py-3 text-base sm:text-sm font-medium focus:bg-white focus:outline-none focus:border-orange-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Payment Method *</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl px-4 py-3 text-base sm:text-sm font-medium focus:bg-white focus:outline-none focus:border-orange-500 transition-all"
                    >
                      <option value="Cash">Cash at Table (Pay when served)</option>
                      <option value="UPI">UPI / QR Payment</option>
                      <option value="Card">Credit / Debit Card</option>
                    </select>
                  </div>
                </div>
              </form>
            </div>

            {/* Financial Summary & Place Order CTA */}
            <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/70 space-y-3.5">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between items-center text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-black text-slate-900">₹{Math.round(subtotal)}</span>
                </div>
                {coupon && (
                  <div className="flex justify-between items-center text-emerald-600 font-bold">
                    <span>Coupon Discount:</span>
                    <span>- ₹{Math.round(discount)}</span>
                  </div>
                )}
                {cgst > 0 && (
                  <div className="flex justify-between items-center text-slate-600">
                    <span>CGST ({cgstRate}%):</span>
                    <span className="font-black text-slate-900">₹{Math.round(cgst)}</span>
                  </div>
                )}
                {sgst > 0 && (
                  <div className="flex justify-between items-center text-slate-600">
                    <span>SGST ({sgstRate}%):</span>
                    <span className="font-black text-slate-900">₹{Math.round(sgst)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-sm font-black text-slate-900 pt-2 border-t border-slate-200">
                  <span>Total Payable:</span>
                  <span className="text-base text-orange-600">₹{Math.round(total)}</span>
                </div>
              </div>

              <Button
                type="submit"
                form="cartPlaceOrderForm"
                disabled={submittingOrder || items.length === 0}
                className="w-full text-white font-black h-12 rounded-2xl flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-transform cursor-pointer border-none text-xs"
                style={{
                  backgroundImage: `linear-gradient(135deg, ${primaryCol}, #f97316)`,
                  boxShadow: `0 8px 20px -4px ${primaryCol}40`,
                }}
              >
                {submittingOrder ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending to Kitchen...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Confirm & Send Order (₹{Math.round(total)})
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
