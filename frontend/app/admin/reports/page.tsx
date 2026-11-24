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
  BarChart,
  Bar,
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
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Sales & Business Reports</span>
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Track your revenue, sales trends, tax deductions, and orders summary.
          </p>
        </div>

        {/* Date presets & CSV Export */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            {[
              { id: "today", label: "Today" },
              { id: "yesterday", label: "Yesterday" },
              { id: "7d", label: "Last 7 Days" },
              { id: "30d", label: "Last 30 Days" },
              { id: "this_month", label: "This Month" },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setIsCustomDate(false);
                  setRange(p.id);
                }}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  !isCustomDate && range === p.id
                    ? "bg-white text-orange-600 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsCustomDate(!isCustomDate)}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
              isCustomDate
                ? "bg-orange-50 border-orange-300 text-orange-700"
                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>Custom Date</span>
          </button>

          <Button
            onClick={exportCSV}
            disabled={!reports?.orders?.length}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-3.5 rounded-xl flex items-center gap-1.5 shadow-xs"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Custom Date Pickers */}
      {isCustomDate && (
        <div className="flex flex-wrap items-center gap-3 bg-orange-50/60 border border-orange-200 p-3.5 rounded-2xl animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700">From:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-orange-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700">To:</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-orange-500"
            />
          </div>
          <p className="text-[11px] text-slate-500 italic">Select custom date range to filter orders and sales</p>
        </div>
      )}

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <Card className="p-5 border-slate-200/80 shadow-xs bg-gradient-to-br from-white to-orange-50/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Net Sales</span>
            <div className="p-2.5 bg-orange-500/10 text-orange-600 rounded-xl">
              <IndianRupee className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900">
              ₹{summary.totalRevenue.toLocaleString("en-IN")}
            </h3>
            <p className="text-xs text-slate-500 mt-1 font-medium flex items-center gap-1">
              <span className="text-emerald-600 font-bold">₹{summary.averageOrderValue.toLocaleString("en-IN")}</span> avg order value
            </p>
          </div>
        </Card>

        {/* Total Orders */}
        <Card className="p-5 border-slate-200/80 shadow-xs bg-gradient-to-br from-white to-blue-50/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Orders Received</span>
            <div className="p-2.5 bg-blue-500/10 text-blue-600 rounded-xl">
              <ShoppingBag className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900">{summary.totalOrders}</h3>
            <div className="flex items-center gap-3 mt-1 text-xs">
              <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                <CheckCircle2 className="h-3 w-3" /> {summary.completedOrders} completed
              </span>
              <span className="text-rose-500 font-bold flex items-center gap-0.5">
                <XCircle className="h-3 w-3" /> {summary.cancelledOrders} cancelled
              </span>
            </div>
          </div>
        </Card>

        {/* Total GST / Taxes */}
        <Card className="p-5 border-slate-200/80 shadow-xs bg-gradient-to-br from-white to-purple-50/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Taxes (GST)</span>
            <div className="p-2.5 bg-purple-500/10 text-purple-600 rounded-xl">
              <Receipt className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900">
              ₹{summary.totalTax.toLocaleString("en-IN")}
            </h3>
            <p className="text-xs text-slate-500 mt-1 font-medium">CGST + SGST collected</p>
          </div>
        </Card>

        {/* Total Discounts */}
        <Card className="p-5 border-slate-200/80 shadow-xs bg-gradient-to-br from-white to-emerald-50/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Discounts & Coupons</span>
            <div className="p-2.5 bg-emerald-500/10 text-emerald-600 rounded-xl">
              <Percent className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900">
              ₹{summary.totalDiscount.toLocaleString("en-IN")}
            </h3>
            <p className="text-xs text-slate-500 mt-1 font-medium">Total customer savings</p>
          </div>
        </Card>
      </div>

      {/* Chart Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Timeline Chart */}
        <Card className="p-5 lg:col-span-2 border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-black text-slate-900">Sales Trend Over Time</h2>
              <p className="text-xs text-slate-500">Revenue per period</p>
            </div>
          </div>

          <div className="h-72 w-full pt-2">
            {isLoading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
              </div>
            ) : reports?.salesTimeline && reports.salesTimeline.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={reports.salesTimeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ea580c" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#ea580c" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val}`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderRadius: "12px",
                      border: "none",
                      color: "#fff",
                      fontSize: "12px",
                    }}
                    formatter={(value: any) => [`₹${Number(value).toLocaleString("en-IN")}`, "Revenue"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#ea580c"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#salesGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No sales data available for this range.
              </div>
            )}
          </div>
        </Card>

        {/* Payment Methods Breakdown */}
        <Card className="p-5 border-slate-200/80 shadow-xs">
          <div className="mb-4">
            <h2 className="text-base font-black text-slate-900">Payment Breakdown</h2>
            <p className="text-xs text-slate-500">Distribution by payment type</p>
          </div>

          <div className="space-y-3 pt-2">
            {reports?.paymentBreakdown && reports.paymentBreakdown.length > 0 ? (
              reports.paymentBreakdown.map((pm) => {
                const percentage = summary.totalRevenue > 0 ? Math.round((pm.amount / summary.totalRevenue) * 100) : 0;
                return (
                  <div key={pm.method} className="bg-slate-50 border border-slate-100 p-3 rounded-xl">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                      <span className="flex items-center gap-1.5 capitalize">
                        {pm.method.toLowerCase() === "cash" && <Banknote className="h-4 w-4 text-emerald-600" />}
                        {pm.method.toLowerCase() === "online" && <Smartphone className="h-4 w-4 text-blue-600" />}
                        {pm.method.toLowerCase() === "card" && <CreditCard className="h-4 w-4 text-purple-600" />}
                        {pm.method}
                      </span>
                      <span>₹{pm.amount.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div className="bg-orange-500 h-full rounded-full" style={{ width: `${percentage}%` }} />
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1">
                      <span>{pm.count} orders</span>
                      <span>{percentage}%</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-12 text-center text-xs text-slate-400">No payment data available.</div>
            )}
          </div>
        </Card>
      </div>

      {/* Orders Filter & Recent Table */}
      <Card className="p-5 border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base font-black text-slate-900">Sales Transactions</h2>
            <p className="text-xs text-slate-500">Showing recent orders for selected time range</p>
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 outline-none"
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
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 outline-none"
            >
              <option value="all">All Payments</option>
              <option value="Cash">Cash</option>
              <option value="Online">Online / UPI</option>
              <option value="Card">Card</option>
            </select>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 uppercase font-black text-[10px] tracking-wider">
                <th className="py-2.5 px-3">Order ID</th>
                <th className="py-2.5 px-3">Date & Time</th>
                <th className="py-2.5 px-3">Table</th>
                <th className="py-2.5 px-3">Customer</th>
                <th className="py-2.5 px-3">Payment</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-orange-500 mb-2" />
                    Loading orders...
                  </td>
                </tr>
              ) : reports?.orders && reports.orders.length > 0 ? (
                reports.orders.map((o) => (
                  <tr key={o._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-black text-slate-900">#{o.orderId}</td>
                    <td className="py-3 px-3 text-slate-500">
                      {new Date(o.createdAt).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-3 px-3 font-bold text-orange-600">Table {o.tableNumber}</td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-800">{o.customerName || "Guest"}</div>
                      {o.customerPhone && o.customerPhone !== "-" && (
                        <div className="text-[10px] text-slate-400">{o.customerPhone}</div>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-600">
                        {o.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
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
                    <td className="py-3 px-3 text-right font-black text-slate-900">
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
      </Card>
    </div>
  );
}
