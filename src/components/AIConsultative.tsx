import { useState, useEffect, RefObject } from "react";
import {
  Brain,
  User,
  ArrowLeft,
  Camera,
  CheckSquare,
  PlusCircle,
  ThumbsUp,
  Copy,
  Loader2,
  Key,
  CheckCircle2,
  X,
  ShieldCheck
} from "lucide-react";
import { ChatMessage } from "@/types";

interface AIConsultativeProps {
  chatMessages: ChatMessage[];
  chatInput: string;
  setChatInput: (val: string) => void;
  chatBottomRef: RefObject<HTMLDivElement>;
  handleSendChatMessage: (apiKeyOverride?: string) => void;
  handleConvertTemplate: (template: ChatMessage["checklistTemplate"]) => void;
  isAILoading: boolean;
}

export default function AIConsultative({
  chatMessages,
  chatInput,
  setChatInput,
  chatBottomRef,
  handleSendChatMessage,
  handleConvertTemplate,
  isAILoading
}: AIConsultativeProps) {
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    const savedKey = localStorage.getItem("checkrest_gemini_api_key") || "";
    setGeminiApiKey(savedKey);
  }, []);

  const handleSaveApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("checkrest_gemini_api_key", geminiApiKey.trim());
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      setApiKeyModalOpen(false);
    }, 1200);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 animate-fadeIn h-[calc(100vh-12rem)]">
      
      {/* Central Chat Interface */}
      <div className="flex-1 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-[#131b2e] text-white p-1.5 rounded-lg">
              <Brain className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Assistente de Operações</h3>
              <p className="text-[10px] text-slate-400">IA Consultiva CheckRest v2.4</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setApiKeyModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-lg text-xs font-bold transition-all shadow-sm"
              title="Configurar Google Gemini API Key"
            >
              <Key className="w-3.5 h-3.5 text-indigo-600" />
              {geminiApiKey ? "Chave IA Ativa" : "Configurar API Key"}
            </button>

            {isAILoading ? (
              <span className="flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-bold">
                <Loader2 className="w-3 h-3 animate-spin" />
                Processando...
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                Conectado
              </span>
            )}
          </div>
        </div>

        {/* Messages List Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {chatMessages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-[85%] ${msg.sender === "user" ? "ml-auto flex-row-reverse" : ""}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                msg.sender === "user" ? "bg-slate-200 text-slate-700" : "bg-[#131b2e] text-white"
              }`}>
                {msg.sender === "user" ? <User className="w-4 h-4" /> : <Brain className="w-4 h-4 text-emerald-400" />}
              </div>

              <div className={`p-4 rounded-xl shadow-sm border ${
                msg.sender === "user"
                  ? "bg-[#131b2e] text-white border-[#131b2e] rounded-tr-none"
                  : "bg-white text-slate-800 border-slate-200 rounded-tl-none"
              }`}>
                <p className="text-xs font-semibold leading-relaxed whitespace-pre-line">{msg.text}</p>

                {/* Rendering checklist suggestions inside AI bubble */}
                {msg.checklistTemplate && (
                  <div className="mt-4 bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-3 text-slate-800">
                    <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                      <div>
                        <h4 className="text-xs font-extrabold text-slate-700">
                          {msg.checklistTemplate.title}
                        </h4>
                        <span className="text-[9px] bg-slate-200 text-slate-600 font-bold px-1.5 py-0.2 rounded uppercase">
                          {msg.checklistTemplate.sector}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-bold">
                        {msg.checklistTemplate.questions.length} itens
                      </span>
                    </div>

                    <div className="space-y-2">
                      {msg.checklistTemplate.questions.map((q, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-[11px] font-medium text-slate-600 bg-white p-2 rounded border border-slate-100 shadow-sm">
                          <span className="text-[#006c49] mt-0.5">
                            {q.type === "photo" ? <Camera className="w-3.5 h-3.5" /> : <CheckSquare className="w-3.5 h-3.5" />}
                          </span>
                          <span>{q.title}</span>
                        </div>
                      ))}
                    </div>

                    {/* Convert Action Button inside the AI response */}
                    <button
                      onClick={() => handleConvertTemplate(msg.checklistTemplate!)}
                      className="w-full mt-3 py-2 bg-gradient-to-r from-emerald-600 to-[#006c49] hover:opacity-90 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm shadow-emerald-800/10"
                    >
                      <PlusCircle className="w-4 h-4" />
                      Converter em Checklist Ativo
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {/* Balão de digitação animado */}
          {isAILoading && (
            <div className="flex gap-3 max-w-[85%]">
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm bg-[#131b2e] text-white">
                <Brain className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="p-4 rounded-xl shadow-sm border bg-white text-slate-800 border-slate-200 rounded-tl-none flex items-center gap-2">
                <span className="flex gap-1 items-center">
                  <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "0ms" }}></span>
                  <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "150ms" }}></span>
                  <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "300ms" }}></span>
                </span>
                <span className="text-xs text-slate-400 font-medium">IA analisando dados...</span>
              </div>
            </div>
          )}
          <div ref={chatBottomRef}></div>
        </div>

        {/* Input Panel */}
        <div className="p-4 border-t border-slate-200 bg-white">
          <div className={`flex gap-2 border rounded-xl p-1 shadow-inner transition-colors ${
            isAILoading ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-slate-50"
          }`}>
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !isAILoading && handleSendChatMessage()}
              placeholder={isAILoading ? "Aguarde, a IA está processando..." : "Pergunte algo à IA Consultiva... Ex: Crie um checklist de higiene"}
              disabled={isAILoading}
              className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-2 px-3 placeholder:text-slate-400 disabled:opacity-60 disabled:cursor-not-allowed"
            />
            <button
              onClick={handleSendChatMessage}
              disabled={isAILoading}
              className="bg-[#131b2e] hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white p-2.5 rounded-lg flex items-center justify-center transition-colors shadow-sm"
            >
              {isAILoading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <ArrowLeft className="w-4 h-4 rotate-180" />}
            </button>
          </div>
          {isAILoading && (
            <p className="text-[10px] text-amber-600 text-center mt-2 font-medium">✨ Gemini está analisando os dados operacionais...</p>
          )}
        </div>
      </div>

      {/* Contextual SideBar (Right Side of Chat) */}
      <aside className="w-full lg:w-80 bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between shadow-sm">
        <div className="space-y-6">
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Sugestão Contextual</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Se você precisa estruturar boas práticas ou conformidade de cozinha, digite as especificidades do seu turno. A IA gerará o template imediatamente.
            </p>
          </div>

          <div className="space-y-3 border-t border-slate-100 pt-4">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">Modelos Prontos por Chat</h4>
            
            <button
              onClick={() => setChatInput("Crie um checklist de higiene para áreas frias")}
              className="w-full text-left p-3 border border-slate-100 rounded-lg hover:border-[#131b2e] hover:bg-slate-50 transition-all group shadow-sm bg-white"
            >
              <span className="block text-xs font-bold text-slate-700 group-hover:text-[#131b2e]">
                Higiene de Áreas Frias
              </span>
              <span className="block text-[10px] text-slate-400 mt-0.5">Gerar modelo de sanitização periódica.</span>
            </button>

            <button
              onClick={() => setChatInput("Crie um checklist de abertura para atendentes do salão")}
              className="w-full text-left p-3 border border-slate-100 rounded-lg hover:border-[#131b2e] hover:bg-slate-50 transition-all group shadow-sm bg-white"
            >
              <span className="block text-xs font-bold text-slate-700 group-hover:text-[#131b2e]">
                Abertura de Salão
              </span>
              <span className="block text-[10px] text-slate-400 mt-0.5">Conferência de caixas, luzes e mesas.</span>
            </button>
          </div>

          <div className="space-y-3 border-t border-slate-100 pt-4">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">Consultas Operacionais</h4>
            
            <button
              onClick={() => setChatInput("Como está o andamento da unidade de Jardim?")}
              className="w-full text-left p-3 border border-slate-100 rounded-lg hover:border-[#131b2e] hover:bg-slate-50 transition-all group shadow-sm bg-white"
            >
              <span className="block text-xs font-bold text-slate-700 group-hover:text-[#131b2e]">
                Andamento da Unidade Jardim
              </span>
              <span className="block text-[10px] text-slate-400 mt-0.5">Ver status, progresso e checklists de Jardins.</span>
            </button>

            <button
              onClick={() => setChatInput("Me dê um resumo das operações de hoje")}
              className="w-full text-left p-3 border border-slate-100 rounded-lg hover:border-[#131b2e] hover:bg-slate-50 transition-all group shadow-sm bg-white"
            >
              <span className="block text-xs font-bold text-slate-700 group-hover:text-[#131b2e]">
                Resumo Geral das Operações
              </span>
              <span className="block text-[10px] text-slate-400 mt-0.5">Ver conformidade média e pendências.</span>
            </button>

            <button
              onClick={() => setChatInput("Qual o histórico de checklists realizados?")}
              className="w-full text-left p-3 border border-slate-100 rounded-lg hover:border-[#131b2e] hover:bg-slate-50 transition-all group shadow-sm bg-white"
            >
              <span className="block text-xs font-bold text-slate-700 group-hover:text-[#131b2e]">
                Histórico Recente
              </span>
              <span className="block text-[10px] text-slate-400 mt-0.5">Visualizar log de envios e conformidade.</span>
            </button>
          </div>
        </div>

        <div className="mt-8 border-t border-slate-100 pt-4 text-center">
          <div className="flex justify-center gap-4 text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span className="flex items-center gap-1 hover:text-slate-600 cursor-pointer">
              <ThumbsUp className="w-3.5 h-3.5" /> Like
            </span>
            <span 
              onClick={() => {
                navigator.clipboard.writeText("https://checkrest.com/ai");
                alert("Link copiado!");
              }} 
              className="flex items-center gap-1 hover:text-slate-600 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" /> Share
            </span>
          </div>
        </div>
      </aside>

      {/* Modal para inserção da Chave Gemini API */}
      {apiKeyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 relative">
            <button
              onClick={() => setApiKeyModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 mb-2">
                <Key className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Configuração da API Key (Google Gemini)</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Insira a sua chave do <strong>Google Gemini AI</strong> para habilitar respostas em tempo real com inteligência artificial avançada.
              </p>
            </div>

            {savedSuccess ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-800 space-y-1 text-xs">
                <div className="flex items-center gap-2 font-bold text-sm text-emerald-700">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  Chave Gemini salva com sucesso!
                </div>
                <p className="text-emerald-700">
                  Sua chave da API do Gemini foi armazenada com segurança e está ativa para suas consultas.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSaveApiKey} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                    Google Gemini API Key
                  </label>
                  <input
                    type="password"
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full border border-slate-200 focus:ring-2 focus:ring-indigo-500 rounded-xl py-2.5 px-3 text-xs font-mono text-slate-800 placeholder:text-slate-400"
                  />
                  <p className="text-[10px] text-slate-400 pt-1">
                    Você pode gerar uma chave gratuita acessando{" "}
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 underline font-bold"
                    >
                      aistudio.google.com
                    </a>
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setApiKeyModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs transition-all shadow-md shadow-indigo-500/10"
                  >
                    Salvar Chave
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
