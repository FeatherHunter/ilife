/** 写入与同步的处理函数（命令事实的执行一半；声明在 `./commands.ts`）。
 *
 * 逐字搬自 `src/cli/cmd_read.ts` 的 switch 一臂（行为零改动）——**#783 起这一臂多出「出页」那一半**：
 * 写库之后各支出一张真页（`./writeDocs.ts` 装配，形状与件序列见该件头），回执载荷（`data`）与
 * 退出码口径一行不改（顶层 `ok`／`message` 照旧，追加的分字段只多不少）。
 *
 * 批量导入（`records[]`，老侧 `batch-add` 的 ok／partial 语义）：逐条走同一条 add 校验与写库函数，
 * 单条不过不打断其余；没通过的原因在**载荷里**给原文（给 AI 看），在**页上**给中文短因（给人看）。
 */
import {
  addRecord, amendRecord, addSummary, getRecordById,
} from '../fetch/index.js';
import { parseRecordOp, validateAddInput, validateAmendInput, validateSummaryInput } from '../policy/index.js';
import { buildRecordReceipt } from '../render/index.js';
import { amendReceiptPage, batchReceiptPage, recordResultPage, summaryReceiptPage, type BatchRow } from './writeDocs.js';
import type { ScheduleRecord, ScheduleDb } from '../fetch/db.js';
import type { WriteHandler } from '../shared/commandSpec.js';
import { m } from '../entries/index.js';

/** 校验失败的原因 → 页上那句短因（库列名与命令参数名都不上屏；载荷里仍留原文给 AI）。
 *  #1197：取词在渲染期，故写成函数（模块级常量只会在加载期取到 zh）。 */
function reasonZh(): Readonly<Record<string, string>> {
  return {
    POLICY_BAD_CATEGORY: m('skill-schedule.write-handlers.c012'),
    POLICY_BAD_TIME: m('skill-schedule.write-handlers.c013'),
    POLICY_BAD_DATE: m('skill-schedule.write-handlers.c014'),
    POLICY_MISSING_SLOT: m('skill-schedule.write-handlers.c015'),
    POLICY_BAD_INPUT: m('skill-schedule.write-handlers.c016'),
  };
}

function reasonOf(error: unknown): string {
  const code = (error as { code?: string } | undefined)?.code;
  return (code !== undefined ? reasonZh()[code] : undefined) ?? m('skill-schedule.write-handlers.c001');
}

/** 一条批量项的中间态（页与载荷都从它出，两处不各算一遍）。 */
interface BatchItem {
  readonly seq: number;
  readonly date: string;
  readonly time: string;
  readonly activity: string;
  readonly category: string;
  readonly ok: boolean;
  /** 人看的原因（页上用）；没通过时才有值。 */
  readonly result: string;
  /** 机读的原因原文（载荷用）；没通过时才有值。 */
  readonly message: string;
  readonly id: number | null;
}

const cellText = (value: unknown): string => (typeof value === 'string' ? value : '');

/** 批量导入：逐条校验、逐条写库，单条不过不打断（老侧 `batch-add` 的口径）。 */
function runBatch(params: Record<string, unknown>, handle: ScheduleDb): { data: Record<string, unknown>; html: string; exitCode?: number } {
  const raw = Array.isArray(params.records) ? (params.records as unknown[]) : [];
  if (raw.length === 0) {
    const message = m('skill-schedule.write-handlers.c002');
    return { data: { ok: false, message, items: [], total: 0, success: 0, failed: 0 }, html: '' };
  }
  const items: BatchItem[] = [];
  for (let i = 0; i < raw.length; i += 1) {
    const seq = i + 1;
    const one = raw[i];
    const record = typeof one === 'object' && one !== null ? (one as Record<string, unknown>) : {};
    try {
      const input = validateAddInput(record);
      const written = addRecord(handle, input);
      items.push({
        seq, date: written.date, time: m('skill-schedule.write-handlers.c003', {
          p0: String(written.time_start),
          p1: String(written.time_end),
        }),
        activity: written.activity, category: written.category,
        ok: true, result: m('skill-schedule.write-handlers.c004'), message: '', id: written.id,
      });
    } catch (e) {
      items.push({
        seq,
        date: cellText(record.date),
        time: cellText(record.time_start) === '' || cellText(record.time_end) === ''
          ? '—'
          : m('skill-schedule.write-handlers.c005', {
            p0: String(cellText(record.time_start)),
            p1: String(cellText(record.time_end)),
          }),
        activity: cellText(record.activity) === '' ? '—' : cellText(record.activity),
        category: cellText(record.category) === '' ? '—' : cellText(record.category),
        ok: false, result: reasonOf(e), message: (e as Error).message ?? String(e), id: null,
      });
    }
  }
  const done = items.filter((it) => it.ok).length;
  const failed = items.length - done;
  const dates = [...new Set(items.map((it) => it.date).filter((d) => d !== ''))].sort();
  const dateText = dates.length === 0
    ? '—'
    : (dates.length === 1 ? dates[0] : m('skill-schedule.write-handlers.c006', { p0: String(dates[0]), p1: String(dates[dates.length - 1]) }));
  const rows: BatchRow[] = items.map((it) => ({
    seq: it.seq, time: it.time, activity: it.activity, category: it.category, result: it.result, ok: it.ok,
  }));
  const message = failed === 0
    ? m('skill-schedule.write-handlers.c007', { p0: String(items.length) })
    : m('skill-schedule.write-handlers.c008', { p0: String(done), p1: String(failed) });
  return {
    data: {
      ok: failed === 0,
      message,
      total: items.length,
      success: done,
      failed,
      date: dateText,
      items: items.map((it) => ({
        seq: it.seq, ok: it.ok, id: it.id, date: it.date, time: it.time,
        activity: it.activity, category: it.category,
        ...(it.ok ? {} : { reason: it.result, message: it.message }),
      })),
    },
    html: batchReceiptPage({ date: dateText, rows }),
    ...(failed === 0 ? {} : { exitCode: 1 }),
  };
}

export const writeRecord: WriteHandler = (params, handle: ScheduleDb) => {
  // 批量那一支先认（`records[]` 出现即批量；op 缺省仍是 add，见 `parseRecordOp`）。
  if (Array.isArray(params.records)) return runBatch(params, handle);
  const op = parseRecordOp(params);
  if (op === 'add') {
    const input = validateAddInput(params);
    const r = addRecord(handle, input);
    return {
      data: buildRecordReceipt(m('skill-schedule.write-handlers.c009', {
        p0: String(r.id),
        p1: String(r.date),
        p2: String(r.time_start),
        p3: String(r.time_end),
        p4: String(r.category),
      })),
      html: recordResultPage(handle, r),
    };
  }
  if (op === 'amend') {
    const { id, patch } = validateAmendInput(params);
    const before: ScheduleRecord = getRecordById(handle, id);
    const r = amendRecord(handle, id, patch as Partial<ScheduleRecord>);
    return {
      data: buildRecordReceipt(m('skill-schedule.write-handlers.c010', { p0: String(r.id), p1: String(r.edit_count) })),
      html: amendReceiptPage(before, r, Object.keys(patch)),
    };
  }
  const s = validateSummaryInput(params);
  addSummary(handle, s.date, s.category, s.totalMinutes);
  return {
    data: buildRecordReceipt(m('skill-schedule.write-handlers.c011', {
      p0: String(s.date),
      p1: String(s.category),
      p2: String(s.totalMinutes),
    })),
    html: summaryReceiptPage(handle, s),
  };
};
