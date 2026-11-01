/** 同步到训记（HELP 场景 05「健身计划」下一级「落地训练」）：`calorie.workout.xunji-push` 写。
 *
 * 链（老 `render_plan_receipt.py --live-plan-sync` 的 "1.审计动作名→2.推送→3.回执"，`t168:104`）：
 * ① 参数先验（用法错 exit 2，不调外部）；② 读当天训练段（workout 自有 `planStore`，只读，与 `write.ts`
 *    同一对引用：`./planStore.js` ＋ 落地链取数件 `./land.js` 的 `landSessionsOf`，不另起取数）；
 * ③ 审计动作名（训记能力门 `verifyMovements`，只读校验、原样上报；审计只提示不拦推，
 *    沿 `#607 §八·7`「推送前不校验动作库」）；④ 调 `xunji push-plan`（经 `./xunjiRunner.js` 子进程；
 *    `dryRun` 转 `--dry-run`，零远端调用）；⑤ 任一步失败即非 0（码翻译见跑道）＋失败不落成功页。
 *
 * 三态：
 * - 结构性缺失（没计划／计划缺开始日期）→ `landPlanGate` 阻断，exit 4（与落地链同一份判据）；
 * - 当天没排训练段 → `landNothing` 回「无事可做」页，exit 0，不调训记、不起子进程（`#943` 第三选项）；
 * - 有段 → `dryRun: true` 过程页（审计结论 ＋ 待推送段 ＋ 转换读数 ＋ 训记 KEY 有无，远端未调用）／
 *   缺省 结果页（逐段推送结局 ＋ 训记回显说明 ＋ 本地／远端区分）。
 */
import type { DatabaseSync } from 'node:sqlite';
import { renderDataTable, renderKpiGrid } from 'base-paint/blocks';
import { todayISO } from '../analysis/utils.js';
import type { CrudReceipt } from '../render/receipt.js';
import { verifyMovements } from '../xunji/index.js';
import type { MovementVerifyReport } from '../xunji/index.js';
import { assembleDocPage } from '../shared/docPage.js';
import { copyBlock } from '../shared/copyBlock.js';
import { dayField, fail } from '../shared/params.js';
import { isRealISODate } from '../shared/time.js';
import { R, provided } from '../shared/writeParts.js';
import type { WriteOut } from '../shared/commandSpec.js';
import { getPlan } from './planStore.js';
import type { PlanSessionRow } from './planStore.js';
import { landNoSegmentWhy, landNothing, landPlanGate, landSessionsOf } from './land.js';
import { buildLandNothingPage } from './landPages.js';
import { XUNJI_STUB_ENV, invokeXunji, xunjiExitToCmd } from './xunjiRunner.js';
import type { XunjiCall } from './xunjiRunner.js';
import { xunjiKeyNext, xunjiKeyRow } from './xunjiKey.js';
import { m } from '../entries/index.js';

export const XUNJI_PUSH_KEY = 'calorie.workout.xunji-push';
const XUNJI_PUSH_WAKE = '同步到训记';
const DOC_TITLE = (): string => m('skill-calorie.workout-xunjiPush.c097');

/** 子进程 `push-plan` stdout 的最小形状守卫（成功分支；缺键即回执解析失败 exit 4）。 */
export interface PushPlanSummary {
  readonly date: string;
  readonly session_count: number;
  readonly ok_count: number;
  readonly fail_count: number;
  readonly verify_note: string;
  readonly note?: string;
  readonly results: readonly {
    readonly session_label: string;
    readonly ok: boolean;
    readonly verified: boolean;
  }[];
}

function asPushSummary(data: unknown, step: string): PushPlanSummary {
  const o = data as Partial<PushPlanSummary> | null | undefined;
  if (
    typeof o !== 'object' || o === null || typeof o.date !== 'string'
    || typeof o.session_count !== 'number' || typeof o.ok_count !== 'number'
    || typeof o.fail_count !== 'number' || typeof o.verify_note !== 'string' || !Array.isArray(o.results)
  ) {
    fail(4, m('skill-calorie.workout-xunjiPush.c001', {
      p0: String(step),
      p1: String(JSON.stringify(data ?? null).slice(0, 160)),
    }));
  }
  return o as PushPlanSummary;
}

/** `dryRun` 参数：缺省 false；非布尔即用法错（exit 2，不调外部）。 */
function readDryRun(params: Record<string, unknown>): boolean {
  const v = params['dryRun'];
  if (v === undefined || v === null) return false;
  if (typeof v !== 'boolean') fail(2, m('skill-calorie.workout-xunjiPush.c002'));
  return v as boolean;
}

/** 审计动作名（只读；库读不出即「无法验证」，不拦推——提示在页上，不进退出码）。 */
function auditMovements(sessions: readonly PlanSessionRow[]): MovementVerifyReport | null {
  const names = [...new Set(
    sessions.flatMap((s) => s.movements.map((m) => m.name)).filter((n): n is string => typeof n === 'string' && n !== ''),
  )];
  if (names.length === 0) return null;
  return verifyMovements(names);
}

/** 审计表行（动作／结论／建议名——建议只在不通过时给，不过的不拦推）。 */
function auditRows(audit: MovementVerifyReport | null): { movement: string; verdict: string; suggest: string }[] {
  if (audit === null) return [{ movement: m('skill-calorie.workout-xunjiPush.c003'), verdict: '—', suggest: '—' }];
  return audit.results.map((r) => ({
    movement: r.name,
    verdict: r.valid === true ? m('skill-calorie.workout-xunjiPush.c004') : (r.valid === false ? m('skill-calorie.workout-xunjiPush.c005') : m('skill-calorie.workout-xunjiPush.c006')),
    suggest: r.valid === false ? (r.suggestion ?? '—') : '—',
  }));
}

/** 失败读数里分本地／远端：`push-plan` 无 KEY 退 3（`fail_count` 路径，见 `run.ts:191-194`），
 * 但逐段 `attempts: 0` ＋ 鉴权错证明没调网——这支走 key 档（exit 3），其余一律远端失败（exit 4）。 */
function localNoKey(data: unknown): boolean {
  const o = data as { fail_count?: unknown; results?: unknown } | null;
  if (typeof o !== 'object' || o === null || typeof o.fail_count !== 'number' || o.fail_count <= 0) return false;
  if (!Array.isArray(o.results) || o.results.length === 0) return false;
  return (o.results as unknown[]).every((r) => {
    const rr = r as { ok?: unknown; resp?: unknown } | null;
    if (typeof rr !== 'object' || rr === null || rr.ok !== false) return false;
    const resp = rr.resp as { err?: unknown; error_type?: unknown; code?: unknown; attempts?: unknown } | null;
    return typeof resp === 'object' && resp !== null && resp.err === true
      && resp.error_type === 'auth' && (resp.code === null || resp.code === undefined) && resp.attempts === 0;
  });
}

/** 推送失败：本地缺 KEY 点名没调远端＋可复制的下一步（exit 3），远端失败点名段数与子进程尾行（exit 4）。 */
function failPush(date: string, call: XunjiCall): never {
  if (call.code === 2 || localNoKey(call.data)) {
    fail(3, m('skill-calorie.workout-xunjiPush.c007', { p0: String(date), p1: String(xunjiKeyNext()) }));
  }
  const o = call.data as { ok_count?: unknown; fail_count?: unknown; session_count?: unknown } | null;
  const counts = typeof o === 'object' && o !== null
    && typeof o.ok_count === 'number' && typeof o.fail_count === 'number' && typeof o.session_count === 'number'
    ? m('skill-calorie.workout-xunjiPush.c008', {
      p0: String(o.ok_count),
      p1: String(o.fail_count),
      p2: String(o.session_count),
    }) : m('skill-calorie.workout-xunjiPush.c009');
  fail(
    xunjiExitToCmd(call.code),
    m('skill-calorie.workout-xunjiPush.c010', {
      p0: String(date),
      p1: String(counts),
      p2: String(call.stderr === '' ? '' : '（' + call.stderr + '）'),
    }),
  );
}

/** `calorie.workout.xunji-push` · 同步到训记（审计 → 推送 → 回执同一命令）。 */
export function writeXunjiPush(params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  const date = dayField(params, 'date') ?? todayISO();
  // 形状对、日历上没这一天的那种日期（2026-13-40）算不出周次，会被下面误判成「这天是休息日」——
  // 先在用法层拦掉（exit 2），别把它回成一张「无事可做」页（旧口径这一档由子进程拦，exit 4）。
  if (!isRealISODate(date)) fail(2, m('skill-calorie.workout-xunjiPush.c011', { p0: String(date) }));
  const dryRun = readDryRun(params);
  const plan = getPlan(db);
  landPlanGate(plan); // 结构性缺失（库／计划行不在、缺开始日期）才阻断，exit 4（与落地链同一份判据）
  const sessions = landSessionsOf(plan, date);
  if (sessions.length === 0) {
    // 这天没有安排（#943 第三选项，与落地三条键同一张页、同一个回执口径）：不调训记、不起子进程，
    // 回「无事可做」页。旧口径在这里照样起子进程拿 0 段读数，再回一张写着「已同步 … 0 段成功」的页。
    const why = landNoSegmentWhy(plan, date) ?? m('skill-calorie.workout-xunjiPush.c012');
    return landNothing(XUNJI_PUSH_WAKE, params, why, date, (receipt) =>
      buildLandNothingPage({
        key: XUNJI_PUSH_KEY, params, wake: XUNJI_PUSH_WAKE, scope: date, why, receipt,
        unitLabel: m('skill-calorie.workout-xunjiPush.c013'), stepLabel: m('skill-calorie.workout-xunjiPush.c014'), whyLabel: m('skill-calorie.workout-xunjiPush.c015'),
      }));
  }
  const audit = auditMovements(sessions);
  const invalid = audit === null ? 0 : audit.invalid_count;
  const argv = dryRun ? ['push-plan', '--date', date, '--dry-run'] : ['push-plan', '--date', date];
  const call = invokeXunji(argv, m('skill-calorie.workout-xunjiPush.c016'));
  if (call.code !== 0) failPush(date, call);
  const summary = asPushSummary(call.data, m('skill-calorie.workout-xunjiPush.c017'));
  const failPhrase = summary.fail_count > 0 ? m('skill-calorie.workout-xunjiPush.c018', { p0: String(summary.fail_count) }) : '';
  const message = dryRun
    ? m('skill-calorie.workout-xunjiPush.c019', { p0: String(date), p1: String(summary.session_count) })
    : m('skill-calorie.workout-xunjiPush.c020', {
      p0: String(date),
      p1: String(summary.ok_count),
      p2: String(failPhrase),
    });
  const receipt = R(m('skill-calorie.workout-xunjiPush.c021'), 'create', message, XUNJI_PUSH_WAKE, m('skill-calorie.workout-xunjiPush.c022'), {
    recordId: null, ids: [], idSource: 'condition', writtenFields: provided(params, ['date', 'dryRun']),
    items: [{ status: m('skill-calorie.workout-xunjiPush.c023'), reason: '', detail: message }],
  });
  const html = dryRun
    ? pushProcessPage(params, date, sessions, audit, summary, receipt, call.stubbed)
    : pushResultPage(params, date, sessions, audit, invalid, summary, receipt, call.stubbed);
  return { data: { ok: true, message, receipt }, html };
}

/** 过程页（`dryRun`）：审计结论 ＋ 待推送段 ＋ 转换读数；远端未调用写在页头。 */
function pushProcessPage(
  params: Record<string, unknown>, date: string, sessions: readonly PlanSessionRow[],
  audit: MovementVerifyReport | null, summary: PushPlanSummary, receipt: CrudReceipt, stubbed: boolean,
): string {
  const message = m('skill-calorie.workout-xunjiPush.c024', { p0: String(date), p1: String(summary.session_count) });
  const auditOk = audit === null ? 0 : audit.valid_count;
  const auditBad = audit === null ? 0 : audit.invalid_count;
  const auditTotal = audit === null ? 0 : audit.total;
  const content = [
    renderKpiGrid([
      { label: m('skill-calorie.workout-xunjiPush.c025'), value: date, detail: m('skill-calorie.workout-xunjiPush.c026') },
      { label: m('skill-calorie.workout-xunjiPush.c027'), value: m('skill-calorie.workout-xunjiPush.c028', { p0: String(sessions.length) }), detail: sessions.map((s) => s.session_label).join('、') || m('skill-calorie.workout-xunjiPush.c029') },
      {
        label: m('skill-calorie.workout-xunjiPush.c030'),
        value: audit === null ? m('skill-calorie.workout-xunjiPush.c031') : m('skill-calorie.workout-xunjiPush.c032', { p0: String(auditOk) }),
        detail: audit === null
          ? m('skill-calorie.workout-xunjiPush.c033')
          : (audit.catalog_loaded
            ? m('skill-calorie.workout-xunjiPush.c034', { p0: String(auditBad), p1: String(auditTotal) })
            : m('skill-calorie.workout-xunjiPush.c035')),
      },
    ]),
    renderDataTable({
      columns: [{ key: 'movement', label: m('skill-calorie.workout-xunjiPush.c036') }, { key: 'verdict', label: m('skill-calorie.workout-xunjiPush.c037') }, { key: 'suggest', label: m('skill-calorie.workout-xunjiPush.c038') }],
      rows: auditRows(audit),
      caption: m('skill-calorie.workout-xunjiPush.c039'),
    }),
    renderDataTable({
      columns: [{ key: 'label', label: m('skill-calorie.workout-xunjiPush.c040') }, { key: 'moves', label: m('skill-calorie.workout-xunjiPush.c041') }],
      rows: sessions.length === 0
        ? [{ label: m('skill-calorie.workout-xunjiPush.c042'), moves: m('skill-calorie.workout-xunjiPush.c043') }]
        : sessions.map((s) => ({ label: s.session_label, moves: s.movements.map((mv) => mv.name ?? m('skill-calorie.workout-xunjiPush.c044')).join('、') || m('skill-calorie.workout-xunjiPush.c045') })),
      caption: m('skill-calorie.workout-xunjiPush.c046'),
    }),
    renderDataTable({
      columns: [{ key: 'k', label: m('skill-calorie.workout-xunjiPush.c047') }, { key: 'v', label: m('skill-calorie.workout-xunjiPush.c048') }],
      rows: [
        { k: m('skill-calorie.workout-xunjiPush.c049'), v: m('skill-calorie.workout-xunjiPush.c050', { p0: String(summary.session_count) }) },
        { k: m('skill-calorie.workout-xunjiPush.c051'), v: m('skill-calorie.workout-xunjiPush.c052') },
        xunjiKeyRow(),
        ...(stubbed ? [{ k: m('skill-calorie.workout-xunjiPush.c053'), v: m('skill-calorie.workout-xunjiPush.c054', { p0: String(XUNJI_STUB_ENV) }) }] : []),
      ],
      caption: m('skill-calorie.workout-xunjiPush.c055'),
    }),
    copyBlock(XUNJI_PUSH_KEY, params, receipt, m('skill-calorie.workout-xunjiPush.c056')),
  ].join('');
  return assembleDocPage({
    docTitle: DOC_TITLE(),
    title: m('skill-calorie.workout-xunjiPush.c057'),
    eyebrow: m('skill-calorie.workout-xunjiPush.c058'),
    subtitle: m('skill-calorie.workout-xunjiPush.c059'),
    content,
    pageUi: true,
  });
}

/** 结果页：逐段推送结局 ＋ 训记回显说明 ＋ 本地／远端区分。 */
function pushResultPage(
  params: Record<string, unknown>, date: string, sessions: readonly PlanSessionRow[],
  audit: MovementVerifyReport | null, invalid: number, summary: PushPlanSummary, receipt: CrudReceipt, stubbed: boolean,
): string {
  const failPhrase = summary.fail_count > 0 ? m('skill-calorie.workout-xunjiPush.c060', { p0: String(summary.fail_count) }) : '';
  const message = m('skill-calorie.workout-xunjiPush.c061', {
    p0: String(date),
    p1: String(summary.ok_count),
    p2: String(failPhrase),
  });
  const missingPhrase = summary.fail_count > 0 ? m('skill-calorie.workout-xunjiPush.c062', { p0: String(summary.fail_count) }) : '';
  const content = [
    renderKpiGrid([
      { label: m('skill-calorie.workout-xunjiPush.c063'), value: date, detail: m('skill-calorie.workout-xunjiPush.c064') },
      {
        label: m('skill-calorie.workout-xunjiPush.c065'),
        value: m('skill-calorie.workout-xunjiPush.c066', { p0: String(summary.ok_count) }),
        detail: m('skill-calorie.workout-xunjiPush.c067', {
          p0: String(summary.fail_count),
          p1: String(summary.session_count),
        }),
      },
      {
        label: m('skill-calorie.workout-xunjiPush.c068'),
        value: audit === null ? m('skill-calorie.workout-xunjiPush.c069') : m('skill-calorie.workout-xunjiPush.c070', { p0: String(invalid) }),
        detail: audit === null ? m('skill-calorie.workout-xunjiPush.c071') : m('skill-calorie.workout-xunjiPush.c072'),
      },
    ]),
    renderDataTable({
      columns: [{ key: 'label', label: m('skill-calorie.workout-xunjiPush.c073') }, { key: 'ok', label: m('skill-calorie.workout-xunjiPush.c074') }, { key: 'echo', label: m('skill-calorie.workout-xunjiPush.c075') }],
      rows: summary.results.length === 0
        ? [{ label: m('skill-calorie.workout-xunjiPush.c076'), ok: '—', echo: summary.note ?? m('skill-calorie.workout-xunjiPush.c077') }]
        : summary.results.map((r) => ({
          label: r.session_label,
          ok: r.ok ? m('skill-calorie.workout-xunjiPush.c078') : m('skill-calorie.workout-xunjiPush.c079'),
          echo: r.verified ? m('skill-calorie.workout-xunjiPush.c080') : m('skill-calorie.workout-xunjiPush.c081'),
        })),
      caption: m('skill-calorie.workout-xunjiPush.c082'),
    }),
    renderDataTable({
      columns: [{ key: 'k', label: m('skill-calorie.workout-xunjiPush.c083') }, { key: 'v', label: m('skill-calorie.workout-xunjiPush.c084') }],
      rows: [
        { k: m('skill-calorie.workout-xunjiPush.c085'), v: m('skill-calorie.workout-xunjiPush.c086', { p0: String(sessions.length) }) },
        { k: m('skill-calorie.workout-xunjiPush.c087'), v: m('skill-calorie.workout-xunjiPush.c088', { p0: String(summary.ok_count), p1: String(missingPhrase) }) },
        { k: m('skill-calorie.workout-xunjiPush.c089'), v: summary.verify_note },
        ...(stubbed ? [{ k: m('skill-calorie.workout-xunjiPush.c090'), v: m('skill-calorie.workout-xunjiPush.c091', { p0: String(XUNJI_STUB_ENV) }) }] : []),
      ],
      caption: m('skill-calorie.workout-xunjiPush.c092'),
    }),
    copyBlock(XUNJI_PUSH_KEY, params, receipt, m('skill-calorie.workout-xunjiPush.c093')),
  ].join('');
  return assembleDocPage({
    docTitle: DOC_TITLE(),
    title: m('skill-calorie.workout-xunjiPush.c094'),
    eyebrow: m('skill-calorie.workout-xunjiPush.c095'),
    subtitle: m('skill-calorie.workout-xunjiPush.c096'),
    content,
    pageUi: true,
  });
}
