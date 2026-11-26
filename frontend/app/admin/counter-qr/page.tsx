"use client";

import React, { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import apiFetch from "@/lib/api";
import {
  QrCode,
  Printer,
  Copy,
  ExternalLink,
  Download,
  Sparkles,
  ShoppingBag,
  Store,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import toast from "react-hot-toast";

interface CounterQrResponse {
  success: boolean;
  data: {
    restaurantName: string;
    restaurantSlug: string;
    tableNumber: string;
    orderUrl: string;
    qrCodeUrl: string;
  };
}

export default function CounterQrPage() {
  const standeeRef = useRef<HTMLDivElement>(null);

  const { data: response, isLoading } = useQuery<CounterQrResponse>({
    queryKey: ["admin", "counter-qr"],
    queryFn: () => apiFetch("/api/admin/counter-qr"),
  });

  const qrData = response?.data;

  const handleCopyLink = () => {
    if (!qrData?.orderUrl) return;
    navigator.clipboard.writeText(qrData.orderUrl);
    toast.success("Takeaway Counter order link copied!");
  };

  const handlePrintStandee = () => {
    if (!qrData?.qrCodeUrl) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Please allow popups to print standee");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Counter Takeaway QR - ${qrData.restaurantName}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;700;800;900&display=swap');
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
            * { box-sizing: border-box; }
            body {
              font-family: 'Plus Jakarta Sans', sans-serif;
              margin: 0;
              padding: 20px;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              background-color: #f8fafc;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .standee-card {
              width: 380px;
              background: #ffffff;
              border: 3px solid #0f172a;
              border-radius: 36px;
              padding: 36px 28px;
              text-align: center;
              box-shadow: 0 20px 40px -15px rgba(0,0,0,0.15);
            }
            .badge {
              display: inline-block;
              background: #ffedd5;
              color: #c2410c;
              font-size: 11px;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 1.5px;
              padding: 6px 16px;
              border-radius: 20px;
              margin-bottom: 12px;
              border: 1px solid #fdba74;
            }
            .restro-title {
              font-size: 26px;
              font-weight: 900;
              color: #0f172a;
              margin: 0 0 4px 0;
              line-height: 1.2;
            }
            .subtitle {
              font-size: 13px;
              color: #64748b;
              font-weight: 700;
              margin-bottom: 24px;
            }
            .qr-wrapper {
              background: #ffffff;
              border: 3px solid #ea580c;
              border-radius: 28px;
              padding: 16px;
              display: inline-block;
              margin-bottom: 20px;
              box-shadow: 0 10px 25px -5px rgba(234, 88, 12, 0.2);
            }
            .qr-wrapper img {
              width: 220px;
              height: 220px;
              display: block;
            }
            .scan-callout {
              font-size: 17px;
              font-weight: 900;
              color: #0f172a;
              margin-bottom: 4px;
            }
            .instruction {
              font-size: 12px;
              color: #64748b;
              font-weight: 600;
              line-height: 1.4;
              margin-bottom: 20px;
            }
            .footer-tag {
              border-top: 1px dashed #cbd5e1;
              padding-top: 14px;
              font-size: 10px;
              color: #94a3b8;
              font-weight: 700;
              letter-spacing: 0.5px;
            }
          </style>
        </head>
        <body>
          <div class="standee-card">
            <div class="badge">🛍️ TAKEAWAY & PARCEL</div>
            <h1 class="restro-title">${qrData.restaurantName}</h1>
            <div class="subtitle">Billing & Receipt Counter Desk</div>
            
            <div class="qr-wrapper">
              <img src="${qrData.qrCodeUrl}" alt="Takeaway QR Code" />
            </div>

            <div class="scan-callout">SCAN TO ORDER PARCEL</div>
            <div class="instruction">
              Apne mobile camera se scan karein, dishes choose karein aur counter se apna order collect karein.
            </div>

            <div class="footer-tag">
              SERVEDESK · POWERED BY ALVORA TECH
            </div>
          </div>
          <script>
            window.onload = function() {
              window.focus();
              window.print();
              setTimeout(() => { window.close(); }, 400);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadQrImage = () => {
    if (!qrData?.qrCodeUrl) return;
    const link = document.createElement("a");
    link.href = qrData.qrCodeUrl;
    link.download = `Counter_Takeaway_QR_${qrData.restaurantSlug}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Counter QR Image Downloaded!");
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Store className="h-6 w-6 text-orange-500" />
            <span>Counter Scanner (Takeaway / Parcel)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Receipt / Billing counter par rakhne ke liye dedicated scanner. Customers scan karke takeaway order place kar sakte hain.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handlePrintStandee}
            disabled={isLoading || !qrData?.qrCodeUrl}
            className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs h-10 px-4 rounded-xl flex items-center gap-1.5 shadow-sm border-none cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            <span>Print Counter Standee</span>
          </Button>

          <Button
            onClick={handleDownloadQrImage}
            disabled={isLoading || !qrData?.qrCodeUrl}
            className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs h-10 px-4 rounded-xl flex items-center gap-1.5 border border-slate-200 cursor-pointer"
          >
            <Download className="h-4 w-4 text-slate-600" />
            <span>Download PNG</span>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="h-80 flex items-center justify-center bg-white rounded-2xl border border-slate-200">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left: Standee Visual Mockup Preview */}
          <div className="md:col-span-1 flex flex-col items-center">
            <div
              ref={standeeRef}
              className="w-full max-w-[320px] bg-white border-2 border-slate-900 rounded-3xl p-6 text-center shadow-xl shadow-slate-200/70 space-y-4"
            >
              <div className="inline-block bg-orange-100 text-orange-700 text-[10px] font-black uppercase px-3 py-1 rounded-full border border-orange-200">
                🛍️ Takeaway / Parcel Desk
              </div>

              <div>
                <h3 className="text-lg font-black text-slate-900 leading-tight">
                  {qrData?.restaurantName || "Restaurant"}
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">Receipt & Billing Counter</p>
              </div>

              {/* QR Image */}
              <div className="p-3 bg-white border-2 border-orange-500 rounded-2xl inline-block shadow-md shadow-orange-500/10">
                {qrData?.qrCodeUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qrData.qrCodeUrl}
                    alt="Counter Takeaway QR"
                    className="w-44 h-44 object-contain mx-auto"
                  />
                ) : (
                  <div className="w-44 h-44 flex items-center justify-center text-xs text-slate-400">
                    Generating QR...
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <div className="text-xs font-black text-slate-900 uppercase tracking-wide">
                  Scan To Order Parcel
                </div>
                <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                  Scan karein, order choose karein aur seedha counter se collect karein.
                </p>
              </div>

              <div className="pt-3 border-t border-dashed border-slate-200 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                ServeDesk · Alvora Tech
              </div>
            </div>
          </div>

          {/* Right: Info & Workflow explanation */}
          <div className="md:col-span-2 space-y-5">
            {/* Direct Order URL Box */}
            <Card className="p-5 bg-white border border-slate-200/90 rounded-2xl shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <QrCode className="h-4 w-4 text-orange-500" />
                <span>Counter Takeaway Direct Link</span>
              </h3>
              <p className="text-xs text-slate-500">
                Is link ko WhatsApp ya social media par bhi bhej sakte hain jisse customer seedha takeaway order kar sake.
              </p>

              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-2">
                <input
                  type="text"
                  readOnly
                  value={qrData?.orderUrl || ""}
                  className="bg-transparent text-xs text-slate-700 font-mono flex-1 outline-none px-2"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                >
                  <Copy className="h-3 w-3" />
                  <span>Copy</span>
                </button>
                <a
                  href={qrData?.orderUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-2xs"
                >
                  <ExternalLink className="h-3 w-3" />
                  <span>Open</span>
                </a>
              </div>
            </Card>

            {/* How It Works Card */}
            <Card className="p-5 bg-white border border-slate-200/90 rounded-2xl shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-orange-500" />
                <span>Counter Scanner Kaise Kaam Karta Hai?</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/70 space-y-1.5">
                  <div className="h-7 w-7 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-black text-xs">
                    1
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">Desk Par Standee Lagayein</h4>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    Upgradation ke baad is QR standee ka print nikal kar receipt/billing desk par laga dein.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/70 space-y-1.5">
                  <div className="h-7 w-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-black text-xs">
                    2
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">Customer Scans for Parcel</h4>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    Customer scan karega aur menu se apne parcel dishes select karke send karega.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/70 space-y-1.5">
                  <div className="h-7 w-7 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center font-black text-xs">
                    3
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">Kitchen & Sound Alert</h4>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    System bol kar alert karega: <em>"Counter se naya Takeaway order aaya hai"</em> aur order par Takeaway tag lagega.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-orange-50/80 border border-orange-200/80 text-xs text-orange-900 flex items-center gap-2.5">
                <CheckCircle2 className="h-4.5 w-4.5 text-orange-600 shrink-0" />
                <span>
                  Is scanner se aane wale sabhi orders <strong>Live Orders</strong> screen par alag se <strong>"Takeaway / Counter"</strong> tag ke saath dikhenge.
                </span>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
