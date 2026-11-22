"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import apiFetch from "@/lib/api";
import {
  Plus,
  Trash2,
  Printer,
  Loader2,
  TableProperties,
  Eye,
  X,
  RefreshCw,
  Copy,
  ExternalLink,
  Download,
  Sparkles
} from "lucide-react";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import toast from "react-hot-toast";

interface Table {
  _id: string;
  tableNumber: string;
  seatingCapacity: number;
  status: "available" | "occupied" | "reserved";
}

interface QRCode {
  _id: string;
  tableId: string;
  qrCodeUrl: string;
}

export default function TablesPage() {
  const queryClient = useQueryClient();
  const { status } = useSession();
  const [showModal, setShowModal] = useState(false);
  const [tableNumber, setTableNumber] = useState("");
  const [seatingCapacity, setSeatingCapacity] = useState(2);
  const [viewingTable, setViewingTable] = useState<{ number: string; qrUrl: string } | null>(null);

  // Queries
  const { data: response, isLoading } = useQuery<{
    success: boolean;
    tables: Table[];
    qrcodes: QRCode[];
    restaurant?: { name: string; slug?: string };
  }>({
    queryKey: ["admin", "tables"],
    queryFn: () => apiFetch("/api/admin/tables"),
    enabled: status === "authenticated",
  });

  const rawTables = response?.tables || [];
  // Sort naturally 1, 2, 3 ... 35 or T1, T2 ... T35
  const tables = [...rawTables].sort((a, b) => {
    const numA = parseInt(String(a.tableNumber).replace(/\D/g, ""), 10) || 0;
    const numB = parseInt(String(b.tableNumber).replace(/\D/g, ""), 10) || 0;
    if (numA !== numB) return numA - numB;
    return String(a.tableNumber).localeCompare(String(b.tableNumber), undefined, { numeric: true });
  });

  const qrcodes = response?.qrcodes || [];

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload: { tableNumber: string; seatingCapacity: number }) =>
      apiFetch("/api/admin/tables", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      toast.success("Table and QR code created!");
      queryClient.invalidateQueries({ queryKey: ["admin", "tables"] });
      resetForm();
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to create table");
    },
  });

  const bulkCreate35Mutation = useMutation({
    mutationFn: () =>
      apiFetch("/api/admin/tables/bulk-create-35", {
        method: "POST",
      }),
    onSuccess: (res: { message?: string }) => {
      toast.success(res.message || "35 tables created successfully!");
      queryClient.invalidateQueries({ queryKey: ["admin", "tables"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to generate 35 tables");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/admin/tables?id=${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      toast.success("Table deleted");
      queryClient.invalidateQueries({ queryKey: ["admin", "tables"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to delete table");
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: () =>
      apiFetch("/api/admin/tables/regenerate-qrs", {
        method: "POST",
      }),
    onSuccess: (res: { message?: string }) => {
      toast.success(res.message || "QR Codes regenerated to live domain!");
      queryClient.invalidateQueries({ queryKey: ["admin", "tables"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to regenerate QR codes");
    },
  });

  const resetForm = () => {
    setTableNumber("");
    setSeatingCapacity(2);
    setShowModal(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableNumber) return;
    createMutation.mutate({ tableNumber, seatingCapacity });
  };

  const handleDelete = (id: string) => {
    if (confirm("Deactivating this table will delete its associated QR Code. Continue?")) {
      deleteMutation.mutate(id);
    }
  };

  // Download raw QR code image directly
  const downloadRawQR = (tNum: string, qrUrl: string) => {
    const a = document.createElement("a");
    a.download = `Table-${tNum}-QR-Code.png`;
    a.href = qrUrl;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success(`Downloaded Table ${tNum} QR Code!`);
  };

  // Generate and download a high-res branded Table Stand Graphic (PNG)
  const downloadStandImage = (restaurantName: string, tNum: string, qrUrl: string) => {
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 1180;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Background gradient - Luxury deep dark glassmorphic tone
    const gradient = ctx.createLinearGradient(0, 0, 800, 1180);
    gradient.addColorStop(0, "#080c14");
    gradient.addColorStop(0.35, "#0f172a");
    gradient.addColorStop(0.7, "#141d33");
    gradient.addColorStop(1, "#070a11");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 800, 1180);

    // Golden / Orange Premium Accent Outer Frame
    ctx.lineWidth = 5;
    ctx.strokeStyle = "#ea580c";
    ctx.beginPath();
    ctx.roundRect(35, 35, 730, 1110, 36);
    ctx.stroke();

    // Inner sleek luxury line
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "rgba(251, 146, 60, 0.35)";
    ctx.beginPath();
    ctx.roundRect(46, 46, 708, 1088, 30);
    ctx.stroke();

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      // Header Restaurant Name
      ctx.textAlign = "center";
      ctx.fillStyle = "#cbd5e1";
      ctx.font = "800 22px 'Plus Jakarta Sans', sans-serif";
      ctx.letterSpacing = "4px";
      ctx.fillText((restaurantName || "OUR RESTAURANT").toUpperCase(), 400, 105);

      // Table Badge Box (Glowing rounded pill)
      const badgeGrad = ctx.createLinearGradient(240, 130, 560, 205);
      badgeGrad.addColorStop(0, "#ea580c");
      badgeGrad.addColorStop(1, "#f97316");
      ctx.fillStyle = badgeGrad;
      ctx.beginPath();
      ctx.roundRect(240, 130, 320, 72, 36);
      ctx.fill();

      // Table Number text
      ctx.fillStyle = "#ffffff";
      ctx.font = "900 36px 'Plus Jakarta Sans', sans-serif";
      ctx.letterSpacing = "2px";
      ctx.fillText(`TABLE ${tNum}`, 400, 180);

      // Instruction heading
      ctx.fillStyle = "#ffffff";
      ctx.font = "800 32px 'Plus Jakarta Sans', sans-serif";
      ctx.letterSpacing = "0.5px";
      ctx.fillText("Scan QR Code to Order", 400, 260);

      // QR Code Container Box (Crisp Ultra-Clean White Card with Soft Shadow)
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.roundRect(160, 295, 480, 480, 32);
      ctx.fill();

      // Border on QR Box
      ctx.lineWidth = 5;
      ctx.strokeStyle = "#fed7aa";
      ctx.stroke();

      // Render QR Image
      ctx.drawImage(img, 185, 320, 430, 430);

      // Sub-instructions
      ctx.fillStyle = "#f8fafc";
      ctx.font = "700 22px 'Plus Jakarta Sans', sans-serif";
      ctx.fillText("Browse Menu · Customize · Order & Pay", 400, 835);

      ctx.fillStyle = "#fb923c";
      ctx.font = "bold 17px 'Plus Jakarta Sans', sans-serif";
      ctx.fillText("⚡ Instant Contactless Dining · No App Required", 400, 875);

      // Stylish Divider Line
      ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
      ctx.fillRect(200, 915, 400, 1.5);

      // Footer: Powered by ServeDesk & Company Contact Support
      ctx.fillStyle = "#ffffff";
      ctx.font = "900 16px 'Plus Jakarta Sans', sans-serif";
      ctx.letterSpacing = "2px";
      ctx.fillText("SERVEDESK · BY ALVORA TECH SOLUTION", 400, 955);

      // Helpline & Support info on Table Stand
      ctx.fillStyle = "#94a3b8";
      ctx.font = "600 15px 'Plus Jakarta Sans', sans-serif";
      ctx.letterSpacing = "0.5px";
      ctx.fillText("Support Helpline: +91 85628 24281", 400, 995);

      ctx.fillStyle = "#fdba74";
      ctx.font = "600 14px 'Plus Jakarta Sans', sans-serif";
      ctx.fillText("Email: alvora.tech.solution@gmail.com", 400, 1025);

      ctx.fillStyle = "#64748b";
      ctx.font = "500 12px 'Plus Jakarta Sans', sans-serif";
      ctx.fillText("Scan with Camera / Google Lens / Paytm / WhatsApp", 400, 1070);

      // Trigger instant download
      const a = document.createElement("a");
      a.download = `ServeDesk-Table-${tNum}-Scanner-Stand.png`;
      a.href = canvas.toDataURL("image/png");
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success(`Downloaded Table ${tNum} Scanner Stand!`);
    };
    img.src = qrUrl;
  };

  // Download all table scanner cards sequentially
  const handleDownloadAll = async () => {
    const restName = response?.restaurant?.name || "Our Restaurant";
    const validQRs = tables
      .map((t) => ({ table: t, qr: qrcodes.find((q) => q.tableId === t._id) }))
      .filter((item) => item.qr?.qrCodeUrl);

    if (validQRs.length === 0) {
      toast.error("No QR codes available to download");
      return;
    }

    toast.loading(`Downloading ${validQRs.length} table scanners...`, { id: "bulk-download" });

    for (let i = 0; i < validQRs.length; i++) {
      const { table, qr } = validQRs[i];
      await new Promise((resolve) => setTimeout(resolve, 250));
      downloadStandImage(restName, table.tableNumber, qr!.qrCodeUrl);
    }

    toast.success(`All ${validQRs.length} table scanners downloaded!`, { id: "bulk-download" });
  };

  // Print single table sign
  const handlePrint = (qrUrl: string, tNum: string) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const restName = response?.restaurant?.name || "Our Restaurant";

    printWindow.document.write(`
      <html>
        <head>
          <title>Table ${tNum} QR Code</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800;900&display=swap');
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              font-family: 'Plus Jakarta Sans', sans-serif;
              background-color: #ffffff;
              color: #0f172a;
            }
            .container {
              border: 3px solid #ea580c;
              border-radius: 28px;
              padding: 40px 32px;
              text-align: center;
              width: 380px;
              box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
              background: radial-gradient(circle at top left, #ffffff 60%, #fff7ed 100%);
              display: flex;
              flex-direction: column;
              align-items: center;
              box-sizing: border-box;
            }
            .restaurant-name {
              font-size: 16px;
              font-weight: 800;
              color: #64748b;
              letter-spacing: 0.15em;
              margin-bottom: 10px;
              text-transform: uppercase;
            }
            .badge {
              background: linear-gradient(135deg, #ea580c, #f97316);
              color: #ffffff;
              font-size: 26px;
              font-weight: 900;
              padding: 8px 30px;
              border-radius: 9999px;
              letter-spacing: 0.05em;
              box-shadow: 0 4px 14px rgba(234, 88, 12, 0.3);
              display: inline-block;
              margin-bottom: 16px;
            }
            .divider {
              width: 44px;
              height: 3px;
              background-color: #fdba74;
              border-radius: 2px;
              margin-bottom: 16px;
            }
            .instruction {
              font-size: 20px;
              font-weight: 800;
              color: #0f172a;
              margin-bottom: 14px;
              letter-spacing: -0.02em;
            }
            .qr-container {
              padding: 12px;
              background: #ffffff;
              border: 2px solid #fed7aa;
              border-radius: 22px;
              box-shadow: 0 10px 20px -3px rgba(234, 88, 12, 0.1);
              margin-bottom: 16px;
            }
            .qr-container img {
              width: 220px;
              height: 220px;
              display: block;
            }
            .sub-instruction {
              font-size: 12px;
              color: #475569;
              max-width: 280px;
              line-height: 1.5;
              margin-bottom: 16px;
              font-weight: 600;
            }
            .support-box {
              padding-top: 12px;
              border-top: 1px dashed #cbd5e1;
              width: 100%;
              margin-bottom: 6px;
            }
            .company-brand {
              font-size: 10px;
              font-weight: 800;
              color: #ea580c;
              text-transform: uppercase;
              letter-spacing: 0.08em;
              margin-bottom: 3px;
            }
            .support-contact {
              font-size: 10px;
              color: #334155;
              font-weight: 700;
              line-height: 1.4;
            }
            .support-contact span {
              color: #64748b;
              font-weight: 500;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="restaurant-name">${restName.toUpperCase()}</div>
            <div class="badge">TABLE ${tNum}</div>
            <div class="divider"></div>
            <div class="instruction">Scan QR Code to Order</div>
            <div class="qr-container">
              <img src="${qrUrl}" alt="Table QR" />
            </div>
            <div class="sub-instruction">Browse menu, customize items & pay directly from your phone</div>
            <div class="support-box">
              <div class="company-brand">ServeDesk · By Alvora Tech Solution</div>
              <div class="support-contact">Helpline: +91 85628 24281</div>
              <div class="support-contact"><span>Support:</span> alvora.tech.solution@gmail.com</div>
            </div>
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

  // Print all table signs
  const handlePrintAll = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const restName = response?.restaurant?.name || "Our Restaurant";

    let cardsHtml = "";
    tables.forEach((table) => {
      const qr = qrcodes.find((q) => q.tableId === table._id);
      if (qr?.qrCodeUrl) {
        cardsHtml += `
          <div class="table-card">
            <div class="container">
              <div class="restaurant-name">${restName.toUpperCase()}</div>
              <div class="badge">TABLE ${table.tableNumber}</div>
              <div class="divider"></div>
              <div class="instruction">Scan QR Code to Order</div>
              <div class="qr-container">
                <img src="${qr.qrCodeUrl}" alt="Table QR" />
              </div>
              <div class="sub-instruction">Browse menu, customize items & pay directly from your phone</div>
              <div class="support-box">
                <div class="company-brand">ServeDesk · By Alvora Tech Solution</div>
                <div class="support-contact">Helpline: +91 85628 24281</div>
                <div class="support-contact"><span>Support:</span> alvora.tech.solution@gmail.com</div>
              </div>
            </div>
          </div>
        `;
      }
    });

    printWindow.document.write(`
      <html>
        <head>
          <title>All Table QR Codes - ${restName}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800;900&display=swap');
            body {
              margin: 0;
              padding: 0;
              font-family: 'Plus Jakarta Sans', sans-serif;
              background-color: #ffffff;
              color: #0f172a;
            }
            .table-card {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              box-sizing: border-box;
              page-break-after: always;
            }
            .table-card:last-child {
               page-break-after: avoid;
            }
            .container {
              border: 3px solid #ea580c;
              border-radius: 28px;
              padding: 40px 32px;
              text-align: center;
              width: 380px;
              box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
              background: radial-gradient(circle at top left, #ffffff 60%, #fff7ed 100%);
              display: flex;
              flex-direction: column;
              align-items: center;
              box-sizing: border-box;
            }
            .restaurant-name {
              font-size: 16px;
              font-weight: 800;
              color: #64748b;
              letter-spacing: 0.15em;
              margin-bottom: 10px;
              text-transform: uppercase;
            }
            .badge {
              background: linear-gradient(135deg, #ea580c, #f97316);
              color: #ffffff;
              font-size: 26px;
              font-weight: 900;
              padding: 8px 30px;
              border-radius: 9999px;
              letter-spacing: 0.05em;
              box-shadow: 0 4px 14px rgba(234, 88, 12, 0.3);
              display: inline-block;
              margin-bottom: 16px;
            }
            .divider {
              width: 44px;
              height: 3px;
              background-color: #fdba74;
              border-radius: 2px;
              margin-bottom: 16px;
            }
            .instruction {
              font-size: 20px;
              font-weight: 800;
              color: #0f172a;
              margin-bottom: 14px;
            }
            .qr-container {
              padding: 12px;
              background: #ffffff;
              border: 2px solid #fed7aa;
              border-radius: 22px;
              box-shadow: 0 10px 20px -3px rgba(234, 88, 12, 0.1);
              margin-bottom: 16px;
            }
            .qr-container img {
              width: 220px;
              height: 220px;
              display: block;
            }
            .sub-instruction {
              font-size: 12px;
              color: #475569;
              max-width: 280px;
              line-height: 1.5;
              margin-bottom: 16px;
              font-weight: 600;
            }
            .support-box {
              padding-top: 12px;
              border-top: 1px dashed #cbd5e1;
              width: 100%;
              margin-bottom: 6px;
            }
            .company-brand {
              font-size: 10px;
              font-weight: 800;
              color: #ea580c;
              text-transform: uppercase;
              letter-spacing: 0.08em;
              margin-bottom: 3px;
            }
            .support-contact {
              font-size: 10px;
              color: #334155;
              font-weight: 700;
              line-height: 1.4;
            }
            .support-contact span {
              color: #64748b;
              font-weight: 500;
            }
            @media print {
              body {
                background-color: #ffffff;
              }
              .table-card {
                height: 100vh;
              }
            }
          </style>
        </head>
        <body>
          ${cardsHtml}
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

  return (
    <div className="space-y-8">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            Tables & QR Scanners
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-orange-50 text-orange-600 border border-orange-200">
              {tables.length} Tables Active
            </span>
          </h1>
          <p className="text-slate-500 mt-1 text-sm font-medium">
            Manage restaurant seating zones, download high-definition scanner stands, and print QR codes.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            onClick={() => bulkCreate35Mutation.mutate()}
            disabled={bulkCreate35Mutation.isPending}
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold flex items-center gap-2 text-xs shadow-lg shadow-orange-500/20 active:scale-95 transition-all cursor-pointer"
          >
            {bulkCreate35Mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            ⚡ Add / Ensure 35 Tables
          </Button>

          <Button
            onClick={handleDownloadAll}
            disabled={tables.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-2 text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
          >
            <Download className="h-4 w-4" />
            Download All Scanners
          </Button>

          <button
            type="button"
            onClick={() => regenerateMutation.mutate()}
            disabled={regenerateMutation.isPending}
            className="bg-white hover:bg-slate-50 text-slate-700 font-bold border border-slate-200 px-3.5 py-2 rounded-xl flex items-center gap-2 text-xs active:scale-95 transition-all cursor-pointer shadow-xs disabled:opacity-60"
          >
            {regenerateMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5 text-orange-500" />
            )}
            <span>Sync QR Domain</span>
          </button>

          <Button
            onClick={() => setShowModal(true)}
            className="bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white font-semibold flex items-center gap-2 text-xs active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Add Single Table
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-10 w-10 text-orange-500 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {tables.map((table) => {
            const qr = qrcodes.find((q) => q.tableId === table._id);
            return (
              <Card
                key={table._id}
                className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between items-center text-center relative hover:border-slate-300 hover:shadow-md transition-all duration-200 shadow-xs"
              >
                <div className="space-y-3 w-full">
                  <div className="flex justify-between items-start w-full">
                    <span
                      className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                        table.status === "available"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : table.status === "occupied"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-blue-50 text-blue-700 border-blue-200"
                      }`}
                    >
                      {table.status}
                    </span>
                    <button
                      onClick={() => handleDelete(table._id)}
                      className="text-slate-400 hover:text-red-500 transition-colors p-1 cursor-pointer"
                      title="Delete Table"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-orange-600 border border-orange-100 shadow-xs">
                    <TableProperties className="h-6 w-6" />
                  </div>

                  <div>
                    <h3 className="text-lg font-black text-slate-900">Table {table.tableNumber}</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">{table.seatingCapacity} Seater Capacity</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-1.5 w-full pt-3 border-t border-slate-100">
                  {qr?.qrCodeUrl ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setViewingTable({ number: table.tableNumber, qrUrl: qr.qrCodeUrl })}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold py-1.5 px-1 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer"
                        title="View QR Code"
                      >
                        <Eye className="h-3 w-3 text-slate-500" />
                        <span>View</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          downloadStandImage(
                            response?.restaurant?.name || "Our Restaurant",
                            table.tableNumber,
                            qr.qrCodeUrl
                          )
                        }
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold py-1.5 px-1 rounded-lg flex items-center justify-center gap-1 transition-all shadow-xs cursor-pointer"
                        title="Download Scanner Stand Graphic"
                      >
                        <Download className="h-3 w-3" />
                        <span>Save</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handlePrint(qr.qrCodeUrl, table.tableNumber)}
                        className="bg-orange-500 hover:bg-orange-600 text-white text-[11px] font-bold py-1.5 px-1 rounded-lg flex items-center justify-center gap-1 transition-all shadow-xs cursor-pointer"
                        title="Print Table Sign"
                      >
                        <Printer className="h-3 w-3" />
                        <span>Print</span>
                      </button>
                    </>
                  ) : (
                    <span className="col-span-3 text-[10px] text-slate-400 py-1 text-center">QR pending</span>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Bulk action print & download bar */}
      {!isLoading && tables.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-4 pt-8 border-t border-slate-200">
          <Button
            onClick={handleDownloadAll}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-7 py-3.5 rounded-xl shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-transform active:scale-[0.98] cursor-pointer"
          >
            <Download className="h-5 w-5" />
            Download All {tables.length} Table Scanners (PNG)
          </Button>

          <Button
            onClick={handlePrintAll}
            className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold px-7 py-3.5 rounded-xl shadow-lg shadow-orange-500/20 flex items-center gap-2 transition-transform active:scale-[0.98] cursor-pointer"
          >
            <Printer className="h-5 w-5" />
            Print All Table Signs ({tables.length} Tables / PDF)
          </Button>
        </div>
      )}

      {/* Add Table Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in-50 zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-orange-50 border border-orange-200 rounded-xl text-orange-600">
                  <TableProperties className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900">Add Dining Table</h2>
                  <p className="text-[11px] text-slate-500">Configure number & seating</p>
                </div>
              </div>
              <button
                type="button"
                onClick={resetForm}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <Input
                label="Table Number / Label *"
                type="text"
                placeholder="e.g. 1, 2, 35 or T-1"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl focus:bg-white focus:border-orange-500"
                labelClassName="text-slate-700 font-bold text-xs"
                required
              />

              <Input
                label="Seating Capacity *"
                type="number"
                placeholder="4"
                min={1}
                value={seatingCapacity}
                onChange={(e) => setSeatingCapacity(Number(e.target.value))}
                className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl focus:bg-white focus:border-orange-500"
                labelClassName="text-slate-700 font-bold text-xs"
                required
              />

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  onClick={resetForm}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs px-4 py-2.5 rounded-xl cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-orange-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save Table
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View QR Code Modal overlay */}
      {viewingTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl p-6 relative animate-in fade-in-50 zoom-in-95 duration-150 text-center space-y-4">
            <div className="absolute top-4 right-4">
              <button
                type="button"
                onClick={() => setViewingTable(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="pt-2 text-center space-y-3">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                  {response?.restaurant?.name || "Our Restaurant"}
                </p>
                <h3 className="text-2xl font-black text-slate-900 mt-0.5">TABLE {viewingTable.number}</h3>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-2xl inline-block shadow-inner">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={viewingTable.qrUrl} alt="Preview QR" className="h-52 w-52 mx-auto" />
              </div>

              <div className="space-y-2">
                <p className="text-xs text-slate-500 max-w-[260px] mx-auto leading-relaxed">
                  Guests scan this QR to view the menu, select items & pay directly from their phone.
                </p>

                <div className="flex items-center justify-center gap-2">
                  <a
                    href={`/${response?.restaurant?.slug || "tasty-bites"}/table/${viewingTable.number}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs bg-orange-50 border border-orange-200 text-orange-600 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-orange-100 transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Test Menu View
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      const domain = process.env.NEXT_PUBLIC_APP_URL || "https://servedesk.tech";
                      const fullUrl = `${domain}/${response?.restaurant?.slug || "tasty-bites"}/table/${viewingTable.number}`;
                      navigator.clipboard.writeText(fullUrl);
                      toast.success("Copied QR Menu URL to clipboard!");
                    }}
                    className="text-xs bg-slate-100 border border-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    <Copy className="h-3.5 w-3.5" /> Copy URL
                  </button>
                </div>
              </div>
            </div>

            {/* Action buttons in Modal */}
            <div className="space-y-2 pt-3 border-t border-slate-100">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() =>
                    downloadStandImage(
                      response?.restaurant?.name || "Our Restaurant",
                      viewingTable.number,
                      viewingTable.qrUrl
                    )
                  }
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 py-2.5 rounded-xl cursor-pointer shadow-md shadow-emerald-600/20"
                >
                  <Download className="h-3.5 w-3.5" />
                  Stand Graphic
                </Button>

                <Button
                  onClick={() => downloadRawQR(viewingTable.number, viewingTable.qrUrl)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-slate-200 cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5 text-orange-500" />
                  Raw QR (.png)
                </Button>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => handlePrint(viewingTable.qrUrl, viewingTable.number)}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 py-2.5 rounded-xl cursor-pointer shadow-md shadow-orange-500/20"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print Sign
                </Button>
                <Button
                  onClick={() => setViewingTable(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs px-4 rounded-xl cursor-pointer"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
