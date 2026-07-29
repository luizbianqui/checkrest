import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando seed do banco de dados CheckRest...");

  // 1. Limpar banco de dados existente
  console.log("Limpando registros antigos...");
  await prisma.auditLog.deleteMany();
  await prisma.actionPlan.deleteMany();
  await prisma.nonConformity.deleteMany();
  await prisma.evidence.deleteMany();
  await prisma.checklistAnswer.deleteMany();
  await prisma.checklistRun.deleteMany();
  await prisma.checklistSchedule.deleteMany();
  await prisma.checklistQuestion.deleteMany();
  await prisma.checklistTemplate.deleteMany();
  await prisma.userTraining.deleteMany();
  await prisma.training.deleteMany();
  await prisma.document.deleteMany();
  await prisma.occurrence.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.user.deleteMany();
  await prisma.unit.deleteMany();
  await prisma.company.deleteMany();

  // 2. Criar Empresa (Multi-tenant SaaS)
  console.log("Criando empresa modelo...");
  const company = await prisma.company.create({
    data: {
      name: "Restaurante Modelo",
      cnpj: "12.345.678/0001-90",
      plan: "Pro",
      status: "active"
    }
  });

  // 3. Criar Unidades (Filiais)
  console.log("Criando unidades (filiais)...");
  const unitCentro = await prisma.unit.create({
    data: {
      companyId: company.id,
      name: "Matriz - Centro",
      address: "Rua Augusta, 1500 - Consolação, São Paulo - SP",
      managerName: "Ricardo Costa",
      status: "active"
    }
  });

  const unitJardins = await prisma.unit.create({
    data: {
      companyId: company.id,
      name: "Filial - Jardins",
      address: "Al. Lorena, 450 - Jardins, São Paulo - SP",
      managerName: "Ana Martins",
      status: "active"
    }
  });

  const unitPinheiros = await prisma.unit.create({
    data: {
      companyId: company.id,
      name: "Filial - Pinheiros",
      address: "Av. Brigadeiro Faria Lima, 2000 - Pinheiros, São Paulo - SP",
      managerName: "Marcos Silva",
      status: "active"
    }
  });

  // 4. Criar Usuários (RBAC)
  console.log("Criando usuários com perfis SaaS...");
  
  // SaaS Admin (Ricardo Lima) - Sem vínculo direto de empresa/unidade
  const saasAdmin = await prisma.user.create({
    data: {
      name: "Ricardo Lima",
      email: "admin@saas.com",
      passwordHash: "saas123",
      role: "SAAS_ADMIN",
      status: "active",
      avatarUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuBP0wy0mJQlq45ZKUlgz_QNDVftgVzwsr_FR28EwdyCwZqV3VpnEXhRq3BsAhHj4Y6mDx986mvQxkWr2-zK-v9hF8oO-Pmh_kQ2f_vicLRKOYKyTC0yC5kfVzS-WzFabmIZMcJxc2cWUioFVmKmzFcbH0ys_mv0Ezuq-4E8i8q-jsucR6Ad2gV7Z70qKshIQVq6rFoFrVyZhULy96OE0NCxllIXcjVLDubdMaMqGtCYwKneQIw_9p3wjfW_pSrgP2bn6scT834CsCc"
    }
  });

  // Company Admin (Ricardo Costa) - Vinculado à empresa modelo
  const companyAdmin = await prisma.user.create({
    data: {
      companyId: company.id,
      name: "Ricardo Costa",
      email: "admin@restaurante.com",
      passwordHash: "empresa123",
      role: "COMPANY_ADMIN",
      status: "active",
      avatarUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuDNgTzuQnw27ABy0QdikXDwdAR_5bn7ZUfehclBI4VNP0kQedOUADDnKMFSUabFByr3QAkWm2NNJC1u7B-JB_D98Hn5nv_WuwjwCmz_3WKVBq2BHjtfxx0-bRjCtYwqtdMpFGuqgE_uTLVy8KZbHnxqEW1W2rczOYIUd_8zLngrzQ2JtD71_2-P-g_b0R2g3wxnTM8YXsw5rrChq11nlwccWlRWAPWOGkX7kmvZPpCPDvqIaPPZ9n7pMLyzGAHXTirQGAb4oKfef9g"
    }
  });

  // Unit Manager (Ana Martins) - Vinculado à empresa modelo e à filial Jardins
  const unitManager = await prisma.user.create({
    data: {
      companyId: company.id,
      unitId: unitJardins.id,
      name: "Ana Martins",
      email: "gerente.jardins@restaurante.com",
      passwordHash: "gerente123",
      role: "UNIT_MANAGER",
      status: "active",
      avatarUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuDyfX8IQJfUdA4ZFxNthzgW-lf6TQccAXYyrRSNCqqIe4LGUFXxzAcBc7OLO6BtHSR7G58m_KEk3Gxm8tGNRfRlO9Ambje4wcy8BK1vSJkPeaFM1F4t2RVFqv1PUqh3Z1S1L-uO5PqQ_jccM-JUfXHpVwHLZL_pqimtnw7O5tFRuA5SBc_77nkn1_MVLgJ7edF8XK6n2viqf7OF7MltA6lSvAfbvRgRWKRrfYXPqQ8rStH9ErmZZZSdlBjmtJ1bQ8nGuD6KplIi_GI"
    }
  });

  // Operator (João Roberto) - Vinculado à empresa modelo e filial Jardins
  const operator = await prisma.user.create({
    data: {
      companyId: company.id,
      unitId: unitJardins.id,
      name: "João Roberto",
      email: "operador@restaurante.com",
      passwordHash: "operador123",
      role: "OPERATOR",
      status: "active",
      avatarUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuAO7Hl5S5Kqo3bFEfk8orp0XNzAxDQRiej3pR2O5ief-MkbtcYy49MPk0Otgq5rNveu5sZFc7AO6F195R1RO6NhKLz7AhKqZXAtlmC8_nlHSZ4LejavBzlS5T6Kl5eeeZjOdVfP9kBWpjaIekdkZrrLNE7Umz7BfyKRmsRtUDCDpgZH9ser9xm94aVyQxSf_jrhcDI8KjJPsrTU7k0zdIh-QS77QtQu4dU3CcDwLJfAyvKVOz61CvGGWDPrnPzAcTNTUyH3bPDtGU4"
    }
  });

  // 5. Criar Checklist Templates
  console.log("Criando modelos de checklist...");

  // Template 1: Abertura de Cozinha
  const t1 = await prisma.checklistTemplate.create({
    data: {
      companyId: company.id,
      title: "Abertura de Cozinha",
      description: "Verificação higiênico-sanitária e de preparação diária da cozinha central",
      sector: "Cozinha Central",
      recurrence: "Repetir diariamente",
      status: "published",
      createdBy: saasAdmin.id,
      questions: {
        create: [
          { questionText: "As bancadas foram higienizadas com álcool 70%?", questionType: "checkbox", required: true, order: 1 },
          { questionText: "Equipe de manipuladores vestindo uniformes limpos e toucas?", questionType: "checkbox", required: true, order: 2 },
          { questionText: "Registrar a temperatura do freezer de proteínas", questionType: "photo", required: true, order: 3, requiresPhoto: true }
        ]
      }
    }
  });

  // Template 2: Fechamento de Salão
  const t2 = await prisma.checklistTemplate.create({
    data: {
      companyId: company.id,
      title: "Fechamento de Salão",
      description: "Auditoria de finalização e organização de caixas, luzes e mesas",
      sector: "Atendimento",
      recurrence: "Repetir diariamente",
      status: "published",
      createdBy: saasAdmin.id,
      questions: {
        create: [
          { questionText: "Todas as mesas foram higienizadas e organizadas?", questionType: "checkbox", required: true, order: 1 },
          { questionText: "Lixeiras esvaziadas e sacos plásticos trocados?", questionType: "checkbox", required: true, order: 2 },
          { questionText: "Conferência final do fundo de caixa realizada?", questionType: "checkbox", required: true, order: 3 },
          { questionText: "Registrar estado geral do salão em foto", questionType: "photo", required: false, order: 4, requiresPhoto: true }
        ]
      }
    }
  });

  // Template 3: Higiene Semanal - Área Seca
  const t3 = await prisma.checklistTemplate.create({
    data: {
      companyId: company.id,
      title: "Higiene Semanal - Área Seca",
      description: "Conferência semanal da limpeza e presença de pragas no estoque seco",
      sector: "Estoque",
      recurrence: "Semanal",
      status: "draft",
      createdBy: saasAdmin.id,
      questions: {
        create: [
          { questionText: "Prateleiras limpas e organizadas?", questionType: "checkbox", required: true, order: 1 },
          { questionText: "Há sinais ou vestígios de pragas identificados?", questionType: "checkbox", required: true, order: 2 }
        ]
      }
    }
  });

  // Template 4: Controle de Temperatura
  const t4 = await prisma.checklistTemplate.create({
    data: {
      companyId: company.id,
      title: "Controle de Temperatura",
      description: "Medição de temperatura de equipamentos e balcões de distribuição",
      sector: "Cozinha Central",
      recurrence: "Repetir diariamente",
      status: "published",
      createdBy: saasAdmin.id,
      questions: {
        create: [
          { 
            questionText: "Temperatura do freezer 1", 
            questionType: "number", 
            required: true, 
            order: 1, 
            requiresObservationOnFailure: true,
            requiresPhotoOnFailure: true,
            unitMeasure: "°C",
            minValue: -25,
            maxValue: -18,
            idealValue: -20,
            generateOccurrenceOnFailure: true,
            failureSeverity: "high"
          },
          { 
            questionText: "Temperatura da geladeira de bebidas", 
            questionType: "number", 
            required: true, 
            order: 2, 
            requiresObservationOnFailure: true,
            requiresPhotoOnFailure: false,
            unitMeasure: "°C",
            minValue: 0,
            maxValue: 5,
            idealValue: 3,
            generateOccurrenceOnFailure: true,
            failureSeverity: "medium"
          },
          { 
            questionText: "Foto do termômetro do freezer de proteínas", 
            questionType: "photo", 
            required: true, 
            order: 3, 
            requiresPhoto: true 
          }
        ]
      }
    }
  });

  // 6. Criar Agendamentos de Checklist
  console.log("Configurando agendamentos de checklists nas filiais...");
  await prisma.checklistSchedule.create({
    data: {
      checklistTemplateId: t1.id,
      companyId: company.id,
      unitId: unitJardins.id,
      daysOfWeek: ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"],
      startTime: "08:00",
      endTime: "10:00",
      status: "active"
    }
  });

  await prisma.checklistSchedule.create({
    data: {
      checklistTemplateId: t2.id,
      companyId: company.id,
      unitId: unitJardins.id,
      daysOfWeek: ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"],
      startTime: "22:00",
      endTime: "23:30",
      status: "active"
    }
  });

  console.log("Seed concluído com sucesso! CheckRest está pronto.");
}

main()
  .catch((e) => {
    console.error("Erro ao executar seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
