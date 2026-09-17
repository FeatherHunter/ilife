/** 拉训记实绩（HELP 场景 05「健身计划」下一级「落地训练」）：`calorie.workout.xunji-backfill` 写。
 *
 * 链（老 `render_plan_receipt.py --live-plan-backfill` 的 "1.拉取→2.回写→3.回执"，`t168:105`）：
 * ① 参数先验（`days` 须为 ≥1 整数，用法错 exit 2，不调外部）；② 调 `xunji backfill`
 *   （经 `./xunjiRunner.js` 子进程；`dryRun` 不进子进程，直接出预演过程页，零远端调用）；
 * ③ 任一步失败即非 0：「没拉到」按拉取分类走 2→3／3→4、「拉到了没写进」走 3→4
 *   （码翻译见跑道；修掉老「写库失败仍退 0」，`#608 §三·5`），失败不落成功页。
 *
 * 两态（同一命令，`dryRun` 分流）：
 * - `dryRun: true` → 过程页（回写区间 ＋ 三步预告 ＋ 幂等与冲突口径，远端未调用）；
 * - 缺省 → 结果页（逐天回写结局 ＋ 新增／更新合计 ＋ 本地／远端区分）。
 *
 * 本命令不读计划、不读运动记录：区间展开与落库都在子进程里（`backfill.ts`），父进程只传
 * `--date`／`--days` 原样，不做第二处日期换算（铁律二：范围口径唯一定义地在子进程那侧）。
 */
import type { DatabaseSync } from 'node:sqlite';
import { renderDataTable, renderKpiGrid } from 'base-paint/blocks';
import type { SerializableEnvelope } from 'base-paint';
import { todayISO } from '../analysis/utils.js';
import { planCopyBlock } from '../render/planCopyBlock.js';
import type { CrudReceipt } from '../render/receipt.js';
import { assembleDocPage } from '../shared/docPage.js';
import { copyLog } from '../shared/copyArea.js';
import { dayField, fail, optInt } from '../shared/params.js';
import { R, commandLine, provided } from '../shared/writeParts.js';
import type { WriteOut } from '../shared/commandSpec.js';
import { XUNJI_STUB_ENV, invokeXunji, xunjiExitToCmd } from './xunjiRunner.js';
import type { XunjiCall } from './xunjiRunner.js';

export const XUNJI_BACKFILL_KEY = 'calorie.workout.xunji-backfill';
const XUNJI_BACKFILL_WAKE = '拉训记实绩';
const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';
const DOC_TITLE = '卡路里·健身计划回执';

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
    fail(4, step + '回执解析失败（backfill 的 stdout 缺区间汇总键）：' + JSON.stringify(data ?? null).slice(0, 160));
  }
  return o as BackfillRangeSummary;
}

/** `dryRun` 参数：缺省 false；非布尔即用法错（exit 2，不调外部）。 */
function readDryRun(params: Record<string, unknown>): boolean {
  const v = params['dryRun'];
  if (v === undefined || v === null) return false;
  if (typeof v !== 'boolean') fail(2, '参数 dryRun 须为布尔值');
  return v as boolean;
}

/** `days` 参数：缺省 1；非 ≥1 整数即用法错（exit 2；坏天数拒收，`#608 §八·1`，不静默吞成 1 天）。 */
function readDays(params: Record<string, unknown>): number {
  const v = optInt(params, 'days');
  if (v === undefined) return 1;
  if (v < 1) fail(2, '参数 days 须为 ≥1 整数（实际：' + String(params['days']) + '）');
  return v as number;
}

function envelopeOf(key: string, message: string): SerializableEnvelope {
  return {
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'receipt', key,
    data: { ok: true, message },
  };
}

function copyBlock(key: string, params: Record<string, unknown>, receipt: CrudReceipt): string {
  return planCopyBlock({
    envelope: envelopeOf(key, receipt.summary),
    log: copyLog({
      command: commandLine(key, params),
      source: '训记实绩回写读数（运动记录）',
      m5Line: receipt.m5Line,
      actionAt: receipt.meta.actionAt,
      version: DOC_VERSION,
    }),
  });
}

/** 失败天点名（读数可解析时）：「没拉到」与「拉到了没写进」是两种失败，文案分得清（`#608 §三·5`）。 */
function dayFailures(data: unknown): string[] {
  const o = data as { results?: unknown } | null;
  if (typeof o !== 'object' || o === null || !Array.isArray(o.results)) return [];
  const out: string[] = [];
  for (const r of o.results as unknown[]) {
    const d = r as { date?: unknown; fetch_ok?: unknown; err?: unknown } | null;
    if (typeof d !== 'object' || d === null || typeof d.date !== 'string') continue;
    if (d.fetch_ok === false) out.push(d.date + '没拉到');
    else if (typeof d.err === 'string' && d.err !== '') out.push(d.date + '拉到了没写进');
  }
  return out;
}

/** 回写失败：本地缺 KEY 点名没调远端（exit 3），其余按天点名失败分类（exit 4）。 */
function failBackfill(end: string, days: number, call: XunjiCall): never {
  if (call.code === 2) {
    fail(3, '拉训记实绩失败（' + end + ' 往前 ' + days + ' 天）：本地缺 KEY（没调远端）：先看训记 KEY 状态再重试');
  }
  const named = dayFailures(call.data);
  fail(
    xunjiExitToCmd(call.code),
    '拉训记实绩失败（' + end + ' 往前 ' + days + ' 天）'
      + (named.length === 0 ? '' : '：' + named.join('、')) + '：稍后重试'
      + (call.stderr === '' ? '' : '（' + call.stderr + '）'),
  );
}

/** `calorie.workout.xunji-backfill` · 拉训记实绩（拉取 → 回写 → 回执同一命令）。 */
export function writeXunjiBackfill(params: Record<string, unknown>, _db: DatabaseSync): WriteOut {
  const end = dayField(params, 'date') ?? todayISO();
  const days = readDays(params);
  const dryRun = readDryRun(params);
  if (dryRun) {
    const message = '预演：从训记拉 ' + end + ' 往前 ' + days + ' 天（远端未调用）';
    const receipt = R('拉训记实绩', 'update', message, XUNJI_BACKFILL_WAKE, '训记实绩回写读数（运动记录）', {
      recordId: null, ids: [], idSource: 'condition', writtenFields: provided(params, ['date', 'days', 'dryRun']),
      items: [{ status: '成功', reason: '', detail: message }],
    });
    const html = backfillProcessPage(params, end, days, receipt, false);
    return { data: { ok: true, message, receipt }, html };
  }
  const call = invokeXunji(['backfill', '--date', end, '--days', String(days)], '拉训记实绩');
  if (call.code !== 0) failBackfill(end, days, call);
  const summary = asBackfillSummary(call.data, '拉训记实绩');
  const message = '已拉训记实绩并回写：' + summary.end_date + ' 往前 ' + summary.days + ' 天，新增 '
    + summary.total_inserted + '，更新 ' + summary.total_updated;
  const receipt = R('拉训记实绩', 'update', message, XUNJI_BACKFILL_WAKE, '训记实绩回写读数（运动记录）', {
    recordId: null, ids: [], idSource: 'condition', writtenFields: provided(params, ['date', 'days', 'dryRun']),
    items: [{ status: '成功', reason: '', detail: message }],
  });
  const html = backfillResultPage(params, summary, receipt, call.stubbed);
  return { data: { ok: true, message, receipt }, html };
}

/** 过程页（`dryRun`）：回写区间 ＋ 三步预告 ＋ 幂等与冲突口径；远端未调用写在页头。 */
function backfillProcessPage(params: Record<string, unknown>, end: string, days: number, receipt: CrudReceipt, stubbed: boolean): string {
  const message = '预演：从训记拉 ' + end + ' 往前 ' + days + ' 天（远端未调用）';
  const content = [
    renderKpiGrid([
      { label: '结束日', value: end, detail: '回写到哪一天为止' },
      { label: '往前', value: days + ' 天', detail: '回写 [结束日−N＋1，结束日]，新在前' },
      { label: '远端', value: '未调用', detail: '预演不调训记接口，不写运动记录' },
    ]),
    renderDataTable({
      columns: [{ key: 'step', label: '步骤' }, { key: 'does', label: '会做什么' }],
      rows: [
        { step: '拉取', does: '按天拉训记训练数据（只读训记，不改本仓）' },
        { step: '转行', does: '已完成标记才转行。范围次数取大，缺单位自动换算' },
        { step: '回写', does: '显式事务落运动记录，失败整天回滚' },
      ],
      caption: '实跑三步预告',
    }),
    renderDataTable({
      columns: [{ key: 'k', label: '项' }, { key: 'v', label: '值' }],
      rows: [
        { k: '重复拉取', v: '按单号加类型加序号三列认同一行，重复拉只更新不翻倍' },
        { k: '本地备注', v: '手填的备注与日期回写时保留，不覆盖' },
        { k: '空天', v: '训记那天空无训练即跳过，不算失败' },
        { k: '本地', v: '参数已验过，区间与口径见上两表' },
        { k: '远端', v: '未调用（预演不调训记接口）' },
        ...(stubbed ? [{ k: '数据来源', v: '本地挡板（' + XUNJI_STUB_ENV + '，未调远端）' }] : []),
      ],
      caption: '本地成远端没成分得清',
    }),
    copyBlock(XUNJI_BACKFILL_KEY, params, receipt),
  ].join('');
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '拉训记实绩',
    eyebrow: '健身计划',
    subtitle: '过程页（预演：只看区间与口径）',
    content,
    pageUi: true,
  });
}

/** 结果页：逐天回写结局 ＋ 新增／更新合计 ＋ 本地／远端区分。 */
function backfillResultPage(params: Record<string, unknown>, summary: BackfillRangeSummary, receipt: CrudReceipt, stubbed: boolean): string {
  const message = '已拉训记实绩并回写：' + summary.end_date + ' 往前 ' + summary.days + ' 天，新增 '
    + summary.total_inserted + '，更新 ' + summary.total_updated;
  const content = [
    renderKpiGrid([
      { label: '区间', value: summary.end_date + ' 往前 ' + summary.days + ' 天', detail: '新在前' },
      { label: '新增', value: summary.total_inserted + ' 行', detail: '训记有、本地没有的行' },
      { label: '更新', value: summary.total_updated + ' 行', detail: '两边都有、训记新的行' },
    ]),
    renderDataTable({
      columns: [
        { key: 'date', label: '日期' },
        { key: 'fetched', label: '拉取' },
        { key: 'inserted', label: '新增' },
        { key: 'updated', label: '更新' },
      ],
      rows: summary.results.map((r) => ({
        date: r.date,
        fetched: r.skipped_empty ? '训记空（跳过）' : r.trains_count + ' 条训练',
        inserted: r.inserted + ' 行',
        updated: r.updated + ' 行',
      })),
      caption: '逐天回写结局',
    }),
    renderDataTable({
      columns: [{ key: 'k', label: '项' }, { key: 'v', label: '值' }],
      rows: [
        { k: '远端', v: '训记 ' + summary.results.length + ' 天全部拉到' },
        { k: '本地', v: '运动记录新增 ' + summary.total_inserted + ' 行、更新 ' + summary.total_updated + ' 行（事务落库）' },
        ...(stubbed ? [{ k: '数据来源', v: '本地挡板（' + XUNJI_STUB_ENV + '，未调远端）' }] : []),
      ],
      caption: '本地成远端没成分得清',
    }),
    copyBlock(XUNJI_BACKFILL_KEY, params, receipt),
  ].join('');
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '拉训记实绩',
    eyebrow: '健身计划',
    subtitle: '结果页',
    content,
    pageUi: true,
  });
}
