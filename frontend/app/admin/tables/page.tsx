"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  const [showModal, setShowModal] = useState(false);
  const [tableNumber, setTableNumber] = useState("");
  const [seatingCapacity, setSeatingCapacity] = useState(2);
  const [viewingTable, setViewingTable] = useState<{ number: string; qrUrl: string } | null>(null);

  // Queries
  const { data: response, isLoading } = useQuery<{
    success: boolean;
    tables: Table[];
    qrcodes: QRCode[];
    restaurant?: { name: string };
  }>({
    queryKey: ["admin", "tables"],
    queryFn: () => apiFetch("/api/admin/tables"),
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
    canvas.height = 1100;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 800, 1100);
    gradient.addColorStop(0, "#0a0e17");
    gradient.addColorStop(0.5, "#131b2c");
    gradient.addColorStop(1, "#070a10");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 800, 1100);

    // Border Accent
    ctx.lineWidth = 6;
    ctx.strokeStyle = "#ea580c";
    ctx.beginPath();
    ctx.roundRect(40, 40, 720, 1020, 36);
    ctx.stroke();

    // Inner subtle glow border
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.beginPath();
    ctx.roundRect(50, 50, 700, 1000, 30);
    ctx.stroke();

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      // Header Restaurant Name
      ctx.textAlign = "center";
      ctx.fillStyle = "#94a3b8";
      ctx.font = "800 22px sans-serif";
      ctx.letterSpacing = "4px";
      ctx.fillText((restaurantName || "OUR RESTAURANT").toUpperCase(), 400, 115);

      // Table Badge Box
      ctx.fillStyle = "#ea580c";
      ctx.beginPath();
      ctx.roundRect(260, 150, 280, 68, 34);
      ctx.fill();

      // Table Number text
      ctx.fillStyle = "#ffffff";
      ctx.font = "900 34px sans-serif";
      ctx.fillText(`TABLE ${tNum}`, 400, 196);

      // Instruction heading
      ctx.fillStyle = "#ffffff";
      ctx.font = "800 32px sans-serif";
      ctx.fillText("Scan QR Code to Order", 400, 285);

      // QR Code Container Box (Crisp White Card)
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.roundRect(160, 325, 480, 480, 28);
      ctx.fill();

      // Border on QR Box
      ctx.lineWidth = 4;
      ctx.strokeStyle = "#fdba74";
      ctx.stroke();

      // Render QR Image
      ctx.drawImage(img, 185, 350, 430, 430);

      // Sub-instructions
      ctx.fillStyle = "#cbd5e1";
      ctx.font = "600 22px sans-serif";
      ctx.fillText("Browse Menu · Customize · Order & Pay", 400, 865);

      ctx.fillStyle = "#f97316";
      ctx.font = "bold 18px sans-serif";
      ctx.fillText("⚡ Instant Digital Dining · No App Required", 400, 915);

      // Footer branding
      ctx.fillStyle = "#64748b";
      ctx.font = "800 15px sans-serif";
      ctx.letterSpacing = "2px";
      ctx.fillText("POWERED BY SERVEDESK", 400, 990);

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
              border: 4px solid #ea580c;
              border-radius: 28px;
              padding: 50px 40px;
              text-align: center;
              width: 380px;
              box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
              background: radial-gradient(circle at top left, #fff 60%, #fff7ed 100%);
              display: flex;
              flex-direction: column;
              align-items: center;
              box-sizing: border-box;
            }
            .restaurant-name {
              font-size: 18px;
              font-weight: 800;
              color: #64748b;
              letter-spacing: 0.15em;
              margin-bottom: 12px;
              text-transform: uppercase;
            }
            .badge {
              background-color: #ea580c;
              color: #ffffff;
              font-size: 30px;
              font-weight: 900;
              padding: 8px 28px;
              border-radius: 9999px;
              letter-spacing: 0.05em;
              box-shadow: 0 4px 10px rgba(234, 88, 12, 0.2);
              display: inline-block;
              margin-bottom: 20px;
            }
            .divider {
              width: 50px;
              height: 4px;
              background-color: #fdba74;
              border-radius: 2px;
              margin-bottom: 20px;
            }
            .instruction {
              font-size: 22px;
              font-weight: 800;
              color: #0f172a;
              margin-bottom: 15px;
            }
            .qr-container {
              padding: 12px;
              background: #ffffff;
              border: 2px solid #e2e8f0;
              border-radius: 20px;
              box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05);
              margin-bottom: 20px;
            }
            .qr-container img {
              width: 220px;
              height: 220px;
              display: block;
            }
            .sub-instruction {
              font-size: 12px;
              color: #64748b;
              max-width: 260px;
              line-height: 1.5;
              margin-bottom: 20px;
              font-weight: 500;
            }
            .footer {
              font-size: 10px;
              color: #cbd5e1;
              font-weight: 650;
              text-transform: uppercase;
              letter-spacing: 0.1em;
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
            <div class="footer">Powered by ServeDesk</div>
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
              <div class="footer">Powered by ServeDesk</div>
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
            @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800;900&display=swap');
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
              border: 4px solid #ea580c;
              border-radius: 28px;
              padding: 50px 40px;
              text-align: center;
              width: 380px;
              box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
              background: radial-gradient(circle at top left, #fff 60%, #fff7ed 100%);
              display: flex;
              flex-direction: column;
              align-items: center;
              box-sizing: border-box;
            }
            .restaurant-name {
              font-size: 18px;
              font-weight: 800;
              color: #64748b;
              letter-spacing: 0.15em;
              margin-bottom: 12px;
              text-transform: uppercase;
            }
            .badge {
              background-color: #ea580c;
              color: #ffffff;
              font-size: 30px;
              font-weight: 900;
              padding: 8px 28px;
              border-radius: 9999px;
              letter-spacing: 0.05em;
              box-shadow: 0 4px 10px rgba(234, 88, 12, 0.2);
              display: inline-block;
              margin-bottom: 20px;
            }
            .divider {
              width: 50px;
              height: 4px;
              background-color: #fdba74;
              border-radius: 2px;
              margin-bottom: 20px;
            }
            .instruction {
              font-size: 22px;
              font-weight: 800;
              color: #0f172a;
              margin-bottom: 15px;
            }
            .qr-container {
              padding: 12px;
              background: #ffffff;
              border: 2px solid #e2e8f0;
              border-radius: 20px;
              box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05);
              margin-bottom: 20px;
            }
            .qr-container img {
              width: 220px;
              height: 220px;
              display: block;
            }
            .sub-instruction {
              font-size: 12px;
              color: #64748b;
              max-width: 260px;
              line-height: 1.5;
              margin-bottom: 20px;
              font-weight: 500;
            }
            .footer {
              font-size: 10px;
              color: #cbd5e1;
              font-weight: 650;
              text-transform: uppercase;
              letter-spacing: 0.1em;
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
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            Tables & QR Scanners
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/30">
              {tables.length} Tables Active
            </span>
          </h1>
          <p className="text-slate-400 mt-1">
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

          <Button
            onClick={() => regenerateMutation.mutate()}
            disabled={regenerateMutation.isPending}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold border border-slate-700 flex items-center gap-2 text-xs active:scale-95 transition-all cursor-pointer"
          >
            {regenerateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 text-orange-400" />
            )}
            Sync QR Domain
          </Button>

          <Button
            onClick={() => setShowModal(true)}
            className="bg-slate-900 border border-slate-800 hover:bg-slate-850 text-white font-semibold flex items-center gap-2 text-xs active:scale-95 transition-all cursor-pointer"
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
                className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between items-center text-center relative hover:border-slate-700/80 hover:bg-slate-900/60 transition-all duration-200 shadow-lg"
              >
                <div className="space-y-3 w-full">
                  <div className="flex justify-between items-start w-full">
                    <span
                      className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                        table.status === "available"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : table.status === "occupied"
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                      }`}
                    >
                      {table.status}
                    </span>
                    <button
                      onClick={() => handleDelete(table._id)}
                      className="text-slate-500 hover:text-red-500 transition-colors p-1 cursor-pointer"
                      title="Delete Table"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20 shadow-inner">
                    <TableProperties className="h-6 w-6" />
                  </div>

                  <div>
                    <h3 className="text-lg font-black text-white">Table {table.tableNumber}</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">{table.seatingCapacity} Seater Capacity</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-1 w-full pt-3 border-t border-slate-800/80">
                  {qr?.qrCodeUrl ? (
                    <>
                      <Button
                        size="sm"
                        onClick={() => setViewingTable({ number: table.tableNumber, qrUrl: qr.qrCodeUrl })}
                        className="bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-[11px] px-2 py-1 flex items-center justify-center gap-1 flex-1 cursor-pointer"
                        title="View QR Code"
                      >
                        <Eye className="h-3 w-3" />
                        View
                      </Button>

                      <Button
                        size="sm"
                        onClick={() =>
                          downloadStandImage(
                            response?.restaurant?.name || "Our Restaurant",
                            table.tableNumber,
                            qr.qrCodeUrl
                          )
                        }
                        className="bg-emerald-600/90 hover:bg-emerald-600 text-white text-[11px] px-2 py-1 flex items-center justify-center gap-1 flex-1 cursor-pointer"
                        title="Download Scanner Card Graphic"
                      >
                        <Download className="h-3 w-3" />
                        Download
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => handlePrint(qr.qrCodeUrl, table.tableNumber)}
                        className="bg-orange-600 hover:bg-orange-700 text-white text-[11px] px-2 py-1 flex items-center justify-center gap-1 flex-1 cursor-pointer"
                        title="Print Table Sign"
                      >
                        <Printer className="h-3 w-3" />
                        Print
                      </Button>
                    </>
                  ) : (
                    <span className="text-[10px] text-slate-500 py-1">QR pending</span>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Bulk action print & download bar */}
      {!isLoading && tables.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-4 pt-8 border-t border-slate-900">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in-50 zoom-in-95 duration-150">
            <div className="p-6 border-b border-slate-850 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Add Dining Table</h2>
              <button onClick={resetForm} className="text-slate-400 hover:text-white cursor-pointer">
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
                required
              />

              <Input
                label="Seating Capacity *"
                type="number"
                placeholder="4"
                min={1}
                value={seatingCapacity}
                onChange={(e) => setSeatingCapacity(Number(e.target.value))}
                required
              />

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-850">
                <Button
                  type="button"
                  onClick={resetForm}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold flex items-center gap-2 cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-850/85 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl p-6 relative animate-in fade-in-50 zoom-in-95 duration-150 text-center space-y-4">
            <div className="absolute top-4 right-4">
              <button
                onClick={() => setViewingTable(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="pt-2 text-center space-y-3">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                  {response?.restaurant?.name || "Our Restaurant"}
                </p>
                <h3 className="text-2xl font-black text-white mt-0.5">TABLE {viewingTable.number}</h3>
              </div>

              <div className="bg-white p-3 rounded-2xl inline-block shadow-md">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={viewingTable.qrUrl} alt="Preview QR" className="h-52 w-52 mx-auto" />
              </div>

              <div className="space-y-2">
                <p className="text-xs text-slate-400 max-w-[260px] mx-auto leading-relaxed">
                  Guests scan this QR to view the menu, select items & pay directly from their phone.
                </p>

                <div className="flex items-center justify-center gap-2">
                  <a
                    href={`/tasty-bites/table/${viewingTable.number}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs bg-orange-500/10 border border-orange-500/30 text-orange-400 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-orange-500/20 transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Test Menu View
                  </a>
                  <button
                    onClick={() => {
                      const domain = process.env.NEXT_PUBLIC_APP_URL || "https://restro-saas-website.vercel.app";
                      const fullUrl = `${domain}/tasty-bites/table/${viewingTable.number}`;
                      navigator.clipboard.writeText(fullUrl);
                      toast.success("Copied QR Menu URL to clipboard!");
                    }}
                    className="text-xs bg-slate-800 border border-slate-700 text-slate-300 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    <Copy className="h-3.5 w-3.5" /> Copy URL
                  </button>
                </div>
              </div>
            </div>

            {/* Action buttons in Modal */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() =>
                    downloadStandImage(
                      response?.restaurant?.name || "Our Restaurant",
                      viewingTable.number,
                      viewingTable.qrUrl
                    )
                  }
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 py-2 cursor-pointer shadow-md"
                >
                  <Download className="h-3.5 w-3.5" />
                  Stand Graphic
                </Button>

                <Button
                  onClick={() => downloadRawQR(viewingTable.number, viewingTable.qrUrl)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 py-2 border border-slate-700 cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5 text-orange-400" />
                  Raw QR (.png)
                </Button>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => handlePrint(viewingTable.qrUrl, viewingTable.number)}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 py-2 cursor-pointer shadow-md"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print Sign
                </Button>
                <Button
                  onClick={() => setViewingTable(null)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs px-4 cursor-pointer"
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
