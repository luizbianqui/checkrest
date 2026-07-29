"use client";

import { useState, useMemo } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Activity,
  Plus,
  Copy,
  Calendar,
  Filter,
  Search
} from "lucide-react";
import { Occurrence, NonConformity, Unit, User as UserType } from "@/types";

interface OperationalOccurrencesProps {
  activeTab: string;
  occurrences: Occurrence[];
  nonConformities: NonConformity[];
  units: Unit[];
  currentUser: UserType | null;
  handleRegisterMobileOccurrence: () => void;
  handleUpdateOccurrenceStatus: (id: string, newStatus: string) => void;
  handleOpenDuplicateModal: (occ: Occurrence) => void;
  mobileOccTitle: string;
  setMobileOccTitle: (val: string) => void;
  mobileOccDescription: string;
  setMobileOccDescription: (val: string) => void;
  mobileOccSeverity: string;
  setMobileOccSeverity: (val: string) => void;
  mobileOccSector: string;
  setMobileOccSector: (val: string) => void;
  mobileOccUnitId: string;
  setMobileOccUnitId: (val: string) => void;
  isMobileOccurrenceOpen: boolean;
  setIsMobileOccurrenceOpen: (val: boolean) => void;
  
  // Date period filtering states
  selectedPeriodFilter: string;
  setSelectedPeriodFilter: (val: string) => void;
  selectedSpecificDate: string;
  setSelectedSpecificDate: (val: string) => void;
  selectedStartDate: string;
  setSelectedStartDate: (val: string) => void;
  selectedEndDate: string;
  setSelectedEndDate: (val: string) => void;

  // Helper date function
  isDateInPeriod: (dateStr: string | Date | undefined | null, period: string, specificDate?: string, startDate?: string, endDate?: string) => boolean;
}

export default function OperationalOccurrences({
  activeTab,
  occurrences,
  nonConformities,
  units,
  currentUser,
  handleRegisterMobileOccurrence,
  handleUpdateOccurrenceStatus,
  handleOpenDuplicateModal,
  mobileOccTitle,
  setMobileOccTitle,
  mobileOccDescription,
  setMobileOccDescription,
  mobileOccSeverity,
  setMobileOccSeverity,
  mobileOccSector,
  setMobileOccSector,
  mobileOccUnitId,
  setMobileOccUnitId,
  isMobileOccurrenceOpen,
  setIsMobileOccurrenceOpen,
  selectedPeriodFilter,
  setSelectedPeriodFilter,
  selectedSpecificDate,
  setSelectedSpecificDate,
  selectedStartDate,
  setSelectedStartDate,
  selectedEndDate,
  setSelectedEndDate,
  isDateInPeriod
}: OperationalOccurrencesProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUnitFilter, setSelectedUnitFilter] = useState("Todas");
  const [selectedSeverityFilter, setSelectedSeverityFilter] = useState("Todas");

  // Filtering occurrences based on query, unit, severity and period
  const filteredOccurrences = useMemo(() => {
    const isLocalScoped = currentUser?.role === "UNIT_MANAGER" || currentUser?.role === "OPERATOR";
    const scopeUnitId = isLocalScoped ? currentUser?.unitId : null;

    return occurrences.filter(occ => {
      const matchSearch = occ.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (occ.description && occ.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchUnit = selectedUnitFilter === "Todas" || occ.unitId === selectedUnitFilter;
      const matchRoleUnit = !scopeUnitId || occ.unitId === scopeUnitId;
      const matchSeverity = selectedSeverityFilter === "Todas" || occ.severity === selectedSeverityFilter;
      
      const matchPeriod = isDateInPeriod(
        occ.createdAt,
        selectedPeriodFilter,
        selectedSpecificDate,
        selectedStartDate,
        selectedEndDate
      );

      return matchSearch && matchUnit && matchRoleUnit && matchSeverity && matchPeriod;
    });
  }, [occurrences, searchQuery, selectedUnitFilter, selectedSeverityFilter, selectedPeriodFilter, selectedSpecificDate, selectedStartDate, selectedEndDate, isDateInPeriod, currentUser]);

  // Filtering non conformities based on query, unit scope and period
  const filteredNC = useMemo(() => {
    const isLocalScoped = currentUser?.role === "UNIT_MANAGER" || currentUser?.role === "OPERATOR";
    const scopeUnitId = isLocalScoped ? currentUser?.unitId : null;

    return nonConformities.filter(nc => {
      const matchSearch = nc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (nc.description && nc.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchRoleUnit = !scopeUnitId || nc.unitId === scopeUnitId;
      
      const matchPeriod = isDateInPeriod(
        nc.createdAt,
        selectedPeriodFilter,
        selectedSpecificDate,
        selectedStartDate,
        selectedEndDate
      );

      return matchSearch && matchRoleUnit && matchPeriod;
    });
  }, [nonConformities, searchQuery, selectedPeriodFilter, selectedSpecificDate, selectedStartDate, selectedEndDate, isDateInPeriod, currentUser]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* VIEW: OCCURRENCES                                                            */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === "occurrences" && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Ocorrências Operacionais</h2>
              <p className="text-slate-500 text-sm mt-1">Monitore e atue sobre falhas de processos ocorridas nas unidades de restaurantes.</p>
            </div>

            <button
              onClick={() => setIsMobileOccurrenceOpen(true)}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#131b2e] hover:bg-slate-800 text-white rounded-lg font-bold text-xs uppercase shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              Registrar Ocorrência
            </button>
          </div>

          {/* Date Filtering Bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-bold text-slate-600">Período de Análise:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {["Hoje", "Ontem", "Últimos 7 dias", "Últimos 30 dias", "Este Mês", "Mês anterior", "Data específica", "Período personalizado"].map(period => (
                  <button
                    key={period}
                    onClick={() => setSelectedPeriodFilter(period)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                      selectedPeriodFilter === period
                        ? "bg-[#131b2e] text-white border-[#131b2e] shadow-sm"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200"
                    }`}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Range / Date Inputs */}
            {selectedPeriodFilter === "Data específica" && (
              <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-500">Selecione o Dia:</label>
                <input
                  type="date"
                  value={selectedSpecificDate}
                  onChange={(e) => setSelectedSpecificDate(e.target.value)}
                  className="border-slate-200 focus:ring-1 focus:ring-slate-900 rounded-lg text-xs py-1.5 px-3 text-slate-800 font-semibold"
                />
              </div>
            )}

            {selectedPeriodFilter === "Período personalizado" && (
              <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-500">De:</label>
                <input
                  type="date"
                  value={selectedStartDate}
                  onChange={(e) => setSelectedStartDate(e.target.value)}
                  className="border-slate-200 focus:ring-1 focus:ring-slate-900 rounded-lg text-xs py-1.5 px-3 text-slate-800 font-semibold"
                />
                <label className="text-xs font-bold text-slate-500">Até:</label>
                <input
                  type="date"
                  value={selectedEndDate}
                  onChange={(e) => setSelectedEndDate(e.target.value)}
                  className="border-slate-200 focus:ring-1 focus:ring-slate-900 rounded-lg text-xs py-1.5 px-3 text-slate-800 font-semibold"
                />
              </div>
            )}
          </div>

          {/* Filters Bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
            <div className="flex items-center w-full md:w-1/2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus-within:ring-1 focus-within:ring-slate-900">
              <Search className="w-4 h-4 text-slate-400 mr-2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por título ou descrição..."
                className="bg-transparent border-none focus:ring-0 text-xs w-full py-0.5"
              />
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <select
                value={selectedUnitFilter}
                onChange={(e) => setSelectedUnitFilter(e.target.value)}
                className="border-slate-200 focus:ring-1 focus:ring-slate-900 rounded-lg text-xs py-1.5 px-3 cursor-pointer text-slate-700 font-semibold"
              >
                <option value="Todas">Unidade: Todas</option>
                {units.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
              <select
                value={selectedSeverityFilter}
                onChange={(e) => setSelectedSeverityFilter(e.target.value)}
                className="border-slate-200 focus:ring-1 focus:ring-slate-900 rounded-lg text-xs py-1.5 px-3 cursor-pointer text-slate-700 font-semibold"
              >
                <option value="Todas">Severidade: Todas</option>
                <option value="low">Baixa (Low)</option>
                <option value="medium">Média (Medium)</option>
                <option value="high">Alta (High)</option>
                <option value="critical">Crítica (Critical)</option>
              </select>
            </div>
          </div>

          {/* Register Occurrence Modal Form */}
          {isMobileOccurrenceOpen && (
            <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-scaleUp">
                <div className="px-6 py-4 bg-[#131b2e] text-white flex justify-between items-center">
                  <h3 className="font-extrabold text-sm uppercase tracking-wider">Registrar Ocorrência Manual</h3>
                  <button onClick={() => setIsMobileOccurrenceOpen(false)} className="text-white hover:text-slate-300">
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 space-y-4 text-xs font-semibold text-slate-600">
                  <div className="space-y-1">
                    <label>Título da Ocorrência</label>
                    <input
                      type="text"
                      value={mobileOccTitle}
                      onChange={(e) => setMobileOccTitle(e.target.value)}
                      placeholder="Ex: Quebra do moedor de café"
                      className="w-full border-slate-200 focus:ring-1 focus:ring-slate-900 rounded-lg text-xs py-2 px-3 text-slate-800"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label>Unidade Relacionada</label>
                      <select
                        value={mobileOccUnitId}
                        onChange={(e) => setMobileOccUnitId(e.target.value)}
                        className="w-full border-slate-200 focus:ring-1 focus:ring-slate-900 rounded-lg text-xs py-2 px-3 text-slate-800 cursor-pointer"
                      >
                        {units.map(u => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label>Setor</label>
                      <select
                        value={mobileOccSector}
                        onChange={(e) => setMobileOccSector(e.target.value)}
                        className="w-full border-slate-200 focus:ring-1 focus:ring-slate-900 rounded-lg text-xs py-2 px-3 text-slate-800 cursor-pointer"
                      >
                        <option value="Cozinha Central">Cozinha Central</option>
                        <option value="Atendimento">Atendimento</option>
                        <option value="Estoque">Estoque</option>
                        <option value="Limpeza">Limpeza</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label>Severidade</label>
                      <select
                        value={mobileOccSeverity}
                        onChange={(e) => setMobileOccSeverity(e.target.value)}
                        className="w-full border-slate-200 focus:ring-1 focus:ring-slate-900 rounded-lg text-xs py-2 px-3 text-slate-800 cursor-pointer"
                      >
                        <option value="low">Baixa</option>
                        <option value="medium">Média</option>
                        <option value="high">Alta</option>
                        <option value="critical">Crítica</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label>Descrição do Problema</label>
                    <textarea
                      value={mobileOccDescription}
                      onChange={(e) => setMobileOccDescription(e.target.value)}
                      placeholder="Descreva detalhadamente o ocorrido..."
                      rows={3}
                      className="w-full border-slate-200 focus:ring-1 focus:ring-slate-900 rounded-lg text-xs py-2 px-3 text-slate-800 font-medium"
                    />
                  </div>
                </div>

                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
                  <button
                    onClick={() => setIsMobileOccurrenceOpen(false)}
                    className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 font-bold hover:bg-slate-100"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleRegisterMobileOccurrence}
                    disabled={!mobileOccTitle.trim()}
                    className="px-4 py-2 bg-[#131b2e] hover:bg-slate-800 text-white rounded-lg font-bold disabled:opacity-50"
                  >
                    Registrar Ocorrência
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Occurrences List Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOccurrences.map(occ => (
              <div
                key={occ.id}
                className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                      occ.severity === "critical"
                        ? "bg-red-100 text-red-700"
                        : occ.severity === "high"
                        ? "bg-orange-100 text-orange-700"
                        : occ.severity === "medium"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-slate-100 text-slate-700"
                    }`}>
                      {occ.severity}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      occ.status === "resolved" || occ.status === "cancelled"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700 animate-pulse"
                    }`}>
                      {occ.status === "open" && "Aberta"}
                      {occ.status === "in_progress" && "Em Tratamento"}
                      {occ.status === "resolved" && "Resolvida (Locked)"}
                      {occ.status === "cancelled" && "Cancelada (Locked)"}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-slate-800 text-sm mt-3 leading-snug">{occ.title}</h3>
                  <p className="text-slate-500 text-xs mt-1.5 leading-relaxed">{occ.description}</p>
                  
                  {occ.duplicatedFromOccurrenceId && (
                    <div className="mt-2 text-[9px] bg-slate-50 p-2 rounded border border-slate-100 text-slate-500 font-mono">
                      Copiada da Ocorrência: {occ.duplicatedFromOccurrenceId.slice(0, 8)}...
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 mt-4 text-[10px] font-bold text-slate-400">
                    <span className="bg-slate-100 px-2 py-0.5 rounded uppercase">{occ.sector}</span>
                    <span>•</span>
                    <span className="text-slate-500">{occ.unit?.name || "Filial"}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between">
                  <div className="text-[9px] text-slate-400">
                    <div>Criado por: {occ.createdBy || "Sistema"}</div>
                    <div className="mt-0.5">{new Date(occ.createdAt).toLocaleDateString()} às {new Date(occ.createdAt).toLocaleTimeString().slice(0,5)}</div>
                  </div>

                  <div className="flex gap-1.5">
                    {/* Action buttons based on lock state */}
                    {occ.isLocked ? (
                      <button
                        onClick={() => handleOpenDuplicateModal(occ)}
                        className="p-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-500 flex items-center gap-1.5 text-[9px] font-bold uppercase transition-colors"
                        title="Duplicar ocorrência fechada"
                      >
                        <Copy className="w-3.5 h-3.5" /> Duplicar
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => handleUpdateOccurrenceStatus(occ.id, "resolved")}
                          className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[9px] font-extrabold uppercase shadow-sm transition-colors"
                        >
                          Resolver
                        </button>
                        <button
                          onClick={() => handleUpdateOccurrenceStatus(occ.id, "cancelled")}
                          className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-[9px] font-extrabold uppercase transition-colors"
                        >
                          Cancelar
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {filteredOccurrences.length === 0 && (
              <div className="col-span-full bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400 text-xs italic">
                Nenhuma ocorrência encontrada.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* VIEW: NON-CONFORMITIES                                                       */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === "nonconformities" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Não Conformidades</h2>
            <p className="text-slate-500 text-sm mt-1">Auditorias falhas e itens fora do padrão técnico que exigem correção.</p>
          </div>

          {/* Simple Search */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex gap-4 items-center shadow-sm">
            <div className="flex items-center w-full md:w-80 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus-within:ring-1 focus-within:ring-slate-900">
              <Search className="w-4 h-4 text-slate-400 mr-2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar não conformidade..."
                className="bg-transparent border-none focus:ring-0 text-xs w-full py-0.5"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredNC.map(nc => (
              <div
                key={nc.id}
                className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <span className="px-2.5 py-0.5 bg-red-50 text-red-700 border border-red-100 rounded text-[9px] font-black uppercase tracking-wider">
                      {nc.severity.toUpperCase()}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      nc.status === "open" ? "bg-red-50 text-red-700 animate-pulse" : "bg-amber-50 text-amber-700"
                    }`}>
                      {nc.status === "open" ? "Pendente" : "Em Tratamento"}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-slate-800 text-sm mt-3 leading-snug">{nc.title}</h3>
                  <p className="text-slate-500 text-xs mt-1.5 leading-relaxed">{nc.description}</p>
                  
                  {nc.run && (
                    <div className="mt-3 text-[10px] bg-slate-50 p-2.5 rounded border border-slate-100 space-y-1">
                      <div className="text-slate-400">Origem: <span className="font-bold text-slate-600">{nc.run.template.title} ({nc.run.template.sector})</span></div>
                      {nc.answer && <div className="text-slate-400">Questão: <span className="font-bold text-slate-600">{nc.answer.question.questionText}</span></div>}
                    </div>
                  )}

                  <div className="mt-4 text-[10px] font-bold text-slate-500">
                    Unidade: {nc.unit?.name || "Filial"}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between text-[9px] text-slate-400">
                  <div>Gerado em: {new Date(nc.createdAt || "").toLocaleDateString()}</div>
                </div>
              </div>
            ))}
            {filteredNC.length === 0 && (
              <div className="col-span-full bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400 text-xs italic">
                Nenhuma não conformidade encontrada.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
