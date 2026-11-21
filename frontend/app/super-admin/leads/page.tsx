"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiFetch from "@/lib/api";
import { BACKEND_URL } from "@/lib/config";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Trash2,
  Mail,
  User,
  Phone,
  CheckCircle,
  ExternalLink,
  Calendar,
  MessageSquare,
  ChevronDown,
} from "lucide-react";

interface Lead {
  _id: string;
  restaurantName: string;
  ownerName: string;
  email: string;
  phone: string;
  message?: string;
  status: "Pending" | "Contacted" | "Onboarded" | "Rejected";
  createdAt: string;
}

export default function LeadsPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [selectedMessage, setSelectedMessage] = useState<{ name: string; msg: string } | null>(null);

  // Fetch leads
  const { data: leadsData, isLoading, error } = useQuery<{ success: boolean; data: Lead[] }>({
    queryKey: ["super-admin", "leads"],
    queryFn: () => apiFetch("/api/super-admin/leads"),
  });

  // Update lead status
  const updateStatusMutation = useMutation({
    mutationFn: (updated: { id: string; status: string }) =>
      apiFetch("/api/super-admin/leads", {
        method: "PATCH",
        body: JSON.stringify(updated),
      }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Lead status updated successfully");
        queryClient.invalidateQueries({ queryKey: ["super-admin", "leads"] });
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update lead status");
    },
  });

  // Delete lead
  const deleteLeadMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/super-admin/leads/${id}`, {
        method: "DELETE",
      }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Lead deleted successfully");
        queryClient.invalidateQueries({ queryKey: ["super-admin", "leads"] });
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete lead");
    },
  });

  const leads = leadsData?.data || [];

  const handleStatusChange = (id: string, newStatus: string) => {
    updateStatusMutation.mutate({ id, status: newStatus });
  };

  const handleOnboardRedirect = (lead: Lead) => {
    // 1. Mark status as Contacted
    if (lead.status === "Pending") {
      updateStatusMutation.mutate({ id: lead._id, status: "Contacted" });
    }
    // 2. Redirect to restaurants page with pre-populated URL params
    const params = new URLSearchParams({
      restaurantName: lead.restaurantName,
      email: lead.email,
      phone: lead.phone,
    });
    router.push(`/super-admin/restaurants?${params.toString()}`);
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "Onboarded":
        return "bg-emerald-50 text-emerald-700 border border-emerald-200";
      case "Contacted":
        return "bg-blue-50 text-blue-700 border border-blue-200";
      case "Rejected":
        return "bg-red-50 text-red-700 border border-red-200";
      default:
        return "bg-amber-50 text-amber-700 border border-amber-200";
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Leads & Inquiries</h1>
        <p className="text-slate-500 text-sm mt-1">
          Review restaurant setup interest, manage inquiry status, and onboard prospective tenants.
        </p>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-10 w-10 text-orange-500 animate-spin" />
        </div>
      ) : error ? (
        <Card className="p-8 border border-red-200 bg-red-50 text-center text-red-600 font-bold">
          Failed to load lead inquiries. Make sure the backend server is running.
        </Card>
      ) : (
        <Card className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/90 text-slate-600 font-bold text-xs uppercase tracking-wider">
                  <th className="py-3.5 px-6">Restaurant Details</th>
                  <th className="py-3.5 px-6">Contact / Person</th>
                  <th className="py-3.5 px-6">Submitted Date</th>
                  <th className="py-3.5 px-6">Requirements</th>
                  <th className="py-3.5 px-6">Inquiry Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {leads.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                      No customer leads captured yet.
                    </td>
                  </tr>
                ) : (
                  leads.map((lead) => (
                    <tr key={lead._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-4 px-6 font-bold text-slate-900">
                        {lead.restaurantName}
                      </td>
                      <td className="py-4 px-6">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                            <User className="h-3.5 w-3.5 text-slate-500" />
                            {lead.ownerName}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Mail className="h-3.5 w-3.5 text-slate-400" />
                            <a href={`mailto:${lead.email}`} className="hover:underline hover:text-orange-600 font-sans">
                              {lead.email}
                            </a>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Phone className="h-3.5 w-3.5 text-slate-400" />
                            <a href={`tel:${lead.phone}`} className="hover:underline hover:text-orange-600">
                              {lead.phone}
                            </a>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-slate-500 text-xs">
                        <div className="flex items-center gap-1.5 font-medium">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          {new Date(lead.createdAt).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        {lead.message ? (
                          <button
                            onClick={() => setSelectedMessage({ name: lead.restaurantName, msg: lead.message || "" })}
                            className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-xs text-slate-700 font-bold px-2.5 py-1 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                          >
                            <MessageSquare className="h-3.5 w-3.5 text-orange-600" />
                            View Message
                          </button>
                        ) : (
                          <span className="text-slate-400 text-xs">No message</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <div className="relative inline-block w-36">
                          <select
                            value={lead.status}
                            onChange={(e) => handleStatusChange(lead._id, e.target.value)}
                            className={`w-full appearance-none cursor-pointer rounded-lg text-xs font-bold py-1.5 pl-3 pr-8 outline-none transition-all ${getStatusStyle(
                              lead.status
                            )}`}
                          >
                            <option value="Pending">Pending</option>
                            <option value="Contacted">Contacted</option>
                            <option value="Onboarded">Onboarded</option>
                            <option value="Rejected">Rejected</option>
                          </select>
                          <ChevronDown className="absolute right-2 top-2.5 h-3.5 w-3.5 pointer-events-none text-slate-500" />
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right space-x-2">
                        <Button
                          size="sm"
                          onClick={() => handleOnboardRedirect(lead)}
                          className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-3 py-1.5 inline-flex items-center gap-1 cursor-pointer shadow-xs"
                        >
                          Onboard
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete lead for ${lead.restaurantName}?`)) {
                              deleteLeadMutation.mutate(lead._id);
                            }
                          }}
                          className="bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 text-xs font-semibold px-2 py-1.5 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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

      {/* View Message Modal Overlay */}
      {selectedMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in-50 zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-orange-600" />
                Inquiry: {selectedMessage.name}
              </h2>
              <button
                onClick={() => setSelectedMessage(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1 hover:bg-slate-200/60 rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>
            <div className="p-6">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-slate-700 text-sm leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto">
                {selectedMessage.msg}
              </div>
              <div className="mt-6 flex justify-end">
                <Button
                  onClick={() => setSelectedMessage(null)}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs px-4 py-2 rounded-xl cursor-pointer"
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
