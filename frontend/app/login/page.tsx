"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { Lock, Mail, Loader2, ArrowRight, Eye, EyeOff, ShieldCheck, Store, UtensilsCrossed, BellRing, ArrowLeft } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter your email and password");
      return;
    }

    setLoading(true);
    try {
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Signed in successfully!");

        // Fetch session to determine role-based redirect
        const res = await fetch("/api/auth/session");
        const session = await res.json();

        if (session?.user?.token) {
          try {
            localStorage.setItem("restro_auth_token", session.user.token);
          } catch {}
        }

        const role = session?.user?.role;
        if (role === "SUPER_ADMIN") {
          router.push("/super-admin/dashboard");
        } else if (role === "RESTAURANT_ADMIN") {
          router.push("/admin/dashboard");
        } else if (role === "BRANCH_MANAGER") {
          router.push("/branch/dashboard");
        } else if (role === "KITCHEN") {
          router.push("/kitchen");
        } else if (role === "STAFF" || role === "CASHIER") {
          router.push("/staff");
        } else {
          router.push("/");
        }
      }
    } catch {
      toast.error("An unexpected error occurred during login");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (demoEmail: string, demoPass: string, roleName: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    toast.success(`Loaded ${roleName} credentials!`);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#070a14] px-4 py-10 sm:px-6 relative overflow-hidden font-sans selection:bg-orange-500 selection:text-white">
      {/* Background ambient radial glow meshes */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-orange-500/12 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[550px] h-[550px] bg-purple-600/10 rounded-full blur-[160px] pointer-events-none" />

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      <div className="w-full max-w-md space-y-6 z-10">
        {/* Brand identity header */}
        <div className="text-center space-y-2">
          {/* Logo with ambient back-glow */}
          <div className="relative mx-auto h-16 w-16 group">
            <div className="absolute inset-0 bg-gradient-to-tr from-orange-500 to-amber-500 rounded-2xl blur-lg opacity-40 group-hover:opacity-70 transition-opacity" />
            <div className="relative h-16 w-16 rounded-2xl overflow-hidden bg-slate-900 border border-orange-500/30 shadow-2xl flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="ServeDesk" className="h-full w-full object-cover" />
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white pt-1">
            Welcome to ServeDesk
          </h1>
          <p className="text-[10px] font-extrabold text-orange-400 uppercase tracking-widest">
            Powered by Alvora Tech Solution
          </p>
          <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
            Please sign in with your credentials to access your restaurant control panel.
          </p>
        </div>

        {/* Login form card */}
        <div className="bg-[#0f1422]/90 border border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/60 backdrop-blur-2xl space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Address Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 block">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  type="email"
                  placeholder="name@restaurant.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full bg-[#161c2d] border border-slate-700/80 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-white placeholder:text-slate-500 text-sm rounded-xl pl-10 pr-4 py-2.5 sm:py-3 transition-all duration-200 outline-none disabled:opacity-50"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300 block">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-semibold text-orange-400 hover:text-orange-300 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full bg-[#161c2d] border border-slate-700/80 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-white placeholder:text-slate-500 text-sm rounded-xl pl-10 pr-10 py-2.5 sm:py-3 transition-all duration-200 outline-none disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                  tabIndex={-1}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Sign In CTA Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:via-amber-600 hover:to-orange-700 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Accounts Auto-fill Box */}
          <div className="pt-4 border-t border-slate-800/80 space-y-2.5">
            <p className="text-[10px] font-black text-orange-400 uppercase tracking-wider text-center flex items-center justify-center gap-1.5">
              <span>⚡</span> Quick Demo Login (Click to Auto-fill)
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {/* Super Admin Pill */}
              <button
                type="button"
                onClick={() => handleQuickFill("superadmin@servedesk.com", "SuperAdminPassword123!", "Super Admin")}
                className="bg-purple-950/30 hover:bg-purple-900/40 border border-purple-500/30 hover:border-purple-400/50 p-2.5 rounded-xl text-left transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div className="flex items-center gap-1 text-[11px] font-black text-purple-300 group-hover:text-purple-200">
                  <ShieldCheck className="h-3 w-3 text-purple-400" />
                  <span>Super Admin</span>
                </div>
                <div className="text-[10px] text-slate-400 truncate mt-0.5 font-mono">
                  superadmin@servedesk.com
                </div>
              </button>

              {/* Restaurant Admin Pill */}
              <button
                type="button"
                onClick={() => handleQuickFill("admin@tastybites.com", "AdminPassword123!", "Restaurant Admin")}
                className="bg-orange-950/30 hover:bg-orange-900/40 border border-orange-500/30 hover:border-orange-400/50 p-2.5 rounded-xl text-left transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div className="flex items-center gap-1 text-[11px] font-black text-orange-300 group-hover:text-orange-200">
                  <Store className="h-3 w-3 text-orange-400" />
                  <span>Restaurant Admin</span>
                </div>
                <div className="text-[10px] text-slate-400 truncate mt-0.5 font-mono">
                  admin@tastybites.com
                </div>
              </button>

              {/* Kitchen Chef Pill */}
              <button
                type="button"
                onClick={() => handleQuickFill("chef@tastybites.com", "ChefPassword123!", "Kitchen Chef")}
                className="bg-rose-950/30 hover:bg-rose-900/40 border border-rose-500/30 hover:border-rose-400/50 p-2.5 rounded-xl text-left transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div className="flex items-center gap-1 text-[11px] font-black text-rose-300 group-hover:text-rose-200">
                  <UtensilsCrossed className="h-3 w-3 text-rose-400" />
                  <span>Kitchen KDS</span>
                </div>
                <div className="text-[10px] text-slate-400 truncate mt-0.5 font-mono">
                  chef@tastybites.com
                </div>
              </button>

              {/* Floor Staff Pill */}
              <button
                type="button"
                onClick={() => handleQuickFill("waiter@tastybites.com", "WaiterPassword123!", "Floor Waiter")}
                className="bg-blue-950/30 hover:bg-blue-900/40 border border-blue-500/30 hover:border-blue-400/50 p-2.5 rounded-xl text-left transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div className="flex items-center gap-1 text-[11px] font-black text-blue-300 group-hover:text-blue-200">
                  <BellRing className="h-3 w-3 text-blue-400" />
                  <span>Floor Staff</span>
                </div>
                <div className="text-[10px] text-slate-400 truncate mt-0.5 font-mono">
                  waiter@tastybites.com
                </div>
              </button>
            </div>
          </div>

          {/* Registration link */}
          <div className="pt-3 border-t border-slate-800/80 text-center">
            <p className="text-xs text-slate-400">
              Want to onboard your restaurant?{" "}
              <Link
                href="/register"
                className="font-bold text-orange-400 hover:text-orange-300 transition-colors"
              >
                Request Partner Access ↗
              </Link>
            </p>
          </div>
        </div>

        {/* Back to Home Link */}
        <div className="text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to ServeDesk Home
          </Link>
        </div>
      </div>
    </div>
  );
}
