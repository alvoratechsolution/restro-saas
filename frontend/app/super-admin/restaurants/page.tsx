"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiFetch from "@/lib/api";
import { BACKEND_URL } from "@/lib/config";
import { Store, Globe, Calendar, CheckCircle, AlertTriangle, Loader2, Plus, X, ShieldCheck, ChefHat, Users, Mail } from "lucide-react";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import Select from "@/components/ui/select";
import toast from "react-hot-toast";

interface SubscriptionPlan {
  _id: string;
  name: string;
  price: number;
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
  hasKitchen?: boolean;
  hasStaff?: boolean;
  enabledModules?: string[];
  createdAt: string;
}

export default function RestaurantsPage() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const [editingDomainRestId, setEditingDomainRestId] = useState<string | null>(null);
  const [customDomainText, setCustomDomainText] = useState("");

  // Add Restaurant form states
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRestName, setNewRestName] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newSubscriptionPlanId, setNewSubscriptionPlanId] = useState("");
  const [enableKitchen, setEnableKitchen] = useState(true);
  const [enableStaff, setEnableStaff] = useState(true);
  const [addingRestaurant, setAddingRestaurant] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);

  // Edit subscription states
  const [editingPlanRestId, setEditingPlanRestId] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [endsAtText, setEndsAtText] = useState("");

  useEffect(() => {
    const restaurantName = searchParams.get("restaurantName");
    const email = searchParams.get("email");
    const phone = searchParams.get("phone");

    if (restaurantName || email || phone) {
      if (restaurantName) setNewRestName(restaurantName);
      if (email) setNewAdminEmail(email);
      if (phone) setNewPhone(phone);
      setShowAddModal(true);
      
      // Clean up the URL search params so they don't persist on page refresh
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [searchParams]);

  // Fetch restaurants
  const { data: restaurantsData, isLoading } = useQuery<{ success: boolean; data: Restaurant[] }>({
    queryKey: ["super-admin", "restaurants"],
    queryFn: () => apiFetch("/api/super-admin/restaurants"),
  });

  // Fetch subscription plans
  const { data: plansData } = useQuery<{ success: boolean; data: SubscriptionPlan[] }>({
    queryKey: ["super-admin", "plans"],
    queryFn: () => apiFetch("/api/super-admin/plans"),
  });
  const plans = plansData?.data || [];

  // Fetch SMTP status
  const { data: smtpData } = useQuery<{ success: boolean; isConfigured: boolean; smtpUser: string | null; notice: string }>({
    queryKey: ["super-admin", "smtp-status"],
    queryFn: () => apiFetch("/api/super-admin/smtp-status"),
  });

  const updateRestaurantMutation = useMutation({
    mutationFn: (updatedData: {
      id: string;
      isActive?: boolean;
      isSuspended?: boolean;
      customDomain?: string;
      subscriptionPlan?: string;
      subscriptionStatus?: string;
      subscriptionEndsAt?: string | null;
      hasKitchen?: boolean;
      hasStaff?: boolean;
      enabledModules?: string[];
    }) =>
      apiFetch("/api/super-admin/restaurants", {
        method: "PATCH",
        body: JSON.stringify(updatedData),
      }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Tenant configuration updated");
        queryClient.invalidateQueries({ queryKey: ["super-admin", "restaurants"] });
        setEditingDomainRestId(null);
        setEditingPlanRestId(null);
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update tenant");
    },
  });

  const restaurants = restaurantsData?.data || [];

  const handleToggleActive = (id: string, currentActive: boolean) => {
    updateRestaurantMutation.mutate({ id, isActive: !currentActive });
  };

  const handleToggleSuspend = (id: string, currentSuspended: boolean) => {
    updateRestaurantMutation.mutate({ id, isSuspended: !currentSuspended });
  };

  const handleUpdateDomain = (id: string) => {
    updateRestaurantMutation.mutate({ id, customDomain: customDomainText || "" });
  };

  const handleUpdatePlan = (id: string) => {
    updateRestaurantMutation.mutate({
      id,
      subscriptionPlan: selectedPlanId || "",
      subscriptionStatus: selectedStatus,
      subscriptionEndsAt: endsAtText ? new Date(endsAtText).toISOString() : null,
    });
  };

  const handleResendCredentials = async (restId: string, email: string) => {
    setResendingId(restId);
    try {
      const res = await apiFetch(`/api/super-admin/restaurants/${restId}/resend-credentials`, {
        method: "POST",
      });
      if (res?.success) {
        if (res.emailSent === false) {
          toast(
            (t) => (
              <div className="text-xs">
                <p className="font-bold text-amber-700">SMTP Not Configured</p>
                <p className="text-slate-700 mt-1">
                  Credentials for {email}:<br />
                  <span className="font-mono font-bold bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded text-[11px] inline-block mt-0.5">
                    Password: {res.generatedPassword}
                  </span>
                </p>
                <p className="text-[10px] text-slate-500 mt-1">
                  Configure SMTP in backend/.env to send automated emails.
                </p>
              </div>
            ),
            { duration: 9000, icon: "⚠️" }
          );
        } else {
          toast.success(res.message || `Credentials sent to ${email}`);
        }
      } else {
        toast.error(res?.error || "Failed to send credentials");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to dispatch email");
    } finally {
      setResendingId(null);
    }
  };

  // Add Restaurant Handler
  const handleAddRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRestName || !newAdminEmail || !newAdminPassword) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (newPhone && newPhone.length !== 10) {
      toast.error("Phone number must be exactly 10 digits");
      return;
    }

    setAddingRestaurant(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          restaurantName: newRestName,
          email: newAdminEmail,
          password: newAdminPassword,
          phone: newPhone,
          address: newAddress,
          subscriptionPlanId: newSubscriptionPlanId || undefined,
          hasKitchen: enableKitchen,
          hasStaff: enableStaff,
          enabledModules: [
            "admin",
            ...(enableKitchen ? ["kitchen"] : []),
            ...(enableStaff ? ["staff"] : []),
          ],
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to add restaurant");
      }

      if (data.emailSent) {
        toast.success("New Restaurant registered & Welcome Email sent to admin!");
      } else if (data.emailNotice || data.emailSkipped) {
        toast(
          (t) => (
            <div className="text-xs">
              <p className="font-bold text-emerald-700">✓ Restaurant Registered Successfully!</p>
              <p className="text-slate-600 mt-0.5">
                Note: Email dispatch is pending (configure SMTP_USER &amp; SMTP_PASS in backend/.env).
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Admin: {newAdminEmail} | Pass: {newAdminPassword}
              </p>
            </div>
          ),
          { duration: 8000, icon: "ℹ️" }
        );
      } else {
        toast.success("New Restaurant registered successfully!");
      }

      queryClient.invalidateQueries({ queryKey: ["super-admin", "restaurants"] });
      resetAddForm();
    } catch (err: any) {
      toast.error(err.message || "Failed to onboard restaurant");
    } finally {
      setAddingRestaurant(false);
    }
  };

  const resetAddForm = () => {
    setNewRestName("");
    setNewAdminEmail("");
    setNewAdminPassword("");
    setNewPhone("");
    setNewAddress("");
    setNewSubscriptionPlanId("");
    setEnableKitchen(true);
    setEnableStaff(true);
    setShowAddModal(false);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Manage Tenants</h1>
          <p className="text-slate-500 text-sm mt-1">Supervise multi-tenant restaurant nodes, active domain mappings, and suspend access.</p>
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold flex items-center gap-2 shadow-lg shadow-orange-500/10 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Add Restaurant
        </Button>
      </div>

      {/* SMTP Notice Banner if unconfigured */}
      {smtpData && !smtpData.isConfigured && (
        <div className="bg-amber-50/90 border border-amber-200/90 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0 text-amber-700 mt-0.5">
              <Mail className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-950">
                Email Dispatch Pending (SMTP Configuration)
              </p>
              <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                Welcome emails with credentials to new restaurant admins will be dispatched automatically once your Gmail and Google App Password are added to <code className="bg-amber-100/90 px-1 py-0.5 rounded font-mono text-[10px] text-amber-900">backend/.env</code> (<code className="font-mono text-[10px]">SMTP_USER</code> &amp; <code className="font-mono text-[10px]">SMTP_PASS</code>).
              </p>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-10 w-10 text-orange-500 animate-spin" />
        </div>
      ) : (
        <Card className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/90 text-slate-600 font-bold text-xs uppercase tracking-wider">
                  <th className="py-3.5 px-6">Restaurant Name</th>
                  <th className="py-3.5 px-6">Contact / Email</th>
                  <th className="py-3.5 px-6">Subscription Plan</th>
                  <th className="py-3.5 px-6">Modules & Roles</th>
                  <th className="py-3.5 px-6">Custom Domain</th>
                  <th className="py-3.5 px-6">Access State</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {restaurants.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No tenants registered. Click &quot;Add Restaurant&quot; to onboard.
                    </td>
                  </tr>
                ) : (
                  restaurants.map((rest) => (
                    <tr key={rest._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 bg-orange-50 text-orange-600 flex items-center justify-center rounded-lg border border-orange-200/80">
                            <Store className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{rest.name}</div>
                            <div className="text-xs text-slate-400">slug: /{rest.slug}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-medium text-slate-800">{rest.billingEmail}</div>
                        <div className="text-xs text-slate-400">{rest.phone || "No phone"}</div>
                      </td>
                      <td className="py-4 px-6">
                        {editingPlanRestId === rest._id ? (
                          <div className="flex flex-col gap-2 max-w-[180px]">
                            {/* Plan Selection */}
                            <select
                              className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-slate-900 outline-none focus:border-orange-500 w-full"
                              value={selectedPlanId}
                              onChange={(e) => setSelectedPlanId(e.target.value)}
                            >
                              <option value="">No Plan</option>
                              {plans.map((p) => (
                                <option key={p._id} value={p._id}>
                                  {p.name}
                                </option>
                              ))}
                            </select>

                            {/* Status Selection */}
                            <select
                              className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-slate-900 outline-none focus:border-orange-500 w-full"
                              value={selectedStatus}
                              onChange={(e) => setSelectedStatus(e.target.value)}
                            >
                              <option value="trialing">Trialing</option>
                              <option value="active">Active</option>
                              <option value="past_due">Past Due</option>
                              <option value="canceled">Canceled</option>
                            </select>

                            {/* Ends At Input */}
                            <input
                              type="date"
                              className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-slate-900 outline-none focus:border-orange-500 w-full"
                              value={endsAtText}
                              onChange={(e) => setEndsAtText(e.target.value)}
                            />

                            {/* Save/Cancel Buttons */}
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] px-2 py-1 h-auto"
                                onClick={() => handleUpdatePlan(rest._id)}
                              >
                                Save
                              </Button>
                              <Button
                                size="sm"
                                className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] px-2 py-1 h-auto"
                                onClick={() => setEditingPlanRestId(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1 items-start group">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold border border-slate-200">
                                {rest.subscriptionPlan?.name || "No Plan"}
                              </span>
                              <button
                                className="opacity-0 group-hover:opacity-100 text-[10px] text-orange-600 font-bold hover:underline ml-1 cursor-pointer"
                                onClick={() => {
                                  setEditingPlanRestId(rest._id);
                                  setSelectedPlanId(rest.subscriptionPlan?._id || "");
                                  setSelectedStatus(rest.subscriptionStatus || "trialing");
                                  setEndsAtText(
                                    rest.subscriptionEndsAt
                                      ? new Date(rest.subscriptionEndsAt).toISOString().split("T")[0]
                                      : ""
                                  );
                                }}
                              >
                                Edit
                              </button>
                            </div>
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
                                expires: {new Date(rest.subscriptionEndsAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      {/* Operational Modules & Roles Column */}
                      <td className="py-4 px-6">
                        <div className="flex flex-wrap gap-1.5 max-w-[210px]">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-orange-50 text-orange-700 border border-orange-200/80">
                            <ShieldCheck className="h-3 w-3" /> Admin
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              updateRestaurantMutation.mutate({
                                id: rest._id,
                                hasKitchen: rest.hasKitchen === false ? true : false,
                              })
                            }
                            title="Click to toggle Kitchen KDS access"
                            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border cursor-pointer transition-all ${
                              rest.hasKitchen !== false
                                ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                                : "bg-slate-100 text-slate-400 border-slate-200 line-through opacity-70 hover:opacity-100"
                            }`}
                          >
                            <ChefHat className="h-3 w-3" /> Kitchen
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateRestaurantMutation.mutate({
                                id: rest._id,
                                hasStaff: rest.hasStaff === false ? true : false,
                              })
                            }
                            title="Click to toggle Staff & Waiter portal access"
                            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border cursor-pointer transition-all ${
                              rest.hasStaff !== false
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                : "bg-slate-100 text-slate-400 border-slate-200 line-through opacity-70 hover:opacity-100"
                            }`}
                          >
                            <Users className="h-3 w-3" /> Staff
                          </button>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        {editingDomainRestId === rest._id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-slate-900 outline-none focus:border-orange-500"
                              value={customDomainText}
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
                        <button
                          type="button"
                          onClick={() => handleResendCredentials(rest._id, rest.billingEmail)}
                          disabled={resendingId === rest._id}
                          title="Send login credentials & plan details email to admin"
                          className="px-2.5 py-1 text-slate-600 hover:text-orange-600 hover:bg-orange-50 border border-slate-200/80 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1 text-xs font-semibold shadow-2xs"
                        >
                          {resendingId === rest._id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-orange-600" />
                          ) : (
                            <Mail className="h-3.5 w-3.5 text-orange-600" />
                          )}
                          <span className="hidden xl:inline text-[11px] font-semibold">Email</span>
                        </button>
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
      )}

      {/* Add Restaurant Modal Overlay */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in-50 zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/80 shrink-0">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2.5">
                <div className="p-2 bg-orange-50 border border-orange-200 rounded-xl text-orange-600">
                  <Store className="h-5 w-5" />
                </div>
                Register Restaurant Tenant
              </h2>
              <button
                type="button"
                onClick={resetAddForm}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form id="addRestaurantForm" onSubmit={handleAddRestaurant} className="p-6 space-y-4 overflow-y-auto flex-1">
              <Input
                label="Restaurant Name *"
                type="text"
                placeholder="The Italian Bistro"
                value={newRestName}
                onChange={(e) => setNewRestName(e.target.value)}
                className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl focus:bg-white focus:border-orange-500"
                labelClassName="text-slate-700 font-bold text-xs"
                required
                disabled={addingRestaurant}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Owner/Admin Email *"
                  type="email"
                  placeholder="admin@bistro.com"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl focus:bg-white focus:border-orange-500"
                  labelClassName="text-slate-700 font-bold text-xs"
                  required
                  disabled={addingRestaurant}
                />
                <Input
                  label="Password *"
                  type="password"
                  placeholder="••••••••"
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl focus:bg-white focus:border-orange-500"
                  labelClassName="text-slate-700 font-bold text-xs"
                  required
                  disabled={addingRestaurant}
                />
              </div>

              <Input
                label="Phone Number"
                type="tel"
                placeholder="+91 99999 88888"
                value={newPhone}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  if (val.length <= 10) {
                    setNewPhone(val);
                  }
                }}
                className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl focus:bg-white focus:border-orange-500"
                labelClassName="text-slate-700 font-bold text-xs"
                disabled={addingRestaurant}
              />

              <Textarea
                label="Address"
                placeholder="456 Main Street, Suite A"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl focus:bg-white focus:border-orange-500"
                labelClassName="text-slate-700 font-bold text-xs"
                disabled={addingRestaurant}
                rows={3}
              />

              <Select
                label="Initial Subscription Plan"
                value={newSubscriptionPlanId}
                onChange={(e) => setNewSubscriptionPlanId(e.target.value)}
                className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl focus:bg-white focus:border-orange-500"
                labelClassName="text-slate-700 font-bold text-xs"
                options={[
                  { value: "", label: "Trial Plan (Default)" },
                  ...plans.map((p) => ({ value: p._id, label: `${p.name} ($${p.price})` })),
                ]}
                disabled={addingRestaurant}
              />

              {/* Module & Role Permissions Selection */}
              <div className="space-y-2 pt-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Select Portals & Role Modules *
                </label>
                <p className="text-[11px] text-slate-500">
                  Configure which portals this tenant can access (Admin only, or with Kitchen & Staff):
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Admin Portal (Always Active / Default) */}
                  <div className="p-3 rounded-xl border border-orange-200 bg-orange-50/70 flex flex-col justify-between cursor-not-allowed select-none">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <ShieldCheck className="h-4 w-4 text-orange-600 shrink-0" />
                        Admin
                      </span>
                      <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">
                        Default
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      Master control, menus, tables & analytics.
                    </p>
                  </div>

                  {/* Kitchen KDS Portal */}
                  <div
                    onClick={() => !addingRestaurant && setEnableKitchen(!enableKitchen)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer select-none flex flex-col justify-between ${
                      enableKitchen
                        ? "bg-amber-50 border-amber-300 text-slate-900 shadow-xs"
                        : "bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-400"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-bold flex items-center gap-1.5 ${enableKitchen ? "text-slate-900" : "text-slate-400"}`}>
                        <ChefHat className={`h-4 w-4 shrink-0 ${enableKitchen ? "text-amber-600" : "text-slate-400"}`} />
                        Kitchen (KDS)
                      </span>
                      <input
                        type="checkbox"
                        checked={enableKitchen}
                        readOnly
                        className="rounded bg-white border-slate-300 text-amber-500 focus:ring-0 pointer-events-none"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      Chef line screen for preparing orders.
                    </p>
                  </div>

                  {/* Staff & Waiter Portal */}
                  <div
                    onClick={() => !addingRestaurant && setEnableStaff(!enableStaff)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer select-none flex flex-col justify-between ${
                      enableStaff
                        ? "bg-emerald-50 border-emerald-300 text-slate-900 shadow-xs"
                        : "bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-400"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-bold flex items-center gap-1.5 ${enableStaff ? "text-slate-900" : "text-slate-400"}`}>
                        <Users className={`h-4 w-4 shrink-0 ${enableStaff ? "text-emerald-600" : "text-slate-400"}`} />
                        Staff / Waiter
                      </span>
                      <input
                        type="checkbox"
                        checked={enableStaff}
                        readOnly
                        className="rounded bg-white border-slate-300 text-emerald-500 focus:ring-0 pointer-events-none"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      Waiter bell alerts & staff credentials.
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 p-3 rounded-xl leading-relaxed">
                * An onboarding email with login ID, temporary password, active plan details, and portal links will be automatically sent to the Admin email address via Nodemailer.
              </div>
            </form>

            {/* Fixed Modal Footer with Action Buttons */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={resetAddForm}
                className="bg-slate-200/80 hover:bg-slate-300 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer transition-colors"
                disabled={addingRestaurant}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="addRestaurantForm"
                disabled={addingRestaurant}
                className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-orange-500/20 active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {addingRestaurant && <Loader2 className="h-4 w-4 animate-spin" />}
                Create Restaurant
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
