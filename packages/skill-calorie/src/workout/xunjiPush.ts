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

export const XUNJI_PUSH_KEY = 'calorie.workout.xunji-push';
const XUNJI_PUSH_WAKE = '同步到训记';
const DOC_TITLE = '卡路里·健身计划回执';

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
    fail(4, step + '回执解析失败（push-plan 的 stdout 缺汇总键）：' + JSON.stringify(data ?? null).slice(0, 160));
  }
  return o as PushPlanSummary;
}

/** `dryRun` 参数：缺省 false；非布尔即用法错（exit 2，不调外部）。 */
function readDryRun(params: Record<string, unknown>): boolean {
  const v = params['dryRun'];
  if (v === undefined || v === null) return false;
  if (typeof v !== 'boolean') fail(2, '参数 dryRun 须为布尔值');
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
  if (audit === null) return [{ movement: '（当天无动作可审）', verdict: '—', suggest: '—' }];
  return audit.results.map((r) => ({
    movement: r.name,
    verdict: r.valid === true ? '训记可识别' : (r.valid === false ? '训记不识别（仍会原样推送）' : '无法验证（库读不出）'),
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
    fail(3, '同步到训记失败（' + date + '）：本地缺 KEY（没调远端）：' + xunjiKeyNext());
  }
  const o = call.data as { ok_count?: unknown; fail_count?: unknown; session_count?: unknown } | null;
  const counts = typeof o === 'object' && o !== null
    && typeof o.ok_count === 'number' && typeof o.fail_count === 'number' && typeof o.session_count === 'number'
    ? '成功 ' + o.ok_count + '／失败 ' + o.fail_count + '（共 ' + o.session_count + ' 段）' : '（读数缺段数）';
  fail(
    xunjiExitToCmd(call.code),
    '同步到训记失败（' + date + '）：远端推送失败' + counts + '：稍后重试，远端是否落笔以训记 App 为准'
      + (call.stderr === '' ? '' : '（' + call.stderr + '）'),
  );
}

/** `calorie.workout.xunji-push` · 同步到训记（审计 → 推送 → 回执同一命令）。 */
export function writeXunjiPush(params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  const date = dayField(params, 'date') ?? todayISO();
  // 形状对、日历上没这一天的那种日期（2026-13-40）算不出周次，会被下面误判成「这天是休息日」——
  // 先在用法层拦掉（exit 2），别把它回成一张「无事可做」页（旧口径这一档由子进程拦，exit 4）。
  if (!isRealISODate(date)) fail(2, 'date 不是真实日历日（实际：' + date + '）');
  const dryRun = readDryRun(params);
  const plan = getPlan(db);
  landPlanGate(plan); // 结构性缺失（库／计划行不在、缺开始日期）才阻断，exit 4（与落地链同一份判据）
  const sessions = landSessionsOf(plan, date);
  if (sessions.length === 0) {
    // 这天没有安排（#943 第三选项，与落地三条键同一张页、同一个回执口径）：不调训记、不起子进程，
    // 回「无事可做」页。旧口径在这里照样起子进程拿 0 段读数，再回一张写着「已同步 … 0 段成功」的页。
    const why = landNoSegmentWhy(plan, date) ?? '这天没有可推送的训练段';
    return landNothing(XUNJI_PUSH_WAKE, params, why, date, (receipt) =>
      buildLandNothingPage({
        key: XUNJI_PUSH_KEY, params, wake: XUNJI_PUSH_WAKE, scope: date, why, receipt,
        unitLabel: '待推送段', stepLabel: '推送', whyLabel: '为什么没得推送',
      }));
  }
  const audit = auditMovements(sessions);
  const invalid = audit === null ? 0 : audit.invalid_count;
  const argv = dryRun ? ['push-plan', '--date', date, '--dry-run'] : ['push-plan', '--date', date];
  const call = invokeXunji(argv, '同步到训记');
  if (call.code !== 0) failPush(date, call);
  const summary = asPushSummary(call.data, '同步到训记');
  const message = dryRun
    ? '预演：' + date + ' ' + summary.session_count + ' 段待推送（远端未调用）'
    : '已同步 ' + date + ' 训练计划到训记：' + summary.ok_count + ' 段成功' + (summary.fail_count > 0 ? '、' + summary.fail_count + ' 段失败' : '');
  const receipt = R('同步到训记', 'create', message, XUNJI_PUSH_WAKE, '训练计划（workout_plans）＋ 训记推送读数', {
    recordId: null, ids: [], idSource: 'condition', writtenFields: provided(params, ['date', 'dryRun']),
    items: [{ status: '成功', reason: '', detail: message }],
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
  const message = '预演：' + date + ' ' + summary.session_count + ' 段待推送（远端未调用）';
  const auditOk = audit === null ? 0 : audit.valid_count;
  const auditBad = audit === null ? 0 : audit.invalid_count;
  const auditTotal = audit === null ? 0 : audit.total;
  const content = [
    renderKpiGrid([
      { label: '日期', value: date, detail: '推送哪一天的计划' },
      { label: '待推送段', value: sessions.length + ' 段', detail: sessions.map((s) => s.session_label).join('、') || '当天没排练（空天）' },
      {
        label: '动作审计',
        value: audit === null ? '当天无动作可审' : '通过 ' + auditOk + ' 个',
        detail: audit === null
          ? '段内没有动作名'
          : (audit.catalog_loaded
            ? '不通过 ' + auditBad + ' 个，共 ' + auditTotal + ' 个。不通过的动作仍会原样推送，建议名见下表'
            : '动作库读不出，本次无法验证。不通过的动作仍会原样推送，建议名见下表'),
      },
    ]),
    renderDataTable({
      columns: [{ key: 'movement', label: '动作' }, { key: 'verdict', label: '审计结论' }, { key: 'suggest', label: '建议名' }],
      rows: auditRows(audit),
      caption: '动作名审计（只读校验）',
    }),
    renderDataTable({
      columns: [{ key: 'label', label: '训练段' }, { key: 'moves', label: '动作' }],
      rows: sessions.length === 0
        ? [{ label: '（空天）', moves: '这天没排练，推送即回段数 0' }]
        : sessions.map((s) => ({ label: s.session_label, moves: s.movements.map((m) => m.name ?? '（未命名动作）').join('、') || '（段内无动作）' })),
      caption: '待推送段',
    }),
    renderDataTable({
      columns: [{ key: 'k', label: '项' }, { key: 'v', label: '值' }],
      rows: [
        { k: '本地', v: '转换成功：备好 ' + summary.session_count + ' 段' },
        { k: '远端', v: '未调用（预演不调训记接口）' },
        xunjiKeyRow(),
        ...(stubbed ? [{ k: '数据来源', v: '本地挡板（' + XUNJI_STUB_ENV + '，未调远端）' }] : []),
      ],
      caption: '本地成远端没成分得清',
    }),
    copyBlock(XUNJI_PUSH_KEY, params, receipt, '训练计划（workout_plans）＋ 训记推送读数'),
  ].join('');
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '同步到训记',
    eyebrow: '健身计划',
    subtitle: '过程页（预演：只转换不推送）',
    content,
    pageUi: true,
  });
}

/** 结果页：逐段推送结局 ＋ 训记回显说明 ＋ 本地／远端区分。 */
function pushResultPage(
  params: Record<string, unknown>, date: string, sessions: readonly PlanSessionRow[],
  audit: MovementVerifyReport | null, invalid: number, summary: PushPlanSummary, receipt: CrudReceipt, stubbed: boolean,
): string {
  const message = '已同步 ' + date + ' 训练计划到训记：' + summary.ok_count + ' 段成功'
    + (summary.fail_count > 0 ? '、' + summary.fail_count + ' 段失败' : '');
  const content = [
    renderKpiGrid([
      { label: '日期', value: date, detail: '推送哪一天的计划' },
      {
        label: '推送',
        value: '成功 ' + summary.ok_count + ' 段',
        detail: '失败 ' + summary.fail_count + ' 段，共 ' + summary.session_count + ' 段',
      },
      {
        label: '动作审计',
        value: audit === null ? '当天无动作可审' : '不通过 ' + invalid + ' 个',
        detail: audit === null ? '段内没有动作名' : '审计只提示，不拦推。建议名见过程页',
      },
    ]),
    renderDataTable({
      columns: [{ key: 'label', label: '训练段' }, { key: 'ok', label: '推送' }, { key: 'echo', label: '训记回显' }],
      rows: summary.results.length === 0
        ? [{ label: '（空天）', ok: '—', echo: summary.note ?? '这天没排练，段数 0' }]
        : summary.results.map((r) => ({
          label: r.session_label,
          ok: r.ok ? '成功' : '失败',
          echo: r.verified ? '训记已显式回执' : '以训记 App 为准（接口回显缺 trains 属已知缺陷）',
        })),
      caption: '逐段推送结局',
    }),
    renderDataTable({
      columns: [{ key: 'k', label: '项' }, { key: 'v', label: '值' }],
      rows: [
        { k: '本地', v: '计划 ' + sessions.length + ' 段全部参与推送' },
        { k: '远端', v: '训记落笔 ' + summary.ok_count + ' 段' + (summary.fail_count > 0 ? '、未落笔 ' + summary.fail_count + ' 段' : '') },
        { k: '回显口径', v: summary.verify_note },
        ...(stubbed ? [{ k: '数据来源', v: '本地挡板（' + XUNJI_STUB_ENV + '，未调远端）' }] : []),
      ],
      caption: '本地成远端没成分得清',
    }),
    copyBlock(XUNJI_PUSH_KEY, params, receipt, '训练计划（workout_plans）＋ 训记推送读数'),
  ].join('');
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '同步到训记',
    eyebrow: '健身计划',
    subtitle: '结果页',
    content,
    pageUi: true,
  });
}
