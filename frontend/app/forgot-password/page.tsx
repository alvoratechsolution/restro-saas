"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import Input from "@/components/ui/input";
import Button from "@/components/ui/button";
import { Mail, ArrowRight, Loader2, ArrowLeft } from "lucide-react";
import { BACKEND_URL } from "@/lib/config";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast.error("Please enter your email");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to process request");
      }

      toast.success(data.message || "OTP code sent to email!");
      router.push(`/reset-password?email=${encodeURIComponent(email)}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to request password reset");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#060813] px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Background glow meshes */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-orange-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[160px] pointer-events-none" />
      
      {/* Grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293710_1px,transparent_1px),linear-gradient(to_bottom,#1f293710_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_75%,transparent_100%)] pointer-events-none" />

      <div className="w-full max-w-md space-y-8 z-10">
        <div className="text-center space-y-4">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-slate-200 transition-colors bg-white/5 border border-white/5 hover:border-white/10 px-4 py-2 rounded-xl"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Sign In
          </Link>
          <h2 className="text-3xl font-black tracking-tight text-white leading-tight">
            Forgot Password
          </h2>
          <p className="text-xs text-slate-400 leading-normal max-w-xs mx-auto">
            Enter your registered email below and we will send a 6-digit verification code to reset your password.
          </p>
        </div>

        {/* Forgot password card */}
        <div className="bg-[#0f1422]/90 border border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/60 backdrop-blur-2xl space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Email field */}
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
                  className="w-full bg-[#161c2d] border border-slate-700/80 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-white placeholder:text-slate-500 text-sm rounded-xl pl-10 pr-4 py-2.5 sm:py-3 transition-all duration-200 outline-none disabled:opacity-50"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:via-amber-600 hover:to-orange-700 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Sending OTP...</span>
                </>
              ) : (
                <>
                  <span>Send OTP Code</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
