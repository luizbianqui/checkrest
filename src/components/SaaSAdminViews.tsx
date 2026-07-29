"use client";

import { useState, useEffect } from "react";
import { getUsersAction, createUserAction, toggleUserStatusAction } from "@/app/actions/dbActions";
import {
  Building,
  Award,
  User,
  Layers,
  Clock,
  Shield,
  Settings,
  Activity,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  DollarSign,
  Users,
  Briefcase
} from "lucide-react";
import { Company, User as UserType, AuditLog } from "@/types";

interface SaaSAdminViewsProps {
  activeTab: string;
  companies: Company[];
  setCompanies: React.Dispatch<React.SetStateAction<Company[]>>;
  handleAddCompany: () => void;
  newCompanyName: string;
  setNewCompanyName: (val: string) => void;
  newCompanyCnpj: string;
  setNewCompanyCnpj: (val: string) => void;
  newCompanyPlan: "Basic" | "Pro" | "Enterprise";
  setNewCompanyPlan: (val: "Basic" | "Pro" | "Enterprise") => void;
  handleToggleCompanyStatus: (id: string) => void;
  auditLogs: AuditLog[];
}

export default function SaaSAdminViews({
  activeTab,
  companies,
  setCompanies,
  handleAddCompany,
  newCompanyName,
  setNewCompanyName,
  newCompanyCnpj,
  setNewCompanyCnpj,
  newCompanyPlan,
  setNewCompanyPlan,
  handleToggleCompanyStatus,
  auditLogs
}: SaaSAdminViewsProps) {
  // Local States for SaaS features
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlanFilter, setSelectedPlanFilter] = useState("Todos");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("Todos");

  // Admins state
  const [admins, setAdmins] = useState<UserType[]>([
    { id: "adm-1", companyId: "comp-1", unitId: null, name: "Lucas Silveira", email: "lucas@modelo.com.br", role: "COMPANY_ADMIN", status: "active" },
    { id: "adm-2", companyId: "comp-2", unitId: null, name: "Fernanda Lima", email: "fernanda@express.com.br", role: "COMPANY_ADMIN", status: "active" },
    { id: "adm-3", companyId: "comp-3", unitId: null, name: "Kenji Sato", email: "kenji@sushigarden.com.br", role: "COMPANY_ADMIN", status: "inactive" }
  ]);
  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminCompanyId, setNewAdminCompanyId] = useState("comp-1");

  useEffect(() => {
    async function loadRealAdmins() {
      try {
        const res = await getUsersAction(null);
        if (res.success && res.data) {
          const companyAdmins = res.data.filter(u => u.role === "COMPANY_ADMIN");
          setAdmins(companyAdmins.map(u => ({
            id: u.id,
            companyId: u.companyId || "comp-1",
            unitId: u.unitId,
            name: u.name,
            email: u.email,
            role: u.role as any,
            status: u.status as any
          })));
        }
      } catch (e) {
        console.warn("Erro ao carregar admins reais:", e);
      }
    }
    loadRealAdmins();
  }, []);

  // Licenses & Contracts Mock Data
  const [licenses, setLicenses] = useState([
    { companyId: "comp-1", name: "Restaurante Modelo", unitsAllowed: 5, unitsActive: 2, usersAllowed: 20, usersActive: 12 },
    { companyId: "comp-2", name: "Hamburgueria Express", unitsAllowed: 2, unitsActive: 1, usersAllowed: 5, usersActive: 3 },
    { companyId: "comp-3", name: "Sushi Garden Group", unitsAllowed: 10, unitsActive: 3, usersAllowed: 50, usersActive: 0 }
  ]);

  // Modules toggles
  const [modules, setModules] = useState([
    { companyId: "comp-1", name: "Restaurante Modelo", iaEnabled: true, offlineEnabled: true, reportsEnabled: true, customBranding: false },
    { companyId: "comp-2", name: "Hamburgueria Express", iaEnabled: false, offlineEnabled: true, reportsEnabled: true, customBranding: false },
    { companyId: "comp-3", name: "Sushi Garden Group", iaEnabled: true, offlineEnabled: true, reportsEnabled: true, customBranding: true }
  ]);

  // Commercial Status Mock Data
  const [contracts, setContracts] = useState([
    { companyId: "comp-1", name: "Restaurante Modelo", startDate: "2026-01-10", endDate: "2027-01-10", billingCycle: "Mensal", value: 599.00, lastInvoiceStatus: "paid" },
    { companyId: "comp-2", name: "Hamburgueria Express", startDate: "2026-03-15", endDate: "2027-03-15", billingCycle: "Anual", value: 2990.00, lastInvoiceStatus: "paid" },
    { companyId: "comp-3", name: "Sushi Garden Group", startDate: "2025-12-01", endDate: "2026-12-01", billingCycle: "Mensal", value: 1199.00, lastInvoiceStatus: "overdue" }
  ]);

  const handleAddAdmin = async () => {
    if (!newAdminName.trim() || !newAdminEmail.trim()) {
      alert("Preencha todos os campos do admin.");
      return;
    }

    try {
      const res = await createUserAction({
        companyId: newAdminCompanyId,
        name: newAdminName,
        email: newAdminEmail,
        role: "COMPANY_ADMIN",
        passwordHash: "empresa123", // default company admin password
        unitId: null
      });

      if (res.success && res.data) {
        const added = res.data;
        setAdmins(prev => [
          {
            id: added.id,
            companyId: added.companyId || newAdminCompanyId,
            unitId: null,
            name: added.name,
            email: added.email,
            role: "COMPANY_ADMIN",
            status: added.status as any
          },
          ...prev
        ]);
        setNewAdminName("");
        setNewAdminEmail("");
        alert("Administrador de Empresa cadastrado com sucesso!");
        return;
      }
    } catch (e) {
      console.warn("Falha ao salvar no banco, caindo no mock:", e);
    }

    const newAdm: UserType = {
      id: "adm-" + Date.now(),
      companyId: newAdminCompanyId,
      unitId: null,
      name: newAdminName,
      email: newAdminEmail,
      role: "COMPANY_ADMIN",
      status: "active"
    };
    setAdmins([...admins, newAdm]);
    setNewAdminName("");
    setNewAdminEmail("");
    alert("Administrador de Empresa cadastrado localmente!");
  };

  const handleToggleAdminStatus = async (id: string) => {
    const adm = admins.find(a => a.id === id);
    if (!adm) return;

    try {
      const res = await toggleUserStatusAction(id, adm.status);
      if (res.success && res.data) {
        const d = res.data;
        setAdmins(prev => prev.map(a => a.id === id ? { ...a, status: d.status as any } : a));
        alert(`Status do administrador alterado para ${d.status === "active" ? "Ativo" : "Suspenso"}!`);
        return;
      }
    } catch (e) {
      console.warn("Falha ao atualizar status no banco, caindo no mock:", e);
    }

    setAdmins(prev => prev.map(a => a.id === id ? { ...a, status: a.status === "active" ? "inactive" : "active" } : a));
  };

  // Filtered lists
  const filteredCompanies = companies.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.cnpj.includes(searchQuery);
    const matchPlan = selectedPlanFilter === "Todos" || c.plan === selectedPlanFilter;
    const matchStatus = selectedStatusFilter === "Todos" || c.status === selectedStatusFilter;
    return matchSearch && matchPlan && matchStatus;
  });

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* VIEW: PAINEL SAAS / DASHBOARD                                                  */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === "dashboard_saas" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Painel Executivo SaaS</h2>
            <p className="text-slate-500 text-sm mt-1">Visão geral do faturamento, saúde das contas e adoção da plataforma.</p>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase">Faturamento Mensal</span>
                <h3 className="text-2xl font-black text-slate-800 mt-1">R$ 2.397,00</h3>
                <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full mt-2 inline-block">+12% este mês</span>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase">Clientes Ativos</span>
                <h3 className="text-2xl font-black text-slate-800 mt-1">
                  {companies.filter(c => c.status === "active").length} / {companies.length}
                </h3>
                <span className="text-[10px] text-slate-400 font-medium mt-2 inline-block">SaaS Multi-tenancy</span>
              </div>
              <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
                <Building className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase">Licenças de Usuário</span>
                <h3 className="text-2xl font-black text-slate-800 mt-1">15 / 75</h3>
                <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-full mt-2 inline-block">20% de utilização</span>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
                <Users className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase">Churn Rate</span>
                <h3 className="text-2xl font-black text-slate-800 mt-1">0.0%</h3>
                <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full mt-2 inline-block">Excelente retenção</span>
              </div>
              <div className="p-3 bg-purple-50 rounded-xl text-purple-600">
                <Activity className="w-6 h-6" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <h3 className="font-bold text-slate-800 text-sm mb-4">Empresas Recentes</h3>
              <div className="space-y-4">
                {companies.slice(0, 3).map(c => (
                  <div key={c.id} className="flex justify-between items-center p-3.5 bg-slate-50 border border-slate-100 rounded-lg">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">{c.name}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">CNPJ: {c.cnpj}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded ${
                        c.plan === "Enterprise" ? "bg-purple-100 text-purple-700" : c.plan === "Pro" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                      }`}>{c.plan}</span>
                      <span className={`w-2 h-2 rounded-full ${c.status === "active" ? "bg-emerald-500" : "bg-red-500"}`} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-1 bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <h3 className="font-bold text-slate-800 text-sm mb-4">Atividade SaaS Recente</h3>
              <div className="space-y-3.5 max-h-[220px] overflow-y-auto preview-scroll">
                {auditLogs.slice(0, 5).map(log => (
                  <div key={log.id} className="text-xs border-l-2 border-indigo-500 pl-3 py-0.5 space-y-1">
                    <p className="font-bold text-slate-700">{log.action}</p>
                    <p className="text-[10px] text-slate-400">{new Date(log.createdAt).toLocaleString("pt-BR")}</p>
                  </div>
                ))}
                {auditLogs.length === 0 && (
                  <p className="text-xs text-slate-400 italic text-center py-8">Nenhuma atividade registrada ainda.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* VIEW: EMPRESAS SAAS                                                           */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === "companies" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Gestão de Empresas Clientes</h2>
            <p className="text-slate-500 text-sm mt-1">Monitore, suspenda, altere planos e cadastre novos tenants.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 space-y-4">
              {/* Filters */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
                <div className="flex items-center w-full md:w-1/2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus-within:ring-1 focus-within:ring-slate-900">
                  <Search className="w-4 h-4 text-slate-400 mr-2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar por nome ou CNPJ..."
                    className="bg-transparent border-none focus:ring-0 text-xs w-full py-0.5"
                  />
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                  <select
                    value={selectedPlanFilter}
                    onChange={(e) => setSelectedPlanFilter(e.target.value)}
                    className="border-slate-200 focus:ring-1 focus:ring-slate-900 rounded-lg text-xs py-1.5 px-3 cursor-pointer"
                  >
                    <option value="Todos">Planos: Todos</option>
                    <option value="Basic">Basic</option>
                    <option value="Pro">Pro</option>
                    <option value="Enterprise">Enterprise</option>
                  </select>
                  <select
                    value={selectedStatusFilter}
                    onChange={(e) => setSelectedStatusFilter(e.target.value)}
                    className="border-slate-200 focus:ring-1 focus:ring-slate-900 rounded-lg text-xs py-1.5 px-3 cursor-pointer"
                  >
                    <option value="Todos">Status: Todos</option>
                    <option value="active">Ativo</option>
                    <option value="inactive">Suspenso</option>
                  </select>
                </div>
              </div>

              {/* Companies Table */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="px-6 py-3.5">Empresa & CNPJ</th>
                        <th className="px-6 py-3.5">Plano</th>
                        <th className="px-6 py-3.5">Status</th>
                        <th className="px-6 py-3.5 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredCompanies.map((company) => (
                        <tr key={company.id} className="hover:bg-slate-50/20 transition-all">
                          <td className="px-6 py-4">
                            <div className="font-extrabold text-slate-800 text-sm">{company.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono mt-1">CNPJ: {company.cnpj}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider border ${
                              company.plan === "Enterprise"
                                ? "bg-purple-50 text-purple-700 border-purple-200"
                                : company.plan === "Pro"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-blue-50 text-blue-700 border-blue-200"
                            }`}>
                              {company.plan}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              company.status === "active" ? "bg-emerald-50 text-[#006c49]" : "bg-red-50 text-red-700"
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${company.status === "active" ? "bg-emerald-500" : "bg-red-500"}`}></span>
                              {company.status === "active" ? "Ativo" : "Suspenso"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => handleToggleCompanyStatus(company.id)}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all border ${
                                  company.status === "active"
                                    ? "border-red-200 text-red-600 bg-red-50 hover:bg-red-100"
                                    : "border-emerald-200 text-emerald-600 bg-emerald-50 hover:bg-emerald-100"
                                }`}
                              >
                                {company.status === "active" ? "Suspender" : "Ativar"}
                              </button>
                              <button
                                onClick={() => {
                                  const nextPlan = company.plan === "Basic" ? "Pro" : company.plan === "Pro" ? "Enterprise" : "Basic";
                                  setCompanies(prev => prev.map(c => c.id === company.id ? { ...c, plan: nextPlan } : c));
                                }}
                                className="px-3 py-1.5 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 hover:bg-slate-50 transition-colors uppercase"
                              >
                                Mudar Plano
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Add Company Card */}
            <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-800 text-sm">Adicionar Nova Empresa</h3>
                <p className="text-xs text-slate-400 mt-1">Criação instantânea de novo tenant SaaS.</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Nome Comercial</label>
                  <input
                    type="text"
                    value={newCompanyName}
                    onChange={(e) => setNewCompanyName(e.target.value)}
                    className="w-full border-slate-200 focus:ring-1 focus:ring-slate-900 rounded-lg text-xs py-2 px-3 text-slate-800 font-semibold"
                    placeholder="Ex: Grupo Bobs Jardins"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">CNPJ da Empresa</label>
                  <input
                    type="text"
                    value={newCompanyCnpj}
                    onChange={(e) => setNewCompanyCnpj(e.target.value)}
                    className="w-full border-slate-200 focus:ring-1 focus:ring-slate-900 rounded-lg text-xs py-2 px-3 text-slate-800 font-mono"
                    placeholder="Ex: 00.000.000/0000-00"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Plano de Entrada</label>
                  <select
                    value={newCompanyPlan}
                    onChange={(e) => setNewCompanyPlan(e.target.value as "Basic" | "Pro" | "Enterprise")}
                    className="w-full border-slate-200 focus:ring-1 focus:ring-slate-900 rounded-lg text-xs py-2 px-3 cursor-pointer text-slate-800 font-semibold"
                  >
                    <option value="Basic">Basic (R$ 299/mês)</option>
                    <option value="Pro">Pro (R$ 599/mês)</option>
                    <option value="Enterprise">Enterprise (R$ 1199/mês)</option>
                  </select>
                </div>

                <button
                  onClick={handleAddCompany}
                  className="w-full py-2.5 bg-[#131b2e] hover:bg-slate-800 text-white rounded-lg font-bold text-xs uppercase tracking-wider transition-all shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  Cadastrar Empresa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* VIEW: LICENÇAS VENDIDAS                                                        */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === "licenses" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Controle de Licenças e Limites</h2>
            <p className="text-slate-500 text-sm mt-1">Controle de unidades permitidas vs ativas, limite de usuários manipulação do SaaS.</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-3.5">Empresa</th>
                  <th className="px-6 py-3.5">Unidades Perm. / Ativas</th>
                  <th className="px-6 py-3.5">Usuários Perm. / Ativos</th>
                  <th className="px-6 py-3.5 text-right">Controle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {licenses.map(lic => (
                  <tr key={lic.companyId} className="hover:bg-slate-50/20 transition-all text-xs font-semibold">
                    <td className="px-6 py-4 font-bold text-slate-800 text-sm">{lic.name}</td>
                    <td className="px-6 py-4">
                      <span className="text-slate-800">{lic.unitsActive}</span>
                      <span className="text-slate-400"> / {lic.unitsAllowed}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-slate-800">{lic.usersActive}</span>
                      <span className="text-slate-400"> / {lic.usersAllowed}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setLicenses(prev => prev.map(l => l.companyId === lic.companyId ? { ...l, unitsAllowed: l.unitsAllowed + 1 } : l));
                          }}
                          className="px-2 py-1 border border-slate-200 rounded hover:bg-slate-50 text-[10px]"
                        >
                          + Unidades
                        </button>
                        <button
                          onClick={() => {
                            setLicenses(prev => prev.map(l => l.companyId === lic.companyId ? { ...l, usersAllowed: l.usersAllowed + 5 } : l));
                          }}
                          className="px-2 py-1 border border-slate-200 rounded hover:bg-slate-50 text-[10px]"
                        >
                          + Usuários (5)
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* VIEW: ADMINS DE EMPRESA                                                       */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === "company_admins" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Administradores de Empresa</h2>
            <p className="text-slate-500 text-sm mt-1">Gerencie os administradores de nível Tenant responsáveis pelas redes de franquias.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="px-6 py-3.5">Nome & E-mail</th>
                    <th className="px-6 py-3.5">Empresa</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {admins.map(adm => {
                    const comp = companies.find(c => c.id === adm.companyId);
                    return (
                      <tr key={adm.id} className="hover:bg-slate-50/20 transition-all text-xs font-semibold">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-800 text-sm">{adm.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">{adm.email}</div>
                        </td>
                        <td className="px-6 py-4 text-slate-600">{comp ? comp.name : "Nenhuma"}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            adm.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                          }`}>
                            {adm.status === "active" ? "Ativo" : "Suspenso"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleToggleAdminStatus(adm.id)}
                            className="px-2.5 py-1 border border-slate-200 rounded text-[10px] font-bold uppercase hover:bg-slate-50"
                          >
                            {adm.status === "active" ? "Suspender" : "Ativar"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Add Admin Card */}
            <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3">Criar Admin de Empresa</h3>
              <div className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Nome Completo</label>
                  <input
                    type="text"
                    value={newAdminName}
                    onChange={(e) => setNewAdminName(e.target.value)}
                    className="w-full border-slate-200 focus:ring-1 focus:ring-slate-900 rounded-lg text-xs py-2 px-3 font-semibold text-slate-800"
                    placeholder="Ex: João da Silva"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">E-mail</label>
                  <input
                    type="email"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    className="w-full border-slate-200 focus:ring-1 focus:ring-slate-900 rounded-lg text-xs py-2 px-3 font-semibold text-slate-800"
                    placeholder="Ex: joao@restaurante.com"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Empresa Vinculada</label>
                  <select
                    value={newAdminCompanyId}
                    onChange={(e) => setNewAdminCompanyId(e.target.value)}
                    className="w-full border-slate-200 focus:ring-1 focus:ring-slate-900 rounded-lg text-xs py-2 px-3 cursor-pointer font-semibold text-slate-800"
                  >
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleAddAdmin}
                  className="w-full py-2.5 bg-[#131b2e] hover:bg-slate-800 text-white rounded-lg font-bold text-xs uppercase tracking-wider transition-all shadow-sm"
                >
                  Criar Administrador
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* VIEW: MÓDULOS LIBERADOS                                                       */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === "modules" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Módulos e Recursos Extras</h2>
            <p className="text-slate-500 text-sm mt-1">Ativação e liberação de recursos premium por Empresa/Restaurante.</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-3.5">Empresa</th>
                  <th className="px-6 py-3.5 text-center">IA Consultiva</th>
                  <th className="px-6 py-3.5 text-center">Offline Mode</th>
                  <th className="px-6 py-3.5 text-center">Relatórios Avançados</th>
                  <th className="px-6 py-3.5 text-center">Custom Branding</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {modules.map(mod => (
                  <tr key={mod.companyId} className="hover:bg-slate-50/20 transition-all text-xs font-semibold">
                    <td className="px-6 py-4 font-bold text-slate-800 text-sm">{mod.name}</td>
                    <td className="px-6 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={mod.iaEnabled}
                        onChange={(e) => {
                          setModules(prev => prev.map(m => m.companyId === mod.companyId ? { ...m, iaEnabled: e.target.checked } : m));
                        }}
                        className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer w-4 h-4"
                      />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={mod.offlineEnabled}
                        onChange={(e) => {
                          setModules(prev => prev.map(m => m.companyId === mod.companyId ? { ...m, offlineEnabled: e.target.checked } : m));
                        }}
                        className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer w-4 h-4"
                      />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={mod.reportsEnabled}
                        onChange={(e) => {
                          setModules(prev => prev.map(m => m.companyId === mod.companyId ? { ...m, reportsEnabled: e.target.checked } : m));
                        }}
                        className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer w-4 h-4"
                      />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={mod.customBranding}
                        onChange={(e) => {
                          setModules(prev => prev.map(m => m.companyId === mod.companyId ? { ...m, customBranding: e.target.checked } : m));
                        }}
                        className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer w-4 h-4"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* VIEW: STATUS COMERCIAL & CONTRATOS                                            */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === "commercial_status" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Status Comercial e Contratos</h2>
            <p className="text-slate-500 text-sm mt-1">Gerencie vencimentos de planos, data de assinatura e última fatura.</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-3.5">Empresa</th>
                  <th className="px-6 py-3.5">Data Assinatura</th>
                  <th className="px-6 py-3.5">Data Renovação</th>
                  <th className="px-6 py-3.5">Valor da Licença</th>
                  <th className="px-6 py-3.5 text-center">Último Pagamento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contracts.map(cnt => (
                  <tr key={cnt.companyId} className="hover:bg-slate-50/20 transition-all text-xs font-semibold text-slate-800">
                    <td className="px-6 py-4 font-bold text-slate-850 text-sm">{cnt.name}</td>
                    <td className="px-6 py-4 text-slate-600">{new Date(cnt.startDate).toLocaleDateString("pt-BR")}</td>
                    <td className="px-6 py-4 text-slate-600">{new Date(cnt.endDate).toLocaleDateString("pt-BR")}</td>
                    <td className="px-6 py-4 font-mono">R$ {cnt.value.toFixed(2)} / {cnt.billingCycle}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        cnt.lastInvoiceStatus === "paid" ? "bg-emerald-50 text-[#006c49]" : "bg-red-50 text-red-700 animate-pulse"
                      }`}>
                        {cnt.lastInvoiceStatus === "paid" ? "Pago" : "Atrasado"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* VIEW: LOGS DE AUDITORIA                                                       */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === "auditlogs" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Logs de Auditoria SaaS</h2>
            <p className="text-slate-500 text-sm mt-1">Rastreabilidade completa de ações administrativas e acessos.</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex gap-4 items-center">
              <div className="flex items-center bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus-within:ring-1 focus-within:ring-slate-900 w-full md:w-80">
                <Search className="w-4 h-4 text-slate-400 mr-2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar ação ou entidade..."
                  className="bg-transparent border-none focus:ring-0 text-xs w-full py-0.5"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/30 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="px-6 py-3">Ação</th>
                    <th className="px-6 py-3">Entidade</th>
                    <th className="px-6 py-3">ID do Item</th>
                    <th className="px-6 py-3">Usuário</th>
                    <th className="px-6 py-3">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-semibold">
                  {auditLogs
                    .filter(l => 
                      l.action.toLowerCase().includes(searchQuery.toLowerCase()) || 
                      l.entity.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map(log => (
                      <tr key={log.id} className="hover:bg-slate-50/10">
                        <td className="px-6 py-3 font-bold text-indigo-700">{log.action}</td>
                        <td className="px-6 py-3 text-slate-600">{log.entity}</td>
                        <td className="px-6 py-3 font-mono text-[10px] text-slate-400">{log.entityId}</td>
                        <td className="px-6 py-3">{log.user?.name || "Sistema"}</td>
                        <td className="px-6 py-3 text-slate-500">{new Date(log.createdAt).toLocaleString("pt-BR")}</td>
                      </tr>
                    ))}
                  {auditLogs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-slate-400 italic">Nenhum log registrado.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* VIEW: AJUSTES GLOBAIS                                                         */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === "global_settings" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Ajustes Globais da Plataforma</h2>
            <p className="text-slate-500 text-sm mt-1">Configurações globais de API keys, SMTP, notificações e backup.</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6 max-w-2xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 block">Nome do App</label>
                <input
                  type="text"
                  defaultValue="CheckRest SaaS"
                  className="w-full border-slate-200 focus:ring-1 focus:ring-slate-900 rounded-lg text-xs py-2 px-3 text-slate-800 font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 block">Tempo de Expiração de Token (Horas)</label>
                <input
                  type="number"
                  defaultValue={24}
                  className="w-full border-slate-200 focus:ring-1 focus:ring-slate-900 rounded-lg text-xs py-2 px-3 text-slate-800 font-semibold"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 block">Domínio de E-mail Autorizado</label>
              <input
                type="text"
                defaultValue="checkrest.com.br"
                className="w-full border-slate-200 focus:ring-1 focus:ring-slate-900 rounded-lg text-xs py-2 px-3 text-slate-800 font-semibold"
              />
            </div>

            <button
              onClick={() => alert("Configurações globais salvas localmente!")}
              className="px-6 py-2.5 bg-[#131b2e] hover:bg-slate-800 text-white rounded-lg font-bold text-xs uppercase tracking-wider transition-colors shadow-sm"
            >
              Salvar Configurações
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
