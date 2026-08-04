"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { verifyInviteTokenAction, activateAccountAction } from "@/app/actions/dbActions";
import { ShieldCheck, CheckCircle2, AlertCircle, Loader2, Building, User, Lock, ArrowRight, KeyRound, Clock, ShieldAlert } from "lucide-react";

function ActivateForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";

  const [loading, setLoading] = useState(true);
  const [inviteData, setInviteData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Auth method & forms
  const [authMethod, setAuthMethod] = useState<"GOOGLE" | "PASSWORD">("GOOGLE");
  const [googleEmailInput, setGoogleEmailInput] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [activated, setActivated] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Nenhum token de ativação foi fornecido no link de acesso.");
      setLoading(false);
      return;
    }

    async function loadInvite() {
      try {
        const res = await verifyInviteTokenAction(token);
        if (res.success && res.data) {
          setInviteData(res.data);
          setName(res.data.email.split("@")[0].replace(".", " "));
          setGoogleEmailInput(res.data.email);
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

    if (!acceptedTerms) {
      setSubmitError("Você precisa declarar responsabilidade e aceitar os Termos de Uso para ativar a conta.");
      return;
    }

    if (!name.trim()) {
      setSubmitError("Por favor, digite seu nome completo.");
      return;
    }

    if (authMethod === "GOOGLE") {
      if (!googleEmailInput.trim()) {
        setSubmitError("Por favor, informe seu e-mail do Google.");
        return;
      }
    }

    if (authMethod === "PASSWORD") {
      if (password.length < 6) {
        setSubmitError("A senha deve ter pelo menos 6 caracteres.");
        return;
      }
      if (password !== confirmPassword) {
        setSubmitError("As senhas digitadas não coincidem.");
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await activateAccountAction({
        token,
        authMethod,
        googleEmail: authMethod === "GOOGLE" ? googleEmailInput.trim() : undefined,
        name: name.trim(),
        password: authMethod === "PASSWORD" ? password : undefined,
        acceptedTerms,
        userIp: "127.0.0.1"
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
      case "COMPANY_ADMIN":
        return { label: "Administrador Proprietário", bg: "bg-blue-500/20 text-blue-300 border-blue-500/30" };
      case "UNIT_MANAGER":
        return { label: "Gerente de Unidade", bg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" };
      default:
        return { label: "Operador de Loja", bg: "bg-amber-500/20 text-amber-300 border-amber-500/30" };
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      {/* Background Glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

      {/* Header Branding */}
      <div className="mb-6 text-center z-10">
        <div className="inline-flex items-center gap-3 px-4 py-2 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md mb-3 shadow-xl">
          <ShieldCheck className="w-7 h-7 text-indigo-400" />
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent">
            CheckRest
          </span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Ativação da Empresa & Propriedade</h1>
        <p className="text-xs text-slate-400 mt-1">Valide seu acesso oficial e assuma a administração da conta</p>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-lg bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl z-10">
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <Loader2 className="w-10 h-10 text-indigo-400 animate-spin mb-4" />
            <p className="text-sm text-slate-300 font-medium">Validando seu link de convite seguro...</p>
          </div>
        ) : error ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-14 h-14 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto text-red-400">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-bold text-white">Convite Inválido ou Expirado</h2>
            <p className="text-xs text-slate-400 leading-relaxed px-4">{error}</p>
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
            <h2 className="text-xl font-bold text-white">Conta e Empresa Ativadas!</h2>
            <p className="text-xs text-slate-300">Sua propriedade foi confirmada e registrada com sucesso. Redirecionando...</p>
            <Loader2 className="w-5 h-5 text-emerald-400 animate-spin mx-auto mt-2" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Invite Info Card */}
            <div className="p-4.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Você foi convidado para administrar:</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-indigo-500/20 text-indigo-300 border-indigo-500/30 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Convite válido por 48h
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400 shrink-0">
                  <Building className="w-5 h-5" />
                </div>
                <div className="overflow-hidden">
                  <h3 className="font-extrabold text-sm text-white truncate">{inviteData.companyName}</h3>
                  <p className="text-xs text-slate-400 truncate">E-mail convidado: <span className="text-indigo-300 font-semibold">{inviteData.email}</span></p>
                </div>
              </div>
              <div className="pt-1 flex items-center justify-between border-t border-slate-800/80">
                <span className="text-[11px] text-slate-400">Cargo atribuído:</span>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${getRoleBadge(inviteData.role).bg}`}>
                  {getRoleBadge(inviteData.role).label}
                </span>
              </div>
            </div>

            {/* Error Callout */}
            {submitError && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-2.5 font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Auth Method Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300">Escolha como deseja autenticar:</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setAuthMethod("GOOGLE")}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    authMethod === "GOOGLE"
                      ? "bg-indigo-600/20 border-indigo-500 text-white shadow-md shadow-indigo-600/10"
                      : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  Continuar com Google
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMethod("PASSWORD")}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    authMethod === "PASSWORD"
                      ? "bg-indigo-600/20 border-indigo-500 text-white shadow-md shadow-indigo-600/10"
                      : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  <Lock className="w-4 h-4" />
                  Criar Senha
                </button>
              </div>
            </div>

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
                  placeholder="Ex: João da Silva"
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-semibold"
                />
              </div>
            </div>

            {/* Form Fields according to Auth Method */}
            {authMethod === "GOOGLE" ? (
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">Confirmar E-mail do Google</label>
                <input
                  type="email"
                  required
                  value={googleEmailInput}
                  onChange={(e) => setGoogleEmailInput(e.target.value)}
                  placeholder="exemplo@empresa.com.br"
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-semibold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
                <p className="text-[10px] text-indigo-300 font-medium">Este e-mail do Google será vinculado como a conta oficial do Administrador Proprietário da empresa.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Crie sua Senha</label>
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
              </div>
            )}

            {/* Terms and Ownership Acceptance Checkbox */}
            <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-800/40 space-y-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span className="text-[11px] text-slate-300 leading-relaxed font-normal">
                  Declaro que sou responsável pela administração da empresa <strong className="text-white">{inviteData.companyName}</strong> e aceito os <span className="text-indigo-300 font-semibold underline">Termos de Uso</span> e a <span className="text-indigo-300 font-semibold underline">Política de Privacidade</span> do CheckRest.
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || !acceptedTerms}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Confirmando Propriedade e Ativando...
                </>
              ) : (
                <>
                  Confirmar Ativação e Assumir Conta
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
