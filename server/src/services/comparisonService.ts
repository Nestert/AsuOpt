import path from 'path';
import fs from 'fs';
import os from 'os';
import { spawn } from 'child_process';
import { DocumentComparison, DocumentVersion } from '../models/Document';

const WORKER_PATH = path.join(__dirname, '../workers/extract_pdf_text.py');
const UPLOADS_BASE = path.join(__dirname, '../../uploads');

// ─── Нормализация текста ────────────────────────────────────────────────────

// Поля, которые нормализуем (штамп, дата, номер ревизии, номер страницы)
const NOISE_PATTERNS = [
  // Дата/время: ДД.ММ.ГГГГ, ГГГГ-ММ-ДД
  /\b\d{2}[./]\d{2}[./]\d{4}\b/g,
  /\b\d{4}-\d{2}-\d{2}\b/g,
  // Время
  /\b\d{1,2}:\d{2}(:\d{2})?\b/g,
  // Номер ревизии (Рев. 01, Rev. A, ред. 2)
  /\b(Рев|Rev|рев|ред)\s*[.:]?\s*[\dA-Za-zА-Яа-я]+\b/g,
  // Страница X из Y / Лист N
  /\b(Страница|Лист|стр\.|Sheet|Page)\s*\d+\s*(из|of)?\s*\d*\b/gi,
  // Одиночный номер в конце строки (типичный номер листа в штампе)
  /^\s*\d{1,4}\s*$/gm,
];

function normalizeText(text: string): string {
  let t = text;
  for (const rx of NOISE_PATTERNS) {
    t = t.replace(rx, ' ');
  }
  // Нормализация пробелов и переносов
  return t
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0)
    .join('\n');
}

// ─── Python worker ──────────────────────────────────────────────────────────

interface PdfExtractResult {
  pageCount: number;
  pages: Array<{ page: number; text: string; isScanned: boolean }>;
  warnings: string[];
}

function extractPdfText(pdfPath: string): Promise<PdfExtractResult> {
  return new Promise((resolve, reject) => {
    const outFile = path.join(os.tmpdir(), `asuopt_pdf_${Date.now()}_${Math.random().toString(36).slice(2)}.json`);
    const proc = spawn('python3', [WORKER_PATH, pdfPath, outFile], { timeout: 120_000 });
    let stderr = '';
    proc.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });
    proc.on('close', (code) => {
      try {
        const raw = fs.readFileSync(outFile, 'utf-8');
        fs.unlinkSync(outFile);
        const data = JSON.parse(raw) as PdfExtractResult;
        resolve(data);
      } catch {
        if (fs.existsSync(outFile)) fs.unlinkSync(outFile);
        reject(new Error(`Python worker failed (code ${code}): ${stderr}`));
      }
    });
    proc.on('error', (err) => reject(err));
  });
}

// ─── Сопоставление и diff ───────────────────────────────────────────────────

interface PageDiff {
  page: number;
  baseText: string;
  targetText: string;
  added: string[];
  removed: string[];
  changed: boolean;
}

function diffPages(basePages: PdfExtractResult['pages'], targetPages: PdfExtractResult['pages']): PageDiff[] {
  const maxPages = Math.max(basePages.length, targetPages.length);
  const diffs: PageDiff[] = [];

  for (let i = 0; i < maxPages; i++) {
    const bPage = basePages[i];
    const tPage = targetPages[i];

    if (!bPage && tPage) {
      // Новая страница в target
      diffs.push({
        page: tPage.page,
        baseText: '',
        targetText: tPage.text,
        added: tPage.text.split('\n').filter(l => l.trim()),
        removed: [],
        changed: true,
      });
      continue;
    }
    if (bPage && !tPage) {
      // Страница удалена
      diffs.push({
        page: bPage.page,
        baseText: bPage.text,
        targetText: '',
        added: [],
        removed: bPage.text.split('\n').filter(l => l.trim()),
        changed: true,
      });
      continue;
    }

    const bNorm = normalizeText(bPage.text);
    const tNorm = normalizeText(tPage.text);

    if (bNorm === tNorm) {
      diffs.push({ page: bPage.page, baseText: bNorm, targetText: tNorm, added: [], removed: [], changed: false });
      continue;
    }

    const bLines = new Set(bNorm.split('\n').filter(l => l.trim()));
    const tLines = new Set(tNorm.split('\n').filter(l => l.trim()));

    const added = [...tLines].filter(l => !bLines.has(l));
    const removed = [...bLines].filter(l => !tLines.has(l));

    diffs.push({ page: bPage.page, baseText: bNorm, targetText: tNorm, added, removed, changed: true });
  }

  return diffs;
}

// ─── Формирование текстового отчёта ────────────────────────────────────────

function buildReportText(diffs: PageDiff[], baseVersion: number, targetVersion: number): string {
  const changedPages = diffs.filter(d => d.changed);
  const lines: string[] = [
    `Отчёт сравнения версий: v${baseVersion} → v${targetVersion}`,
    `Дата: ${new Date().toLocaleString('ru-RU')}`,
    `Изменённых листов: ${changedPages.length} из ${diffs.length}`,
    '',
  ];

  if (changedPages.length === 0) {
    lines.push('Изменений не обнаружено.');
    return lines.join('\n');
  }

  for (const d of changedPages) {
    lines.push(`──── Лист ${d.page} ────`);
    if (d.removed.length > 0 && d.added.length === 0) {
      lines.push('  Страница удалена в новой версии.');
    } else if (d.removed.length === 0 && d.added.length > 0 && !d.baseText) {
      lines.push('  Новая страница.');
    } else {
      if (d.removed.length > 0) {
        lines.push('  Удалено:');
        for (const l of d.removed) lines.push(`    − ${l}`);
      }
      if (d.added.length > 0) {
        lines.push('  Добавлено:');
        for (const l of d.added) lines.push(`    + ${l}`);
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}

// ─── Главный оркестратор ────────────────────────────────────────────────────

export async function runComparison(comparisonId: number): Promise<void> {
  const comparison = await DocumentComparison.findByPk(comparisonId, {
    include: [
      { model: DocumentVersion, as: 'baseVersion' },
      { model: DocumentVersion, as: 'targetVersion' },
    ],
  });

  if (!comparison) throw new Error(`Comparison ${comparisonId} not found`);

  await comparison.update({ status: 'RUNNING', startedAt: new Date() });

  const allWarnings: string[] = [];

  try {
    const baseVersion = (comparison as any).baseVersion as DocumentVersion;
    const targetVersion = (comparison as any).targetVersion as DocumentVersion;

    const basePath = path.join(UPLOADS_BASE, baseVersion.storagePath);
    const targetPath = path.join(UPLOADS_BASE, targetVersion.storagePath);

    // Проверяем что оба файла — PDF (best-effort по mime или расширению)
    const isPdf = (v: DocumentVersion) =>
      (v.mimeType && v.mimeType.includes('pdf')) ||
      v.filename.toLowerCase().endsWith('.pdf');

    if (!isPdf(baseVersion) || !isPdf(targetVersion)) {
      allWarnings.push('Один или оба файла не являются PDF. Текстовое сравнение недоступно.');
      await comparison.update({
        status: 'DONE',
        reportText: 'Сравнение недоступно: файлы должны быть в формате PDF.',
        reportJson: JSON.stringify({ diffs: [], pageCount: 0 }),
        warnings: JSON.stringify(allWarnings),
        finishedAt: new Date(),
      });
      return;
    }

    // Извлекаем текст
    let baseExtract: PdfExtractResult;
    let targetExtract: PdfExtractResult;

    try {
      baseExtract = await extractPdfText(basePath);
    } catch (e: any) {
      allWarnings.push(`Ошибка извлечения текста из базовой версии: ${e.message}`);
      baseExtract = { pageCount: 0, pages: [], warnings: [] };
    }

    try {
      targetExtract = await extractPdfText(targetPath);
    } catch (e: any) {
      allWarnings.push(`Ошибка извлечения текста из целевой версии: ${e.message}`);
      targetExtract = { pageCount: 0, pages: [], warnings: [] };
    }

    allWarnings.push(...baseExtract.warnings, ...targetExtract.warnings);

    if (baseExtract.pages.length === 0 && targetExtract.pages.length === 0) {
      await comparison.update({
        status: 'DONE',
        reportText: 'Текст не удалось извлечь ни из одного файла.',
        reportJson: JSON.stringify({ diffs: [], pageCount: 0 }),
        warnings: JSON.stringify(allWarnings),
        finishedAt: new Date(),
      });
      return;
    }

    const diffs = diffPages(baseExtract.pages, targetExtract.pages);
    const reportText = buildReportText(diffs, baseVersion.versionNumber, targetVersion.versionNumber);
    const reportJson = JSON.stringify({
      baseVersionId: baseVersion.id,
      targetVersionId: targetVersion.id,
      pageCount: Math.max(baseExtract.pageCount, targetExtract.pageCount),
      changedPages: diffs.filter(d => d.changed).length,
      diffs: diffs.map(d => ({
        page: d.page,
        changed: d.changed,
        added: d.added,
        removed: d.removed,
      })),
    });

    await comparison.update({
      status: 'DONE',
      reportText,
      reportJson,
      warnings: allWarnings.length > 0 ? JSON.stringify(allWarnings) : null,
      finishedAt: new Date(),
    });
  } catch (err: any) {
    await comparison.update({
      status: 'FAILED',
      warnings: JSON.stringify([`Критическая ошибка: ${err.message}`]),
      finishedAt: new Date(),
    });
  }
}

export async function scheduleComparison(
  documentId: number,
  baseVersionId: number,
  targetVersionId: number
): Promise<DocumentComparison> {
  const comparison = await DocumentComparison.create({
    documentId,
    baseVersionId,
    targetVersionId,
    status: 'PENDING',
  });

  // Запускаем асинхронно, не блокируем ответ
  setImmediate(() => {
    runComparison(comparison.id).catch((err) => {
      console.error(`[comparison] Error running comparison ${comparison.id}:`, err);
    });
  });

  return comparison;
}
