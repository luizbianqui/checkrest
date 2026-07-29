"use client";

import { useState, useMemo } from "react";
import {
  FolderOpen,
  Plus,
  Trash2,
  Calendar,
  Clock,
  Shield,
  Search,
  Filter,
  AlertTriangle,
  FolderPlus
} from "lucide-react";
import { CompanyDocument, Unit, User as UserType } from "@/types";
import { createDocumentAction, deleteDocumentAction } from "@/app/actions/dbActions";

interface DocumentsManagerProps {
  documents: CompanyDocument[];
  setDocuments: React.Dispatch<React.SetStateAction<CompanyDocument[]>>;
  units: Unit[];
  currentUser: UserType | null;
  dbConnected: boolean | null;
}

export default function DocumentsManager({
  documents,
  setDocuments,
  units,
  currentUser,
  dbConnected
}: DocumentsManagerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("Todas");
  
  // Add Document form states
  const [isAddDocOpen, setIsAddDocOpen] = useState(false);
  const [docTitle, setDocTitle] = useState("");
  const [docDescription, setDocDescription] = useState("");
  const [docCategory, setDocCategory] = useState("Manual");
  const [docVersion, setDocVersion] = useState("1.0");
  const [docExpirationDate, setDocExpirationDate] = useState("");
  const [docUnitId, setDocUnitId] = useState("Global");
  const [uploading, setUploading] = useState(false);

  const handleAddDocument = async () => {
    if (!docTitle.trim()) {
      alert("Preencha o título do documento.");
      return;
    }

    const companyId = currentUser?.companyId || "comp-1";
    const unitId = docUnitId === "Global" ? null : docUnitId;
    const expirationDate = docExpirationDate ? new Date(docExpirationDate) : null;

    setUploading(true);

    if (dbConnected) {
      const res = await createDocumentAction({
        companyId,
        unitId,
        title: docTitle,
        description: docDescription,
        category: docCategory,
        fileUrl: "https://www.anvisa.gov.br/servicos/reblas/documentos/pop.pdf", // Mock/default fallback
        version: docVersion,
        expirationDate: expirationDate,
        performedByUserId: currentUser?.id
      });
      if (res.success && res.data) {
        const added = res.data as CompanyDocument;
        
        // Add unit display details
        added.unit = unitId ? { name: units.find(u => u.id === unitId)?.name || "Filial" } : null;

        setDocuments(prev => [added, ...prev]);
        setIsAddDocOpen(false);
        setDocTitle("");
        setDocDescription("");
        setDocVersion("1.0");
        setDocExpirationDate("");
        setUploading(false);
        alert("Documento cadastrado com sucesso!");
        return;
      } else {
        alert("Erro ao cadastrar documento: " + res.error);
        setUploading(false);
        return;
      }
    }

    // Local / Offline fallback
    const newDoc: CompanyDocument = {
      id: "doc-" + Date.now(),
      companyId,
      unitId,
      title: docTitle,
      description: docDescription,
      category: docCategory,
      fileUrl: "https://www.anvisa.gov.br/servicos/reblas/documentos/pop.pdf",
      version: docVersion,
      expirationDate: expirationDate ? expirationDate.toISOString() : null,
      status: expirationDate && expirationDate < new Date() ? "expired" : "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      unit: unitId ? { name: units.find(u => u.id === unitId)?.name || "Filial" } : null
    };

    setDocuments(prev => [newDoc, ...prev]);

    // Save to localStorage too
    const savedDocs = localStorage.getItem("checkrest_documents");
    const docsList = savedDocs ? JSON.parse(savedDocs) : [];
    docsList.unshift(newDoc);
    localStorage.setItem("checkrest_documents", JSON.stringify(docsList));

    setIsAddDocOpen(false);
    setDocTitle("");
    setDocDescription("");
    setDocVersion("1.0");
    setDocExpirationDate("");
    setUploading(false);
    alert("Documento cadastrado localmente!");
  };

  const handleDeleteDocument = async (id: string) => {
    if (!confirm("Tem certeza que deseja remover este documento?")) return;

    if (dbConnected) {
      const res = await deleteDocumentAction(id, currentUser?.id);
      if (res.success) {
        setDocuments(prev => prev.filter(d => d.id !== id));
        alert("Documento removido com sucesso!");
        return;
      } else {
        alert("Erro ao remover documento: " + res.error);
        return;
      }
    }

    // Local fallback
    setDocuments(prev => prev.filter(d => d.id !== id));
    
    // Save to localStorage too
    const savedDocs = localStorage.getItem("checkrest_documents");
    if (savedDocs) {
      const list = JSON.parse(savedDocs);
      const updated = list.filter((d: any) => d.id !== id);
      localStorage.setItem("checkrest_documents", JSON.stringify(updated));
    }

    alert("Documento removido localmente!");
  };

  // Filtered List
  const filteredDocs = useMemo(() => {
    return documents.filter(doc => {
      const matchSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (doc.description && doc.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchCategory = selectedCategoryFilter === "Todas" || doc.category === selectedCategoryFilter;
      return matchSearch && matchCategory;
    });
  }, [documents, searchQuery, selectedCategoryFilter]);

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Biblioteca de POPs & Documentos</h2>
          <p className="text-slate-500 text-sm mt-1">Gerencie os Procedimentos Operacionais Padrão (POPs), licenças da Vigilância Sanitária e documentos operacionais das unidades.</p>
        </div>

        <button
          onClick={() => setIsAddDocOpen(true)}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#131b2e] hover:bg-slate-800 text-white rounded-lg font-bold text-xs uppercase shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          Cadastrar Documento
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
        <div className="flex items-center w-full md:w-80 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus-within:ring-1 focus-within:ring-slate-900">
          <Search className="w-4 h-4 text-slate-400 mr-2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por título ou descrição..."
            className="bg-transparent border-none focus:ring-0 text-xs w-full py-0.5"
          />
        </div>
        <select
          value={selectedCategoryFilter}
          onChange={(e) => setSelectedCategoryFilter(e.target.value)}
          className="border-slate-200 focus:ring-1 focus:ring-slate-900 rounded-lg text-xs py-1.5 px-3 cursor-pointer text-slate-700 font-semibold w-full md:w-auto"
        >
          <option value="Todas">Categorias: Todas</option>
          <option value="Manual">Manual</option>
          <option value="POP">Procedimento Operacional Padrão (POP)</option>
          <option value="Licença">Licença / Alvará</option>
          <option value="Outro">Outro</option>
        </select>
      </div>

      {/* Add Doc Modal */}
      {isAddDocOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-scaleUp">
            <div className="px-6 py-4 bg-[#131b2e] text-white flex justify-between items-center">
              <h3 className="font-extrabold text-sm uppercase tracking-wider">Cadastrar Novo Documento</h3>
              <button onClick={() => setIsAddDocOpen(false)} className="text-white hover:text-slate-300">
                <FolderPlus className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs font-semibold text-slate-600">
              <div className="space-y-1">
                <label>Título do Documento</label>
                <input
                  type="text"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="Ex: Alvará de Funcionamento 2026"
                  className="w-full border-slate-200 focus:ring-1 focus:ring-slate-900 rounded-lg text-xs py-2 px-3 text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label>Categoria</label>
                  <select
                    value={docCategory}
                    onChange={(e) => setDocCategory(e.target.value)}
                    className="w-full border-slate-200 focus:ring-1 focus:ring-slate-900 rounded-lg text-xs py-2 px-3 text-slate-800 cursor-pointer"
                  >
                    <option value="Manual">Manual</option>
                    <option value="POP">Procedimento Operacional Padrão (POP)</option>
                    <option value="Licença">Licença / Alvará</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label>Versão</label>
                  <input
                    type="text"
                    value={docVersion}
                    onChange={(e) => setDocVersion(e.target.value)}
                    className="w-full border-slate-200 focus:ring-1 focus:ring-slate-900 rounded-lg text-xs py-2 px-3 text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label>Abrangência (Unidade)</label>
                  <select
                    value={docUnitId}
                    onChange={(e) => setDocUnitId(e.target.value)}
                    className="w-full border-slate-200 focus:ring-1 focus:ring-slate-900 rounded-lg text-xs py-2 px-3 text-slate-800 cursor-pointer"
                  >
                    <option value="Global">Todas as Unidades (Global)</option>
                    {units.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label>Data de Vencimento</label>
                  <input
                    type="date"
                    value={docExpirationDate}
                    onChange={(e) => setDocExpirationDate(e.target.value)}
                    className="w-full border-slate-200 focus:ring-1 focus:ring-slate-900 rounded-lg text-xs py-2 px-3 text-slate-800 cursor-pointer"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label>Descrição / Observações</label>
                <textarea
                  value={docDescription}
                  onChange={(e) => setDocDescription(e.target.value)}
                  placeholder="Observações complementares sobre o documento..."
                  rows={2}
                  className="w-full border-slate-200 focus:ring-1 focus:ring-slate-900 rounded-lg text-xs py-2 px-3 text-slate-800 font-medium"
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setIsAddDocOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 font-bold hover:bg-slate-100"
                disabled={uploading}
              >
                Cancelar
              </button>
              <button
                onClick={handleAddDocument}
                className="px-4 py-2 bg-[#131b2e] hover:bg-slate-800 text-white rounded-lg font-bold disabled:opacity-50"
                disabled={uploading}
              >
                {uploading ? "Salvando..." : "Cadastrar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Documents List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDocs.map(doc => (
          <div
            key={doc.id}
            className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-start">
                <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded text-[9px] font-black uppercase tracking-wider">
                  {doc.category}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">v{doc.version}</span>
              </div>

              <div className="mt-3">
                <h3 className="font-extrabold text-slate-800 text-sm leading-snug">{doc.title}</h3>
                <p className="text-slate-500 text-xs mt-1.5 leading-relaxed">{doc.description}</p>
              </div>

              {doc.expirationDate && (
                <div className="mt-4 flex items-center gap-1.5 text-[10px] font-bold text-amber-600 bg-amber-50/50 p-2 rounded border border-amber-100/30">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Vence em: {new Date(doc.expirationDate).toLocaleDateString()}</span>
                </div>
              )}

              <div className="mt-3 text-[10px] text-slate-400 font-bold">
                Unidade: {doc.unit?.name || "Global (Todas as Unidades)"}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between text-[10px]">
              <a
                href={doc.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold uppercase text-[9px] transition-colors"
              >
                Visualizar POP
              </a>

              <button
                onClick={() => handleDeleteDocument(doc.id)}
                className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                title="Deletar documento"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
        {filteredDocs.length === 0 && (
          <div className="col-span-full bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400 text-xs italic">
            Nenhum documento encontrado.
          </div>
        )}
      </div>
    </div>
  );
}
