import React, { useState } from 'react';
import {
  FileText,
  UploadCloud,
  CheckCircle2,
  Trash2,
  RefreshCw,
  Sparkles,
  Shield,
  Layers,
  Award,
  Target,
  Briefcase,
  AlertCircle,
  Copy,
  Download,
  Search,
  ArrowRight,
  TrendingUp,
  FileCheck,
} from 'lucide-react';
import { ResumeProfile, AtsOptimizationResult } from '../../types';
import { api } from '../../services/api';

interface ResumeAtsSectionProps {
  resume: ResumeProfile | null;
  onUploadResume: (file: File) => Promise<void>;
  onDeleteResume: () => Promise<void>;
  isUploading: boolean;
}

export const ResumeAtsSection: React.FC<ResumeAtsSectionProps> = ({
  resume,
  onUploadResume,
  onDeleteResume,
  isUploading,
}) => {
  const [atsResult, setAtsResult] = useState<AtsOptimizationResult | null>(null);
  const [isOptimizingAts, setIsOptimizingAts] = useState(false);
  const [targetJobText, setTargetJobText] = useState('');
  const [copiedResume, setCopiedResume] = useState(false);
  const [activeResumeView, setActiveResumeView] = useState<'ANALYSIS' | 'ATS_REVISION'>('ANALYSIS');

  const handleRunAts = async () => {
    if (!resume) return;
    setIsOptimizingAts(true);
    try {
      const res = await api.optimizeAts(targetJobText.trim() || undefined);
      setAtsResult(res.atsResult);
      setActiveResumeView('ATS_REVISION');
    } catch (err: any) {
      alert(`Erro na otimização ATS: ${err.message}`);
    } finally {
      setIsOptimizingAts(false);
    }
  };

  const handleCopyRevised = () => {
    if (!atsResult) return;
    navigator.clipboard.writeText(atsResult.revisedResumeMarkdown);
    setCopiedResume(true);
    setTimeout(() => setCopiedResume(false), 2000);
  };

  const handleDownloadDoc = (docType: 'Resume_Analysis.md' | 'ATS_Optimization_Report.md') => {
    window.open(`/api/reports/download-document/${docType}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-[#141822] via-[#161c28] to-[#12151e] border border-[#262f3f] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#a3e635]/15 text-[#a3e635] text-[11px] font-mono font-bold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            RESUME INTELLIGENCE & ATS OPTIMIZER
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Análise Rápida de Competências e Otimização para ATS
          </h2>
          <p className="text-xs text-zinc-300 mt-1 max-w-2xl">
            Extração veloz com cache SHA-256, distinção de competências comprovadas e geração de currículo ajustado para triagens automatizadas.
          </p>
        </div>

        {resume && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleDownloadDoc('Resume_Analysis.md')}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#1a212e] hover:bg-[#232d3f] text-zinc-200 border border-zinc-700 transition-all flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-[#a3e635]" />
              Baixar Análise (.MD)
            </button>
            {atsResult && (
              <button
                onClick={() => handleDownloadDoc('ATS_Optimization_Report.md')}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition-all flex items-center gap-1.5 shadow"
              >
                <Download className="w-3.5 h-3.5" />
                Baixar Relatório ATS (.MD)
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main Grid: Upload & Profile vs ATS Optimizer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col (5 cols): Resume Upload & Competency Breakdown */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-2xl bg-[#11141c] border border-[#212735] space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <span className="text-xs font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#a3e635]" />
                Arquivo de Currículo
              </span>
              {resume && (
                <button
                  onClick={onDeleteResume}
                  className="text-xs text-rose-400 hover:underline flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remover
                </button>
              )}
            </div>

            {!resume ? (
              <div className="p-8 border-2 border-dashed border-[#262f3f] rounded-xl text-center space-y-3 bg-[#0c0f15]">
                <UploadCloud className="w-8 h-8 text-[#a3e635] mx-auto" />
                <p className="text-xs font-semibold text-white">
                  Envie seu currículo (PDF, DOCX ou TXT)
                </p>
                <p className="text-[11px] text-zinc-400">
                  Processamento instantâneo com hash de cache e Gemini 3.8 Flash.
                </p>
                <label className="inline-block px-4 py-2 rounded-xl text-xs font-bold bg-[#a3e635] text-zinc-950 cursor-pointer hover:bg-[#bef264] transition-all">
                  {isUploading ? 'Processando...' : 'Selecionar Arquivo'}
                  <input
                    type="file"
                    accept=".pdf,.docx,.txt,.md"
                    className="hidden"
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) onUploadResume(f);
                    }}
                  />
                </label>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-[#0d1017] border border-zinc-800 flex items-center justify-between">
                  <div>
                    <strong className="text-white block">{resume.fileName}</strong>
                    <span className="text-zinc-500 font-mono text-[10px]">
                      {(resume.fileSize / 1024).toFixed(1)} KB • {resume.candidateName}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#a3e635]/15 text-[#a3e635] font-semibold">
                    {resume.seniorityLevel}
                  </span>
                </div>

                {/* Verified Skills */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-mono font-bold uppercase text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Competências Comprovadas ({resume.verifiedSkills.length})
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {resume.verifiedSkills.map((s, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-emerald-950/30 text-emerald-300 border border-emerald-800/40 font-mono text-[10px]">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Inferred Skills */}
                {resume.inferredSkills && resume.inferredSkills.length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    <span className="text-[11px] font-mono font-bold uppercase text-sky-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                      Competências Inferidas ({resume.inferredSkills.length})
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {resume.inferredSkills.map((s, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-sky-950/30 text-sky-300 border border-sky-800/40 font-mono text-[10px]">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Development Opportunities */}
                {resume.developmentOpportunities && resume.developmentOpportunities.length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    <span className="text-[11px] font-mono font-bold uppercase text-amber-400 flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                      Oportunidades de Desenvolvimento ({resume.developmentOpportunities.length})
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {resume.developmentOpportunities.map((s, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-amber-950/30 text-amber-300 border border-amber-800/40 font-mono text-[10px]">
                          + {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Col (7 cols): ATS Resume Optimizer & Action Plan */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-5 rounded-2xl bg-[#11141c] border border-[#212735] space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Otimizador ATS (Applicant Tracking Systems)
                </h3>
              </div>
              {atsResult && (
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-zinc-400 font-mono">Score ATS:</span>
                  <span className="text-base font-bold font-mono text-[#a3e635]">
                    {atsResult.overallScore}/100
                  </span>
                </div>
              )}
            </div>

            {/* Target Job Input */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-300 flex items-center justify-between">
                <span>Descrição da Vaga Alvo (Opcional para calibração personalizada):</span>
                <span className="text-[10px] text-zinc-500 font-mono">Adaptação sob medida</span>
              </label>
              <textarea
                value={targetJobText}
                onChange={e => setTargetJobText(e.target.value)}
                placeholder="Cole aqui os requisitos ou a descrição da vaga desejada para alinhar palavras-chave e priorizar conquistas..."
                rows={3}
                className="w-full bg-[#161a24] border border-[#262d3c] rounded-xl p-3 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-[#a3e635]"
              />

              <button
                onClick={handleRunAts}
                disabled={!resume || isOptimizingAts}
                className="w-full py-2.5 rounded-xl font-bold text-xs bg-[#a3e635] hover:bg-[#bef264] text-zinc-950 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isOptimizingAts ? 'animate-spin' : ''}`} />
                {isOptimizingAts ? 'Otimizando e Calculando Compatibilidade ATS...' : 'Otimizar Currículo para Sistemas ATS'}
              </button>
            </div>

            {/* ATS Results View */}
            {atsResult && (
              <div className="space-y-5 pt-3 border-t border-zinc-800/80">
                {/* Score breakdown bars */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
                  <div className="p-2.5 rounded-xl bg-[#141822] border border-zinc-800">
                    <span className="text-[10px] text-zinc-400 block font-mono">Formatação</span>
                    <strong className="text-white font-mono text-sm">{atsResult.criteriaBreakdown.formattingAndStructure}%</strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#141822] border border-zinc-800">
                    <span className="text-[10px] text-zinc-400 block font-mono">Impacto Quant.</span>
                    <strong className="text-white font-mono text-sm">{atsResult.criteriaBreakdown.quantifiedImpact}%</strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#141822] border border-zinc-800">
                    <span className="text-[10px] text-zinc-400 block font-mono">Palavras-chave</span>
                    <strong className="text-white font-mono text-sm">{atsResult.criteriaBreakdown.keywordDensity}%</strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#141822] border border-zinc-800">
                    <span className="text-[10px] text-zinc-400 block font-mono">Clareza Técnica</span>
                    <strong className="text-white font-mono text-sm">{atsResult.criteriaBreakdown.technicalClarity}%</strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#141822] border border-zinc-800 col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-zinc-400 block font-mono">Leitura ATS</span>
                    <strong className="text-emerald-400 font-mono text-sm">{atsResult.criteriaBreakdown.atsReadability}%</strong>
                  </div>
                </div>

                {/* Problems identified */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-zinc-300 block">
                    Problemas Identificados & Recomendações ({atsResult.problemsIdentified.length})
                  </span>
                  <div className="space-y-2">
                    {atsResult.problemsIdentified.map((prob, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-[#141824] border border-zinc-800 text-xs space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${prob.severity === 'HIGH' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                            {prob.severity}
                          </span>
                          <strong className="text-white">{prob.issue}</strong>
                        </div>
                        <p className="text-zinc-400 text-[11px] pl-2 border-l border-zinc-700">
                          {prob.recommendation}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Revised Resume Preview */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#a3e635]" />
                      Currículo Revisado & Otimizado para ATS
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCopyRevised}
                        className="px-2.5 py-1 rounded bg-[#1e2534] hover:bg-[#283247] text-zinc-200 border border-zinc-700 text-xs font-medium flex items-center gap-1"
                      >
                        {copiedResume ? <CheckCircle2 className="w-3 h-3 text-[#a3e635]" /> : <Copy className="w-3 h-3" />}
                        {copiedResume ? 'Copiado!' : 'Copiar'}
                      </button>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#090b0e] border border-zinc-800 text-xs font-mono text-zinc-300 max-h-64 overflow-y-auto whitespace-pre-wrap leading-relaxed select-text">
                    {atsResult.revisedResumeMarkdown}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
