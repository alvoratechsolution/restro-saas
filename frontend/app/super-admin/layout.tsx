"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { LayoutDashboard, Store, CreditCard, LogOut, Menu, X, ShieldAlert, ShieldCheck, User, Mail } from "lucide-react";
import Button from "@/components/ui/button";

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-400">
        Loading Session...
      </div>
    );
  }

  // Ensure user is super admin (already verified by middleware, but check as double layer)
  if (!session || (session.user as any)?.role !== "SUPER_ADMIN") {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-950 px-4 text-center">
        <ShieldAlert className="h-16 w-16 text-red-500 mb-4 animate-bounce" />
        <h1 className="text-2xl font-bold text-white mb-2">Unauthorized Access</h1>
        <p className="text-slate-400 mb-6">You must be logged in as a Super Admin to access this panel.</p>
        <Button onClick={() => router.push("/login")} className="bg-orange-500 hover:bg-orange-600">
          Go to Login
        </Button>
      </div>
    );
  }

  const navItems = [
    {
      name: "Dashboard",
      href: "/super-admin/dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "Restaurants (Tenants)",
      href: "/super-admin/restaurants",
      icon: Store,
    },
    {
      name: "Subscription Plans",
      href: "/super-admin/plans",
      icon: CreditCard,
    },
    {
      name: "Access Matrix",
      href: "/super-admin/access-matrix",
      icon: ShieldCheck,
    },
    {
      name: "Leads & Inquiries",
      href: "/super-admin/leads",
      icon: Mail,
    },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col md:flex-row font-sans">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-56 border-r border-slate-800/80 bg-[#0b0f19] p-4 shrink-0 shadow-2xl z-20">
        <div className="flex items-center gap-2.5 mb-6 px-1">
          <div className="h-8 w-8 rounded-lg overflow-hidden shadow-md shadow-orange-500/25 bg-slate-900 border border-orange-500/30 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="ServeDesk" className="h-full w-full object-cover" />
          </div>
          <div className="overflow-hidden">
            <h1 className="font-bold text-white text-sm tracking-tight truncate">Super Panel</h1>
            <p className="text-[8px] text-orange-400 font-bold uppercase tracking-wider truncate">ServeDesk · Alvora Tech</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto pr-0.5">
          {navItems.map((item) => {
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
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all duration-150 cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Right Wrapper */}
      <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        {/* Sticky Light Top Bar */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-5 py-2.5 shadow-xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg overflow-hidden shadow-sm bg-slate-900 border border-orange-500/30 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="ServeDesk" className="h-full w-full object-cover" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-slate-900 text-base tracking-tight leading-none">
                    Super Admin Console
                  </span>
                  <span className="hidden sm:inline-flex items-center gap-1 bg-orange-50 text-orange-700 border border-orange-200/70 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                    <span className="h-1.5 w-1.5 rounded-full bg-orange-500" /> Platform Master
                  </span>
                </div>
                <p className="text-[9px] font-bold text-orange-600 tracking-wide mt-0.5">
                  ServeDesk · Powered by Alvora Tech Solution
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-2.5 py-1 rounded-lg text-xs font-bold shadow-xs">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>Nodes Online</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-xl">
              <div className="h-6 w-6 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 text-xs font-bold">
                <User className="h-3 w-3" />
              </div>
              <span className="text-xs font-bold text-slate-700 hidden md:inline">
                {session.user?.name || "Super Admin"}
              </span>
            </div>
          </div>
        </header>

        {/* Mobile Drawer menu */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-lg pt-16 flex flex-col p-6">
            <nav className="space-y-2 flex-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                      isActive
                        ? "bg-orange-500/10 text-orange-500 border-l-2 border-orange-500"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
            <div className="pt-6 border-t border-slate-800">
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all cursor-pointer"
              >
                <LogOut className="h-5 w-5" />
                Sign Out
              </button>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
