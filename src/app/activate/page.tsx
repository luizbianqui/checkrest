"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { verifyInviteTokenAction, activateAccountAction } from "@/app/actions/dbActions";
import { KeyRound, ShieldCheck, CheckCircle2, AlertCircle, Loader2, Building, User, Lock, ArrowRight } from "lucide-react";

function ActivateForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";

  const [loading, setLoading] = useState(true);
  const [inviteData, setInviteData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [activated, setActivated] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Nenhum token de ativação foi fornecido no link.");
      setLoading(false);
      return;
    }

    async function loadInvite() {
      try {
        const res = await verifyInviteTokenAction(token);
        if (res.success && res.data) {
          setInviteData(res.data);
          setName(res.data.email.split("@")[0].replace(".", " "));
        } else {
          setError(res.error || "Convite inválido ou expirado.");
        }
      } catch (e: any) {
        setError(e.message || "Erro ao validar link de ativação.");
      } finally {
        setLoading(false);
      }
    }

    loadInvite();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!name.trim()) {
      setSubmitError("Por favor, digite seu nome completo.");
      return;
    }

    if (password.length < 6) {
      setSubmitError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setSubmitError("As senhas digitadas não coincidem.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await activateAccountAction({
        token,
        name: name.trim(),
        password
      });

      if (res.success) {
        setActivated(true);
        setTimeout(() => {
          router.push("/");
        }, 1500);
      } else {
        setSubmitError(res.error || "Erro ao ativar conta.");
      }
    } catch (e: any) {
      setSubmitError(e.message || "Erro inesperado ao ativar conta.");
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "RESELLER_ADMIN":
        return { label: "Empresa Administradora / Reseller", bg: "bg-purple-500/20 text-purple-300 border-purple-500/30" };
      case "COMPANY_ADMIN":
        return { label: "Administrador de Empresa", bg: "bg-blue-500/20 text-blue-300 border-blue-500/30" };
      case "UNIT_MANAGER":
        return { label: "Gerente de Unidade", bg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" };
      default:
        return { label: "Operador de Checklist", bg: "bg-amber-500/20 text-amber-300 border-amber-500/30" };
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      {/* Dynamic Ambient Background */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

      {/* Header Branding */}
      <div className="mb-8 text-center z-10">
        <div className="inline-flex items-center gap-3 px-4 py-2 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md mb-4 shadow-xl">
          <ShieldCheck className="w-7 h-7 text-indigo-400" />
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent">
            CheckRest
          </span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Primeiro Acesso & Ativação de Conta</h1>
        <p className="text-sm text-slate-400 mt-1">Configure suas credenciais para acessar seu espaço de trabalho</p>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl z-10">
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <Loader2 className="w-10 h-10 text-indigo-400 animate-spin mb-4" />
            <p className="text-sm text-slate-300 font-medium">Validando seu link de convite...</p>
          </div>
        ) : error ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-14 h-14 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto text-red-400">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-bold text-white">Convite Inválido ou Expirado</h2>
            <p className="text-xs text-slate-400 leading-relaxed">{error}</p>
            <button
              onClick={() => router.push("/")}
              className="mt-4 px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-all border border-slate-700"
            >
              Ir para Tela de Login
            </button>
          </div>
        ) : activated ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto text-emerald-400 animate-bounce">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <h2 className="text-xl font-bold text-white">Conta Ativada com Sucesso!</h2>
            <p className="text-xs text-slate-300">Suas credenciais foram salvas. Redirecionando para o sistema...</p>
            <Loader2 className="w-5 h-5 text-emerald-400 animate-spin mx-auto mt-2" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Invite Info Banner */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
              {inviteData?.company?.name && (
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <Building className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span className="font-semibold text-white truncate">{inviteData.company.name}</span>
                </div>
              )}
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-400 truncate">{inviteData.email}</span>
                {inviteData?.role && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getRoleBadge(inviteData.role).bg}`}>
                    {getRoleBadge(inviteData.role).label}
                  </span>
                )}
              </div>
            </div>

            {submitError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Name Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Seu Nome Completo</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Carlos Silva"
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Crie sua Senha de Acesso</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>

            {/* Confirm Password Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Confirme sua Senha</label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Digite a senha novamente"
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Ativando Conta...
                </>
              ) : (
                <>
                  Ativar Conta e Entrar
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ActivatePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    }>
      <ActivateForm />
    </Suspense>
  );
}
