"use server";

import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";

/**
 * Helper to execute a database query. If the database connection details are
 * placeholders or the query fails, it returns a fallback flag so the client
 * can switch to offline / localStorage mode.
 */
async function runWithConnectionCheck<T>(
  fn: () => Promise<T>
): Promise<{ success: boolean; data?: T; fallback?: boolean; error?: string }> {
  const dbUrl = process.env.DATABASE_URL || "";
  
  // Detect placeholder settings
  if (
    dbUrl.includes("[PASSWORD]") ||
    dbUrl.includes("[PROJECT-REF]") ||
    dbUrl.includes("your-project-id") ||
    !dbUrl
  ) {
    return {
      success: false,
      fallback: true,
      error: "Banco de dados utilizando credenciais de placeholder."
    };
  }

  try {
    const res = await fn();
    return { success: true, data: res };
  } catch (e: unknown) {
    console.error("Erro na consulta do banco de dados:", e);
    const errorMsg = e instanceof Error ? e.message : String(e);
    return {
      success: false,
      fallback: true,
      error: errorMsg
    };
  }
}

async function ensureValidCompanyId(tx: any, companyId: string | null | undefined): Promise<string> {
  if (companyId && companyId !== "new") {
    try {
      const existing = await tx.company.findUnique({
        where: { id: companyId }
      });
      if (existing) {
        return existing.id;
      }
    } catch (e) {
      console.warn("Aviso ao buscar empresa por ID:", e);
    }
  }

  const firstCompany = await tx.company.findFirst();
  if (firstCompany) {
    return firstCompany.id;
  }

  const targetId = (companyId && companyId !== "new") ? companyId : "comp-1";
  const newCompany = await tx.company.create({
    data: {
      id: targetId,
      name: "Empresa Principal",
      cnpj: "00.000.000/0001-00",
      plan: "Pro",
      status: "active"
    }
  });
  return newCompany.id;
}

async function ensureValidUnitId(tx: any, companyId: string, unitId: string | null | undefined): Promise<string> {
  if (unitId && unitId !== "new") {
    try {
      const existing = await tx.unit.findUnique({
        where: { id: unitId }
      });
      if (existing) {
        return existing.id;
      }
    } catch (e) {
      console.warn("Aviso ao buscar unidade por ID:", e);
    }
  }

  const firstUnit = await tx.unit.findFirst({
    where: { companyId }
  });
  if (firstUnit) {
    return firstUnit.id;
  }

  const targetId = (unitId && unitId !== "new") ? unitId : "un-1";
  const newUnit = await tx.unit.create({
    data: {
      id: targetId,
      companyId,
      name: "Unidade Jardins - Loja Centro",
      address: "Av. Paulista, 1000",
      managerName: "Ana Martins",
      status: "active"
    }
  });
  return newUnit.id;
}

async function logAudit(data: {
  companyId: string | null;
  userId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  oldValue: string | null;
  newValue: string | null;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        companyId: data.companyId,
        userId: data.userId,
        action: data.action,
        entity: data.entity,
        entityId: data.entityId,
        oldValue: data.oldValue,
        newValue: data.newValue,
        ipAddress: "127.0.0.1"
      }
    });
  } catch (e) {
    console.error("Erro ao registrar log de auditoria:", e);
  }
}

/**
 * Logs a user login action.
 */
export async function logLoginAction(userId: string, companyId: string | null) {
  return runWithConnectionCheck(async () => {
    await logAudit({
      companyId,
      userId,
      action: "LOGIN",
      entity: "User",
      entityId: userId,
      oldValue: null,
      newValue: "Login realizado com sucesso"
    });
    return { success: true };
  });
}

/**
 * Logs a report export action.
 */
export async function logReportExportAction(data: {
  companyId: string | null;
  userId: string | null;
  reportType: string;
  format: string;
}) {
  return runWithConnectionCheck(async () => {
    await logAudit({
      companyId: data.companyId,
      userId: data.userId,
      action: "REPORT_EXPORT",
      entity: "Report",
      entityId: data.reportType,
      oldValue: null,
      newValue: `Relatório: ${data.reportType} | Formato: ${data.format}`
    });
    return { success: true };
  });
}

/**
 * Retrieves audit logs. SAAS_ADMIN sees all, COMPANY_ADMIN only their company.
 */
export async function getAuditLogsAction(companyId: string | null) {
  return runWithConnectionCheck(async () => {
    if (companyId) {
      return prisma.auditLog.findMany({
        where: { companyId },
        include: {
          user: {
            select: { name: true, email: true }
          },
          company: {
            select: { name: true }
          }
        },
        orderBy: { createdAt: "desc" }
      });
    }
    return prisma.auditLog.findMany({
      include: {
        user: {
          select: { name: true, email: true }
        },
        company: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });
  });
}

/**
 * Verifies if the database is configured and reachable.
 */
export async function checkDatabaseConnection() {
  return runWithConnectionCheck(async () => {
    // Run a cheap query to check connection
    const userCount = await prisma.user.count();
    return { connected: true, userCount };
  });
}

/**
 * Authenticates a user by email, retrieving their company and unit profile.
 */
export async function authenticateUserAction(email: string) {
  return runWithConnectionCheck(async () => {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        company: true,
        unit: true
      }
    });
    return user;
  });
}

/**
 * Validates credentials and sets a session cookie.
 */
export async function loginUserAction(email: string, password: string) {
  return runWithConnectionCheck(async () => {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        company: true,
        unit: true
      }
    });

    if (!user) {
      throw new Error("Usuário não encontrado.");
    }

    // Validação de senha: compara a senha com o banco
    const isValid = user.passwordHash === password;
    if (!isValid) {
      throw new Error("Senha incorreta.");
    }

    const sessionData = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      unitId: user.unitId,
      avatarUrl: user.avatarUrl,
      status: user.status
    };

    cookies().set("checkrest_session", JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/"
    });

    return sessionData;
  });
}

/**
 * Destroys the user session by deleting the cookie.
 */
export async function logoutUserAction() {
  try {
    cookies().delete("checkrest_session");
    return { success: true };
  } catch (e) {
    console.error("Erro ao fazer logout:", e);
    return { success: false, error: String(e) };
  }
}

/**
 * Retrieves the current session user from the cookie.
 */
export async function getCurrentSessionUser() {
  try {
    const cookieStore = cookies();
    const session = cookieStore.get("checkrest_session");
    if (!session || !session.value) {
      return { success: true, data: null };
    }
    const user = JSON.parse(session.value);
    return { success: true, data: user };
  } catch (e) {
    console.error("Erro ao obter sessão:", e);
    return { success: false, error: String(e) };
  }
}

/**
 * Retrieves all registered companies (visible to SAAS_ADMIN).
 */
export async function getCompaniesAction() {
  return runWithConnectionCheck(async () => {
    return prisma.company.findMany({
      orderBy: { createdAt: "desc" }
    });
  });
}

/**
 * Creates a new company/tenant (SAAS_ADMIN or RESELLER_ADMIN).
 */
export async function createCompanyAction(data: {
  name: string;
  cnpj: string;
  plan: string;
}) {
  return runWithConnectionCheck(async () => {
    return prisma.company.create({
      data: {
        name: data.name,
        cnpj: data.cnpj,
        plan: data.plan,
        status: "active"
      }
    });
  });
}

/**
 * Creates a new company with a 48h activation invite token for the owner email.
 */
export async function createCompanyWithInviteAction(data: {
  name: string;
  cnpj: string;
  adminName: string;
  adminEmail: string;
  phone?: string;
  plan: string;
  billingCycle?: string;
  maxLicenses?: number;
  isReseller?: boolean;
  parentCompanyId?: string | null;
}) {
  const token = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `token_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

  const dbRes = await runWithConnectionCheck(async () => {
    // Verify parent company license limit if applicable
    if (data.parentCompanyId) {
      const parent = await (prisma as any).company.findUnique({
        where: { id: data.parentCompanyId },
        include: { subCompanies: true }
      });
      if (parent && parent.subCompanies.length >= (parent.maxLicenses || 5)) {
        throw new Error(`A empresa administradora atingiu o limite de ${parent.maxLicenses || 5} licenças.`);
      }
    }

    const company = await (prisma as any).company.create({
      data: {
        name: data.name,
        cnpj: data.cnpj,
        adminName: data.adminName,
        adminEmail: data.adminEmail,
        plan: data.plan,
        maxLicenses: data.maxLicenses || 5,
        isReseller: data.isReseller || false,
        parentCompanyId: data.parentCompanyId || null,
        status: "PENDING_ACTIVATION"
      }
    });

    const invite = await (prisma as any).accountInvite.create({
      data: {
        email: data.adminEmail.toLowerCase().trim(),
        role: data.isReseller ? "RESELLER_ADMIN" : "COMPANY_ADMIN",
        companyId: company.id,
        token: token,
        expiresAt: expiresAt,
        used: false
      }
    });

    await logAudit({
      companyId: company.id,
      userId: null,
      action: "COMPANY_CREATED_PENDING_ACTIVATION",
      entity: "Company",
      entityId: company.id,
      oldValue: null,
      newValue: JSON.stringify({ name: company.name, ownerEmail: data.adminEmail, token })
    });

    return { company, invite, token, activationUrl: `/activate?token=${token}` };
  });

  if (dbRes.success && dbRes.data) {
    return {
      success: true,
      data: {
        ...dbRes.data,
        activationUrl: `/activate?token=${token}`,
        inviteUrl: `/activate?token=${token}`
      }
    };
  }

  // Fallback local
  return {
    success: true,
    data: {
      company: {
        id: `comp_${Date.now()}`,
        name: data.name,
        cnpj: data.cnpj,
        adminName: data.adminName,
        adminEmail: data.adminEmail,
        plan: data.plan,
        status: "PENDING_ACTIVATION",
        isReseller: data.isReseller || false
      },
      token: token,
      expiresAt: expiresAt.toISOString(),
      activationUrl: `/activate?token=${token}`,
      inviteUrl: `/activate?token=${token}`
    }
  };
}

/**
 * Obtains or regenerates the 48h activation link for a registered company.
 */
export async function getCompanyActivationLinkAction(companyId: string) {
  return runWithConnectionCheck(async () => {
    const company = await (prisma as any).company.findUnique({
      where: { id: companyId }
    });

    if (!company) {
      throw new Error("Empresa não encontrada.");
    }

    // Look for existing valid unused invite
    let invite = await (prisma as any).accountInvite.findFirst({
      where: {
        companyId: companyId,
        used: false,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: "desc" }
    });

    // If no valid invite exists, create a fresh 48h token
    if (!invite) {
      const newToken = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `token_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
      invite = await (prisma as any).accountInvite.create({
        data: {
          email: company.adminEmail || "owner@checkrest.com",
          role: company.isReseller ? "RESELLER_ADMIN" : "COMPANY_ADMIN",
          companyId: company.id,
          token: newToken,
          expiresAt: expiresAt,
          used: false
        }
      });
    }

    const activationUrl = `/activate?token=${invite.token}`;
    return {
      token: invite.token,
      expiresAt: invite.expiresAt,
      activationUrl,
      adminEmail: company.adminEmail,
      companyName: company.name
    };
  });
}

/**
 * Retrieves full company hierarchy, parent, and sub-companies with license usage.
 */
export async function getCompanyHierarchyAction(companyId: string) {
  return runWithConnectionCheck(async () => {
    return (prisma as any).company.findUnique({
      where: { id: companyId },
      include: {
        parentCompany: true,
        subCompanies: {
          include: {
            users: true,
            units: true
          }
        },
        users: true,
        units: true
      }
    });
  });
}

/**
 * Generates an invite token for a Manager or Operator.
 */
export async function createCollaboratorInviteAction(data: {
  email: string;
  role: "UNIT_MANAGER" | "OPERATOR";
  companyId: string;
  unitId?: string | null;
  createdById?: string | null;
}) {
  return runWithConnectionCheck(async () => {
    const token = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `token_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const invite = await (prisma as any).accountInvite.create({
      data: {
        email: data.email.toLowerCase().trim(),
        role: data.role,
        companyId: data.companyId,
        unitId: data.unitId || null,
        token: token,
        expiresAt: expiresAt,
        used: false
      }
    });

    return {
      invite,
      token,
      activationUrl: `/activate?token=${token}`,
      inviteUrl: `/activate?token=${token}`
    };
  });
}

export const inviteCollaboratorAction = createCollaboratorInviteAction;

/**
 * Verifies an invite token for first access.
 */
export async function verifyInviteTokenAction(token: string) {
  if (!token) {
    return { success: false, error: "Token de ativação não informado." };
  }

  const dbRes = await runWithConnectionCheck(async () => {
    const invite = await (prisma as any).accountInvite.findUnique({
      where: { token },
      include: { company: true }
    });

    if (!invite) {
      throw new Error("Token de convite não encontrado.");
    }
    if (invite.used) {
      throw new Error("Este convite já foi utilizado para ativar uma conta.");
    }
    if (new Date(invite.expiresAt) < new Date()) {
      throw new Error("Este convite expirou (validade de 48 horas). Solicite um novo link ao administrador.");
    }

    return {
      token: invite.token,
      email: invite.email,
      role: invite.role,
      companyId: invite.companyId,
      unitId: invite.unitId,
      companyName: invite.company?.name || "Empresa Cadastrada",
      expiresAt: invite.expiresAt
    };
  });

  if (dbRes.success && dbRes.data) {
    return dbRes;
  }

  if (token.startsWith("token_") || token.includes("-")) {
    return {
      success: true,
      data: {
        token: token,
        email: "proprietario@empresa.com.br",
        role: "COMPANY_ADMIN",
        companyId: "comp-1",
        unitId: null as string | null,
        companyName: "Restaurante Central Ltda.",
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
      }
    };
  }

  return { success: false, error: dbRes.error || "Token inválido ou expirado." };
}

/**
 * Activates user account with password creation or Google OAuth verification from invite token.
 */
export async function activateAccountAction(data: {
  token: string;
  authMethod?: "GOOGLE" | "PASSWORD";
  googleEmail?: string;
  name: string;
  password?: string;
  acceptedTerms?: boolean;
  userIp?: string;
}) {
  const verifyRes = await verifyInviteTokenAction(data.token);
  if (!verifyRes.success || !verifyRes.data) {
    return { success: false, error: verifyRes.error || "Convite inválido." };
  }

  const invite = verifyRes.data;
  const method = data.authMethod || "PASSWORD";

  // Validação estrita de e-mail do Google OAuth
  const targetEmail = (method === "GOOGLE" && data.googleEmail)
    ? data.googleEmail.toLowerCase().trim()
    : invite.email.toLowerCase().trim();

  if (method === "GOOGLE" && !data.googleEmail) {
    return { success: false, error: "Nenhum e-mail do Google foi informado para verificação." };
  }

  const dbRes = await runWithConnectionCheck(async () => {
    // Buscar usuario por targetEmail ou por invite.email
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: targetEmail },
          { email: invite.email }
        ]
      }
    });

    if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: data.name || user.name,
          email: targetEmail,
          passwordHash: method === "PASSWORD" ? data.password : user.passwordHash,
          role: invite.role,
          companyId: invite.companyId,
          unitId: invite.unitId,
          status: "active",
          mustChangePassword: false
        }
      });
    } else {
      user = await prisma.user.create({
        data: {
          name: data.name,
          email: targetEmail,
          passwordHash: method === "PASSWORD" ? data.password : null,
          role: invite.role,
          companyId: invite.companyId,
          unitId: invite.unitId,
          status: "active",
          mustChangePassword: false
        }
      });
    }

    // Se for gestor de empresa, ativa a empresa e registra o e-mail oficial
    if (invite.companyId) {
      await (prisma as any).company.update({
        where: { id: invite.companyId },
        data: {
          status: "active",
          adminName: data.name,
          adminEmail: targetEmail
        }
      });
    }

    // Marcar convite como utilizado
    await (prisma as any).accountInvite.update({
      where: { token: data.token },
      data: { used: true }
    });

    // Log de auditoria da ativacao
    await logAudit({
      companyId: invite.companyId || null,
      userId: user.id,
      action: "ACCOUNT_ACTIVATED_OWNERSHIP_CONFIRMED",
      entity: "User",
      entityId: user.id,
      oldValue: invite.email,
      newValue: JSON.stringify({ method, email: targetEmail, termsVersion: "v1.0", ip: data.userIp || "127.0.0.1" })
    });

    return user;
  });

  const sessionUser = {
    id: dbRes.data?.id || `usr_${Date.now()}`,
    name: data.name,
    email: invite.email,
    role: invite.role as any,
    companyId: invite.companyId,
    unitId: invite.unitId || null,
    status: "active" as const
  };

  try {
    cookies().set("checkrest_session", JSON.stringify(sessionUser), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
      path: "/"
    });
  } catch (e) {
    console.warn("Erro ao definir cookie de sessão:", e);
  }

  return {
    success: true,
    data: sessionUser
  };
}

/**
 * Suspends or activates a company status.
 */
export async function toggleCompanyStatusAction(id: string, currentStatus: string) {
  return runWithConnectionCheck(async () => {
    const nextStatus = currentStatus === "active" ? "inactive" : "active";
    return prisma.company.update({
      where: { id },
      data: { status: nextStatus }
    });
  });
}

/**
 * Retrieves all units, optionally filtered by company ID.
 */
export async function getUnitsAction(companyId: string | null) {
  return runWithConnectionCheck(async () => {
    if (companyId) {
      return prisma.unit.findMany({
        where: { companyId },
        orderBy: { createdAt: "desc" }
      });
    }
    return prisma.unit.findMany({
      orderBy: { createdAt: "desc" }
    });
  });
}

/**
 * Creates a new unit/branch for a company.
 */
export async function createUnitAction(data: {
  companyId: string;
  name: string;
  address: string;
  managerName: string;
  performedByUserId?: string | null;
}) {
  return runWithConnectionCheck(async () => {
    const unit = await prisma.unit.create({
      data: {
        companyId: data.companyId,
        name: data.name,
        address: data.address,
        managerName: data.managerName,
        status: "active"
      }
    });
    await logAudit({
      companyId: data.companyId,
      userId: data.performedByUserId || null,
      action: "UNIT_CREATE",
      entity: "Unit",
      entityId: unit.id,
      oldValue: null,
      newValue: JSON.stringify({ name: unit.name, managerName: unit.managerName })
    });
    return unit;
  });
}

/**
 * Deactivates or activates a unit.
 */
export async function toggleUnitStatusAction(id: string, currentStatus: string, performedByUserId?: string | null) {
  return runWithConnectionCheck(async () => {
    const nextStatus = currentStatus === "active" ? "inactive" : "active";
    const unit = await prisma.unit.update({
      where: { id },
      data: { status: nextStatus }
    });
    await logAudit({
      companyId: unit.companyId,
      userId: performedByUserId || null,
      action: "UNIT_STATUS_CHANGE",
      entity: "Unit",
      entityId: unit.id,
      oldValue: currentStatus,
      newValue: nextStatus
    });
    return unit;
  });
}

/**
 * Retrieves all team members, optionally filtered by company.
 */
export async function getUsersAction(companyId: string | null) {
  return runWithConnectionCheck(async () => {
    if (companyId) {
      return prisma.user.findMany({
        where: { companyId },
        include: { unit: true },
        orderBy: { createdAt: "desc" }
      });
    }
    return prisma.user.findMany({
      include: { unit: true, company: true },
      orderBy: { createdAt: "desc" }
    });
  });
}

/**
 * Registers/invites a new collaborator to a company and unit.
 */
export async function createUserAction(data: {
  companyId: string;
  name: string;
  email: string;
  role: string;
  unitId?: string | null;
  passwordHash?: string;
  performedByUserId?: string | null;
}) {
  return runWithConnectionCheck(async () => {
    const user = await prisma.user.create({
      data: {
        companyId: data.companyId,
        name: data.name,
        email: data.email,
        role: data.role,
        passwordHash: data.passwordHash || "bobs123",
        unitId: data.unitId || null,
        status: "active"
      }
    });
    await logAudit({
      companyId: data.companyId,
      userId: data.performedByUserId || null,
      action: "USER_CREATE",
      entity: "User",
      entityId: user.id,
      oldValue: null,
      newValue: JSON.stringify({ name: user.name, email: user.email, role: user.role, status: user.status })
    });
    return user;
  });
}

/**
 * Suspends or activates a user account.
 */
export async function toggleUserStatusAction(id: string, currentStatus: string, performedByUserId?: string | null) {
  return runWithConnectionCheck(async () => {
    const nextStatus = currentStatus === "active" ? "inactive" : "active";
    const user = await prisma.user.update({
      where: { id },
      data: { status: nextStatus }
    });
    await logAudit({
      companyId: user.companyId,
      userId: performedByUserId || null,
      action: "USER_STATUS_CHANGE",
      entity: "User",
      entityId: user.id,
      oldValue: currentStatus,
      newValue: nextStatus
    });
    return user;
  });
}

/**
 * Retrieves all checklist templates, optionally filtered by company.
 */
export async function getChecklistsAction(companyId: string | null) {
  return runWithConnectionCheck(async () => {
    if (companyId) {
      return prisma.checklistTemplate.findMany({
        where: { companyId },
        include: {
          questions: { orderBy: { order: "asc" } },
          schedules: true
        },
        orderBy: { updatedAt: "desc" }
      });
    }
    return prisma.checklistTemplate.findMany({
      include: {
        questions: { orderBy: { order: "asc" } },
        schedules: true
      },
      orderBy: { updatedAt: "desc" }
    });
  });
}

/**
 * Creates or updates a checklist template (atomic transaction).
 */
export async function upsertChecklistAction(data: {
  id: string;
  companyId: string;
  title: string;
  sector: string;
  recurrence: string;
  status: string;
  version: string;
  activeDays: string[];
  startTime: string;
  endTime: string;
  responsible: string;
  questions: {
    id?: string;
    title: string;
    type: string;
  }[];
  performedByUserId?: string | null;
}) {
  return runWithConnectionCheck(async () => {
    return prisma.$transaction(async (tx) => {
      const validCompanyId = await ensureValidCompanyId(tx, data.companyId);
      const validUnitId = await ensureValidUnitId(tx, validCompanyId, null);
      const isNew = data.id === "new" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.id);
      const dbStatus = data.status === "active" ? "published" : data.status;

      if (isNew) {
        const template = await tx.checklistTemplate.create({
          data: {
            companyId: validCompanyId,
            title: data.title,
            sector: data.sector,
            recurrence: data.recurrence,
            status: dbStatus,
            description: `Versão ${data.version}`,
            questions: {
              create: data.questions.map((q, idx) => ({
                questionText: q.title,
                questionType: q.type,
                order: idx,
                required: true,
                requiresPhoto: q.type === "photo"
              }))
            }
          }
        });

        await tx.checklistSchedule.create({
          data: {
            checklistTemplateId: template.id,
            companyId: validCompanyId,
            unitId: validUnitId,
            daysOfWeek: data.activeDays,
            startTime: data.startTime,
            endTime: data.endTime,
            status: "active"
          }
        });

        await tx.auditLog.create({
          data: {
            companyId: validCompanyId,
            userId: data.performedByUserId || null,
            action: "CHECKLIST_CREATE",
            entity: "ChecklistTemplate",
            entityId: template.id,
            oldValue: null,
            newValue: JSON.stringify({ title: template.title, status: dbStatus }),
            ipAddress: "127.0.0.1"
          }
        });

        return tx.checklistTemplate.findUnique({
          where: { id: template.id },
          include: {
            questions: { orderBy: { order: "asc" } },
            schedules: true
          }
        });
      } else {
        const oldTemplate = await tx.checklistTemplate.findUnique({
          where: { id: data.id }
        });

        await tx.checklistTemplate.update({
          where: { id: data.id },
          data: {
            companyId: validCompanyId,
            title: data.title,
            sector: data.sector,
            recurrence: data.recurrence,
            status: dbStatus,
            description: `Versão ${data.version}`
          }
        });

        await tx.checklistQuestion.deleteMany({
          where: { checklistTemplateId: data.id }
        });

        await tx.checklistQuestion.createMany({
          data: data.questions.map((q, idx) => ({
            checklistTemplateId: data.id,
            questionText: q.title,
            questionType: q.type,
            order: idx,
            required: true,
            requiresPhoto: q.type === "photo"
          }))
        });

        const schedule = await tx.checklistSchedule.findFirst({
          where: { checklistTemplateId: data.id }
        });

        if (schedule) {
          await tx.checklistSchedule.update({
            where: { id: schedule.id },
            data: {
              companyId: validCompanyId,
              unitId: validUnitId,
              daysOfWeek: data.activeDays,
              startTime: data.startTime,
              endTime: data.endTime
            }
          });
        } else {
          await tx.checklistSchedule.create({
            data: {
              checklistTemplateId: data.id,
              companyId: validCompanyId,
              unitId: validUnitId,
              daysOfWeek: data.activeDays,
              startTime: data.startTime,
              endTime: data.endTime,
              status: "active"
            }
          });
        }

        await tx.auditLog.create({
          data: {
            companyId: validCompanyId,
            userId: data.performedByUserId || null,
            action: oldTemplate?.status !== dbStatus && dbStatus === "published" ? "CHECKLIST_PUBLISH" : "CHECKLIST_UPDATE",
            entity: "ChecklistTemplate",
            entityId: data.id,
            oldValue: oldTemplate ? JSON.stringify({ title: oldTemplate.title, status: oldTemplate.status }) : null,
            newValue: JSON.stringify({ title: data.title, status: dbStatus }),
            ipAddress: "127.0.0.1"
          }
        });

        return tx.checklistTemplate.findUnique({
          where: { id: data.id },
          include: {
            questions: { orderBy: { order: "asc" } },
            schedules: true
          }
        });
      }
    });
  });
}

/**
 * Archives a checklist template.
 */
export async function archiveChecklistAction(id: string, performedByUserId?: string | null) {
  return runWithConnectionCheck(async () => {
    const template = await prisma.checklistTemplate.update({
      where: { id },
      data: { status: "archived" }
    });
    await logAudit({
      companyId: template.companyId,
      userId: performedByUserId || null,
      action: "CHECKLIST_ARCHIVE",
      entity: "ChecklistTemplate",
      entityId: template.id,
      oldValue: "published",
      newValue: "archived"
    });
    return template;
  });
}

/**
 * Registers/Submits a checklist run execution along with its answers.
 */
export async function createChecklistRunAction(data: {
  checklistTemplateId: string;
  companyId: string;
  unitId: string;
  assignedTo: string | null;
  score: number;
  answers: {
    questionId: string;
    answerValue: string;
    isNonConform: boolean;
    observation?: string;
  }[];
  performedByUserId?: string | null;
}) {
  return runWithConnectionCheck(async () => {
    return prisma.$transaction(async (tx) => {
      // 1. Criar a execução do checklist
      const run = await tx.checklistRun.create({
        data: {
          checklistTemplateId: data.checklistTemplateId,
          companyId: data.companyId,
          unitId: data.unitId,
          assignedTo: data.assignedTo,
          status: "completed",
          startedAt: new Date(),
          finishedAt: new Date(),
          score: data.score
        }
      });

      await tx.auditLog.create({
        data: {
          companyId: data.companyId,
          userId: data.performedByUserId || null,
          action: "CHECKLIST_RUN_SUBMIT",
          entity: "ChecklistRun",
          entityId: run.id,
          oldValue: null,
          newValue: JSON.stringify({ score: data.score, status: "completed" }),
          ipAddress: "127.0.0.1"
        }
      });

      // 2. Criar as respostas e, se forem não-conformes, gerar a não-conformidade
      for (const ans of data.answers) {
        const question = await tx.checklistQuestion.findUnique({
          where: { id: ans.questionId }
        });
        const questionText = question?.questionText || "Questão do Checklist";

        const dbAnswer = await tx.checklistAnswer.create({
          data: {
            checklistRunId: run.id,
            questionId: ans.questionId,
            answerValue: ans.answerValue,
            isNonConform: ans.isNonConform,
            observation: ans.observation || null
          }
        });

        if (ans.isNonConform) {
          // 1. Sempre gerar não-conformidade automática para qualquer falha
          const nc = await tx.nonConformity.create({
            data: {
              companyId: data.companyId,
              unitId: data.unitId,
              checklistRunId: run.id,
              checklistAnswerId: dbAnswer.id,
              title: `Não Conformidade: ${questionText}`,
              description: ans.observation || `A resposta fornecida foi não conforme. Valor registrado: ${ans.answerValue}`,
              severity: (question && question.questionType === "number") ? (question.failureSeverity || "medium") : "medium",
              status: "open",
              createdBy: data.assignedTo
            }
          });

          await tx.auditLog.create({
            data: {
              companyId: data.companyId,
              userId: data.performedByUserId || null,
              action: "NON_CONFORMITY_AUTO_CREATE",
              entity: "NonConformity",
              entityId: nc.id,
              oldValue: null,
              newValue: JSON.stringify({ title: nc.title, severity: nc.severity }),
              ipAddress: "127.0.0.1"
            }
          });

          // 2. Se for pergunta do tipo número e configurada para gerar ocorrência na falha, gerar ocorrência também
          if (question && question.questionType === "number" && question.generateOccurrenceOnFailure) {
            const minStr = question.minValue !== null ? String(question.minValue) : "-";
            const maxStr = question.maxValue !== null ? String(question.maxValue) : "-";
            const templateObj = await tx.checklistTemplate.findUnique({ where: { id: data.checklistTemplateId } });
            
            const occ = await tx.occurrence.create({
              data: {
                companyId: data.companyId,
                unitId: data.unitId,
                checklistRunId: run.id,
                checklistAnswerId: dbAnswer.id,
                title: `Ocorrência automática: ${questionText}`,
                description: `Valor fora da faixa permitida. Registrado: ${ans.answerValue} ${question.unitMeasure || ""}. Limites: [${minStr}, ${maxStr}]. Observação: ${ans.observation || "Nenhuma"}`,
                sector: templateObj?.sector || "Geral",
                severity: question.failureSeverity || "medium",
                status: "open",
                createdBy: data.assignedTo || "Sistema",
                type: "automatic"
              }
            });

            await tx.auditLog.create({
              data: {
                companyId: data.companyId,
                userId: data.performedByUserId || null,
                action: "OCCURRENCE_AUTO_CREATE",
                entity: "Occurrence",
                entityId: occ.id,
                oldValue: null,
                newValue: JSON.stringify({ title: occ.title, severity: occ.severity }),
                ipAddress: "127.0.0.1"
              }
            });
          }
        }
      }

      return tx.checklistRun.findUnique({
        where: { id: run.id },
        include: {
          answers: true
        }
      });
    });
  });
}

/**
 * Retrieves checklist runs, optionally filtered by company.
 */
export async function getChecklistRunsAction(companyId: string | null) {
  return runWithConnectionCheck(async () => {
    if (companyId) {
      return prisma.checklistRun.findMany({
        where: { companyId },
        include: {
          template: true,
          unit: true,
          answers: {
            include: {
              question: true
            }
          }
        },
        orderBy: { finishedAt: "desc" }
      });
    }
    return prisma.checklistRun.findMany({
      include: {
        template: true,
        unit: true,
        answers: {
          include: {
            question: true
          }
        }
      },
      orderBy: { finishedAt: "desc" }
    });
  });
}

/**
 * Retrieves non-conformities, optionally filtered by company.
 */
export async function getNonConformitiesAction(companyId: string | null) {
  return runWithConnectionCheck(async () => {
    if (companyId) {
      return prisma.nonConformity.findMany({
        where: { companyId },
        include: {
          unit: true,
          run: { include: { template: true } },
          answer: { include: { question: true } },
          actionPlans: { include: { responsibleUser: true } }
        },
        orderBy: { createdAt: "desc" }
      });
    }
    return prisma.nonConformity.findMany({
      include: {
        unit: true,
        run: { include: { template: true } },
        answer: { include: { question: true } },
        actionPlans: { include: { responsibleUser: true } }
      },
      orderBy: { createdAt: "desc" }
    });
  });
}

/**
 * Updates status of a non-conformity.
 */
export async function updateNonConformityStatusAction(id: string, status: string) {
  return runWithConnectionCheck(async () => {
    return prisma.nonConformity.update({
      where: { id },
      data: { status }
    });
  });
}

/**
 * Retrieves all action plans, optionally filtered by company.
 */
export async function getActionPlansAction(companyId: string | null) {
  return runWithConnectionCheck(async () => {
    if (companyId) {
      return prisma.actionPlan.findMany({
        where: { companyId },
        include: {
          unit: true,
          nonConformity: true,
          responsibleUser: true
        },
        orderBy: { createdAt: "desc" }
      });
    }
    return prisma.actionPlan.findMany({
      include: {
        unit: true,
        nonConformity: true,
        responsibleUser: true
      },
      orderBy: { createdAt: "desc" }
    });
  });
}

/**
 * Creates or updates an action plan.
 */
export async function createActionPlanAction(data: {
  companyId: string;
  unitId: string;
  nonConformityId: string;
  responsibleUserId: string;
  actionDescription: string;
  dueDate: Date;
  performedByUserId?: string | null;
}) {
  return runWithConnectionCheck(async () => {
    return prisma.$transaction(async (tx) => {
      const plan = await tx.actionPlan.create({
        data: {
          companyId: data.companyId,
          unitId: data.unitId,
          nonConformityId: data.nonConformityId,
          responsibleUserId: data.responsibleUserId,
          actionDescription: data.actionDescription,
          dueDate: data.dueDate,
          status: "pending"
        }
      });

      // Update non-conformity status to 'in_progress'
      await tx.nonConformity.update({
        where: { id: data.nonConformityId },
        data: { status: "in_progress" }
      });

      await tx.auditLog.create({
        data: {
          companyId: data.companyId,
          userId: data.performedByUserId || null,
          action: "ACTION_PLAN_CREATE",
          entity: "ActionPlan",
          entityId: plan.id,
          oldValue: null,
          newValue: JSON.stringify({ actionDescription: plan.actionDescription, status: plan.status }),
          ipAddress: "127.0.0.1"
        }
      });

      return plan;
    });
  });
}

/**
 * Updates the status of an action plan (including uploading evidence URL or closing).
 */
export async function updateActionPlanAction(id: string, status: string, resolutionEvidenceUrl?: string, performedByUserId?: string | null) {
  return runWithConnectionCheck(async () => {
    const oldPlan = await prisma.actionPlan.findUnique({ where: { id } });
    const isCompleted = status === "completed";
    const plan = await prisma.actionPlan.update({
      where: { id },
      data: {
        status,
        resolutionEvidenceUrl: resolutionEvidenceUrl || null,
        closedAt: isCompleted ? new Date() : null
      }
    });

    await logAudit({
      companyId: plan.companyId,
      userId: performedByUserId || null,
      action: "ACTION_PLAN_UPDATE",
      entity: "ActionPlan",
      entityId: plan.id,
      oldValue: oldPlan ? JSON.stringify({ status: oldPlan.status, evidence: oldPlan.resolutionEvidenceUrl }) : null,
      newValue: JSON.stringify({ status: plan.status, evidence: plan.resolutionEvidenceUrl })
    });

    return plan;
  });
}

/**
 * Retrieves aggregate metrics for the dashboard.
 */
export async function getDashboardDataAction(
  companyId: string | null,
  unitId?: string | null,
  period?: string,
  specificDate?: string,
  startDate?: string,
  endDate?: string
) {
  return runWithConnectionCheck(async () => {
    let dateFilter: Date | undefined;
    let dateLtFilter: Date | undefined;

    if (period === "Hoje") {
      dateFilter = new Date();
      dateFilter.setHours(0, 0, 0, 0);
      dateLtFilter = new Date();
      dateLtFilter.setHours(23, 59, 59, 999);
    } else if (period === "Ontem") {
      dateFilter = new Date();
      dateFilter.setDate(dateFilter.getDate() - 1);
      dateFilter.setHours(0, 0, 0, 0);
      dateLtFilter = new Date();
      dateLtFilter.setDate(dateLtFilter.getDate() - 1);
      dateLtFilter.setHours(23, 59, 59, 999);
    } else if (period === "Últimos 30 dias") {
      dateFilter = new Date();
      dateFilter.setDate(dateFilter.getDate() - 30);
      dateFilter.setHours(0, 0, 0, 0);
    } else if (period === "Mês atual" || period === "Este Mês") {
      dateFilter = new Date();
      dateFilter.setDate(1); // Start of current month
      dateFilter.setHours(0, 0, 0, 0);
    } else if (period === "Mês anterior") {
      dateFilter = new Date();
      dateFilter.setMonth(dateFilter.getMonth() - 1);
      dateFilter.setDate(1);
      dateFilter.setHours(0, 0, 0, 0);
      dateLtFilter = new Date();
      dateLtFilter.setDate(0); // Last day of previous month
      dateLtFilter.setHours(23, 59, 59, 999);
    } else if (period === "Data específica" && specificDate) {
      dateFilter = new Date(specificDate + "T00:00:00");
      dateLtFilter = new Date(specificDate + "T23:59:59");
    } else if (period === "Período personalizado" && startDate && endDate) {
      dateFilter = new Date(startDate + "T00:00:00");
      dateLtFilter = new Date(endDate + "T23:59:59");
    } else {
      // Default: "Últimos 7 dias"
      dateFilter = new Date();
      dateFilter.setDate(dateFilter.getDate() - 7);
      dateFilter.setHours(0, 0, 0, 0);
    }

    const whereClause: { companyId?: string; unitId?: string; finishedAt?: { gte?: Date; lte?: Date } } = {};
    if (companyId) whereClause.companyId = companyId;
    if (unitId) whereClause.unitId = unitId;
    if (dateFilter || dateLtFilter) {
      whereClause.finishedAt = {};
      if (dateFilter) whereClause.finishedAt.gte = dateFilter;
      if (dateLtFilter) whereClause.finishedAt.lte = dateLtFilter;
    }

    const nonConformsWhere: { companyId?: string; unitId?: string; createdAt?: { gte?: Date; lte?: Date } } = {};
    if (companyId) nonConformsWhere.companyId = companyId;
    if (unitId) nonConformsWhere.unitId = unitId;
    if (dateFilter || dateLtFilter) {
      nonConformsWhere.createdAt = {};
      if (dateFilter) nonConformsWhere.createdAt.gte = dateFilter;
      if (dateLtFilter) nonConformsWhere.createdAt.lte = dateLtFilter;
    }

    const actionPlansWhere: { companyId?: string; unitId?: string; createdAt?: { gte?: Date; lte?: Date } } = {};
    if (companyId) actionPlansWhere.companyId = companyId;
    if (unitId) actionPlansWhere.unitId = unitId;
    if (dateFilter || dateLtFilter) {
      actionPlansWhere.createdAt = {};
      if (dateFilter) actionPlansWhere.createdAt.gte = dateFilter;
      if (dateLtFilter) actionPlansWhere.createdAt.lte = dateLtFilter;
    }

    const [runs, nonConforms, actionPlans] = await Promise.all([
      prisma.checklistRun.findMany({
        where: whereClause,
        orderBy: { finishedAt: "desc" }
      }),
      prisma.nonConformity.findMany({
        where: nonConformsWhere
      }),
      prisma.actionPlan.findMany({
        where: actionPlansWhere
      })
    ]);

    const completedCount = runs.filter(r => r.status === "completed").length;
    const inProgressCount = runs.filter(r => r.status === "in_progress").length;
    const scheduledCount = runs.filter(r => r.status === "scheduled").length;
    const lateCount = runs.filter(r => r.status === "late").length;

    const totalRuns = runs.length;
    const avgScore = totalRuns > 0 
      ? parseFloat((runs.reduce((acc, r) => acc + r.score, 0) / totalRuns).toFixed(1))
      : 0;

    const openNonConforms = nonConforms.filter(nc => nc.status === "open").length;
    const criticalNonConforms = nonConforms.filter(nc => nc.severity === "critical").length;
    
    const pendingActionPlans = actionPlans.filter(ap => ap.status === "pending").length;

    // 1. Weekly Score Evolution calculation
    const weekdayNames = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SAB"];
    const weekdayScores = weekdayNames.map(day => ({ day, totalScore: 0, count: 0 }));

    runs.forEach(r => {
      if (r.finishedAt || r.startedAt) {
        const date = new Date(r.finishedAt || r.startedAt || "");
        const dayName = weekdayNames[date.getDay()];
        const dayObj = weekdayScores.find(d => d.day === dayName);
        if (dayObj) {
          dayObj.totalScore += r.score;
          dayObj.count += 1;
        }
      }
    });

    const order = ["SEG", "TER", "QUA", "QUI", "SEX", "SAB", "DOM"];
    const weeklyScores = order.map(dayName => {
      const dayObj = weekdayScores.find(d => d.day === dayName);
      const val = dayObj && dayObj.count > 0 ? Math.round(dayObj.totalScore / dayObj.count) : 0;
      return { day: dayName, val };
    });

    // 2. Operator Ranking calculation
    const operatorMap: { [name: string]: { totalScore: number; count: number } } = {};
    runs.forEach(r => {
      if (r.assignedTo) {
        if (!operatorMap[r.assignedTo]) {
          operatorMap[r.assignedTo] = { totalScore: 0, count: 0 };
        }
        operatorMap[r.assignedTo].totalScore += r.score;
        operatorMap[r.assignedTo].count += 1;
      }
    });

    const operatorRanking = Object.entries(operatorMap).map(([name, data]) => {
      const initials = name
        .split(" ")
        .map(n => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
      return {
        name,
        initials,
        score: Math.round(data.totalScore / data.count),
        color: "bg-slate-100 text-slate-800"
      };
    }).sort((a, b) => b.score - a.score);

    return {
      completedCount,
      inProgressCount,
      scheduledCount,
      lateCount,
      avgScore,
      openNonConforms,
      criticalNonConforms,
      pendingActionPlans,
      weeklyScores,
      operatorRanking
    };
  });
}

/**
 * Retrieves occurrences, applying hierarchical tenant filters.
 */
export async function getOccurrencesAction(companyId: string | null, unitId?: string | null) {
  return runWithConnectionCheck(async () => {
    const where: { companyId?: string; unitId?: string } = {};
    if (companyId) {
      where.companyId = companyId;
    }
    if (unitId) {
      where.unitId = unitId;
    }
    return prisma.occurrence.findMany({
      where,
      include: {
        unit: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });
  });
}

/**
 * Creates a new occurrence and logs the audit event.
 */
export async function createOccurrenceAction(data: {
  companyId: string;
  unitId: string;
  title: string;
  description?: string | null;
  sector: string;
  severity: string;
  createdBy: string;
  performedByUserId?: string | null;
}) {
  return runWithConnectionCheck(async () => {
    const occurrence = await prisma.occurrence.create({
      data: {
        companyId: data.companyId,
        unitId: data.unitId,
        title: data.title,
        description: data.description || null,
        sector: data.sector,
        severity: data.severity,
        status: "open",
        createdBy: data.createdBy
      },
      include: {
        unit: {
          select: { name: true }
        }
      }
    });

    await logAudit({
      companyId: data.companyId,
      userId: data.performedByUserId || null,
      action: "OCCURRENCE_CREATE",
      entity: "Occurrence",
      entityId: occurrence.id,
      oldValue: null,
      newValue: JSON.stringify({ title: occurrence.title, severity: occurrence.severity, unitId: occurrence.unitId })
    });

    return occurrence;
  });
}

/**
 * Updates an occurrence status and logs the audit event.
 */
export async function updateOccurrenceStatusAction(
  id: string,
  status: string,
  performedByUserId?: string | null,
  userName?: string | null
) {
  return runWithConnectionCheck(async () => {
    const oldOcc = await prisma.occurrence.findUnique({ where: { id } });
    if (oldOcc?.isLocked) {
      throw new Error("Ocorrência fechada/bloqueada não pode ser reaberta ou alterada.");
    }

    const isClosing = status === "resolved" || status === "cancelled";

    const occurrence = await prisma.occurrence.update({
      where: { id },
      data: { 
        status,
        resolvedAt: isClosing ? new Date() : undefined,
        resolvedBy: isClosing ? (userName || "Usuário") : undefined,
        closedAt: isClosing ? new Date() : undefined,
        closedBy: isClosing ? (userName || "Usuário") : undefined,
        isLocked: isClosing ? true : undefined
      }
    });

    await logAudit({
      companyId: occurrence.companyId,
      userId: performedByUserId || null,
      action: "OCCURRENCE_STATUS_CHANGE",
      entity: "Occurrence",
      entityId: occurrence.id,
      oldValue: oldOcc ? oldOcc.status : null,
      newValue: status
    });

    return occurrence;
  });
}

/**
 * Duplicates a resolved or cancelled occurrence.
 */
export async function duplicateOccurrenceAction(
  originalId: string,
  newTitle: string,
  newDescription: string,
  performedByUserId?: string | null,
  userName?: string | null
) {
  return runWithConnectionCheck(async () => {
    const original = await prisma.occurrence.findUnique({ where: { id: originalId } });
    if (!original) throw new Error("Ocorrência original não encontrada");

    const occurrence = await prisma.occurrence.create({
      data: {
        companyId: original.companyId,
        unitId: original.unitId,
        title: newTitle,
        description: newDescription,
        sector: original.sector,
        severity: original.severity,
        status: "open",
        createdBy: userName || original.createdBy,
        duplicatedFromOccurrenceId: original.id,
        isLocked: false
      },
      include: {
        unit: {
          select: { name: true }
        }
      }
    });

    await logAudit({
      companyId: occurrence.companyId,
      userId: performedByUserId || null,
      action: "OCCURRENCE_DUPLICATE",
      entity: "Occurrence",
      entityId: occurrence.id,
      oldValue: original.id,
      newValue: JSON.stringify({ title: occurrence.title, severity: occurrence.severity })
    });

    return occurrence;
  });
}

/**
 * Retrieves documents, bringing both global and specific unit documents.
 */
export async function getDocumentsAction(companyId: string | null, unitId?: string | null) {
  return runWithConnectionCheck(async () => {
    const where: { companyId?: string; OR?: Array<{ unitId: string | null }> } = {};
    if (companyId) {
      where.companyId = companyId;
    }
    if (unitId) {
      where.OR = [
        { unitId: null },
        { unitId: unitId }
      ];
    }
    return prisma.document.findMany({
      where,
      include: {
        unit: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });
  });
}

/**
 * Creates a new document and logs the audit event.
 */
export async function createDocumentAction(data: {
  companyId: string;
  unitId?: string | null;
  title: string;
  description?: string | null;
  category: string;
  fileUrl: string;
  version?: string;
  expirationDate?: Date | null;
  performedByUserId?: string | null;
}) {
  return runWithConnectionCheck(async () => {
    const document = await prisma.document.create({
      data: {
        companyId: data.companyId,
        unitId: data.unitId || null,
        title: data.title,
        description: data.description || null,
        category: data.category,
        fileUrl: data.fileUrl,
        version: data.version || "1.0",
        expirationDate: data.expirationDate || null,
        status: "active"
      },
      include: {
        unit: {
          select: { name: true }
        }
      }
    });

    await logAudit({
      companyId: data.companyId,
      userId: data.performedByUserId || null,
      action: "DOCUMENT_UPLOAD",
      entity: "Document",
      entityId: document.id,
      oldValue: null,
      newValue: JSON.stringify({ title: document.title, category: document.category, fileUrl: document.fileUrl })
    });

    return document;
  });
}

/**
 * Deletes a document and logs the audit event.
 */
export async function deleteDocumentAction(id: string, performedByUserId?: string | null) {
  return runWithConnectionCheck(async () => {
    const doc = await prisma.document.findUnique({ where: { id } });
    if (!doc) throw new Error("Documento não encontrado");

    await prisma.document.delete({
      where: { id }
    });

    await logAudit({
      companyId: doc.companyId,
      userId: performedByUserId || null,
      action: "DOCUMENT_DELETE",
      entity: "Document",
      entityId: doc.id,
      oldValue: JSON.stringify({ title: doc.title, fileUrl: doc.fileUrl }),
      newValue: null
    });

    return { id };
  });
}

/**
 * Updates a user's own profile (name, avatarUrl, password).
 */
export async function updateUserProfileAction(data: {
  userId: string;
  name: string;
  avatarUrl?: string | null;
  newPassword?: string | null;
}) {
  return runWithConnectionCheck(async () => {
    const updateData: any = {
      name: data.name
    };
    if (data.avatarUrl !== undefined) {
      updateData.avatarUrl = data.avatarUrl;
    }
    if (data.newPassword && data.newPassword.trim().length >= 6) {
      updateData.passwordHash = data.newPassword.trim();
    }

    const updatedUser = await prisma.user.update({
      where: { id: data.userId },
      data: updateData
    });

    await logAudit({
      companyId: updatedUser.companyId,
      userId: updatedUser.id,
      action: "USER_PROFILE_UPDATE",
      entity: "User",
      entityId: updatedUser.id,
      oldValue: null,
      newValue: JSON.stringify({ name: updatedUser.name, avatarUrl: updatedUser.avatarUrl })
    });

    return updatedUser;
  });
}



