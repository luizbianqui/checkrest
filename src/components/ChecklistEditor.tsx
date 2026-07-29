"use client";

import React from "react";
import {
  ArrowLeft,
  Settings,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Camera,
  X,
  Check
} from "lucide-react";
import { Checklist, Question, QuestionType, Unit, User as UserType } from "@/types";

interface ChecklistEditorProps {
  editorChecklist: Checklist;
  selectedChecklistId: string | null;
  setEditorChecklist: React.Dispatch<React.SetStateAction<Checklist>>;
  setActiveTab: (tab: "dashboard" | "checklists" | "editor" | "ai" | "settings" | "companies" | "collaborators" | "nonconformities" | "actionplans" | "reports") => void;
  handleMoveQuestion: (index: number, direction: "up" | "down") => void;
  handleDeleteQuestion: (qId: string) => void;
  handleUpdateQuestion: (qId: string, fields: Partial<Question>) => void;
  handleAddQuestion: () => void;
  handleSaveChecklist: () => void;
  compressionLoading: string | null;
  progressPercent: number;
  handleMobilePhotoUpload: (qId: string, e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleSubmitChecklistExecution: () => Promise<void>;
  formatSize: (bytes?: number) => string;
  units: Unit[];
  currentUser: UserType | null;
  users?: UserType[];
  sectors?: string[];
}

export default function ChecklistEditor({
  editorChecklist,
  selectedChecklistId,
  setEditorChecklist,
  setActiveTab,
  handleMoveQuestion,
  handleDeleteQuestion,
  handleUpdateQuestion,
  handleAddQuestion,
  handleSaveChecklist,
  compressionLoading,
  progressPercent,
  handleMobilePhotoUpload,
  handleSubmitChecklistExecution,
  formatSize,
  users = [],
  sectors = []
}: ChecklistEditorProps) {
  const registeredManagers = users.filter(
    u => u.role === "UNIT_MANAGER" || u.role === "COMPANY_ADMIN"
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Back Bar */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setActiveTab("checklists")}
          className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors bg-white shadow-sm"
        >
          <ArrowLeft className="w-4 h-4 text-slate-700" />
        </button>
        <div>
          <h2 className="text-2xl font-black text-slate-900">
            {selectedChecklistId ? "Editar Checklist" : "Criar Novo Checklist"}
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Configure as perguntas, tipos de resposta e teste a execução em tempo real.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Form Controls and Question Builder */}
        <div className="lg:col-span-8 space-y-6">
          {/* Metadata Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Settings className="w-4 h-4 text-slate-500" />
              Detalhes do Checklist
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">Nome do Checklist</label>
                <input
                  type="text"
                  value={editorChecklist.title}
                  onChange={(e) => setEditorChecklist({ ...editorChecklist, title: e.target.value })}
                  className="w-full border-slate-200 focus:ring-[#131b2e] focus:border-[#131b2e] rounded-lg text-sm py-2 px-3 text-slate-800 font-semibold"
                  placeholder="Ex: Abertura da Cozinha"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">Setor</label>
                <select
                  value={editorChecklist.sector}
                  onChange={(e) => setEditorChecklist({ ...editorChecklist, sector: e.target.value })}
                  className="w-full border-slate-200 focus:ring-[#131b2e] focus:border-[#131b2e] rounded-lg text-sm py-2 px-3 cursor-pointer"
                >
                  {(sectors.length > 0 ? sectors : ["Cozinha Central", "Estoque", "Atendimento", "Balcão"]).map((sec, idx) => (
                    <option key={idx} value={sec}>{sec}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">Usuário Responsável</label>
                <select
                  value={editorChecklist.responsible}
                  onChange={(e) => setEditorChecklist({ ...editorChecklist, responsible: e.target.value })}
                  className="w-full border-slate-200 focus:ring-[#131b2e] focus:border-[#131b2e] rounded-lg text-sm py-2 px-3 cursor-pointer"
                >
                  <option value="Todos os Gerentes">Todos os Gerentes</option>
                  {registeredManagers.map((usr) => (
                    <option key={usr.id} value={usr.name}>
                      {usr.name} ({usr.role === "COMPANY_ADMIN" ? "Admin Empresa" : "Gerente de Unidade"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">Recorrência</label>
                <select
                  value={editorChecklist.recurrence}
                  onChange={(e) => setEditorChecklist({ ...editorChecklist, recurrence: e.target.value })}
                  className="w-full border-slate-200 focus:ring-[#131b2e] focus:border-[#131b2e] rounded-lg text-sm py-2 px-3 cursor-pointer"
                >
                  <option>Repetir diariamente</option>
                  <option>Semanal</option>
                  <option>Mensal</option>
                  <option>Personalizado</option>
                </select>
              </div>

              {/* Active Days */}
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-bold text-slate-500">Dias de Execução</label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => {
                    const isActive = editorChecklist.activeDays.includes(day);
                    return (
                      <button
                        key={day}
                        onClick={() => {
                          const updated = isActive
                            ? editorChecklist.activeDays.filter((d) => d !== day)
                            : [...editorChecklist.activeDays, day];
                          setEditorChecklist({ ...editorChecklist, activeDays: updated });
                        }}
                        className={`px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${
                          isActive
                            ? "bg-[#131b2e] text-white border-[#131b2e]"
                            : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Start and Limit times */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">Horário de Início</label>
                <input
                  type="time"
                  value={editorChecklist.startTime}
                  onChange={(e) => setEditorChecklist({ ...editorChecklist, startTime: e.target.value })}
                  className="w-full border-slate-200 focus:ring-[#131b2e] focus:border-[#131b2e] rounded-lg text-sm py-2 px-3"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">Horário Limite</label>
                <input
                  type="time"
                  value={editorChecklist.endTime}
                  onChange={(e) => setEditorChecklist({ ...editorChecklist, endTime: e.target.value })}
                  className="w-full border-slate-200 focus:ring-[#131b2e] focus:border-[#131b2e] rounded-lg text-sm py-2 px-3"
                />
              </div>

              {/* Execution Auth Type: Individual vs Shared Device */}
              <div className="space-y-1 sm:col-span-2 pt-3 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Tipo de Direcionamento / Identificação do Executante
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1.5">
                  <button
                    type="button"
                    onClick={() => setEditorChecklist({ ...editorChecklist, executionAuthType: 'shared_device' })}
                    className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all ${
                      (editorChecklist.executionAuthType || 'shared_device') === 'shared_device'
                        ? "bg-slate-900 text-white border-slate-900 shadow-md"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg shrink-0 text-base">
                      📱
                    </div>
                    <div>
                      <p className="text-xs font-bold">Equipamento Geral / Tablet da Loja</p>
                      <p className="text-[10px] opacity-80 mt-0.5 leading-tight">
                        Exige digitar Nome/Matrícula do operador no final do questionário.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditorChecklist({ ...editorChecklist, executionAuthType: 'individual' })}
                    className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all ${
                      editorChecklist.executionAuthType === 'individual'
                        ? "bg-slate-900 text-white border-slate-900 shadow-md"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg shrink-0 text-base">
                      👤
                    </div>
                    <div>
                      <p className="text-xs font-bold">Cadastro Individual (Login Nominal)</p>
                      <p className="text-[10px] opacity-80 mt-0.5 leading-tight">
                        Associa a execução automaticamente à conta logada no app.
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Question Builder List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-lg">Perguntas do Checklist</h3>
              <span className="text-xs font-bold text-slate-400 uppercase">
                {editorChecklist.questions.length} perguntas
              </span>
            </div>

            {editorChecklist.questions.map((q, idx) => (
              <div
                key={q.id}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm group hover:border-slate-300 transition-all"
              >
                <div className="bg-slate-50/80 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Pergunta {idx + 1}
                  </span>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleMoveQuestion(idx, "up")}
                      disabled={idx === 0}
                      className="text-slate-400 hover:text-slate-700 disabled:opacity-30 transition-colors"
                      title="Subir pergunta"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleMoveQuestion(idx, "down")}
                      disabled={idx === editorChecklist.questions.length - 1}
                      className="text-slate-400 hover:text-slate-700 disabled:opacity-30 transition-colors"
                      title="Descer pergunta"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteQuestion(q.id)}
                      className="text-slate-400 hover:text-red-500 transition-colors"
                      title="Excluir pergunta"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="p-4 space-y-4">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 space-y-1">
                      <label className="text-xs font-bold text-slate-400">Título da Pergunta / Instrução</label>
                      <input
                        type="text"
                        value={q.title}
                        onChange={(e) => handleUpdateQuestion(q.id, { title: e.target.value })}
                        className="w-full border-slate-200 focus:ring-[#131b2e] focus:border-[#131b2e] rounded-lg text-sm py-2 px-3"
                        placeholder="Ex: Higienizar pia do salão"
                      />
                    </div>

                    <div className="w-full md:w-48 space-y-1">
                      <label className="text-xs font-bold text-slate-400">Tipo de Resposta</label>
                      <select
                        value={q.type}
                        onChange={(e) => {
                          const valType = e.target.value as QuestionType;
                          handleUpdateQuestion(q.id, { 
                            type: valType, 
                            value: valType === "checkbox" ? false : "",
                            unitMeasure: valType === "number" ? "°C" : undefined,
                            minValue: valType === "number" ? 0 : undefined,
                            maxValue: valType === "number" ? 100 : undefined,
                            idealValue: valType === "number" ? 50 : undefined,
                            generateOccurrenceOnFailure: valType === "number" ? true : undefined,
                            requiresObservationOnFailure: valType === "number" ? false : undefined,
                            requiresPhotoOnFailure: valType === "number" ? false : undefined,
                            failureSeverity: valType === "number" ? "medium" : undefined
                          });
                        }}
                        className="w-full border-slate-200 focus:ring-[#131b2e] focus:border-[#131b2e] rounded-lg text-sm py-2 px-3 cursor-pointer"
                      >
                        <option value="checkbox">Checkbox (Sim/Não)</option>
                        <option value="text">Texto / Observação</option>
                        <option value="photo">Foto / Evidência</option>
                        <option value="number">Valor Numérico (Mín/Máx)</option>
                      </select>
                    </div>
                  </div>

                  {q.type === "number" && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 bg-slate-50/50 p-4 rounded-lg border border-slate-100 animate-fadeIn">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Unidade</label>
                        <input
                          type="text"
                          value={q.unitMeasure || ""}
                          onChange={(e) => handleUpdateQuestion(q.id, { unitMeasure: e.target.value })}
                          className="w-full border-slate-200 rounded-lg text-xs py-1 px-2.5 bg-white"
                          placeholder="Ex: °C, kg"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Mínimo</label>
                        <input
                          type="number"
                          value={q.minValue !== undefined ? q.minValue : ""}
                          onChange={(e) => handleUpdateQuestion(q.id, { minValue: parseFloat(e.target.value) })}
                          className="w-full border-slate-200 rounded-lg text-xs py-1 px-2.5 bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Máximo</label>
                        <input
                          type="number"
                          value={q.maxValue !== undefined ? q.maxValue : ""}
                          onChange={(e) => handleUpdateQuestion(q.id, { maxValue: parseFloat(e.target.value) })}
                          className="w-full border-slate-200 rounded-lg text-xs py-1 px-2.5 bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Ideal / Ref</label>
                        <input
                          type="number"
                          value={q.idealValue !== undefined ? q.idealValue : ""}
                          onChange={(e) => handleUpdateQuestion(q.id, { idealValue: parseFloat(e.target.value) })}
                          className="w-full border-slate-200 rounded-lg text-xs py-1 px-2.5 bg-white"
                        />
                      </div>
                      <div className="col-span-2 md:col-span-4 grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={q.generateOccurrenceOnFailure || false}
                            onChange={(e) => handleUpdateQuestion(q.id, { generateOccurrenceOnFailure: e.target.checked })}
                            className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                          />
                          Gerar ocorrência se fora
                        </label>
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={q.requiresObservationOnFailure || false}
                            onChange={(e) => handleUpdateQuestion(q.id, { requiresObservationOnFailure: e.target.checked })}
                            className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                          />
                          Exigir observação se fora
                        </label>
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={q.requiresPhotoOnFailure || false}
                            onChange={(e) => handleUpdateQuestion(q.id, { requiresPhotoOnFailure: e.target.checked })}
                            className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                          />
                          Exigir foto se fora
                        </label>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase whitespace-nowrap">Criticidade:</span>
                          <select
                            value={q.failureSeverity || "medium"}
                            onChange={(e) => handleUpdateQuestion(q.id, { failureSeverity: e.target.value })}
                            className="border-slate-200 rounded-lg text-xs py-1 px-2.5 bg-white cursor-pointer w-full"
                          >
                            <option value="low">Baixa</option>
                            <option value="medium">Média</option>
                            <option value="high">Alta</option>
                            <option value="critical">Crítica</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            <button
              onClick={handleAddQuestion}
              className="w-full border-2 border-dashed border-slate-300 hover:border-slate-500 bg-white py-4 rounded-xl text-slate-500 font-bold text-sm hover:text-slate-700 transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5 text-slate-500" />
              Adicionar Nova Pergunta
            </button>
          </div>

          {/* Save/Actions Bar */}
          <div className="flex items-center gap-4 bg-white border border-slate-200 rounded-xl p-4 shadow-sm justify-end">
            <button
              onClick={() => setActiveTab("checklists")}
              className="px-5 py-2.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors uppercase"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveChecklist}
              className="px-5 py-2.5 bg-[#131b2e] hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors uppercase tracking-wider shadow-sm"
            >
              Salvar Checklist
            </button>
          </div>
        </div>

        {/* Right: Mobile Live Preview Simulator */}
        <div className="w-full max-w-[360px] lg:max-w-none lg:w-[380px] shrink-0 sticky top-24 self-start flex flex-col items-center mx-auto lg:mx-0">
          <div className="w-full bg-slate-900 rounded-[3rem] p-3 shadow-2xl border-4 border-slate-800 flex flex-col overflow-hidden relative aspect-[9/18]">
            
            {/* Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-900 rounded-b-xl z-20 flex justify-center items-center">
              <div className="w-12 h-1 bg-slate-800 rounded-full"></div>
              <div className="w-2.5 h-2.5 bg-slate-800 rounded-full ml-3"></div>
            </div>

            {/* Screen Content Wrapper */}
            <div className="w-full h-full bg-slate-50 rounded-[2.2rem] overflow-hidden relative flex flex-col pt-6">
              
              {/* Simulator Header */}
              <div className="bg-[#131b2e] text-white p-5 pt-6 flex flex-col gap-2 shrink-0">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-sm leading-tight text-white truncate max-w-[180px]">
                      {editorChecklist.title || "Sem título"}
                    </h4>
                    <p className="text-[10px] opacity-75">
                      {editorChecklist.sector} • {editorChecklist.startTime} - {editorChecklist.endTime}
                    </p>
                  </div>
                  <span className="bg-emerald-400/20 px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider text-emerald-400 border border-emerald-400/20">
                    Live Preview
                  </span>
                </div>

                {/* Progress bar inside mockup */}
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-[9px] font-bold opacity-80">
                    <span>Progresso</span>
                    <span>{progressPercent}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full bg-[#6cf8bb] transition-all duration-300" style={{ width: `${progressPercent}%` }}></div>
                  </div>
                </div>
              </div>

              {/* Simulator Questions list */}
              <div className="flex-1 p-4 space-y-4 overflow-y-auto preview-scroll bg-slate-50">
                {editorChecklist.questions.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs italic">
                    Nenhuma pergunta adicionada. Use o construtor ao lado para adicionar.
                  </div>
                ) : (
                  editorChecklist.questions.map((q, idx) => (
                    <div
                      key={q.id}
                      className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-sm space-y-3"
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-100 rounded px-1.5 py-0.5">
                          {idx + 1}
                        </span>
                        <p className="text-xs font-bold text-slate-800 leading-tight">
                          {q.title || `Pergunta ${idx + 1} (Sem título)`}
                        </p>
                      </div>

                      {/* Question Types Inputs Render */}
                      {q.type === "checkbox" && (
                        <div className="flex gap-4 pt-1">
                          <button
                            onClick={() => handleUpdateQuestion(q.id, { value: true })}
                            className={`flex-1 py-1.5 px-3 rounded-lg border text-center text-xs font-bold transition-all ${
                              q.value === true
                                ? "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm"
                                : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                            }`}
                          >
                            Sim
                          </button>
                          <button
                            onClick={() => handleUpdateQuestion(q.id, { value: false })}
                            className={`flex-1 py-1.5 px-3 rounded-lg border text-center text-xs font-bold transition-all ${
                              q.value === false
                                ? "bg-red-50 border-red-300 text-red-700 shadow-sm"
                                : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                            }`}
                          >
                            Não
                          </button>
                        </div>
                      )}

                      {q.type === "text" && (
                        <input
                          type="text"
                          value={typeof q.value === "string" ? q.value : ""}
                          onChange={(e) => handleUpdateQuestion(q.id, { value: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs py-1.5 px-3 focus:ring-1 focus:ring-slate-900 focus:bg-white"
                          placeholder="Digite a resposta ou nota..."
                        />
                      )}

                      {q.type === "photo" && (
                        <div className="space-y-2">
                          {q.value ? (
                            <div className="space-y-2 bg-slate-50 rounded-lg p-2.5 border border-slate-200">
                              <div className="relative aspect-video rounded overflow-hidden border border-slate-200 bg-white flex items-center justify-center shadow-inner">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={q.value as string}
                                  alt="Evidência fotográfica"
                                  className="max-h-24 object-contain"
                                />
                                <button
                                  onClick={() => handleUpdateQuestion(q.id, { value: "", photoUrl: "", originalSize: undefined, compressedSize: undefined, reductionPercent: undefined })}
                                  className="absolute top-1 right-1 p-1 bg-red-500 hover:bg-red-600 rounded-full text-white transition-colors"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {/* Compression Stats */}
                              <div className="text-[9px] text-slate-500 font-mono space-y-1 bg-white p-2 rounded border border-slate-100 shadow-sm">
                                <div className="flex justify-between border-b border-slate-50 pb-1">
                                  <span className="font-semibold">Original:</span>
                                  <span className="line-through">{formatSize(q.originalSize)}</span>
                                </div>
                                <div className="flex justify-between border-b border-slate-50 pb-1 text-[#006c49]">
                                  <span className="font-bold">Comprimido WebP:</span>
                                  <span className="font-bold">{formatSize(q.compressedSize)}</span>
                                </div>
                                {q.reductionPercent && (
                                  <div className="text-emerald-700 font-bold text-center pt-1 flex items-center justify-center gap-1">
                                    <Check className="w-3.5 h-3.5" />
                                    Reduzido em {q.reductionPercent}%!
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="relative">
                              {compressionLoading === q.id ? (
                                <div className="w-full py-4 bg-slate-100 rounded-lg border border-slate-200 flex flex-col items-center justify-center gap-2">
                                  <svg className="animate-spin h-5 w-5 text-[#006c49]" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                  </svg>
                                  <span className="text-[10px] text-slate-500 font-semibold font-mono">Convertendo para WebP...</span>
                                </div>
                              ) : (
                                <div className="relative border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 rounded-lg py-4 flex flex-col items-center justify-center cursor-pointer text-slate-400 group/btn transition-colors">
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleMobilePhotoUpload(q.id, e)}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                  />
                                  <Camera className="w-5 h-5 text-slate-400 group-hover/btn:text-slate-600 transition-colors" />
                                  <span className="text-[10px] font-bold mt-1 uppercase tracking-wider text-slate-500">Tirar / Anexar Foto</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {q.type === "number" && (
                        <div className="space-y-2 text-left">
                          <div className="flex gap-2 items-center">
                            <input
                              type="number"
                              value={q.value !== undefined ? String(q.value) : ""}
                              onChange={(e) => {
                                const valStr = e.target.value;
                                handleUpdateQuestion(q.id, { value: valStr });
                              }}
                              className={`flex-1 bg-slate-50 border rounded-lg text-xs py-1.5 px-3 focus:ring-1 focus:ring-slate-900 focus:bg-white text-slate-800 ${
                                q.value !== undefined && q.value !== "" && (parseFloat(String(q.value)) < (q.minValue ?? -Infinity) || parseFloat(String(q.value)) > (q.maxValue ?? Infinity))
                                  ? "border-red-300 bg-red-50 text-red-700 font-bold"
                                  : "border-slate-200"
                              }`}
                              placeholder={`Esperado: ${q.minValue ?? "-"} a ${q.maxValue ?? "-"} ${q.unitMeasure || ""}`}
                            />
                            <span className="text-xs font-bold text-slate-500">{q.unitMeasure}</span>
                          </div>
                          
                          {/* Alert visual if out of range */}
                          {q.value !== undefined && q.value !== "" && (parseFloat(String(q.value)) < (q.minValue ?? -Infinity) || parseFloat(String(q.value)) > (q.maxValue ?? Infinity)) && (
                            <div className="text-[10px] font-bold text-red-600 bg-red-50 p-2 rounded-lg border border-red-150 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping mr-1"></span>
                              Fora do limite permitido!
                            </div>
                          )}

                          {/* Conditional observation if out of range */}
                          {q.value !== undefined && q.value !== "" && (parseFloat(String(q.value)) < (q.minValue ?? -Infinity) || parseFloat(String(q.value)) > (q.maxValue ?? Infinity)) && q.requiresObservationOnFailure && (
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-red-500 uppercase">Observação Obrigatória</label>
                              <input
                                type="text"
                                value={q.observation || ""}
                                onChange={(e) => handleUpdateQuestion(q.id, { observation: e.target.value })}
                                className="w-full bg-red-50/10 border border-red-200 rounded-lg text-xs py-1.5 px-3 text-slate-800 focus:bg-white focus:outline-none"
                                placeholder="Descreva o motivo do desvio..."
                              />
                            </div>
                          )}

                          {/* Conditional photo if out of range */}
                          {q.value !== undefined && q.value !== "" && (parseFloat(String(q.value)) < (q.minValue ?? -Infinity) || parseFloat(String(q.value)) > (q.maxValue ?? Infinity)) && q.requiresPhotoOnFailure && (
                            <div className="space-y-2">
                              <label className="text-[9px] font-bold text-red-500 uppercase block">Foto Obrigatória</label>
                              {q.photoUrl ? (
                                <div className="relative aspect-video rounded overflow-hidden border border-slate-200 bg-white flex items-center justify-center">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={q.photoUrl} alt="Evidência" className="max-h-20 object-contain" />
                                  <button
                                    onClick={() => handleUpdateQuestion(q.id, { photoUrl: "", value: "" })}
                                    className="absolute top-1 right-1 p-1 bg-red-500 hover:bg-red-600 rounded-full text-white"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <div className="relative border border-dashed border-red-300 bg-red-50/10 hover:bg-red-50/20 rounded-lg py-3 flex flex-col items-center justify-center cursor-pointer text-slate-400 group/btn transition-colors">
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleMobilePhotoUpload(q.id, e)}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                  />
                                  <Camera className="w-4 h-4 text-red-400" />
                                  <span className="text-[9px] font-bold mt-1 text-red-500 uppercase tracking-wider">Tirar Foto</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Mockup Footer Submit */}
              <div className="p-4 bg-white border-t border-slate-200 flex flex-col gap-2 shrink-0">
                <button
                  onClick={handleSubmitChecklistExecution}
                  disabled={editorChecklist.questions.length === 0}
                  className="w-full bg-[#131b2e] hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-slate-900/10"
                >
                  Enviar Checklist
                </button>
              </div>
            </div>
          </div>
          <p className="text-slate-400 text-[10px] font-bold mt-3 uppercase tracking-wider">Mockup de Simulação (Mobile View)</p>
        </div>

      </div>
    </div>
  );
}
