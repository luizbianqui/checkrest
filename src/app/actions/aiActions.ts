"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { AIContext, AIResponse, QuestionType } from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function buildSystemPrompt(context: AIContext): string {
  const { user, units, nonConformities, actionPlans, occurrences, checklists, dashboardStats, currentDateTime } = context;

  const unitsText = units.length > 0
    ? units.map(u => `  - ${u.name} | Status: ${u.status === "active" ? "Ativa" : "Inativa"} | Gerente: ${u.managerName}`).join("\n")
    : "  (Nenhuma unidade cadastrada)";

  const ncText = nonConformities.length > 0
    ? nonConformities.map(nc =>
        `  - [${nc.severity.toUpperCase()}] ${nc.title} | Unidade: ${nc.unitName} | Status: ${nc.status} | Data: ${nc.createdAt}`
      ).join("\n")
    : "  (Nenhuma não conformidade registrada)";

  const apText = actionPlans.length > 0
    ? actionPlans.map(ap =>
        `  - ${ap.actionDescription} | Status: ${ap.status} | Prazo: ${ap.dueDate} | Responsável: ${ap.responsibleName} | Unidade: ${ap.unitName}`
      ).join("\n")
    : "  (Nenhum plano de ação registrado)";

  const occText = occurrences.length > 0
    ? occurrences.map(oc =>
        `  - [${oc.severity.toUpperCase()}] ${oc.title} | Setor: ${oc.sector} | Status: ${oc.status} | Unidade: ${oc.unitName} | Data: ${oc.createdAt}`
      ).join("\n")
    : "  (Nenhuma ocorrência registrada)";

  const clText = checklists.length > 0
    ? checklists.map(cl =>
        `  - ${cl.title} | Setor: ${cl.sector} | Status: ${cl.status} | Recorrência: ${cl.recurrence}`
      ).join("\n")
    : "  (Nenhum checklist cadastrado)";

  const statsText = dashboardStats
    ? `  - Execuções concluídas (período): ${dashboardStats.completed}
  - Execuções atrasadas: ${dashboardStats.delayed}
  - Score médio de conformidade: ${dashboardStats.avgScore !== undefined ? dashboardStats.avgScore + "%" : "N/A"}
  - NCs em aberto: ${dashboardStats.openNonConforms}
  - Planos de ação pendentes: ${dashboardStats.pendingActionPlans}${
  dashboardStats.operatorRanking && dashboardStats.operatorRanking.length > 0
    ? "\n  - Ranking de operadores:\n" + dashboardStats.operatorRanking.map((op, i) => `      ${i + 1}º ${op.name}: ${op.score}%`).join("\n")
    : ""
}`
    : "  (Métricas do dashboard não disponíveis)";

  return `Você é o Assistente de Operações do CheckRest — um sistema SaaS de gestão operacional para restaurantes.

SUAS REGRAS OBRIGATÓRIAS:
1. Responda sempre em português brasileiro.
2. Seja objetivo, direto e use dados reais fornecidos abaixo. NUNCA invente dados.
3. Quando não houver dados suficientes para uma análise, informe claramente.
4. Respeite as permissões do usuário logado: ele só pode ver dados do seu contexto.
5. Use emojis moderadamente para tornar a leitura mais clara.
6. Ao gerar checklists, seja prático e operacional (linguagem de restaurante).
7. Sua resposta DEVE ser um JSON válido seguindo o schema abaixo — sem nenhum texto fora do JSON.

SCHEMA DE RESPOSTA (JSON):
{
  "text": "string — resposta em texto, pode ter quebras de linha com \\n",
  "dataSource": "string — ex: 'Dados do sistema em 25/06/2026 às 17:00'",
  "checklistTemplate": {
    "title": "string",
    "sector": "string",
    "questions": [
      { "title": "string", "type": "checkbox | text | photo" }
    ]
  }
}
OBS: "checklistTemplate" só deve aparecer quando o usuário pedir para CRIAR um checklist. Caso contrário, omita o campo completamente.

─────────────────────────────────────────────────────────────────
CONTEXTO OPERACIONAL ATUAL
Data/hora: ${currentDateTime}
Usuário logado: ${user.name} | Perfil: ${user.role}

UNIDADES VISÍVEIS:
${unitsText}

NÃO CONFORMIDADES (abertas e em tratamento):
${ncText}

PLANOS DE AÇÃO:
${apText}

OCORRÊNCIAS OPERACIONAIS RECENTES:
${occText}

CHECKLISTS CADASTRADOS:
${clText}

MÉTRICAS DO DASHBOARD (período atual):
${statsText}
─────────────────────────────────────────────────────────────────

Agora responda à pergunta do usuário usando EXCLUSIVAMENTE os dados do contexto acima.`;
}

function buildFallbackResponse(prompt: string, context: AIContext): AIResponse {
  const lowerInput = prompt.toLowerCase();
  const { units, nonConformities, actionPlans, occurrences } = context;

  let text = "Compreendido! Posso ajudar a moldar seus processos operacionais. Para criar um checklist, especifique o setor e o tipo de perguntas.";
  let checklistTemplate: AIResponse["checklistTemplate"] | undefined;

  if (lowerInput.includes("jardim") || lowerInput.includes("jardins")) {
    const unit = units.find(u => u.name.toLowerCase().includes("jardim"));
    if (unit) {
      const openNc = nonConformities.filter(nc => nc.status === "open" && nc.unitName.toLowerCase().includes("jardim")).length;
      const inProgressNc = nonConformities.filter(nc => nc.status === "in_progress" && nc.unitName.toLowerCase().includes("jardim")).length;
      const pendingAp = actionPlans.filter(ap => ap.status === "pending" && ap.unitName.toLowerCase().includes("jardim")).length;

      text = `📋 Relatório da Unidade Jardins (${unit.name}):\n\n• Status: ${unit.status === "active" ? "🟢 Ativa" : "🔴 Inativa"}\n• Gerente: ${unit.managerName}\n\n📈 Não Conformidades:\n• Em Aberto: ${openNc}\n• Em Tratamento: ${inProgressNc}\n\n📌 Planos de Ação Pendentes: ${pendingAp}\n\n💡 Recomendação: ${openNc > 0 ? `Priorize os ${openNc} desvio(s) em aberto com planos de ação corretiva.` : "A unidade está operando regularmente."}`;
    } else {
      text = "A unidade de Jardins não foi encontrada. Verifique se ela está cadastrada nas configurações.";
    }
  } else if (lowerInput.includes("resumo") || lowerInput.includes("operaç")) {
    const activeUnits = units.filter(u => u.status === "active").length;
    const openNcTotal = nonConformities.filter(nc => nc.status === "open").length;
    const pendingApTotal = actionPlans.filter(ap => ap.status === "pending").length;
    const openOccTotal = occurrences.filter(oc => oc.status === "open").length;

    text = `📊 Resumo Geral das Operações:\n\n🏢 Unidades Ativas: ${activeUnits} de ${units.length}\n\n📋 Não Conformidades em Aberto: ${openNcTotal}\n📌 Planos de Ação Pendentes: ${pendingApTotal}\n⚠️ Ocorrências Abertas: ${openOccTotal}\n\n${openNcTotal + pendingApTotal + openOccTotal === 0 ? "✅ Operação sem pendências críticas no momento." : "⚡ Atenção às pendências listadas acima para manter a conformidade operacional."}`;
  } else if (lowerInput.includes("higiene") || lowerInput.includes("limpeza")) {
    text = "Aqui está um modelo sugerido para Checklist de Higiene e Sanitização Periódica:";
    checklistTemplate = {
      title: "Higiene Periódica Cozinha",
      sector: "Cozinha Central",
      questions: [
        { title: "Sanitização de ralos e grelhas com cloro", type: "checkbox" },
        { title: "Higienização interna das câmaras frias", type: "checkbox" },
        { title: "Remoção de gordura das coifas e filtros", type: "checkbox" },
        { title: "Registro fotográfico das coifas pós-limpeza", type: "photo" },
      ],
    };
  } else if (lowerInput.includes("abertura") || lowerInput.includes("fechamento")) {
    text = "Aqui está um modelo sugerido para Checklist de Abertura / Fechamento Operacional:";
    checklistTemplate = {
      title: "Abertura de Salão e Caixa",
      sector: "Atendimento",
      questions: [
        { title: "Conferir fundo de caixa operacional", type: "checkbox" },
        { title: "Ligar sistemas de som, luzes e ar condicionado", type: "checkbox" },
        { title: "Verificar limpeza das louças e talheres expostos", type: "checkbox" },
        { title: "Digitar valor do sangria inicial", type: "text" },
      ],
    };
  }

  return {
    text,
    checklistTemplate,
    dataSource: `Dados locais em ${new Date().toLocaleDateString("pt-BR")}`,
    isFallback: true,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Server Action principal
// ─────────────────────────────────────────────────────────────────────────────

export async function askAIAction(
  prompt: string,
  context: AIContext,
  customApiKey?: string
): Promise<AIResponse> {
  const apiKey = customApiKey?.trim() || process.env.GEMINI_API_KEY;

  // Se não houver chave, usar fallback
  if (!apiKey) {
    console.warn("[askAIAction] GEMINI_API_KEY não configurada. Usando fallback.");
    return buildFallbackResponse(prompt, context);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const systemPrompt = buildSystemPrompt(context);

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            { text: systemPrompt + "\n\nPERGUNTA DO USUÁRIO: " + prompt }
          ],
        },
      ],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 1500,
        responseMimeType: "application/json",
      },
    });

    const rawText = result.response.text().trim();

    // Tentar parsear o JSON retornado pelo Gemini
    let parsed: {
      text?: string;
      dataSource?: string;
      checklistTemplate?: {
        title: string;
        sector: string;
        questions: { title: string; type: string }[];
      };
    } = {};

    try {
      // O Gemini pode retornar o JSON envolto em ```json ... ```
      const jsonMatch = rawText.match(/```json\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : rawText;
      parsed = JSON.parse(jsonStr);
    } catch {
      // Se o parse falhar, usar o texto raw como resposta
      return {
        text: rawText || "Não foi possível processar a resposta da IA.",
        dataSource: `Dados do sistema em ${new Date().toLocaleDateString("pt-BR")}`,
      };
    }

    // Validar e mapear os tipos das perguntas do checklist
    const validTypes: QuestionType[] = ["checkbox", "text", "photo"];
    const checklistTemplate = parsed.checklistTemplate
      ? {
          title: parsed.checklistTemplate.title,
          sector: parsed.checklistTemplate.sector,
          questions: parsed.checklistTemplate.questions.map(q => ({
            title: q.title,
            type: (validTypes.includes(q.type as QuestionType) ? q.type : "checkbox") as QuestionType,
          })),
        }
      : undefined;

    return {
      text: parsed.text || "Resposta processada pela IA.",
      dataSource: parsed.dataSource || `Dados do sistema em ${new Date().toLocaleDateString("pt-BR")}`,
      checklistTemplate,
      isFallback: false,
    };
  } catch (error) {
    console.error("[askAIAction] Erro ao chamar a API Gemini:", error);
    // Retornar fallback gracioso em vez de travar
    return {
      text: "⚠️ Não foi possível conectar ao assistente de IA no momento. Verifique sua conexão e tente novamente.",
      dataSource: `Dados locais em ${new Date().toLocaleDateString("pt-BR")}`,
      isFallback: true,
    };
  }
}
