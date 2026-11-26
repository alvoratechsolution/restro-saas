"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiFetch from "@/lib/api";
import {
  Plus,
  Edit2,
  Trash2,
  Loader2,
  UtensilsCrossed,
  Image,
  Upload,
  Layers,
  Search,
  Sparkles,
  DollarSign,
  CheckCircle2,
  XCircle,
  RotateCcw,
  SlidersHorizontal,
  X,
} from "lucide-react";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
import Textarea from "@/components/ui/textarea";
import toast from "react-hot-toast";
import Swal from "sweetalert2";

interface Category {
  _id: string;
  name: string;
}

interface Variant {
  _id?: string;
  name: string;
  price: number;
}

interface Addon {
  _id?: string;
  name: string;
  price: number;
}

interface MenuItem {
  _id: string;
  categoryId: Category;
  name: string;
  description?: string;
  price: number;
  images: string[];
  foodType: "veg" | "non-veg" | "egg";
  spicyLevel: number;
  preparationTime?: number;
  calories?: number;
  isRecommended: boolean;
  isPopular: boolean;
  isOutOfStock: boolean;
  isActive: boolean;
  variants: Variant[];
  addons: Addon[];
}

export default function MenuPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [loadingMaster, setLoadingMaster] = useState(false);

  // Search & Filtering states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");
  const [dietFilter, setDietFilter] = useState<"all" | "veg" | "non-veg" | "egg">("all");
  const [stockFilter, setStockFilter] = useState<"all" | "in_stock" | "out_of_stock">("all");

  // Form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState(0);
  const [categoryId, setCategoryId] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [foodType, setFoodType] = useState<"veg" | "non-veg" | "egg">("veg");
  const [spicyLevel, setSpicyLevel] = useState(0);
  const [preparationTime, setPreparationTime] = useState(15);
  const [calories, setCalories] = useState(0);
  const [isRecommended, setIsRecommended] = useState(false);
  const [isPopular, setIsPopular] = useState(false);
  const [isOutOfStock, setIsOutOfStock] = useState(false);

  // Variants & Addons states
  const [variants, setVariants] = useState<Variant[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);

  // Temp input states for adding variant/addon
  const [varName, setVarName] = useState("");
  const [varPrice, setVarPrice] = useState(0);
  const [addName, setAddName] = useState("");
  const [addPrice, setAddPrice] = useState(0);

  // Queries
  const { data: menuResponse, isLoading: menuLoading } = useQuery<{ success: boolean; data: MenuItem[] }>({
    queryKey: ["admin", "menu"],
    queryFn: () => apiFetch("/api/admin/menu"),
  });

  const { data: catResponse, isLoading: catLoading } = useQuery<{ success: boolean; data: Category[] }>({
    queryKey: ["admin", "categories"],
    queryFn: () => apiFetch("/api/admin/categories"),
  });

  const menuItems = menuResponse?.data || [];
  const categories = catResponse?.data || [];

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload: any) =>
      apiFetch("/api/admin/menu", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      toast.success("Dish added to your menu!");
      queryClient.invalidateQueries({ queryKey: ["admin", "menu"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create menu item");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: any) =>
      apiFetch("/api/admin/menu", {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      toast.success("Dish updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["admin", "menu"] });
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update menu item");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/admin/menu?id=${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      toast.success("Dish removed from menu");
      queryClient.invalidateQueries({ queryKey: ["admin", "menu"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete item");
    },
  });

  // Filtered Menu Items
  const filteredMenuItems = useMemo(() => {
    return menuItems.filter((item) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        (item.categoryId?.name && item.categoryId.name.toLowerCase().includes(q));

      const matchesCategory =
        selectedCategoryFilter === "all" || item.categoryId?._id === selectedCategoryFilter;

      const matchesDiet = dietFilter === "all" || item.foodType === dietFilter;

      const matchesStock =
        stockFilter === "all" ||
        (stockFilter === "in_stock" && !item.isOutOfStock) ||
        (stockFilter === "out_of_stock" && item.isOutOfStock);

      return matchesSearch && matchesCategory && matchesDiet && matchesStock;
    });
  }, [menuItems, searchQuery, selectedCategoryFilter, dietFilter, stockFilter]);

  // Handle Quick Price Edit Prompt
  const handleQuickPriceEdit = async (item: MenuItem) => {
    const { value: newPrice } = await Swal.fire({
      title: `Update Price: ${item.name}`,
      text: "Enter new selling price in rupees",
      input: "number",
      inputValue: item.price.toString(),
      inputAttributes: {
        min: "0",
        step: "1",
        placeholder: "Enter price",
      },
      showCancelButton: true,
      confirmButtonColor: "#f97316",
      cancelButtonColor: "#94a3b8",
      confirmButtonText: "Save Price",
      cancelButtonText: "Cancel",
      customClass: {
        popup: "rounded-3xl border border-slate-200 shadow-2xl p-6",
        title: "text-lg font-black text-slate-900",
        confirmButton: "rounded-xl font-bold px-5 py-2.5",
        cancelButton: "rounded-xl font-bold px-5 py-2.5",
      },
      inputValidator: (val) => {
        if (!val || isNaN(Number(val)) || Number(val) < 0) {
          return "Please enter a valid price (₹0 or greater)";
        }
        return null;
      },
    });

    if (newPrice !== undefined && Number(newPrice) !== item.price) {
      updateMutation.mutate({
        id: item._id,
        price: Number(newPrice),
      });
    }
  };

  // Toggle Out of Stock
  const handleToggleStock = (item: MenuItem) => {
    updateMutation.mutate({
      id: item._id,
      isOutOfStock: !item.isOutOfStock,
    });
  };

  // Load Master Menu Action
  const handleLoadMasterMenu = async () => {
    const result = await Swal.fire({
      title: "Load Master Menu Catalog?",
      html: `
        <div class="text-left text-xs text-slate-600 space-y-2 py-2">
          <p>
            This loads the full <strong>28 Categories</strong> and <strong>189 Dishes</strong> (Starters, Maggie, Shakes, Pizzas, Burgers, Thalis, etc.) with food imagery into your restaurant.
          </p>
          <p class="text-slate-500">
            • <strong>Keep Existing:</strong> Adds any missing master items while preserving dishes you added.<br/>
            • <strong>Reset Clean:</strong> Replaces catalog completely with default 189 dishes.
          </p>
        </div>
      `,
      icon: "question",
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonColor: "#f97316",
      denyButtonColor: "#64748b",
      cancelButtonColor: "#cbd5e1",
      confirmButtonText: "⚡ Load All (Keep Existing)",
      denyButtonText: "🔄 Reset Clean (Replace All)",
      cancelButtonText: "Cancel",
      customClass: {
        popup: "rounded-3xl border border-slate-200 shadow-2xl p-6",
        title: "text-lg font-black text-slate-900",
        confirmButton: "rounded-xl font-bold px-4 py-2 text-xs",
        denyButton: "rounded-xl font-bold px-4 py-2 text-xs",
        cancelButton: "rounded-xl font-bold px-4 py-2 text-xs",
      },
    });

    if (result.isConfirmed) {
      setLoadingMaster(true);
      try {
        const res = await apiFetch("/api/admin/menu/load-master-menu", {
          method: "POST",
          body: JSON.stringify({ overwrite: false }),
        });
        toast.success(res.message || "Master menu loaded successfully!");
        queryClient.invalidateQueries({ queryKey: ["admin", "menu"] });
        queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
      } catch (err: any) {
        toast.error(err.message || "Failed to load master menu");
      } finally {
        setLoadingMaster(false);
      }
    } else if (result.isDenied) {
      setLoadingMaster(true);
      try {
        const res = await apiFetch("/api/admin/menu/load-master-menu", {
          method: "POST",
          body: JSON.stringify({ overwrite: true }),
        });
        toast.success(res.message || "Master menu reset clean!");
        queryClient.invalidateQueries({ queryKey: ["admin", "menu"] });
        queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
      } catch (err: any) {
        toast.error(err.message || "Failed to reset master menu");
      } finally {
        setLoadingMaster(false);
      }
    }
  };

  // Handle Image upload using Multer multipart/form-data
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File is too large (max 5MB)");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", "menu");

    setImageUploading(true);

    try {
      const uploadRes = await apiFetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (uploadRes.success) {
        setImageUrl(uploadRes.url);
        toast.success("Image uploaded!");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to upload image");
    } finally {
      setImageUploading(false);
    }
  };

  const addVariant = () => {
    if (!varName) return;
    setVariants([...variants, { name: varName, price: varPrice }]);
    setVarName("");
    setVarPrice(0);
  };

  const removeVariant = (index: number) => {
    setVariants(variants.filter((_, idx) => idx !== index));
  };

  const addAddon = () => {
    if (!addName) return;
    setAddons([...addons, { name: addName, price: addPrice }]);
    setAddName("");
    setAddPrice(0);
  };

  const removeAddon = (index: number) => {
    setAddons(addons.filter((_, idx) => idx !== index));
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setPrice(0);
    setCategoryId("");
    setImageUrl("");
    setFoodType("veg");
    setSpicyLevel(0);
    setPreparationTime(15);
    setCalories(0);
    setIsRecommended(false);
    setIsPopular(false);
    setIsOutOfStock(false);
    setVariants([]);
    setAddons([]);
    setEditingItem(null);
    setShowModal(false);
  };

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item);
    setName(item.name);
    setDescription(item.description || "");
    setPrice(item.price);
    setCategoryId(item.categoryId?._id || "");
    setImageUrl(item.images?.[0] || "");
    setFoodType(item.foodType);
    setSpicyLevel(item.spicyLevel);
    setPreparationTime(item.preparationTime || 15);
    setCalories(item.calories || 0);
    setIsRecommended(item.isRecommended);
    setIsPopular(item.isPopular);
    setIsOutOfStock(item.isOutOfStock);
    setVariants((item.variants || []).map((v) => ({ name: v.name, price: v.price })));
    setAddons((item.addons || []).map((a) => ({ name: a.name, price: a.price })));
    setShowModal(true);
  };

  const handleDelete = async (id: string, itemName: string) => {
    const res = await Swal.fire({
      title: "Delete dish?",
      text: `Are you sure you want to remove "${itemName}" from your menu?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#94a3b8",
      confirmButtonText: "Yes, Delete",
      cancelButtonText: "Cancel",
      customClass: {
        popup: "rounded-3xl border border-slate-200 shadow-2xl p-6",
        title: "text-lg font-black text-slate-900",
        confirmButton: "rounded-xl font-bold px-4 py-2 text-xs",
        cancelButton: "rounded-xl font-bold px-4 py-2 text-xs",
      },
    });

    if (res.isConfirmed) {
      deleteMutation.mutate(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId) {
      toast.error("Please select a category");
      return;
    }

    const payload = {
      categoryId,
      name,
      description,
      price,
      images: imageUrl ? [imageUrl] : [],
      foodType,
      spicyLevel,
      preparationTime,
      calories,
      isRecommended,
      isPopular,
      isOutOfStock,
      variants,
      addons,
    };

    if (editingItem) {
      updateMutation.mutate({ id: editingItem._id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Menu Items</h1>
            <span className="bg-orange-50 border border-orange-200 text-orange-700 text-xs font-black px-2.5 py-0.5 rounded-full">
              {menuItems.length} Dishes
            </span>
            <span className="bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold px-2.5 py-0.5 rounded-full">
              {categories.length} Categories
            </span>
          </div>
          <p className="text-slate-500 mt-1 text-xs font-medium">
            Pre-loaded master catalog with instant pricing updates, category filters, and dish customization.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={handleLoadMasterMenu}
            disabled={loadingMaster}
            variant="outline"
            className="border-orange-300 text-orange-700 hover:bg-orange-50 bg-white font-bold flex items-center gap-1.5 text-xs px-3.5 py-2 rounded-xl cursor-pointer shadow-xs"
          >
            {loadingMaster ? (
              <Loader2 className="h-4 w-4 animate-spin text-orange-600" />
            ) : (
              <Sparkles className="h-4 w-4 text-orange-600" />
            )}
            ⚡ Master Catalog (189 Items)
          </Button>

          <Button
            onClick={() => {
              resetForm();
              if (categories.length > 0) setCategoryId(categories[0]._id);
              setShowModal(true);
            }}
            className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold flex items-center gap-1.5 shadow-xs text-xs px-4 py-2 rounded-xl cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Add New Dish
          </Button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search dishes by name (e.g. Maggie, Paneer, Burger, Cold Coffee)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-9 py-2 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Category Dropdown */}
          <div className="w-full md:w-56 shrink-0">
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-orange-500 focus:bg-white transition-all cursor-pointer"
            >
              <option value="all">All Categories ({menuItems.length})</option>
              {categories.map((c) => {
                const count = menuItems.filter((i) => i.categoryId?._id === c._id).length;
                return (
                  <option key={c._id} value={c._id}>
                    {c.name} ({count})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Diet Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0">
            {(["all", "veg", "non-veg", "egg"] as const).map((diet) => (
              <button
                key={diet}
                onClick={() => setDietFilter(diet)}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg capitalize transition-all cursor-pointer ${
                  dietFilter === diet
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {diet}
              </button>
            ))}
          </div>

          {/* Stock Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0">
            {(
              [
                { id: "all", label: "All" },
                { id: "in_stock", label: "In Stock" },
                { id: "out_of_stock", label: "Out" },
              ] as const
            ).map((st) => (
              <button
                key={st.id}
                onClick={() => setStockFilter(st.id)}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                  stockFilter === st.id
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {/* Category Horizontal Quick-Scroll Chips & Category Bulk Out-of-Stock Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-slate-100 pt-2">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden flex-1">
            <button
              onClick={() => setSelectedCategoryFilter("all")}
              className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 transition-all cursor-pointer ${
                selectedCategoryFilter === "all"
                  ? "bg-orange-600 text-white shadow-xs"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-600"
              }`}
            >
              All Categories ({menuItems.length})
            </button>
            {categories.map((c) => {
              const count = menuItems.filter((i) => i.categoryId?._id === c._id).length;
              const isSelected = selectedCategoryFilter === c._id;
              return (
                <button
                  key={c._id}
                  onClick={() => setSelectedCategoryFilter(c._id)}
                  className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 transition-all cursor-pointer ${
                    isSelected
                      ? "bg-orange-600 text-white shadow-xs"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                  }`}
                >
                  {c.name} ({count})
                </button>
              );
            })}
          </div>

          {/* Quick Category-Level Out of Stock Button */}
          {selectedCategoryFilter !== "all" && (
            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto bg-slate-50 border border-slate-200 p-1 rounded-xl">
              <span className="text-[10px] font-bold text-slate-500 pl-1">
                {categories.find((c) => c._id === selectedCategoryFilter)?.name}:
              </span>
              <button
                type="button"
                onClick={async () => {
                  const cat = categories.find((c) => c._id === selectedCategoryFilter);
                  if (!cat) return;
                  if (confirm(`Kya aap "${cat.name}" ke saare dishes ko OUT OF STOCK (Unavailable) karna chahte hain?`)) {
                    try {
                      await apiFetch(`/api/admin/categories/${cat._id}/toggle-stock`, {
                        method: "PATCH",
                        body: JSON.stringify({ isOutOfStock: true }),
                      });
                      toast.success(`"${cat.name}" ke saare dishes out of stock ho gaye`);
                      queryClient.invalidateQueries({ queryKey: ["admin", "menu"] });
                    } catch (e: any) {
                      toast.error(e.message || "Failed to update category stock");
                    }
                  }
                }}
                className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
              >
                All Out of Stock
              </button>
              <button
                type="button"
                onClick={async () => {
                  const cat = categories.find((c) => c._id === selectedCategoryFilter);
                  if (!cat) return;
                  if (confirm(`Kya aap "${cat.name}" ke saare dishes ko IN STOCK (Available) karna chahte hain?`)) {
                    try {
                      await apiFetch(`/api/admin/categories/${cat._id}/toggle-stock`, {
                        method: "PATCH",
                        body: JSON.stringify({ isOutOfStock: false }),
                      });
                      toast.success(`"${cat.name}" ke saare dishes in stock ho gaye`);
                      queryClient.invalidateQueries({ queryKey: ["admin", "menu"] });
                    } catch (e: any) {
                      toast.error(e.message || "Failed to update category stock");
                    }
                  }
                }}
                className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
              >
                All In Stock
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Dishes Grid */}
      {menuLoading || catLoading ? (
        <div className="flex flex-col h-64 items-center justify-center gap-2">
          <Loader2 className="h-10 w-10 text-orange-500 animate-spin" />
          <p className="text-xs font-bold text-slate-500">Loading restaurant menu...</p>
        </div>
      ) : filteredMenuItems.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-3">
          <UtensilsCrossed className="h-12 w-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-black text-slate-800">No dishes match your filters</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try clearing your search query or load the 189-item master catalog with one click.
          </p>
          <div className="pt-2 flex items-center justify-center gap-2">
            <Button
              onClick={() => {
                setSearchQuery("");
                setSelectedCategoryFilter("all");
                setDietFilter("all");
                setStockFilter("all");
              }}
              variant="outline"
              size="sm"
              className="text-xs font-bold"
            >
              Reset Filters
            </Button>
            <Button
              onClick={handleLoadMasterMenu}
              size="sm"
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs"
            >
              ⚡ Load Master Catalog
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredMenuItems.map((item) => (
            <Card
              key={item._id}
              className={`bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between ${
                item.isOutOfStock ? "opacity-70 bg-slate-50/50" : ""
              }`}
            >
              <div>
                {/* Dish Photo & Tags */}
                <div className="relative h-44 bg-slate-100 flex items-center justify-center border-b border-slate-100 overflow-hidden">
                  {item.images?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.images[0]}
                      alt={item.name}
                      className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                    />
                  ) : (
                    <UtensilsCrossed className="h-10 w-10 text-slate-300" />
                  )}

                  {/* Food Type Badge */}
                  <span
                    className={`absolute top-3 left-3 text-[10px] uppercase font-black tracking-wider px-2.5 py-0.5 rounded-full border shadow-xs ${
                      item.foodType === "veg"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                        : item.foodType === "non-veg"
                        ? "bg-red-50 text-red-700 border-red-300"
                        : "bg-amber-50 text-amber-700 border-amber-300"
                    }`}
                  >
                    {item.foodType}
                  </span>

                  {/* Out of Stock Banner */}
                  {item.isOutOfStock && (
                    <span className="absolute top-3 right-3 bg-red-600 text-white text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full shadow-xs">
                      Out of Stock
                    </span>
                  )}
                </div>

                {/* Details */}
                <div className="p-4 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase text-orange-600 font-black tracking-wider">
                      {item.categoryId?.name || "General"}
                    </span>
                    {item.variants && item.variants.length > 0 && (
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                        {item.variants.length} Sizes
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-black text-slate-900 leading-tight">{item.name}</h3>
                  <p className="text-slate-500 text-xs line-clamp-2 h-8 leading-relaxed">
                    {item.description || "Freshly prepared with authentic ingredients."}
                  </p>

                  {/* Price Row with Quick Edit */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xl font-black text-slate-900">₹{item.price}</span>
                      <button
                        onClick={() => handleQuickPriceEdit(item)}
                        title="Click to quickly edit price"
                        className="p-1 rounded-lg hover:bg-orange-50 text-slate-400 hover:text-orange-600 transition-colors cursor-pointer"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <button
                      onClick={() => handleToggleStock(item)}
                      title={item.isOutOfStock ? "Click to make Available (In Stock)" : "Click to make Unavailable (Out of Stock)"}
                      className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer shadow-xs flex items-center gap-1.5 ${
                        item.isOutOfStock
                          ? "bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100"
                          : "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                      }`}
                    >
                      <span className={`h-2 w-2 rounded-full ${item.isOutOfStock ? "bg-rose-500" : "bg-emerald-500 animate-pulse"}`} />
                      <span>{item.isOutOfStock ? "Unavailable (Out of Stock)" : "Available (In Stock)"}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-3 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between gap-2">
                <span className="text-[10px] text-slate-400 font-medium">
                  prep: {item.preparationTime || 15}m
                </span>

                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    onClick={() => handleQuickPriceEdit(item)}
                    className="bg-white hover:bg-orange-50 text-orange-700 border border-orange-200 text-xs px-2.5 py-1 cursor-pointer font-bold shadow-xs"
                  >
                    <DollarSign className="h-3 w-3 mr-0.5" />
                    Quick Price
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => handleEdit(item)}
                    className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs px-2.5 py-1 cursor-pointer font-bold shadow-xs"
                  >
                    <Edit2 className="h-3 w-3 mr-1" />
                    Edit
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => handleDelete(item._id, item.name)}
                    className="bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs px-2.5 py-1 cursor-pointer font-bold shadow-xs"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Item Modal (Light Theme UI) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white border border-slate-200/90 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl my-8 animate-in fade-in-50 zoom-in-95 duration-150 text-slate-900">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  {editingItem ? "Edit Menu Dish" : "Add New Dish"}
                </h2>
                <p className="text-xs text-slate-500">
                  Configure dish details, pricing, variants, and ingredients.
                </p>
              </div>
              <button
                onClick={resetForm}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Dish Name *"
                  type="text"
                  placeholder="e.g. Paneer Butter Masala"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <Select
                  label="Category *"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  options={categories.map((c) => ({ value: c._id, label: c.name }))}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Price (₹) *"
                  type="number"
                  placeholder="249"
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  required
                />
                <Select
                  label="Food Type *"
                  value={foodType}
                  onChange={(e) => setFoodType(e.target.value as any)}
                  options={[
                    { value: "veg", label: "Veg 🟢" },
                    { value: "non-veg", label: "Non-Veg 🔴" },
                    { value: "egg", label: "Egg 🟡" },
                  ]}
                  required
                />
                <Select
                  label="Spicy Level"
                  value={spicyLevel.toString()}
                  onChange={(e) => setSpicyLevel(Number(e.target.value))}
                  options={[
                    { value: "0", label: "Not Spicy" },
                    { value: "1", label: "Mild 🌶️" },
                    { value: "2", label: "Medium 🌶️🌶️" },
                    { value: "3", label: "Extra Hot 🌶️🌶️🌶️" },
                  ]}
                />
              </div>

              <Textarea
                label="Description"
                placeholder="Delicious slow-cooked cottage cheese in rich tomato-cashew gravy..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />

              {/* Image Upload Block */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Dish Image
                </label>
                <div className="flex items-center gap-4">
                  <div className="relative h-20 w-20 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                    {imageUploading ? (
                      <Loader2 className="h-6 w-6 text-orange-500 animate-spin" />
                    ) : imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={imageUrl} alt="preview" className="h-full w-full object-cover" />
                    ) : (
                      <UtensilsCrossed className="h-6 w-6 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 hover:text-slate-900 rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-xs">
                      <Upload className="h-4 w-4" />
                      Upload Photo
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageChange}
                        disabled={imageUploading}
                      />
                    </label>
                    <p className="text-[10px] text-slate-400 mt-1">PNG, JPG or JPEG. Max size of 5MB.</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Preparation Time (min)"
                  type="number"
                  value={preparationTime}
                  onChange={(e) => setPreparationTime(Number(e.target.value))}
                />
                <Input
                  label="Calories (Kcal)"
                  type="number"
                  value={calories}
                  onChange={(e) => setCalories(Number(e.target.value))}
                />
              </div>

              {/* Toggle Switches */}
              <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={isRecommended}
                    onChange={(e) => setIsRecommended(e.target.checked)}
                    className="rounded border-slate-300 text-orange-500 focus:ring-orange-500"
                  />
                  Recommended
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={isPopular}
                    onChange={(e) => setIsPopular(e.target.checked)}
                    className="rounded border-slate-300 text-orange-500 focus:ring-orange-500"
                  />
                  Chef Special
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-red-600">
                  <input
                    type="checkbox"
                    checked={isOutOfStock}
                    onChange={(e) => setIsOutOfStock(e.target.checked)}
                    className="rounded border-slate-300 text-red-600 focus:ring-red-500"
                  />
                  Out of Stock
                </label>
              </div>

              {/* Variants Section */}
              <div className="border-t border-slate-100 pt-4 space-y-2.5">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-orange-500" />
                  Portion / Size Variants (e.g. Half / Full)
                </h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Half / Full / Regular"
                    value={varName}
                    onChange={(e) => setVarName(e.target.value)}
                    className="flex-1 bg-white border border-slate-200 text-slate-800 placeholder:text-slate-400 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/15 shadow-xs"
                  />
                  <input
                    type="number"
                    placeholder="Price (₹)"
                    value={varPrice || ""}
                    onChange={(e) => setVarPrice(Number(e.target.value))}
                    className="w-28 bg-white border border-slate-200 text-slate-800 placeholder:text-slate-400 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/15 shadow-xs"
                  />
                  <Button
                    type="button"
                    onClick={addVariant}
                    className="bg-orange-500 hover:bg-orange-600 text-white text-xs px-4 rounded-xl cursor-pointer font-bold shadow-xs"
                  >
                    Add
                  </Button>
                </div>
                {variants.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {variants.map((v, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1.5 bg-orange-50 border border-orange-200 px-3 py-1 rounded-full text-xs text-orange-800 font-bold"
                      >
                        {v.name}: ₹{v.price}
                        <button
                          type="button"
                          onClick={() => removeVariant(index)}
                          className="text-red-500 hover:text-red-700 font-black ml-1 text-sm shrink-0 cursor-pointer"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Addons Section */}
              <div className="border-t border-slate-100 pt-4 space-y-2.5">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-orange-500" />
                  Dish Addons (e.g. Extra Cheese, Dips)
                </h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Extra Cheese Dip"
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    className="flex-1 bg-white border border-slate-200 text-slate-800 placeholder:text-slate-400 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/15 shadow-xs"
                  />
                  <input
                    type="number"
                    placeholder="Price (₹)"
                    value={addPrice || ""}
                    onChange={(e) => setAddPrice(Number(e.target.value))}
                    className="w-28 bg-white border border-slate-200 text-slate-800 placeholder:text-slate-400 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/15 shadow-xs"
                  />
                  <Button
                    type="button"
                    onClick={addAddon}
                    className="bg-orange-500 hover:bg-orange-600 text-white text-xs px-4 rounded-xl cursor-pointer font-bold shadow-xs"
                  >
                    Add
                  </Button>
                </div>
                {addons.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {addons.map((a, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1.5 bg-orange-50 border border-orange-200 px-3 py-1 rounded-full text-xs text-orange-800 font-bold"
                      >
                        {a.name}: ₹{a.price}
                        <button
                          type="button"
                          onClick={() => removeAddon(index)}
                          className="text-red-500 hover:text-red-700 font-black ml-1 text-sm shrink-0 cursor-pointer"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  onClick={resetForm}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-4 py-2 rounded-xl border border-slate-200 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs px-5 py-2 rounded-xl flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  Save Dish
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
