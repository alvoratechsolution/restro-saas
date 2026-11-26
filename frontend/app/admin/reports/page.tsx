"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import apiFetch from "@/lib/api";
import {
  IndianRupee,
  ShoppingBag,
  TrendingUp,
  Percent,
  Receipt,
  Download,
  Calendar,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  CreditCard,
  Banknote,
  Smartphone,
  ChevronDown,
  ArrowUpRight,
  Loader2,
  FileSpreadsheet,
} from "lucide-react";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ReportsData {
  summary: {
    totalOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    totalRevenue: number;
    totalTax: number;
    totalDiscount: number;
    averageOrderValue: number;
  };
  paymentBreakdown: Array<{
    method: string;
    count: number;
    amount: number;
  }>;
  salesTimeline: Array<{
    label: string;
    revenue: number;
    orders: number;
  }>;
  orders: Array<{
    _id: string;
    orderId: string;
    tableNumber: string;
    customerName: string;
    customerPhone: string;
    total: number;
    status: string;
    paymentStatus: string;
    paymentMethod: string;
    createdAt: string;
    itemCount: number;
  }>;
}

export default function ReportsPage() {
  const [range, setRange] = useState<string>("7d");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [isCustomDate, setIsCustomDate] = useState<boolean>(false);

  const queryParams = new URLSearchParams();
  if (isCustomDate && customStartDate && customEndDate) {
    queryParams.append("startDate", customStartDate);
    queryParams.append("endDate", customEndDate);
  } else {
    queryParams.append("range", range);
  }
  if (paymentFilter !== "all") queryParams.append("paymentMethod", paymentFilter);
  if (statusFilter !== "all") queryParams.append("status", statusFilter);

  const { data: response, isLoading } = useQuery<{ success: boolean; data: ReportsData }>({
    queryKey: ["admin", "reports", range, paymentFilter, statusFilter, customStartDate, customEndDate, isCustomDate],
    queryFn: () => apiFetch(`/api/admin/reports?${queryParams.toString()}`),
  });

  const reports = response?.data;
  const summary = reports?.summary || {
    totalOrders: 0,
    completedOrders: 0,
    cancelledOrders: 0,
    totalRevenue: 0,
    totalTax: 0,
    totalDiscount: 0,
    averageOrderValue: 0,
  };

  const exportCSV = () => {
    if (!reports?.orders?.length) return;
    const headers = ["Order ID", "Date", "Table", "Customer Name", "Phone", "Items Count", "Payment Method", "Status", "Total (Rs.)"];
    const rows = reports.orders.map((o) => [
      o.orderId,
      new Date(o.createdAt).toLocaleString(),
      o.tableNumber,
      `"${o.customerName || "Guest"}"`,
      o.customerPhone || "-",
      o.itemCount,
      o.paymentMethod,
      o.status,
      o.total,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Sales_Report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & Filter Controls - Clean White/Light Theme */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Sales & Revenue Analytics</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time sales performance, revenue breakdown, and order transactions.
          </p>
        </div>

        {/* Date presets & CSV Export */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-slate-50 p-1 rounded-xl border border-slate-200/80">
            {[
              { id: "today", label: "Today" },
              { id: "yesterday", label: "Yesterday" },
              { id: "7d", label: "7 Days" },
              { id: "30d", label: "30 Days" },
              { id: "this_month", label: "This Month" },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setIsCustomDate(false);
                  setRange(p.id);
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  !isCustomDate && range === p.id
                    ? "bg-white text-orange-600 shadow-sm border border-slate-200/70"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsCustomDate(!isCustomDate)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
              isCustomDate
                ? "bg-orange-50 border-orange-300 text-orange-700 font-bold"
                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <span>Custom Date</span>
          </button>

          <Button
            onClick={exportCSV}
            disabled={!reports?.orders?.length}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-3.5 rounded-xl flex items-center gap-1.5 shadow-sm border-none cursor-pointer"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Custom Date Pickers */}
      {isCustomDate && (
        <div className="flex flex-wrap items-center gap-3 bg-white border border-slate-200 p-4 rounded-2xl shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700">From Date:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-orange-500 focus:bg-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700">To Date:</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-orange-500 focus:bg-white"
            />
          </div>
          <span className="text-xs text-slate-400">Select custom date range to filter orders and sales</span>
        </div>
      )}

      {/* KPI Stat Cards - Soft Clean Light Palette */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm relative overflow-hidden group hover:border-orange-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Net Sales</span>
            <div className="p-2.5 bg-orange-50 text-orange-600 rounded-xl border border-orange-100">
              <IndianRupee className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">
              ₹{summary.totalRevenue.toLocaleString("en-IN")}
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 font-medium flex items-center gap-1.5">
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[11px] border border-emerald-200/60">
                Avg ₹{summary.averageOrderValue.toLocaleString("en-IN")}
              </span>
              <span>per order</span>
            </p>
          </div>
        </div>

        {/* Total Orders */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm relative overflow-hidden group hover:border-blue-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Orders Received</span>
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
              <ShoppingBag className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">{summary.totalOrders}</h3>
            <div className="flex items-center gap-2 mt-1.5 text-xs">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[11px] border border-emerald-200/60">
                <CheckCircle2 className="h-3 w-3" /> {summary.completedOrders} completed
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-700 font-bold text-[11px] border border-rose-200/60">
                <XCircle className="h-3 w-3" /> {summary.cancelledOrders} cancelled
              </span>
            </div>
          </div>
        </div>

        {/* Total GST / Taxes */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm relative overflow-hidden group hover:border-violet-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Taxes Collected (GST)</span>
            <div className="p-2.5 bg-violet-50 text-violet-600 rounded-xl border border-violet-100">
              <Receipt className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">
              ₹{summary.totalTax.toLocaleString("en-IN")}
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 font-medium">CGST + SGST total collected</p>
          </div>
        </div>

        {/* Total Discounts */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm relative overflow-hidden group hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Discounts & Offers</span>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
              <Percent className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">
              ₹{summary.totalDiscount.toLocaleString("en-IN")}
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 font-medium">Total coupon & bill savings</p>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Timeline Chart */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-black text-slate-900">Sales Trend Overview</h2>
              <p className="text-xs text-slate-500">Revenue growth across selected duration</p>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-orange-50 border border-orange-200/70 rounded-full text-[11px] font-bold text-orange-700">
              <span className="h-2 w-2 rounded-full bg-orange-500" />
              Sales (₹)
            </div>
          </div>

          <div className="h-72 w-full pt-2">
            {isLoading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
              </div>
            ) : reports?.salesTimeline && reports.salesTimeline.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={reports.salesTimeline} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="salesGradLight" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val}`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      borderRadius: "14px",
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.08)",
                      color: "#0f172a",
                      fontSize: "12px",
                      fontWeight: 600,
                    }}
                    formatter={(value: any) => [`₹${Number(value).toLocaleString("en-IN")}`, "Revenue"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#ea580c"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#salesGradLight)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No sales records found for this period.
              </div>
            )}
          </div>
        </div>

        {/* Payment Methods Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col">
          <div className="mb-4">
            <h2 className="text-base font-black text-slate-900">Payment Methods</h2>
            <p className="text-xs text-slate-500">Distribution by payment mode</p>
          </div>

          <div className="space-y-3 pt-2 flex-1 flex flex-col justify-center">
            {reports?.paymentBreakdown && reports.paymentBreakdown.length > 0 ? (
              reports.paymentBreakdown.map((pm) => {
                const percentage = summary.totalRevenue > 0 ? Math.round((pm.amount / summary.totalRevenue) * 100) : 0;
                return (
                  <div key={pm.method} className="bg-slate-50/80 border border-slate-200/80 p-3.5 rounded-xl">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                      <span className="flex items-center gap-1.5 capitalize">
                        {pm.method.toLowerCase() === "cash" && <Banknote className="h-4 w-4 text-emerald-600" />}
                        {pm.method.toLowerCase() === "online" && <Smartphone className="h-4 w-4 text-blue-600" />}
                        {pm.method.toLowerCase() === "card" && <CreditCard className="h-4 w-4 text-purple-600" />}
                        {pm.method}
                      </span>
                      <span>₹{pm.amount.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="w-full bg-slate-200/70 h-2 rounded-full mt-2.5 overflow-hidden">
                      <div className="bg-orange-500 h-full rounded-full transition-all duration-500" style={{ width: `${percentage}%` }} />
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-slate-500 mt-1.5">
                      <span>{pm.count} orders</span>
                      <span className="font-bold text-slate-700">{percentage}%</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-12 text-center text-xs text-slate-400">No payment data recorded.</div>
            )}
          </div>
        </div>
      </div>

      {/* Orders Filter & Recent Table */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base font-black text-slate-900">Recent Transactions</h2>
            <p className="text-xs text-slate-500">Order breakdown for the selected period</p>
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-orange-500"
            >
              <option value="all">All Statuses</option>
              <option value="Completed">Completed</option>
              <option value="Preparing">Preparing</option>
              <option value="Pending">Pending</option>
              <option value="Cancelled">Cancelled</option>
            </select>

            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-orange-500"
            >
              <option value="all">All Payments</option>
              <option value="Cash">Cash</option>
              <option value="Online">Online / UPI</option>
              <option value="Card">Card</option>
            </select>
          </div>
        </div>

        {/* Transactions Table - Clean White / Light Rows */}
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 uppercase font-black text-[10px] tracking-wider">
                <th className="py-3 px-3.5">Order ID</th>
                <th className="py-3 px-3.5">Date & Time</th>
                <th className="py-3 px-3.5">Table</th>
                <th className="py-3 px-3.5">Customer</th>
                <th className="py-3 px-3.5">Payment</th>
                <th className="py-3 px-3.5">Status</th>
                <th className="py-3 px-3.5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-orange-500 mb-2" />
                    Loading orders...
                  </td>
                </tr>
              ) : reports?.orders && reports.orders.length > 0 ? (
                reports.orders.map((o) => (
                  <tr key={o._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-3.5 font-black text-slate-900">#{o.orderId}</td>
                    <td className="py-3 px-3.5 text-slate-500">
                      {new Date(o.createdAt).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-3 px-3.5 font-bold text-orange-600">Table {o.tableNumber}</td>
                    <td className="py-3 px-3.5">
                      <div className="font-bold text-slate-800">{o.customerName || "Guest"}</div>
                      {o.customerPhone && o.customerPhone !== "-" && (
                        <div className="text-[10px] text-slate-400">{o.customerPhone}</div>
                      )}
                    </td>
                    <td className="py-3 px-3.5">
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-600">
                        {o.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3 px-3.5">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          o.status === "Completed"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : o.status === "Cancelled"
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {o.status}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-right font-black text-slate-900">
                      ₹{o.total.toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    No orders match your filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
