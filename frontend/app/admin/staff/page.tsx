"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiFetch from "@/lib/api";
import { Plus, Trash2, Loader2, UserCheck, ShieldAlert, KeyRound } from "lucide-react";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
import toast from "react-hot-toast";

interface StaffMember {
  _id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}

export default function StaffPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("STAFF");

  // Queries
  const { data: response, isLoading } = useQuery<{ success: boolean; data: StaffMember[] }>({
    queryKey: ["admin", "staff"],
    queryFn: () => apiFetch("/api/admin/staff"),
  });

  const staff = response?.data || [];

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload: any) =>
      apiFetch("/api/admin/staff", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      toast.success("Staff registered successfully!");
      queryClient.invalidateQueries({ queryKey: ["admin", "staff"] });
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create staff member");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/admin/staff?id=${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      toast.success("Staff access removed");
      queryClient.invalidateQueries({ queryKey: ["admin", "staff"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete staff member");
    },
  });

  const resetForm = () => {
    setName("");
    setEmail("");
    setPassword("");
    setRole("STAFF");
    setShowModal(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) return;
    createMutation.mutate({ name, email, password, role });
  };

  const handleDelete = (id: string) => {
    if (confirm("Remove login credentials and access for this staff member?")) {
      deleteMutation.mutate(id);
    }
  };

  const roleLabels: Record<string, string> = {
    BRANCH_MANAGER: "Branch Manager",
    KITCHEN: "Kitchen / Chef",
    STAFF: "Waiter / Service Staff",
    CASHIER: "Cashier",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Staff Credentials</h1>
          <p className="text-slate-500 mt-0.5 text-xs font-medium">Manage team access codes, branch manager logs, and service terminals.</p>
        </div>
        <Button
          onClick={() => setShowModal(true)}
          className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold flex items-center gap-2 shadow-sm text-xs px-4 py-2 rounded-xl cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Add Staff
        </Button>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-10 w-10 text-orange-500 animate-spin" />
        </div>
      ) : (
        <Card className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/80 text-slate-500 font-bold uppercase text-[11px] tracking-wider">
                  <th className="py-3.5 px-6">Name</th>
                  <th className="py-3.5 px-6">Email Address</th>
                  <th className="py-3.5 px-6">System Role</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {staff.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400 text-xs font-medium">
                      No staff members registered. Click &quot;Add Staff&quot; to authorize a terminal.
                    </td>
                  </tr>
                ) : (
                  staff.map((member) => (
                    <tr key={member._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-6 font-bold text-slate-900 flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-100">
                          <UserCheck className="h-3.5 w-3.5" />
                        </div>
                        {member.name}
                      </td>
                      <td className="py-3.5 px-6 text-slate-500 text-xs">{member.email}</td>
                      <td className="py-3.5 px-6 font-semibold">
                        <span className="text-[11px] bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg text-slate-700 font-bold">
                          {roleLabels[member.role] || member.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-6">
                        <span className="text-emerald-700 bg-emerald-50 border border-emerald-200/70 inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded-full">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Active
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        <button
                          onClick={() => handleDelete(member._id)}
                          className="p-1.5 text-rose-500 hover:text-rose-600 hover:bg-rose-50 transition-colors rounded-lg border border-rose-200/60 cursor-pointer"
                          title="Remove Staff"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Staff Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in-50 zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-orange-500" />
                Register Staff Access
              </h2>
              <button
                onClick={resetForm}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <Input
                label="Full Name *"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

              <Input
                label="Email Address *"
                type="email"
                placeholder="chef.john@gourmet.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <Input
                label="Access Password *"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <Select
                label="Role Designation *"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                options={[
                  { value: "STAFF", label: "Waiter / Service Staff" },
                  { value: "KITCHEN", label: "Kitchen / Chef" },
                  { value: "CASHIER", label: "Cashier" },
                  { value: "BRANCH_MANAGER", label: "Branch Manager" },
                ]}
                required
              />

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  onClick={resetForm}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-4 py-2 rounded-xl cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Register Staff
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
