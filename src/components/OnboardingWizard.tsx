"use client";

import { useState } from "react";
import { Building, Store, Layers, Users, CheckCircle2, ArrowRight, ArrowLeft, Sparkles, Copy, Check, ShieldCheck, X } from "lucide-react";
import { Unit } from "@/types";

interface OnboardingWizardProps {
  companyName: string;
  onComplete: (data: {
    companyName: string;
    firstUnitName: string;
    firstUnitAddress: string;
    selectedSectors: string[];
  }) => void;
  onSkip?: () => void;
}

export default function OnboardingWizard({ companyName: initialCompanyName, onComplete, onSkip }: OnboardingWizardProps) {
  const [step, setStep] = useState(1);
  const [companyName, setCompanyName] = useState(initialCompanyName || "Minha Empresa Franquia");
  const [firstUnitName, setFirstUnitName] = useState("Unidade 01 - Centro");
  const [firstUnitAddress, setFirstUnitAddress] = useState("Av. Paulista, 1000 - São Paulo/SP");
  const [selectedSectors, setSelectedSectors] = useState<string[]>([
    "Cozinha Central",
    "Balcão & Atendimento",
    "Estoque & Câmaras Frias",
    "Sanitários"
  ]);
  const [copiedLink, setCopiedLink] = useState(false);

  const availableSectors = [
    "Cozinha Central",
    "Balcão & Atendimento",
    "Estoque & Câmaras Frias",
    "Sanitários",
    "Drive-Thru",
    "Salão & Mesas",
    "Área de Entrega / Delivery"
  ];

  const toggleSector = (sector: string) => {
    if (selectedSectors.includes(sector)) {
      setSelectedSectors(selectedSectors.filter(s => s !== sector));
    } else {
      setSelectedSectors([...selectedSectors, sector]);
    }
  };

  const handleCopyInviteLink = () => {
    navigator.clipboard.writeText("https://checkrest.app/invite?token=piloto-bobs-2026");
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleFinish = () => {
    onComplete({
      companyName,
      firstUnitName,
      firstUnitAddress,
      selectedSectors
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto font-sans">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden my-8 animate-fadeIn">
        
        {/* Header Visual Bar */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-8 py-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl text-emerald-400">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight">Wizard de Configuração Inicial</h2>
                <p className="text-xs text-slate-300">Prepare sua empresa em menos de 2 minutos para o teste piloto.</p>
              </div>
            </div>
            {onSkip && (
              <button
                type="button"
                onClick={onSkip}
                className="text-xs text-slate-400 hover:text-red-400 font-semibold transition-colors flex items-center gap-1 bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg"
                title="Sair para a tela de Login"
              >
                <X className="w-3.5 h-3.5" />
                Cancelar Cadastro
              </button>
            )}
          </div>

          {/* Stepper Progress */}
          <div className="grid grid-cols-4 gap-2 mt-6 relative z-10">
            {[
              { num: 1, label: "Empresa" },
              { num: 2, label: "Unidade" },
              { num: 3, label: "Setores" },
              { num: 4, label: "Convite Operacional" }
            ].map((s) => (
              <div key={s.num} className="space-y-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all ${
                    step >= s.num ? "bg-emerald-400 shadow-sm shadow-emerald-400/50" : "bg-white/10"
                  }`}
                ></div>
                <p className={`text-[10px] font-bold uppercase tracking-wider ${
                  step === s.num ? "text-emerald-400" : step > s.num ? "text-slate-300" : "text-slate-500"
                }`}>
                  {s.num}. {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-8 space-y-6">
          
          {/* STEP 1: EMPRESA */}
          {step === 1 && (
            <div className="space-y-5 animate-fadeIn">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-base">Dados da Sua Empresa</h3>
                  <p className="text-xs text-slate-500">Confirme o nome da marca ou franquia cadastrada no SaaS.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Nome da Empresa / Grupo</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Ex: Bob's - Rede São Paulo"
                  />
                </div>

                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-emerald-900 space-y-1">
                    <p className="font-bold">Conta Administrador Master Ativada (`COMPANY_ADMIN`)</p>
                    <p className="text-emerald-700">Seu e-mail Google possui privilégio total para gerenciar unidades, convidar gerentes e configurar checklists.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: UNIDADE */}
          {step === 2 && (
            <div className="space-y-5 animate-fadeIn">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="p-2 bg-blue-50 text-blue-700 rounded-xl">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-base">Cadastrar Primeira Unidade / Loja</h3>
                  <p className="text-xs text-slate-500">Informe a loja piloto onde os testes in loco serão realizados.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Nome da Loja / Filial</label>
                  <input
                    type="text"
                    value={firstUnitName}
                    onChange={(e) => setFirstUnitName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Ex: Bob's - Loja 01 (Shopping Iguatemi)"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Endereço da Unidade</label>
                  <input
                    type="text"
                    value={firstUnitAddress}
                    onChange={(e) => setFirstUnitAddress(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Ex: Av. Brigadeiro Faria Lima, 2000"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: SETORES */}
          {step === 3 && (
            <div className="space-y-5 animate-fadeIn">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="p-2 bg-purple-50 text-purple-700 rounded-xl">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-base">Setores de Auditoria</h3>
                  <p className="text-xs text-slate-500">Selecione os ambientes que passarão por auditoria na rotina diária.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {availableSectors.map((sector) => {
                  const isSelected = selectedSectors.includes(sector);
                  return (
                    <button
                      key={sector}
                      type="button"
                      onClick={() => toggleSector(sector)}
                      className={`p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all ${
                        isSelected
                          ? "bg-slate-900 border-slate-900 text-white font-bold shadow-md"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      <span className="text-xs">{sector}</span>
                      {isSelected ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0"></div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 4: CONVITE OPERACIONAL */}
          {step === 4 && (
            <div className="space-y-5 animate-fadeIn">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="p-2 bg-amber-50 text-amber-700 rounded-xl">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-base">Link de Acesso para o Gerente & Tablet</h3>
                  <p className="text-xs text-slate-500">Copie o link de ativação para disponibilizar no tablet da loja ou enviar ao gerente.</p>
                </div>
              </div>

              <div className="p-5 bg-slate-900 rounded-2xl text-white space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Link de Convite Gerado</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-extrabold border border-emerald-500/30">Google Auth Pronto</span>
                </div>

                <div className="bg-slate-950 border border-white/10 rounded-xl p-3 flex items-center justify-between gap-3">
                  <p className="text-xs font-mono text-slate-300 truncate">
                    https://checkrest.app/invite?token=piloto-bobs-2026
                  </p>
                  <button
                    type="button"
                    onClick={handleCopyInviteLink}
                    className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-lg transition-all flex items-center gap-1.5 shrink-0"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedLink ? "Copiado!" : "Copiar Link"}
                  </button>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  💡 Ao abrir este link e selecionar <strong className="text-white">"Continuar com o Google"</strong>, o gerente ou o tablet operacional da unidade <strong className="text-white">{firstUnitName}</strong> será configurado instantaneamente.
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Footer Navigation Controls */}
        <div className="px-8 py-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="px-4 py-2.5 border border-slate-300 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </button>
          ) : (
            <div></div>
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className="px-6 py-2.5 bg-[#131b2e] hover:bg-slate-800 text-white font-black text-xs rounded-xl transition-all shadow-md flex items-center gap-2"
            >
              Próximo Passo
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2 active:scale-95"
            >
              Concluir & Ir para o Painel
              <Check className="w-4 h-4" />
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
