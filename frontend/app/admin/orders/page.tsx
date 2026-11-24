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
  User,
  Phone,
} from "lucide-react";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import toast from "react-hot-toast";

interface OrderItem {
  _id: string;
  name: string;
  quantity: number;
  price: number;
  selectedVariant?: string | { name: string; price?: number };
  selectedAddons: Array<{ name: string; price: number }>;
  specialInstructions?: string;
}

interface Table {
  _id: string;
  tableNumber: string;
}

interface Order {
  _id: string;
  tableId?: Table;
  customerName?: string;
  customerPhone?: string;
  items: OrderItem[];
  subtotal: number;
  cgst: number;
  sgst: number;
  serviceCharge?: number;
  total: number;
  status: "Pending" | "Preparing" | "Ready" | "Completed" | "Cancelled";
  paymentStatus: "Pending" | "Paid" | "Failed";
  paymentMethod: string;
  specialInstructions?: string;
  createdAt: string;
}

export default function OrdersPage() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const branchId = (session?.user as any)?.branchId;

  const [activeTab, setActiveTab] = useState<Order["status"] | "All">("All");

  // Query live orders
  const { data: response, isLoading } = useQuery<{
    success: boolean;
    data: Order[];
    restaurant?: { name: string; address?: string; phone?: string };
    settings?: { gstNumber?: string; thermalPrinterWidth?: string; currency?: string };
  }>({
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
    const settings = response?.settings;
    const restName = restInfo?.name || "Our Restaurant";
    const restAddress = restInfo?.address || "";
    const restPhone = restInfo?.phone || "";
    const gstNo = settings?.gstNumber || "";
    const printerWidth = settings?.thermalPrinterWidth || "80mm";
    const is58mm = printerWidth === "58mm";

    let itemsHtml = "";
    order.items.forEach((item) => {
      const addonsText = item.selectedAddons?.length > 0 
        ? `<div class="item-sub">+ ${item.selectedAddons.map((a: any) => typeof a === "object" ? a.name : a).join(", ")}</div>` 
        : "";
      const variantText = item.selectedVariant 
        ? `<div class="item-sub">Portion: ${typeof item.selectedVariant === "object" ? (item.selectedVariant as any).name : item.selectedVariant}</div>` 
        : "";
      const noteText = item.specialInstructions ? `<div class="item-sub" style="font-weight: bold;">Note: ${item.specialInstructions}</div>` : "";
      
      itemsHtml += `
        <tr class="item-row">
          <td class="item-name-cell">
            <span class="item-qty">${item.quantity}x</span> ${item.name}
            ${variantText}
            ${addonsText}
            ${noteText}
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

    const taxRow = (order.cgst > 0 || order.sgst > 0)
      ? `
        <div class="summary-row">
          <span>CGST (2.5%):</span>
          <span>₹${Math.round(order.cgst || 0)}</span>
        </div>
        <div class="summary-row">
          <span>SGST (2.5%):</span>
          <span>₹${Math.round(order.sgst || 0)}</span>
        </div>
      `
      : "";

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Receipt - Order #${order._id.slice(-6).toUpperCase()}</title>
          <style>
            @page {
              size: ${is58mm ? "58mm auto" : "80mm auto"};
              margin: 0;
            }
            * {
              box-sizing: border-box;
            }
            body {
              margin: 0;
              padding: ${is58mm ? "6px 4px" : "12px 8px"};
              font-family: 'Merchant Copy', 'Courier New', Courier, monospace;
              color: #000000;
              background-color: #ffffff;
              font-size: ${is58mm ? "11px" : "13px"};
              line-height: 1.25;
              width: ${is58mm ? "48mm" : "72mm"};
              max-width: 100%;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .receipt-header {
              text-align: center;
              margin-bottom: 6px;
            }
            .restaurant-name {
              font-size: ${is58mm ? "14px" : "17px"};
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 3px;
            }
            .info-line {
              margin-bottom: 2px;
              font-size: ${is58mm ? "10px" : "11px"};
            }
            .bill-type {
              margin-top: 4px;
              font-weight: bold;
              text-transform: uppercase;
              font-size: ${is58mm ? "10px" : "12px"};
            }
            .divider {
              border-top: 1px dashed #000000;
              margin: 6px 0;
            }
            .order-meta {
              font-size: ${is58mm ? "10px" : "12px"};
              line-height: 1.35;
            }
            .order-meta div {
              display: flex;
              justify-content: space-between;
            }
            .order-meta strong {
              text-transform: uppercase;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin: 6px 0;
              font-size: ${is58mm ? "10px" : "12px"};
            }
            .items-table th {
              border-bottom: 1px dashed #000;
              padding-bottom: 3px;
              font-weight: bold;
            }
            .item-row td {
              padding: 3px 0;
              vertical-align: top;
            }
            .item-name-cell {
              text-align: left;
              word-break: break-word;
            }
            .item-qty {
              font-weight: bold;
            }
            .item-sub {
              font-size: ${is58mm ? "9px" : "10px"};
              padding-left: 8px;
              color: #333;
            }
            .item-price-cell {
              text-align: right;
              width: 25%;
              white-space: nowrap;
            }
            .item-total-cell {
              text-align: right;
              width: 25%;
              white-space: nowrap;
              font-weight: bold;
            }
            .summary-section {
              margin: 6px 0;
              line-height: 1.4;
              font-size: ${is58mm ? "10px" : "12px"};
            }
            .summary-row {
              display: flex;
              justify-content: space-between;
              padding: 1px 0;
            }
            .total-row {
              font-weight: 900;
              font-size: ${is58mm ? "13px" : "16px"};
              margin-top: 4px;
              border-top: 1px dashed #000;
              border-bottom: 1px dashed #000;
              padding: 4px 0;
            }
            .payment-info {
              font-size: ${is58mm ? "10px" : "11px"};
              margin: 6px 0;
              text-align: left;
            }
            .payment-info div {
              display: flex;
              justify-content: space-between;
            }
            .footer-msg {
              text-align: center;
              font-size: ${is58mm ? "9px" : "11px"};
              margin-top: 10px;
              line-height: 1.35;
            }
            @media print {
              html, body {
                width: 100% !important;
                margin: 0 !important;
                padding: 4px !important;
              }
              .divider {
                border-top: 1px dashed #000 !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="receipt-header">
            <div class="restaurant-name">${restName.toUpperCase()}</div>
            ${restAddress ? `<div class="info-line">${restAddress}</div>` : ""}
            ${restPhone ? `<div class="info-line">Phone: ${restPhone}</div>` : ""}
            ${gstNo ? `<div class="info-line">GSTIN: <strong>${gstNo}</strong></div>` : ""}
            <div class="bill-type">*** TAX INVOICE / RECEIPT ***</div>
          </div>
          <div class="divider"></div>
          <div class="order-meta">
            <div><span>INVOICE NO:</span> <strong>#${order._id.slice(-6).toUpperCase()}</strong></div>
            <div><span>TABLE NO:</span> <strong>TABLE ${order.tableId?.tableNumber || "N/A"}</strong></div>
            <div><span>GUEST:</span> <span>${order.customerName || "Dine-in Guest"}</span></div>
            ${order.customerPhone ? `<div><span>CONTACT:</span> <span>${order.customerPhone}</span></div>` : ""}
            <div><span>DATE:</span> <span>${new Date(order.createdAt).toLocaleDateString()}</span></div>
            <div><span>TIME:</span> <span>${new Date(order.createdAt).toLocaleTimeString()}</span></div>
            ${order.specialInstructions ? `<div style="margin-top: 2px;"><span>NOTE:</span> <strong>${order.specialInstructions}</strong></div>` : ""}
          </div>
          <div class="divider"></div>
          <table class="items-table">
            <thead>
              <tr>
                <th style="text-align: left;">Item</th>
                <th style="text-align: right;">Rate</th>
                <th style="text-align: right;">Amount</th>
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
            ${taxRow}
            <div class="summary-row total-row">
              <span>NET TOTAL:</span>
              <span>₹${Math.round(order.total)}</span>
            </div>
          </div>
          <div class="payment-info">
            <div><span>Payment Mode:</span> <strong>${order.paymentMethod || "CASH"}</strong></div>
            <div><span>Status:</span> <strong>${order.paymentStatus ? order.paymentStatus.toUpperCase() : "PAID"}</strong></div>
          </div>
          <div class="divider"></div>
          <div class="footer-msg">
            <div>*** THANK YOU FOR DINING WITH US! ***</div>
            <div style="font-size: 9px; margin-top: 4px;">Software by ServeDesk · alvoratech.com</div>
          </div>
          <script>
            window.onload = function() {
              window.focus();
              window.print();
              setTimeout(() => { window.close(); }, 300);
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
                <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex justify-between items-start gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black text-slate-900">
                        Table {order.tableId?.tableNumber || "T-N/A"}
                      </h3>
                      <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1 bg-white border border-slate-200 px-2 py-0.5 rounded-lg shadow-2xs">
                        <User className="h-3 w-3 text-orange-500 shrink-0" />
                        <span className="truncate max-w-[110px]">{order.customerName || "Guest"}</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-semibold">
                      <span>ID: #{order._id.slice(-6).toUpperCase()}</span>
                      <span>•</span>
                      <span>{new Date(order.createdAt).toLocaleTimeString()}</span>
                      {order.customerPhone && (
                        <>
                          <span>•</span>
                          <span className="text-slate-700 font-bold flex items-center gap-0.5">
                            <Phone className="h-2.5 w-2.5 text-slate-400" />
                            {order.customerPhone}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0 ${
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

                {/* Kitchen / Cooking Note */}
                {order.specialInstructions && (
                  <div className="mx-4 mt-3 bg-amber-50/90 border border-amber-200/90 rounded-xl px-3 py-1.5 flex items-start gap-1.5 text-xs text-amber-900">
                    <span className="font-extrabold text-amber-700 shrink-0">👨‍🍳 Note:</span>
                    <span className="font-semibold text-amber-950">{order.specialInstructions}</span>
                  </div>
                )}

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
                            Portion: {typeof item.selectedVariant === "object" ? (item.selectedVariant as any).name : item.selectedVariant}
                          </p>
                        )}
                        {item.selectedAddons?.length > 0 && (
                          <p className="text-[10px] text-orange-600 font-semibold mt-0.5">
                            + {item.selectedAddons.map((a: any) => typeof a === "object" ? a.name : a).join(", ")}
                          </p>
                        )}
                        {item.specialInstructions && (
                          <p className="text-[10px] text-amber-700 font-bold mt-0.5">
                            Note: {item.specialInstructions}
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
