import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import {
  FileText,
  Download,
  Settings,
  Sparkles,
  Eye,
  CheckCircle2,
  Trash2,
  Clock,
  Layers,
  Palette,
  Type,
  Maximize2,
  ExternalLink,
  Shield,
  FolderGit2,
  User,
  RefreshCw,
  Copy,
  Check,
  Zap,
} from 'lucide-react';
import {
  ResumeProfile,
  RepositoryItem,
  GitHubUser,
  DocumentType,
  ResumeTemplateId,
  ThemeColorId,
  FontFamilyId,
  SpacingId,
  DocLanguage,
  PdfCustomizationOptions,
  GeneratedDocHistoryItem,
  CurationAuditResponse,
} from '../../types';
import { api } from '../../services/api';

interface DocumentExportViewProps {
  resume: ResumeProfile | null;
  repos: RepositoryItem[];
  currentUser: GitHubUser | null;
}

export const DocumentExportView: React.FC<DocumentExportViewProps> = ({
  resume,
  repos,
  currentUser,
}) => {
  // Document Type selection
  const [docType, setDocType] = useState<DocumentType>('RESUME_FULL');

  // Customization Options
  const [options, setOptions] = useState<PdfCustomizationOptions>({
    template: 'PROFESSIONAL',
    themeColor: 'LIME',
    fontFamily: 'HELVETICA',
    spacing: 'BALANCED',
    language: 'PT_BR',
    isAtsStrict: false,
    includeSections: {
      summary: true,
      skills: true,
      experience: true,
      projects: true,
      education: true,
      goals: true,
    },
    customTargetJob: '',
    editableTitle: '',
    editableSummary: '',
  });

  // Editable preview fields
  const [editableName, setEditableName] = useState(
    resume?.candidateName || currentUser?.name || currentUser?.login || ''
  );
  const [editableTargetRole, setEditableTargetRole] = useState(
    resume?.seniorityLevel
      ? `${resume.seniorityLevel} Software Engineer`
      : ''
  );
  const [editableEmail, setEditableEmail] = useState('');
  const [editablePhone, setEditablePhone] = useState('');
  const [editableLocation, setEditableLocation] = useState(
    currentUser?.location || ''
  );
  const [editableSummary, setEditableSummary] = useState(
    resume?.summary || ''
  );

  // History & Generation status
  const [history, setHistory] = useState<GeneratedDocHistoryItem[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'BUILDER' | 'HISTORY'>('BUILDER');
  const [curationAudit, setCurationAudit] = useState<CurationAuditResponse | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
    loadCuration();
  }, []);

  useEffect(() => {
    if (!resume) return;
    setEditableName(value =>
      !value || value === currentUser?.name || value === currentUser?.login
        ? resume.candidateName || value
        : value
    );
    setEditableTargetRole(value => value || (resume.seniorityLevel ? `${resume.seniorityLevel} Software Engineer` : ''));
    setEditableSummary(value => value || resume.summary || '');
  }, [resume, currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    setEditableName(value => value || currentUser.name || currentUser.login || '');
    if (currentUser.location) setEditableLocation(value => value || currentUser.location || '');
  }, [currentUser]);

  const escapeHtml = (value: string) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return value.replace(/[&<>"']/g, char => entities[char] || char);
  };
  const safeFilename = (value: string) =>
    value.normalize('NFKD').replace(/[^\w.-]+/g, '_').replace(/^_+|_+$/g, '') || 'documento';

  const loadHistory = async () => {
    setIsHistoryLoading(true);
    setHistoryError(null);
    try {
      const res = await api.getDocumentsHistory();
      setHistory(res.documents);
    } catch (err) {
      console.warn('Histórico de documentos:', err);
      setHistoryError(err instanceof Error ? err.message : 'Falha ao carregar o histórico de documentos.');
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const loadCuration = async () => {
    try {
      const res = await api.getCurationAudit();
      setCurationAudit(res);
    } catch (err) {
      console.warn('Curadoria para documentos:', err);
    }
  };

  const handleDeleteHistory = async (id: string) => {
    try {
      await api.deleteDocumentHistory(id);
      setHistory(prev => prev.filter(h => h.id !== id));
      setPendingDeleteId(null);
      setFeedback({ type: 'success', text: 'Registro removido do histórico.' });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Falha ao remover documento do histórico.' });
    }
  };

  // Theme RGB palette resolver for jsPDF
  const getThemeRgb = (theme: ThemeColorId): [number, number, number] => {
    switch (theme) {
      case 'LIME':
        return [132, 204, 22]; // #84cc16
      case 'NAVY':
        return [55, 48, 163]; // #3730a3
      case 'SLATE':
        return [51, 65, 85]; // #334155
      case 'MONO':
        return [24, 24, 27]; // #18181b
    }
  };

  const getThemeHex = (theme: ThemeColorId): string => {
    switch (theme) {
      case 'LIME':
        return '#84cc16';
      case 'NAVY':
        return '#4338ca';
      case 'SLATE':
        return '#475569';
      case 'MONO':
        return '#27272a';
    }
  };

  const getFontFamilyName = (f: FontFamilyId): string => {
    switch (f) {
      case 'HELVETICA':
        return 'helvetica';
      case 'TIMES':
        return 'times';
      case 'COURIER':
        return 'courier';
    }
  };

  // ==============================================================
  // REAL PDF GENERATION VIA JSPDF
  // ==============================================================
  const generatePdfBlob = (): { doc: jsPDF; filename: string } => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = options.spacing === 'COMPACT' ? 14 : options.spacing === 'GENEROUS' ? 22 : 18;
    const contentWidth = pageWidth - margin * 2;
    const fontName = getFontFamilyName(options.fontFamily);
    const themeRgb = getThemeRgb(options.themeColor);

    let y = margin;

    const checkPageBreak = (neededHeight: number) => {
      if (y + neededHeight > pageHeight - margin - 12) {
        doc.addPage();
        y = margin;
      }
    };

    // Helper: Draw Section Title
    const drawSectionHeader = (title: string) => {
      checkPageBreak(14);
      y += 4;
      doc.setFont(fontName, 'bold');
      doc.setFontSize(11);

      if (options.isAtsStrict) {
        doc.setTextColor(30, 30, 30);
        doc.text(title.toUpperCase(), margin, y);
        y += 2;
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        doc.line(margin, y, pageWidth - margin, y);
        y += 5;
      } else {
        doc.setTextColor(themeRgb[0], themeRgb[1], themeRgb[2]);
        doc.text(title.toUpperCase(), margin, y);
        y += 2;
        doc.setDrawColor(themeRgb[0], themeRgb[1], themeRgb[2]);
        doc.setLineWidth(0.6);
        doc.line(margin, y, margin + 28, y);
        doc.setDrawColor(220, 220, 225);
        doc.setLineWidth(0.2);
        doc.line(margin + 28, y, pageWidth - margin, y);
        y += 6;
      }
    };

    // ==========================================================
    // 1. RESUME DOCUMENT
    // ==========================================================
    if (docType === 'RESUME_FULL') {
      // Name
      doc.setFont(fontName, 'bold');
      doc.setFontSize(options.template === 'MINIMALIST' ? 22 : 20);
      doc.setTextColor(20, 20, 25);
      doc.text(editableName, margin, y);
      y += 7;

      // Target Role
      doc.setFont(fontName, 'normal');
      doc.setFontSize(12);
      if (options.isAtsStrict) {
        doc.setTextColor(60, 60, 60);
      } else {
        doc.setTextColor(themeRgb[0], themeRgb[1], themeRgb[2]);
      }
      doc.text(editableTargetRole, margin, y);
      y += 6;

      // Contact info row
      doc.setFont(fontName, 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 110);
      const contactPieces = [
        editableEmail,
        editablePhone,
        editableLocation,
        currentUser?.login ? `github.com/${currentUser.login}` : '',
      ].filter(Boolean);

      const contactLine = contactPieces.join('  |  ');
      doc.text(contactLine, margin, y);
      y += 4;

      // Separator
      doc.setDrawColor(220, 225, 230);
      doc.setLineWidth(0.3);
      doc.line(margin, y, pageWidth - margin, y);
      y += 6;

      // SUMMARY SECTION
      if (options.includeSections.summary && editableSummary) {
        drawSectionHeader(options.language === 'EN' ? 'Professional Summary' : 'Resumo Profissional');
        doc.setFont(fontName, 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(50, 50, 60);

        const summaryLines = doc.splitTextToSize(editableSummary, contentWidth);
        checkPageBreak(summaryLines.length * 4.5);
        doc.text(summaryLines, margin, y);
        y += summaryLines.length * 4.5 + 4;
      }

      // TECHNICAL SKILLS SECTION
      const skillsList = resume?.verifiedSkills || [];
      if (options.includeSections.skills && skillsList.length > 0) {
        drawSectionHeader(options.language === 'EN' ? 'Technical Competencies' : 'Competências Técnicas');

        doc.setFont(fontName, 'normal');
        doc.setFontSize(9);
        doc.setTextColor(40, 40, 50);

        const skillText = skillsList.join('  ·  ');
        const skillLines = doc.splitTextToSize(skillText, contentWidth);
        checkPageBreak(skillLines.length * 4.5);
        doc.text(skillLines, margin, y);
        y += skillLines.length * 4.5 + 4;
      }

      // EXPERIENCE SECTION
      if (options.includeSections.experience && resume?.documentedExperiences && resume.documentedExperiences.length > 0) {
        drawSectionHeader(options.language === 'EN' ? 'Professional Experience' : 'Experiência Profissional');

        resume.documentedExperiences.forEach(exp => {
          checkPageBreak(20);

          doc.setFont(fontName, 'bold');
          doc.setFontSize(10.5);
          doc.setTextColor(25, 25, 30);
          doc.text(exp.role, margin, y);

          // Company & Period aligned to right
          doc.setFont(fontName, 'normal');
          doc.setFontSize(9);
          doc.setTextColor(100, 100, 110);
          const rightText = [exp.company, exp.period].filter(Boolean).join('  ·  ');
          const rightWidth = doc.getTextWidth(rightText);
          if (rightText) doc.text(rightText, pageWidth - margin - rightWidth, y);
          y += 5;

          // Bullets
          if (exp.achievements && exp.achievements.length > 0) {
            exp.achievements.forEach(bullet => {
              doc.setFont(fontName, 'normal');
              doc.setFontSize(9);
              doc.setTextColor(60, 60, 70);
              const bLines = doc.splitTextToSize(`•  ${bullet}`, contentWidth - 4);
              checkPageBreak(bLines.length * 4);
              doc.text(bLines, margin + 2, y);
              y += bLines.length * 4;
            });
            y += 2;
          }
        });
      }

      // GITHUB PROJECTS SPOTLIGHT SECTION
      if (options.includeSections.projects) {
        drawSectionHeader(options.language === 'EN' ? 'Key Projects & Open Source' : 'Projetos de Destaque & Engenharia');

        // Select top repositories
        const showcaseRepos = repos.slice(0, 4);

        showcaseRepos.forEach(r => {
          checkPageBreak(18);

          doc.setFont(fontName, 'bold');
          doc.setFontSize(10);
          doc.setTextColor(30, 30, 40);
          doc.text(r.name, margin, y);

          if (r.language) {
            doc.setFont(fontName, 'normal');
            doc.setFontSize(8.5);
            doc.setTextColor(themeRgb[0], themeRgb[1], themeRgb[2]);
            const langWidth = doc.getTextWidth(`[${r.language}]`);
            doc.text(`[${r.language}]`, pageWidth - margin - langWidth, y);
          }
          y += 4.5;

          // Description
          const desc = r.description || '';
          doc.setFont(fontName, 'normal');
          doc.setFontSize(8.5);
          doc.setTextColor(70, 70, 80);
          const descLines = doc.splitTextToSize(desc, contentWidth);
          doc.text(descLines, margin, y);
          y += descLines.length * 4;

          // GitHub Link clickable
          if (r.htmlUrl?.startsWith('https://github.com/')) {
            doc.setFont(fontName, 'normal');
            doc.setFontSize(8);
            doc.setTextColor(80, 110, 200);
            doc.textWithLink(r.htmlUrl, margin, y, { url: r.htmlUrl });
            y += 4.5;
          } else {
            y += 2;
          }
        });
      }

      // ATS KEYWORD MATRIX
      if (options.isAtsStrict && resume?.verifiedSkills?.length) {
        drawSectionHeader(options.language === 'EN' ? 'ATS Keyword Matrix' : 'Indexação de Palavras-Chave ATS');
        doc.setFont(fontName, 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 110);
        const keywords = resume.verifiedSkills.join('  ·  ');
        const kLines = doc.splitTextToSize(keywords, contentWidth);
        checkPageBreak(kLines.length * 4);
        doc.text(kLines, margin, y);
        y += kLines.length * 4 + 4;
      }
    } else if (docType === 'PORTFOLIO_SHOWCASE') {
      // ==========================================================
      // 2. PORTFOLIO SHOWCASE DOCUMENT
      // ==========================================================
      doc.setFont(fontName, 'bold');
      doc.setFontSize(22);
      doc.setTextColor(20, 20, 25);
      doc.text('PORTFÓLIO DE ENGENHARIA DE SOFTWARE', margin, y);
      y += 7;

      doc.setFont(fontName, 'normal');
      doc.setFontSize(11);
      doc.setTextColor(themeRgb[0], themeRgb[1], themeRgb[2]);
      doc.text(`Resumo de Portfólio  ·  @${currentUser?.login || 'Conta não conectada'}`, margin, y);
      y += 6;

      doc.setFont(fontName, 'normal');
      doc.setFontSize(9);
      doc.setTextColor(110, 110, 120);
      doc.text(
        `Documento gerado automaticamente pelo GitHub Intelligence AI em ${new Date().toLocaleDateString('pt-BR')}.`,
        margin,
        y
      );
      y += 8;

      // Executive intro
      drawSectionHeader('Visão Geral do Engenheiro');
      doc.setFont(fontName, 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(50, 50, 60);
      const pIntro = `${[editableName, editableTargetRole].filter(Boolean).join(' — ')}. Repositórios incluídos neste documento: ${repos.length}.`;
      const pLines = doc.splitTextToSize(pIntro, contentWidth);
      doc.text(pLines, margin, y);
      y += pLines.length * 4.5 + 6;

      // Curated Repos
      drawSectionHeader('Projetos em Destaque & Arquitetura');
      const topProjects = repos.slice(0, 6);

      topProjects.forEach((p, idx) => {
        checkPageBreak(26);

        // Project number + name
        doc.setFont(fontName, 'bold');
        doc.setFontSize(11);
        doc.setTextColor(themeRgb[0], themeRgb[1], themeRgb[2]);
        doc.text(`0${idx + 1}. ${p.name}`, margin, y);

        // Language & Stars
        doc.setFont(fontName, 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(90, 90, 100);
        const meta = `${p.language || 'Geral'}  ·  ${p.starsCount} estrelas`;
        const mWidth = doc.getTextWidth(meta);
        doc.text(meta, pageWidth - margin - mWidth, y);
        y += 5;

        // Description
        doc.setFont(fontName, 'normal');
        doc.setFontSize(9);
        doc.setTextColor(50, 50, 60);
        const d = p.description || '';
        const dLines = doc.splitTextToSize(d, contentWidth);
        doc.text(dLines, margin, y);
        y += dLines.length * 4.2;

        // URL link
        if (p.htmlUrl?.startsWith('https://github.com/')) {
          doc.setFont(fontName, 'normal');
          doc.setFontSize(8);
          doc.setTextColor(60, 90, 180);
          doc.textWithLink(`Acessar código: ${p.htmlUrl}`, margin, y, { url: p.htmlUrl });
          y += 5.5;
        } else {
          y += 3;
        }
      });
    } else {
      // ==========================================================
      // 3. TECHNICAL AUDIT & GOVERNANCE REPORT
      // ==========================================================
      doc.setFont(fontName, 'bold');
      doc.setFontSize(20);
      doc.setTextColor(20, 20, 25);
      doc.text('RELATÓRIO TÉCNICO DE AUDITORIA & MODERNIZAÇÃO', margin, y);
      y += 7;

      doc.setFont(fontName, 'normal');
      doc.setFontSize(11);
      doc.setTextColor(themeRgb[0], themeRgb[1], themeRgb[2]);
      doc.text(`Conta GitHub: @${currentUser?.login || 'Conta não conectada'}  ·  Auditoria`, margin, y);
      y += 8;

      drawSectionHeader('1. Sumário Executivo da Conta');
      doc.setFont(fontName, 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(50, 50, 60);
      const auditSummaryText = `Este documento reúne ${repos.length} repositórios carregados da conta GitHub, seus metadados disponíveis e os achados de curadoria e segurança retornados pela integração.`;
      const aLines = doc.splitTextToSize(auditSummaryText, contentWidth);
      doc.text(aLines, margin, y);
      y += aLines.length * 4.5 + 4;

      // Table of stats
      checkPageBreak(30);
      doc.setDrawColor(220, 225, 230);
      doc.setFillColor(245, 247, 250);
      doc.rect(margin, y, contentWidth, 22, 'F');

      doc.setFont(fontName, 'bold');
      doc.setFontSize(9);
      doc.setTextColor(30, 30, 40);
      doc.text(`Repositórios Carregados: ${repos.length}`, margin + 5, y + 6);
      doc.text(
        `Achados de segurança: ${repos.reduce((acc, r) => acc + (r.secrets?.length || 0), 0)}`,
        margin + 5,
        y + 12
      );
      doc.text(
        `Curadoria: ${curationAudit?.summary?.keepPublicCount || 0} públicos recomendados · ${
          curationAudit?.summary?.considerPrivateCount || 0
        } a privatizar`,
        margin + 5,
        y + 18
      );
      y += 28;

      drawSectionHeader('2. Detalhamento por Repositório');
      repos.forEach(r => {
        checkPageBreak(16);
        doc.setFont(fontName, 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(30, 30, 40);
        doc.text(r.name, margin, y);

        doc.setFont(fontName, 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(100, 100, 110);
        const st = `${r.private ? 'Privado' : 'Público'}  ·  ${r.language || 'Geral'}`;
        const sWidth = doc.getTextWidth(st);
        doc.text(st, pageWidth - margin - sWidth, y);
        y += 4.5;

        const detail = `README: ${r.hasReadme ? 'presente' : 'não identificado'}. Achados de segurança: ${r.secrets?.length || 0}. Status de PR: ${
          r.pullRequest?.status || 'sem PR registrado'
        }.`;
        const dLines = doc.splitTextToSize(detail, contentWidth);
        doc.text(dLines, margin, y);
        y += dLines.length * 4 + 3;
      });
    }

    // ==========================================================
    // FOOTER ZONE: Page Numbers on every page
    // ==========================================================
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont(fontName, 'normal');
      doc.setFontSize(8);
      doc.setTextColor(140, 140, 150);

      // Line above footer
      doc.setDrawColor(230, 230, 235);
      doc.setLineWidth(0.2);
      doc.line(margin, pageHeight - margin + 2, pageWidth - margin, pageHeight - margin + 2);

      const footerLeft = 'GitHub Intelligence AI  ·  Documento Verificado';
      doc.text(footerLeft, margin, pageHeight - margin + 6);

      const footerRight = `Página ${i} de ${totalPages}`;
      const fWidth = doc.getTextWidth(footerRight);
      doc.text(footerRight, pageWidth - margin - fWidth, pageHeight - margin + 6);
    }

    const filename =
      docType === 'RESUME_FULL'
        ? `Curriculo_${safeFilename(editableName)}.pdf`
        : docType === 'PORTFOLIO_SHOWCASE'
        ? `Portfolio_${safeFilename(currentUser?.login || 'Portfolio')}.pdf`
        : `Relatorio_Tecnico_GitHub_${safeFilename(currentUser?.login || 'Relatorio')}.pdf`;

    return { doc, filename };
  };

  // Generate & Download PDF
  const handleDownloadPdf = async () => {
    setIsGenerating(true);
    try {
      const { doc, filename } = generatePdfBlob();
      doc.save(filename);
      const pdfSize = doc.output('blob').size;

      // Save to document history
      const item = {
        title:
          docType === 'RESUME_FULL'
            ? `Currículo — ${editableName}`
            : docType === 'PORTFOLIO_SHOWCASE'
            ? `Portfólio de Engenharia`
            : `Relatório Técnico de Modernização`,
        docType: docType,
        format: 'PDF' as const,
        fileName: filename,
        fileSizeText: `${(pdfSize / 1024).toFixed(1)} KB`,
        templateUsed: options.template,
        languageUsed: options.language,
      };
      const res = await api.saveDocumentHistory(item);
      setHistory(prev => [res.item, ...prev]);
      setFeedback({ type: 'success', text: 'PDF gerado e registrado no histórico.' });
    } catch (err: any) {
      console.error('Falha ao gerar PDF:', err);
      setFeedback({ type: 'error', text: err.message || 'Falha ao gerar ou registrar o PDF.' });
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate & Download Word DOCX
  const handleDownloadDocx = async () => {
    setIsGenerating(true);
    try {
      const title =
        docType === 'RESUME_FULL'
          ? `Currículo - ${editableName}`
          : docType === 'PORTFOLIO_SHOWCASE'
          ? 'Portfólio de Engenharia'
          : 'Relatório Técnico';

      const docxHtml = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
          <head><title>${escapeHtml(title)}</title>
        <meta charset="utf-8">
        <style>
          body { font-family: Calibri, Arial, sans-serif; margin: 40px; color: #222; }
          h1 { color: #111; font-size: 24pt; margin-bottom: 4pt; }
          h2 { color: #444; font-size: 14pt; margin-top: 16pt; border-bottom: 1px solid #ccc; padding-bottom: 4pt; }
          h3 { color: #222; font-size: 11pt; margin-top: 10pt; }
          p, li { font-size: 10.5pt; line-height: 1.4; color: #333; }
          .contact { font-size: 9.5pt; color: #666; margin-bottom: 16pt; }
        </style>
        </head>
        <body>
          <h1>${escapeHtml(editableName)}</h1>
          <p style="font-size: 13pt; color: #555; margin-top: 0;">${escapeHtml(editableTargetRole)}</p>
          <p class="contact">${[editableEmail, editablePhone, editableLocation].filter(Boolean).map(escapeHtml).join(' | ')}</p>
          
          <h2>Resumo Profissional</h2>
          <p>${escapeHtml(editableSummary)}</p>
          
          <h2>Competências Técnicas</h2>
          <p>${(resume?.verifiedSkills || []).map(escapeHtml).join(' · ')}</p>
          
          <h2>Projetos em Destaque</h2>
          ${repos
            .slice(0, 5)
            .map(
              r => `
            <h3>${escapeHtml(r.name)} (${escapeHtml(r.language || '')})</h3>
            <p>${escapeHtml(r.description || '')}</p>
            ${r.htmlUrl?.startsWith('https://github.com/') ? `<p><a href="${escapeHtml(r.htmlUrl)}">${escapeHtml(r.htmlUrl)}</a></p>` : ''}
          `
            )
            .join('')}
        </body>
        </html>
      `;

      const blob = new Blob(['\ufeff', docxHtml], {
        type: 'application/msword',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const filename = `${safeFilename(title)}.docx`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);

      const item = {
        title,
        docType: docType,
        format: 'DOCX' as const,
        fileName: filename,
        fileSizeText: `${(blob.size / 1024).toFixed(1)} KB`,
        templateUsed: options.template,
        languageUsed: options.language,
      };
      const res = await api.saveDocumentHistory(item);
      setHistory(prev => [res.item, ...prev]);
      setFeedback({ type: 'success', text: 'Documento Word gerado e registrado no histórico.' });
    } catch (err: any) {
      console.error('Falha ao gerar DOCX:', err);
      setFeedback({ type: 'error', text: err.message || 'Falha ao gerar ou registrar o documento Word.' });
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate & Download Markdown
  const handleDownloadMarkdown = async () => {
    const mdContent = `# ${editableName}
**${editableTargetRole}**
${editableEmail} | ${editablePhone} | ${editableLocation}

## Resumo Profissional
${editableSummary}

## Competências Técnicas
      ${(resume?.verifiedSkills || []).map(s => `- ${s}`).join('\n')}

## Projetos em Destaque no GitHub
${repos
  .slice(0, 6)
  .map(
    r => `### [${r.name}](${r.htmlUrl})
*Linguagem:* ${r.language || 'Geral'} | *Stars:* ${r.starsCount}
     ${r.description || ''}
`
  )
  .join('\n')}
`;

    const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const filename = `Documento_${safeFilename(editableName)}.md`;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setFeedback({ type: 'success', text: 'Arquivo Markdown baixado.' });
  };

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#121724] via-[#0f131c] to-[#0c0e12] border border-[#242d3e] p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#a3e635]/10 border border-[#a3e635]/30 text-xs font-mono font-bold text-[#a3e635]">
              <FileText className="w-3.5 h-3.5" />
              CENTRAL DE DOCUMENTOS & PDF ENGINE
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Gerador de Documentos & Exportação Profissional
            </h1>
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
              Crie PDFs de alta fidelidade com texto selecionável, links clicáveis e diagramação vetorial.
              Personalize cores, tipografia, seções e modos de compatibilidade ATS para currículos e relatórios técnicos.
            </p>
          </div>

          <div role="tablist" aria-label="Personalizador e histórico de documentos" className="flex items-center gap-2 shrink-0">
            <button
              role="tab"
              id="document-builder-tab"
              aria-selected={activeTab === 'BUILDER'}
              aria-controls="document-builder-panel"
              onClick={() => setActiveTab('BUILDER')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'BUILDER'
                  ? 'bg-[#a3e635] text-zinc-950 shadow-[0_0_15px_rgba(163,230,53,0.2)]'
                  : 'bg-[#151a24] text-zinc-300 hover:text-white border border-zinc-800'
              }`}
            >
              Personalizador & Preview
            </button>
            <button
              role="tab"
              id="document-history-tab"
              aria-selected={activeTab === 'HISTORY'}
              aria-controls="document-history-panel"
              onClick={() => setActiveTab('HISTORY')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'HISTORY'
                  ? 'bg-[#a3e635] text-zinc-950 shadow-[0_0_15px_rgba(163,230,53,0.2)]'
                  : 'bg-[#151a24] text-zinc-300 hover:text-white border border-zinc-800'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Histórico ({history.length})</span>
            </button>
          </div>
        </div>
      </div>

      {feedback && (
        <div role={feedback.type === 'error' ? 'alert' : 'status'} aria-live="polite" className={`rounded-xl border p-3 text-xs ${feedback.type === 'success' ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300' : 'border-rose-500/40 bg-rose-950/30 text-rose-300'}`}>
          <div className="flex items-center justify-between gap-3">
            <span>{feedback.text}</span>
            <button type="button" onClick={() => setFeedback(null)} className="shrink-0 underline underline-offset-2">Fechar</button>
          </div>
        </div>
      )}

      {activeTab === 'BUILDER' ? (
        <div role="tabpanel" id="document-builder-panel" aria-labelledby="document-builder-tab" className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ============================================================== */}
          {/* LEFT COLUMN: CUSTOMIZER CONTROLS (5 COLS) */}
          {/* ============================================================== */}
          <div className="lg:col-span-5 space-y-6">
            {/* 1. Document Type Selector */}
            <div className="p-5 rounded-2xl bg-[#11141c] border border-[#212735] space-y-3">
              <span className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider block">
                1. Tipo de Documento
              </span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'RESUME_FULL' as const, label: 'Currículo', icon: User },
                  { id: 'PORTFOLIO_SHOWCASE' as const, label: 'Portfólio', icon: FolderGit2 },
                  { id: 'CURATION_REPORT' as const, label: 'Relatório', icon: Shield },
                ].map(item => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setDocType(item.id)}
                      className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                        docType === item.id
                          ? 'bg-[#1b2333] border-[#a3e635] text-white shadow'
                          : 'bg-[#141822] border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 ${docType === item.id ? 'text-[#a3e635]' : 'text-zinc-400'}`}
                      />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Template Selector */}
            <div className="p-5 rounded-2xl bg-[#11141c] border border-[#212735] space-y-3">
              <span className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider block">
                2. Modelo de Diagramação
              </span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'PROFESSIONAL' as const, label: 'Profissional', desc: 'Clássico moderno corporativo' },
                  { id: 'MINIMALIST' as const, label: 'Minimalista', desc: 'Estilo suíço, alta tipografia' },
                  { id: 'TECHNICAL' as const, label: 'Técnico', desc: 'Matriz densa de engenharia' },
                  { id: 'EXECUTIVE' as const, label: 'Executivo', desc: 'Foco em liderança e impacto' },
                ].map(tmpl => (
                  <button
                    key={tmpl.id}
                    onClick={() => setOptions({ ...options, template: tmpl.id })}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      options.template === tmpl.id
                        ? 'bg-[#1b2333] border-[#a3e635] text-white'
                        : 'bg-[#141822] border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <span className="text-xs font-bold block">{tmpl.label}</span>
                    <span className="text-[10px] text-zinc-500 block mt-0.5">{tmpl.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Style & Theme Controls */}
            <div className="p-5 rounded-2xl bg-[#11141c] border border-[#212735] space-y-4">
              <span className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider block">
                3. Cores & Tipografia
              </span>

              {/* Theme Color */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-mono text-zinc-400 block">Cor de Destaque</span>
                <div className="flex items-center gap-2">
                  {[
                    { id: 'LIME' as const, label: 'Lime', hex: '#84cc16' },
                    { id: 'NAVY' as const, label: 'Navy', hex: '#4338ca' },
                    { id: 'SLATE' as const, label: 'Slate', hex: '#475569' },
                    { id: 'MONO' as const, label: 'Mono', hex: '#27272a' },
                  ].map(color => (
                    <button
                      key={color.id}
                      onClick={() => setOptions({ ...options, themeColor: color.id })}
                      className={`flex-1 py-1.5 rounded-lg border text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all ${
                        options.themeColor === color.id
                          ? 'border-white text-white bg-[#1e2535]'
                          : 'border-zinc-800 text-zinc-400 hover:border-zinc-700 bg-[#141822]'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color.hex }} />
                      <span>{color.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Family & Spacing */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <span className="text-[11px] font-mono text-zinc-400 block mb-1">Fonte</span>
                  <select
                    value={options.fontFamily}
                    onChange={e => setOptions({ ...options, fontFamily: e.target.value as FontFamilyId })}
                    className="w-full px-3 py-1.5 rounded-xl bg-[#141822] border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-[#a3e635]"
                  >
                    <option value="HELVETICA">Helvetica (Sans)</option>
                    <option value="TIMES">Times (Serif)</option>
                    <option value="COURIER">Courier (Mono)</option>
                  </select>
                </div>

                <div>
                  <span className="text-[11px] font-mono text-zinc-400 block mb-1">Espaçamento</span>
                  <select
                    value={options.spacing}
                    onChange={e => setOptions({ ...options, spacing: e.target.value as SpacingId })}
                    className="w-full px-3 py-1.5 rounded-xl bg-[#141822] border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-[#a3e635]"
                  >
                    <option value="COMPACT">Compacto</option>
                    <option value="BALANCED">Equilibrado</option>
                    <option value="GENEROUS">Arejado</option>
                  </select>
                </div>
              </div>

              {/* ATS Simple Mode Toggle */}
              <div className="p-3 rounded-xl bg-[#0c0f15] border border-zinc-800/80 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">Modo Simples ATS</span>
                  <span className="text-[10px] text-zinc-400 block">
                    Coluna única, alto contraste, sem adornos gráficos
                  </span>
                </div>
                <button
                  onClick={() => setOptions({ ...options, isAtsStrict: !options.isAtsStrict })}
                  role="switch"
                  aria-checked={options.isAtsStrict}
                  aria-label="Modo Simples ATS"
                  className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
                    options.isAtsStrict ? 'bg-[#a3e635]' : 'bg-zinc-700'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-zinc-950 transition-transform ${
                      options.isAtsStrict ? 'left-5' : 'left-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* 4. Editable Document Fields */}
            <div className="p-5 rounded-2xl bg-[#11141c] border border-[#212735] space-y-3">
              <span className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider block">
                4. Informações do Cabeçalho
              </span>

              <div className="space-y-2 text-xs">
                <div>
                  <label htmlFor="document-name" className="text-[10px] font-mono text-zinc-400 block mb-1">Nome Completo</label>
                  <input
                    id="document-name"
                    type="text"
                    value={editableName}
                    onChange={e => setEditableName(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-[#141822] border border-zinc-800 text-white focus:outline-none focus:border-[#a3e635]"
                  />
                </div>

                <div>
                  <label htmlFor="document-role" className="text-[10px] font-mono text-zinc-400 block mb-1">Cargo Desejado / Título</label>
                  <input
                    id="document-role"
                    type="text"
                    value={editableTargetRole}
                    onChange={e => setEditableTargetRole(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-[#141822] border border-zinc-800 text-white focus:outline-none focus:border-[#a3e635]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="document-email" className="text-[10px] font-mono text-zinc-400 block mb-1">E-mail</label>
                    <input
                      id="document-email"
                      type="email"
                      value={editableEmail}
                      onChange={e => setEditableEmail(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-[#141822] border border-zinc-800 text-white focus:outline-none focus:border-[#a3e635]"
                    />
                  </div>
                  <div>
                    <label htmlFor="document-phone" className="text-[10px] font-mono text-zinc-400 block mb-1">Telefone</label>
                    <input
                      id="document-phone"
                      type="tel"
                      value={editablePhone}
                      onChange={e => setEditablePhone(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-[#141822] border border-zinc-800 text-white focus:outline-none focus:border-[#a3e635]"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="document-summary" className="text-[10px] font-mono text-zinc-400 block mb-1">Resumo Profissional</label>
                  <textarea
                    id="document-summary"
                    rows={3}
                    value={editableSummary}
                    onChange={e => setEditableSummary(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#141822] border border-zinc-800 text-zinc-200 text-xs focus:outline-none focus:border-[#a3e635]"
                  />
                </div>
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div className="space-y-2 pt-2">
              <button
                onClick={handleDownloadPdf}
                disabled={isGenerating}
                className="w-full py-3.5 px-4 rounded-2xl font-black text-sm bg-[#a3e635] hover:bg-[#bef264] text-zinc-950 shadow-[0_0_20px_rgba(163,230,53,0.3)] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isGenerating ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>BAIXAR PDF OFICIAL (VETORIAL)</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleDownloadDocx}
                  disabled={isGenerating}
                  className="py-2 px-3 rounded-xl text-xs font-bold bg-[#141822] hover:bg-[#1e2534] text-zinc-200 border border-zinc-800 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-sky-400" />
                  <span>Baixar Word (.docx)</span>
                </button>

                <button
                  onClick={handleDownloadMarkdown}
                  disabled={isGenerating}
                  className="py-2 px-3 rounded-xl text-xs font-bold bg-[#141822] hover:bg-[#1e2534] text-zinc-200 border border-zinc-800 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-[#a3e635]" />
                  <span>Baixar Markdown (.md)</span>
                </button>
              </div>
            </div>
          </div>

          {/* ============================================================== */}
          {/* RIGHT COLUMN: INTERACTIVE A4 LIVE PREVIEW (7 COLS) */}
          {/* ============================================================== */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-zinc-400">
                Visualização em Tempo Real (Folha A4 Padronizada)
              </span>
              <span className="text-[11px] font-mono text-[#a3e635] bg-[#a3e635]/10 px-2 py-0.5 rounded border border-[#a3e635]/20">
                Texto 100% Selecionável
              </span>
            </div>

            {/* The A4 Canvas Sheet */}
            <div
              className="w-full bg-white text-zinc-900 rounded-2xl shadow-2xl p-8 sm:p-12 transition-all border border-zinc-300 min-h-[750px] relative font-sans text-xs select-text"
              style={{
                fontFamily:
                  options.fontFamily === 'TIMES'
                    ? 'serif'
                    : options.fontFamily === 'COURIER'
                    ? 'monospace'
                    : 'sans-serif',
              }}
            >
              {/* Document Header */}
              <div className="border-b border-zinc-200 pb-4 mb-4">
                <h1 className="text-2xl font-bold tracking-tight text-zinc-900">{editableName}</h1>
                <p
                  className="text-sm font-semibold mt-0.5"
                  style={{
                    color: options.isAtsStrict ? '#333' : getThemeHex(options.themeColor),
                  }}
                >
                  {editableTargetRole}
                </p>
                <div className="text-[10px] text-zinc-500 mt-1 flex flex-wrap gap-2">
                  <span>{editableEmail}</span>
                  <span>·</span>
                  <span>{editablePhone}</span>
                  <span>·</span>
                  <span>{editableLocation}</span>
                  {currentUser?.login && (
                    <>
                      <span>·</span>
                      <span className="text-blue-700">github.com/{currentUser.login}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Summary */}
              {options.includeSections.summary && (
                <div className="mb-4">
                  <h2
                    className="text-xs font-bold uppercase tracking-wider mb-1"
                    style={{
                      color: options.isAtsStrict ? '#222' : getThemeHex(options.themeColor),
                      borderBottom: options.isAtsStrict ? '1px solid #ddd' : 'none',
                    }}
                  >
                    Resumo Profissional
                  </h2>
                  <p className="text-[11px] text-zinc-700 leading-relaxed">{editableSummary}</p>
                </div>
              )}

              {/* Skills */}
              {options.includeSections.skills && !!resume?.verifiedSkills?.length && (
                <div className="mb-4">
                  <h2
                    className="text-xs font-bold uppercase tracking-wider mb-1"
                    style={{
                      color: options.isAtsStrict ? '#222' : getThemeHex(options.themeColor),
                      borderBottom: options.isAtsStrict ? '1px solid #ddd' : 'none',
                    }}
                  >
                    Competências Técnicas
                  </h2>
                  <p className="text-[10px] text-zinc-600">{resume.verifiedSkills.join('  ·  ')}</p>
                </div>
              )}

              {/* Experience */}
              {options.includeSections.experience && resume?.documentedExperiences && resume.documentedExperiences.length > 0 && (
                <div className="mb-4 space-y-2">
                  <h2
                    className="text-xs font-bold uppercase tracking-wider mb-1"
                    style={{
                      color: options.isAtsStrict ? '#222' : getThemeHex(options.themeColor),
                      borderBottom: options.isAtsStrict ? '1px solid #ddd' : 'none',
                    }}
                  >
                    Experiência Profissional
                  </h2>
                  {resume.documentedExperiences.slice(0, 2).map((exp, idx) => (
                    <div key={idx} className="space-y-0.5">
                      <div className="flex justify-between font-bold text-[11px]">
                        <span>{exp.role}</span>
                          <span className="text-zinc-500 font-normal">{exp.period || ''}</span>
                      </div>
                      {exp.company && <span className="text-[10px] text-zinc-600 block">{exp.company}</span>}
                      {exp.achievements && exp.achievements.length > 0 && (
                        <ul className="list-disc pl-4 text-[10px] text-zinc-600 space-y-0.5">
                          {exp.achievements.slice(0, 2).map((b, i) => (
                            <li key={i}>{b}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* GitHub Repositories Showcase */}
              {options.includeSections.projects && (
                <div className="mb-4 space-y-2">
                  <h2
                    className="text-xs font-bold uppercase tracking-wider mb-1"
                    style={{
                      color: options.isAtsStrict ? '#222' : getThemeHex(options.themeColor),
                      borderBottom: options.isAtsStrict ? '1px solid #ddd' : 'none',
                    }}
                  >
                    Projetos de Destaque no GitHub
                  </h2>
                  <div className="grid grid-cols-2 gap-2">
                    {repos.slice(0, 4).map(repo => (
                      <div key={repo.id} className="p-2 rounded bg-zinc-50 border border-zinc-200 space-y-0.5">
                        <div className="flex justify-between font-bold text-[10.5px]">
                          <span className="truncate">{repo.name}</span>
                          <span className="text-[9px] text-zinc-500 font-mono">
                            {repo.language || 'Code'}
                          </span>
                        </div>
                        <p className="text-[9.5px] text-zinc-600 line-clamp-2">
                          {repo.description || 'Aplicação desenvolvida com padrões modernos.'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer Indicator in Preview */}
              <div className="absolute bottom-4 left-8 right-8 pt-2 border-t border-zinc-200 flex justify-between text-[9px] text-zinc-400">
                <span>GitHub Intelligence AI · Documento Oficial</span>
                <span>Prévia do documento</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ============================================================== */
        /* TAB 2: GENERATED DOCUMENTS HISTORY TABLE */
        /* ============================================================== */
        <div role="tabpanel" id="document-history-panel" aria-labelledby="document-history-tab" className="p-6 rounded-2xl bg-[#11141c] border border-[#212735] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#a3e635]" />
                Histórico de Documentos Gerados
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Acesse downloads anteriores ou remova registros que não são mais necessários.
              </p>
            </div>
            <button
              onClick={loadHistory}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white bg-[#141822] border border-zinc-800"
              title="Recarregar histórico"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {isHistoryLoading ? (
            <div role="status" className="animate-pulse p-8 rounded-xl bg-[#0d1017] border border-zinc-800 text-xs text-zinc-400">Carregando histórico de documentos…</div>
          ) : historyError ? (
            <div role="alert" className="p-6 rounded-xl bg-[#0d1017] border border-rose-500/30 space-y-3">
              <p className="text-xs text-rose-200">{historyError}</p>
              <button type="button" onClick={loadHistory} className="px-3 py-2 rounded-lg text-xs font-bold bg-[#1a212e] text-white border border-zinc-700">Tentar novamente</button>
            </div>
          ) : history.length === 0 ? (
            <div className="p-12 text-center rounded-xl bg-[#0d1017] border border-zinc-800 space-y-2">
              <FileText className="w-8 h-8 text-zinc-600 mx-auto" />
              <p className="text-xs text-zinc-400">Nenhum documento gerado ainda nesta sessão.</p>
              <button
                onClick={() => setActiveTab('BUILDER')}
                className="text-xs text-[#a3e635] hover:underline font-bold"
              >
                Gerar primeiro documento agora
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#141822] text-zinc-400 border-b border-zinc-800 text-[10px] uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Título</th>
                    <th className="py-2.5 px-3">Tipo</th>
                    <th className="py-2.5 px-3">Formato</th>
                    <th className="py-2.5 px-3">Tamanho</th>
                    <th className="py-2.5 px-3">Data / Hora</th>
                    <th className="py-2.5 px-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {history.map(item => (
                    <tr key={item.id} className="hover:bg-[#151922] transition-colors">
                      <td className="py-3 px-3">
                        <span className="font-bold text-white block truncate max-w-xs">{item.title}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-300">
                          {item.docType}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.format === 'PDF'
                              ? 'bg-[#a3e635]/15 text-[#a3e635]'
                              : 'bg-sky-500/15 text-sky-400'
                          }`}
                        >
                          {item.format}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-zinc-400 tabular-nums">
                        {item.fileSizeText || '60 KB'}
                      </td>
                      <td className="py-3 px-3 text-zinc-400">
                        {new Date(item.generatedAt).toLocaleString('pt-BR')}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              const supportedTypes: DocumentType[] = ['RESUME_FULL', 'PORTFOLIO_SHOWCASE', 'CURATION_REPORT'];
                              if (!supportedTypes.includes(item.docType)) {
                                setFeedback({ type: 'error', text: 'Este tipo de documento não pode ser reconstruído pelo personalizador atual.' });
                                return;
                              }
                              setDocType(item.docType);
                              setActiveTab('BUILDER');
                              setFeedback({ type: 'success', text: 'Configurações do tipo selecionado abertas. O documento será gerado com os dados atuais.' });
                            }}
                            className="p-1.5 rounded-lg text-zinc-300 hover:text-white bg-[#1a212e] border border-zinc-700"
                            title="Abrir o personalizador para gerar novamente"
                            aria-label={`Abrir configurações para gerar novamente: ${item.title}`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {pendingDeleteId === item.id ? (
                            <>
                              <button
                                onClick={() => handleDeleteHistory(item.id)}
                                className="rounded-lg px-2 py-1 text-[10px] font-bold text-rose-200 bg-rose-950/40 border border-rose-800"
                              >
                                Confirmar
                              </button>
                              <button
                                onClick={() => setPendingDeleteId(null)}
                                className="rounded-lg px-2 py-1 text-[10px] text-zinc-300 bg-zinc-800 border border-zinc-700"
                              >
                                Cancelar
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => setPendingDeleteId(item.id)}
                              className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 bg-rose-950/20 border border-rose-900/30"
                              title="Remover do Histórico"
                              aria-label={`Remover ${item.title} do histórico`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
