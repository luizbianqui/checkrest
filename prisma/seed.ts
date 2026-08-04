import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando limpo do banco de dados CheckRest (Produção Zerada)...");

  // 1. Limpar banco de dados existente
  console.log("Limpando registros antigos...");
  await prisma.accountInvite.deleteMany();
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

  // 2. Criar Apenas o SaaS Admin Master (Luiz Bianqui)
  console.log("Criando conta de Administrador SaaS Master...");
  
  await prisma.user.create({
    data: {
      name: "Luiz Bianqui",
      email: "luizbianqui@gmail.com",
      passwordHash: "saas123",
      role: "SAAS_ADMIN",
      status: "active"
    }
  });

  console.log("Banco de dados zerado com sucesso! Apenas a conta de SaaS Admin está ativa.");
}

main()
  .catch((e) => {
    console.error("Erro ao executar seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
