/** text · api
 *
 *  自 `src/text.ts` 原样切出。
 *
 *  **住址**：目录化批次⑥把 `src/text.ts` 按段切成「族内一件一文件」，正文原样搬来；
 *  搬迁判据＝产物逐字节相同（见 `docs/base/base-render/组件目录架构.md` 本批读数）。
 */

import { csvText, dataCsvRows, jsonText, maskData } from './formats.js';
import { asRecord, describeValue, optionalString, requireShapeData, resolveCopyLog, resolveFormat, resolveShape } from './input.js';
import { logTexts } from './log.js';
import { dataRows, headerLine, sanitizeLine } from './rows.js';
import { CSV_EMPTY, LF, TIME_LABEL, fail } from './shared.js';
import { DATA_TEXT_PROJECTIONS, DataTextInput, LOG_SECTIONS, LOG_SECTION_TITLES, LOG_UNKNOWN_PLACEHOLDER, LogTextInput, SENSITIVE_ROW_RULE, TEXT_EMPTY_PLACEHOLDER } from '../../spec/text.js';

/* ── 出口 ───────────────────────────────────────────────────── */

/** 数据文本：envelope 逐 shape 投影 → `text`／`json`／`csv`。失败抛 `TextError`（不返空、不降级）。 */
export function buildDataText(input: DataTextInput): string {
  const record = asRecord(input);
  if (record === null) fail('structure-invalid', '入参必须是对象（DataTextInput），实为 ' + describeValue(input));
  const format = resolveFormat(record.format);
  const envelope = asRecord(record.envelope);
  if (envelope === null) fail('structure-invalid', 'envelope 必须是对象，实为 ' + describeValue(record.envelope));
  const shape = resolveShape(envelope.shape);
  const title = optionalString(record.title, 'title');
  const occurredAt = optionalString(record.occurredAt, 'occurredAt');
  const data = requireShapeData(shape, envelope.data);
  const projection = DATA_TEXT_PROJECTIONS[shape];

  if (format === 'json') {
    return jsonText({
      version: envelope.version,
      skill: envelope.skill,
      shape,
      key: envelope.key,
      data: maskData(projection, data),
    });
  }

  const rows = dataRows(projection, data, format === 'csv' ? CSV_EMPTY : TEXT_EMPTY_PLACEHOLDER);
  if (format === 'csv') return csvText(dataCsvRows(projection, rows));

  const lines: string[] = [sanitizeLine(headerLine(envelope, title))];
  if (occurredAt !== undefined) lines.push(sanitizeLine(TIME_LABEL + occurredAt));
  for (const row of rows.tail === null ? rows.body : [...rows.body, rows.tail]) {
    lines.push(sanitizeLine(row.text));
    if (row.sensitive) lines.push(SENSITIVE_ROW_RULE.textNotice);
  }
  return lines.join(LF);
}

/** 日志文本：6 段（1 段 envelope 派生 ＋ 5 段 `CopyLogFields`）→ `text`／`json`／`csv`。
 *  结构校验与 `buildDataText` **同口径**（U14 定案：`data` 不符 shape 同样抛 `structure-invalid`）。 */
export function buildLogText(input: LogTextInput): string {
  const record = asRecord(input);
  if (record === null) fail('structure-invalid', '入参必须是对象（LogTextInput），实为 ' + describeValue(input));
  const format = resolveFormat(record.format);
  const envelope = asRecord(record.envelope);
  if (envelope === null) fail('structure-invalid', 'envelope 必须是对象，实为 ' + describeValue(record.envelope));
  const shape = resolveShape(envelope.shape);
  const copyLog = resolveCopyLog(record.copyLog);
  requireShapeData(shape, envelope.data);
  const texts = logTexts(envelope, shape, copyLog);

  if (format === 'json') return jsonText(texts);
  if (format === 'csv') {
    return csvText(LOG_SECTIONS.map((section) => [section, texts[section] ?? ''] as [string, string]));
  }

  const lines: string[] = [];
  for (const section of LOG_SECTIONS) {
    lines.push(sanitizeLine(LOG_SECTION_TITLES[section]));
    lines.push(sanitizeLine(texts[section] ?? LOG_UNKNOWN_PLACEHOLDER));
  }
  return lines.join(LF);
}
