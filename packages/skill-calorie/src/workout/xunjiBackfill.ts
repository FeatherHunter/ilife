/** 拉训记实绩（HELP 场景 05「健身计划」下一级「落地训练」）：`calorie.workout.xunji-backfill` 写。
 *
 * 链（老 `render_plan_receipt.py --live-plan-backfill` 的 "1.拉取→2.回写→3.回执"，`t168:105`）：
 * ① 参数先验（`days` 须为 ≥1 整数，用法错 exit 2，不调外部）；② 调 `xunji backfill`
 *   （经 `./xunjiRunner.js` 子进程；`dryRun` 不进子进程，直接出预演过程页，零远端调用）；
 * ③ 任一步失败即非 0：「没拉到」按拉取分类走 2→3／3→4、「拉到了没写进」走 3→4
 *   （码翻译见跑道；修掉老「写库失败仍退 0」，`#608 §三·5`），失败不落成功页。
 *
 * 两态（同一命令，`dryRun` 分流）：
 * - `dryRun: true` → 过程页（回写区间 ＋ 三步预告 ＋ 幂等与冲突口径 ＋ 训记 KEY 有无，远端未调用）；
 * - 缺省 → 结果页（逐天回写结局 ＋ 新增／更新合计 ＋ 本地／远端区分）。
 *
 * 本命令不读计划、不读运动记录：区间展开与落库都在子进程里（`backfill.ts`），父进程只传
 * `--date`／`--days` 原样，不做第二处日期换算（铁律二：范围口径唯一定义地在子进程那侧）。
 */
import type { DatabaseSync } from 'node:sqlite';
import { renderDataTable, renderKpiGrid } from 'base-paint/blocks';
import { todayISO } from '../analysis/utils.js';
import type { CrudReceipt } from '../render/receipt.js';
import { assembleDocPage } from '../shared/docPage.js';
import { copyBlock } from '../shared/copyBlock.js';
import { dayField, fail, optInt } from '../shared/params.js';
import { R, provided } from '../shared/writeParts.js';
import type { WriteOut } from '../shared/commandSpec.js';
import { XUNJI_STUB_ENV, invokeXunji, xunjiExitToCmd } from './xunjiRunner.js';
import type { XunjiCall } from './xunjiRunner.js';
import { xunjiKeyNext, xunjiKeyRow } from './xunjiKey.js';
import { m } from '../entries/index.js';

export const XUNJI_BACKFILL_KEY = 'calorie.workout.xunji-backfill';
const XUNJI_BACKFILL_WAKE = '拉训记实绩';
const DOC_TITLE = (): string => m('skill-calorie.workout-xunjiBackfill.c087');

/** 子进程 `backfill` stdout 的最小形状守卫（成功分支；缺键即回执解析失败 exit 4）。 */
export interface BackfillRangeSummary {
  readonly end_date: string;
  readonly days: number;
  readonly total_inserted: number;
  readonly total_updated: number;
  readonly results: readonly {
    readonly date: string;
    readonly fetch_ok: boolean;
    readonly trains_count: number;
    readonly inserted: number;
    readonly updated: number;
    readonly skipped_empty: boolean;
  }[];
}

function asBackfillSummary(data: unknown, step: string): BackfillRangeSummary {
  const o = data as Partial<BackfillRangeSummary> | null | undefined;
  if (
    typeof o !== 'object' || o === null || typeof o.end_date !== 'string' || typeof o.days !== 'number'
    || typeof o.total_inserted !== 'number' || typeof o.total_updated !== 'number' || !Array.isArray(o.results)
  ) {
    fail(4, m('skill-calorie.workout-xunjiBackfill.c001', {
      p0: String(step),
      p1: String(JSON.stringify(data ?? null).slice(0, 160)),
    }));
  }
  return o as BackfillRangeSummary;
}

/** `dryRun` 参数：缺省 false；非布尔即用法错（exit 2，不调外部）。 */
function readDryRun(params: Record<string, unknown>): boolean {
  const v = params['dryRun'];
  if (v === undefined || v === null) return false;
  if (typeof v !== 'boolean') fail(2, m('skill-calorie.workout-xunjiBackfill.c002'));
  return v as boolean;
}

/** `days` 参数：缺省 1；非 ≥1 整数即用法错（exit 2；坏天数拒收，`#608 §八·1`，不静默吞成 1 天）。 */
function readDays(params: Record<string, unknown>): number {
  const v = optInt(params, 'days');
  if (v === undefined) return 1;
  if (v < 1) fail(2, m('skill-calorie.workout-xunjiBackfill.c003', { p0: String(String(params['days'])) }));
  return v as number;
}

/** 失败天点名（读数可解析时）：「没拉到」与「拉到了没写进」是两种失败，文案分得清（`#608 §三·5`）。 */
function dayFailures(data: unknown): string[] {
  const o = data as { results?: unknown } | null;
  if (typeof o !== 'object' || o === null || !Array.isArray(o.results)) return [];
  const out: string[] = [];
  for (const r of o.results as unknown[]) {
    const d = r as { date?: unknown; fetch_ok?: unknown; err?: unknown } | null;
    if (typeof d !== 'object' || d === null || typeof d.date !== 'string') continue;
    if (d.fetch_ok === false) out.push(m('skill-calorie.workout-xunjiBackfill.c004', { p0: String(d.date) }));
    else if (typeof d.err === 'string' && d.err !== '') out.push(m('skill-calorie.workout-xunjiBackfill.c005', { p0: String(d.date) }));
  }
  return out;
}

/** 回写失败：本地缺 KEY 点名没调远端＋可复制的下一步（exit 3），其余按天点名失败分类（exit 4）。 */
function failBackfill(end: string, days: number, call: XunjiCall): never {
  if (call.code === 2) {
    fail(3, m('skill-calorie.workout-xunjiBackfill.c006', {
      p0: String(end),
      p1: String(days),
      p2: String(xunjiKeyNext()),
    }));
  }
  const named = dayFailures(call.data);
  fail(
    xunjiExitToCmd(call.code),
    m('skill-calorie.workout-xunjiBackfill.c007', {
      p0: String(end),
      p1: String(days),
      p2: String(named.length === 0 ? '' : '：' + named.join('、')),
      p3: String(call.stderr === '' ? '' : '（' + call.stderr + '）'),
    }),
  );
}

/** `calorie.workout.xunji-backfill` · 拉训记实绩（拉取 → 回写 → 回执同一命令）。 */
export function writeXunjiBackfill(params: Record<string, unknown>, _db: DatabaseSync): WriteOut {
  const end = dayField(params, 'date') ?? todayISO();
  const days = readDays(params);
  const dryRun = readDryRun(params);
  if (dryRun) {
    const message = m('skill-calorie.workout-xunjiBackfill.c008', { p0: String(end), p1: String(days) });
    const receipt = R(m('skill-calorie.workout-xunjiBackfill.c009'), 'update', message, XUNJI_BACKFILL_WAKE, m('skill-calorie.workout-xunjiBackfill.c010'), {
      recordId: null, ids: [], idSource: 'condition', writtenFields: provided(params, ['date', 'days', 'dryRun']),
      items: [{ status: m('skill-calorie.workout-xunjiBackfill.c011'), reason: '', detail: message }],
    });
    const html = backfillProcessPage(params, end, days, receipt, false);
    return { data: { ok: true, message, receipt }, html };
  }
  const call = invokeXunji(['backfill', '--date', end, '--days', String(days)], m('skill-calorie.workout-xunjiBackfill.c012'));
  if (call.code !== 0) failBackfill(end, days, call);
  const summary = asBackfillSummary(call.data, m('skill-calorie.workout-xunjiBackfill.c013'));
  const message = m('skill-calorie.workout-xunjiBackfill.c014', {
    p0: String(summary.end_date),
    p1: String(summary.days),
    p2: String(summary.total_inserted),
    p3: String(summary.total_updated),
  });
  const receipt = R(m('skill-calorie.workout-xunjiBackfill.c015'), 'update', message, XUNJI_BACKFILL_WAKE, m('skill-calorie.workout-xunjiBackfill.c016'), {
    recordId: null, ids: [], idSource: 'condition', writtenFields: provided(params, ['date', 'days', 'dryRun']),
    items: [{ status: m('skill-calorie.workout-xunjiBackfill.c017'), reason: '', detail: message }],
  });
  const html = backfillResultPage(params, summary, receipt, call.stubbed);
  return { data: { ok: true, message, receipt }, html };
}

/** 过程页（`dryRun`）：回写区间 ＋ 三步预告 ＋ 幂等与冲突口径；远端未调用写在页头。 */
function backfillProcessPage(params: Record<string, unknown>, end: string, days: number, receipt: CrudReceipt, stubbed: boolean): string {
  const message = m('skill-calorie.workout-xunjiBackfill.c018', { p0: String(end), p1: String(days) });
  const content = [
    renderKpiGrid([
      { label: m('skill-calorie.workout-xunjiBackfill.c019'), value: end, detail: m('skill-calorie.workout-xunjiBackfill.c020') },
      { label: m('skill-calorie.workout-xunjiBackfill.c021'), value: m('skill-calorie.workout-xunjiBackfill.c022', { p0: String(days) }), detail: m('skill-calorie.workout-xunjiBackfill.c023') },
      { label: m('skill-calorie.workout-xunjiBackfill.c024'), value: m('skill-calorie.workout-xunjiBackfill.c025'), detail: m('skill-calorie.workout-xunjiBackfill.c026') },
    ]),
    renderDataTable({
      columns: [{ key: 'step', label: m('skill-calorie.workout-xunjiBackfill.c027') }, { key: 'does', label: m('skill-calorie.workout-xunjiBackfill.c028') }],
      rows: [
        { step: m('skill-calorie.workout-xunjiBackfill.c029'), does: m('skill-calorie.workout-xunjiBackfill.c030') },
        { step: m('skill-calorie.workout-xunjiBackfill.c031'), does: m('skill-calorie.workout-xunjiBackfill.c032') },
        { step: m('skill-calorie.workout-xunjiBackfill.c033'), does: m('skill-calorie.workout-xunjiBackfill.c034') },
      ],
      caption: m('skill-calorie.workout-xunjiBackfill.c035'),
    }),
    renderDataTable({
      columns: [{ key: 'k', label: m('skill-calorie.workout-xunjiBackfill.c036') }, { key: 'v', label: m('skill-calorie.workout-xunjiBackfill.c037') }],
      rows: [
        { k: m('skill-calorie.workout-xunjiBackfill.c038'), v: m('skill-calorie.workout-xunjiBackfill.c039') },
        { k: m('skill-calorie.workout-xunjiBackfill.c040'), v: m('skill-calorie.workout-xunjiBackfill.c041') },
        { k: m('skill-calorie.workout-xunjiBackfill.c042'), v: m('skill-calorie.workout-xunjiBackfill.c043') },
        { k: m('skill-calorie.workout-xunjiBackfill.c044'), v: m('skill-calorie.workout-xunjiBackfill.c045') },
        { k: m('skill-calorie.workout-xunjiBackfill.c046'), v: m('skill-calorie.workout-xunjiBackfill.c047') },
        xunjiKeyRow(),
        ...(stubbed ? [{ k: m('skill-calorie.workout-xunjiBackfill.c048'), v: m('skill-calorie.workout-xunjiBackfill.c049', { p0: String(XUNJI_STUB_ENV) }) }] : []),
      ],
      caption: m('skill-calorie.workout-xunjiBackfill.c050'),
    }),
    copyBlock(XUNJI_BACKFILL_KEY, params, receipt, m('skill-calorie.workout-xunjiBackfill.c051')),
  ].join('');
  return assembleDocPage({
    docTitle: DOC_TITLE(),
    title: m('skill-calorie.workout-xunjiBackfill.c052'),
    eyebrow: m('skill-calorie.workout-xunjiBackfill.c053'),
    subtitle: m('skill-calorie.workout-xunjiBackfill.c054'),
    content,
    pageUi: true,
  });
}

/** 结果页：逐天回写结局 ＋ 新增／更新合计 ＋ 本地／远端区分。 */
function backfillResultPage(params: Record<string, unknown>, summary: BackfillRangeSummary, receipt: CrudReceipt, stubbed: boolean): string {
  const message = m('skill-calorie.workout-xunjiBackfill.c055', {
    p0: String(summary.end_date),
    p1: String(summary.days),
    p2: String(summary.total_inserted),
    p3: String(summary.total_updated),
  });
  const content = [
    renderKpiGrid([
      { label: m('skill-calorie.workout-xunjiBackfill.c056'), value: m('skill-calorie.workout-xunjiBackfill.c057', {
        p0: String(summary.end_date),
        p1: String(summary.days),
      }), detail: m('skill-calorie.workout-xunjiBackfill.c058') },
      { label: m('skill-calorie.workout-xunjiBackfill.c059'), value: m('skill-calorie.workout-xunjiBackfill.c060', { p0: String(summary.total_inserted) }), detail: m('skill-calorie.workout-xunjiBackfill.c061') },
      { label: m('skill-calorie.workout-xunjiBackfill.c062'), value: m('skill-calorie.workout-xunjiBackfill.c063', { p0: String(summary.total_updated) }), detail: m('skill-calorie.workout-xunjiBackfill.c064') },
    ]),
    renderDataTable({
      columns: [
        { key: 'date', label: m('skill-calorie.workout-xunjiBackfill.c065') },
        { key: 'fetched', label: m('skill-calorie.workout-xunjiBackfill.c066') },
        { key: 'inserted', label: m('skill-calorie.workout-xunjiBackfill.c067') },
        { key: 'updated', label: m('skill-calorie.workout-xunjiBackfill.c068') },
      ],
      rows: summary.results.map((r) => ({
        date: r.date,
        fetched: r.skipped_empty ? m('skill-calorie.workout-xunjiBackfill.c069') : m('skill-calorie.workout-xunjiBackfill.c070', { p0: String(r.trains_count) }),
        inserted: m('skill-calorie.workout-xunjiBackfill.c071', { p0: String(r.inserted) }),
        updated: m('skill-calorie.workout-xunjiBackfill.c072', { p0: String(r.updated) }),
      })),
      caption: m('skill-calorie.workout-xunjiBackfill.c073'),
    }),
    renderDataTable({
      columns: [{ key: 'k', label: m('skill-calorie.workout-xunjiBackfill.c074') }, { key: 'v', label: m('skill-calorie.workout-xunjiBackfill.c075') }],
      rows: [
        { k: m('skill-calorie.workout-xunjiBackfill.c076'), v: m('skill-calorie.workout-xunjiBackfill.c077', { p0: String(summary.results.length) }) },
        { k: m('skill-calorie.workout-xunjiBackfill.c078'), v: m('skill-calorie.workout-xunjiBackfill.c079', {
          p0: String(summary.total_inserted),
          p1: String(summary.total_updated),
        }) },
        ...(stubbed ? [{ k: m('skill-calorie.workout-xunjiBackfill.c080'), v: m('skill-calorie.workout-xunjiBackfill.c081', { p0: String(XUNJI_STUB_ENV) }) }] : []),
      ],
      caption: m('skill-calorie.workout-xunjiBackfill.c082'),
    }),
    copyBlock(XUNJI_BACKFILL_KEY, params, receipt, m('skill-calorie.workout-xunjiBackfill.c083')),
  ].join('');
  return assembleDocPage({
    docTitle: DOC_TITLE(),
    title: m('skill-calorie.workout-xunjiBackfill.c084'),
    eyebrow: m('skill-calorie.workout-xunjiBackfill.c085'),
    subtitle: m('skill-calorie.workout-xunjiBackfill.c086'),
    content,
    pageUi: true,
  });
}
