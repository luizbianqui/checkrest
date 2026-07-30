"use client";

import {
  Calendar,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Download,
  Brain,
  ChevronRight,
  Filter,

} from "lucide-react";
import { User as UserType, Unit } from "@/types";

interface DashboardProps {
  dbConnected: boolean | null;
  currentUser: UserType | null;
  selectedUnitFilter: string;
  setSelectedUnitFilter: (val: string) => void;
  selectedPeriodFilter: string;
  setSelectedPeriodFilter: (val: string) => void;
  dashboardStats: {
    scheduled: number;
    active: number;
    completed: number;
    delayed: number;
    openNonConforms?: number;
    pendingActionPlans?: number;
    weeklyScores?: { day: string; val: number }[];
    operatorRanking?: { name: string; initials: string; score: number; color?: string }[];
  };
  units: Unit[];
  setActiveTab: (tab: "dashboard" | "checklists" | "editor" | "ai" | "settings" | "companies" | "collaborators" | "nonconformities" | "actionplans" | "reports") => void;
  setChatInput: (val: string) => void;
  onOpenManagerCustomization?: () => void;
}

export default function Dashboard({
  dbConnected,
  currentUser,
  selectedUnitFilter,
  setSelectedUnitFilter,
  selectedPeriodFilter,
  setSelectedPeriodFilter,
  dashboardStats,
  units,
  setActiveTab,
  onOpenManagerCustomization
}: DashboardProps) {
  const managerUnit = units.find(u => u.id === currentUser?.unitId);
  const managerUnitName = managerUnit ? managerUnit.name : "Unidade Jardins";

  return (
    <div className="space-y-8 animate-fadeIn">
      {dbConnected === false && (
        <div className="bg-amber-50/80 border border-amber-200 text-amber-900 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="bg-amber-100 p-2 rounded-lg text-amber-700 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm">Modo de Simulação Ativo (Fallback Local)</h4>
              <p className="text-xs text-amber-800/80 mt-0.5">As credenciais do Supabase no arquivo `.env.local` são placeholders. A aplicação está simulando as operações com dados persistidos localmente.</p>
            </div>
          </div>
          <div className="text-xs font-bold text-amber-900 bg-white border border-amber-200 px-3 py-1.5 rounded-lg whitespace-nowrap self-start sm:self-center">
            Offline / Demo Mode
          </div>
        </div>
      )}
      
      {/* Header and Filter */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-black text-slate-900">Dashboard Operacional</h2>
            {currentUser?.role === "UNIT_MANAGER" && onOpenManagerCustomization && (
              <button
                onClick={onOpenManagerCustomization}
                className="px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
              >
                ⚙️ Personalizar Teste / Zerar Dados
              </button>
            )}
          </div>
          <p className="text-slate-500 text-sm mt-1">Visão geral do desempenho das unidades em tempo real.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Unidade</span>
            <select
              value={selectedUnitFilter}
              onChange={(e) => setSelectedUnitFilter(e.target.value)}
              disabled={currentUser?.role === "UNIT_MANAGER"}
              className="bg-slate-50 border-none rounded-lg px-3 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-slate-900 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {currentUser?.role === "UNIT_MANAGER" ? (
                <option value={managerUnitName}>{managerUnitName}</option>
              ) : (
                <>
                  <option value="Todas as Unidades">Todas as Unidades</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.name}>{u.name}</option>
                  ))}
                </>
              )}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Período</span>
            <select
              value={selectedPeriodFilter}
              onChange={(e) => setSelectedPeriodFilter(e.target.value)}
              className="bg-slate-50 border-none rounded-lg px-3 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-slate-900 cursor-pointer"
            >
              <option>Últimos 7 dias</option>
              <option>Últimos 30 dias</option>
              <option>Este Mês</option>
            </select>
          </div>
          
          <button 
            onClick={() => alert("Filtros aplicados para " + selectedUnitFilter + " em " + selectedPeriodFilter)}
            className="bg-[#131b2e] hover:bg-slate-800 text-white rounded-lg text-xs font-bold px-4 py-2 self-end h-8 flex items-center gap-1.5 transition-colors"
          >
            <Filter className="w-3.5 h-3.5" />
            Filtrar
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-slate-100 rounded-lg text-slate-600">
              <Calendar className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">+12%</span>
          </div>
          <p className="text-slate-500 font-semibold text-xs uppercase tracking-wider mb-1">Checklists Agendados</p>
          <h3 className="text-3xl font-extrabold text-slate-900">{dashboardStats.scheduled}</h3>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-200 group-hover:bg-slate-900 transition-colors"></div>
        </div>

        <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
              <Activity className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Ativo</span>
          </div>
          <p className="text-slate-500 font-semibold text-xs uppercase tracking-wider mb-1">Em Curso</p>
          <h3 className="text-3xl font-extrabold text-slate-900">{dashboardStats.active}</h3>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-200 group-hover:bg-blue-600 transition-colors"></div>
        </div>

        <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-emerald-50 rounded-lg text-[#006c49]">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-[#006c49] bg-emerald-50 px-2 py-0.5 rounded-full">98% Meta</span>
          </div>
          <p className="text-slate-500 font-semibold text-xs uppercase tracking-wider mb-1">Finalizados</p>
          <h3 className="text-3xl font-extrabold text-[#006c49]">{dashboardStats.completed}</h3>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-200 group-hover:bg-[#006c49] transition-colors"></div>
        </div>

        <div className="bg-red-50/30 border border-red-200/60 p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-red-50 rounded-lg text-red-600">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">Ação Necessária</span>
          </div>
          <p className="text-red-700/80 font-semibold text-xs uppercase tracking-wider mb-1">Atrasados</p>
          <h3 className="text-3xl font-extrabold text-red-700">{dashboardStats.delayed}</h3>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-red-200 group-hover:bg-red-600 transition-colors"></div>
        </div>
      </div>

      {/* Extra KPI Cards — Real DB Data */}
      {(dashboardStats.openNonConforms !== undefined || dashboardStats.pendingActionPlans !== undefined) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {dashboardStats.openNonConforms !== undefined && (
            <div
              onClick={() => setActiveTab("nonconformities" as any)}
              className="bg-orange-50/50 border border-orange-200/70 p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group cursor-pointer"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-orange-100 rounded-lg text-orange-600">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">
                  {dashboardStats.openNonConforms === 0 ? "✓ Tudo OK" : "Atenção"}
                </span>
              </div>
              <p className="text-orange-700/80 font-semibold text-xs uppercase tracking-wider mb-1">NCs em Aberto</p>
              <h3 className="text-3xl font-extrabold text-orange-700">{dashboardStats.openNonConforms}</h3>
              <div className="absolute bottom-0 left-0 w-full h-1 bg-orange-200 group-hover:bg-orange-500 transition-colors"></div>
            </div>
          )}
          {dashboardStats.pendingActionPlans !== undefined && (
            <div
              onClick={() => setActiveTab("actionplans" as any)}
              className="bg-purple-50/50 border border-purple-200/70 p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group cursor-pointer"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-purple-100 rounded-lg text-purple-600">
                  <ChevronRight className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                  {dashboardStats.pendingActionPlans === 0 ? "✓ Em Dia" : "Pendente"}
                </span>
              </div>
              <p className="text-purple-700/80 font-semibold text-xs uppercase tracking-wider mb-1">Planos Pendentes</p>
              <h3 className="text-3xl font-extrabold text-purple-700">{dashboardStats.pendingActionPlans}</h3>
              <div className="absolute bottom-0 left-0 w-full h-1 bg-purple-200 group-hover:bg-purple-500 transition-colors"></div>
            </div>
          )}
        </div>
      )}

      {/* Chart & Operator Ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column Chart */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Evolução do Score Semanal</h3>
              <p className="text-slate-400 text-xs mt-0.5">Percentual de conformidade média da cozinha</p>
            </div>
            <span className="flex items-center gap-1.5 text-xs font-semibold text-[#006c49] bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
              <span className="w-2 h-2 rounded-full bg-[#006c49]"></span>
              Atual
            </span>
          </div>

          <div className="h-64 w-full relative flex items-end justify-between gap-4 pt-8">
            {(dashboardStats.weeklyScores && dashboardStats.weeklyScores.length > 0
              ? dashboardStats.weeklyScores
              : [
                  { day: "SEG", val: 0 },
                  { day: "TER", val: 0 },
                  { day: "QUA", val: 0 },
                  { day: "QUI", val: 0 },
                  { day: "SEX", val: 0 },
                  { day: "SAB", val: 0 },
                  { day: "DOM", val: 0 }
                ]
            ).map((item, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center group h-full justify-end relative">
                {/* Tooltip on Hover */}
                <div className="absolute bottom-full mb-2 bg-[#131b2e] text-white text-[10px] px-2 py-1 rounded shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-10 font-bold">
                  {item.val}%
                </div>
                {/* Bar */}
                <div className="w-full bg-slate-50 rounded-t-lg h-full flex items-end overflow-hidden border border-slate-100">
                  <div
                    className="w-full bg-slate-200 hover:bg-[#006c49]/80 transition-all rounded-t-lg relative"
                    style={{ height: `${item.val}%` }}
                  >
                    {/* Inner Accent Line */}
                    <div className="absolute inset-x-0 bottom-0 h-1 bg-[#006c49]"></div>
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 mt-2 font-bold tracking-wider">{item.day}</span>
              </div>
            ))}

            {/* Chart Guide Lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-10 pt-8 pb-6">
              <div className="border-t border-slate-600 w-full h-px"></div>
              <div className="border-t border-slate-600 w-full h-px"></div>
              <div className="border-t border-slate-600 w-full h-px"></div>
              <div className="border-t border-slate-600 w-full h-px"></div>
            </div>
          </div>
        </div>

        {/* Operator Ranking */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-800">Ranking de Operadores</h3>
            <p className="text-slate-400 text-xs mt-0.5">Melhores performances do mês</p>
          </div>

          <div className="flex-1 overflow-y-auto max-h-72">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nome</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(!dashboardStats.operatorRanking || dashboardStats.operatorRanking.length === 0) ? (
                  <tr>
                    <td colSpan={2} className="px-6 py-8 text-center text-xs text-slate-400 italic">
                      Nenhum operador com pontuação registrada ainda.
                    </td>
                  </tr>
                ) : (
                  dashboardStats.operatorRanking.map((op, i) => (
                    <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${op.color || "bg-slate-100 text-slate-700"}`}>
                            {op.initials || op.name.charAt(0)}
                          </div>
                          <span className="font-semibold text-slate-700 text-sm">{op.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <span className="font-bold text-[#006c49]">{op.score}%</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-slate-100 text-center bg-slate-50/50">
            <button 
              onClick={() => alert("Nenhum dado adicional para exibir no momento.")} 
              className="text-xs font-bold text-[#131b2e] hover:underline uppercase tracking-wider"
            >
              Ver Ranking Completo
            </button>
          </div>
        </div>
      </div>

      {/* Bento Grid Action Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Bento Card 1: AI Prompt Suggestion */}
        <div 
          onClick={() => setActiveTab("ai")}
          className="p-6 bg-gradient-to-br from-[#131b2e] to-slate-900 rounded-xl text-white relative overflow-hidden group cursor-pointer shadow-md hover:shadow-lg transition-all"
        >
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div>
              <div className="bg-white/10 w-8 h-8 rounded-lg flex items-center justify-center mb-4">
                <Brain className="w-5 h-5 text-emerald-400" />
              </div>
              <h4 className="text-lg font-bold mb-2">IA Consultiva</h4>
              <p className="text-xs text-slate-300 leading-relaxed max-w-[85%]">
                &quot;Pronto para análise. A IA acompanhará o nível de conformidade assim que os primeiros checklists forem executados.&quot;
              </p>
            </div>
            <button className="bg-white/10 hover:bg-white/20 border border-white/10 px-4 py-2 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all self-start mt-6">
              Ver Detalhes do Insight
            </button>
          </div>
          <Brain className="w-48 h-48 absolute -right-8 -bottom-8 text-white/5 opacity-10 group-hover:scale-105 transition-transform" />
        </div>

        {/* Bento Card 2: Exportable Reports */}
        <div className="p-6 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col justify-between group">
          <div>
            <div className="p-3 bg-slate-100 text-slate-700 rounded-lg w-max mb-4">
              <Download className="w-5 h-5" />
            </div>
            <h4 className="text-lg font-bold text-slate-800">Relatórios Exportáveis</h4>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Gere PDFs automatizados das vistorias e checklist executados para a vigilância sanitária.
            </p>
          </div>
          <button 
            onClick={() => alert("Relatórios exportados com sucesso em PDF!")}
            className="mt-6 flex items-center gap-1.5 text-xs font-bold text-[#131b2e] hover:underline uppercase tracking-wider self-start"
          >
            Configurar automação
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Bento Card 3: Next Training Calendar */}
        <div className="p-1 rounded-xl bg-gradient-to-br from-emerald-500 to-[#131b2e] shadow-sm">
          <div className="bg-white rounded-[10px] p-5 h-full flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-wider">Agendado</span>
              <h4 className="text-lg font-bold text-slate-800 mt-3">Próximo Treinamento</h4>
              <p className="text-xs text-slate-500 mt-1">Capacitação operacional das equipes de cozinha.</p>
              
              <div className="flex items-center gap-3 mt-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <Calendar className="w-5 h-5 text-[#006c49]" />
                <div>
                  <p className="text-xs font-bold text-slate-700">14 Outubro, 2026</p>
                  <p className="text-[10px] text-slate-400">Boas práticas de manipulação</p>
                </div>
              </div>
            </div>

            <button 
              onClick={() => alert("Inscrição confirmada!")}
              className="mt-6 w-full text-center py-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg transition-colors"
            >
              Confirmar Presença
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
