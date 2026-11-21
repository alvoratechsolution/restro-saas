"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiFetch from "@/lib/api";
import { CreditCard, Plus, Loader2, Edit2, CheckCircle2, XCircle, X } from "lucide-react";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
import toast from "react-hot-toast";

interface SubscriptionPlan {
  _id: string;
  name: string;
  price: number;
  billingCycle: string;
  maxBranches: number;
  maxTablesPerBranch: number;
  maxMenuItems: number;
  features: string[];
  isActive: boolean;
}

const AVAILABLE_FEATURES = [
  { id: "orders", label: "Live Orders Management", description: "Real-time kitchen order tickets (KDS) & tracking" },
  { id: "menu", label: "Menu & Categories Builder", description: "Manage categories, dishes, variants, & addons" },
  { id: "qr-tables", label: "Tables & QR Generator", description: "Create physical tables and scanable QR code templates" },
  { id: "coupons", label: "Coupons & Discounts", description: "Run discount marketing promotions" },
  { id: "staff", label: "Staff & Role Credentials", description: "Add kitchen and service waiter credentials" },
];

export default function PlansPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [price, setPrice] = useState(0);
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [maxBranches, setMaxBranches] = useState(1);
  const [maxTablesPerBranch, setMaxTablesPerBranch] = useState(10);
  const [maxMenuItems, setMaxMenuItems] = useState(50);
  const [features, setFeatures] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);

  // Fetch plans
  const { data: plansData, isLoading } = useQuery<{ success: boolean; data: SubscriptionPlan[] }>({
    queryKey: ["super-admin", "plans"],
    queryFn: () => apiFetch("/api/super-admin/plans"),
  });

  const plans = plansData?.data || [];

  // Create plan mutation
  const createPlanMutation = useMutation({
    mutationFn: (newPlan: any) =>
      apiFetch("/api/super-admin/plans", {
        method: "POST",
        body: JSON.stringify(newPlan),
      }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Subscription plan created");
        queryClient.invalidateQueries({ queryKey: ["super-admin", "plans"] });
        resetForm();
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create plan");
    },
  });

  // Edit plan mutation
  const updatePlanMutation = useMutation({
    mutationFn: (updatedPlan: any) =>
      apiFetch("/api/super-admin/plans", {
        method: "PATCH",
        body: JSON.stringify(updatedPlan),
      }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Subscription plan updated");
        queryClient.invalidateQueries({ queryKey: ["super-admin", "plans"] });
        resetForm();
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update plan");
    },
  });

  const resetForm = () => {
    setName("");
    setPrice(0);
    setBillingCycle("monthly");
    setMaxBranches(1);
    setMaxTablesPerBranch(10);
    setMaxMenuItems(50);
    setFeatures([]);
    setIsActive(true);
    setEditingPlan(null);
    setShowModal(false);
  };

  const handleEdit = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setName(plan.name);
    setPrice(plan.price);
    setBillingCycle(plan.billingCycle);
    setMaxBranches(plan.maxBranches);
    setMaxTablesPerBranch(plan.maxTablesPerBranch);
    setMaxMenuItems(plan.maxMenuItems);
    setFeatures(plan.features || []);
    setIsActive(plan.isActive);
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const planPayload = {
      name,
      price,
      billingCycle,
      maxBranches,
      maxTablesPerBranch,
      maxMenuItems,
      features,
      isActive,
    };

    if (editingPlan) {
      updatePlanMutation.mutate({ id: editingPlan._id, ...planPayload });
    } else {
      createPlanMutation.mutate(planPayload);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Subscription Plans</h1>
          <p className="text-slate-500 text-sm mt-1">Configure pricing tiers, tenant usage allowances, and feature locks.</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold flex items-center gap-2 shadow-lg shadow-orange-500/10 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Create Plan
        </Button>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-10 w-10 text-orange-500 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Card
              key={plan._id}
              className={`p-6 bg-white border rounded-2xl shadow-xs hover:shadow-md transition-all flex flex-col justify-between h-full relative ${
                plan.isActive ? "border-slate-200/80" : "border-red-200 opacity-70"
              }`}
            >
              {!plan.isActive && (
                <div className="absolute top-3 right-3 text-red-500 flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                  <XCircle className="h-3 w-3" /> Inactive
                </div>
              )}
              <div>
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                  <button
                    onClick={() => handleEdit(plan)}
                    className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex items-baseline mb-6 gap-1">
                  <span className="text-4xl font-black text-slate-900">₹{plan.price}</span>
                  <span className="text-slate-500 text-xs font-bold">/{plan.billingCycle}</span>
                </div>

                <ul className="space-y-3.5 mb-8 text-sm text-slate-600">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="font-medium">Max {plan.maxBranches} Branch(es)</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="font-medium">Up to {plan.maxTablesPerBranch} Tables/Branch</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="font-medium">Max {plan.maxMenuItems} Menu Items</span>
                  </li>
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-orange-500 shrink-0" />
                      <span className="capitalize font-medium">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Plan Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in-50 zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/80 shrink-0">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2.5">
                <div className="p-2 bg-orange-50 border border-orange-200 rounded-xl text-orange-600">
                  <CreditCard className="h-5 w-5" />
                </div>
                {editingPlan ? "Edit Subscription Plan" : "Create New Subscription Plan"}
              </h2>
              <button
                type="button"
                onClick={resetForm}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form id="planForm" onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              <Input
                label="Plan Name *"
                type="text"
                placeholder="Basic Plan"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl focus:bg-white focus:border-orange-500"
                labelClassName="text-slate-700 font-bold text-xs"
                required
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Price (₹) *"
                  type="number"
                  placeholder="29"
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl focus:bg-white focus:border-orange-500"
                  labelClassName="text-slate-700 font-bold text-xs"
                  required
                />
                <Select
                  label="Billing Cycle *"
                  value={billingCycle}
                  onChange={(e) => setBillingCycle(e.target.value)}
                  className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl focus:bg-white focus:border-orange-500"
                  labelClassName="text-slate-700 font-bold text-xs"
                  options={[
                    { value: "monthly", label: "Monthly" },
                    { value: "yearly", label: "Yearly" },
                  ]}
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Input
                  label="Max Branches"
                  type="number"
                  value={maxBranches}
                  onChange={(e) => setMaxBranches(Number(e.target.value))}
                  className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl focus:bg-white focus:border-orange-500"
                  labelClassName="text-slate-700 font-bold text-xs"
                  required
                />
                <Input
                  label="Tables / Branch"
                  type="number"
                  value={maxTablesPerBranch}
                  onChange={(e) => setMaxTablesPerBranch(Number(e.target.value))}
                  className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl focus:bg-white focus:border-orange-500"
                  labelClassName="text-slate-700 font-bold text-xs"
                  required
                />
                <Input
                  label="Max Menu Items"
                  type="number"
                  value={maxMenuItems}
                  onChange={(e) => setMaxMenuItems(Number(e.target.value))}
                  className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl focus:bg-white focus:border-orange-500"
                  labelClassName="text-slate-700 font-bold text-xs"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Select Plan Features *
                </label>
                <div className="grid grid-cols-1 gap-2.5 max-h-48 overflow-y-auto p-1">
                  {AVAILABLE_FEATURES.map((feat) => {
                    const isChecked = features.includes(feat.id);
                    return (
                      <div
                        key={feat.id}
                        onClick={() => {
                          if (isChecked) {
                            setFeatures(features.filter((id) => id !== feat.id));
                          } else {
                            setFeatures([...features, feat.id]);
                          }
                        }}
                        className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                          isChecked
                            ? "bg-orange-50/70 border-orange-200 text-slate-900"
                            : "bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-600"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          readOnly
                          className="mt-0.5 rounded bg-white border-slate-300 text-orange-500 focus:ring-orange-500/20 pointer-events-none"
                        />
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold">{feat.label}</p>
                          <p className="text-[10px] text-slate-500">{feat.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isActiveCheck"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded bg-white border-slate-300 text-orange-500 focus:ring-orange-500/20 cursor-pointer"
                />
                <label htmlFor="isActiveCheck" className="text-sm text-slate-700 font-medium cursor-pointer">
                  Plan is active and available for subscribe
                </label>
              </div>
            </form>

            {/* Fixed Modal Footer with Action Buttons */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={resetForm}
                className="bg-slate-200/80 hover:bg-slate-300 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="planForm"
                disabled={createPlanMutation.isPending || updatePlanMutation.isPending}
                className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-orange-500/20 active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {(createPlanMutation.isPending || updatePlanMutation.isPending) && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                {editingPlan ? "Update Plan" : "Create Plan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
