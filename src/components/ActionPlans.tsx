"use client";

import { useState, useMemo } from "react";
import {
  Layers,
  Clock,
  User,
  Plus,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  Calendar,
  Camera,
  FolderOpen
} from "lucide-react";
import { ActionPlan, NonConformity, Unit, User as UserType } from "@/types";
import { createActionPlanAction, updateActionPlanAction, updateNonConformityStatusAction } from "@/app/actions/dbActions";

interface ActionPlansProps {
  actionPlans: ActionPlan[];
  setActionPlans: React.Dispatch<React.SetStateAction<ActionPlan[]>>;
  nonConformities: NonConformity[];
  setNonConformities: React.Dispatch<React.SetStateAction<NonConformity[]>>;
  units: Unit[];
  users: UserType[];
  currentUser: UserType | null;
  dbConnected: boolean | null;
}

export default function ActionPlans({
  actionPlans,
  setActionPlans,
  nonConformities,
  setNonConformities,
  units,
  users,
  currentUser,
  dbConnected
}: ActionPlansProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("Todos");
  
  // Add Plan state
  const [isAddPlanOpen, setIsAddPlanOpen] = useState(false);
  const [selectedNCId, setSelectedNCId] = useState("");
  const [actionDescription, setActionDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [responsibleUserId, setResponsibleUserId] = useState("");
  const [creating, setCreating] = useState(false);

  // Real collaborators from the tenant's user list
  const collaborators = users.length > 0
    ? users.map(u => ({ id: u.id, name: u.name }))
    : [{ id: currentUser?.id || "fallback", name: currentUser?.name || "Responsável" }];

  const handleCreatePlan = async () => {
    if (!selectedNCId || !actionDescription.trim() || !dueDate) {
      alert("Preencha todos os campos do plano de ação.");
      return;
    }

    const companyId = currentUser?.companyId || "comp-1";
    const targetNC = nonConformities.find(nc => nc.id === selectedNCId);
    const unitId = targetNC?.unitId || "un-1";
    const selectedResp = collaborators.find(c => c.id === responsibleUserId) || collaborators[0];

    setCreating(true);

    if (dbConnected) {
      const res = await createActionPlanAction({
        companyId,
        unitId,
        nonConformityId: selectedNCId,
        responsibleUserId: selectedResp.id,
        actionDescription,
        dueDate: new Date(dueDate),
        performedByUserId: currentUser?.id
      });
      if (res.success && res.data) {
        const added = res.data as ActionPlan;
        
        // Add complete objects details for UI rendering
        added.unit = { name: units.find(u => u.id === unitId)?.name || "Filial" };
        added.nonConformity = { title: targetNC?.title || "Não Conformidade" };
        added.responsibleUser = { name: selectedResp.name };

        setActionPlans(prev => [added, ...prev]);

        // Update NC status locally
        setNonConformities(prev => prev.map(nc => nc.id === selectedNCId ? { ...nc, status: "in_progress" } : nc));

        setIsAddPlanOpen(false);
        setActionDescription("");
        setDueDate("");
        setSelectedNCId("");
        setCreating(false);
        alert("Plano de ação criado com sucesso no banco!");
        return;
      } else {
        alert("Erro ao criar plano de ação: " + res.error);
        setCreating(false);
        return;
      }
    }

    // Local / Offline fallback
    const newPlan: ActionPlan = {
      id: "ap-" + Date.now(),
      companyId,
      unitId,
      nonConformityId: selectedNCId,
      responsibleUserId: selectedResp.id,
      actionDescription,
      dueDate: new Date(dueDate).toISOString(),
      status: "pending",
      createdAt: new Date().toISOString(),
      unit: { name: units.find(u => u.id === unitId)?.name || "Filial" },
      nonConformity: { title: targetNC?.title || "Não Conformidade" },
      responsibleUser: { name: selectedResp.name }
    };

    setActionPlans(prev => [newPlan, ...prev]);

    // Update NC status locally
    setNonConformities(prev => prev.map(nc => nc.id === selectedNCId ? { ...nc, status: "in_progress" } : nc));

    // Save to localStorage too
    const savedPlans = localStorage.getItem("checkrest_action_plans");
    const plansList = savedPlans ? JSON.parse(savedPlans) : [];
    plansList.unshift(newPlan);
    localStorage.setItem("checkrest_action_plans", JSON.stringify(plansList));

    setIsAddPlanOpen(false);
    setActionDescription("");
    setDueDate("");
    setSelectedNCId("");
    setCreating(false);
    alert("Plano de ação criado localmente com sucesso!");
  };

  const handleCompletePlan = async (planId: string) => {
    if (!confirm("Confirmar a conclusão deste plano de ação?")) return;

    const plan = actionPlans.find(ap => ap.id === planId);
    const ncId = plan?.nonConformityId;

    if (dbConnected) {
      const res = await updateActionPlanAction(planId, "completed", "", currentUser?.id);
      if (res.success && res.data) {
        const updatedPlans = actionPlans.map(ap => ap.id === planId ? { ...ap, status: "completed", closedAt: new Date().toISOString() } : ap);
        setActionPlans(updatedPlans);

        // If there are no more pending plans for the parent NC, close the NC in the DB
        if (ncId) {
          const remainingPending = updatedPlans.filter(ap => ap.nonConformityId === ncId && ap.status === "pending");
          if (remainingPending.length === 0) {
            await updateNonConformityStatusAction(ncId, "resolved");
            setNonConformities(prev => prev.map(nc => nc.id === ncId ? { ...nc, status: "resolved" } : nc));
          }
        }

        alert("Plano de ação concluído com sucesso!");
        return;
      } else {
        alert("Erro ao atualizar plano no banco: " + res.error);
        return;
      }
    }

    // Local / Offline fallback
    const updatedPlansLocal = actionPlans.map(ap => ap.id === planId ? { ...ap, status: "completed", closedAt: new Date().toISOString() } : ap);
    setActionPlans(updatedPlansLocal);

    // Close NC locally if no more pending plans
    if (ncId) {
      const remainingPending = updatedPlansLocal.filter(ap => ap.nonConformityId === ncId && ap.status === "pending");
      if (remainingPending.length === 0) {
        setNonConformities(prev => prev.map(nc => nc.id === ncId ? { ...nc, status: "resolved" } : nc));
      }
    }

    // Save to localStorage too
    const savedPlans = localStorage.getItem("checkrest_action_plans");
    if (savedPlans) {
      const list = JSON.parse(savedPlans);
      const updated = list.map((ap: any) => ap.id === planId ? { ...ap, status: "completed", closedAt: new Date().toISOString() } : ap);
      localStorage.setItem("checkrest_action_plans", JSON.stringify(updated));
    }
    
    alert("Plano de ação concluído localmente!");
  };

  // Filtered List based on search, status, and role unit scope
  const filteredPlans = useMemo(() => {
    const isLocalScoped = currentUser?.role === "UNIT_MANAGER" || currentUser?.role === "OPERATOR";
    const scopeUnitId = isLocalScoped ? currentUser?.unitId : null;

    return actionPlans.filter(plan => {
      const matchSearch = plan.actionDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (plan.responsibleUser && plan.responsibleUser.name.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchStatus = selectedStatusFilter === "Todos" || plan.status === selectedStatusFilter;
      const matchRoleUnit = !scopeUnitId || plan.unitId === scopeUnitId || plan.responsibleUserId === currentUser?.id;
      return matchSearch && matchStatus && matchRoleUnit;
    });
  }, [actionPlans, searchQuery, selectedStatusFilter, currentUser]);

  // Open NCs to link with new Action Plans (filtered by unit scope)
  const openNCs = useMemo(() => {
    const isLocalScoped = currentUser?.role === "UNIT_MANAGER" || currentUser?.role === "OPERATOR";
    const scopeUnitId = isLocalScoped ? currentUser?.unitId : null;

    return nonConformities.filter(nc => {
      const isOpen = nc.status === "open";
      const matchUnit = !scopeUnitId || nc.unitId === scopeUnitId;
      return isOpen && matchUnit;
    });
  }, [nonConformities, currentUser]);

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Planos de Ação (5W2H)</h2>
          <p className="text-slate-500 text-sm mt-1">Crie ações corretivas, defina prazos e atribua responsáveis para mitigar não conformidades.</p>
        </div>

        <button
          onClick={() => {
            if (openNCs.length === 0) {
              alert("Não há não conformidades abertas disponíveis para vincular um plano de ação.");
              return;
            }
            setSelectedNCId(openNCs[0].id);
            setResponsibleUserId(collaborators[0]?.id || "");
            setIsAddPlanOpen(true);
          }}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#131b2e] hover:bg-slate-800 text-white rounded-lg font-bold text-xs uppercase shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          Novo Plano de Ação
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
        <div className="flex items-center w-full md:w-80 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus-within:ring-1 focus-within:ring-slate-900">
          <Search className="w-4 h-4 text-slate-400 mr-2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por descrição ou responsável..."
            className="bg-transparent border-none focus:ring-0 text-xs w-full py-0.5"
          />
        </div>
        <select
          value={selectedStatusFilter}
          onChange={(e) => setSelectedStatusFilter(e.target.value)}
          className="border-slate-200 focus:ring-1 focus:ring-slate-900 rounded-lg text-xs py-1.5 px-3 cursor-pointer text-slate-700 font-semibold w-full md:w-auto"
        >
          <option value="Todos">Status: Todos</option>
          <option value="pending">Pendente (Pending)</option>
          <option value="completed">Concluído (Completed)</option>
        </select>
      </div>

      {/* Add Plan Modal */}
      {isAddPlanOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-scaleUp">
            <div className="px-6 py-4 bg-[#131b2e] text-white flex justify-between items-center">
              <h3 className="font-extrabold text-sm uppercase tracking-wider">Criar Novo Plano de Ação</h3>
              <button onClick={() => setIsAddPlanOpen(false)} className="text-white hover:text-slate-300">
                <XCircleIcon />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs font-semibold text-slate-600">
              <div className="space-y-1">
                <label>Vincular Não Conformidade</label>
                <select
                  value={selectedNCId}
                  onChange={(e) => setSelectedNCId(e.target.value)}
                  className="w-full border-slate-200 focus:ring-1 focus:ring-slate-900 rounded-lg text-xs py-2 px-3 text-slate-800 cursor-pointer"
                >
                  {openNCs.map(nc => (
                    <option key={nc.id} value={nc.id}>{nc.title} ({nc.unit?.name})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label>Descrição da Ação Corretiva (O Que Fazer)</label>
                <textarea
                  value={actionDescription}
                  onChange={(e) => setActionDescription(e.target.value)}
                  placeholder="Escreva a instrução detalhada de correção..."
                  rows={3}
                  className="w-full border-slate-200 focus:ring-1 focus:ring-slate-900 rounded-lg text-xs py-2 px-3 text-slate-800 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label>Responsável</label>
                  <select
                    value={responsibleUserId}
                    onChange={(e) => setResponsibleUserId(e.target.value)}
                    className="w-full border-slate-200 focus:ring-1 focus:ring-slate-900 rounded-lg text-xs py-2 px-3 text-slate-800 cursor-pointer"
                  >
                    {collaborators.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label>Prazo de Resolução</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full border-slate-200 focus:ring-1 focus:ring-slate-900 rounded-lg text-xs py-2 px-3 text-slate-800 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setIsAddPlanOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 font-bold hover:bg-slate-100"
                disabled={creating}
              >
                Cancelar
              </button>
              <button
                onClick={handleCreatePlan}
                className="px-4 py-2 bg-[#131b2e] hover:bg-slate-800 text-white rounded-lg font-bold disabled:opacity-50"
                disabled={creating}
              >
                {creating ? "Salvando..." : "Criar Plano"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Plans List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredPlans.map(plan => (
          <div
            key={plan.id}
            className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-start">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  plan.status === "completed" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700 animate-pulse"
                }`}>
                  {plan.status === "pending" ? "Pendente" : "Concluído"}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">ID: {plan.id.slice(0, 8)}...</span>
              </div>

              <div className="mt-3">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Instrução de Correção</h4>
                <p className="text-slate-800 font-bold text-sm mt-1 leading-snug">{plan.actionDescription}</p>
              </div>

              <div className="mt-3 bg-slate-50 p-2.5 rounded border border-slate-100 space-y-1 text-[10px] text-slate-500">
                <div>Não Conformidade: <span className="font-bold text-slate-600">{plan.nonConformity?.title}</span></div>
                <div>Unidade: <span className="font-bold text-slate-600">{plan.unit?.name}</span></div>
                <div>Responsável Atribuído: <span className="font-bold text-slate-600">{plan.responsibleUser?.name}</span></div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between text-[10px]">
              <div className="flex items-center gap-1 text-slate-500 font-semibold">
                <Calendar className="w-3.5 h-3.5" />
                <span>Prazo: {new Date(plan.dueDate).toLocaleDateString()}</span>
              </div>

              {plan.status === "pending" && (
                <button
                  onClick={() => handleCompletePlan(plan.id)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold uppercase text-[9px] shadow-sm transition-colors"
                >
                  Concluir Ação
                </button>
              )}
            </div>
          </div>
        ))}
        {filteredPlans.length === 0 && (
          <div className="col-span-full bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400 text-xs italic">
            Nenhum plano de ação encontrado.
          </div>
        )}
      </div>
    </div>
  );
}

function XCircleIcon() {
  return (
    <svg className="w-5 h-5 text-white hover:text-slate-300 cursor-pointer" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
