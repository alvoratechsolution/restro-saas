"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiFetch from "@/lib/api";
import { Plus, Edit2, Trash2, Loader2, Tags, ToggleLeft, ToggleRight, X, AlertOctagon, CheckCircle2 } from "lucide-react";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import toast from "react-hot-toast";

interface Category {
  _id: string;
  name: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
}

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);

  // Queries
  const { data: response, isLoading } = useQuery<{ success: boolean; data: Category[] }>({
    queryKey: ["admin", "categories"],
    queryFn: () => apiFetch("/api/admin/categories"),
  });

  const categories = response?.data || [];

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload: { name: string; description: string; sortOrder: number; isActive: boolean }) =>
      apiFetch("/api/admin/categories", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      toast.success("Category created");
      queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
      resetForm();
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to create category");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { id: string; name: string; description: string; sortOrder: number; isActive: boolean }) =>
      apiFetch("/api/admin/categories", {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      toast.success("Category updated");
      queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
      resetForm();
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update category");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/admin/categories?id=${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      toast.success("Category deleted");
      queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to delete category");
    },
  });

  // Bulk Stock Toggle for entire category
  const toggleCategoryStockMutation = useMutation({
    mutationFn: ({ id, isOutOfStock }: { id: string; isOutOfStock: boolean }) =>
      apiFetch(`/api/admin/categories/${id}/toggle-stock`, {
        method: "PATCH",
        body: JSON.stringify({ isOutOfStock }),
      }),
    onSuccess: (data: any) => {
      toast.success(data?.message || "Category stock updated!");
      queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "menu"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update category stock");
    },
  });

  const handleBulkStockToggle = (cat: Category, isOutOfStock: boolean) => {
    const actionText = isOutOfStock
      ? `"${cat.name}" ke SARE items ko OUT OF STOCK (Unavailable) karna chahte hain?`
      : `"${cat.name}" ke SARE items ko IN STOCK (Available) karna chahte hain?`;

    if (confirm(`Kya aap ${actionText}`)) {
      toggleCategoryStockMutation.mutate({ id: cat._id, isOutOfStock });
    }
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setSortOrder(0);
    setIsActive(true);
    setEditingCategory(null);
    setShowModal(false);
  };

  const handleEdit = (cat: Category) => {
    setEditingCategory(cat);
    setName(cat.name);
    setDescription(cat.description || "");
    setSortOrder(cat.sortOrder);
    setIsActive(cat.isActive);
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this category?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    const payload = { name, description, sortOrder, isActive };

    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory._id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Categories</h1>
          <p className="text-slate-500 mt-0.5 text-xs font-medium">
            Organize your menu courses (e.g. Starters, Main Course, Drinks).
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold flex items-center gap-2 shadow-sm text-xs px-4 py-2 rounded-xl cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Add Category
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
                <tr className="border-b border-slate-200/80 bg-slate-50/80 text-slate-500 font-bold text-xs uppercase tracking-wider">
                  <th className="py-3.5 px-6">Name</th>
                  <th className="py-3.5 px-6">Description</th>
                  <th className="py-3.5 px-6">Sort Order</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6">Quick Stock Action</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
                {categories.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400 font-medium">
                      No categories created yet. Click &quot;Add Category&quot; to begin.
                    </td>
                  </tr>
                ) : (
                  categories.map((cat) => (
                    <tr key={cat._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-6 font-bold text-slate-900 flex items-center gap-2.5">
                        <Tags className="h-4 w-4 text-orange-500" />
                        {cat.name}
                      </td>
                      <td className="py-3.5 px-6 text-slate-500 text-xs font-medium">{cat.description || "N/A"}</td>
                      <td className="py-3.5 px-6 font-bold text-slate-700 text-xs">{cat.sortOrder}</td>
                      <td className="py-3.5 px-6">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                            cat.isActive
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}
                        >
                          {cat.isActive ? (
                            <>
                              <ToggleRight className="h-4 w-4 text-emerald-600" />
                              Active
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="h-4 w-4 text-slate-400" />
                              Disabled
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleBulkStockToggle(cat, true)}
                            disabled={toggleCategoryStockMutation.isPending}
                            title={`Mark all dishes in ${cat.name} as Out of Stock`}
                            className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <AlertOctagon className="h-3 w-3" />
                            <span>All Out</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleBulkStockToggle(cat, false)}
                            disabled={toggleCategoryStockMutation.isPending}
                            title={`Mark all dishes in ${cat.name} as In Stock (Available)`}
                            className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            <span>All In</span>
                          </button>
                        </div>
                      </td>
                      <td className="py-3.5 px-6 text-right space-x-2">
                        <button
                          onClick={() => handleEdit(cat)}
                          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                          title="Edit Category"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(cat._id)}
                          className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg border border-rose-200 transition-colors cursor-pointer"
                          title="Delete Category"
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

      {/* Category Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in-50 zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900">
                {editingCategory ? "Edit Category" : "Add New Category"}
              </h2>
              <button
                onClick={resetForm}
                className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <Input
                label="Category Name *"
                type="text"
                placeholder="Starters, Desserts, Mocktails..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

              <Input
                label="Description"
                type="text"
                placeholder="Appetizers, soups, and fingers"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />

              <Input
                label="Sort Order"
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
              />

              <div className="flex items-center gap-3 pt-1">
                <input
                  type="checkbox"
                  id="isActiveCheck"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-slate-300 text-orange-600 focus:ring-orange-500/20 h-4 w-4"
                />
                <label htmlFor="isActiveCheck" className="text-xs text-slate-700 font-semibold cursor-pointer">
                  Category is active and visible on customer menu
                </label>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  onClick={resetForm}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs px-4 py-2 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs px-5 py-2 flex items-center gap-2 cursor-pointer shadow-xs"
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  Save Category
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
