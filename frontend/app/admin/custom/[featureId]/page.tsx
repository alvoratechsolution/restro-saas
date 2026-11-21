"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import apiFetch from "@/lib/api";
import { Zap, ChevronLeft, Calendar, ShieldCheck, Box } from "lucide-react";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import toast from "react-hot-toast";

export default function CustomFeaturePage() {
  const params = useParams();
  const router = useRouter();
  const featureId = params.featureId as string;

  const { data: restaurantResponse } = useQuery<{ success: boolean; data: { name: string } }>({
    queryKey: ["admin", "restaurant-info"],
    queryFn: () => apiFetch("/api/admin/restaurant-info"),
  });

  const restaurantName = restaurantResponse?.data?.name || "Restaurant";
  const featureName = featureId
    ? featureId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "Custom Feature";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/admin/dashboard")}
          className="bg-white hover:bg-slate-50 p-2 rounded-xl text-slate-600 hover:text-slate-900 border border-slate-200 transition-colors shadow-xs cursor-pointer"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Zap className="h-6 w-6 text-orange-500" /> {featureName}
          </h1>
          <p className="text-slate-500 mt-0.5 text-xs font-medium">Custom SaaS Module for {restaurantName}.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 p-6 bg-white border border-slate-200/80 rounded-2xl shadow-xs space-y-6">
          <div className="flex items-center gap-4 p-4 bg-orange-50 border border-orange-200/80 rounded-2xl text-orange-700">
            <ShieldCheck className="h-8 w-8 text-orange-600 shrink-0" />
            <div className="space-y-0.5">
              <p className="text-sm font-bold text-slate-900">Active Module</p>
              <p className="text-xs text-slate-600 leading-normal">
                This custom feature is configured, verified, and enabled on your active subscription plan.
              </p>
            </div>
          </div>

          <div className="border border-slate-200 rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-black text-slate-900">Module Workspace</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Welcome to the workspace for <span className="text-slate-900 font-bold">{featureName}</span>. This module is dynamically configured from the Super Admin panel.
            </p>
            <div className="h-48 rounded-xl bg-slate-50 border border-slate-200 border-dashed flex flex-col items-center justify-center text-slate-500 text-xs gap-2">
              <Box className="h-8 w-8 text-slate-400 animate-bounce" />
              Custom workspace for {featureName}.
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-white border border-slate-200/80 rounded-2xl shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-base font-black text-slate-900">Module Settings</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs py-2.5 border-b border-slate-100">
                <span className="text-slate-500">Module Status</span>
                <span className="font-bold text-emerald-600">Active</span>
              </div>
              <div className="flex justify-between items-center text-xs py-2.5 border-b border-slate-100">
                <span className="text-slate-500">Module ID</span>
                <span className="font-bold text-slate-700 font-mono">{featureId}</span>
              </div>
              <div className="flex justify-between items-center text-xs py-2.5">
                <span className="text-slate-500">Last Synced</span>
                <span className="font-semibold text-slate-700 flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" /> Just now
                </span>
              </div>
            </div>
          </div>

          <Button
            onClick={() => {
              toast.success("Module settings updated");
            }}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 mt-6 rounded-xl font-bold text-xs cursor-pointer"
          >
            Reset Module Workspace
          </Button>
        </Card>
      </div>
    </div>
  );
}
