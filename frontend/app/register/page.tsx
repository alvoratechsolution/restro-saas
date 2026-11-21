"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import Input from "@/components/ui/input";
import Button from "@/components/ui/button";
import Textarea from "@/components/ui/textarea";
import { ArrowRight, Loader2, Store, User, Mail, Phone, MessageSquare, CheckCircle } from "lucide-react";
import { BACKEND_URL } from "@/lib/config";

export default function RegisterPage() {
  const router = useRouter();
  const [restaurantName, setRestaurantName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!restaurantName || !ownerName || !email || !phone) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (phone.length !== 10) {
      toast.error("Phone number must be exactly 10 digits");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/api/customer/leads`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          restaurantName,
          ownerName,
          email,
          phone,
          message,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit inquiry");
      }

      toast.success("Inquiry submitted successfully!");
      setSubmitted(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit inquiry");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#060813] px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
        {/* Background glow meshes */}
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-orange-500/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[160px] pointer-events-none" />

        <div className="w-full max-w-lg space-y-8 z-10 text-center">
          <div className="bg-gradient-to-b from-slate-900/30 to-slate-950/40 border border-slate-800/60 backdrop-blur-2xl rounded-[32px] p-10 shadow-2xl space-y-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-tr from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/20">
              <CheckCircle className="h-10 w-10" />
            </div>

            <div className="space-y-2">
              <h2 className="text-3xl font-black tracking-tight text-white leading-tight">
                Request Submitted!
              </h2>
              <p className="text-xs text-slate-400">
                Thank you for your interest in ServeDesk.
              </p>
            </div>

            <div className="p-5 bg-slate-950/60 rounded-2xl border border-slate-800/50 text-left text-xs leading-relaxed text-slate-450 space-y-2.5">
              <p className="font-bold text-slate-300">
                What happens next?
              </p>
              <ul className="list-disc list-inside space-y-1.5">
                <li>Our sales team will review your inquiry details.</li>
                <li>We will contact you at <span className="text-white font-semibold">{email}</span> within 24 hours.</li>
                <li>A customized demo setup will be prepared for <span className="text-white font-semibold">{restaurantName}</span>.</li>
              </ul>
            </div>

            <div className="pt-4 flex flex-col gap-3">
              <Button
                onClick={() => router.push("/")}
                className="w-full bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-655 hover:to-amber-705 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-orange-500/10 cursor-pointer"
              >
                Return to Homepage
              </Button>
              <Link
                href="/login"
                className="text-xs text-slate-500 hover:text-slate-350 transition-colors font-semibold"
              >
                Or, Sign In to an existing console account
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#060813] px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Background glow meshes */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-orange-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[160px] pointer-events-none" />
      
      {/* Grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293710_1px,transparent_1px),linear-gradient(to_bottom,#1f293710_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_75%,transparent_100%)] pointer-events-none" />

      <div className="w-full max-w-lg space-y-8 z-10">
        <div className="text-center space-y-2">
          {/* Logo icon */}
          <div className="mx-auto h-16 w-16 rounded-2xl overflow-hidden shadow-xl shadow-orange-500/25 bg-slate-900 border border-orange-500/30 select-none hover:scale-105 transition-transform">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="ServeDesk" className="h-full w-full object-cover" />
          </div>
          <h2 className="text-3xl font-black tracking-tight text-white leading-tight">
            Register for ServeDesk
          </h2>
          <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">
            Powered by Alvora Tech Solution
          </p>
          <p className="text-xs text-slate-400 leading-normal max-w-xs mx-auto">
            Submit your restaurant details. Our team will verify and activate your dining platform.
          </p>
        </div>

        {/* Form card container */}
        <div className="bg-[#0f1422]/90 border border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/60 backdrop-blur-2xl space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Restaurant name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 block">
                Restaurant Name *
              </label>
              <div className="relative">
                <Store className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="The Gourmet Cafe"
                  value={restaurantName}
                  onChange={(e) => setRestaurantName(e.target.value)}
                  className="w-full bg-[#161c2d] border border-slate-700/80 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-white placeholder:text-slate-500 text-sm rounded-xl pl-10 pr-4 py-2.5 sm:py-3 transition-all duration-200 outline-none disabled:opacity-50"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Owner name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 block">
                Owner Name *
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="John Doe"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full bg-[#161c2d] border border-slate-700/80 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-white placeholder:text-slate-500 text-sm rounded-xl pl-10 pr-4 py-2.5 sm:py-3 transition-all duration-200 outline-none disabled:opacity-50"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Email and phone inline */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    type="email"
                    placeholder="admin@cafe.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#161c2d] border border-slate-700/80 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-white placeholder:text-slate-500 text-sm rounded-xl pl-10 pr-4 py-2.5 sm:py-3 transition-all duration-200 outline-none disabled:opacity-50"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block">
                  Phone Number *
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    type="tel"
                    placeholder="9999988888"
                    value={phone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      if (val.length <= 10) {
                        setPhone(val);
                      }
                    }}
                    className="w-full bg-[#161c2d] border border-slate-700/80 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-white placeholder:text-slate-500 text-sm rounded-xl pl-10 pr-4 py-2.5 sm:py-3 transition-all duration-200 outline-none disabled:opacity-50"
                    required
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* Message request */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 block">
                Requirements / Message (Optional)
              </label>
              <div className="relative">
                <MessageSquare className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                <textarea
                  placeholder="Tell us about your restaurant branches, tables, or custom request..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full bg-[#161c2d] border border-slate-700/80 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-white placeholder:text-slate-500 text-sm rounded-xl pl-10 pr-4 py-2.5 sm:py-3 transition-all duration-200 outline-none disabled:opacity-50"
                  disabled={loading}
                  rows={3}
                />
              </div>
            </div>

            <div className="text-[10px] text-slate-400 font-medium">
              * Required fields. By submitting, you agree to our Terms of Service.
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
                  <span>Submitting request...</span>
                </>
              ) : (
                <>
                  <span>Submit Inquiry</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Sign in page link */}
          <div className="pt-4 border-t border-slate-800/80 text-center">
            <p className="text-xs text-slate-400">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-bold text-orange-400 hover:text-orange-300 transition-colors"
              >
                Sign In ↗
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
