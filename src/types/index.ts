export type QuestionType = 'checkbox' | 'text' | 'photo' | 'number';

export interface Question {
  id: string;
  title: string;
  type: QuestionType;
  value?: string | boolean;
  photoUrl?: string;
  originalSize?: number;
  compressedSize?: number;
  reductionPercent?: string;
  
  // Novos campos para tipo 'number'
  unitMeasure?: string;
  minValue?: number;
  maxValue?: number;
  idealValue?: number;
  generateOccurrenceOnFailure?: boolean;
  requiresObservationOnFailure?: boolean;
  requiresPhotoOnFailure?: boolean;
  failureSeverity?: string;
  observation?: string;
}

export interface Checklist {
  id: string;
  title: string;
  sector: string;
  recurrence: string;
  activeDays: string[]; // ['Dom', 'Seg', etc.]
  startTime: string;
  endTime: string;
  responsible: string;
  version: string;
  status: 'active' | 'draft' | 'archived';
  lastUpdated: string;
  executionAuthType?: 'individual' | 'shared_device';
  questions: Question[];
}

export interface Unit {
  id: string;
  name: string;
  address: string;
  status: 'active' | 'inactive';
  managerName: string;
  managerAvatar: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  checklistTemplate?: {
    title: string;
    sector: string;
    questions: { title: string; type: QuestionType }[];
  };
}

export type Role = 'SAAS_ADMIN' | 'RESELLER_ADMIN' | 'COMPANY_ADMIN' | 'UNIT_MANAGER' | 'OPERATOR';

export interface User {
  id: string;
  companyId: string | null;
  unitId: string | null;
  name: string;
  email: string;
  role: Role;
  status: 'active' | 'inactive';
  mustChangePassword?: boolean;
  avatarUrl?: string;
}

export interface Company {
  id: string;
  name: string;
  cnpj: string;
  plan: 'Basic' | 'Pro' | 'Enterprise' | string;
  status: 'active' | 'inactive';
  parentCompanyId?: string | null;
  maxLicenses?: number;
  adminEmail?: string | null;
  adminName?: string | null;
  isReseller?: boolean;
  subCompanies?: Company[];
  createdAt?: string;
  updatedAt?: string;
}

export interface AccountInvite {
  id: string;
  email: string;
  role: Role;
  companyId?: string | null;
  unitId?: string | null;
  token: string;
  expiresAt: string | Date;
  used: boolean;
  createdAt?: string | Date;
  company?: { name: string } | null;
}

export interface NonConformity {
  id: string;
  companyId?: string | null;
  unitId?: string | null;
  title: string;
  description?: string | null;
  severity: string;
  status: string;
  createdAt?: string | Date;
  unit?: { name: string } | null;
  run?: { template: { title: string; sector: string } } | null;
  answer?: { question: { questionText: string } } | null;
  actionPlans?: ActionPlan[] | null;
  createdBy?: string | null;
}

export interface ActionPlan {
  id: string;
  companyId?: string | null;
  unitId?: string | null;
  nonConformityId?: string | null;
  responsibleUserId?: string | null;
  actionDescription: string;
  dueDate: string | Date;
  status: string;
  resolutionEvidenceUrl?: string | null;
  closedAt?: string | Date | null;
  createdAt?: string | Date | null;
  unit?: { name: string } | null;
  nonConformity?: { title: string } | null;
  responsibleUser?: { name: string } | null;
}

export interface ChecklistAnswer {
  id: string;
  checklistRunId: string;
  questionId: string;
  answerValue: string | null;
  observation?: string | null;
  isNonConform: boolean;
  question?: {
    id: string;
    questionText: string;
    questionType: string;
  } | null;
}

export interface ChecklistRun {
  id: string;
  checklistTemplateId: string;
  companyId: string;
  unitId: string;
  assignedTo: string | null;
  status: string;
  scheduledAt?: string | Date | null;
  startedAt?: string | Date | null;
  finishedAt: string | Date;
  score: number;
  performedByUserId?: string | null;
  operatorIdentifier?: string | null;
  template?: { title: string; sector: string } | null;
  unit?: { name: string } | null;
  answers?: ChecklistAnswer[] | null;
}

export interface AuditLog {
  id: string;
  companyId: string | null;
  userId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  oldValue: string | null;
  newValue: string | null;
  ipAddress: string | null;
  createdAt: string | Date;
  user?: { name: string; email: string } | null;
  company?: { name: string } | null;
}

export interface Occurrence {
  id: string;
  companyId: string;
  unitId: string;
  checklistRunId?: string | null;
  checklistAnswerId?: string | null;
  title: string;
  description: string | null;
  type?: string; // 'manual' | 'automatic'
  sector: string;
  severity: string; // 'low', 'medium', 'high', 'critical'
  status: string; // 'open', 'in_progress', 'waiting_validation', 'resolved', 'cancelled'
  createdBy: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  resolvedAt?: string | Date | null;
  resolvedBy?: string | null;
  closedAt?: string | Date | null;
  closedBy?: string | null;
  duplicatedFromOccurrenceId?: string | null;
  isLocked?: boolean;
  unit?: { name: string } | null;
}

export interface CompanyDocument {
  id: string;
  companyId: string;
  unitId: string | null;
  title: string;
  description: string | null;
  category: string;
  fileUrl: string;
  version: string;
  expirationDate: string | Date | null;
  status: string; // 'active', 'expired', etc.
  createdAt: string | Date;
  updatedAt: string | Date;
  unit?: { name: string } | null;
}

// ───────────────────────────────────────────────
// IA Consultiva — Contexto e Resposta
// ───────────────────────────────────────────────

/** Snapshot dos dados operacionais enviado ao Gemini como contexto. */
export interface AIContext {
  /** Perfil e empresa do usuário logado */
  user: {
    name: string;
    role: string;
    companyId: string | null;
    unitId: string | null;
  };
  /** Lista resumida de unidades visíveis ao usuário */
  units: {
    id: string;
    name: string;
    status: string;
    managerName: string;
  }[];
  /** Não conformidades abertas/em tratamento */
  nonConformities: {
    id: string;
    title: string;
    severity: string;
    status: string;
    unitName: string;
    createdAt: string;
  }[];
  /** Planos de ação pendentes/em atraso */
  actionPlans: {
    id: string;
    actionDescription: string;
    status: string;
    dueDate: string;
    unitName: string;
    responsibleName: string;
  }[];
  /** Ocorrências operacionais recentes */
  occurrences: {
    id: string;
    title: string;
    sector: string;
    severity: string;
    status: string;
    unitName: string;
    createdAt: string;
  }[];
  /** Resumo dos checklists ativos */
  checklists: {
    id: string;
    title: string;
    sector: string;
    status: string;
    recurrence: string;
  }[];
  /** Métricas do dashboard (score, execuções, ranking) */
  dashboardStats?: {
    completed: number;
    delayed: number;
    openNonConforms: number;
    pendingActionPlans: number;
    avgScore?: number;
    operatorRanking?: { name: string; score: number }[];
  };
  /** Data/hora atual para contextualização temporal */
  currentDateTime: string;
}

/** Resposta estruturada retornada pela IA. */
export interface AIResponse {
  /** Texto principal da resposta */
  text: string;
  /** Template de checklist gerado, se a pergunta solicitar criação */
  checklistTemplate?: {
    title: string;
    sector: string;
    questions: { title: string; type: QuestionType }[];
  };
  /** Fonte/período dos dados analisados (para transparência) */
  dataSource: string;
  /** Indica se a resposta veio de fallback (sem API) */
  isFallback?: boolean;
}
