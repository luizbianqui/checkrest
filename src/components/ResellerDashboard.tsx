"use client";

import React, { useState, useEffect } from "react";
import { Company, User as UserType } from "@/types";
import { createCompanyWithInviteAction, getCompanyHierarchyAction } from "@/app/actions/dbActions";
import {
  Building,
  Users,
  Award,
  Key,
  Plus,
  Search,
  Link as LinkIcon,
  Copy,
  Check,
  Mail,
  Loader2,
  CheckCircle,
  ShieldCheck,
  TrendingUp,
  AlertCircle
} from "lucide-react";

interface ResellerDashboardProps {
  currentUser: UserType;
  companies: Company[];
  setCompanies: React.Dispatch<React.SetStateAction<Company[]>>;
}

export default function ResellerDashboard({
  currentUser,
  companies,
  setCompanies
}: ResellerDashboardProps) {
  const [hierarchyData, setHierarchyData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Modal / Form state for creating Sub-Company
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newCompanyCnpj, setNewCompanyCnpj] = useState("");
  const [newCompanyPlan, setNewCompanyPlan] = useState("Pro");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Invite link modal
  const [createdInvite, setCreatedInvite] = useState<{
    companyName: string;
    inviteUrl: string;
    token: string;
    email: string;
  } | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);
  const [emailSentAlert, setEmailSentAlert] = useState(false);

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");

  const loadHierarchy = async () => {
    if (!currentUser.companyId) {
      setLoading(false);
      return;
    }

    try {
      const res = await getCompanyHierarchyAction(currentUser.companyId);
      if (res.success && res.data) {
        setHierarchyData(res.data);
      }
    } catch (e) {
      console.warn("Erro ao carregar hierarquia da empresa administradora:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHierarchy();
  }, [currentUser.companyId]);

  // Derived calculations
  const subCompaniesList = hierarchyData?.subCompanies || companies.filter(c => c.parentCompanyId === currentUser.companyId);
  const maxLicensesAllowed = hierarchyData?.maxLicenses || 5;
  const licensesUsedCount = subCompaniesList.length;
  const availableLicenses = Math.max(0, maxLicensesAllowed - licensesUsedCount);

  const handleCreateSubCompany = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newCompanyName.trim() || !newCompanyCnpj.trim() || !adminName.trim() || !adminEmail.trim()) {
      alert("Por favor, preencha o Nome do Restaurante/Empresa, CNPJ e dados do Gestor.");
      return;
    }

    if (licensesUsedCount >= maxLicensesAllowed) {
      alert(`Você atingiu o limite de ${maxLicensesAllowed} licenças contratadas. Entre em contato com a Software House para expandir seu pacote.`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await createCompanyWithInviteAction({
        name: newCompanyName.trim(),
        cnpj: newCompanyCnpj.trim(),
        plan: newCompanyPlan,
        adminName: adminName.trim(),
        adminEmail: adminEmail.trim(),
        isReseller: false,
        parentCompanyId: currentUser.companyId
      });

      if (res.success && res.data) {
        const data = res.data;
        const fullUrl = `${window.location.origin}${data.activationUrl}`;
        setCreatedInvite({
          companyName: data.company.name,
          inviteUrl: fullUrl,
          token: data.token,
          email: adminEmail.trim()
        });

        // Update list
        setCompanies(prev => [
          {
            id: data.company.id,
            name: data.company.name,
            cnpj: data.company.cnpj,
            plan: data.company.plan,
            status: "active",
            parentCompanyId: currentUser.companyId,
            adminEmail: data.company.adminEmail,
            adminName: data.company.adminName
          },
          ...prev
        ]);

        setNewCompanyName("");
        setNewCompanyCnpj("");
        setAdminName("");
        setAdminEmail("");
        loadHierarchy();
      } else {
        alert("Erro ao cadastrar empresa cliente: " + (res.error || "Tente novamente"));
      }
    } catch (err: any) {
      alert("Erro ao criar empresa cliente: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCompanies = subCompaniesList.filter((c: any) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.cnpj.includes(searchQuery)
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200 uppercase tracking-wider">
              Portal da Empresa Administradora
            </span>
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight mt-1">Gestão de Licenças & Clientes</h2>
          <p className="text-slate-500 text-sm">Gerencie seus restaurantes contratantes, emita primeiros acessos e monitore o uso do seu pacote.</p>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Licenças Utilizadas</span>
            <h3 className="text-3xl font-black text-slate-800 mt-1">
              {licensesUsedCount} <span className="text-slate-400 text-lg font-normal">/ {maxLicensesAllowed}</span>
            </h3>
            <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
              <div
                className="bg-purple-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (licensesUsedCount / maxLicensesAllowed) * 100)}%` }}
              />
            </div>
          </div>
          <div className="p-3.5 bg-purple-50 rounded-2xl text-purple-600">
            <Key className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Licenças Disponíveis</span>
            <h3 className="text-3xl font-black text-emerald-600 mt-1">{availableLicenses}</h3>
            <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full mt-2 inline-block">
              Prontas para emissão
            </span>
          </div>
          <div className="p-3.5 bg-emerald-50 rounded-2xl text-emerald-600">
            <Building className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status do Contrato Master</span>
            <h3 className="text-2xl font-black text-slate-800 mt-1">Pacote Enterprise</h3>
            <span className="text-[10px] text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded-full mt-2 inline-block">
              Ativo com a Software House
            </span>
          </div>
          <div className="p-3.5 bg-blue-50 rounded-2xl text-blue-600">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Table Column */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
              <Search className="w-4 h-4 text-slate-400 mr-2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar cliente por nome ou CNPJ..."
                className="bg-transparent border-none focus:ring-0 text-xs w-full"
              />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">Empresas Clientes / Restaurantes Vinculados</h3>
              <span className="text-xs text-slate-400 font-semibold">{filteredCompanies.length} cadastrados</span>
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-600 mb-2" />
                <p className="text-xs">Carregando carteira de empresas...</p>
              </div>
            ) : filteredCompanies.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <Building className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-sm font-semibold text-slate-600">Nenhuma empresa cliente cadastrada ainda.</p>
                <p className="text-xs">Utilize o formulário ao lado para atribuir uma licença e gerar o primeiro acesso.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="px-6 py-3.5">Empresa Cliente</th>
                      <th className="px-6 py-3.5">CNPJ</th>
                      <th className="px-6 py-3.5">Plano</th>
                      <th className="px-6 py-3.5 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-semibold">
                    {filteredCompanies.map((c: any) => (
                      <tr key={c.id} className="hover:bg-slate-50/50 transition-all">
                        <td className="px-6 py-4">
                          <div className="font-extrabold text-slate-900 text-sm">{c.name}</div>
                          {c.adminEmail && (
                            <div className="text-[10px] text-slate-400 mt-0.5">{c.adminEmail}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 font-mono text-slate-600">{c.cnpj}</td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold bg-blue-50 text-blue-700 uppercase border border-blue-200">
                            {c.plan || "Pro"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Ativo
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Add Company Form Column */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 h-fit">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-800 text-sm">Vender / Atribuir Nova Licença</h3>
            <p className="text-xs text-slate-400 mt-1">Cadastre o restaurante cliente e emita o link de primeiro acesso.</p>
          </div>

          <form onSubmit={handleCreateSubCompany} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">Nome do Restaurante / Cliente</label>
              <input
                type="text"
                required
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                placeholder="Ex: Restaurante Burger Master"
                className="w-full border-slate-200 focus:ring-1 focus:ring-purple-600 rounded-xl text-xs py-2 px-3 text-slate-800 font-semibold"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">CNPJ do Cliente</label>
              <input
                type="text"
                required
                value={newCompanyCnpj}
                onChange={(e) => setNewCompanyCnpj(e.target.value)}
                placeholder="Ex: 00.000.000/0001-99"
                className="w-full border-slate-200 focus:ring-1 focus:ring-purple-600 rounded-xl text-xs py-2 px-3 text-slate-800 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">Nome do Responsável / Gestor</label>
              <input
                type="text"
                required
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                placeholder="Ex: Marcos Souza"
                className="w-full border-slate-200 focus:ring-1 focus:ring-purple-600 rounded-xl text-xs py-2 px-3 text-slate-800"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">E-mail do Responsável (Primeiro Acesso)</label>
              <input
                type="email"
                required
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="Ex: marcos@burgermaster.com"
                className="w-full border-slate-200 focus:ring-1 focus:ring-purple-600 rounded-xl text-xs py-2 px-3 text-slate-800"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">Plano Atribuído</label>
              <select
                value={newCompanyPlan}
                onChange={(e) => setNewCompanyPlan(e.target.value)}
                className="w-full border-slate-200 focus:ring-1 focus:ring-purple-600 rounded-xl text-xs py-2 px-3 font-semibold text-slate-800 cursor-pointer"
              >
                <option value="Basic">Basic (Até 2 Unidades)</option>
                <option value="Pro">Pro (Até 5 Unidades)</option>
                <option value="Enterprise">Enterprise (Unidades Ilimitadas)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={submitting || availableLicenses <= 0}
              className="w-full py-3 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Emitindo Licença...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Cadastrar Cliente & Gerar Link
                </>
              )}
            </button>

            {availableLicenses <= 0 && (
              <p className="text-[11px] text-amber-600 font-semibold text-center flex items-center justify-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                Limite de licenças atingido.
              </p>
            )}
          </form>
        </div>
      </div>

      {/* Modal de Link de Primeiro Acesso Gerado */}
      {createdInvite && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                  <LinkIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Link de Primeiro Acesso Emitido!</h3>
                  <p className="text-xs text-slate-500">{createdInvite.companyName}</p>
                </div>
              </div>
              <button
                onClick={() => setCreatedInvite(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                Envie este link para o e-mail <strong className="text-slate-900">{createdInvite.email}</strong>. O cliente irá clicar, definir a senha dele e acessar o restaurante dele no CheckRest.
              </p>

              <div className="p-3 bg-slate-900 text-slate-100 rounded-xl font-mono text-[11px] break-all border border-slate-800 flex items-center justify-between gap-2">
                <span className="select-all text-purple-300">{createdInvite.inviteUrl}</span>
              </div>

              {emailSentAlert && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>E-mail de boas-vindas enviado para o cliente com sucesso!</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(createdInvite.inviteUrl);
                    setCopiedToken(true);
                    setTimeout(() => setCopiedToken(false), 2000);
                  }}
                  className="flex-1 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md"
                >
                  {copiedToken ? (
                    <>
                      <Check className="w-4 h-4" />
                      Link Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copiar Link de Ativação
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    setEmailSentAlert(true);
                    setTimeout(() => setEmailSentAlert(false), 3500);
                  }}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all"
                >
                  <Mail className="w-4 h-4" />
                  Simular Envio por E-mail
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
