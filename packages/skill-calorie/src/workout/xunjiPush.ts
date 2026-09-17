/** 同步到训记（HELP 场景 05「健身计划」下一级「落地训练」）：`calorie.workout.xunji-push` 写。
 *
 * 链（老 `render_plan_receipt.py --live-plan-sync` 的 "1.审计动作名→2.推送→3.回执"，`t168:104`）：
 * ① 参数先验（用法错 exit 2，不调外部）；② 读当天训练段（workout 自有 `planStore`，只读，
 *    与 `write.ts` 同一对引用：`./planStore.js` ＋ `render/planPlate.ts#weekOfDate`，不另起取数）；
 * ③ 审计动作名（训记能力门 `verifyMovements`，只读校验、原样上报；审计只提示不拦推，
 *    沿 `#607 §八·7`「推送前不校验动作库」）；④ 调 `xunji push-plan`（经 `./xunjiRunner.js` 子进程；
 *    `dryRun` 转 `--dry-run`，零远端调用）；⑤ 任一步失败即非 0（码翻译见跑道）＋失败不落成功页。
 *
 * 两态（同一命令，`dryRun` 分流）：
 * - `dryRun: true` → 过程页（审计结论 ＋ 待推送段 ＋ 转换读数，远端未调用）；
 * - 缺省 → 结果页（逐段推送结局 ＋ 训记回显说明 ＋ 本地／远端区分）。
 */
import type { DatabaseSync } from 'node:sqlite';
import { renderDataTable, renderKpiGrid } from 'base-paint/blocks';
import type { SerializableEnvelope } from 'base-paint';
import { todayISO } from '../analysis/utils.js';
import { weekOfDate } from '../render/planPlate.js';
import { planCopyBlock } from '../render/planCopyBlock.js';
import type { CrudReceipt } from '../render/receipt.js';
import { verifyMovements } from '../xunji/index.js';
import type { MovementVerifyReport } from '../xunji/index.js';
import { assembleDocPage } from '../shared/docPage.js';
import { copyLog } from '../shared/copyArea.js';
import { dayField, fail } from '../shared/params.js';
import { R, commandLine, provided } from '../shared/writeParts.js';
import type { WriteOut } from '../shared/commandSpec.js';
import { getPlan } from './planStore.js';
import type { PlanSessionRow } from './planStore.js';
import { XUNJI_STUB_ENV, invokeXunji, xunjiExitToCmd } from './xunjiRunner.js';

export const XUNJI_PUSH_KEY = 'calorie.workout.xunji-push';
const XUNJI_PUSH_WAKE = '同步到训记';
const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';
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

/** 当天训练段（只读；无计划／缺开始日期即 exit 4，空天回空表——调用方按老 `push.py:135-143` 出空天读数）。 */
function daySessions(db: DatabaseSync, date: string): { sessions: PlanSessionRow[]; week: number; dow: number } {
  const plan = getPlan(db);
  if (!plan.config && plan.sessions.length === 0) fail(4, '无训练计划（先定训练计划）');
  const start = plan.config?.start_date ?? null;
  if (!start) fail(4, '计划缺开始日期，无法定位周次');
  const { week, dow } = weekOfDate(start as string, date);
  return { sessions: plan.sessions.filter((s) => s.week_number === week && s.day_of_week === dow), week, dow };
}

/** 审计动作名（只读；库读不出即「无法验证」，不拦推——提示在页上，不进退出码）。 */
function auditMovements(sessions: readonly PlanSessionRow[]): MovementVerifyReport | null {
  const names = [...new Set(
    sessions.flatMap((s) => s.movements.map((m) => m.name)).filter((n): n is string => typeof n === 'string' && n !== ''),
  )];
  if (names.length === 0) return null;
  return verifyMovements(names);
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
      source: '训练计划（workout_plans）＋ 训记推送读数',
      m5Line: receipt.m5Line,
      actionAt: receipt.meta.actionAt,
      version: DOC_VERSION,
    }),
  });
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

/** `calorie.workout.xunji-push` · 同步到训记（审计 → 推送 → 回执同一命令）。 */
export function writeXunjiPush(params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  const date = dayField(params, 'date') ?? todayISO();
  const dryRun = readDryRun(params);
  const { sessions } = daySessions(db, date);
  const audit = auditMovements(sessions);
  const invalid = audit === null ? 0 : audit.invalid_count;
  const argv = dryRun ? ['push-plan', '--date', date, '--dry-run'] : ['push-plan', '--date', date];
  const call = invokeXunji(argv, '同步到训记');
  if (call.code !== 0) {
    const reason = call.code === 2
      ? '本地缺 KEY（没调远端）：先看训记 KEY 状态再重试'
      : '远端推送失败（训记接口报错或写库失败）：稍后重试，远端是否落笔以训记 App 为准';
    fail(xunjiExitToCmd(call.code), '同步到训记失败（' + date + '）：' + reason);
  }
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
  const auditText = audit === null
    ? '当天无动作可审'
    : '通过 ' + audit.valid_count + '／不通过 ' + audit.invalid_count + '（共 ' + audit.total + '）'
      + (audit.catalog_loaded ? '' : '；动作库读不出，本次无法验证');
  const content = [
    renderKpiGrid([
      { label: '日期', value: date, detail: '推送哪一天的计划' },
      { label: '待推送段', value: sessions.length + ' 段', detail: sessions.map((s) => s.session_label).join('、') || '当天没排练（空天）' },
      { label: '动作审计', value: auditText, detail: '不通过的动作仍会原样推送，建议名见下表' },
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
        ...(stubbed ? [{ k: '数据来源', v: '本地挡板（' + XUNJI_STUB_ENV + '，未调远端）' }] : []),
      ],
      caption: '本地成远端没成分得清',
    }),
    copyBlock(XUNJI_PUSH_KEY, params, receipt),
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
      { label: '推送', value: '成功 ' + summary.ok_count + '／失败 ' + summary.fail_count, detail: '共 ' + summary.session_count + ' 段' },
      {
        label: '动作审计',
        value: audit === null ? '当天无动作可审' : '不通过 ' + invalid + ' 个',
        detail: audit === null ? '段内没有动作名' : '审计只提示，不拦推；建议名见过程页',
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
    copyBlock(XUNJI_PUSH_KEY, params, receipt),
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
