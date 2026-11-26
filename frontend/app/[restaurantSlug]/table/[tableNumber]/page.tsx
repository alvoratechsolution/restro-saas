"use client";

import React, { use, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import apiFetch from "@/lib/api";
import useCart from "@/store/useCart";
import useSocket from "@/hooks/useSocket";
import toast from "react-hot-toast";
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
  RotateCw,
  AlertCircle,
  ChefHat,
  Search,
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
  enableGst?: boolean;
  cgstRate: number;
  sgstRate: number;
  serviceChargeRate: number;
  deliveryChargeRate: number;
}

interface MenuResponse {
  success: boolean;
  restaurant?: Restaurant;
  theme?: Theme;
  categories?: Category[];
  menuItems?: MenuItem[];
  settings?: SettingsData;
  isSuspended?: boolean;
  message?: string;
}

export default function TableOrderingPage({
  params,
}: {
  params: Promise<{ restaurantSlug: string; tableNumber: string }>;
}) {
  const router = useRouter();
  const { restaurantSlug, tableNumber: rawTableNumber } = use(params);

  // Decode URL encoded characters and clean redundant prefixes (e.g. "table%202" -> "2", "Table 5" -> "5")
  const decodedTable = decodeURIComponent(rawTableNumber || "").trim();
  const cleanTableNumber = decodedTable.replace(/^(table|room)\s*/i, "") || decodedTable;
  const tableNumber = cleanTableNumber;

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
    activeOrderId,
    setActiveOrderId,
  } = useCart();

  // Selected Category
  const [selectedCat, setSelectedCat] = useState<string>("All");

  // Search query
  const [searchQuery, setSearchQuery] = useState<string>("");

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

  // Added item toast pill state (zero backdrop, compact, professional)
  const [addedToast, setAddedToast] = useState<{ name: string; id: number } | null>(null);

  const triggerAddToast = (name: string) => {
    const id = Date.now();
    setAddedToast({ name, id });
    setTimeout(() => {
      setAddedToast((prev) => (prev?.id === id ? null : prev));
    }, 1400);
  };

  // Waiter modal states
  const [waiterModalOpen, setWaiterModalOpen] = useState(false);
  const [callingWaiter, setCallingWaiter] = useState(false);

  // Cooking & Kitchen instructions state
  const [cookingInstructions, setCookingInstructions] = useState("");

  // Coupon state
  const [couponCodeText, setCouponCodeText] = useState("");
  const [couponValidationLoading, setCouponValidationLoading] = useState(false);

  // Order submission loading
  const [submittingOrder, setSubmittingOrder] = useState(false);

  // Query menu (with 1-minute fresh caching for instant mobile QR scans)
  const { data: menuResponse, isLoading, error } = useQuery<MenuResponse>({
    queryKey: ["customer", "menu", restaurantSlug],
    queryFn: () => apiFetch(`/api/customer/menu?slug=${restaurantSlug}&tableNumber=${tableNumber}`),
    staleTime: 60 * 1000,
  });

  // Query active order for this table (consolidated billing)
  const { data: activeOrderData } = useQuery<{ success: boolean; activeOrder: any }>({
    queryKey: ["customer", "active-order", restaurantSlug, tableNumber],
    queryFn: () => apiFetch(`/api/customer/active-order?slug=${restaurantSlug}&tableNumber=${tableNumber}`),
    refetchInterval: 12000,
  });

  const activeTableOrder = activeOrderData?.activeOrder;
  const hasActiveOrder = Boolean(activeTableOrder?._id || activeOrderId);

  useEffect(() => {
    if (activeTableOrder?._id) {
      setActiveOrderId(activeTableOrder._id);
    }
  }, [activeTableOrder, setActiveOrderId]);

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

  // Suspended or Inactive Restaurant Screen (When Super Admin marks restaurant as suspended / inactive)
  if (menuResponse?.isSuspended || (!menuResponse?.success && menuResponse?.restaurant)) {
    const closedRestName = menuResponse?.restaurant?.name || "This Restaurant";
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#f8fafc] px-4 py-8 text-center font-sans">
        <div className="w-full max-w-sm bg-white rounded-3xl p-7 shadow-xl shadow-slate-200/60 border border-slate-200/80 flex flex-col items-center">
          {/* Logo / Badge */}
          <div className="relative mb-4">
            <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-amber-500 to-rose-500 flex items-center justify-center shadow-lg shadow-rose-500/20 text-white font-black text-3xl">
              {closedRestName.charAt(0).toUpperCase()}
            </div>
            <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-rose-500 border-2 border-white flex items-center justify-center shadow">
              <span className="h-2.5 w-2.5 rounded-full bg-white animate-pulse" />
            </div>
          </div>

          <h2 className="text-xl font-black text-slate-900 tracking-tight mb-1">
            {closedRestName}
          </h2>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold mb-3">
            Table {tableNumber}
          </div>

          {/* Status Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200/80 text-rose-600 text-xs font-extrabold mb-4">
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            CURRENTLY CLOSED
          </div>

          <p className="text-slate-600 text-xs sm:text-sm leading-relaxed mb-6">
            We are currently not accepting digital table orders at this time. Please speak with our restaurant staff or waiter directly for assistance.
          </p>

          {/* Refresh / Check Button */}
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-sm cursor-pointer flex items-center justify-center gap-2"
          >
            <RotateCw className="h-3.5 w-3.5" />
            Check / Refresh Status
          </button>

          {/* Powered by Alvora badge */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col items-center gap-0.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              ServeDesk
            </span>
            <span className="text-[9px] font-bold text-slate-400">
              Powered by Alvora Tech Solution
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Error Screen (for completely invalid links or network errors)
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

    const trimmedName = tempName.trim() || "Guest";
    const cleanPhone = tempPhone.replace(/\D/g, "");

    if (tempPhone.trim() && cleanPhone.length !== 10) {
      setValidationError("Please enter a valid 10-digit mobile number or leave blank");
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

        <div className="w-full max-w-sm z-10 space-y-5 my-auto">
          {/* Restaurant Branding */}
          <div className="text-center space-y-2">
            <div
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl text-white shadow-xl shadow-orange-500/20"
              style={{ backgroundImage: `linear-gradient(135deg, ${primaryCol}, #f97316)` }}
            >
              <UtensilsCrossed className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-snug pt-1">
              {restaurant.name}
            </h1>
            <div className="inline-flex items-center gap-1.5 bg-orange-50 border border-orange-200/80 px-3.5 py-1 rounded-full text-orange-700 text-xs font-black">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              TABLE / ROOM {tableNumber}
            </div>
            <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed pt-1">
              Contactless dining & room service directly from your table or room.
            </p>
          </div>

          {/* Clean Light Form Card */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xl shadow-slate-200/40 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900">Guest Details</h3>
              <p className="text-[11px] text-slate-500">Enter your name for table & room service orders</p>
            </div>

            <form onSubmit={handleWelcomeSubmit} className="space-y-3.5">
              {validationError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-bold p-3 rounded-xl text-center">
                  {validationError}
                </div>
              )}

              {/* Name Input */}
              <div className="space-y-1.5 text-left">
                <label className="text-xs font-bold text-slate-700">Your Name *</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="e.g. Rahul Sharma"
                    value={tempName}
                    onChange={(e) => {
                      setTempName(e.target.value);
                      if (validationError) setValidationError("");
                    }}
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-2xl text-sm focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all font-medium outline-none"
                  />
                </div>
              </div>

              {/* Mobile Number Input (Optional) */}
              <div className="space-y-1.5 text-left">
                <label className="text-xs font-bold text-slate-700">
                  Mobile Number <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400 pointer-events-none" />
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
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-2xl text-sm focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all font-medium outline-none"
                  />
                </div>
                <p className="text-[10px] text-slate-400 pl-1">For digital receipt & live kitchen order status</p>
              </div>

              {/* Submit CTA */}
              <Button
                type="submit"
                className="w-full text-white font-black h-11 rounded-2xl flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-[0.98] cursor-pointer border-none text-xs mt-2"
                style={{
                  backgroundImage: `linear-gradient(135deg, ${primaryCol}, #f97316)`,
                  boxShadow: `0 8px 20px -4px ${primaryCol}40`,
                }}
              >
                Continue to Menu
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>

            <div className="text-center pt-1 border-t border-slate-100">
              <button
                type="button"
                onClick={handleBrowseFirst}
                className="text-xs font-bold text-slate-500 hover:text-orange-600 transition-colors py-1 cursor-pointer"
              >
                Or Browse Menu as Guest →
              </button>
            </div>
          </div>

          {/* ServeDesk Powered by Alvora Tech Solution Footer Badge */}
          <div className="pt-2 text-center">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white/90 backdrop-blur-sm border border-slate-200/90 rounded-full shadow-xs">
              <Sparkles className="h-3 w-3 text-orange-500 shrink-0" />
              <span className="text-[11px] font-black tracking-wide text-slate-800 uppercase">
                ServeDesk
              </span>
              <span className="text-[10px] text-slate-300 font-bold">•</span>
              <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase">
                Powered by Alvora Tech Solution
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Handle Staff / Room Service Request Calls
  const handleCallWaiterAction = async (reason: string) => {
    try {
      setCallingWaiter(true);
      const branchId = (restaurant as unknown as { branchId?: string })?.branchId || undefined;
      await apiFetch("/api/customer/call-waiter", {
        method: "POST",
        body: JSON.stringify({
          restaurantId: restaurant._id,
          branchId,
          tableNumber,
          customerName: verifiedName || customerName || "Guest",
          reason,
        }),
      });
      if (socket) {
        socket.emit("call-waiter", {
          branchId,
          tableNumber,
          customerName: verifiedName || customerName || "Guest",
          reason,
        });
      }
      setWaiterModalOpen(false);
      Swal.fire({
        icon: "success",
        title: "🛎️ Staff Alerted!",
        text: `Assistance requested for Table / Room ${tableNumber}: "${reason}". Staff will attend shortly.`,
        timer: 2500,
        showConfirmButton: false,
      });
    } catch (err: unknown) {
      Swal.fire({
        icon: "error",
        title: "Request Failed",
        text: (err as Error).message || "Failed to alert staff",
      });
    } finally {
      setCallingWaiter(false);
    }
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
      triggerAddToast(item.name);
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

    triggerAddToast(customizingItem.name);
    setCustomizingItem(null);
  };

  const handleAddonToggle = (addon: Addon) => {
    if (selectedAddons.some((a) => (a._id && addon._id ? a._id === addon._id : a.name === addon.name))) {
      setSelectedAddons(selectedAddons.filter((a) => (a._id && addon._id ? a._id !== addon._id : a.name !== addon.name)));
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

  // Order placing handler (supports both new orders and appending to table bill)
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

    const trimmedName = customerName.trim() || verifiedName || "Guest";
    const cleanPhone = customerPhone.replace(/\D/g, "");

    if (customerPhone.trim() && cleanPhone.length !== 10) {
      Swal.fire({
        icon: "warning",
        title: "Invalid Phone Number",
        text: "Please enter a valid 10-digit mobile number or leave it blank.",
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
        specialInstructions: cookingInstructions.trim() || undefined,
        existingOrderId: activeTableOrder?._id || activeOrderId || undefined,
        items: items.map((i) => ({
          menuItemId: i.menuItemId,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
          selectedVariant: i.selectedVariant?.name || undefined,
          selectedAddons: i.selectedAddons.map((a) => ({ name: a.name, price: a.price })),
          specialInstructions: i.specialInstructions || cookingInstructions.trim() || undefined,
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
            isAddition: Boolean(res.isAppended),
          });
        }

        clearCart();
        setCookingInstructions("");
        setCartOpen(false);
        setActiveOrderId(res.orderId);

        toast.success(
          res.isAppended
            ? `Dishes added to Table ${tableNumber} bill!`
            : `Order sent to kitchen! Being prepared.`,
          {
            icon: "👨‍🍳",
            duration: 3000,
            style: {
              borderRadius: "16px",
              background: "#0f172a",
              color: "#fff",
              fontSize: "12px",
              fontWeight: "bold",
            },
          }
        );

        router.push(`/${restaurantSlug}/table/${tableNumber}/track/${res.orderId}`);
      }
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to place order. Please try again.");
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

  const hasGstPlanFeature = !restaurant?.subscriptionPlan?.features || restaurant.subscriptionPlan.features.includes("gst-billing");
  const isGstEnabled = hasGstPlanFeature && (menuResponse?.settings?.enableGst !== false);
  const cgstRate = isGstEnabled ? (menuResponse?.settings?.cgstRate ?? 2.5) : 0;
  const sgstRate = isGstEnabled ? (menuResponse?.settings?.sgstRate ?? 2.5) : 0;

  const cgst = (taxableAmount * cgstRate) / 100;
  const sgst = (taxableAmount * sgstRate) / 100;
  const total = taxableAmount + cgst + sgst;

  const isHotel = (restaurant as any)?.businessType === "hotel";
  const unitLabel = isHotel ? "Room" : "Table";
  const serviceLabel = isHotel ? "In-Room Dining" : "Table Dining";
  const attendantLabel = isHotel ? "Room Service" : "Call Waiter";

  const totalQty = items.reduce((acc, i) => acc + i.quantity, 0);

  const filteredItems = menuItems.filter((item) => {
    const rawCatId =
      typeof item.categoryId === "object" && item.categoryId !== null
        ? ((item.categoryId as any)._id?.toString() || (item.categoryId as any).toString())
        : item.categoryId?.toString();
    const matchesCat = selectedCat === "All" || rawCatId === selectedCat;
    const matchesType =
      filterType === "all" ||
      (filterType === "veg" && item.foodType === "veg") ||
      (filterType === "non-veg" && item.foodType === "non-veg");
    const matchesSearch =
      !searchQuery.trim() ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase().trim()));
    return matchesCat && matchesType && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col pb-28 relative overflow-x-hidden font-sans">
      {/* Soft background ambient gradient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-80 bg-gradient-to-b from-orange-100/40 via-amber-50/20 to-transparent pointer-events-none blur-3xl" />

      {/* Premium Dark Mobile-Optimized Navigation Header */}
      <header className="sticky top-0 z-30 bg-slate-950/95 border-b border-slate-800/80 px-3 sm:px-5 py-2 sm:py-2.5 shadow-lg backdrop-blur-xl">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
          {/* Left: Unit / Table Badge */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 shrink-0">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="text-[11px] sm:text-xs font-black text-orange-400 tracking-wide uppercase whitespace-nowrap">
              {unitLabel} {tableNumber}
            </span>
          </div>

          {/* Middle: Clean Restaurant Identity */}
          <div className="flex-1 min-w-0 text-center px-1">
            <h1 className="font-black text-white text-sm sm:text-base tracking-tight truncate drop-shadow-sm">
              {restaurant.name}
            </h1>
            <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
              {serviceLabel}
              {verifiedName && verifiedName !== "Guest" && (
                <span className="text-orange-400 font-semibold ml-1">· {verifiedName}</span>
              )}
            </p>
          </div>

          {/* Right: Call Waiter Button */}
          <button
            onClick={() => setWaiterModalOpen(true)}
            className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 rounded-xl text-xs font-bold transition-transform active:scale-95 cursor-pointer shrink-0 whitespace-nowrap"
            title={attendantLabel}
          >
            <BellRing className="h-3.5 w-3.5 text-amber-400 animate-pulse shrink-0" />
            <span className="text-[11px] font-black">{attendantLabel}</span>
          </button>
        </div>
      </header>

      {/* Sleek Compact Notification Pill (Zero Backdrop, Zero Black Shadow) */}
      {addedToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 backdrop-blur-md text-white px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 text-xs font-bold pointer-events-none animate-in fade-in slide-in-from-top-3 duration-200 border border-white/10">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span className="truncate max-w-[220px]">Added {addedToast.name}</span>
        </div>
      )}

      {/* Main Container */}
      <main className="max-w-4xl mx-auto w-full px-4 mt-4 space-y-4 flex-1 z-10 pb-8">
        {/* Active Consolidated Table Bill Banner */}
        {activeTableOrder && (
          <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white rounded-3xl p-4 shadow-lg shadow-orange-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
                <Receipt className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-md">
                    Running Table Bill · #{activeTableOrder._id.slice(-6).toUpperCase()}
                  </span>
                </div>
                <h3 className="text-sm font-black text-white mt-0.5">
                  Total Bill: ₹{Math.round(activeTableOrder.total)} • Status: {activeTableOrder.status}
                </h3>
                <p className="text-[11px] text-orange-100 font-medium">
                  Adding more items will merge into this single bill for Table {tableNumber}.
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push(`/${restaurantSlug}/table/${tableNumber}/track/${activeTableOrder._id}`)}
              className="bg-white text-orange-600 hover:bg-orange-50 px-4 py-2 rounded-2xl text-xs font-black shadow-xs shrink-0 self-start sm:self-auto transition-transform active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <span>View Bill & Status</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Unit Welcome Banner */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-4 sm:p-5 shadow-xs flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-orange-600 text-[10px] font-black uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5" /> {serviceLabel}
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
              {unitLabel} {tableNumber} Digital Menu
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

        {/* Live Search Bar for Items */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search tasty dishes, drinks, desserts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-9 py-2.5 bg-white border border-slate-200/90 text-slate-900 placeholder:text-slate-400 rounded-2xl text-xs sm:text-sm font-medium outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 shadow-xs transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
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
                      loading="lazy"
                      decoding="async"
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
                      <span className="text-[11px] text-rose-600 font-extrabold bg-rose-50 px-2.5 py-1 rounded-xl border border-rose-200 shadow-2xs">
                        Unavailable
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
                    {customizingItem.variants.map((v, vIdx) => (
                      <button
                        key={v._id || `${v.name}-${vIdx}`}
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
                    {customizingItem.addons.map((a, aIdx) => {
                      const isSel = selectedAddons.some((addon) => (addon._id && a._id ? addon._id === a._id : addon.name === a.name));
                      return (
                        <button
                          key={a._id || `${a.name}-${aIdx}`}
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
                          Portion: {typeof item.selectedVariant === "object" ? (item.selectedVariant as any)?.name : item.selectedVariant}
                        </p>
                      )}
                      {item.selectedAddons?.length > 0 && (
                        <p className="text-[11px] text-orange-600 font-semibold">
                          + {item.selectedAddons.map((a: any) => typeof a === "object" ? a.name : a).join(", ")}
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

              {/* Cooking & Kitchen Instructions (Replaced Coupon Section) */}
              <div className="border-t border-slate-100 pt-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <ChefHat className="h-3.5 w-3.5 text-orange-500" /> Cooking &amp; Kitchen Notes
                  </h4>
                  {cookingInstructions && (
                    <button
                      type="button"
                      onClick={() => setCookingInstructions("")}
                      className="text-[11px] font-bold text-slate-400 hover:text-red-500 cursor-pointer transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Popular Quick Suggestions Chips */}
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "🌶️ Less Spicy",
                    "🔥 Extra Spicy",
                    "🧅 No Onion / Garlic",
                    "🧀 Extra Crispy",
                    "🧊 Less Ice",
                    "🧂 Less Salt",
                  ].map((chip) => {
                    const clean = chip.replace(/^..?\s*/, "");
                    const isSelected = cookingInstructions.includes(clean);
                    return (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            const updated = cookingInstructions
                              .split(",")
                              .map((s) => s.trim())
                              .filter((s) => s && s !== clean)
                              .join(", ");
                            setCookingInstructions(updated);
                          } else {
                            setCookingInstructions((prev) =>
                              prev.trim() ? `${prev.trim()}, ${clean}` : clean
                            );
                          }
                        }}
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-orange-50 text-orange-700 border-orange-300 shadow-2xs"
                            : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200/90"
                        }`}
                      >
                        {chip}
                      </button>
                    );
                  })}
                </div>

                {/* Text Input for Custom Cooking Instructions */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Add cooking instructions (e.g. less spicy, make it extra crispy)..."
                    value={cookingInstructions}
                    onChange={(e) => setCookingInstructions(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl px-3.5 py-2.5 text-base sm:text-xs font-semibold focus:bg-white focus:outline-none focus:border-orange-500 transition-colors placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Customer Details Form (Never zooms on mobile) */}
              <form
                onSubmit={handlePlaceOrder}
                id="cartPlaceOrderForm"
                className="border-t border-slate-100 pt-4 space-y-3"
              >
                {activeTableOrder && (
                  <div className="bg-orange-50 border border-orange-200/90 rounded-2xl p-3 flex items-center gap-2.5 text-xs text-orange-900 font-bold mb-3">
                    <Receipt className="h-4 w-4 text-orange-600 shrink-0" />
                    <span>
                      Adding to Table {tableNumber} running bill (#{activeTableOrder._id.slice(-6).toUpperCase()})
                    </span>
                  </div>
                )}

                <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">
                  Diner Details
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Your Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Rahul Sharma"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      required
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 rounded-2xl px-4 py-3 text-base sm:text-sm font-medium focus:bg-white focus:outline-none focus:border-orange-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Mobile Number <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      placeholder="10-digit number (Optional)"
                      maxLength={10}
                      value={customerPhone}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        if (val.length <= 10) setCustomerPhone(val);
                      }}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 rounded-2xl px-4 py-3 text-base sm:text-sm font-medium focus:bg-white focus:outline-none focus:border-orange-500 transition-all"
                    />
                    <p className="text-[10px] text-slate-400 mt-1 pl-1">For digital receipt & live order tracking</p>
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
                ) : activeTableOrder ? (
                  <>
                    <Plus className="h-4 w-4" />
                    Confirm & Add to Table Bill (₹{Math.round(total)})
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

      {/* Compact Floating Cart Pill Above Bottom Nav */}
      {totalQty > 0 && !cartOpen && (
        <div className="fixed bottom-[66px] left-3 right-3 z-30 md:hidden max-w-sm mx-auto animate-in slide-in-from-bottom duration-150">
          <button
            onClick={() => setCartOpen(true)}
            className="w-full bg-slate-900/95 backdrop-blur-md text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center justify-between font-bold text-xs border border-white/10 active:scale-[0.98] transition-transform cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="bg-orange-500 text-white px-2 py-0.5 rounded-md text-[11px] font-black">
                {totalQty} {totalQty === 1 ? "Item" : "Items"}
              </span>
              <span className="text-slate-400">•</span>
              <span className="font-extrabold text-sm text-white">₹{Math.round(total)}</span>
            </div>
            <span className="flex items-center gap-1 text-[11px] font-black text-orange-400">
              {activeTableOrder ? "Add to Bill" : "View Cart"} <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </button>
        </div>
      )}

      {/* Desktop Floating Cart Button */}
      {totalQty > 0 && !cartOpen && (
        <div className="hidden md:block fixed bottom-6 right-6 z-40">
          <button
            onClick={() => setCartOpen(true)}
            className="bg-gradient-to-r from-orange-500 to-amber-500 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 font-black text-xs hover:shadow-2xl transition-all cursor-pointer"
          >
            <ShoppingBag className="h-4 w-4" />
            <span>{totalQty} Items • ₹{Math.round(total)}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Mobile App-Style Bottom Navigation Bar (Preserved & Enhanced) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] px-2 py-1.5">
        <div className="max-w-md mx-auto grid grid-cols-4 items-center gap-1">
          {/* Menu Tab */}
          <button
            onClick={() => {
              setCartOpen(false);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="flex flex-col items-center justify-center py-1 text-orange-600 font-bold transition-all active:scale-95 cursor-pointer"
          >
            <UtensilsCrossed className="h-5 w-5" />
            <span className="text-[10px] mt-1 font-black">Menu</span>
          </button>

          {/* Cart Tab */}
          <button
            onClick={() => setCartOpen(true)}
            className="flex flex-col items-center justify-center py-1 text-slate-600 hover:text-slate-900 font-bold transition-all active:scale-95 cursor-pointer relative"
          >
            <div className="relative">
              <ShoppingBag className="h-5 w-5 text-slate-700" />
              {totalQty > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-orange-600 text-white text-[10px] font-black h-4 min-w-[16px] px-1 rounded-full flex items-center justify-center shadow-xs">
                  {totalQty}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-1 font-semibold text-slate-700">
              {totalQty > 0 ? `₹${Math.round(total)}` : "Cart"}
            </span>
          </button>

          {/* Track Order Tab (Clickable ONLY when active order exists) */}
          <button
            onClick={() => {
              if (hasActiveOrder) {
                router.push(`/${restaurantSlug}/table/${tableNumber}/track/${activeTableOrder?._id || activeOrderId}`);
              }
            }}
            disabled={!hasActiveOrder}
            className={`flex flex-col items-center justify-center py-1 transition-all ${
              hasActiveOrder
                ? "text-orange-600 hover:text-orange-700 font-black active:scale-95 cursor-pointer"
                : "text-slate-300 opacity-35 cursor-not-allowed select-none"
            }`}
            title={hasActiveOrder ? "Track Live Table Order" : "Place an order first to enable tracking"}
          >
            <div className="relative">
              <Receipt className={`h-5 w-5 ${hasActiveOrder ? "text-orange-600" : "text-slate-300"}`} />
              {hasActiveOrder && (
                <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping" />
              )}
            </div>
            <span className={`text-[10px] mt-1 ${hasActiveOrder ? "font-black text-orange-600" : "font-medium text-slate-400"}`}>
              {hasActiveOrder ? (activeTableOrder ? "Table Bill" : "Track") : "Track"}
            </span>
          </button>

          {/* Call Waiter & Water Assistance Tab */}
          {/* Call Waiter / Room Service Tab */}
          <button
            onClick={() => setWaiterModalOpen(true)}
            className="flex flex-col items-center justify-center py-1 text-slate-600 hover:text-amber-600 font-bold transition-all active:scale-95 cursor-pointer"
          >
            <BellRing className="h-5 w-5 text-amber-500 animate-pulse" />
            <span className="text-[10px] mt-1 font-bold text-slate-700">{attendantLabel}</span>
          </button>
        </div>
      </nav>

      {/* Guest Assistance & Service Request Modal */}
      {waiterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center shadow-xs">
                  <BellRing className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">{attendantLabel} · {unitLabel} {tableNumber}</h3>
                  <p className="text-[11px] text-slate-400">Select what service you need</p>
                </div>
              </div>
              <button
                onClick={() => setWaiterModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {[
                { label: "Water Needed", sub: "Fresh drinking water bottle", icon: "💧" },
                { label: isHotel ? "Housekeeping" : "Clean Table", sub: isHotel ? "Room cleaning & clearing" : "Table clearing & cleaning", icon: "🍽️" },
                { label: isHotel ? "Call Room Attendant" : "Call Floor Waiter", sub: isHotel ? "Room service assistance" : "Floor waiter assistance", icon: "🛎️" },
                { label: "Bill / Payment", sub: "Request bill & payment", icon: "💳" },
              ].map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => handleCallWaiterAction(opt.label)}
                  disabled={callingWaiter}
                  className="flex flex-col items-center justify-center p-3.5 bg-slate-50 hover:bg-orange-50/80 border border-slate-200 hover:border-orange-300 rounded-2xl transition-all cursor-pointer text-center group active:scale-95 disabled:opacity-50"
                >
                  <span className="text-2xl mb-1">{opt.icon}</span>
                  <span className="text-xs font-black text-slate-800 group-hover:text-orange-600">{opt.label}</span>
                  <span className="text-[10px] text-slate-400 mt-0.5 font-medium leading-tight">{opt.sub}</span>
                </button>
              ))}
            </div>

            <div className="pt-2 text-center border-t border-slate-100">
              <p className="text-[11px] text-slate-400">
                Powered by <strong className="text-slate-700">ServeDesk · Alvora Tech Solution</strong>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
