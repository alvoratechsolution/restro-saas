"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiFetch from "@/lib/api";
import {
  Store,
  CreditCard,
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  Globe,
  Loader2,
} from "lucide-react";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import toast from "react-hot-toast";

interface SubscriptionPlan {
  _id: string;
  name: string;
  price: number;
  billingCycle: string;
}

interface Restaurant {
  _id: string;
  name: string;
  slug: string;
  billingEmail: string;
  phone: string;
  subscriptionPlan?: SubscriptionPlan;
  subscriptionStatus: string;
  subscriptionEndsAt?: string;
  isActive: boolean;
  isSuspended: boolean;
  customDomain?: string;
  createdAt: string;
}

export default function SuperAdminDashboard() {
  const queryClient = useQueryClient();
  const [editingDomainRestId, setEditingDomainRestId] = useState<string | null>(null);
  const [customDomainText, setCustomDomainText] = useState("");

  // Queries
  const { data: restaurantsData, isLoading: loadingRestaurants } = useQuery<{ success: boolean; data: Restaurant[] }>({
    queryKey: ["super-admin", "restaurants"],
    queryFn: () => apiFetch("/api/super-admin/restaurants"),
  });

  const { data: plansData, isLoading: loadingPlans } = useQuery<{ success: boolean; data: SubscriptionPlan[] }>({
    queryKey: ["super-admin", "plans"],
    queryFn: () => apiFetch("/api/super-admin/plans"),
  });

  // Mutation to update restaurant status
  const updateRestaurantMutation = useMutation({
    mutationFn: (updatedData: { id: string; isActive?: boolean; isSuspended?: boolean; customDomain?: string }) =>
      apiFetch("/api/super-admin/restaurants", {
        method: "PATCH",
        body: JSON.stringify(updatedData),
      }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Restaurant updated successfully");
        queryClient.invalidateQueries({ queryKey: ["super-admin", "restaurants"] });
        setEditingDomainRestId(null);
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update restaurant");
    },
  });

  const restaurants = restaurantsData?.data || [];
  const plans = plansData?.data || [];

  // Metrics calculations
  const totalRestaurants = restaurants.length;
  const activeRestaurants = restaurants.filter((r) => r.isActive && !r.isSuspended).length;
  const trialingCount = restaurants.filter((r) => r.subscriptionStatus === "trialing").length;

  const estimatedMonthlyRevenue = restaurants.reduce((acc, rest) => {
    if (rest.isActive && !rest.isSuspended && rest.subscriptionPlan) {
      const price = rest.subscriptionPlan.price || 0;
      return acc + price;
    }
    return acc;
  }, 0);

  const handleToggleActive = (id: string, currentActive: boolean) => {
    updateRestaurantMutation.mutate({ id, isActive: !currentActive });
  };

  const handleToggleSuspend = (id: string, currentSuspended: boolean) => {
    updateRestaurantMutation.mutate({ id, isSuspended: !currentSuspended });
  };

  const handleUpdateDomain = (id: string) => {
    updateRestaurantMutation.mutate({ id, customDomain: customDomainText || "" });
  };

  const isLoading = loadingRestaurants || loadingPlans;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Overview Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Real-time statistics across all tenants and plans in the ecosystem.</p>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-10 w-10 text-orange-500 animate-spin" />
        </div>
      ) : (
        <>
          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <Card className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Restaurants</p>
                  <p className="text-3xl font-black text-slate-900 mt-1">{totalRestaurants}</p>
                </div>
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-200/60">
                  <Store className="h-6 w-6" />
                </div>
              </div>
            </Card>

            <Card className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Tenants</p>
                  <p className="text-3xl font-black text-emerald-600 mt-1">{activeRestaurants}</p>
                </div>
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-200/60">
                  <CheckCircle className="h-6 w-6" />
                </div>
              </div>
            </Card>

            <Card className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Monthly SaaS MRR</p>
                  <p className="text-3xl font-black text-slate-900 mt-1">
                    ₹{estimatedMonthlyRevenue.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-orange-50 text-orange-600 rounded-xl border border-orange-200/60">
                  <TrendingUp className="h-6 w-6" />
                </div>
              </div>
            </Card>

            <Card className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Trialing Users</p>
                  <p className="text-3xl font-black text-amber-600 mt-1">{trialingCount}</p>
                </div>
                <div className="p-3 bg-amber-50 text-amber-600 rounded-xl border border-amber-200/60">
                  <Calendar className="h-6 w-6" />
                </div>
              </div>
            </Card>
          </div>

          {/* Tenants Table */}
          <Card className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h2 className="text-base font-extrabold text-slate-900">Registered Restaurants</h2>
                <p className="text-slate-500 text-xs mt-0.5">Manage tenants, modify subscription plans, or assign domains.</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/90 text-slate-600 font-bold text-xs uppercase tracking-wider">
                    <th className="py-3.5 px-6">Restaurant</th>
                    <th className="py-3.5 px-6">Billing Info</th>
                    <th className="py-3.5 px-6">Plan & Status</th>
                    <th className="py-3.5 px-6">Custom Domain</th>
                    <th className="py-3.5 px-6">Is Active</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {restaurants.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        No registered restaurants found.
                      </td>
                    </tr>
                  ) : (
                    restaurants.map((rest) => (
                      <tr key={rest._id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-4 px-6">
                          <div className="font-bold text-slate-900">{rest.name}</div>
                          <div className="text-xs text-slate-400">slug: /{rest.slug}</div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="font-medium text-slate-800">{rest.billingEmail}</div>
                          <div className="text-xs text-slate-400">{rest.phone || "No phone"}</div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex flex-col gap-1 items-start">
                            <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold border border-slate-200">
                              {rest.subscriptionPlan?.name || "No Plan"}
                            </span>
                            <span
                              className={`text-[10px] uppercase font-bold tracking-wider ${
                                rest.subscriptionStatus === "active"
                                  ? "text-emerald-600"
                                  : rest.subscriptionStatus === "trialing"
                                  ? "text-amber-600"
                                  : "text-red-500"
                              }`}
                            >
                              {rest.subscriptionStatus}
                            </span>
                            {rest.subscriptionEndsAt && (
                              <span className="text-[10px] text-slate-400">
                                ends: {new Date(rest.subscriptionEndsAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          {editingDomainRestId === rest._id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-900 outline-none focus:border-orange-500"
                                value={customDomainText}
                                placeholder="domain.com"
                                onChange={(e) => setCustomDomainText(e.target.value)}
                              />
                              <Button
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] px-2 py-1 h-auto"
                                onClick={() => handleUpdateDomain(rest._id)}
                              >
                                Save
                              </Button>
                              <Button
                                size="sm"
                                className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] px-2 py-1 h-auto"
                                onClick={() => setEditingDomainRestId(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-xs text-slate-600 group">
                              <Globe className="h-3.5 w-3.5 text-slate-400" />
                              <span>{rest.customDomain || "None"}</span>
                              <button
                                className="opacity-0 group-hover:opacity-100 text-[10px] text-orange-600 font-bold hover:underline ml-1 cursor-pointer"
                                onClick={() => {
                                  setEditingDomainRestId(rest._id);
                                  setCustomDomainText(rest.customDomain || "");
                                }}
                              >
                                Edit
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <button
                            onClick={() => handleToggleActive(rest._id, rest.isActive)}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              rest.isActive ? "bg-emerald-500" : "bg-slate-300"
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                rest.isActive ? "translate-x-4" : "translate-x-0"
                              }`}
                            />
                          </button>
                        </td>
                        <td className="py-4 px-6 text-right space-x-2">
                          <Button
                            size="sm"
                            className={`${
                              rest.isSuspended
                                ? "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
                                : "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
                            } text-xs font-semibold px-3 py-1.5`}
                            onClick={() => handleToggleSuspend(rest._id, rest.isSuspended)}
                          >
                            {rest.isSuspended ? "Unsuspend" : "Suspend"}
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
