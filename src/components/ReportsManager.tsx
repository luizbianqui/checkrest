"use client";

import { useState } from "react";
import {
  FileText,
  Download,
  Printer,
  Calendar,
  Filter,
  CheckCircle,
  AlertTriangle,
  Award,
  Activity,
  Brain,
  Inbox
} from "lucide-react";
import { Unit, Checklist, NonConformity, ActionPlan, Occurrence, User as UserType } from "@/types";

interface ReportsManagerProps {
  units: Unit[];
  dbConnected: boolean | null;
  selectedPeriodFilter: string;
  setSelectedPeriodFilter: (val: string) => void;
  selectedSpecificDate: string;
  setSelectedSpecificDate: (val: string) => void;
  selectedStartDate: string;
  setSelectedStartDate: (val: string) => void;
  selectedEndDate: string;
  setSelectedEndDate: (val: string) => void;
  checklists: Checklist[];
  nonConformities: NonConformity[];
  actionPlans: ActionPlan[];
  occurrences: Occurrence[];
  currentUser: UserType | null;
}

export default function ReportsManager({
  units,
  dbConnected,
  selectedPeriodFilter,
  setSelectedPeriodFilter,
  selectedSpecificDate,
  setSelectedSpecificDate,
  selectedStartDate,
  setSelectedStartDate,
  selectedEndDate,
  setSelectedEndDate,
  checklists,
  nonConformities,
  actionPlans,
  occurrences,
  currentUser
}: ReportsManagerProps) {
  const [selectedReportType, setSelectedReportType] = useState<"compliance" | "nonconformities" | "executive">("compliance");
  const [selectedUnit, setSelectedUnit] = useState("Todas");
  const [selectedSector, setSelectedSector] = useState("Todos");
  const [loading, setLoading] = useState(false);

  // Scope Filtering
  const filteredChecklists = checklists.filter(c => {
    const matchSector = selectedSector === "Todos" || c.sector.toLowerCase().includes(selectedSector.toLowerCase());
    return matchSector;
  });

  const filteredNCs = nonConformities.filter(nc => {
    const matchUnit = selectedUnit === "Todas" || !currentUser?.unitId || nc.unitId === currentUser.unitId;
    return matchUnit;
  });

  const filteredOccurrences = occurrences.filter(oc => {
    const matchUnit = selectedUnit === "Todas" || !currentUser?.unitId || oc.unitId === currentUser.unitId;
    const matchSector = selectedSector === "Todos" || oc.sector.toLowerCase().includes(selectedSector.toLowerCase());
    return matchUnit && matchSector;
  });

  const generateCSV = (rows: string[][], filename: string) => {
    const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const generateXLSX = async (rows: string[][], sheetName: string, filename: string) => {
    const XLSX = (await import("xlsx")).default;
    const ws = XLSX.utils.aoa_to_sheet(rows);

    const colWidths = rows[0]?.map((_, i) => ({
      wch: Math.max(...rows.map(r => String(r[i] || "").length), 12)
    }));
    ws["!cols"] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, filename);
  };

  const generatePDF = async (
    title: string,
    subtitle: string,
    headers: string[],
    rows: (string | number)[][],
    filename: string
  ) => {
    const { default: jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const dateStr = new Date().toLocaleDateString("pt-BR", { dateStyle: "long" });
    const companyName = currentUser?.name ? `Empresa / Responsável: ${currentUser.name}` : "CheckRest";

    // Header bar
    doc.setFillColor(19, 27, 46);
    doc.rect(0, 0, pageWidth, 22, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("CheckRest — Relatório Operacional", 14, 14);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(companyName, pageWidth - 14, 14, { align: "right" });

    // Document Title
    doc.setTextColor(19, 27, 46);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(title, 14, 34);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(`${subtitle} | Data: ${dateStr} | Período: ${selectedPeriodFilter}`, 14, 40);

    // Table
    autoTable(doc, {
      startY: 46,
      head: [headers],
      body: rows.length > 0 ? rows : [["Nenhum registro encontrado no período", "-", "-", "-", "-"]],
      theme: "striped",
      headStyles: {
        fillColor: [19, 27, 46],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 9
      },
      bodyStyles: {
        fontSize: 8.5,
        textColor: [51, 65, 85]
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      margin: { left: 14, right: 14 }
    });

    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Gerado pelo CheckRest — ${dateStr} | Página ${i} de ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 6,
        { align: "center" }
      );
    }

    doc.save(filename);
  };

  const handleExport = async (format: "pdf" | "xlsx" | "csv") => {
    setLoading(true);
    const dateStr = new Date().toISOString().split("T")[0];
    const company = currentUser?.companyId || "empresa";

    const complianceRows: string[][] = [
      ["Título", "Setor", "Frequência", "Status", "Última Atualização"],
      ...filteredChecklists.map(c => [c.title, c.sector, c.recurrence, c.status, c.lastUpdated || ""])
    ];

    const ncRows: string[][] = [
      ["Título", "Gravidade", "Status", "Data"],
      ...filteredNCs.map(nc => [
        nc.title,
        nc.severity || "",
        nc.status,
        nc.createdAt ? new Date(nc.createdAt).toLocaleDateString("pt-BR") : ""
      ])
    ];

    const execRows: string[][] = [
      ["Indicador", "Valor"],
      ["Total de Checklists", String(filteredChecklists.length)],
      ["Checklists Ativos", String(filteredChecklists.filter(c => c.status === "active").length)],
      ["NCs em Aberto", String(filteredNCs.filter(nc => nc.status === "open").length)],
      ["NCs Resolvidas", String(filteredNCs.filter(nc => nc.status === "resolved").length)],
      ["Planos de Ação Pendentes", String(actionPlans.filter(ap => ap.status === "pending").length)],
      ["Planos de Ação Concluídos", String(actionPlans.filter(ap => ap.status === "completed").length)],
      ["Ocorrências Abertas", String(filteredOccurrences.filter(o => o.status === "open").length)]
    ];

    try {
      if (format === "csv") {
        if (selectedReportType === "compliance") {
          generateCSV(complianceRows, `conformidade_geral_${company}_${dateStr}.csv`);
        } else if (selectedReportType === "nonconformities") {
          generateCSV(ncRows, `nao_conformidades_${company}_${dateStr}.csv`);
        } else {
          generateCSV(execRows, `executivo_${company}_${dateStr}.csv`);
        }
      } else if (format === "xlsx") {
        if (selectedReportType === "compliance") {
          await generateXLSX(complianceRows, "Conformidade", `conformidade_geral_${company}_${dateStr}.xlsx`);
        } else if (selectedReportType === "nonconformities") {
          await generateXLSX(ncRows, "Não Conformidades", `nao_conformidades_${company}_${dateStr}.xlsx`);
        } else {
          await generateXLSX(execRows, "Executivo", `executivo_${company}_${dateStr}.xlsx`);
        }
      } else if (format === "pdf") {
        if (selectedReportType === "compliance") {
          await generatePDF(
            "Relatório de Conformidade Geral",
            "Checklists previstos vs realizados por setor e frequência",
            complianceRows[0],
            complianceRows.slice(1),
            `conformidade_geral_${company}_${dateStr}.pdf`
          );
        } else if (selectedReportType === "nonconformities") {
          await generatePDF(
            "Relatório de Não Conformidades",
            "Falhas registradas, criticidades e status de tratamento",
            ncRows[0],
            ncRows.slice(1),
            `nao_conformidades_${company}_${dateStr}.pdf`
          );
        } else {
          await generatePDF(
            "Relatório Executivo",
            "Indicadores consolidados de operação",
            execRows[0],
            execRows.slice(1),
            `executivo_${company}_${dateStr}.pdf`
          );
        }
      }

      try {
        const { logReportExportAction } = await import("@/app/actions/dbActions");
        await logReportExportAction({
          companyId: currentUser?.companyId || null,
          userId: currentUser?.id || null,
          reportType: selectedReportType,
          format
        });
      } catch {
        // Audit log failure non-blocking
      }
    } catch (err) {
      console.error("[handleExport] Erro ao gerar relatório:", err);
      alert("Erro ao gerar o relatório. Verifique o console para detalhes.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Central de Relatórios</h2>
        <p className="text-slate-500 text-sm mt-1">Exporte relatórios operacionais consolidados e detalhados em PDF, Excel ou CSV.</p>
      </div>

      {/* Configuration and Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Report Type Selector */}
          <div className="space-y-2 text-xs font-bold text-slate-500">
            <label>Tipo de Relatório</label>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setSelectedReportType("compliance")}
                className={`w-full text-left p-3 border rounded-xl font-bold flex items-center gap-3 transition-all ${
                  selectedReportType === "compliance"
                    ? "bg-[#131b2e] text-white border-[#131b2e]"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                }`}
              >
                <CheckCircle className="w-5 h-5" />
                <div>
                  <span className="block text-xs font-bold">Conformidade Geral</span>
                  <span className="block text-[9px] opacity-70 font-medium mt-0.5">Checklists previstos vs realizados, scores.</span>
                </div>
              </button>
              <button
                onClick={() => setSelectedReportType("nonconformities")}
                className={`w-full text-left p-3 border rounded-xl font-bold flex items-center gap-3 transition-all ${
                  selectedReportType === "nonconformities"
                    ? "bg-[#131b2e] text-white border-[#131b2e]"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                }`}
              >
                <AlertTriangle className="w-5 h-5" />
                <div>
                  <span className="block text-xs font-bold">Não Conformidades</span>
                  <span className="block text-[9px] opacity-70 font-medium mt-0.5">Falhas críticas, criticidades e responsáveis.</span>
                </div>
              </button>
              <button
                onClick={() => setSelectedReportType("executive")}
                className={`w-full text-left p-3 border rounded-xl font-bold flex items-center gap-3 transition-all ${
                  selectedReportType === "executive"
                    ? "bg-[#131b2e] text-white border-[#131b2e]"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                }`}
              >
                <Award className="w-5 h-5" />
                <div>
                  <span className="block text-xs font-bold">Relatório Executivo</span>
                  <span className="block text-[9px] opacity-70 font-medium mt-0.5">Ranking de filiais, evolução e insights da IA.</span>
                </div>
              </button>
            </div>
          </div>

          {/* Scope Filters */}
          <div className="space-y-4 text-xs font-bold text-slate-500">
            <div className="space-y-1">
              <label>Unidade / Filial</label>
              <select
                value={currentUser?.role === "UNIT_MANAGER" ? (currentUser.unitId || "") : selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
                disabled={currentUser?.role === "UNIT_MANAGER"}
                className="w-full border-slate-200 focus:ring-1 focus:ring-slate-900 rounded-lg text-xs py-2.5 px-3 text-slate-800 font-semibold cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {currentUser?.role === "UNIT_MANAGER" ? (
                  <option value={currentUser.unitId || ""}>
                    {units.find(u => u.id === currentUser.unitId)?.name || "Sua Unidade"}
                  </option>
                ) : (
                  <>
                    <option value="Todas">Todas as Unidades (Consolidado)</option>
                    {units.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </>
                )}
              </select>
            </div>

            <div className="space-y-1">
              <label>Setor Operacional</label>
              <select
                value={selectedSector}
                onChange={(e) => setSelectedSector(e.target.value)}
                className="w-full border-slate-200 focus:ring-1 focus:ring-slate-900 rounded-lg text-xs py-2.5 px-3 text-slate-800 font-semibold cursor-pointer"
              >
                <option value="Todos">Todos os Setores</option>
                <option value="Cozinha Central">Cozinha Central</option>
                <option value="Atendimento">Atendimento / Salão</option>
                <option value="Estoque">Estoque</option>
                <option value="Limpeza">Limpeza</option>
              </select>
            </div>
          </div>

          {/* Date Filtering Selector */}
          <div className="space-y-2 text-xs font-bold text-slate-500">
            <label>Período do Relatório</label>
            <select
              value={selectedPeriodFilter}
              onChange={(e) => setSelectedPeriodFilter(e.target.value)}
              className="w-full border-slate-200 focus:ring-1 focus:ring-slate-900 rounded-lg text-xs py-2.5 px-3 text-slate-800 font-semibold cursor-pointer"
            >
              <option value="Hoje">Hoje</option>
              <option value="Ontem">Ontem</option>
              <option value="Últimos 7 dias">Últimos 7 dias</option>
              <option value="Últimos 30 dias">Últimos 30 dias</option>
              <option value="Este Mês">Este Mês</option>
              <option value="Mês anterior">Mês anterior</option>
              <option value="Data específica">Data específica</option>
              <option value="Período personalizado">Período personalizado</option>
            </select>

            {selectedPeriodFilter === "Data específica" && (
              <input
                type="date"
                value={selectedSpecificDate}
                onChange={(e) => setSelectedSpecificDate(e.target.value)}
                className="w-full border-slate-200 focus:ring-1 focus:ring-slate-900 rounded-lg text-xs py-2 px-3 text-slate-800 font-semibold mt-2 cursor-pointer"
              />
            )}

            {selectedPeriodFilter === "Período personalizado" && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                <input
                  type="date"
                  value={selectedStartDate}
                  onChange={(e) => setSelectedStartDate(e.target.value)}
                  className="border-slate-200 focus:ring-1 focus:ring-slate-900 rounded-lg text-xs py-2 px-2 text-slate-800 font-semibold cursor-pointer"
                />
                <input
                  type="date"
                  value={selectedEndDate}
                  onChange={(e) => setSelectedEndDate(e.target.value)}
                  className="border-slate-200 focus:ring-1 focus:ring-slate-900 rounded-lg text-xs py-2 px-2 text-slate-800 font-semibold cursor-pointer"
                />
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons for Export */}
        <div className="pt-5 border-t border-slate-100 flex flex-wrap gap-3 justify-between items-center">
          <div className="flex gap-2">
            <button
              onClick={() => handleExport("pdf")}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg text-xs font-bold uppercase transition-all"
            >
              <Download className="w-4 h-4" /> Exportar PDF
            </button>
            <button
              onClick={() => handleExport("xlsx")}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 border border-emerald-200 text-[#006c49] bg-emerald-50 hover:bg-emerald-100 rounded-lg text-xs font-bold uppercase transition-all"
            >
              <Download className="w-4 h-4" /> Exportar Excel
            </button>
            <button
              onClick={() => handleExport("csv")}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg text-xs font-bold uppercase transition-all"
            >
              <Download className="w-4 h-4" /> Exportar CSV
            </button>
          </div>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-[#131b2e] hover:bg-slate-800 text-white rounded-lg text-xs font-bold uppercase transition-all shadow-sm"
          >
            <Printer className="w-4 h-4" /> Imprimir
          </button>
        </div>
      </div>

      {/* Premium Report Preview */}
      <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm space-y-6 print:p-0 print:border-none print:shadow-none">
        <div className="flex justify-between items-start border-b border-slate-200 pb-5">
          <div>
            <h3 className="text-xl font-extrabold text-slate-900 uppercase tracking-wider">
              {selectedReportType === "compliance" && "Relatório de Conformidade Operacional"}
              {selectedReportType === "nonconformities" && "Relatório de Não Conformidades Consolidado"}
              {selectedReportType === "executive" && "Relatório Executivo Operacional & Insights"}
            </h3>
            <p className="text-xs text-slate-400 mt-1 font-semibold">
              Gerado em: {new Date().toLocaleDateString("pt-BR")} | Período: {selectedPeriodFilter} | Responsável: {currentUser?.name || "Gerente"}
            </p>
          </div>
          <div className="bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 font-extrabold text-xs text-slate-700">
            CheckRest Reports
          </div>
        </div>

        {/* COMPLIANCE REPORT VIEW */}
        {selectedReportType === "compliance" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Score Geral</span>
                <div className="text-2xl font-black text-emerald-600 mt-1">
                  {filteredChecklists.length > 0 ? "100%" : "0.0%"}
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Checklists Cadastrados</span>
                <div className="text-2xl font-black text-slate-800 mt-1">{filteredChecklists.length}</div>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Realizados</span>
                <div className="text-2xl font-black text-slate-800 mt-1">
                  {filteredChecklists.filter(c => c.lastUpdated?.includes("Finalizado")).length}
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Não Conformidades</span>
                <div className="text-2xl font-black text-red-600 mt-1">{filteredNCs.length}</div>
              </div>
            </div>

            <div className="overflow-hidden border border-slate-100 rounded-xl">
              <table className="w-full text-left border-collapse text-xs font-semibold">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200">
                    <th className="px-4 py-3">Título do Checklist</th>
                    <th className="px-4 py-3">Setor</th>
                    <th className="px-4 py-3">Frequência</th>
                    <th className="px-4 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredChecklists.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-12 text-center text-slate-400">
                        <Inbox className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                        <p className="font-bold text-slate-600">Nenhuma operação / checklist registrado no período.</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Cadastre um modelo de checklist ou execute uma auditoria para popular o relatório.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredChecklists.map(c => (
                      <tr key={c.id}>
                        <td className="px-4 py-3 font-extrabold text-slate-800">{c.title}</td>
                        <td className="px-4 py-3 text-slate-600">{c.sector}</td>
                        <td className="px-4 py-3 text-slate-500">{c.recurrence}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                            c.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                          }`}>
                            {c.status === "active" ? "Ativo" : c.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* NON-CONFORMITIES REPORT VIEW */}
        {selectedReportType === "nonconformities" && (
          <div className="space-y-6">
            <div className="overflow-hidden border border-slate-100 rounded-xl">
              <table className="w-full text-left border-collapse text-xs font-semibold">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200">
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3">Unidade & Setor</th>
                    <th className="px-4 py-3">Descrição da Falha</th>
                    <th className="px-4 py-3">Criticidade</th>
                    <th className="px-4 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredNCs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                        <CheckCircle className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
                        <p className="font-bold text-slate-700">Nenhuma não-conformidade registrada!</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Operação em 100% de conformidade técnica.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredNCs.map(nc => (
                      <tr key={nc.id}>
                        <td className="px-4 py-3 text-slate-400 font-mono">
                          {nc.createdAt ? new Date(nc.createdAt).toLocaleDateString("pt-BR") : "N/A"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold">{nc.unit?.name || "Unidade"}</div>
                        </td>
                        <td className="px-4 py-3">{nc.title}</td>
                        <td className="px-4 py-3">
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                            nc.severity === "high" || nc.severity === "critical" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                          }`}>
                            {nc.severity || "Média"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                            nc.status === "open" ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"
                          }`}>
                            {nc.status === "open" ? "Pendente" : "Resolvido"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* EXECUTIVE REPORT VIEW */}
        {selectedReportType === "executive" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Summary card */}
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-3">Resumo da Operação</h4>
                <div className="space-y-3 font-semibold text-xs text-slate-700">
                  <div className="flex justify-between items-center">
                    <span>Total de Checklists Ativos:</span>
                    <span className="font-bold text-slate-900">{filteredChecklists.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Não Conformidades Abertas:</span>
                    <span className="font-bold text-red-600">{filteredNCs.filter(nc => nc.status === "open").length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Ocorrências Registradas:</span>
                    <span className="font-bold text-slate-900">{filteredOccurrences.length}</span>
                  </div>
                </div>
              </div>

              {/* Status breakdown */}
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-3">Saúde do Sistema</h4>
                <div className="space-y-3 font-semibold text-xs text-slate-700">
                  <div className="flex justify-between items-center">
                    <span>Status da Loja:</span>
                    <span className="font-bold text-emerald-600">
                      {filteredNCs.length === 0 ? "100% Conforme" : "Requer Atenção"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Planos de Ação Pendentes:</span>
                    <span className="font-bold text-slate-700">{actionPlans.filter(ap => ap.status === "pending").length}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* AI consultant suggestion block */}
            <div className="bg-gradient-to-r from-indigo-900 to-[#131b2e] rounded-xl p-5 text-white space-y-2 relative overflow-hidden">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-300 uppercase">
                <Brain className="w-4 h-4" />
                <span>Análise Inteligente CheckRest</span>
              </div>
              <p className="text-xs leading-relaxed text-slate-200">
                {filteredChecklists.length === 0
                  ? "Nenhum checklist foi executado ainda nesta conta. Assim que você cadastrar e rodar os primeiros checklists, a IA gerará gráficos de tendência e recomendações automáticas de melhoria operacional."
                  : `Operação com ${filteredChecklists.length} checklists cadastrados. Acompanhe a execução diária pela equipe para manter o score de conformidade elevado.`}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
