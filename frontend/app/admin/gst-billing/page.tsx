"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiFetch from "@/lib/api";
import {
  Receipt,
  Sparkles,
  Save,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Building2,
  Percent,
  FileText,
  AlertTriangle,
} from "lucide-react";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import toast from "react-hot-toast";

interface SettingsData {
  currency: string;
  enableGst: boolean;
  gstNumber?: string;
  cgstRate: number;
  sgstRate: number;
  serviceChargeRate: number;
  deliveryChargeRate: number;
  enableSoundAlerts: boolean;
  tableCallOption: boolean;
  thermalPrinterWidth: string;
}

export default function GstBillingPage() {
  const queryClient = useQueryClient();

  // Form states
  const [enableGst, setEnableGst] = useState(true);
  const [gstNumber, setGstNumber] = useState("");
  const [cgstRate, setCgstRate] = useState(2.5);
  const [sgstRate, setSgstRate] = useState(2.5);
  const [serviceChargeRate, setServiceChargeRate] = useState(0);

  // Fetch settings
  const { data: response, isLoading } = useQuery<{ success: boolean; data: SettingsData }>({
    queryKey: ["admin", "settings"],
    queryFn: () => apiFetch("/api/admin/settings"),
  });

  // Populate form once data is loaded
  useEffect(() => {
    if (response?.data) {
      const s = response.data;
      setEnableGst(s.enableGst ?? true);
      setGstNumber(s.gstNumber || "");
      setCgstRate(s.cgstRate ?? 2.5);
      setSgstRate(s.sgstRate ?? 2.5);
      setServiceChargeRate(s.serviceChargeRate ?? 0);
    }
  }, [response]);

  // Mutation
  const updateMutation = useMutation({
    mutationFn: (payload: Partial<SettingsData>) =>
      apiFetch("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      toast.success("GST Billing settings successfully updated!");
      queryClient.invalidateQueries({ queryKey: ["admin", "settings"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save GST settings");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      enableGst,
      gstNumber: enableGst ? gstNumber : "",
      cgstRate: enableGst ? Number(cgstRate || 0) : 0,
      sgstRate: enableGst ? Number(sgstRate || 0) : 0,
      serviceChargeRate: Number(serviceChargeRate || 0),
    });
  };

  const totalGstPercentage = (Number(cgstRate || 0) + Number(sgstRate || 0)).toFixed(2);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Receipt className="h-6 w-6 text-orange-500" />
            <span>GST Billing & Tax Management</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Apne cafe ya restaurant ke hisab se GST activate karein, rates set karein ya disable karein.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border ${
              enableGst
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-slate-100 text-slate-600 border-slate-200"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${enableGst ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`}
            />
            {enableGst ? "GST Active" : "GST Disabled"}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Main Configuration Card */}
        <Card className="p-6 bg-white border border-slate-200/90 rounded-2xl shadow-sm space-y-6">
          {/* Toggle Switch */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-slate-200/80 bg-slate-50/80">
            <div className="space-y-0.5">
              <label htmlFor="gstToggle" className="text-sm font-black text-slate-900 cursor-pointer">
                Enable GST on Customer Bills
              </label>
              <p className="text-xs text-slate-500">
                Agar cafe par GST apply nahi karni hai, toh is switch ko band (disable) kar sakte hain.
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input
                id="gstToggle"
                type="checkbox"
                checked={enableGst}
                onChange={(e) => setEnableGst(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:width-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
            </label>
          </div>

          {enableGst ? (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="GSTIN / Tax ID (Optional)"
                  type="text"
                  placeholder="e.g. 07AAAAA0000A1Z5"
                  value={gstNumber}
                  onChange={(e) => setGstNumber(e.target.value)}
                />
                <Input
                  label="CGST Rate (%) *"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="2.5"
                  value={cgstRate}
                  onChange={(e) => setCgstRate(Number(e.target.value))}
                  required={enableGst}
                />
                <Input
                  label="SGST Rate (%) *"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="2.5"
                  value={sgstRate}
                  onChange={(e) => setSgstRate(Number(e.target.value))}
                  required={enableGst}
                />
              </div>

              {/* Live Preview Box */}
              <div className="p-4 bg-orange-50/70 border border-orange-200/90 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-orange-950">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-orange-700 uppercase tracking-wide">
                    Live Calculation Preview
                  </div>
                  <div className="text-sm font-black">
                    Total Tax Applied: {totalGstPercentage}% (CGST {cgstRate}% + SGST {sgstRate}%)
                  </div>
                  <p className="text-[11px] text-orange-800">
                    Example: ₹500 ke order par ₹{(500 * (Number(totalGstPercentage) / 100)).toFixed(2)} GST judega (Final Bill: ₹{(500 + 500 * (Number(totalGstPercentage) / 100)).toFixed(2)}).
                  </p>
                </div>
                <div className="px-3.5 py-2 bg-white/90 border border-orange-200 rounded-xl text-center shrink-0">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Effective GST</div>
                  <div className="text-lg font-black text-orange-600">{totalGstPercentage}%</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3 text-slate-600 text-xs">
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-slate-900">GST is currently disabled</p>
                <p className="text-slate-500 mt-0.5">
                  Customer ke table menu, cart aur receipt print par koi GST ya tax nahi judega. Customer ko direct dishes ka base price hi pay karna hoga.
                </p>
              </div>
            </div>
          )}

          {/* Optional Extra Charges */}
          <div className="pt-4 border-t border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-1.5">
              <span>Additional Cafe Charges (Optional)</span>
            </h3>
            <div className="max-w-xs">
              <Input
                label="Service Charge (%)"
                type="number"
                step="0.01"
                min="0"
                placeholder="0"
                value={serviceChargeRate}
                onChange={(e) => setServiceChargeRate(Number(e.target.value))}
              />
            </div>
          </div>
        </Card>

        {/* Submit Save Button */}
        <div className="flex items-center justify-end gap-3">
          <Button
            type="submit"
            disabled={updateMutation.isPending}
            className="bg-orange-500 hover:bg-orange-600 text-white font-bold h-11 px-6 rounded-xl flex items-center gap-2 shadow-md shadow-orange-500/20 cursor-pointer"
          >
            <Save className="h-4 w-4" />
            <span>{updateMutation.isPending ? "Saving..." : "Save GST Settings"}</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
