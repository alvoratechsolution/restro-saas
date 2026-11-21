"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import apiFetch from "@/lib/api";
import useSocket from "@/hooks/useSocket";
import {
  ShoppingBag,
  Bell,
  CheckCircle2,
  Clock,
  Utensils,
  CreditCard,
  Ban,
  Loader2,
  DollarSign,
  Printer,
} from "lucide-react";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import toast from "react-hot-toast";

interface OrderItem {
  _id: string;
  name: string;
  quantity: number;
  price: number;
  selectedVariant?: string;
  selectedAddons: Array<{ name: string; price: number }>;
}

interface Table {
  _id: string;
  tableNumber: string;
}

interface Order {
  _id: string;
  tableId?: Table;
  items: OrderItem[];
  subtotal: number;
  cgst: number;
  sgst: number;
  serviceCharge?: number;
  total: number;
  status: "Pending" | "Preparing" | "Ready" | "Completed" | "Cancelled";
  paymentStatus: "Pending" | "Paid" | "Failed";
  paymentMethod: string;
  createdAt: string;
}

export default function OrdersPage() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const branchId = (session?.user as any)?.branchId;

  const [activeTab, setActiveTab] = useState<Order["status"] | "All">("All");

  // Query live orders
  const { data: response, isLoading } = useQuery<{ success: boolean; data: Order[]; restaurant?: { name: string; address?: string; phone?: string } }>({
    queryKey: ["admin", "orders", activeTab],
    queryFn: () => {
      const statusParam = activeTab === "All" ? "" : `?status=${activeTab}`;
      return apiFetch(`/api/admin/orders${statusParam}`);
    },
  });

  const orders = response?.data || [];

  // WebSocket Hook integration
  const socket = useSocket(branchId);

  // Play Programmatic Bell Synthesizer (No assets required)
  const playNotificationChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Node 1: Oscillator (Freq)
      const osc = audioCtx.createOscillator();
      // Node 2: Gain Node (Volume envelope)
      const gainNode = audioCtx.createGain();

      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      osc.type = "sine";
      // High pitch sweet dining bell frequency
      osc.frequency.setValueAtTime(987.77, audioCtx.currentTime); // B5 note
      osc.frequency.exponentialRampToValueAtTime(1318.51, audioCtx.currentTime + 0.15); // E6 slide

      gainNode.gain.setValueAtTime(0.4, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.2);

      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + 1.2);
    } catch (e) {
      console.warn("Audio Context blocked by browser autoplay rules:", e);
    }
  };

  useEffect(() => {
    if (!socket) return;

    // Listen for new orders
    socket.on("order-received", (data: any) => {
      playNotificationChime();
      toast("🛎️ New Table Order Placed!", {
        icon: "🆕",
        style: {
          background: "#ea580c",
          color: "#fff",
        },
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
    });

    return () => {
      socket.off("order-received");
    };
  }, [socket, queryClient]);

  // Mutations
  const updateOrderMutation = useMutation({
    mutationFn: (payload: { id: string; status?: Order["status"]; paymentStatus?: Order["paymentStatus"] }) =>
      apiFetch("/api/admin/orders", {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      toast.success("Order updated");
      queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update order");
    },
  });

  const handleUpdateStatus = (id: string, status: Order["status"]) => {
    updateOrderMutation.mutate({ id, status });
    // If status is completed/cancelled, emit status update
    if (socket) {
      socket.emit("update-order-status", { branchId, orderId: id, status });
    }
  };

  const handleUpdatePayment = (id: string, paymentStatus: Order["paymentStatus"]) => {
    updateOrderMutation.mutate({ id, paymentStatus });
  };

  const handlePrintReceipt = (order: Order) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const restInfo = response?.restaurant;
    const restName = restInfo?.name || "Our Restaurant";
    const restAddress = restInfo?.address || "";
    const restPhone = restInfo?.phone || "";

    let itemsHtml = "";
    order.items.forEach((item) => {
      const addonsText = item.selectedAddons?.length > 0 
        ? `<div class="item-addons">+ ${item.selectedAddons.map(a => a.name).join(", ")}</div>` 
        : "";
      const variantText = item.selectedVariant ? `<div class="item-variant">Portion: ${item.selectedVariant}</div>` : "";
      
      itemsHtml += `
        <tr class="item-row">
          <td class="item-name-cell">
            <span class="item-qty">${item.quantity}x</span> ${item.name}
            ${variantText}
            ${addonsText}
          </td>
          <td class="item-price-cell">₹${Math.round(item.price)}</td>
          <td class="item-total-cell">₹${Math.round(item.price * item.quantity)}</td>
        </tr>
      `;
    });

    const discountRow = order.subtotal > order.total 
      ? `
        <div class="summary-row">
          <span>Discount:</span>
          <span>- ₹${Math.round(order.subtotal - order.total)}</span>
        </div>
      `
      : "";

    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt - Order #${order._id.slice(-6).toUpperCase()}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&display=swap');
            body {
              margin: 0;
              padding: 20px;
              font-family: 'Courier Prime', monospace;
              color: #000000;
              background-color: #ffffff;
              font-size: 14px;
              width: 300px;
              box-sizing: border-box;
            }
            .receipt-header {
              text-align: center;
              margin-bottom: 15px;
            }
            .restaurant-name {
              font-size: 18px;
              font-weight: 700;
              text-transform: uppercase;
              margin-bottom: 5px;
            }
            .info-line {
              margin-bottom: 3px;
              font-size: 11px;
            }
            .divider {
              border-top: 1px dashed #000;
              margin: 10px 0;
            }
            .order-meta {
              font-size: 12px;
              line-height: 1.4;
              margin-bottom: 10px;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin: 10px 0;
              font-size: 13px;
            }
            .item-row td {
              padding: 4px 0;
              vertical-align: top;
            }
            .item-name-cell {
              text-align: left;
            }
            .item-qty {
              font-weight: bold;
            }
            .item-variant, .item-addons {
              font-size: 11px;
              color: #555;
              padding-left: 20px;
            }
            .item-price-cell {
              text-align: right;
              width: 60px;
            }
            .item-total-cell {
              text-align: right;
              width: 70px;
            }
            .summary-section {
              margin: 10px 0;
              line-height: 1.5;
            }
            .summary-row {
              display: flex;
              justify-content: space-between;
            }
            .total-row {
              font-weight: 700;
              font-size: 16px;
              margin-top: 5px;
              border-top: 1px dashed #000;
              padding-top: 5px;
            }
            .payment-info {
              font-size: 12px;
              margin: 10px 0;
              text-align: center;
            }
            .footer-msg {
              text-align: center;
              font-size: 12px;
              margin-top: 20px;
              line-height: 1.4;
            }
            @media print {
              body {
                padding: 10px;
                width: 100%;
              }
            }
          </style>
        </head>
        <body>
          <div class="receipt-header">
            <div class="restaurant-name">${restName.toUpperCase()}</div>
            ${restAddress ? `<div class="info-line" style="font-size: 11px; margin-bottom: 2px;">${restAddress}</div>` : ""}
            ${restPhone ? `<div class="info-line" style="font-size: 11px; margin-bottom: 2px;">Contact: ${restPhone}</div>` : ""}
            <div class="info-line" style="margin-top: 5px; font-weight: bold;">Dine-in Order Receipt</div>
          </div>
          <div class="divider"></div>
          <div class="order-meta">
            <div><strong>ORDER ID:</strong> #${order._id.slice(-6).toUpperCase()}</div>
            <div><strong>TABLE:</strong> Table ${order.tableId?.tableNumber || "N/A"}</div>
            <div><strong>DATE:</strong> ${new Date(order.createdAt).toLocaleDateString()}</div>
            <div><strong>TIME:</strong> ${new Date(order.createdAt).toLocaleTimeString()}</div>
          </div>
          <div class="divider"></div>
          <table class="items-table">
            <thead>
              <tr style="border-bottom: 1px dashed #000;">
                <th style="text-align: left; padding-bottom: 4px;">Item</th>
                <th style="text-align: right; width: 60px; padding-bottom: 4px;">Price</th>
                <th style="text-align: right; width: 70px; padding-bottom: 4px;">Amt</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          <div class="divider"></div>
          <div class="summary-section">
            <div class="summary-row">
              <span>Subtotal:</span>
              <span>₹${Math.round(order.subtotal)}</span>
            </div>
            ${discountRow}
            <div class="summary-row total-row">
              <span>TOTAL DUE:</span>
              <span>₹${Math.round(order.total)}</span>
            </div>
          </div>
          <div class="divider"></div>
          <div class="payment-info">
            <div><strong>Payment Method:</strong> ${order.paymentMethod}</div>
            <div><strong>Payment Status:</strong> ${order.paymentStatus.toUpperCase()}</div>
          </div>
          <div class="divider"></div>
          <div class="footer-msg">
            <div>Thank you for dining with us!</div>
            <div style="font-size: 10px; margin-top: 5px;">Powered by ServeDesk</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => { window.close(); }, 100);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const tabs: Array<Order["status"] | "All"> = ["All", "Pending", "Preparing", "Ready", "Completed", "Cancelled"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <ShoppingBag className="text-orange-500 h-6 w-6" />
            Live Order Monitor
          </h1>
          <p className="text-slate-500 mt-0.5 text-xs font-medium">Real-time KDS line with waiter alerts and transaction logs.</p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3.5 py-1.5 shadow-xs shrink-0">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-xs font-bold text-slate-700">Live Socket Connected</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200/80 pb-3">
        {tabs.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
                isActive
                  ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm"
                  : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 shadow-xs"
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-10 w-10 text-orange-500 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {orders.length === 0 ? (
            <div className="md:col-span-3 text-center py-16 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
              <ShoppingBag className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500 text-xs font-medium">No orders found in this section.</p>
            </div>
          ) : (
            orders.map((order) => (
              <Card
                key={order._id}
                className={`bg-white border rounded-2xl flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 ${
                  order.status === "Pending"
                    ? "border-orange-300 ring-2 ring-orange-500/10"
                    : "border-slate-200/80"
                }`}
              >
                {/* Header info */}
                <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex justify-between items-center">
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      Table {order.tableId?.tableNumber || "T-N/A"}
                    </h3>
                    <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                      ID: #{order._id.slice(-6).toUpperCase()} • {new Date(order.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                      order.status === "Pending"
                        ? "bg-orange-50 text-orange-700 border-orange-200"
                        : order.status === "Preparing"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : order.status === "Ready"
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : order.status === "Completed"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-red-50 text-red-700 border-red-200"
                    }`}
                  >
                    {order.status}
                  </span>
                </div>

                {/* Items */}
                <div className="p-4 flex-1 space-y-2.5 max-h-60 overflow-y-auto">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start gap-3">
                      <div className="text-xs">
                        <p className="font-bold text-slate-800">
                          {item.quantity}x {item.name}
                        </p>
                        {item.selectedVariant && (
                          <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                            Portion: {item.selectedVariant}
                          </p>
                        )}
                        {item.selectedAddons?.length > 0 && (
                          <p className="text-[10px] text-orange-600 font-semibold mt-0.5">
                            + {item.selectedAddons.map((a) => a.name).join(", ")}
                          </p>
                        )}
                      </div>
                      <span className="text-xs font-black text-slate-700 shrink-0">
                        ₹{Math.round(item.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Totals & Payments */}
                <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-medium">Payment:</span>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`font-bold px-2 py-0.5 rounded-md text-[10px] border ${
                          order.paymentStatus === "Paid"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-red-50 text-red-700 border-red-200"
                        }`}
                      >
                        {order.paymentStatus}
                      </span>
                      <span className="text-slate-500 text-[11px]">via {order.paymentMethod}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-baseline">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Bill:</span>
                    <span className="text-2xl font-black text-slate-900 tracking-tight">₹{Math.round(order.total)}</span>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex flex-wrap gap-2 pt-2.5 border-t border-slate-200/80 justify-end items-center">
                    <button
                      type="button"
                      onClick={() => handlePrintReceipt(order)}
                      className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                      title="Print Bill"
                    >
                      <Printer className="h-3.5 w-3.5 text-slate-600" />
                      <span>Print Bill</span>
                    </button>

                    {order.status === "Pending" && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(order._id, "Preparing")}
                        className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                      >
                        <Clock className="h-3.5 w-3.5" />
                        <span>Prepare</span>
                      </button>
                    )}

                    {order.status === "Preparing" && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(order._id, "Ready")}
                        className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                      >
                        <Utensils className="h-3.5 w-3.5" />
                        <span>Ready</span>
                      </button>
                    )}

                    {order.status === "Ready" && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(order._id, "Completed")}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Complete</span>
                      </button>
                    )}

                    {order.status !== "Completed" && order.status !== "Cancelled" && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(order._id, "Cancelled")}
                        className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Ban className="h-3.5 w-3.5 text-rose-600" />
                        <span>Cancel</span>
                      </button>
                    )}

                    {order.paymentStatus !== "Paid" && (
                      <button
                        type="button"
                        onClick={() => handleUpdatePayment(order._id, "Paid")}
                        className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Mark Paid</span>
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
