"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut as nextSignOut } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import apiFetch from "@/lib/api";
import useSocket from "@/hooks/useSocket";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import {
  LayoutDashboard,
  UtensilsCrossed,
  Tags,
  TableProperties,
  Users,
  Ticket,
  Settings as SettingsIcon,
  ShoppingBag,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  User,
  Bell,
  Check,
  Lock,
  Zap,
  ExternalLink,
  BarChart3,
} from "lucide-react";
import Button from "@/components/ui/button";

const SYSTEM_FEATURES = ["menu", "orders", "qr-tables", "staff", "coupons", "settings", "reports"];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { data: restaurantResponse } = useQuery<{
    success: boolean;
    data: {
      name: string;
      slug?: string;
      logo?: string;
      hasKitchen?: boolean;
      hasStaff?: boolean;
      enabledModules?: string[];
      subscriptionPlan?: {
        name: string;
        features: string[];
      };
    };
  }>({
    queryKey: ["admin", "restaurant-info"],
    queryFn: () => apiFetch("/api/admin/restaurant-info"),
    enabled: status === "authenticated",
  });

  const restaurantName = restaurantResponse?.data?.name || "Tasty Bites";
  const restaurantSlug = restaurantResponse?.data?.slug || "tasty-bites";
  const restaurantLogo = restaurantResponse?.data?.logo || "/logo.png";
  const planName = restaurantResponse?.data?.subscriptionPlan?.name || "Trial Plan";
  const activeFeatures = restaurantResponse?.data?.subscriptionPlan?.features || [
    "menu",
    "orders",
    "qr-tables",
    "staff",
    "coupons",
    "settings",
  ];

  const branchId = (session?.user as unknown as { branchId?: string })?.branchId;
  const [activeCalls, setActiveCalls] = useState<
    Array<{
      id: string;
      tableNumber: string;
      unitLabel?: string;
      reason: string;
      customerName?: string;
      time: string;
    }>
  >([]);
  const [showDropdown, setShowDropdown] = useState(false);

  // Fetch unread notifications from DB
  const { data: notifResponse, refetch: refetchNotifs } = useQuery<{
    success: boolean;
    data: Array<{
      _id: string;
      title: string;
      message: string;
      type: string;
      isRead: boolean;
      createdAt: string;
    }>;
    unreadCount: number;
  }>({
    queryKey: ["admin", "notifications"],
    queryFn: () => apiFetch("/api/admin/notifications"),
    enabled: status === "authenticated",
    refetchInterval: 12000,
  });

  const socket = useSocket(branchId);

  useEffect(() => {
    if (!socket) return;

    socket.on("waiter-called", (data: any) => {
      try {
        const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        osc.type = "sine";
        osc.frequency.setValueAtTime(987.77, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1318.51, audioCtx.currentTime + 0.15);

        gainNode.gain.setValueAtTime(0.4, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.2);

        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 1.2);
      } catch (e) {
        console.warn("Autoplay audio blocked:", e);
      }

      const label = data?.unitLabel || "Table / Room";
      const reason = data?.reason || "Staff Assistance";
      const guest = data?.customerName ? ` (${data.customerName})` : "";
      const callTime = data?.time || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      toast(`🛎️ ${label} ${data.tableNumber}${guest}: ${reason}`, {
        icon: "🛎️",
        duration: 8000,
        style: {
          background: "#0f172a",
          color: "#fff",
          border: "1px solid #ea580c",
          borderRadius: "16px",
          padding: "12px 18px",
          fontWeight: 700,
        },
      });

      // Admin Interactive Visual Popup
      Swal.fire({
        title: `🛎️ ${label} ${data.tableNumber} Calling!`,
        html: `
          <div style="text-align: left; font-size: 14px; color: #334155; line-height: 1.6; padding: 4px;">
            <p style="margin-bottom: 6px;"><strong>Service Requested:</strong> <span style="color: #ea580c; font-weight: 800;">${reason}</span></p>
            <p style="margin-bottom: 6px;"><strong>Guest Name:</strong> <strong>${data.customerName || "Guest"}</strong></p>
            <p style="margin-bottom: 0;"><strong>Time:</strong> <span style="color: #64748b;">${callTime}</span></p>
          </div>
        `,
        icon: "info",
        confirmButtonText: "Attending / Done",
        confirmButtonColor: "#ea580c",
        showCancelButton: true,
        cancelButtonText: "Dismiss",
        timer: 20000,
      });

      setActiveCalls((prev) => [
        {
          id: Math.random().toString(),
          tableNumber: data.tableNumber,
          unitLabel: label,
          reason,
          customerName: data.customerName || "Guest",
          time: callTime,
        },
        ...prev.filter((c) => c.tableNumber !== data.tableNumber || c.reason !== reason),
      ]);

      refetchNotifs();
    });

    return () => {
      socket.off("waiter-called");
    };
  }, [socket, refetchNotifs]);

  const unreadDbCalls = (notifResponse?.data || [])
    .filter((n) => n.type === "waiter_call" && !n.isRead)
    .map((n) => ({
      id: n._id,
      tableNumber: n.message.match(/(?:Table|Room)\s+(\w+)/i)?.[1] || "1",
      unitLabel: n.message.includes("Room") ? "Room" : "Table",
      reason: n.message.split(": ")[1] || n.title,
      customerName: n.message.match(/\((.*?)\)/)?.[1] || "Guest",
      time: new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }));

  const combinedCalls = [
    ...activeCalls,
    ...unreadDbCalls.filter((dbCall) => !activeCalls.some((ac) => ac.id === dbCall.id)),
  ];

  const totalAlertsCount = combinedCalls.length;

  const handleClearAll = async () => {
    setActiveCalls([]);
    try {
      await apiFetch("/api/admin/notifications/mark-all-read", { method: "PUT" });
      refetchNotifs();
    } catch (e) {
      console.warn(e);
    }
  };

  const handleDismissCall = async (callId: string) => {
    setActiveCalls((prev) => prev.filter((c) => c.id !== callId));
    try {
      await apiFetch(`/api/admin/notifications/${callId}/read`, { method: "PUT" });
      refetchNotifs();
    } catch (e) {
      // ignore
    }
  };

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-500 font-bold">
        Loading Session...
      </div>
    );
  }

  const role = (session?.user as unknown as { role?: string })?.role;
  if (!session || (role !== "RESTAURANT_ADMIN" && role !== "SUPER_ADMIN")) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center">
        <ShieldCheck className="h-16 w-16 text-rose-500 mb-4 animate-bounce" />
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Unauthorized Access</h1>
        <p className="text-slate-500 mb-6">You must be logged in as a Restaurant Admin to access this panel.</p>
        <Button onClick={() => router.push("/login")} className="bg-orange-500 hover:bg-orange-600 text-white font-bold">
          Go to Login
        </Button>
      </div>
    );
  }

  const navItems = [
    { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Live Orders", href: "/admin/orders", icon: ShoppingBag, feature: "orders" },
    { name: "Reports & Sales", href: "/admin/reports", icon: BarChart3 },
    { name: "Categories", href: "/admin/categories", icon: Tags, feature: "menu" },
    { name: "Menu Items", href: "/admin/menu", icon: UtensilsCrossed, feature: "menu" },
    { name: "Tables & QRs", href: "/admin/tables", icon: TableProperties, feature: "qr-tables" },
    { name: "Staff Members", href: "/admin/staff", icon: Users, feature: "staff" },
    { name: "Coupons", href: "/admin/coupons", icon: Ticket, feature: "coupons" },
    { name: "Settings", href: "/admin/settings", icon: SettingsIcon, feature: "settings" },
  ];

  const hasStaff = restaurantResponse?.data?.hasStaff !== false;

  const filteredNavItems = navItems.filter((item) => {
    if (item.feature === "staff" && !hasStaff && role !== "SUPER_ADMIN") return false;
    if (role === "SUPER_ADMIN") return true;
    return !item.feature || activeFeatures.includes(item.feature);
  });

  activeFeatures.forEach((feature) => {
    // Exclude custom-domain and white-label from admin sidebar
    if (feature === "custom-domain" || feature === "customdomain" || feature === "white-label") {
      return;
    }
    if (!SYSTEM_FEATURES.includes(feature)) {
      if (!filteredNavItems.some((item) => item.feature === feature)) {
        filteredNavItems.push({
          name: feature.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          href: `/admin/custom/${feature}`,
          icon: Zap,
          feature: feature,
        });
      }
    }
  });

  const isCustomRoute = pathname.startsWith("/admin/custom/");
  const customFeatureId = isCustomRoute ? pathname.replace("/admin/custom/", "") : null;

  const currentNavItem = navItems.find((item) => pathname.startsWith(item.href));
  const isFeatureLocked =
    role !== "SUPER_ADMIN" && (
      (currentNavItem && currentNavItem.feature && !activeFeatures.includes(currentNavItem.feature)) ||
      (isCustomRoute && customFeatureId && !activeFeatures.includes(customFeatureId))
    );

  const lockedFeatureName = isCustomRoute && customFeatureId
    ? customFeatureId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : currentNavItem?.name;

  return (
    <div className="h-screen bg-[#f8fafc] text-slate-800 flex flex-col md:flex-row font-sans overflow-hidden">
      {/* ================= SIDEBAR FOR DESKTOP ================= */}
      <aside className="hidden md:flex flex-col w-56 border-r border-slate-800/80 bg-[#0b0f19] p-4 shrink-0 shadow-2xl z-20 h-screen overflow-y-auto">
        {/* Brand identity header */}
        <div className="flex items-center gap-2.5 mb-6 px-1">
          <div className="h-8 w-8 rounded-lg overflow-hidden shadow-md shadow-orange-500/25 bg-slate-900 border border-orange-500/30 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={restaurantLogo} alt="Logo" className="h-full w-full object-cover" />
          </div>
          <div className="overflow-hidden">
            <h1 className="font-bold text-white text-sm tracking-tight truncate max-w-[140px]">
              {restaurantName}
            </h1>
            <p className="text-[8px] text-orange-400 font-bold uppercase tracking-wider truncate">
              ServeDesk · Alvora Tech
            </p>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 space-y-1 overflow-y-auto pr-0.5">
          {filteredNavItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 ${
                  isActive
                    ? "bg-gradient-to-r from-orange-500/20 to-orange-500/10 border-l-3 border-orange-500 text-orange-400 font-bold shadow-xs"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/40"
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-orange-400" : "text-slate-500"}`} />
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom User Profile */}
        <div className="mt-auto pt-4 border-t border-slate-800/80">
          <div className="flex items-center gap-2.5 mb-3 px-1">
            <div className="h-7 w-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 text-xs shrink-0">
              <User className="h-3.5 w-3.5" />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-white truncate">{session.user?.name}</p>
              <p className="text-[9px] text-slate-400 truncate">{session.user?.email}</p>
            </div>
          </div>
          <button
            onClick={() => nextSignOut({ callbackUrl: "/login" })}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all duration-150 cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ================= RIGHT MAIN BODY WRAPPER ================= */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        {/* ================= ADMIN TOP BAR ================= */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-5 py-2.5 shadow-xs shrink-0 flex items-center justify-between gap-4">
          {/* Left: Mobile Menu Toggle + Restaurant Brand Display */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            {/* Restaurant Brand Identity: Logo beside Restaurant Name */}
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg overflow-hidden shadow-sm bg-slate-900 border border-orange-500/30 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={restaurantLogo} alt="Restaurant Logo" className="h-full w-full object-cover" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-slate-900 text-base tracking-tight leading-none truncate max-w-[150px] sm:max-w-xs">
                    {restaurantName}
                  </span>
                  <span className="hidden sm:inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200/70 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Store
                  </span>
                </div>
                <p className="text-[9px] font-bold text-orange-600 tracking-wide mt-0.5">
                  ServeDesk · Powered by Alvora Tech Solution
                </p>
              </div>
            </div>
          </div>

          {/* Right: Live Menu Shortcut, Waiter Alerts Bell, User Profile Pill */}
          <div className="flex items-center gap-2.5">
            {/* Quick Preview Customer QR Menu Link */}
            <a
              href={`/${restaurantSlug}/table/1`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden lg:inline-flex items-center gap-1.5 bg-orange-50 hover:bg-orange-100 border border-orange-200/80 text-orange-700 text-xs font-bold px-2.5 py-1.5 rounded-lg transition-all shadow-xs cursor-pointer"
              title="Open customer digital menu view in new tab"
            >
              <ExternalLink className="h-3 w-3" />
              Live QR Menu
            </a>

            {/* Staff & Service Assistance Bell Notification */}
            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="bg-slate-50 hover:bg-slate-100 border border-slate-200 p-2.5 rounded-xl text-slate-700 hover:text-slate-900 transition-all shadow-xs relative cursor-pointer"
                title="Staff & Service Call Notifications"
              >
                <Bell className="h-4.5 w-4.5" />
                {totalAlertsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-orange-600 text-white text-[9px] font-black h-5 w-5 rounded-full flex items-center justify-center border-2 border-white animate-bounce shadow-sm">
                    {totalAlertsCount}
                  </span>
                )}
              </button>

              {/* Staff Calls Dropdown Menu */}
              {showDropdown && (
                <div className="absolute right-0 mt-2.5 w-84 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 p-4 space-y-3 animate-in fade-in-50 slide-in-from-top-3 duration-150">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-1.5">
                      <Bell className="h-4 w-4 text-orange-600" />
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                        Staff & Service Calls
                      </h4>
                    </div>
                    {totalAlertsCount > 0 && (
                      <button
                        onClick={handleClearAll}
                        className="text-[10px] font-bold text-orange-600 hover:text-orange-700 hover:underline cursor-pointer"
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  <div className="max-h-72 overflow-y-auto space-y-2">
                    {combinedCalls.length === 0 ? (
                      <p className="text-xs text-slate-400 py-6 text-center">No active service calls.</p>
                    ) : (
                      combinedCalls.map((call) => (
                        <div
                          key={call.id}
                          className="flex justify-between items-start bg-slate-50 hover:bg-orange-50/50 border border-slate-200 p-2.5 rounded-xl text-xs gap-3 transition-colors"
                        >
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-black text-slate-900 text-xs">
                                {call.unitLabel || "Table / Room"} {call.tableNumber}
                              </span>
                              {call.customerName && call.customerName !== "Guest" && (
                                <span className="text-[10px] text-slate-500 font-semibold truncate max-w-[90px]">
                                  · {call.customerName}
                                </span>
                              )}
                            </div>
                            <p className="text-xs font-bold text-orange-600 truncate">
                              {call.reason || "Staff Assistance"}
                            </p>
                            <p className="text-[10px] text-slate-400 font-medium">
                              Time: {call.time}
                            </p>
                          </div>
                          <button
                            onClick={() => handleDismissCall(call.id)}
                            className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 p-1.5 rounded-lg border border-emerald-200 transition-colors cursor-pointer shrink-0"
                            title="Mark Attended / Resolved"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Pill */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="h-8 w-8 rounded-xl bg-orange-100 text-orange-700 font-black text-xs flex items-center justify-center border border-orange-200 shadow-xs">
                {(session?.user?.name || "A")[0].toUpperCase()}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold text-slate-900 leading-none truncate max-w-[110px]">
                  {session?.user?.name || "Admin"}
                </p>
                <span className="text-[10px] font-semibold text-slate-400">
                  Restaurant Admin
                </span>
              </div>
              <button
                onClick={() => nextSignOut({ callbackUrl: "/login" })}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Mobile Drawer Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-md pt-16 flex flex-col p-6">
            <div className="bg-[#0b0f19] rounded-2xl p-4 shadow-2xl border border-slate-800 space-y-2">
              <nav className="space-y-1">
                {filteredNavItems.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                        isActive
                          ? "bg-orange-500/15 text-orange-400 border-l-4 border-orange-500 font-bold"
                          : "text-slate-300 hover:text-white hover:bg-slate-800"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
              <div className="pt-4 border-t border-slate-800">
                <button
                  onClick={() => nextSignOut({ callbackUrl: "/login" })}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
                >
                  <LogOut className="h-5 w-5" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= MAIN CONTENT AREA ================= */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto">
          {isFeatureLocked ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 max-w-lg mx-auto py-12">
              <div className="relative mb-6 animate-pulse">
                <div className="absolute inset-0 bg-orange-500/20 blur-xl rounded-full scale-125" />
                <div className="relative bg-white border border-slate-200 p-6 rounded-3xl text-orange-600 shadow-xl">
                  <Lock className="h-12 w-12" />
                </div>
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">
                Feature is Locked
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed mb-6">
                Your subscription plan (<span className="text-orange-600 font-semibold">{planName}</span>) does not include access to <span className="text-slate-900 font-bold">{lockedFeatureName}</span>. Please upgrade your plan to unlock this module.
              </p>
              <div className="w-full bg-white border border-slate-200 backdrop-blur-md rounded-2xl p-5 mb-8 text-left space-y-3 shadow-xs">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-orange-600" /> Why upgrade?
                </h4>
                <ul className="text-xs text-slate-600 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-orange-600 font-bold">•</span>
                    <span>Access advanced automation & staff tools.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-600 font-bold">•</span>
                    <span>Scale your operations with higher limits.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-600 font-bold">•</span>
                    <span>Enable complete system synchronization.</span>
                  </li>
                </ul>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
                <Button
                  onClick={() => router.push("/admin/dashboard")}
                  className="bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold px-6 py-2.5 rounded-xl cursor-pointer shadow-xs"
                >
                  Go to Dashboard
                </Button>
                <Button
                  onClick={() => {
                    toast.success("Upgrade inquiry sent to Super Admin!");
                  }}
                  className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold px-6 py-2.5 rounded-xl shadow-md shadow-orange-500/20 cursor-pointer"
                >
                  Upgrade Plan
                </Button>
              </div>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
