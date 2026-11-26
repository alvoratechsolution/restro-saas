"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiFetch from "@/lib/api";
import { Settings, Save, Loader2, DollarSign, BellRing, Printer, Sparkles } from "lucide-react";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
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

export default function SettingsPage() {
  const queryClient = useQueryClient();

  // Form states
  const [currency, setCurrency] = useState("INR");
  const [enableGst, setEnableGst] = useState(true);
  const [gstNumber, setGstNumber] = useState("");
  const [cgstRate, setCgstRate] = useState(2.5);
  const [sgstRate, setSgstRate] = useState(2.5);
  const [serviceChargeRate, setServiceChargeRate] = useState(0);
  const [deliveryChargeRate, setDeliveryChargeRate] = useState(0);
  const [enableSoundAlerts, setEnableSoundAlerts] = useState(true);
  const [tableCallOption, setTableCallOption] = useState(true);
  const [thermalPrinterWidth, setThermalPrinterWidth] = useState("80mm");

  // Fetch settings
  const { data: response, isLoading } = useQuery<{ success: boolean; data: SettingsData }>({
    queryKey: ["admin", "settings"],
    queryFn: () => apiFetch("/api/admin/settings"),
  });

  // Populate form once data is loaded
  useEffect(() => {
    if (response?.data) {
      const s = response.data;
      setCurrency(s.currency || "INR");
      setEnableGst(s.enableGst ?? true);
      setGstNumber(s.gstNumber || "");
      setCgstRate(s.cgstRate ?? 2.5);
      setSgstRate(s.sgstRate ?? 2.5);
      setServiceChargeRate(s.serviceChargeRate ?? 0);
      setDeliveryChargeRate(s.deliveryChargeRate ?? 0);
      setEnableSoundAlerts(s.enableSoundAlerts ?? true);
      setTableCallOption(s.tableCallOption ?? true);
      setThermalPrinterWidth(s.thermalPrinterWidth || "80mm");
    }
  }, [response]);

  // Mutation
  const updateMutation = useMutation({
    mutationFn: (payload: SettingsData) =>
      apiFetch("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      toast.success("Settings updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["admin", "settings"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save settings");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      currency,
      enableGst,
      gstNumber,
      cgstRate: enableGst ? cgstRate : 0,
      sgstRate: enableGst ? sgstRate : 0,
      serviceChargeRate,
      deliveryChargeRate,
      enableSoundAlerts,
      tableCallOption,
      thermalPrinterWidth,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Branch Settings</h1>
        <p className="text-slate-500 mt-0.5 text-xs font-medium">Configure localized tax percentages, receipts billing structure, and terminal helpers.</p>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-10 w-10 text-orange-500 animate-spin" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="max-w-3xl space-y-5">
          {/* Card 1: Localisation & Currency */}
          <Card className="p-6 bg-white border border-slate-200/80 rounded-2xl shadow-xs space-y-4">
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <DollarSign className="h-4.5 w-4.5 text-orange-500" />
              Currency & Localisation
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Currency Token *"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                options={[
                  { value: "INR", label: "Indian Rupee (₹)" },
                  { value: "USD", label: "US Dollar ($)" },
                  { value: "EUR", label: "Euro (€)" },
                  { value: "GBP", label: "British Pound (£)" },
                ]}
                required
              />
            </div>
          </Card>

          {/* Card 2: Taxes & Service Charges */}
          <Card className="p-6 bg-white border border-slate-200/80 rounded-2xl shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Sparkles className="h-4.5 w-4.5 text-orange-500" />
                  GST Billing & Charges
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Apne cafe/restaurant ke hisab se GST enable/disable karein ya rates customize karein.
                </p>
              </div>

              {/* GST Toggle Switch */}
              <label className="flex items-center gap-2.5 cursor-pointer">
                <span className="text-xs font-bold text-slate-700">
                  {enableGst ? "GST Enabled" : "GST Disabled"}
                </span>
                <input
                  type="checkbox"
                  checked={enableGst}
                  onChange={(e) => setEnableGst(e.target.checked)}
                  className="rounded border-slate-300 text-orange-500 focus:ring-orange-500/20 h-4.5 w-4.5 cursor-pointer"
                />
              </label>
            </div>

            {enableGst ? (
              <div className="space-y-4 pt-1">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    label="GSTIN / Tax Number (Optional)"
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
                    placeholder="e.g. 2.5"
                    value={cgstRate}
                    onChange={(e) => setCgstRate(Number(e.target.value))}
                    required={enableGst}
                  />
                  <Input
                    label="SGST Rate (%) *"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g. 2.5"
                    value={sgstRate}
                    onChange={(e) => setSgstRate(Number(e.target.value))}
                    required={enableGst}
                  />
                </div>
                <div className="bg-orange-50/70 border border-orange-200/80 rounded-xl p-3 text-xs text-orange-800 flex items-center justify-between">
                  <span>Effective Total GST on Orders: <strong>{(Number(cgstRate || 0) + Number(sgstRate || 0)).toFixed(2)}%</strong></span>
                  <span className="text-[11px] text-orange-600 font-semibold">Bills par automatically calculate hoga</span>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 text-xs text-slate-600">
                <p className="font-bold text-slate-800">GST Billing is currently Disabled</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Customer ke bill aur receipts me koi extra GST/tax add nahi hoga (Flat bill rahega).
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <Input
                label="Service Charge (%)"
                type="number"
                step="0.01"
                min="0"
                value={serviceChargeRate}
                onChange={(e) => setServiceChargeRate(Number(e.target.value))}
              />
              <Input
                label="Delivery Charge (₹)"
                type="number"
                step="0.1"
                min="0"
                value={deliveryChargeRate}
                onChange={(e) => setDeliveryChargeRate(Number(e.target.value))}
              />
            </div>
          </Card>

          {/* Card 3: Operation Features */}
          <Card className="p-6 bg-white border border-slate-200/80 rounded-2xl shadow-xs space-y-4">
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <BellRing className="h-4.5 w-4.5 text-orange-500" />
              Terminal Operational Flags
            </h2>
            <div className="space-y-3.5">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="soundCheck"
                  checked={enableSoundAlerts}
                  onChange={(e) => setEnableSoundAlerts(e.target.checked)}
                  className="rounded border-slate-300 text-orange-500 focus:ring-orange-500/20 h-4 w-4 cursor-pointer"
                />
                <div>
                  <label htmlFor="soundCheck" className="text-sm font-bold text-slate-800 cursor-pointer">
                    Enable Sound Alerts
                  </label>
                  <p className="text-[11px] text-slate-500">Waiter call and new order alerts play sound triggers on staff screens.</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="helperCheck"
                  checked={tableCallOption}
                  onChange={(e) => setTableCallOption(e.target.checked)}
                  className="rounded border-slate-300 text-orange-500 focus:ring-orange-500/20 h-4 w-4 cursor-pointer"
                />
                <div>
                  <label htmlFor="helperCheck" className="text-sm font-bold text-slate-800 cursor-pointer">
                    Allow &apos;Call Waiter&apos; assistance
                  </label>
                  <p className="text-[11px] text-slate-500">Customers can trigger waiters request flags directly from their QR scanned menus.</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Card 4: Printer settings */}
          <Card className="p-6 bg-white border border-slate-200/80 rounded-2xl shadow-xs space-y-4">
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Printer className="h-4.5 w-4.5 text-orange-500" />
              Thermal Bill Print Layout
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Thermal Printer Paper Size *"
                value={thermalPrinterWidth}
                onChange={(e) => setThermalPrinterWidth(e.target.value)}
                options={[
                  { value: "80mm", label: "80mm Width (Standard POS)" },
                  { value: "58mm", label: "58mm Width (Handheld POS)" },
                ]}
                required
              />
            </div>
          </Card>

          {/* Submit Action */}
          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={updateMutation.isPending}
              className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs py-2.5 px-6 rounded-xl shadow-sm flex items-center gap-2 cursor-pointer"
            >
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Branch Settings
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
