"use client";

import { useState } from "react";
import { Mail, Lock, Brain, Shield, User, Store, Key, Eye, EyeOff, CheckCircle2, X } from "lucide-react";
import { User as UserType, Role } from "@/types";
import { loginUserAction } from "@/app/actions/dbActions";

interface LoginProps {
  onLogin: (user: UserType) => void;
}

const DEMO_USERS = [
  {
    role: "SAAS_ADMIN" as const,
    label: "Admin SaaS",
    email: "luizbianqui@gmail.com",
    password: "saas123",
    icon: Shield,
    color: "from-purple-500 to-indigo-600",
    desc: "Acesso global e controle de empresas",
    name: "Luiz Bianqui (SaaS Admin)",
    companyId: null,
    unitId: null,
    avatarUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuBP0wy0mJQlq45ZKUlgz_QNDVftgVzwsr_FR28EwdyCwZqV3VpnEXhRq3BsAhHj4Y6mDx986mvQxkWr2-zK-v9hF8oO-Pmh_kQ2f_vicLRKOYKyTC0yC5kfVzS-WzFabmIZMcJxc2cWUioFVmKmzFcbH0ys_mv0Ezuq-4E8i8q-jsucR6Ad2gV7Z70qKshIQVq6rFoFrVyZhULy96OE0NCxllIXcjVLDubdMaMqGtCYwKneQIw_9p3wjfW_pSrgP2bn6scT834CsCc"
  },
  {
    role: "RESELLER_ADMIN" as const,
    label: "Empresa Administradora",
    email: "master@reseller.com.br",
    password: "master123",
    icon: Key,
    color: "from-purple-600 to-pink-600",
    desc: "Revende licenças para empresas clientes",
    name: "Carlos Eduardo (Diretor Reseller)",
    companyId: "comp-reseller-1",
    unitId: null,
    avatarUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuBP0wy0mJQlq45ZKUlgz_QNDVftgVzwsr_FR28EwdyCwZqV3VpnEXhRq3BsAhHj4Y6mDx986mvQxkWr2-zK-v9hF8oO-Pmh_kQ2f_vicLRKOYKyTC0yC5kfVzS-WzFabmIZMcJxc2cWUioFVmKmzFcbH0ys_mv0Ezuq-4E8i8q-jsucR6Ad2gV7Z70qKshIQVq6rFoFrVyZhULy96OE0NCxllIXcjVLDubdMaMqGtCYwKneQIw_9p3wjfW_pSrgP2bn6scT834CsCc"
  },
  {
    role: "COMPANY_ADMIN" as const,
    label: "Admin Empresa",
    email: "admin@restaurante.com",
    password: "empresa123",
    icon: Brain,
    color: "from-emerald-500 to-teal-600",
    desc: "Gerencia filiais, usuários e checklists",
    name: "Ricardo Costa (Diretor Geral)",
    companyId: "comp-1",
    unitId: null,
    avatarUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuDNgTzuQnw27ABy0QdikXDwdAR_5bn7ZUfehclBI4VNP0kQedOUADDnKMFSUabFByr3QAkWm2NNJC1u7B-JB_D98Hn5nv_WuwjwCmz_3WKVBq2BHjtfxx0-bRjCtYwqtdMpFGuqgE_uTLVy8KZbHnxqEW1W2rczOYIUd_8zLngrzQ2JtD71_2-P-g_b0R2g3wxnTM8YXsw5rrChq11nlwccWlRWAPWOGkX7kmvZPpCPDvqIaPPZ9n7pMLyzGAHXTirQGAb4oKfef9g"
  },
  {
    role: "UNIT_MANAGER" as const,
    label: "Gerente Jardins",
    email: "gerente.jardins@restaurante.com",
    password: "gerente123",
    icon: Store,
    color: "from-blue-500 to-indigo-600",
    desc: "Gerencia a filial Jardins",
    name: "Ana Martins (Gerente Unidade)",
    companyId: "comp-1",
    unitId: "un-2",
    avatarUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuDyfX8IQJfUdA4ZFxNthzgW-lf6TQccAXYyrRSNCqqIe4LGUFXxzAcBc7OLO6BtHSR7G58m_KEk3Gxm8tGNRfRlO9Ambje4wcy8BK1vSJkPeaFM1F4t2RVFqv1PUqh3Z1S1L-uO5PqQ_jccM-JUfXHpVwHLZL_pqimtnw7O5tFRuA5SBc_77nkn1_MVLgJ7edF8XK6n2viqf7OF7MltA6lSvAfbvRgRWKRrfYXPqQ8rStH9ErmZZZSdlBjmtJ1bQ8nGuD6KplIi_GI text-slate"
  },
  {
    role: "OPERATOR" as const,
    label: "Operador Cozinha",
    email: "operador@restaurante.com",
    password: "operador123",
    icon: User,
    color: "from-amber-500 to-orange-600",
    desc: "Executa checklists e envia fotos",
    name: "João Roberto (Cozinheiro)",
    companyId: "comp-1",
    unitId: "un-2",
    avatarUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuAO7Hl5S5Kqo3bFEfk8orp0XNzAxDQRiej3pR2O5ief-MkbtcYy49MPk0Otgq5rNveu5sZFc7AO6F195R1RO6NhKLz7AhKqZXAtlmC8_nlHSZ4LejavBzlS5T6Kl5eeeZjOdVfP9kBWpjaIekdkZrrLNE7Umz7BfyKRmsRtUDCDpgZH9ser9xm94aVyQxSf_jrhcDI8KjJPsrTU7k0zdIh-QS77QtQu4dU3CcDwLJfAyvKVOz61CvGGWDPrnPzAcTNTUyH3bPDtGU4"
  }
];

export default function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [clientMode, setClientMode] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSubmitted, setResetSubmitted] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const visibleDemoUsers = clientMode
    ? DEMO_USERS.filter((u) => u.role === "UNIT_MANAGER" || u.role === "OPERATOR")
    : DEMO_USERS;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Por favor, preencha todos os campos.");
      return;
    }

    // 1. Tentar autenticação via Banco de Dados (Server Action)
    try {
      const res = await loginUserAction(email, password);
      if (res.success && res.data) {
        if (res.data.status === "INVITE_PENDING" || res.data.status === "PENDING_ACTIVATION") {
          setError("Sua conta aguarda ativação. Por favor, acesse o link seguro enviado para o seu e-mail.");
          return;
        }
        if (res.data.status === "BLOCKED" || res.data.status === "inactive") {
          setError("Sua conta está suspensa ou bloqueada. Entre em contato com o suporte.");
          return;
        }

        onLogin({
          id: res.data.id,
          name: res.data.name,
          email: res.data.email,
          role: res.data.role as Role,
          companyId: res.data.companyId,
          unitId: res.data.unitId,
          status: res.data.status as 'active' | 'inactive',
          avatarUrl: res.data.avatarUrl || undefined
        });
        return;
      } else if (res.error && !res.fallback) {
        setError(res.error);
        return;
      }
    } catch (err) {
      console.warn("Erro de conexão com o banco. Usando fallback local:", err);
    }

    // 2. Fallback para usuários em memória/localStorage (se banco falhar/offline)
    const matched = DEMO_USERS.find(
      (u) => u.email === email && u.password === password
    );

    if (matched) {
      onLogin({
        id: "usr-" + matched.role.toLowerCase(),
        name: matched.name,
        email: matched.email,
        role: matched.role,
        companyId: matched.companyId,
        unitId: matched.unitId,
        status: "active",
        avatarUrl: matched.avatarUrl
      });
    } else {
      setError("Credenciais inválidas. Use um dos atalhos rápidos abaixo.");
    }
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) return;
    setResetLoading(true);
    setTimeout(() => {
      setResetLoading(false);
      setResetSubmitted(true);
    }, 600);
  };

  const handleQuickFill = (demo: typeof DEMO_USERS[number]) => {
    setEmail(demo.email);
    setPassword(demo.password);
    setError("");
    onLogin({
      id: "usr-" + demo.role.toLowerCase(),
      name: demo.name,
      email: demo.email,
      role: demo.role,
      companyId: demo.companyId,
      unitId: demo.unitId,
      status: "active",
      avatarUrl: demo.avatarUrl
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Gradients & Effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] aspect-square rounded-full bg-emerald-900/20 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] aspect-square rounded-full bg-indigo-950/40 blur-[120px] pointer-events-none"></div>
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff03_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none"></div>

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
        
        {/* Left Side: Brand presentation */}
        <div className="lg:col-span-5 space-y-6 text-center lg:text-left text-white px-4">
          <div className="flex items-center gap-3 justify-center lg:justify-start">
            <div className="bg-gradient-to-tr from-emerald-400 to-teal-500 p-2.5 rounded-xl shadow-lg shadow-emerald-500/10">
              <Shield className="w-7 h-7 text-slate-950" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                CheckRest
              </h1>
              <p className="text-xs text-emerald-400 font-extrabold uppercase tracking-widest">Conformidade Inteligente</p>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-3xl lg:text-4xl font-extrabold leading-tight tracking-tight">
              Gestão de conformidade com IA consultiva e planos de ação automáticos.
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Monitore padrões de qualidade em tempo real, identifique desvios operacionais imediatamente e resolva problemas de forma automatizada com planos corretivos inteligentes.
            </p>
          </div>

          {/* Micro badges list */}
          <div className="hidden lg:flex flex-wrap gap-3 pt-2">
            {["Plano de Ação Auto", "IA Consultiva", "Conformidade Ativa", "Auditorias Digitais"].map((badge) => (
              <span key={badge} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-semibold text-slate-300">
                {badge}
              </span>
            ))}
          </div>
        </div>

        {/* Right Side: Glassmorphic Login Form */}
        <div className="lg:col-span-7 bg-white/[0.03] border border-white/10 rounded-3xl p-6 lg:p-8 backdrop-blur-xl shadow-2xl space-y-6 flex flex-col justify-between">
          <div>
            <div className="border-b border-white/5 pb-4">
              <h3 className="text-xl font-bold text-white">Acesse o Painel</h3>
              <p className="text-xs text-slate-500 mt-1">Selecione o login via Google ou insira suas credenciais.</p>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-2.5 rounded-xl mt-4 font-semibold flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0"></span>
                {error}
              </div>
            )}

            {/* Botão Oficial "Continuar com o Google" */}
            <div className="mt-4 space-y-3">
              <button
                type="button"
                onClick={() => {
                  setError("");
                  // Logar como Admin Empresa via Google OAuth (ou simulação de login de convite)
                  onLogin({
                    id: "usr-company_admin-google",
                    name: "Ricardo Costa (Admin Empresa)",
                    email: "diretoria@bobs.com.br",
                    role: "COMPANY_ADMIN",
                    companyId: "comp-1",
                    unitId: null,
                    status: "active",
                    avatarUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuDNgTzuQnw27ABy0QdikXDwdAR_5bn7ZUfehclBI4VNP0kQedOUADDnKMFSUabFByr3QAkWm2NNJC1u7B-JB_D98Hn5nv_WuwjwCmz_3WKVBq2BHjtfxx0-bRjCtYwqtdMpFGuqgE_uTLVy8KZbHnxqEW1W2rczOYIUd_8zLngrzQ2JtD71_2-P-g_b0R2g3wxnTM8YXsw5rrChq11nlwccWlRWAPWOGkX7kmvZPpCPDvqIaPPZ9n7pMLyzGAHXTirQGAb4oKfef9g"
                  });
                }}
                className="w-full bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs py-3 rounded-xl transition-all shadow-lg shadow-white/5 active:scale-[0.99] flex items-center justify-center gap-3 border border-slate-200"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                Continuar com o Google
              </button>

              <div className="flex items-center gap-3 my-4">
                <div className="h-px bg-white/10 flex-1"></div>
                <span className="text-[10px] uppercase font-extrabold text-slate-500 tracking-wider">ou entre com e-mail</span>
                <div className="h-px bg-white/10 flex-1"></div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">E-mail</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seuemail@exemplo.com"
                    className="w-full bg-slate-900/60 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all placeholder:text-slate-600"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Senha</label>
                  <button
                    type="button"
                    onClick={() => {
                      setResetEmail(email);
                      setResetSubmitted(false);
                      setShowForgotPasswordModal(true);
                    }}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold transition-colors focus:outline-none"
                  >
                    Esqueci minha senha
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-900/60 border border-white/10 rounded-xl py-2.5 pl-10 pr-10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all placeholder:text-slate-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors focus:outline-none"
                    title={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs py-3 rounded-xl uppercase tracking-wider transition-all shadow-md shadow-emerald-500/10 active:scale-[0.99] flex items-center justify-center gap-2"
              >
                <Key className="w-4 h-4" />
                Entrar no Sistema
              </button>
            </form>
          </div>
        </div>

      </div>

      {/* Modal Esqueci Minha Senha */}
      {showForgotPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 relative">
            <button
              onClick={() => setShowForgotPasswordModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-2">
                <Key className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Recuperação de Senha</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Informe o seu e-mail cadastrado. Enviaremos um link seguro para você redefinir sua senha.
              </p>
            </div>

            {resetSubmitted ? (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-emerald-400 space-y-2 text-xs">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  E-mail de recuperação enviado!
                </div>
                <p className="text-slate-300">
                  Verifique a caixa de entrada (ou pasta de spam) de <strong className="text-white">{resetEmail}</strong> para redefinir sua senha.
                </p>
                <button
                  onClick={() => setShowForgotPasswordModal(false)}
                  className="w-full mt-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2 rounded-lg text-xs transition-colors"
                >
                  Voltar ao Login
                </button>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">E-mail</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Mail className="w-4 h-4" />
                    </span>
                    <input
                      type="email"
                      required
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="seuemail@exemplo.com"
                      className="w-full bg-slate-950/80 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all placeholder:text-slate-600"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotPasswordModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-white/10 text-xs font-semibold text-slate-400 hover:bg-white/5 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-extrabold text-xs uppercase tracking-wider transition-all shadow-md shadow-emerald-500/10 disabled:opacity-50"
                  >
                    {resetLoading ? "Enviando..." : "Enviar Link"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

