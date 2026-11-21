"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import apiFetch from "@/lib/api";
import {
  DollarSign,
  ShoppingBag,
  TrendingUp,
  Loader2,
  Calendar,
  ArrowUpRight
} from "lucide-react";
import Card from "@/components/ui/card";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface TopItem {
  _id: string;
  name: string;
  totalQty: number;
  totalSales: number;
}

interface MonthlyTrend {
  name: string;
  revenue: number;
  orders: number;
}

interface DashboardData {
  todayCount: number;
  todayRevenue: number;
  totalOrders: number;
  totalRevenue: number;
  completedOrders: number;
  cancelledOrders: number;
  topSelling: TopItem[];
  chartData: MonthlyTrend[];
}

export default function AdminDashboard() {
  const { data: response, isLoading } = useQuery<{ success: boolean; data: DashboardData }>({
    queryKey: ["admin", "dashboard"],
    queryFn: () => apiFetch("/api/admin/dashboard"),
  });

  const metrics = response?.data;

  return (
    <div className="space-y-8">
      {/* Page Title & Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Dashboard Overview</h1>
          <p className="text-slate-500 mt-1 text-sm font-medium">
            Real-time indicators, restaurant ordering volume, and sales analytics.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 bg-white border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 shadow-xs">
          <Calendar className="h-4 w-4 text-orange-500" />
          <span>{new Date().toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</span>
        </div>
      </div>

      {isLoading || !metrics ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-10 w-10 text-orange-500 animate-spin" />
        </div>
      ) : (
        <>
          {/* 4 Primary KPI Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Card 1: Today's Revenue */}
            <Card className="p-6 bg-white border border-slate-200/80 rounded-2xl shadow-xs hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Today&apos;s Revenue</p>
                  <p className="text-3xl font-black text-slate-900 mt-2 tracking-tight">
                    ₹{Math.round(metrics.todayRevenue).toLocaleString()}
                  </p>
                  <p className="text-[11px] font-bold text-emerald-600 mt-2 flex items-center gap-1">
                    <ArrowUpRight className="h-3.5 w-3.5" /> Live daily billing
                  </p>
                </div>
                <div className="p-3.5 bg-orange-50 text-orange-600 rounded-2xl border border-orange-100 shadow-xs">
                  <DollarSign className="h-6 w-6" />
                </div>
              </div>
            </Card>

            {/* Card 2: Today's Orders */}
            <Card className="p-6 bg-white border border-slate-200/80 rounded-2xl shadow-xs hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Today&apos;s Orders</p>
                  <p className="text-3xl font-black text-slate-900 mt-2 tracking-tight">
                    {metrics.todayCount}
                  </p>
                  <p className="text-[11px] font-bold text-amber-600 mt-2 flex items-center gap-1">
                    ● Active dining shifts
                  </p>
                </div>
                <div className="p-3.5 bg-amber-50 text-amber-600 rounded-2xl border border-amber-100 shadow-xs">
                  <ShoppingBag className="h-6 w-6" />
                </div>
              </div>
            </Card>

            {/* Card 3: Total Sales */}
            <Card className="p-6 bg-white border border-slate-200/80 rounded-2xl shadow-xs hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Sales (All Time)</p>
                  <p className="text-3xl font-black text-emerald-600 mt-2 tracking-tight">
                    ₹{Math.round(metrics.totalRevenue).toLocaleString()}
                  </p>
                  <p className="text-[11px] font-bold text-emerald-600 mt-2 flex items-center gap-1">
                    ↑ Lifetime platform GMV
                  </p>
                </div>
                <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100 shadow-xs">
                  <TrendingUp className="h-6 w-6" />
                </div>
              </div>
            </Card>

            {/* Card 4: Total Orders */}
            <Card className="p-6 bg-white border border-slate-200/80 rounded-2xl shadow-xs hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Orders</p>
                  <p className="text-3xl font-black text-slate-900 mt-2 tracking-tight">
                    {metrics.totalOrders}
                  </p>
                  <p className="text-[11px] font-bold text-blue-600 mt-2 flex items-center gap-1">
                    ✓ Completed & served
                  </p>
                </div>
                <div className="p-3.5 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100 shadow-xs">
                  <ShoppingBag className="h-6 w-6" />
                </div>
              </div>
            </Card>
          </div>

          {/* Charts & Graphs Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sales Trend Chart */}
            <Card className="lg:col-span-2 p-6 bg-white border border-slate-200/80 rounded-2xl shadow-xs space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-900">Monthly Sales Trend</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Overview of paid order billing across the last 6 months.</p>
                </div>
                <span className="text-xs font-bold bg-orange-50 text-orange-600 border border-orange-200/60 px-2.5 py-1 rounded-full">
                  Revenue Analytics
                </span>
              </div>
              <div className="h-80 w-full pt-2">
                {metrics.chartData.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-slate-400 text-sm font-medium">
                    No sales history available yet.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={metrics.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ea580c" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#ea580c" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} />
                      <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val}`} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#ffffff",
                          border: "1px solid #e2e8f0",
                          borderRadius: "12px",
                          boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                          color: "#0f172a",
                          fontSize: "12px",
                          fontWeight: "bold",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="#ea580c"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorRevenue)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>

            {/* Top Selling Items */}
            <Card className="p-6 bg-white border border-slate-200/80 rounded-2xl shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-lg font-black text-slate-900">Top Selling Items</h3>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Popular</span>
                </div>
                <p className="text-xs text-slate-500 mb-6">Highest moving dishes in terms of quantity and value.</p>
                <div className="space-y-3">
                  {metrics.topSelling.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-sm font-medium">
                      No order items served yet.
                    </div>
                  ) : (
                    metrics.topSelling.map((item, idx) => (
                      <div
                        key={item._id}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-50/80 border border-slate-200/60 hover:bg-slate-100/70 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500 text-white text-xs font-black shadow-xs shrink-0">
                            #{idx + 1}
                          </span>
                          <div>
                            <p className="text-sm font-bold text-slate-900 leading-tight">{item.name}</p>
                            <p className="text-[11px] font-medium text-slate-500">Qty: {item.totalQty} sold</p>
                          </div>
                        </div>
                        <p className="text-sm font-black text-slate-900">₹{Math.round(item.totalSales).toLocaleString()}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
