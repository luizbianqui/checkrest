"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import {
  ClipboardCheck,
  Activity,
  Plus,
  Trash2,
  Settings,
  HelpCircle,
  Bell,
  Filter,
  Store,
  Clock,
  User,
  Users,
  Check,
  Camera,
  X,
  PlusCircle,
  Brain,
  Layers,
  Undo,
  Award,
  Calendar,
  AlertTriangle,
  AlertCircle,
  FolderOpen,
  FileText,
  Shield,
  Building,
  LogOut,
  CheckCircle2
} from "lucide-react";
import { comprimirEvidencia } from "@/utils/imageCompressor";
import { uploadFileToStorage } from "@/lib/supabase";
import { Checklist, Question, Unit, ChatMessage, QuestionType, User as UserType, Role, Company, Occurrence, NonConformity, ActionPlan, AuditLog, CompanyDocument, AIContext, ChecklistRun } from "@/types";
import Login from "@/components/Login";
import Dashboard from "@/components/Dashboard";
import AIConsultative from "@/components/AIConsultative";
import ChecklistEditor from "@/components/ChecklistEditor";
import SaaSAdminViews from "@/components/SaaSAdminViews";
import OperationalOccurrences from "@/components/OperationalOccurrences";
import ActionPlans from "@/components/ActionPlans";
import DocumentsManager from "@/components/DocumentsManager";
import ReportsManager from "@/components/ReportsManager";
import OnboardingWizard from "@/components/OnboardingWizard";
import {
  checkDatabaseConnection,
  getCompaniesAction,
  createCompanyAction,
  toggleCompanyStatusAction,
  getUnitsAction,
  getChecklistsAction,
  createChecklistRunAction,
  getChecklistRunsAction,
  getOccurrencesAction,
  createOccurrenceAction,
  updateOccurrenceStatusAction,
  duplicateOccurrenceAction,
  getNonConformitiesAction,
  updateNonConformityStatusAction,
  getActionPlansAction,
  createActionPlanAction,
  updateActionPlanAction,
  getDashboardDataAction,
  getDocumentsAction,
  createDocumentAction,
  deleteDocumentAction,
  toggleUnitStatusAction,
  toggleUserStatusAction,
  createUserAction,
  getUsersAction,
  createUnitAction,
  upsertChecklistAction,
  archiveChecklistAction,
  getAuditLogsAction,
  getCurrentSessionUser,
  logoutUserAction
} from "@/app/actions/dbActions";
import { askAIAction } from "@/app/actions/aiActions";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import NotificationsCenter, { AppNotification } from "@/components/NotificationsCenter";

function isDateInPeriod(
  dateStr: string | Date | undefined | null,
  period: string,
  specificDate?: string,
  startDate?: string,
  endDate?: string
): boolean {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  const now = new Date();
  
  // Normalize time to start of day for comparison
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  
  const dateDay = startOfDay(date);
  const today = startOfDay(now);
  
  switch (period) {
    case "Hoje":
      return dateDay.getTime() === today.getTime();
      
    case "Ontem": {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return dateDay.getTime() === yesterday.getTime();
    }
    
    case "Últimos 7 dias": {
      const limit = new Date(today);
      limit.setDate(limit.getDate() - 7);
      return date >= limit && date <= now;
    }
    
    case "Últimos 30 dias": {
      const limit = new Date(today);
      limit.setDate(limit.getDate() - 30);
      return date >= limit && date <= now;
    }
    
    case "Mês atual":
    case "Este Mês":
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      
    case "Mês anterior": {
      const lastMonth = new Date(today);
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      const targetYear = lastMonth.getFullYear();
      const targetMonth = lastMonth.getMonth();
      return date.getMonth() === targetMonth && date.getFullYear() === targetYear;
    }
    
    case "Data específica": {
      if (!specificDate) return true;
      const targetDay = startOfDay(new Date(specificDate + "T00:00:00"));
      return dateDay.getTime() === targetDay.getTime();
    }
    
    case "Período personalizado": {
      if (!startDate || !endDate) return true;
      const start = startOfDay(new Date(startDate + "T00:00:00"));
      const end = new Date(endDate + "T23:59:59");
      return date >= start && date <= end;
    }
    
    default:
      return true;
  }
}

export default function Home() {
  // Authentication & Session State
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [isSessionLoaded, setIsSessionLoaded] = useState(false);

  // SaaS Companies State (Visible only to SAAS_ADMIN)
  const [companies, setCompanies] = useState<Company[]>([
    { id: "comp-1", name: "Restaurante Modelo", cnpj: "12.345.678/0001-90", plan: "Pro", status: "active" },
    { id: "comp-2", name: "Hamburgueria Express", cnpj: "98.765.432/0001-10", plan: "Basic", status: "active" },
    { id: "comp-3", name: "Sushi Garden Group", cnpj: "45.678.901/0001-20", plan: "Enterprise", status: "inactive" }
  ]);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newCompanyCnpj, setNewCompanyCnpj] = useState("");
  const [newCompanyPlan, setNewCompanyPlan] = useState<"Basic" | "Pro" | "Enterprise">("Pro");

  // Navigation State
  const [activeTab, setActiveTab] = useState<"dashboard" | "checklists" | "editor" | "ai" | "settings" | "companies" | "collaborators" | "occurrences" | "nonconformities" | "actionplans" | "reports" | "dashboard_saas" | "licenses" | "company_admins" | "modules" | "commercial_status" | "global_settings" | "auditlogs" | "documents" | "cadastros">("dashboard");

  // Gestão de Cadastro States (Unidades, Setores, Colaboradores)
  const [cadastroSubTab, setCadastroSubTab] = useState<"units" | "sectors" | "users">("units");
  const [sectors, setSectors] = useState<string[]>([]);
  const [newSectorName, setNewSectorName] = useState("");
  const [showOnboardingWizard, setShowOnboardingWizard] = useState(false);

  // Database Connection & Synchronization State
  const [dbConnected, setDbConnected] = useState<boolean | null>(null);

  // Offline sync queue
  const { isOnline, isSyncing, pendingCount, enqueue } = useOfflineSync();

  // Date Filtering State
  const [selectedPeriodFilter, setSelectedPeriodFilter] = useState("Últimos 7 dias");
  const [selectedSpecificDate, setSelectedSpecificDate] = useState("");
  const [selectedStartDate, setSelectedStartDate] = useState("");
  const [selectedEndDate, setSelectedEndDate] = useState("");

  // Occurrence Duplication State
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [occurrenceToDuplicate, setOccurrenceToDuplicate] = useState<Occurrence | null>(null);
  const [duplicateTitle, setDuplicateTitle] = useState("");
  const [duplicateDescription, setDuplicateDescription] = useState("");

  // AI loading state
  const [isAILoading, setIsAILoading] = useState(false);

  // Occurrences States
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [mobileOccTitle, setMobileOccTitle] = useState("");
  const [mobileOccDescription, setMobileOccDescription] = useState("");
  const [mobileOccSeverity, setMobileOccSeverity] = useState("medium");
  const [mobileOccSector, setMobileOccSector] = useState("Cozinha Central");
  const [mobileOccUnitId, setMobileOccUnitId] = useState("un-1");
  const [isMobileOccurrenceOpen, setIsMobileOccurrenceOpen] = useState(false);
  const [operatorIdentifierInput, setOperatorIdentifierInput] = useState("");

  // Non Conformities State
  const [nonConformities, setNonConformities] = useState<NonConformity[]>([]);

  // Action Plans State
  const [actionPlans, setActionPlans] = useState<ActionPlan[]>([]);

  // Checklist Runs State
  const [checklistRuns, setChecklistRuns] = useState<ChecklistRun[]>([]);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [searchAuditQuery, setSearchAuditQuery] = useState("");
  const [selectedAuditActionFilter, setSelectedAuditActionFilter] = useState("Todas as Ações");

  // Documents State
  const [documents, setDocuments] = useState<CompanyDocument[]>([]);
  const [isAddDocumentModalOpen, setIsAddDocumentModalOpen] = useState(false);
  const [newDocumentTitle, setNewDocumentTitle] = useState("");
  const [newDocumentDescription, setNewDocumentDescription] = useState("");
  const [operatorPriorityFilter, setOperatorPriorityFilter] = useState<"todas" | "urgente" | "normal" | "concluidas">("todas");
  const [newDocumentCategory, setNewDocumentCategory] = useState("Manual");
  const [newDocumentVersion, setNewDocumentVersion] = useState("1.0");
  const [newDocumentExpirationDate, setNewDocumentExpirationDate] = useState("");
  const [newDocumentUnitId, setNewDocumentUnitId] = useState("Global");
  const [newDocumentFile, setNewDocumentFile] = useState<File | null>(null);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  
  // Collaborators/Users CRUD states
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState<Role>("OPERATOR");
  const [newUserUnitId, setNewUserUnitId] = useState<string>("Global");
  const [searchUserQuery, setSearchUserQuery] = useState("");

  // Notification State & Persistency
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>([]);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("checkrest_read_notifications");
      if (saved) setReadNotificationIds(JSON.parse(saved));
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleMarkAsRead = (id: string) => {
    setReadNotificationIds((prev) => {
      const next = [...prev, id];
      localStorage.setItem("checkrest_read_notifications", JSON.stringify(next));
      return next;
    });
  };

  const handleMarkAllAsRead = (ids: string[]) => {
    setReadNotificationIds((prev) => {
      const next = Array.from(new Set([...prev, ...ids]));
      localStorage.setItem("checkrest_read_notifications", JSON.stringify(next));
      return next;
    });
  };

  // Computes active notifications dynamically + inserts elegant simulated notifications
  const notifications = useMemo<AppNotification[]>(() => {
    if (!currentUser) return [];
    if (currentUser.role === "SAAS_ADMIN") return [];

    const list: AppNotification[] = [];

    // Filter helper based on role/unit permissions
    const matchesUserScope = (itemUnitId: string | null | undefined) => {
      if (currentUser.role === "SAAS_ADMIN") return true;
      if (currentUser.role === "COMPANY_ADMIN") return true;
      if (!currentUser.unitId) return true;
      return itemUnitId === currentUser.unitId;
    };

    // 1. Checklist atrasado (ChecklistRun status is 'late')
    checklistRuns.forEach(run => {
      if (run.status === "late" && matchesUserScope(run.unitId)) {
        list.push({
          id: `checklist-late-${run.id}`,
          title: "Checklist Atrasado",
          description: `O checklist "${run.template?.title || "Sem nome"}" na unidade "${run.unit?.name || "Unidade"}" está atrasado.`,
          type: "error",
          category: "checklist",
          createdAt: run.scheduledAt ? new Date(run.scheduledAt).toISOString() : new Date().toISOString(),
          critical: true,
          linkToTab: currentUser.role === "OPERATOR" ? "editor" : "dashboard"
        });
      }
    });

    // 2. Não conformidade crítica (Non-conformity with critical severity, status is open or in_progress)
    nonConformities.forEach(nc => {
      const isCritical = nc.severity === "critical" || nc.severity === "high";
      const isOpen = nc.status === "open" || nc.status === "in_progress";
      if (isOpen && matchesUserScope(nc.unitId)) {
        list.push({
          id: `nc-${nc.id}`,
          title: isCritical ? "Não Conformidade Crítica" : "Nova Não Conformidade",
          description: `Desvio registrado: "${nc.title}" na unidade "${nc.unit?.name || "Unidade"}".`,
          type: isCritical ? "error" : "warning",
          category: "nc",
          createdAt: nc.createdAt ? new Date(nc.createdAt).toISOString() : new Date().toISOString(),
          critical: isCritical,
          linkToTab: "nonconformities"
        });
      }
    });

    // 3. Plano de ação vencido (Action plan pending/in_progress and due date is in the past)
    const now = new Date();
    actionPlans.forEach(ap => {
      const isPending = ap.status === "pending" || ap.status === "in_progress";
      const isLate = ap.dueDate && new Date(ap.dueDate) < now;
      if (isPending && matchesUserScope(ap.unitId)) {
        if (isLate) {
          list.push({
            id: `ap-late-${ap.id}`,
            title: "Plano de Ação Vencido",
            description: `Plano de ação "${ap.actionDescription}" para "${ap.responsibleUser?.name || "Responsável"}" está vencido.`,
            type: "error",
            category: "plan",
            createdAt: ap.dueDate ? new Date(ap.dueDate).toISOString() : new Date().toISOString(),
            critical: true,
            linkToTab: "actionplans"
          });
        } else {
          // If due soon (within 24 hours), we can alert
          const diffMs = new Date(ap.dueDate).getTime() - now.getTime();
          const diffHours = diffMs / (1000 * 60 * 60);
          if (diffHours > 0 && diffHours <= 24) {
            list.push({
              id: `ap-soon-${ap.id}`,
              title: "Plano de Ação Próximo do Vencimento",
              description: `Vence em menos de 24h: "${ap.actionDescription}"`,
              type: "warning",
              category: "plan",
              createdAt: ap.createdAt ? new Date(ap.createdAt).toISOString() : new Date().toISOString(),
              critical: false,
              linkToTab: "actionplans"
            });
          }
        }
      }
    });

    // 4. Documento vencendo (Document with active status expiring in less than 30 days)
    documents.forEach(doc => {
      if (doc.status === "active" && doc.expirationDate && matchesUserScope(doc.unitId)) {
        const expDate = new Date(doc.expirationDate);
        const diffMs = expDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays <= 0) {
          list.push({
            id: `doc-exp-${doc.id}`,
            title: "Documento Expirado",
            description: `O documento "${doc.title}" expirou em ${expDate.toLocaleDateString("pt-BR")}.`,
            type: "error",
            category: "document",
            createdAt: typeof doc.expirationDate === "string" ? doc.expirationDate : (doc.expirationDate ? (doc.expirationDate as any).toISOString() : new Date().toISOString()),
            critical: true,
            linkToTab: "documents"
          });
        } else if (diffDays <= 30) {
          list.push({
            id: `doc-warn-${doc.id}`,
            title: "Documento a Vencer",
            description: `O documento "${doc.title}" expira em ${diffDays} dias.`,
            type: "warning",
            category: "document",
            createdAt: typeof doc.createdAt === "string" ? doc.createdAt : (doc.createdAt ? (doc.createdAt as any).toISOString() : new Date().toISOString()),
            critical: false,
            linkToTab: "documents"
          });
        }
      }
    });

    // 5. Ocorrência crítica (Occurrence open and severity is critical or high)
    occurrences.forEach(oc => {
      const isCritical = oc.severity === "critical" || oc.severity === "high";
      if (oc.status === "open" && matchesUserScope(oc.unitId)) {
        list.push({
          id: `occ-${oc.id}`,
          title: isCritical ? "Ocorrência Crítica Registrada" : "Nova Ocorrência",
          description: `Ocorrência no setor "${oc.sector}": "${oc.title}"`,
          type: isCritical ? "error" : "info",
          category: "occurrence",
          createdAt: oc.createdAt ? new Date(oc.createdAt).toISOString() : new Date().toISOString(),
          critical: isCritical,
          linkToTab: "occurrences"
        });
      }
    });

    // 6. Stubs elegantes para demonstrar módulos futuros da V1 (Estoque Baixo e Treinamento Vencendo)
    // Apenas visíveis para gerentes/admins
    if (currentUser.role !== "OPERATOR") {
      list.push({
        id: "inventory-stub-1",
        title: "Estoque Baixo",
        description: "Molho de tomate com estoque abaixo do mínimo de 5 unidades. Atual: 2 unidades.",
        type: "warning",
        category: "inventory",
        createdAt: new Date(Date.now() - 3600 * 1000 * 3).toISOString(), // 3 hours ago
        critical: false,
        linkToTab: "dashboard"
      });

      list.push({
        id: "training-stub-1",
        title: "Certificação Expirando",
        description: "A certificação de 'Manipulação de Alimentos' para o colaborador Ricardo Costa vence em 5 dias.",
        type: "warning",
        category: "training",
        createdAt: new Date(Date.now() - 3600 * 1000 * 8).toISOString(), // 8 hours ago
        critical: false,
        linkToTab: "dashboard"
      });
    }

    // Sort by date descending
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [currentUser, checklistRuns, nonConformities, actionPlans, documents, occurrences]);

  useEffect(() => {
    async function initDbConnection() {
      try {
        const res = await checkDatabaseConnection();
        if (res.success && res.data?.connected) {
          setDbConnected(true);
        } else {
          setDbConnected(false);
        }
      } catch (err) {
        console.warn("Database connection check failed, using fallback:", err);
        setDbConnected(false);
      }
    }
    initDbConnection();
  }, []);

  // Multi-tenant real-time data loading
  useEffect(() => {
    if (!dbConnected || !isSessionLoaded) return;

    async function loadData() {
      try {
        const filterCompanyId = currentUser?.role === "SAAS_ADMIN" ? null : (currentUser?.companyId || null);

        // 1. Carregar Empresas (apenas SAAS_ADMIN precisa/vê todas)
        if (currentUser?.role === "SAAS_ADMIN") {
          const companiesRes = await getCompaniesAction();
          if (companiesRes.success && companiesRes.data) {
            setCompanies(companiesRes.data.map(c => ({
              id: c.id,
              name: c.name,
              cnpj: c.cnpj,
              plan: c.plan as "Basic" | "Pro" | "Enterprise",
              status: c.status as "active" | "inactive"
            })));
          }
        }

        // 2. Carregar Unidades (filtrado por empresa)
        const unitsRes = await getUnitsAction(filterCompanyId);
        if (unitsRes.success && unitsRes.data) {
          setUnits(unitsRes.data.map(u => ({
            id: u.id,
            name: u.name,
            address: u.address,
            status: u.status as "active" | "inactive",
            managerName: u.managerName,
            managerAvatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuAS_KwBCPZulX4J_feCE35FZ_giUwoPbcfe1xr8YIYZSNjn-ITAVHjnOMXjE-iw1vmcvHzCCusfBG9ycsMYilI2rJGFyUJZpQrQCAjWG_NYqJ5XrXcr47SVIZGChR0s9zZHtkpKfz-Fs5Q56Gg653vInOaFteOXjKNZjTW1hbs_5lKb_RDqe_NVoIn9jlcuN1Yc8gQKWmGKRzUHsFhV2xVNxbFqEzPsssGNN56vmD1cwswhqesiDZyWaHEgbZbnZs8Knx2iNdH6P8A"
          })));
        }

        // 3. Carregar Usuários / Colaboradores (filtrado por empresa)
        const usersRes = await getUsersAction(filterCompanyId);
        if (usersRes.success && usersRes.data) {
          setUsers(usersRes.data.map(u => ({
            id: u.id,
            companyId: u.companyId || "comp-1",
            unitId: u.unitId || null,
            name: u.name,
            email: u.email,
            role: u.role as Role,
            status: u.status as "active" | "inactive",
            avatarUrl: u.avatarUrl || undefined
          })));
        }

        // 4. Carregar Checklists (filtrado por empresa)
        const checklistsRes = await getChecklistsAction(filterCompanyId);
        if (checklistsRes.success && checklistsRes.data) {
          setChecklists(checklistsRes.data.map(c => {
            const schedule = c.schedules[0];
            return {
              id: c.id,
              title: c.title,
              sector: c.sector,
              recurrence: c.recurrence,
              activeDays: schedule ? schedule.daysOfWeek : ["Seg", "Ter", "Qua", "Qui", "Sex"],
              startTime: schedule ? schedule.startTime : "08:00",
              endTime: schedule ? schedule.endTime : "12:00",
              responsible: schedule && schedule.assignedRole ? schedule.assignedRole : "Todos",
              version: c.description || "1.0",
              status: c.status === "published" ? "active" : (c.status === "archived" ? "archived" : "draft"),
              lastUpdated: c.updatedAt ? new Date(c.updatedAt).toLocaleDateString() : "Sem registro",
              questions: c.questions.map(q => ({
                id: q.id,
                title: q.questionText,
                type: q.questionType as QuestionType,
                value: q.questionType === "checkbox" ? false : ""
              }))
            };
          }));
        }

        // 5. Carregar Ocorrências
        const occurrencesRes = await getOccurrencesAction(filterCompanyId);
        if (occurrencesRes.success && occurrencesRes.data) {
          setOccurrences(occurrencesRes.data as Occurrence[]);
        }

        // 6. Carregar Não Conformidades
        const ncRes = await getNonConformitiesAction(filterCompanyId);
        if (ncRes.success && ncRes.data) {
          setNonConformities(ncRes.data as NonConformity[]);
        }

        // 7. Carregar Planos de Ação
        const apRes = await getActionPlansAction(filterCompanyId);
        if (apRes.success && apRes.data) {
          setActionPlans(apRes.data as ActionPlan[]);
        }

        // 8. Carregar Documentos
        const docRes = await getDocumentsAction(filterCompanyId);
        if (docRes.success && docRes.data) {
          setDocuments(docRes.data.map(d => ({
            id: d.id,
            companyId: d.companyId,
            unitId: d.unitId,
            title: d.title,
            description: d.description,
            category: d.category,
            fileUrl: d.fileUrl,
            version: d.version,
            expirationDate: d.expirationDate ? new Date(d.expirationDate).toISOString() : null,
            status: d.status,
            createdAt: new Date(d.createdAt).toISOString(),
            updatedAt: new Date(d.updatedAt).toISOString(),
            unit: d.unit
          })));
        }

        // 9. Carregar Audit Logs
        const logsRes = await getAuditLogsAction(filterCompanyId);
        if (logsRes.success && logsRes.data) {
          setAuditLogs(logsRes.data as AuditLog[]);
        }

        // 10. Carregar Checklist Runs
        const runsRes = await getChecklistRunsAction(filterCompanyId);
        if (runsRes.success && runsRes.data) {
          setChecklistRuns(runsRes.data as ChecklistRun[]);
        }
      } catch (err) {
        console.error("Erro ao carregar dados do banco:", err);
      }
    }
    loadData();
  }, [dbConnected, isSessionLoaded, currentUser]);

  // Session Loader & Redirects
  useEffect(() => {
    async function loadSession() {
      try {
        const res = await getCurrentSessionUser();
        if (res.success && res.data) {
          const user = res.data;
          setCurrentUser(user);
          if (user.role === "OPERATOR") {
            setActiveTab("editor");
          } else if (user.role === "SAAS_ADMIN") {
            setActiveTab("companies");
          }
        } else {
          // Fallback local storage
          const saved = localStorage.getItem("checkrest_user");
          if (saved) {
            const parsed = JSON.parse(saved);
            setCurrentUser(parsed);
            if (parsed.role === "OPERATOR") {
              setActiveTab("editor");
            } else if (parsed.role === "SAAS_ADMIN") {
              setActiveTab("companies");
            }
          }
        }
      } catch (e) {
        console.error("Erro ao carregar sessão:", e);
      } finally {
        setIsSessionLoaded(true);
      }
    }
    loadSession();
  }, []);

  // RBAC Tab Access Route Guard
  useEffect(() => {
    if (!currentUser) return;

    const adminTabs = ["dashboard_saas", "companies", "licenses", "company_admins", "modules", "commercial_status", "auditlogs", "global_settings"];
    
    if (currentUser.role === "OPERATOR") {
      const allowed = ["editor", "occurrences", "settings", "ai"];
      if (!allowed.includes(activeTab)) {
        setActiveTab("editor");
      }
    } else if (currentUser.role === "UNIT_MANAGER") {
      if (adminTabs.includes(activeTab)) {
        setActiveTab("dashboard");
      }
    } else if (currentUser.role === "COMPANY_ADMIN") {
      if (adminTabs.includes(activeTab)) {
        setActiveTab("dashboard");
      }
    } else if (currentUser.role === "SAAS_ADMIN") {
      const allowedSaas = [...adminTabs, "settings"];
      if (!allowedSaas.includes(activeTab)) {
        setActiveTab("companies");
      }
    }
  }, [activeTab, currentUser]);



  const handleLogin = (user: UserType) => {
    setCurrentUser(user);
    localStorage.setItem("checkrest_user", JSON.stringify(user));
    
    // Se logar via Google OAuth (novo cliente/empresa), abre o wizard de onboarding inicial
    if (user.id === "usr-company_admin-google") {
      setShowOnboardingWizard(true);
    }

    if (user.role === "OPERATOR") {
      setActiveTab("editor");
      setSelectedChecklistId(null);
    } else if (user.role === "SAAS_ADMIN") {
      setActiveTab("companies");
    } else {
      setActiveTab("dashboard");
    }
  };

  const handleLogout = async () => {
    setCurrentUser(null);
    localStorage.removeItem("checkrest_user");
    try {
      await logoutUserAction();
    } catch (e) {
      console.error("Erro ao limpar sessão no servidor:", e);
    }
  };

  const handleAddCompany = async () => {
    if (!newCompanyName.trim() || !newCompanyCnpj.trim()) {
      alert("Por favor, preencha todos os campos da empresa.");
      return;
    }

    if (dbConnected) {
      const res = await createCompanyAction({
        name: newCompanyName,
        cnpj: newCompanyCnpj,
        plan: newCompanyPlan
      });

      if (res.success && res.data) {
        const added = res.data;
        setCompanies((prev) => [
          ...prev,
          {
            id: added.id,
            name: added.name,
            cnpj: added.cnpj,
            plan: added.plan as any,
            status: added.status as any
          }
        ]);
        setNewCompanyName("");
        setNewCompanyCnpj("");
        alert("Empresa cadastrada com sucesso!");
        return;
      } else {
        alert("Erro ao cadastrar empresa no banco: " + res.error);
        return;
      }
    }

    // Local / Offline mode fallback
    const newComp: Company = {
      id: "comp-" + (companies.length + 1),
      name: newCompanyName,
      cnpj: newCompanyCnpj,
      plan: newCompanyPlan,
      status: "active"
    };
    setCompanies([...companies, newComp]);
    setNewCompanyName("");
    setNewCompanyCnpj("");
  };

  const handleToggleCompanyStatus = async (companyId: string) => {
    const comp = companies.find(c => c.id === companyId);
    if (!comp) return;

    if (dbConnected && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(companyId)) {
      const res = await toggleCompanyStatusAction(companyId, comp.status);
      if (res.success && res.data) {
        const d = res.data;
        setCompanies(prev => prev.map(c => c.id === companyId ? { ...c, status: d.status as any } : c));
        alert(`Status da empresa alterado para ${d.status === "active" ? "Ativo" : "Suspenso"}!`);
        return;
      } else {
        alert("Erro ao alterar status no banco: " + res.error);
        return;
      }
    }

    // Local / Offline mode fallback
    setCompanies(prev => prev.map(c => c.id === companyId ? { ...c, status: c.status === 'active' ? 'inactive' : 'active' } : c));
  };

  // App global state
  const [checklists, setChecklists] = useState<Checklist[]>([
    {
      id: "ch-1",
      title: "Abertura de Cozinha",
      sector: "Cozinha Central",
      recurrence: "Repetir diariamente",
      activeDays: ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"],
      startTime: "08:00",
      endTime: "10:00",
      responsible: "Ricardo Lima",
      version: "1.2",
      status: "active",
      lastUpdated: "Há 2 horas",
      questions: [
        { id: "q-1-1", title: "As bancadas foram sanitizadas?", type: "checkbox", value: false },
        { id: "q-1-2", title: "Registrar temperatura do freezer principal", type: "photo", value: "" }
      ]
    },
    {
      id: "ch-2",
      title: "Higiene Semanal - Área Seca",
      sector: "Estoque",
      recurrence: "Semanal",
      activeDays: ["Seg"],
      startTime: "14:00",
      endTime: "18:00",
      responsible: "Todos os Gerentes",
      version: "0.8",
      status: "draft",
      lastUpdated: "Ontem",
      questions: [
        { id: "q-2-1", title: "Prateleiras limpas e organizadas?", type: "checkbox", value: false },
        { id: "q-2-2", title: "Sinais de pragas identificados?", type: "checkbox", value: false }
      ]
    },
    {
      id: "ch-3",
      title: "Fechamento de Salão",
      sector: "Atendimento",
      recurrence: "Repetir diariamente",
      activeDays: ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"],
      startTime: "22:00",
      endTime: "23:30",
      responsible: "Ana Martins",
      version: "2.1",
      status: "active",
      lastUpdated: "Há 3 dias",
      questions: [
        { id: "q-3-1", title: "Mesas limpas e alinhadas?", type: "checkbox", value: false },
        { id: "q-3-2", title: "Lixeiras esvaziadas?", type: "checkbox", value: false },
        { id: "q-3-3", title: "Registrar estado do salão", type: "photo", value: "" }
      ]
    }
  ]);

  const [units, setUnits] = useState<Unit[]>([]);

  // Lock unit selection for unit managers dynamically
  useEffect(() => {
    if (currentUser?.role === "UNIT_MANAGER") {
      const mgrUnit = units.find(u => u.id === currentUser.unitId);
      if (mgrUnit) {
        setSelectedUnitFilter(mgrUnit.name);
      } else if (units.length > 0) {
        setSelectedUnitFilter(units[0].name);
      } else {
        setSelectedUnitFilter("Sem Unidade");
      }
    }
  }, [currentUser, units]);

  const [users, setUsers] = useState<UserType[]>([
    { id: "usr-admin", companyId: "comp-1", unitId: null, name: "Ricardo Costa", email: "admin@restaurante.com", role: "COMPANY_ADMIN", status: "active" }
  ]);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "msg-1",
      sender: "user",
      text: "Crie um checklist para recebimento de mercadorias."
    },
    {
      id: "msg-2",
      sender: "ai",
      text: "Aqui estão os itens essenciais para o seu checklist de Recebimento de Mercadorias:",
      checklistTemplate: {
        title: "Recebimento de Mercadorias",
        sector: "Estoque",
        questions: [
          { title: "Temperatura do caminhão está adequada?", type: "checkbox" },
          { title: "Integridade das embalagens verificada?", type: "checkbox" },
          { title: "Data de validade das proteínas inspecionada?", type: "checkbox" },
          { title: "Conferência quantitativa com Nota Fiscal realizada?", type: "checkbox" },
          { title: "Foto do lote de recebimento para evidência", type: "photo" }
        ]
      }
    }
  ]);

  // Dashboard Filters State
  const [selectedUnitFilter, setSelectedUnitFilter] = useState("Todas as Unidades");

  // Live Dashboard Stats from Supabase
  const [dashboardStats, setDashboardStats] = useState<{
    scheduled: number;
    active: number;
    completed: number;
    delayed: number;
    openNonConforms?: number;
    pendingActionPlans?: number;
    weeklyScores?: { day: string; val: number }[];
    operatorRanking?: { name: string; initials: string; score: number; color?: string }[];
  }>({
    scheduled: 0,
    active: 0,
    completed: 0,
    delayed: 0
  });

  useEffect(() => {
    if (!dbConnected || !isSessionLoaded) return;

    async function loadDashboardStats() {
      const companyId = currentUser?.role === "SAAS_ADMIN" ? null : (currentUser?.companyId || null);
      const unitId = selectedUnitFilter === "Todas as Unidades" ? null : units.find(u => u.name === selectedUnitFilter)?.id || null;

      try {
        const res = await getDashboardDataAction(companyId, unitId, selectedPeriodFilter);
        if (res.success && res.data) {
          const d = res.data;
          setDashboardStats({
            scheduled: d.scheduledCount,
            active: d.inProgressCount,
            completed: d.completedCount,
            delayed: d.lateCount,
            openNonConforms: d.openNonConforms,
            pendingActionPlans: d.pendingActionPlans,
            weeklyScores: d.weeklyScores,
            operatorRanking: d.operatorRanking
          });
        }
      } catch (err) {
        console.warn("Falha ao carregar dados do dashboard:", err);
      }
    }

    loadDashboardStats();
  }, [dbConnected, isSessionLoaded, currentUser, selectedUnitFilter, selectedPeriodFilter, units]);

  // Checklist Filter State
  const [checklistStatusFilter, setChecklistStatusFilter] = useState<"active" | "draft" | "archived">("active");
  const [checklistSectorFilter, setChecklistSectorFilter] = useState("Todos os Setores");

  const filteredChecklists = useMemo(() => {
    return checklists.filter((ch) => {
      const statusMatch = ch.status === checklistStatusFilter;
      const sectorMatch =
        checklistSectorFilter === "Todos os Setores" ||
        ch.sector.toLowerCase().includes(checklistSectorFilter.toLowerCase());
      return statusMatch && sectorMatch;
    });
  }, [checklists, checklistStatusFilter, checklistSectorFilter]);

  // Editor State
  const [selectedChecklistId, setSelectedChecklistId] = useState<string | null>(null);
  const [editorChecklist, setEditorChecklist] = useState<Checklist>({
    id: "new",
    title: "",
    sector: "Cozinha Central",
    recurrence: "Repetir diariamente",
    activeDays: ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"],
    startTime: "08:00",
    endTime: "22:00",
    responsible: "Todos os Gerentes",
    version: "1.0",
    status: "active",
    lastUpdated: "Agora mesmo",
    questions: []
  });

  // Photo uploads and compression state inside phone preview
  const [compressionLoading, setCompressionLoading] = useState<string | null>(null); // holds questionId if loading

  // AI chat input state
  const [chatInput, setChatInput] = useState("");
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Settings: Add Unit Modal State
  const [isAddUnitModalOpen, setIsAddUnitModalOpen] = useState(false);
  const [newUnitName, setNewUnitName] = useState("");
  const [newUnitAddress, setNewUnitAddress] = useState("");
  const [newUnitManager, setNewUnitManager] = useState("");
  const [searchUnitQuery, setSearchUnitQuery] = useState("");

  const filteredUnits = useMemo(() => {
    return units.filter(
      (un) =>
        un.name.toLowerCase().includes(searchUnitQuery.toLowerCase()) ||
        un.address.toLowerCase().includes(searchUnitQuery.toLowerCase()) ||
        un.managerName.toLowerCase().includes(searchUnitQuery.toLowerCase())
    );
  }, [units, searchUnitQuery]);

  const activeOccurrencesCount = useMemo(() => {
    return occurrences.filter(occ => occ.status === "open" || occ.status === "in_progress").length;
  }, [occurrences]);

  // Action: Open Editor for a Checklist
  const handleOpenChecklistEditor = (checklist: Checklist) => {
    setSelectedChecklistId(checklist.id);
    setEditorChecklist({ ...checklist, questions: checklist.questions.map((q) => ({ ...q })) });
    setActiveTab("editor");
  };

  // Action: Open empty checklist editor
  const handleCreateNewChecklist = () => {
    setSelectedChecklistId(null);
    setEditorChecklist({
      id: "ch-" + (checklists.length + 1),
      title: "Novo Checklist",
      sector: "Cozinha Central",
      recurrence: "Repetir diariamente",
      activeDays: ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"],
      startTime: "08:00",
      endTime: "22:00",
      responsible: "Todos os Gerentes",
      version: "1.0",
      status: "active",
      lastUpdated: "Agora mesmo",
      questions: [
        { id: "new-q-1", title: "Primeira tarefa do checklist", type: "checkbox", value: false }
      ]
    });
    setActiveTab("editor");
  };

  // Action: Add new question in Editor
  const handleAddQuestion = () => {
    const newQ: Question = {
      id: "eq-" + Date.now(),
      title: "",
      type: "checkbox",
      value: false
    };
    setEditorChecklist((prev) => ({
      ...prev,
      questions: [...prev.questions, newQ]
    }));
  };

  // Action: Delete question from Editor
  const handleDeleteQuestion = (qId: string) => {
    setEditorChecklist((prev) => ({
      ...prev,
      questions: prev.questions.filter((q) => q.id !== qId)
    }));
  };

  // Action: Move question up or down
  const handleMoveQuestion = (index: number, direction: "up" | "down") => {
    const updated = [...editorChecklist.questions];
    if (direction === "up" && index > 0) {
      const temp = updated[index];
      updated[index] = updated[index - 1];
      updated[index - 1] = temp;
    } else if (direction === "down" && index < updated.length - 1) {
      const temp = updated[index];
      updated[index] = updated[index + 1];
      updated[index + 1] = temp;
    }
    setEditorChecklist((prev) => ({ ...prev, questions: updated }));
  };

  // Action: Update single question properties in Editor (title, type)
  const handleUpdateQuestion = (qId: string, fields: Partial<Question>) => {
    setEditorChecklist((prev) => ({
      ...prev,
      questions: prev.questions.map((q) => (q.id === qId ? { ...q, ...fields } : q))
    }));
  };

  // Action: Publish/Save checklist from Editor
  const handleSaveChecklist = async () => {
    if (!editorChecklist.title.trim()) {
      alert("Por favor, digite um título para o checklist.");
      return;
    }

    const companyId = currentUser?.companyId || "comp-1";

    if (dbConnected) {
      const dbStatus = editorChecklist.status === "active" ? "published" : editorChecklist.status;

      const res = await upsertChecklistAction({
        id: editorChecklist.id,
        companyId,
        title: editorChecklist.title,
        sector: editorChecklist.sector,
        recurrence: editorChecklist.recurrence,
        status: dbStatus,
        version: editorChecklist.version,
        activeDays: editorChecklist.activeDays,
        startTime: editorChecklist.startTime,
        endTime: editorChecklist.endTime,
        responsible: editorChecklist.responsible,
        questions: editorChecklist.questions.map((q) => ({
          id: (q.id.startsWith("q-") || q.id.startsWith("ai-q-")) ? undefined : q.id,
          title: q.title,
          type: q.type
        })),
        performedByUserId: currentUser?.id
      });

      if (res.success && res.data) {
        const saved = res.data;
        const mapped: Checklist = {
          id: saved.id,
          title: saved.title,
          sector: saved.sector,
          recurrence: saved.recurrence,
          activeDays: editorChecklist.activeDays,
          startTime: editorChecklist.startTime,
          endTime: editorChecklist.endTime,
          responsible: editorChecklist.responsible,
          version: editorChecklist.version,
          status: saved.status === "published" ? "active" : (saved.status === "archived" ? "archived" : "draft"),
          lastUpdated: "Agora mesmo",
          questions: saved.questions.map((q) => ({
            id: q.id,
            title: q.questionText,
            type: q.questionType as QuestionType,
            value: q.questionType === "checkbox" ? false : ""
          }))
        };

        setChecklists((prev) => {
          const exists = prev.some((c) => c.id === mapped.id || c.id === editorChecklist.id);
          if (exists) {
            return prev.map((c) => (c.id === mapped.id || c.id === editorChecklist.id ? mapped : c));
          } else {
            return [...prev, mapped];
          }
        });

        alert("Checklist salvo com sucesso!");
        setActiveTab("checklists");
        return;
      } else {
        alert("Erro ao salvar checklist no banco de dados: " + res.error);
        return;
      }
    }

    // Local/Offline Mode Fallback
    setChecklists((prev) => {
      const exists = prev.some((c) => c.id === editorChecklist.id);
      if (exists) {
        return prev.map((c) => (c.id === editorChecklist.id ? { ...editorChecklist, lastUpdated: "Agora mesmo" } : c));
      } else {
        return [...prev, { ...editorChecklist, lastUpdated: "Agora mesmo" }];
      }
    });

    alert("Checklist salvo e publicado localmente!");
    setActiveTab("checklists");
  };

  // Action: Archive checklist from the database template list
  const handleArchiveChecklist = async (id: string) => {
    const ch = checklists.find(c => c.id === id);
    if (!ch) return;

    if (dbConnected) {
      const res = await archiveChecklistAction(id, currentUser?.id);
      if (res.success && res.data) {
        setChecklists(prev => prev.map(c => c.id === id ? { ...c, status: 'archived' } : c));
        alert("Checklist arquivado com sucesso!");
        return;
      } else {
        alert("Erro ao arquivar checklist no banco: " + res.error);
        return;
      }
    }

    // Local/Offline mode fallback
    setChecklists(prev => prev.map(c => c.id === id ? { ...c, status: 'archived' } : c));
    alert("Checklist arquivado localmente!");
  };

  // Action: Handle file compression inside Mobile Preview
  // Action: Handle file compression and upload inside Mobile Preview
  const handleMobilePhotoUpload = async (qId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setCompressionLoading(qId);
      const compressed = await comprimirEvidencia(file);
      const url = URL.createObjectURL(compressed);
      
      const reduction = ((1 - compressed.size / file.size) * 100).toFixed(0);

      let finalUrl = url;

      if (dbConnected) {
        try {
          const fileToUpload = new File([compressed], file.name, { type: file.type });
          const uploadedUrl = await uploadFileToStorage(fileToUpload, 'evidences');
          if (uploadedUrl) {
            finalUrl = uploadedUrl;
            console.log("Upload de evidência concluído com sucesso:", uploadedUrl);
          }
        } catch (uploadErr) {
          console.warn("Falha no upload da imagem para o Supabase Storage. Usando blob local:", uploadErr);
        }
      }

      setEditorChecklist((prev) => ({
        ...prev,
        questions: prev.questions.map((q) =>
          q.id === qId
            ? {
                ...q,
                value: finalUrl,
                photoUrl: finalUrl,
                originalSize: file.size,
                compressedSize: compressed.size,
                reductionPercent: reduction
              }
            : q
        )
      }));
    } catch (err) {
      console.error("Erro no processamento da imagem:", err);
      alert("Erro ao comprimir imagem. Tente novamente.");
    } finally {
      setCompressionLoading(null);
    }
  };

  // Occurrence Handlers
  const handleRegisterMobileOccurrence = async () => {
    if (!mobileOccTitle.trim()) return;

    const companyId = currentUser?.companyId || "comp-1";
    const unitId = currentUser?.unitId || "un-2"; // fallback
    const userName = currentUser?.name || "Operador";

    if (dbConnected) {
      const res = await createOccurrenceAction({
        companyId,
        unitId,
        title: mobileOccTitle,
        description: mobileOccDescription,
        sector: mobileOccSector,
        severity: mobileOccSeverity,
        createdBy: userName,
        performedByUserId: currentUser?.id
      });
      if (res.success && res.data) {
        setOccurrences((prev) => [res.data as Occurrence, ...prev]);
        setMobileOccTitle("");
        setMobileOccDescription("");
        setIsMobileOccurrenceOpen(false);
        alert("Ocorrência registrada com sucesso!");
        return;
      } else {
        alert("Erro ao registrar ocorrência no banco: " + res.error);
      }
    }

    // Local/Offline Mode fallback
    const newOcc: Occurrence = {
      id: "occ-" + Date.now(),
      companyId,
      unitId,
      title: mobileOccTitle,
      description: mobileOccDescription,
      sector: mobileOccSector,
      severity: mobileOccSeverity,
      status: "open",
      createdBy: userName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      unit: { name: units.find(u => u.id === unitId)?.name || "Filial - Jardins" },
      isLocked: false
    };

    setOccurrences((prev) => [newOcc, ...prev]);
    
    // Save to localStorage too
    const savedOccs = localStorage.getItem("checkrest_occurrences");
    const occsList = savedOccs ? JSON.parse(savedOccs) : [];
    occsList.unshift(newOcc);
    localStorage.setItem("checkrest_occurrences", JSON.stringify(occsList));

    // Enfileirar para sincronizar quando voltar online
    enqueue({
      type: "occurrence",
      id: newOcc.id,
      payload: {
        companyId,
        unitId,
        title: mobileOccTitle,
        description: mobileOccDescription || null,
        sector: mobileOccSector,
        severity: mobileOccSeverity,
        createdBy: userName
      }
    });

    setMobileOccTitle("");
    setMobileOccDescription("");
    setIsMobileOccurrenceOpen(false);
    alert("Ocorrência registrada localmente! Será sincronizada automaticamente quando a conexão for restaurada.");
  };

  const handleUpdateOccurrenceStatus = async (id: string, newStatus: string) => {
    const isClosing = newStatus === "resolved" || newStatus === "cancelled";
    const userName = currentUser?.name || "Usuário";

    if (dbConnected) {
      const res = await updateOccurrenceStatusAction(id, newStatus, currentUser?.id, userName);
      if (res.success && res.data) {
        const updated = res.data as Occurrence;
        setOccurrences((prev) => prev.map(o => o.id === id ? { 
          ...o, 
          status: updated.status, 
          resolvedAt: updated.resolvedAt,
          resolvedBy: updated.resolvedBy,
          closedAt: updated.closedAt,
          closedBy: updated.closedBy,
          isLocked: updated.isLocked 
        } : o));
        alert(`Ocorrência alterada para ${newStatus === "resolved" ? "Resolvida" : "Cancelada"} e bloqueada!`);
        return;
      } else {
        alert("Erro ao atualizar status no banco de dados: " + res.error);
        return;
      }
    }

    // Local / Offline mode fallback
    setOccurrences((prev) => prev.map(o => o.id === id ? { 
      ...o, 
      status: newStatus, 
      resolvedAt: isClosing ? new Date().toISOString() : null,
      resolvedBy: isClosing ? userName : null,
      closedAt: isClosing ? new Date().toISOString() : null,
      closedBy: isClosing ? userName : null,
      isLocked: isClosing ? true : false,
      updatedAt: new Date().toISOString()
    } : o));

    // Save to localStorage too
    const savedOccs = localStorage.getItem("checkrest_occurrences");
    if (savedOccs) {
      const list = JSON.parse(savedOccs);
      const updatedList = list.map((o: any) => o.id === id ? {
        ...o,
        status: newStatus,
        resolvedAt: isClosing ? new Date().toISOString() : null,
        resolvedBy: isClosing ? userName : null,
        closedAt: isClosing ? new Date().toISOString() : null,
        closedBy: isClosing ? userName : null,
        isLocked: isClosing ? true : false,
        updatedAt: new Date().toISOString()
      } : o);
      localStorage.setItem("checkrest_occurrences", JSON.stringify(updatedList));
    }

    alert(`Ocorrência alterada para ${newStatus === "resolved" ? "Resolvida" : "Cancelada"} localmente e bloqueada!`);
  };

  const handleOpenDuplicateModal = (occ: Occurrence) => {
    setOccurrenceToDuplicate(occ);
    setDuplicateTitle(occ.title + " (Cópia)");
    setDuplicateDescription(occ.description || "");
    setIsDuplicateModalOpen(true);
  };

  const handleDuplicateOccurrence = async () => {
    if (!occurrenceToDuplicate || !duplicateTitle.trim()) return;

    if (dbConnected) {
      const res = await duplicateOccurrenceAction(
        occurrenceToDuplicate.id,
        duplicateTitle,
        duplicateDescription,
        currentUser?.id,
        currentUser?.name
      );
      if (res.success && res.data) {
        const added = res.data as Occurrence;
        setOccurrences((prev) => [added, ...prev]);
        setIsDuplicateModalOpen(false);
        setOccurrenceToDuplicate(null);
        alert("Ocorrência duplicada com sucesso no banco!");
        return;
      } else {
        alert("Erro ao duplicar ocorrência no banco: " + res.error);
        return;
      }
    }

    // Local / Offline fallback
    const newOcc: Occurrence = {
      id: "occ-" + Date.now(),
      companyId: occurrenceToDuplicate.companyId,
      unitId: occurrenceToDuplicate.unitId,
      title: duplicateTitle,
      description: duplicateDescription,
      sector: occurrenceToDuplicate.sector,
      severity: occurrenceToDuplicate.severity,
      status: "open",
      createdBy: currentUser?.name || occurrenceToDuplicate.createdBy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      unit: occurrenceToDuplicate.unit,
      duplicatedFromOccurrenceId: occurrenceToDuplicate.id,
      isLocked: false
    };

    setOccurrences((prev) => [newOcc, ...prev]);
    
    // Save to localStorage too
    const savedOccs = localStorage.getItem("checkrest_occurrences");
    const occsList = savedOccs ? JSON.parse(savedOccs) : [];
    occsList.unshift(newOcc);
    localStorage.setItem("checkrest_occurrences", JSON.stringify(occsList));

    setIsDuplicateModalOpen(false);
    setOccurrenceToDuplicate(null);
    alert("Ocorrência duplicada localmente com sucesso!");
  };

  // Action: Submit checklist execution inside Mobile Preview
  const handleSubmitChecklistExecution = async () => {
    const companyId = currentUser?.companyId || "comp-1";
    const unitId = currentUser?.unitId || (units[0]?.id || "un-1");

    // 1. Mapear respostas e calcular não conformidades
    const answersData = editorChecklist.questions.map((q) => {
      let isNonConform = false;
      if (q.type === "checkbox") {
        isNonConform = q.value === false;
      } else if (q.type === "number") {
        const valNum = parseFloat(String(q.value ?? ""));
        if (!isNaN(valNum)) {
          isNonConform = valNum < (q.minValue ?? -Infinity) || valNum > (q.maxValue ?? Infinity);
        } else {
          // Empty or non-filled number can be marked as non-conform if required, or false by default
          isNonConform = false;
        }
      }

      return {
        questionId: q.id,
        answerValue: String(q.value ?? ""),
        isNonConform,
        observation: q.observation || (q.type === "photo" && q.reductionPercent ? `Comprimida: ${q.reductionPercent}% redução` : undefined)
      };
    });

    const totalQuestions = editorChecklist.questions.length;
    const conformQuestions = answersData.filter(ans => !ans.isNonConform).length;
    const score = totalQuestions > 0 ? Math.round((conformQuestions / totalQuestions) * 100) : 100;

    const isDbUuid = new RegExp("^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", "i").test(editorChecklist.id);
    
    if (dbConnected && isDbUuid) {
      try {
        const res = await createChecklistRunAction({
          checklistTemplateId: editorChecklist.id,
          companyId,
          unitId,
          assignedTo: currentUser?.name || "Operador",
          score,
          answers: answersData,
          performedByUserId: currentUser?.id
        });

        if (res.success) {
          alert("Checklist executado com sucesso e enviado para a Central!");
          setChecklists((prev) =>
            prev.map((c) => (c.id === editorChecklist.id ? { ...c, lastUpdated: "Finalizado agora" } : c))
          );
          setActiveTab("dashboard");
          return;
        }
      } catch (err) {
        console.warn("Erro ao salvar no banco, usando fallback local:", err);
      }
    }

    // Fallback local: Salva o run em localStorage e no estado
    const localRunId = "run-" + Date.now();
    const savedRuns = localStorage.getItem("checkrest_checklist_runs");
    const runsList = savedRuns ? JSON.parse(savedRuns) : [];
    const newRun: ChecklistRun = {
      id: localRunId,
      checklistTemplateId: editorChecklist.id,
      companyId,
      unitId,
      assignedTo: currentUser?.name || "Operador",
      score,
      status: "completed",
      finishedAt: new Date().toISOString(),
      performedByUserId: currentUser?.id,
      template: { title: editorChecklist.title, sector: editorChecklist.sector }
    };
    runsList.unshift(newRun);
    localStorage.setItem("checkrest_checklist_runs", JSON.stringify(runsList));
    setChecklistRuns(prev => [newRun, ...prev]);

    // Enfileirar para sincronizar quando voltar online
    enqueue({
      type: "checklist_run",
      id: localRunId,
      payload: {
        checklistTemplateId: editorChecklist.id,
        companyId,
        unitId,
        assignedTo: currentUser?.name || "Operador",
        score,
        performedByUserId: currentUser?.id,
        answers: answersData
      }
    });

    // For local fallback: generate automatic occurrences and non-conformities
    const generatedLocalOccs: Occurrence[] = [];
    const generatedLocalNCs: NonConformity[] = [];
    editorChecklist.questions.forEach((q, idx) => {
      const ans = answersData[idx];
      if (ans.isNonConform) {
        if (q.type === "number" && q.generateOccurrenceOnFailure) {
          const minStr = q.minValue !== undefined ? String(q.minValue) : "-";
          const maxStr = q.maxValue !== undefined ? String(q.maxValue) : "-";
          const newOcc: Occurrence = {
            id: "occ-auto-" + Date.now() + "-" + idx,
            companyId,
            unitId,
            title: `Ocorrência automática: ${q.title || "Questão Numérica"}`,
            description: `Valor fora da faixa permitida. Registrado: ${ans.answerValue} ${q.unitMeasure || ""}. Limites: [${minStr}, ${maxStr}]. Observação: ${ans.observation || "Nenhuma"}`,
            sector: editorChecklist.sector || "Geral",
            severity: q.failureSeverity || "medium",
            status: "open",
            createdBy: currentUser?.name || "Sistema",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            unit: { name: units.find(u => u.id === unitId)?.name || "Filial" },
            isLocked: false
          };
          generatedLocalOccs.push(newOcc);
        }

        // Always create a non-conformity for any failure
        const newNC: NonConformity = {
          id: "nc-auto-" + Date.now() + "-" + idx,
          companyId,
          unitId,
          title: `Não Conformidade: ${q.title || "Higiene / Processo"}`,
          description: `Falha registrada durante a execução do checklist "${editorChecklist.title}". Valor: ${ans.answerValue}. Observação: ${ans.observation || "Nenhuma"}`,
          severity: q.type === "number" ? (q.failureSeverity || "medium") : "medium",
          status: "open",
          createdAt: new Date().toISOString(),
          unit: { name: units.find(u => u.id === unitId)?.name || "Filial" }
        };
        generatedLocalNCs.push(newNC);
      }
    });

    if (generatedLocalOccs.length > 0) {
      setOccurrences(prev => [...generatedLocalOccs, ...prev]);
      const savedOccs = localStorage.getItem("checkrest_occurrences");
      const occsList = savedOccs ? JSON.parse(savedOccs) : [];
      localStorage.setItem("checkrest_occurrences", JSON.stringify([...generatedLocalOccs, ...occsList]));
    }

    if (generatedLocalNCs.length > 0) {
      setNonConformities(prev => [...generatedLocalNCs, ...prev]);
      const savedNCs = localStorage.getItem("checkrest_nonconformities");
      const ncsList = savedNCs ? JSON.parse(savedNCs) : [];
      localStorage.setItem("checkrest_nonconformities", JSON.stringify([...generatedLocalNCs, ...ncsList]));
    }

    alert("Checklist executado com sucesso e enviado para a Central (Simulação Local)!");
    setChecklists((prev) =>
      prev.map((c) => (c.id === editorChecklist.id ? { ...c, lastUpdated: "Finalizado agora" } : c))
    );
    setActiveTab("dashboard");
  };

  // Action: Send message in AI chatbot — calls real Gemini API via askAIAction
  const handleSendChatMessage = async () => {
    if (!chatInput.trim()) return;

    const userMsg: ChatMessage = {
      id: "msg-user-" + Date.now(),
      sender: "user",
      text: chatInput
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setIsAILoading(true);

    // Build real AIContext from live state
    const aiContext: AIContext = {
      user: {
        name: currentUser?.name || "Usuário",
        role: currentUser?.role || "OPERATOR",
        companyId: currentUser?.companyId || null,
        unitId: currentUser?.unitId || null
      },
      units: units.map(u => ({
        id: u.id,
        name: u.name,
        status: u.status,
        managerName: u.managerName || "N/A"
      })),
      nonConformities: nonConformities.map(nc => ({
        id: nc.id,
        title: nc.title,
        severity: nc.severity || "medium",
        status: nc.status,
        unitName: nc.unit?.name || units.find(u => u.id === nc.unitId)?.name || "N/A",
        createdAt: nc.createdAt ? new Date(nc.createdAt).toLocaleDateString("pt-BR") : "N/A"
      })),
      actionPlans: actionPlans.map(ap => ({
        id: ap.id,
        actionDescription: ap.actionDescription,
        status: ap.status,
        dueDate: ap.dueDate ? new Date(ap.dueDate).toLocaleDateString("pt-BR") : "N/A",
        unitName: ap.unit?.name || units.find(u => u.id === ap.unitId)?.name || "N/A",
        responsibleName: ap.responsibleUser?.name || "N/A"
      })),
      occurrences: occurrences.slice(0, 20).map(oc => ({
        id: oc.id,
        title: oc.title,
        sector: oc.sector || "N/A",
        severity: oc.severity || "medium",
        status: oc.status,
        unitName: oc.unit?.name || units.find(u => u.id === oc.unitId)?.name || "N/A",
        createdAt: oc.createdAt ? new Date(oc.createdAt).toLocaleDateString("pt-BR") : "N/A"
      })),
      checklists: checklists.map(cl => ({
        id: cl.id,
        title: cl.title,
        sector: cl.sector,
        status: cl.status,
        recurrence: cl.recurrence
      })),
      dashboardStats: {
        completed: dashboardStats.completed,
        delayed: dashboardStats.delayed,
        openNonConforms: dashboardStats.openNonConforms ?? nonConformities.filter(nc => nc.status === "open").length,
        pendingActionPlans: dashboardStats.pendingActionPlans ?? actionPlans.filter(ap => ap.status === "pending").length,
        operatorRanking: dashboardStats.operatorRanking?.map(op => ({ name: op.name, score: op.score }))
      },
      currentDateTime: new Date().toLocaleString("pt-BR", { dateStyle: "full", timeStyle: "short" })
    };

    try {
      const response = await askAIAction(chatInput, aiContext);

      const aiMsg: ChatMessage = {
        id: "msg-ai-" + Date.now(),
        sender: "ai",
        text: response.text,
        checklistTemplate: response.checklistTemplate
      };

      setChatMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error("[handleSendChatMessage] Erro ao chamar IA:", err);
      setChatMessages((prev) => [
        ...prev,
        {
          id: "msg-ai-err-" + Date.now(),
          sender: "ai",
          text: "⚠️ Não foi possível conectar ao assistente. Verifique sua conexão e tente novamente."
        }
      ]);
    } finally {
      setIsAILoading(false);
      setTimeout(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    }
  };

  // Action: Convert AI checklist template into editable form
  const handleConvertTemplate = (template: ChatMessage["checklistTemplate"]) => {
    if (!template) return;

    const newChecklist: Checklist = {
      id: "ch-" + (checklists.length + 1),
      title: template.title,
      sector: template.sector,
      recurrence: "Repetir diariamente",
      activeDays: ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"],
      startTime: "08:00",
      endTime: "22:00",
      responsible: "Todos os Gerentes",
      version: "1.0",
      status: "active",
      lastUpdated: "Gerado por IA agora",
      questions: template.questions.map((q, idx) => ({
        id: `ai-q-${idx}-${Date.now()}`,
        title: q.title,
        type: q.type,
        value: q.type === "checkbox" ? false : ""
      }))
    };

    setEditorChecklist(newChecklist);
    setSelectedChecklistId("new");
    setActiveTab("editor");
  };

  // Action: Add Unit
  const handleAddUnit = async () => {
    if (!newUnitName.trim() || !newUnitAddress.trim() || !newUnitManager.trim()) {
      alert("Por favor, preencha todos os campos da unidade.");
      return;
    }

    const companyId = currentUser?.companyId || "comp-1";

    if (dbConnected) {
      const res = await createUnitAction({
        companyId,
        name: newUnitName,
        address: newUnitAddress,
        managerName: newUnitManager,
        performedByUserId: currentUser?.id
      });

      if (res.success && res.data) {
        const added = res.data;
        setUnits((prev) => [
          ...prev,
          {
            id: added.id,
            name: added.name,
            address: added.address,
            status: added.status as "active" | "inactive",
            managerName: added.managerName,
            managerAvatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuAS_KwBCPZulX4J_feCE35FZ_giUwoPbcfe1xr8YIYZSNjn-ITAVHjnOMXjE-iw1vmcvHzCCusfBG9ycsMYilI2rJGFyUJZpQrQCAjWG_NYqJ5XrXcr47SVIZGChR0s9zZHtkpKfz-Fs5Q56Gg653vInOaFteOXjKNZjTW1hbs_5lKb_RDqe_NVoIn9jlcuN1Yc8gQKWmGKRzUHsFhV2xVNxbFqEzPsssGNN56vmD1cwswhqesiDZyWaHEgbZbnZs8Knx2iNdH6P8A"
          }
        ]);
        setNewUnitName("");
        setNewUnitAddress("");
        setNewUnitManager("");
        setIsAddUnitModalOpen(false);
        alert("Unidade cadastrada com sucesso!");
        return;
      } else {
        alert("Erro ao cadastrar unidade no banco: " + res.error);
        return;
      }
    }

    // Local / Offline mode fallback
    const newUnit: Unit = {
      id: "un-" + (units.length + 1),
      name: newUnitName,
      address: newUnitAddress,
      status: "active",
      managerName: newUnitManager,
      managerAvatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuAS_KwBCPZulX4J_feCE35FZ_giUwoPbcfe1xr8YIYZSNjn-ITAVHjnOMXjE-iw1vmcvHzCCusfBG9ycsMYilI2rJGFyUJZpQrQCAjWG_NYqJ5XrXcr47SVIZGChR0s9zZHtkpKfz-Fs5Q56Gg653vInOaFteOXjKNZjTW1hbs_5lKb_RDqe_NVoIn9jlcuN1Yc8gQKWmGKRzUHsFhV2xVNxbFqEzPsssGNN56vmD1cwswhqesiDZyWaHEgbZbnZs8Knx2iNdH6P8A"
    };

    setUnits((prev) => [...prev, newUnit]);
    setNewUnitName("");
    setNewUnitAddress("");
    setNewUnitManager("");
    setIsAddUnitModalOpen(false);
    alert("Unidade cadastrada localmente!");
  };

  // Action: Archive Unit
  const handleToggleUnitStatus = async (unitId: string) => {
    const un = units.find(u => u.id === unitId);
    if (!un) return;

    if (dbConnected) {
      const res = await toggleUnitStatusAction(unitId, un.status, currentUser?.id);
      if (res.success && res.data) {
        const d = res.data;
        setUnits((prev) =>
          prev.map((u) =>
            u.id === unitId ? { ...u, status: d.status as "active" | "inactive" } : u
          )
        );
        alert(`Status da unidade alterado para ${d.status === "active" ? "Ativo" : "Inativo"}!`);
        return;
      } else {
        alert("Erro ao alterar status da unidade no banco: " + res.error);
        return;
      }
    }

    // Local / Offline fallback
    setUnits((prev) =>
      prev.map((u) =>
        u.id === unitId ? { ...u, status: u.status === "active" ? "inactive" : "active" } : u
      )
    );
  };

  // Action: Add Collaborator / User
  const handleAddCollaborator = async () => {
    if (!newUserName.trim() || !newUserEmail.trim()) {
      alert("Por favor, preencha o nome e e-mail do colaborador.");
      return;
    }

    const companyId = currentUser?.companyId || "comp-1";
    const targetRole: Role = currentUser?.role === "UNIT_MANAGER" ? "OPERATOR" : newUserRole;
    const selectedUnitId = currentUser?.role === "UNIT_MANAGER"
      ? (currentUser.unitId || null)
      : (newUserUnitId === "Global" ? null : newUserUnitId);

    if (dbConnected) {
      const res = await createUserAction({
        companyId,
        name: newUserName,
        email: newUserEmail,
        role: targetRole,
        unitId: selectedUnitId,
        passwordHash: "bobs123", // default password
        performedByUserId: currentUser?.id
      });

      if (res.success && res.data) {
        const added = res.data;
        setUsers((prev) => [
          {
            id: added.id,
            companyId: added.companyId || companyId,
            unitId: added.unitId,
            name: added.name,
            email: added.email,
            role: added.role as Role,
            status: added.status as "active" | "inactive"
          },
          ...prev
        ]);
        setNewUserName("");
        setNewUserEmail("");
        setNewUserRole("OPERATOR");
        setNewUserUnitId("Global");
        setIsAddUserModalOpen(false);
        alert("Colaborador cadastrado com sucesso!");
        return;
      } else {
        alert("Erro ao cadastrar colaborador no banco: " + res.error);
        return;
      }
    }

    // Local / Offline mode fallback
    const newUser: UserType = {
      id: "usr-" + Date.now(),
      companyId,
      unitId: selectedUnitId,
      name: newUserName,
      email: newUserEmail,
      role: targetRole,
      status: "active"
    };

    setUsers((prev) => [newUser, ...prev]);
    setNewUserName("");
    setNewUserEmail("");
    setNewUserRole("OPERATOR");
    setNewUserUnitId("Global");
    setIsAddUserModalOpen(false);
    alert("Colaborador cadastrado localmente!");
  };

  // Action: Toggle Collaborator status (Activate/Suspend)
  const handleToggleUserStatus = async (userId: string) => {
    const usr = users.find(u => u.id === userId);
    if (!usr) return;

    if (dbConnected) {
      const res = await toggleUserStatusAction(userId, usr.status, currentUser?.id);
      if (res.success && res.data) {
        const d = res.data;
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId ? { ...u, status: d.status as "active" | "inactive" } : u
          )
        );
        alert(`Status do colaborador alterado para ${d.status === "active" ? "Ativo" : "Suspenso"}!`);
        return;
      } else {
        alert("Erro ao alterar status do colaborador no banco: " + res.error);
        return;
      }
    }

    // Local / Offline fallback
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId ? { ...u, status: u.status === "active" ? "inactive" : "active" } : u
      )
    );
  };

  // Helper formatting for file size
  const formatSize = (bytes?: number) => {
    if (!bytes) return "0 KB";
    return (bytes / 1024).toFixed(1) + " KB";
  };

  // Calculate execution progress in Mobile Preview
  const progressPercent = useMemo(() => {
    if (editorChecklist.questions.length === 0) return 0;
    const answered = editorChecklist.questions.filter((q) => {
      if (q.type === "checkbox") return q.value === true;
      if (q.type === "text") return typeof q.value === "string" && q.value.trim() !== "";
      if (q.type === "photo") return typeof q.value === "string" && q.value.trim() !== "";
      return false;
    }).length;
    return Math.round((answered / editorChecklist.questions.length) * 100);
  }, [editorChecklist]);

  if (!isSessionLoaded) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  // Operator view check
  if (currentUser.role === "OPERATOR") {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] aspect-square rounded-full bg-emerald-900/10 blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] aspect-square rounded-full bg-slate-950 blur-[120px] pointer-events-none"></div>

        {/* Header container */}
        <div className="w-full max-w-md flex justify-between items-center mb-4 text-white px-2">
          <div className="flex items-center gap-2.5">
            <img
              alt="Operator Profile"
              className="h-8 w-8 rounded-full object-cover border border-slate-700 shadow-sm animate-pulse"
              src={currentUser.avatarUrl}
            />
            <div>
              <p className="text-xs font-bold leading-none">{currentUser.name}</p>
              <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider mt-1">Operador Cozinha</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-[10px] uppercase font-extrabold text-red-400 hover:text-red-300 transition-colors bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl shadow-sm"
          >
            <LogOut className="w-3.5 h-3.5" /> Sair
          </button>
        </div>

        {/* Mobile Mockup Simulator View */}
        <div className="w-full max-w-md h-[82vh] bg-slate-900 rounded-[3rem] p-3 shadow-2xl border-4 border-slate-800 flex flex-col overflow-hidden relative">
          {/* Speaker & notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-900 rounded-b-xl z-20 flex justify-center items-center">
            <div className="w-12 h-1 bg-slate-800 rounded-full"></div>
            <div className="w-2.5 h-2.5 bg-slate-800 rounded-full ml-3"></div>
          </div>

          <div className="w-full h-full bg-slate-50 rounded-[2.2rem] overflow-hidden relative flex flex-col pt-6">
            {(() => {
              const completedRunIds = new Set(checklistRuns.map(r => r.checklistTemplateId));
              const activeChecklistsList = checklists.filter(c => c.status === "active");
              const isChecklistCompleted = (ch: Checklist) => completedRunIds.has(ch.id) || ch.lastUpdated === "Finalizado agora";
              const pendingActiveChecklists = activeChecklistsList.filter(ch => !isChecklistCompleted(ch));
              const completedActiveChecklists = activeChecklistsList.filter(ch => isChecklistCompleted(ch));

              return (
                <>
                  {/* Phone App Bar */}
                  <div className="bg-gradient-to-r from-slate-950 via-[#131b2e] to-slate-900 text-white p-4 pt-5 flex flex-col gap-2 shrink-0 border-b border-white/10 shadow-md">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-extrabold text-sm leading-tight text-white truncate max-w-[200px] tracking-tight">
                          {selectedChecklistId ? (editorChecklist.title || "Novo Checklist") : "Fila de Auditorias"}
                        </h4>
                        <p className="text-[10px] text-slate-300 font-medium">
                          {selectedChecklistId ? `${editorChecklist.sector} • ${editorChecklist.startTime} - ${editorChecklist.endTime}` : "Tarefas com prioridade por horário"}
                        </p>
                      </div>
                      {!selectedChecklistId ? (
                        pendingActiveChecklists.length > 0 ? (
                          <div className="flex items-center gap-1.5 bg-red-500/20 text-red-400 px-2.5 py-1 rounded-full border border-red-500/30 font-bold text-[10px] animate-pulse">
                            <Bell className="w-3 h-3" />
                            <span>{pendingActiveChecklists.length} Pendente{pendingActiveChecklists.length === 1 ? "" : "s"}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-500/30 font-bold text-[10px]">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>Tudo Concluído!</span>
                          </div>
                        )
                      ) : (
                        <span className="bg-emerald-400/20 px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-wider text-emerald-400 border border-emerald-400/20">
                          Em execução
                        </span>
                      )}
                    </div>

                    {/* Progress Bar (Visible if checklist selected) */}
                    {selectedChecklistId && (
                      <div className="mt-2 space-y-1">
                        <div className="flex justify-between text-[9px] font-bold opacity-80">
                          <span>Progresso de Preenchimento</span>
                          <span>{progressPercent}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-400 transition-all duration-300" style={{ width: `${progressPercent}%` }}></div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Checklist Selector or Checklist Execution */}
                  {!selectedChecklistId ? (
                    <div className="flex-1 p-4 space-y-4 overflow-y-auto preview-scroll bg-slate-50">
                      {/* Pending Notification Banner */}
                      <div className={`border rounded-2xl p-4 shadow-sm space-y-2.5 ${
                        pendingActiveChecklists.length > 0
                          ? "bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200/80"
                          : "bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200/80"
                      }`}>
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-xl text-white flex items-center justify-center font-bold shrink-0 shadow-sm ${
                            pendingActiveChecklists.length > 0 ? "bg-amber-500" : "bg-emerald-600"
                          }`}>
                            {pendingActiveChecklists.length > 0 ? <Bell className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                          </div>
                          <div>
                            <h4 className={`font-extrabold text-xs ${pendingActiveChecklists.length > 0 ? "text-amber-950" : "text-emerald-950"}`}>
                              {pendingActiveChecklists.length > 0 ? "Aviso de Pendências do Turno" : "Turno 100% Concluído!"}
                            </h4>
                            <p className={`text-[11px] leading-tight ${pendingActiveChecklists.length > 0 ? "text-amber-800/90" : "text-emerald-800/90"}`}>
                              {pendingActiveChecklists.length > 0
                                ? `Você tem ${pendingActiveChecklists.length} checklist(s) pendente(s) no seu turno.`
                                : "Parabéns! Todos os checklists foram finalizados e registrados."}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => setIsMobileOccurrenceOpen(true)}
                          className="w-full py-2 px-3 bg-[#131b2e] hover:bg-slate-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all uppercase tracking-wider"
                        >
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                          Reportar Ocorrência Rápida
                        </button>
                      </div>

                      {/* Priority Filter Pills */}
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                        <button
                          onClick={() => setOperatorPriorityFilter("todas")}
                          className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase transition-all whitespace-nowrap ${
                            operatorPriorityFilter === "todas"
                              ? "bg-[#131b2e] text-white shadow-sm"
                              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          Todas ({activeChecklistsList.length})
                        </button>

                        <button
                          onClick={() => setOperatorPriorityFilter("urgente")}
                          className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase transition-all whitespace-nowrap flex items-center gap-1 ${
                            operatorPriorityFilter === "urgente"
                              ? "bg-red-600 text-white shadow-sm"
                              : "bg-white text-red-700 border border-red-200 hover:bg-red-50"
                          }`}
                        >
                          <span>🔥 Urgentes</span>
                          <span>({pendingActiveChecklists.filter(c => c.startTime?.startsWith("08:") || c.title.toLowerCase().includes("abertura")).length})</span>
                        </button>

                        <button
                          onClick={() => setOperatorPriorityFilter("normal")}
                          className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase transition-all whitespace-nowrap flex items-center gap-1 ${
                            operatorPriorityFilter === "normal"
                              ? "bg-indigo-600 text-white shadow-sm"
                              : "bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-50"
                          }`}
                        >
                          <span>🕒 Normais</span>
                          <span>({pendingActiveChecklists.filter(c => !(c.startTime?.startsWith("08:") || c.title.toLowerCase().includes("abertura"))).length})</span>
                        </button>

                        <button
                          onClick={() => setOperatorPriorityFilter("concluidas")}
                          className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase transition-all whitespace-nowrap flex items-center gap-1 ${
                            operatorPriorityFilter === "concluidas"
                              ? "bg-emerald-600 text-white shadow-sm"
                              : "bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50"
                          }`}
                        >
                          <span>✅ Concluídas</span>
                          <span>({completedActiveChecklists.length})</span>
                        </button>
                      </div>

                      {/* Categorized & Prioritized Task List */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fila por Ordem de Prioridade</h4>
                          <span className="text-[10px] font-extrabold text-slate-500 uppercase">Status & Prazos</span>
                        </div>

                        {activeChecklistsList.length === 0 ? (
                          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm text-center space-y-2">
                            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                            <h4 className="font-extrabold text-slate-800 text-xs">Nenhum checklist ativo no momento</h4>
                            <p className="text-[11px] text-slate-400">Novas tarefas atribuídas à sua unidade aparecerão aqui automaticamente.</p>
                          </div>
                        ) : (
                          activeChecklistsList
                            .filter(ch => {
                              const done = isChecklistCompleted(ch);
                              const isUrgent = ch.startTime?.startsWith("08:") || ch.title.toLowerCase().includes("abertura");
                              if (operatorPriorityFilter === "urgente") return isUrgent && !done;
                              if (operatorPriorityFilter === "normal") return !isUrgent && !done;
                              if (operatorPriorityFilter === "concluidas") return done;
                              return true;
                            })
                            .map((ch, idx) => {
                              const done = isChecklistCompleted(ch);
                              const run = checklistRuns.find(r => r.checklistTemplateId === ch.id);
                              const isUrgent = (ch.startTime?.startsWith("08:") || ch.title.toLowerCase().includes("abertura") || idx === 0) && !done;
                              
                              return (
                                <div 
                                  key={ch.id}
                                  className={`rounded-2xl p-4 border shadow-sm transition-all hover:shadow-md ${
                                    done
                                      ? "bg-[#f0fdf4] border-l-4 border-l-emerald-500 border-emerald-300"
                                      : isUrgent
                                      ? "bg-white border-l-4 border-l-red-500 border-slate-200"
                                      : "bg-white border-l-4 border-l-indigo-500 border-slate-200"
                                  }`}
                                >
                                  {/* Card Header Tag */}
                                  <div className="flex items-center justify-between mb-2">
                                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                      done
                                        ? "bg-emerald-100 text-[#006c49] border border-emerald-200 flex items-center gap-1"
                                        : isUrgent
                                        ? "bg-red-50 text-red-600 border border-red-100"
                                        : "bg-indigo-50 text-indigo-700 border border-indigo-100"
                                    }`}>
                                      {done ? "✅ CONCLUÍDO HOJE" : isUrgent ? "🔥 ALTA PRIORIDADE" : "🕒 PRIORIDADE NORMAL"}
                                    </span>

                                    {done ? (
                                      <span className="text-[9px] font-black text-white bg-emerald-600 px-2 py-0.5 rounded-md shadow-sm">
                                        Score: {run?.score ?? 100}%
                                      </span>
                                    ) : (
                                      <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                                        {ch.questions?.length || 0} Perguntas
                                      </span>
                                    )}
                                  </div>

                                  <h4 className={`font-extrabold text-sm ${done ? "text-[#006c49]" : "text-slate-900"}`}>{ch.title}</h4>
                                  <p className="text-[10px] font-semibold text-slate-500 mt-0.5">{ch.sector} • {ch.recurrence}</p>
                                  
                                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-200/60">
                                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-700">
                                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                                      <span>Janela: {ch.startTime} - {ch.endTime}</span>
                                    </div>

                                    {done ? (
                                      <button
                                        onClick={() => {
                                          setSelectedChecklistId(ch.id);
                                          setEditorChecklist({ ...ch, questions: ch.questions.map(q => ({ ...q })) });
                                        }}
                                        className="bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 text-[#006c49] font-black text-[10px] uppercase py-1.5 px-3 rounded-xl transition-all shadow-sm flex items-center gap-1"
                                      >
                                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                        <span>Concluído</span>
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => {
                                          setSelectedChecklistId(ch.id);
                                          setEditorChecklist({ ...ch, questions: ch.questions.map(q => ({ ...q })) });
                                        }}
                                        className="bg-[#131b2e] hover:bg-slate-800 text-white font-extrabold text-[10px] uppercase py-2 px-3.5 rounded-xl transition-all shadow-sm hover:shadow flex items-center gap-1"
                                      >
                                        <span>Iniciar</span>
                                        <Plus className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Mockup Body Questions scrollable */}
                      <div className="flex-1 p-4 space-y-4 overflow-y-auto preview-scroll bg-slate-50">
                        {editorChecklist.questions.length === 0 ? (
                          <div className="text-center py-12 text-slate-400 text-xs italic">
                            Sem perguntas neste checklist. Contate o administrador.
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
                                  {q.title || `Pergunta ${idx + 1}`}
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

                                      <div className="text-[9px] text-slate-500 font-mono space-y-1 bg-white p-2 rounded border border-slate-100 shadow-sm">
                                        <div className="flex justify-between border-b border-slate-50 pb-1">
                                          <span className="font-semibold">Original:</span>
                                          <span className="line-through">{formatSize(q.originalSize)}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-slate-50 pb-1 text-[#006c49]">
                                          <span className="font-bold">Comprimido:</span>
                                          <span className="font-bold">{formatSize(q.compressedSize)}</span>
                                        </div>
                                        {q.reductionPercent && (
                                          <div className="text-emerald-700 font-bold text-center pt-1 flex items-center justify-center gap-1">
                                            <Check className="w-3 h-3" />
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
                                          <span className="text-[10px] font-bold mt-1 uppercase tracking-wider text-slate-500">Anexar Foto</span>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))
                        )}

                        {/* Bloco Obrigatório de Identificação do Executante quando em Equipamento Geral */}
                        {(editorChecklist.executionAuthType || 'shared_device') === 'shared_device' && (
                          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 space-y-2 mt-4 shadow-sm">
                            <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                              <User className="w-4 h-4 text-amber-700 shrink-0" />
                              <span>Identificação do Executante (Equipamento Geral)</span>
                            </div>
                            <p className="text-[10px] text-amber-800 leading-tight">
                              Este tablet é de uso comum. Por favor, informe seu <strong>Nome ou Matrícula/RE</strong> para assinar a execução desta auditoria.
                            </p>
                            <input
                              type="text"
                              value={operatorIdentifierInput}
                              onChange={(e) => setOperatorIdentifierInput(e.target.value)}
                              placeholder="Ex: João Silva (RE: 4092)"
                              className="w-full bg-white border border-amber-300 rounded-lg text-xs py-2 px-3 text-slate-900 font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none placeholder:font-normal placeholder:text-slate-400"
                            />
                          </div>
                        )}
                      </div>

                      {/* Mockup Footer Submit */}
                      <div className="p-4 bg-white border-t border-slate-200 flex gap-2 shrink-0">
                        <button
                          onClick={() => {
                            setSelectedChecklistId(null);
                            setOperatorIdentifierInput("");
                          }}
                          className="flex-1 border border-slate-200 text-slate-600 font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider transition-colors hover:bg-slate-50"
                        >
                          Voltar
                        </button>
                        <button
                          onClick={() => {
                            if ((editorChecklist.executionAuthType || 'shared_device') === 'shared_device' && !operatorIdentifierInput.trim()) {
                              alert("Por favor, informe seu Nome ou Matrícula no campo de Identificação do Executante ao final do questionário.");
                              return;
                            }
                            handleSubmitChecklistExecution();
                            setOperatorIdentifierInput("");
                            setSelectedChecklistId(null);
                          }}
                          disabled={editorChecklist.questions.length === 0}
                          className="flex-1 bg-[#131b2e] hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-slate-900/10"
                        >
                          Enviar
                        </button>
                      </div>
                    </>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] flex flex-col font-sans">
      {/* Onboarding Wizard Modal para Novo Cliente / Google OAuth */}
      {showOnboardingWizard && (
        <OnboardingWizard
          companyName="Bob's - Rede São Paulo"
          onComplete={(data) => {
            setShowOnboardingWizard(false);
            if (data.firstUnitName) {
              setUnits((prev) => [
                ...prev,
                {
                  id: "un-" + (prev.length + 1),
                  name: data.firstUnitName,
                  address: data.firstUnitAddress,
                  status: "active",
                  managerName: "A definir",
                  managerAvatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuDyfX8IQJfUdA4ZFxNthzgW-lf6TQccAXYyrRSNCqqIe4LGUFXxzAcBc7OLO6BtHSR7G58m_KEk3Gxm8tGNRfRlO9Ambje4wcy8BK1vSJkPeaFM1F4t2RVFqv1PUqh3Z1S1L-uO5PqQ_jccM-JUfXHpVwHLZL_pqimtnw7O5tFRuA5SBc_77nkn1_MVLgJ7edF8XK6n2viqf7OF7MltA6lSvAfbvRgRWKRrfYXPqQ8rStH9ErmZZZSdlBjmtJ1bQ8nGuD6KplIi_GI"
                }
              ]);
            }
            if (data.selectedSectors && data.selectedSectors.length > 0) {
              setSectors(data.selectedSectors);
            }
          }}
          onSkip={() => setShowOnboardingWizard(false)}
        />
      )}

      {/* TopAppBar */}
      <header className="bg-white border-b border-slate-200 shadow-sm h-16 flex items-center justify-between px-6 sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <div className="bg-[#131b2e] p-2 rounded-lg text-white">
            <ClipboardCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">CheckRest</h1>
            <p className="text-xs text-slate-500 font-medium">Gestão de Conformidade & Planos de Ação</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {currentUser?.role !== "SAAS_ADMIN" && (
            <button
              onClick={() => setActiveTab("ai")}
              className="hidden md:flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-[#006c49] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-all shadow-md shadow-emerald-700/10"
            >
              <Brain className="w-4 h-4" />
              IA Consultiva
            </button>
          )}
          
          <NotificationsCenter
            notifications={notifications}
            readNotificationIds={readNotificationIds}
            onMarkAsRead={handleMarkAsRead}
            onMarkAllAsRead={handleMarkAllAsRead}
            setActiveTab={setActiveTab}
          />

          {/* Offline / Sync Status Badge */}
          {isSyncing ? (
            <span className="hidden sm:flex items-center gap-1.5 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
              <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Sincronizando...
            </span>
          ) : !isOnline ? (
            <span className="hidden sm:flex items-center gap-1.5 text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              Offline{pendingCount > 0 ? ` — ${pendingCount} pendente${pendingCount > 1 ? "s" : ""}` : ""}
            </span>
          ) : pendingCount > 0 ? (
            <span className="hidden sm:flex items-center gap-1.5 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
              {pendingCount} pendente{pendingCount > 1 ? "s" : ""}
            </span>
          ) : (
            <span className="hidden sm:flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Online
            </span>
          )}

          <div className="h-8 w-px bg-slate-200"></div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-slate-900">{currentUser?.name}</p>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider text-emerald-600">
                {currentUser?.role === "SAAS_ADMIN" && "SaaS Admin"}
                {currentUser?.role === "COMPANY_ADMIN" && "Admin Empresa"}
                {currentUser?.role === "UNIT_MANAGER" && "Gerente de Unidade"}
              </p>
            </div>
            <img
              alt="User Profile"
              className="h-9 w-9 rounded-full object-cover border border-slate-200 shadow-sm"
              src={currentUser?.avatarUrl || "https://lh3.googleusercontent.com/aida-public/AB6AXuBP0wy0mJQlq45ZKUlgz_QNDVftgVzwsr_FR28EwdyCwZqV3VpnEXhRq3BsAhHj4Y6mDx986mvQxkWr2-zK-v9hF8oO-Pmh_kQ2f_vicLRKOYKyTC0yC5kfVzS-WzFabmIZMcJxc2cWUioFVmKmzFcbH0ys_mv0Ezuq-4E8i8q-jsucR6Ad2gV7Z70qKshIQVq6rFoFrVyZhULy96OE0NCxllIXcjVLDubdMaMqGtCYwKneQIw_9p3wjfW_pSrgP2bn6scT834CsCc"}
            />
            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-1"
              title="Sair"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 relative">
        {/* SideNavBar (Desktop) */}
        <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col py-6 gap-2 sticky top-16 h-[calc(100vh-4rem)] z-30">
          <div className="px-6 mb-6">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="w-8 h-8 bg-[#131b2e] rounded flex items-center justify-center text-white font-bold text-sm">
                CR
              </div>
              <div>
                <p className="font-bold text-sm text-slate-800">Central Kitchen</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Unidade Base</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-3 space-y-1 overflow-y-auto preview-scroll">
            {currentUser?.role === "SAAS_ADMIN" ? (
              <>
                <button
                  onClick={() => setActiveTab("dashboard_saas")}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    activeTab === "dashboard_saas"
                      ? "bg-slate-100 text-slate-900 font-bold border-r-4 border-slate-900"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <Activity className="w-5 h-5 text-indigo-600" />
                  Painel SaaS
                </button>
                <button
                  onClick={() => setActiveTab("companies")}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    activeTab === "companies"
                      ? "bg-slate-100 text-slate-900 font-bold border-r-4 border-slate-900"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <Building className="w-5 h-5 text-indigo-600" />
                  Empresas SaaS
                </button>
                <button
                  onClick={() => setActiveTab("licenses")}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    activeTab === "licenses"
                      ? "bg-slate-100 text-slate-900 font-bold border-r-4 border-slate-900"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <Award className="w-5 h-5 text-indigo-600" />
                  Licenças Vendidas
                </button>
                <button
                  onClick={() => setActiveTab("company_admins")}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    activeTab === "company_admins"
                      ? "bg-slate-100 text-slate-900 font-bold border-r-4 border-slate-900"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <User className="w-5 h-5 text-indigo-600" />
                  Admins de Empresa
                </button>
                <button
                  onClick={() => setActiveTab("modules")}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    activeTab === "modules"
                      ? "bg-slate-100 text-slate-900 font-bold border-r-4 border-slate-900"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <Layers className="w-5 h-5 text-indigo-600" />
                  Módulos Liberados
                </button>
                <button
                  onClick={() => setActiveTab("commercial_status")}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    activeTab === "commercial_status"
                      ? "bg-slate-100 text-slate-900 font-bold border-r-4 border-slate-900"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <Clock className="w-5 h-5 text-indigo-600" />
                  Status Comercial
                </button>
                <button
                  onClick={() => setActiveTab("auditlogs")}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    activeTab === "auditlogs"
                      ? "bg-slate-100 text-slate-900 font-bold border-r-4 border-slate-900"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <Shield className="w-5 h-5 text-indigo-600" />
                  Logs de Auditoria
                </button>
                <button
                  onClick={() => setActiveTab("global_settings")}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    activeTab === "global_settings"
                      ? "bg-slate-100 text-slate-900 font-bold border-r-4 border-slate-900"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <Settings className="w-5 h-5 text-indigo-600" />
                  Ajustes Globais
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setActiveTab("dashboard")}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    activeTab === "dashboard"
                      ? "bg-slate-100 text-slate-900 font-bold border-r-4 border-slate-900"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <Activity className="w-5 h-5" />
                  Dashboard
                </button>
                <button
                  onClick={() => setActiveTab("checklists")}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    activeTab === "checklists" || activeTab === "editor"
                      ? "bg-slate-100 text-slate-900 font-bold border-r-4 border-slate-900"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <ClipboardCheck className="w-5 h-5" />
                  Checklists
                </button>
                <button
                  onClick={() => setActiveTab("occurrences")}
                  className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    activeTab === "occurrences"
                      ? "bg-slate-100 text-slate-900 font-bold border-r-4 border-slate-900"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5" />
                    Ocorrências
                  </div>
                  {activeOccurrencesCount > 0 && (
                    <span className="bg-red-500 text-white font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center shrink-0 shadow-sm animate-pulse">
                      {activeOccurrencesCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab("nonconformities")}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    activeTab === "nonconformities"
                      ? "bg-slate-100 text-slate-900 font-bold border-r-4 border-slate-900"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <AlertTriangle className="w-5 h-5" />
                  Não Conformidades
                </button>
                <button
                  onClick={() => setActiveTab("actionplans")}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    activeTab === "actionplans"
                      ? "bg-slate-100 text-slate-900 font-bold border-r-4 border-slate-900"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <Layers className="w-5 h-5" />
                  Planos de Ação
                </button>
                <button
                  onClick={() => setActiveTab("reports")}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    activeTab === "reports"
                      ? "bg-slate-100 text-slate-900 font-bold border-r-4 border-slate-900"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <FileText className="w-5 h-5" />
                  Relatórios
                </button>
                <button
                  onClick={() => setActiveTab("ai")}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    activeTab === "ai"
                      ? "bg-slate-100 text-slate-900 font-bold border-r-4 border-slate-900"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <Brain className="w-5 h-5" />
                  IA Consultiva
                </button>
                {currentUser?.role === "COMPANY_ADMIN" && (
                  <button
                    onClick={() => setActiveTab("cadastros")}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      activeTab === "cadastros"
                        ? "bg-slate-100 text-slate-900 font-bold border-r-4 border-slate-900"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    <Building className="w-5 h-5 text-indigo-600" />
                    Gestão de Cadastro
                  </button>
                )}
                <button
                  onClick={() => setActiveTab("settings")}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    activeTab === "settings"
                      ? "bg-slate-100 text-slate-900 font-bold border-r-4 border-slate-900"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <Settings className="w-5 h-5" />
                  Configurações
                </button>
              </>
            )}
          </nav>

          <div className="px-4 mt-auto border-t border-slate-100 pt-4 space-y-2">
            {currentUser?.role !== "SAAS_ADMIN" && (
              <button
                onClick={handleCreateNewChecklist}
                className="w-full py-2.5 px-4 bg-[#131b2e] hover:bg-slate-800 text-white rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                <PlusCircle className="w-4 h-4" />
                Novo Checklist
              </button>
            )}

            <button className="w-full flex items-center gap-3 px-4 py-2 text-slate-500 hover:text-slate-900 text-xs transition-colors">
              <HelpCircle className="w-4 h-4" />
              Help Center
            </button>
          </div>
        </aside>

        {/* Page Main Content */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-[1600px] mx-auto w-full pb-24 md:pb-8">
          {/* ========================================================================= */}
          {/* VIEW: DASHBOARD                                                           */}
          {/* ========================================================================= */}
          {activeTab === "dashboard" && (
            <Dashboard
              dbConnected={dbConnected}
              currentUser={currentUser}
              selectedUnitFilter={selectedUnitFilter}
              setSelectedUnitFilter={setSelectedUnitFilter}
              selectedPeriodFilter={selectedPeriodFilter}
              setSelectedPeriodFilter={setSelectedPeriodFilter}
              dashboardStats={dashboardStats}
              units={units}
              setActiveTab={setActiveTab}
              setChatInput={setChatInput}
            />
          )}
          {/* ========================================================================= */}
          {/* VIEW: CHECKLISTS                                                          */}
          {/* ========================================================================= */}
          {activeTab === "checklists" && (
            <div className="space-y-8 animate-fadeIn">
              {/* Header and Add Button */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-black text-slate-900">Checklists</h2>
                  <p className="text-slate-500 text-sm mt-1">Gerencie e monitore todos os processos operacionais da unidade.</p>
                </div>
                <button
                  onClick={handleCreateNewChecklist}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-[#131b2e] hover:bg-slate-800 text-white rounded-lg font-bold text-sm shadow-md transition-all md:w-auto w-full"
                >
                  <Plus className="w-5 h-5" />
                  Novo Checklist
                </button>
              </div>

              {/* Filters Bar */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center gap-4 shadow-sm">
                <div className="flex items-center gap-2 border-r border-slate-200 pr-4 overflow-x-auto">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2">Status</span>
                  <button
                    onClick={() => setChecklistStatusFilter("active")}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                      checklistStatusFilter === "active"
                        ? "bg-[#6cf8bb] text-[#00714d]"
                        : "hover:bg-slate-100 text-slate-500"
                    }`}
                  >
                    Ativo
                  </button>
                  <button
                    onClick={() => setChecklistStatusFilter("draft")}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                      checklistStatusFilter === "draft"
                        ? "bg-slate-100 text-slate-600"
                        : "hover:bg-slate-100 text-slate-500"
                    }`}
                  >
                    Rascunho
                  </button>
                  <button
                    onClick={() => setChecklistStatusFilter("archived")}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                      checklistStatusFilter === "archived"
                        ? "bg-red-50 text-red-700"
                        : "hover:bg-slate-100 text-slate-500"
                    }`}
                  >
                    Arquivado
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2">Setor</span>
                  <select
                    value={checklistSectorFilter}
                    onChange={(e) => setChecklistSectorFilter(e.target.value)}
                    className="bg-slate-50 border-none rounded-lg text-xs font-semibold py-1.5 pr-10 cursor-pointer focus:ring-2 focus:ring-slate-900"
                  >
                    <option>Todos os Setores</option>
                    <option>Cozinha</option>
                    <option>Salão</option>
                    <option>Estoque</option>
                    <option>Atendimento</option>
                  </select>
                </div>

                <div className="ml-auto hidden lg:block text-xs font-bold text-slate-400">
                  Mostrando {filteredChecklists.length} checklists
                </div>
              </div>

              {/* Checklist Cards Grid */}
              {filteredChecklists.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-sm">
                  <ClipboardCheck className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <h4 className="font-bold text-slate-800 text-lg">Nenhum checklist encontrado</h4>
                  <p className="text-slate-400 text-sm mt-1">Altere os filtros acima ou crie um novo checklist para começar.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredChecklists.map((ch) => (
                    <div
                      key={ch.id}
                      onClick={() => handleOpenChecklistEditor(ch)}
                      className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all group cursor-pointer flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-4">
                          <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg text-slate-700">
                            {ch.sector.includes("Cozinha") ? (
                              <Store className="w-5 h-5 text-[#006c49]" />
                            ) : ch.sector.includes("Salão") || ch.sector.includes("Atendimento") ? (
                              <User className="w-5 h-5 text-blue-600" />
                            ) : (
                              <Layers className="w-5 h-5 text-purple-600" />
                            )}
                          </div>
                          
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Deseja arquivar o checklist "${ch.title}"?`)) {
                                handleArchiveChecklist(ch.id);
                              }
                            }}
                            className="p-1.5 hover:bg-slate-100 rounded-md text-slate-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <h3 className="text-lg font-bold text-slate-800 group-hover:text-[#006c49] transition-colors">
                          {ch.title}
                        </h3>

                        <div className="flex flex-wrap items-center gap-2 mt-3">
                          <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-extrabold uppercase tracking-wider">
                            {ch.sector}
                          </span>
                          <span className="text-slate-300 text-xs">•</span>
                          <span className="text-slate-500 text-xs font-semibold">{ch.recurrence}</span>
                        </div>
                      </div>

                      <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1.5 ${
                            ch.status === "active"
                              ? "bg-emerald-50 text-[#006c49]"
                              : ch.status === "draft"
                              ? "bg-slate-100 text-slate-600"
                              : "bg-red-50 text-red-700"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              ch.status === "active"
                                ? "bg-emerald-500"
                                : ch.status === "draft"
                                ? "bg-slate-400"
                                : "bg-red-500"
                            }`}></span>
                            {ch.status === "active" ? "Ativo" : ch.status === "draft" ? "Rascunho" : "Arquivado"}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-slate-400 font-mono">v{ch.version}</span>
                      </div>

                      <div className="mt-3 flex items-center gap-1.5 text-slate-400 text-xs font-medium">
                        <Clock className="w-3.5 h-3.5" />
                        Atualizado {ch.lastUpdated}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Template CTA Banner */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-center shadow-sm">
                  <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center text-[#131b2e] mb-4">
                    <PlusCircle className="w-8 h-8" />
                  </div>
                  <h4 className="font-extrabold text-slate-800 text-lg">Explore Modelos Operacionais</h4>
                  <p className="text-slate-400 text-sm max-w-md mt-2">
                    Não comece do zero. Utilize nossos modelos pré-definidos para boas práticas de segurança alimentar, auditorias de vigilância sanitária e gestão de pessoal.
                  </p>
                  <button 
                    onClick={() => {
                      // Import template to AI consultive
                      setActiveTab("ai");
                      setChatInput("Crie um checklist de higiene da cozinha central.");
                    }}
                    className="mt-6 px-6 py-2.5 border-2 border-[#131b2e] text-[#131b2e] font-bold text-xs rounded-lg hover:bg-[#131b2e] hover:text-white transition-all uppercase tracking-wider"
                  >
                    Ver Galeria de Modelos
                  </button>
                </div>

                <div className="lg:col-span-1 bg-gradient-to-br from-[#131b2e] to-slate-900 rounded-xl p-6 text-white flex flex-col justify-between relative overflow-hidden group shadow-md">
                  <div className="z-10">
                    <span className="material-symbols-outlined text-emerald-400 text-3xl mb-4">psychology</span>
                    <h4 className="font-bold text-white text-lg leading-tight">Insight da IA</h4>
                    <p className="text-slate-300 text-xs mt-2 leading-relaxed">
                      &quot;Seu checklist de &apos;Abertura de Cozinha&apos; teve 98% de conformidade esta semana. Considere reduzir a frequência de auditoria manual das bancadas secundárias.&quot;
                    </p>
                  </div>
                  <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl"></div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* VIEW: EDITOR & MOBILE PREVIEW                                             */}
          {/* ========================================================================= */}
          {activeTab === "editor" && (
            <ChecklistEditor
              editorChecklist={editorChecklist}
              selectedChecklistId={selectedChecklistId}
              setEditorChecklist={setEditorChecklist}
              setActiveTab={setActiveTab}
              handleMoveQuestion={handleMoveQuestion}
              handleDeleteQuestion={handleDeleteQuestion}
              handleUpdateQuestion={handleUpdateQuestion}
              handleAddQuestion={handleAddQuestion}
              handleSaveChecklist={handleSaveChecklist}
              compressionLoading={compressionLoading}
              progressPercent={progressPercent}
              handleMobilePhotoUpload={handleMobilePhotoUpload}
              handleSubmitChecklistExecution={handleSubmitChecklistExecution}
              formatSize={formatSize}
              units={units}
              currentUser={currentUser}
              users={users}
              sectors={sectors}
            />
          )}
          {/* ========================================================================= */}
          {/* VIEW: IA CONSULTIVA                                                       */}
          {/* ========================================================================= */}
          {activeTab === "ai" && (
            <AIConsultative
              chatMessages={chatMessages}
              chatInput={chatInput}
              setChatInput={setChatInput}
              chatBottomRef={chatBottomRef}
              handleSendChatMessage={handleSendChatMessage}
              handleConvertTemplate={handleConvertTemplate}
              isAILoading={isAILoading}
            />
          )}
          {/* ========================================================================= */}
          {/* VIEW: SETTINGS                                                            */}
          {/* ========================================================================= */}
          {activeTab === "settings" && (
            <div className="space-y-6 animate-fadeIn">
              {/* Header and Add Unit Button */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-black text-slate-900">Configurações de Unidades</h2>
                  <p className="text-slate-500 text-sm mt-1">Gerencie as unidades e restaurantes do seu grupo corporativo.</p>
                </div>
                {currentUser?.role !== "UNIT_MANAGER" ? (
                  <button
                    onClick={() => setIsAddUnitModalOpen(true)}
                    className="flex items-center justify-center gap-2 px-6 py-2.5 bg-[#131b2e] hover:bg-slate-800 text-white rounded-lg font-bold text-sm shadow-sm transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar Unidade
                  </button>
                ) : (
                  <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                    Apenas admins podem cadastrar filiais
                  </span>
                )}
              </div>

              {/* Units Workspace */}
              <div className="space-y-4">
                {/* Search Bar */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
                  <div className="flex items-center w-full md:w-1/2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus-within:ring-2 focus-within:ring-slate-900">
                    <Filter className="w-4 h-4 text-slate-400 mr-2" />
                    <input
                      type="text"
                      value={searchUnitQuery}
                      onChange={(e) => setSearchUnitQuery(e.target.value)}
                      placeholder="Buscar por nome, endereço ou gerente..."
                      className="w-full bg-transparent border-none focus:ring-0 text-xs placeholder:text-slate-400 p-0"
                    />
                  </div>
                  
                  <div className="text-slate-400 text-xs font-bold uppercase">
                    {filteredUnits.length} unidades
                  </div>
                </div>

                {/* Units Modern Table Grid */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 border-b border-slate-200 bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <div className="col-span-5">Unidade & Endereço</div>
                    <div className="col-span-2">Status</div>
                    <div className="col-span-3">Gerente Responsável</div>
                    <div className="col-span-2 text-right">Ações</div>
                  </div>

                  {filteredUnits.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-sm italic">
                      Nenhuma unidade cadastrada ou correspondente aos termos de busca.
                    </div>
                  ) : (
                    filteredUnits.map((un) => (
                      <div
                        key={un.id}
                        className="grid grid-cols-1 md:grid-cols-12 gap-4 px-6 py-4 border-b border-slate-100 hover:bg-slate-50/50 transition-colors items-center group"
                      >
                        <div className="col-span-5 flex items-start gap-4">
                          <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0">
                            <Store className="w-5 h-5 text-slate-600" />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-800 text-sm leading-tight">{un.name}</h3>
                            <p className="text-xs text-slate-400 mt-1 leading-relaxed">{un.address}</p>
                          </div>
                        </div>

                        <div className="col-span-2">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            un.status === "active"
                              ? "bg-emerald-50 text-[#006c49]"
                              : "bg-slate-100 text-slate-500"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${un.status === "active" ? "bg-emerald-500" : "bg-slate-400"}`}></span>
                            {un.status === "active" ? "Ativo" : "Inativo"}
                          </span>
                        </div>

                        <div className="col-span-3 flex items-center gap-3">
                          <img
                            alt="Gerente avatar"
                            className="w-7 h-7 rounded-full border border-slate-200 object-cover"
                            src={un.managerAvatar}
                          />
                          <span className="text-xs font-semibold text-slate-700">{un.managerName}</span>
                        </div>

                        <div className="col-span-2 flex items-center justify-end gap-1.5 md:opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => alert(`Unidade ${un.name}: ${un.address}`)}
                            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all"
                            title="Visualizar Detalhes"
                          >
                            <Activity className="w-4 h-4" />
                          </button>
                          {currentUser?.role !== "UNIT_MANAGER" && (
                            <button
                              onClick={() => handleToggleUnitStatus(un.id)}
                              className={`p-2 rounded-lg transition-all ${
                                un.status === "active"
                                  ? "text-slate-400 hover:text-red-500 hover:bg-red-50"
                                  : "text-slate-400 hover:text-emerald-500 hover:bg-emerald-50"
                              }`}
                              title={un.status === "active" ? "Desativar Unidade" : "Ativar Unidade"}
                            >
                              {un.status === "active" ? <Trash2 className="w-4 h-4" /> : <Undo className="w-4 h-4" />}
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Add Unit Modal */}
              {isAddUnitModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-fadeIn">
                  <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all">
                    {/* Modal Header */}
                    <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-[#131b2e] to-slate-800 text-white flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white backdrop-blur-sm shadow-inner">
                          <Store className="w-5 h-5 text-indigo-300" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-white text-base tracking-tight">Adicionar Nova Unidade</h3>
                          <p className="text-slate-300 text-xs mt-0.5">Cadastre uma nova loja ou filial no grupo corporativo</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setIsAddUnitModalOpen(false)}
                        className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Modal Body */}
                    <div className="p-6 space-y-5 bg-slate-50/50">
                      {/* Nome da Unidade */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <Store className="w-3.5 h-3.5 text-slate-400" />
                          Nome da Unidade / Filial
                        </label>
                        <input
                          type="text"
                          value={newUnitName}
                          onChange={(e) => setNewUnitName(e.target.value)}
                          className="w-full border border-slate-200 bg-white focus:ring-2 focus:ring-[#131b2e] focus:border-transparent rounded-xl text-xs py-2.5 px-3.5 font-semibold text-slate-800 shadow-sm placeholder:text-slate-400 transition-all"
                          placeholder="Ex: Filial - Pinheiros"
                        />
                      </div>

                      {/* Endereço Completo */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <Building className="w-3.5 h-3.5 text-slate-400" />
                          Endereço Completo
                        </label>
                        <input
                          type="text"
                          value={newUnitAddress}
                          onChange={(e) => setNewUnitAddress(e.target.value)}
                          className="w-full border border-slate-200 bg-white focus:ring-2 focus:ring-[#131b2e] focus:border-transparent rounded-xl text-xs py-2.5 px-3.5 text-slate-800 shadow-sm placeholder:text-slate-400 transition-all"
                          placeholder="Ex: Av. Faria Lima, 2000 - Pinheiros, São Paulo - SP"
                        />
                      </div>

                      {/* Gerente Responsável (Seleção Apenas de Usuários Cadastrados) */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            Gerente Responsável
                          </span>
                          <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100 uppercase tracking-wider">
                            Apenas Cadastrados
                          </span>
                        </label>
                        <select
                          value={newUnitManager}
                          onChange={(e) => setNewUnitManager(e.target.value)}
                          className="w-full border border-slate-200 bg-white focus:ring-2 focus:ring-[#131b2e] focus:border-transparent rounded-xl text-xs py-2.5 px-3.5 font-semibold text-slate-800 shadow-sm cursor-pointer transition-all"
                        >
                          <option value="">Selecione um gerente cadastrado...</option>
                          {users
                            .filter(u => u.role === "UNIT_MANAGER" || u.role === "COMPANY_ADMIN")
                            .map((usr) => (
                              <option key={usr.id} value={usr.name}>
                                {usr.name} ({usr.role === "COMPANY_ADMIN" ? "Admin Empresa" : "Gerente de Unidade"}) - {usr.email}
                              </option>
                            ))}
                        </select>
                        <p className="text-[11px] text-slate-400 leading-tight mt-1">
                          Selecione o responsável pela unidade dentre os gerentes ou administradores previamente cadastrados.
                        </p>
                      </div>
                    </div>

                    {/* Modal Footer */}
                    <div className="px-6 py-4 bg-white border-t border-slate-100 flex items-center justify-end gap-3">
                      <button
                        onClick={() => setIsAddUnitModalOpen(false)}
                        className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition-all uppercase tracking-wider"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleAddUnit}
                        className="px-6 py-2.5 bg-[#131b2e] hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg flex items-center gap-2 uppercase tracking-wider"
                      >
                        <Check className="w-4 h-4" />
                        Salvar Unidade
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* VIEW: GESTÃO DE CADASTRO (Unidades, Setores & Colaboradores)              */}
          {/* ========================================================================= */}
          {activeTab === "cadastros" && (
            <div className="space-y-6 animate-fadeIn">
              {/* Header and Sub-Tab Navigation Bar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-black text-slate-900">Gestão de Cadastro</h2>
                  <p className="text-slate-500 text-sm mt-1">Gerencie as Unidades, Setores e Colaboradores da empresa em um só lugar.</p>
                </div>
                
                {/* Primary Action Button depending on subTab */}
                {cadastroSubTab === "units" && currentUser?.role !== "UNIT_MANAGER" && (
                  <button
                    onClick={() => setIsAddUnitModalOpen(true)}
                    className="flex items-center justify-center gap-2 px-6 py-2.5 bg-[#131b2e] hover:bg-slate-800 text-white rounded-lg font-bold text-sm shadow-sm transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    Nova Unidade
                  </button>
                )}
                {cadastroSubTab === "users" && (
                  <button
                    onClick={() => setIsAddUserModalOpen(true)}
                    className="flex items-center justify-center gap-2 px-6 py-2.5 bg-[#131b2e] hover:bg-slate-800 text-white rounded-lg font-bold text-sm shadow-sm transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    Cadastrar Colaborador
                  </button>
                )}
              </div>

              {/* Sub-tab Pill Navigation */}
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <button
                  onClick={() => setCadastroSubTab("units")}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold transition-all ${
                    cadastroSubTab === "units"
                      ? "bg-[#131b2e] text-white shadow-sm"
                      : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  <Store className="w-4 h-4" />
                  Unidades ({units.length})
                </button>

                <button
                  onClick={() => setCadastroSubTab("sectors")}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold transition-all ${
                    cadastroSubTab === "sectors"
                      ? "bg-[#131b2e] text-white shadow-sm"
                      : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  Setores ({sectors.length})
                </button>

                <button
                  onClick={() => setCadastroSubTab("users")}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold transition-all ${
                    cadastroSubTab === "users"
                      ? "bg-[#131b2e] text-white shadow-sm"
                      : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  <Users className="w-4 h-4" />
                  Colaboradores ({users.length})
                </button>
              </div>

              {/* ==================== SUB-TAB 1: UNIDADES ==================== */}
              {cadastroSubTab === "units" && (
                <div className="space-y-4">
                  {/* Search Bar */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="flex items-center w-full md:w-1/2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus-within:ring-2 focus-within:ring-slate-900">
                      <Filter className="w-4 h-4 text-slate-400 mr-2" />
                      <input
                        type="text"
                        value={searchUnitQuery}
                        onChange={(e) => setSearchUnitQuery(e.target.value)}
                        placeholder="Buscar unidade por nome ou endereço..."
                        className="w-full bg-transparent border-none focus:ring-0 text-xs placeholder:text-slate-400 p-0"
                      />
                    </div>
                    <div className="text-slate-400 text-xs font-bold uppercase">
                      {filteredUnits.length} Unidade(s)
                    </div>
                  </div>

                  {/* Units Table Grid */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 border-b border-slate-200 bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <div className="col-span-5">Unidade & Endereço</div>
                      <div className="col-span-2">Status</div>
                      <div className="col-span-3">Gerente Responsável</div>
                      <div className="col-span-2 text-right">Ações</div>
                    </div>

                    {filteredUnits.length === 0 ? (
                      <div className="py-12 text-center text-slate-400 text-sm italic">
                        Nenhuma unidade cadastrada.
                      </div>
                    ) : (
                      filteredUnits.map((un) => (
                        <div
                          key={un.id}
                          className="grid grid-cols-1 md:grid-cols-12 gap-4 px-6 py-4 border-b border-slate-100 hover:bg-slate-50/50 transition-colors items-center group"
                        >
                          <div className="col-span-5 flex items-start gap-4">
                            <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0">
                              <Store className="w-5 h-5 text-slate-600" />
                            </div>
                            <div>
                              <h3 className="font-bold text-slate-800 text-sm leading-tight">{un.name}</h3>
                              <p className="text-xs text-slate-400 mt-1 leading-relaxed">{un.address}</p>
                            </div>
                          </div>

                          <div className="col-span-2">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              un.status === "active" ? "bg-emerald-50 text-[#006c49]" : "bg-slate-100 text-slate-500"
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${un.status === "active" ? "bg-emerald-500" : "bg-slate-400"}`}></span>
                              {un.status === "active" ? "Ativo" : "Inativo"}
                            </span>
                          </div>

                          <div className="col-span-3 flex items-center gap-3">
                            <span className="text-xs font-semibold text-slate-700">{un.managerName}</span>
                          </div>

                          <div className="col-span-2 flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleToggleUnitStatus(un.id)}
                              className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase border transition-all ${
                                un.status === "active"
                                  ? "border-red-200 text-red-600 bg-red-50 hover:bg-red-100"
                                  : "border-emerald-200 text-emerald-600 bg-emerald-50 hover:bg-emerald-100"
                              }`}
                            >
                              {un.status === "active" ? "Desativar" : "Ativar"}
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* ==================== SUB-TAB 2: SETORES ==================== */}
              {cadastroSubTab === "sectors" && (
                <div className="space-y-6">
                  {/* Form Adicionar Setor */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
                    <h3 className="font-extrabold text-slate-800 text-sm">Adicionar Novo Setor Operacional</h3>
                    <div className="flex flex-col md:flex-row gap-3">
                      <input
                        type="text"
                        value={newSectorName}
                        onChange={(e) => setNewSectorName(e.target.value)}
                        placeholder="Ex: Balcão de Sobremesas, Drive-Thru, Sanitários..."
                        className="flex-1 border-slate-200 focus:ring-[#131b2e] focus:border-[#131b2e] rounded-lg text-xs py-2.5 px-3 text-slate-800"
                      />
                      <button
                        onClick={() => {
                          if (!newSectorName.trim()) {
                            alert("Digite o nome do setor.");
                            return;
                          }
                          if (sectors.includes(newSectorName.trim())) {
                            alert("Este setor já está cadastrado.");
                            return;
                          }
                          setSectors([...sectors, newSectorName.trim()]);
                          setNewSectorName("");
                          alert("Setor cadastrado com sucesso!");
                        }}
                        className="px-6 py-2.5 bg-[#131b2e] hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition-all"
                      >
                        Cadastrar Setor
                      </button>
                    </div>
                  </div>

                  {/* Sectors Grid */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Setores Cadastrados</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {sectors.map((sec, idx) => (
                        <div key={idx} className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
                              <Layers className="w-4 h-4" />
                            </div>
                            <span className="font-extrabold text-slate-800 text-sm">{sec}</span>
                          </div>
                          <button
                            onClick={() => {
                              setSectors(sectors.filter((_, i) => i !== idx));
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                            title="Remover Setor"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ==================== SUB-TAB 3: COLABORADORES ==================== */}
              {cadastroSubTab === "users" && (
                <div className="space-y-4">
                  {/* Filter / Search Bar */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="flex items-center w-full md:w-1/2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus-within:ring-2 focus-within:ring-slate-900">
                      <Filter className="w-4 h-4 text-slate-400 mr-2" />
                      <input
                        type="text"
                        value={searchUserQuery}
                        onChange={(e) => setSearchUserQuery(e.target.value)}
                        placeholder="Buscar por nome ou e-mail..."
                        className="w-full bg-transparent border-none focus:ring-0 text-xs placeholder:text-slate-400 p-0"
                      />
                    </div>
                    
                    <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                      <div className="text-slate-400 text-xs font-bold uppercase">
                        {users.filter(u => 
                          u.name.toLowerCase().includes(searchUserQuery.toLowerCase()) || 
                          u.email.toLowerCase().includes(searchUserQuery.toLowerCase())
                        ).length} Colaboradores
                      </div>
                      
                      <button
                        onClick={() => {
                          setNewUserName("");
                          setNewUserEmail("");
                          setNewUserRole("OPERATOR");
                          setIsAddUserModalOpen(true);
                        }}
                        className="px-4 py-2 bg-[#131b2e] hover:bg-slate-800 text-white rounded-lg text-xs font-extrabold flex items-center gap-2 transition-all shadow-sm shrink-0"
                      >
                        <Plus className="w-4 h-4 text-emerald-400" />
                        <span>Novo Colaborador (Convite Google)</span>
                      </button>
                    </div>
                  </div>

                  {/* Table List */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 border-b border-slate-200 bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <div className="col-span-4">Colaborador</div>
                      <div className="col-span-3">Cargo / Função</div>
                      <div className="col-span-3">Unidade Vinculada</div>
                      <div className="col-span-2 text-right">Ações</div>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {users
                        .filter(u => 
                          u.name.toLowerCase().includes(searchUserQuery.toLowerCase()) || 
                          u.email.toLowerCase().includes(searchUserQuery.toLowerCase())
                        )
                        .map((usr) => {
                          const userUnit = units.find(un => un.id === usr.unitId);
                          return (
                            <div
                              key={usr.id}
                              className="grid grid-cols-1 md:grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-slate-50/50 transition-colors group"
                            >
                              {/* Colaborador */}
                              <div className="col-span-4 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold text-indigo-700 text-xs uppercase">
                                  {usr.name.charAt(0)}
                                </div>
                                <div>
                                  <h4 className="font-extrabold text-slate-800 text-sm leading-tight">{usr.name}</h4>
                                  <p className="text-[10px] font-mono text-slate-400 mt-0.5">{usr.email}</p>
                                </div>
                              </div>

                              {/* Cargo */}
                              <div className="col-span-3">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                                  usr.role === "COMPANY_ADMIN"
                                    ? "bg-purple-100 text-purple-700"
                                    : usr.role === "UNIT_MANAGER"
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-slate-100 text-slate-700"
                                }`}>
                                  {usr.role === "COMPANY_ADMIN"
                                    ? "Admin Empresa"
                                    : usr.role === "UNIT_MANAGER"
                                    ? "Gerente"
                                    : "Operador"}
                                </span>
                              </div>

                              {/* Unidade */}
                              <div className="col-span-3">
                                <span className="text-xs font-semibold text-slate-650">
                                  {userUnit ? userUnit.name : "Global / Todas"}
                                </span>
                              </div>

                              {/* Ações */}
                              <div className="col-span-2 flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleToggleUserStatus(usr.id)}
                                  className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase border transition-all ${
                                    usr.status === "active"
                                      ? "border-red-200 text-red-600 bg-red-50 hover:bg-red-100"
                                      : "border-emerald-200 text-emerald-600 bg-emerald-50 hover:bg-emerald-100"
                                  }`}
                                >
                                  {usr.status === "active" ? "Suspender" : "Ativar"}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              )}

              {/* Modal Adicionar Colaborador (Restrito a Gerente e Operador para Admin Empresa) */}
              {isAddUserModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                  <div className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-fadeIn">
                    <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                      <h3 className="font-bold text-slate-800 text-sm">Adicionar Novo Colaborador</h3>
                      <button
                        onClick={() => setIsAddUserModalOpen(false)}
                        className="text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="p-6 space-y-4">
                      {/* Nome */}
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">Nome Completo</label>
                        <input
                          type="text"
                          value={newUserName}
                          onChange={(e) => setNewUserName(e.target.value)}
                          className="w-full border-slate-200 focus:ring-[#131b2e] focus:border-[#131b2e] rounded-lg text-xs py-2 px-3 text-slate-800 font-semibold"
                          placeholder="Ex: Carlos Oliveira"
                        />
                      </div>

                      {/* E-mail */}
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">E-mail de Acesso</label>
                        <input
                          type="email"
                          value={newUserEmail}
                          onChange={(e) => setNewUserEmail(e.target.value)}
                          className="w-full border-slate-200 focus:ring-[#131b2e] focus:border-[#131b2e] rounded-lg text-xs py-2 px-3 text-slate-800"
                          placeholder="Ex: carlos@restaurante.com"
                        />
                      </div>

                      {/* Cargo */}
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">Cargo / Função</label>
                        <select
                          value={currentUser?.role === "UNIT_MANAGER" ? "OPERATOR" : newUserRole}
                          onChange={(e) => setNewUserRole(e.target.value as Role)}
                          disabled={currentUser?.role === "UNIT_MANAGER"}
                          className="w-full border-slate-200 focus:ring-[#131b2e] focus:border-[#131b2e] rounded-lg text-xs py-2 px-3 text-slate-800 font-semibold cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                          <option value="OPERATOR">Operador (Executa Checklists e Ocorrências)</option>
                          {currentUser?.role !== "UNIT_MANAGER" && (
                            <option value="UNIT_MANAGER">Gerente de Unidade (Visualiza Operação da Unidade)</option>
                          )}
                        </select>
                      </div>

                      {/* Unidade Vinculada */}
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">Unidade de Vínculo</label>
                        <select
                          value={currentUser?.role === "UNIT_MANAGER" ? (currentUser.unitId || "Global") : newUserUnitId}
                          onChange={(e) => setNewUserUnitId(e.target.value)}
                          disabled={currentUser?.role === "UNIT_MANAGER"}
                          className="w-full border-slate-200 focus:ring-[#131b2e] focus:border-[#131b2e] rounded-lg text-xs py-2 px-3 text-slate-800 font-semibold cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                          {currentUser?.role === "UNIT_MANAGER" ? (
                            <option value={currentUser.unitId || "Global"}>
                              {units.find(un => un.id === currentUser.unitId)?.name || "Sua Unidade"}
                            </option>
                          ) : (
                            <>
                              <option value="Global">Global (Todas as Unidades)</option>
                              {units.map(un => (
                                <option key={un.id} value={un.id}>{un.name}</option>
                              ))}
                            </>
                          )}
                        </select>
                      </div>
                    </div>

                    <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                      <button
                        onClick={() => setIsAddUserModalOpen(false)}
                        className="px-4 py-2 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 hover:bg-slate-100 transition-colors uppercase"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleAddCollaborator}
                        className="px-4 py-2 bg-[#131b2e] hover:bg-slate-800 text-white rounded-lg text-[10px] font-bold transition-colors uppercase tracking-wider"
                      >
                        Cadastrar
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* SAAS ADMIN VIEWS                                                          */}
          {/* ========================================================================= */}
          {["dashboard_saas", "companies", "licenses", "company_admins", "modules", "commercial_status", "auditlogs", "global_settings"].includes(activeTab) && (
            <SaaSAdminViews
              activeTab={activeTab}
              companies={companies}
              setCompanies={setCompanies}
              handleAddCompany={handleAddCompany}
              newCompanyName={newCompanyName}
              setNewCompanyName={setNewCompanyName}
              newCompanyCnpj={newCompanyCnpj}
              setNewCompanyCnpj={setNewCompanyCnpj}
              newCompanyPlan={newCompanyPlan}
              setNewCompanyPlan={setNewCompanyPlan}
              handleToggleCompanyStatus={handleToggleCompanyStatus}
              auditLogs={auditLogs}
            />
          )}

          {/* ========================================================================= */}
          {/* OPERATIONAL OCCURRENCES & NON-CONFORMITIES                                */}
          {/* ========================================================================= */}
          {["occurrences", "nonconformities"].includes(activeTab) && (
            <OperationalOccurrences
              activeTab={activeTab}
              occurrences={occurrences}
              nonConformities={nonConformities}
              units={units}
              currentUser={currentUser}
              handleRegisterMobileOccurrence={handleRegisterMobileOccurrence}
              handleUpdateOccurrenceStatus={handleUpdateOccurrenceStatus}
              handleOpenDuplicateModal={handleOpenDuplicateModal}
              mobileOccTitle={mobileOccTitle}
              setMobileOccTitle={setMobileOccTitle}
              mobileOccDescription={mobileOccDescription}
              setMobileOccDescription={setMobileOccDescription}
              mobileOccSeverity={mobileOccSeverity}
              setMobileOccSeverity={setMobileOccSeverity}
              mobileOccSector={mobileOccSector}
              setMobileOccSector={setMobileOccSector}
              mobileOccUnitId={mobileOccUnitId}
              setMobileOccUnitId={setMobileOccUnitId}
              isMobileOccurrenceOpen={isMobileOccurrenceOpen}
              setIsMobileOccurrenceOpen={setIsMobileOccurrenceOpen}
              selectedPeriodFilter={selectedPeriodFilter}
              setSelectedPeriodFilter={setSelectedPeriodFilter}
              selectedSpecificDate={selectedSpecificDate}
              setSelectedSpecificDate={setSelectedSpecificDate}
              selectedStartDate={selectedStartDate}
              setSelectedStartDate={setSelectedStartDate}
              selectedEndDate={selectedEndDate}
              setSelectedEndDate={setSelectedEndDate}
              isDateInPeriod={isDateInPeriod}
            />
          )}

          {/* ========================================================================= */}
          {/* ACTION PLANS                                                              */}
          {/* ========================================================================= */}
          {activeTab === "actionplans" && (
            <ActionPlans
              actionPlans={actionPlans}
              setActionPlans={setActionPlans}
              nonConformities={nonConformities}
              setNonConformities={setNonConformities}
              units={units}
              users={users}
              currentUser={currentUser}
              dbConnected={dbConnected}
            />
          )}

          {/* ========================================================================= */}
          {/* DOCUMENTS & POPS MANAGER                                                  */}
          {/* ========================================================================= */}
          {activeTab === "documents" && (
            <DocumentsManager
              documents={documents}
              setDocuments={setDocuments}
              units={units}
              currentUser={currentUser}
              dbConnected={dbConnected}
            />
          )}

          {/* ========================================================================= */}
          {/* REPORTS MANAGER                                                           */}
          {/* ========================================================================= */}
          {activeTab === "reports" && (
            <ReportsManager
              units={units}
              dbConnected={dbConnected}
              selectedPeriodFilter={selectedPeriodFilter}
              setSelectedPeriodFilter={setSelectedPeriodFilter}
              selectedSpecificDate={selectedSpecificDate}
              setSelectedSpecificDate={setSelectedSpecificDate}
              selectedStartDate={selectedStartDate}
              setSelectedStartDate={setSelectedStartDate}
              selectedEndDate={selectedEndDate}
              setSelectedEndDate={setSelectedEndDate}
              checklists={checklists}
              nonConformities={nonConformities}
              actionPlans={actionPlans}
              occurrences={occurrences}
              currentUser={currentUser}
            />
          )}

      {/* Occurrence Duplication Modal */}
      {isDuplicateModalOpen && occurrenceToDuplicate && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-scaleUp text-xs font-semibold text-slate-600">
            <div className="px-6 py-4 bg-[#131b2e] text-white flex justify-between items-center">
              <h3 className="font-extrabold uppercase tracking-wider text-xs">Duplicar Ocorrência Fechada</h3>
              <button 
                onClick={() => {
                  setIsDuplicateModalOpen(false);
                  setOccurrenceToDuplicate(null);
                }} 
                className="text-white hover:text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-slate-500 leading-relaxed font-medium">
                Crie uma nova ocorrência ativa contendo as mesmas características do setor e severidade da ocorrência fechada.
              </p>
              <div className="space-y-1">
                <label className="text-slate-500">Título do Novo Registro</label>
                <input
                  type="text"
                  value={duplicateTitle}
                  onChange={(e) => setDuplicateTitle(e.target.value)}
                  className="w-full border-slate-200 focus:ring-1 focus:ring-slate-900 rounded-lg text-xs py-2 px-3 text-slate-800"
                />
              </div>
              <div className="space-y-1">
                <label className="text-slate-500">Descrição / Justificativa</label>
                <textarea
                  value={duplicateDescription}
                  onChange={(e) => setDuplicateDescription(e.target.value)}
                  placeholder="Escreva observações sobre a repetição da ocorrência..."
                  rows={3}
                  className="w-full border-slate-200 focus:ring-1 focus:ring-slate-900 rounded-lg text-xs py-2 px-3 text-slate-800 font-medium"
                />
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => {
                  setIsDuplicateModalOpen(false);
                  setOccurrenceToDuplicate(null);
                }}
                className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 font-bold hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleDuplicateOccurrence}
                className="px-4 py-2 bg-[#131b2e] hover:bg-slate-800 text-white rounded-lg font-bold"
              >
                Duplicar Registro
              </button>
            </div>
          </div>
        </div>
      )}
        </main>
      </div>

      {/* BottomNavBar (Mobile Only) */}
      <nav className="fixed bottom-0 left-0 right-0 border-t border-slate-200 md:hidden z-40 bg-white shadow-lg flex justify-around items-center h-16 pb-safe">
        {currentUser?.role === "SAAS_ADMIN" ? (
          <>
            <button
              onClick={() => setActiveTab("dashboard_saas")}
              className={`flex flex-col items-center justify-center py-1 px-3 text-[10px] font-bold transition-all ${
                activeTab === "dashboard_saas" ? "text-indigo-600 scale-105" : "text-slate-400"
              }`}
            >
              <Activity className="w-5 h-5 mb-0.5" />
              Painel SaaS
            </button>
            <button
              onClick={() => setActiveTab("companies")}
              className={`flex flex-col items-center justify-center py-1 px-3 text-[10px] font-bold transition-all ${
                activeTab === "companies" ? "text-indigo-600 scale-105" : "text-slate-400"
              }`}
            >
              <Building className="w-5 h-5 mb-0.5" />
              Empresas
            </button>
            <button
              onClick={() => setActiveTab("global_settings")}
              className={`flex flex-col items-center justify-center py-1 px-3 text-[10px] font-bold transition-all ${
                activeTab === "global_settings" ? "text-indigo-600 scale-105" : "text-slate-400"
              }`}
            >
              <Settings className="w-5 h-5 mb-0.5" />
              Ajustes
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`flex flex-col items-center justify-center py-1 px-3 text-[10px] font-bold transition-all ${
                activeTab === "dashboard" ? "text-[#131b2e] scale-105" : "text-slate-400"
              }`}
            >
              <Activity className="w-5 h-5 mb-0.5" />
              Home
            </button>
            <button
              onClick={() => setActiveTab("checklists")}
              className={`flex flex-col items-center justify-center py-1 px-3 text-[10px] font-bold transition-all ${
                activeTab === "checklists" || activeTab === "editor" ? "text-[#131b2e] scale-105" : "text-slate-400"
              }`}
            >
              <ClipboardCheck className="w-5 h-5 mb-0.5" />
              Executar
            </button>
            <button
              onClick={() => setActiveTab("ai")}
              className={`flex flex-col items-center justify-center py-1 px-3 text-[10px] font-bold transition-all ${
                activeTab === "ai" ? "text-[#131b2e] scale-105" : "text-slate-400"
              }`}
            >
              <Brain className="w-5 h-5 mb-0.5" />
              IA
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`flex flex-col items-center justify-center py-1 px-3 text-[10px] font-bold transition-all ${
                activeTab === "settings" ? "text-[#131b2e] scale-105" : "text-slate-400"
              }`}
            >
              <Settings className="w-5 h-5 mb-0.5" />
              Ajustes
            </button>
          </>
        )}
      </nav>
    </div>
  );
}
