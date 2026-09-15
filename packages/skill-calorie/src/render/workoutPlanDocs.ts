/** 健身计划结果/过程整页装配（T351 重做「看完整计划」·实施兵）。
 *
 * 计划查看页（order176–185 共用本件）照规格 `docs/skills/skill-calorie/t351-redesign-184-spec.md` 重做，
 * T351-v5 起整页穿**老模板观感**（`D:\2Study\StudyNotes\SKILLS\卡路里\templates\workout_plan_view.html`）：
 * 页头（大标题「健身计划」＋说明/版本/周数/起日）→ 指标卡 → **周次页签 ＋ 日页签两级导航**（纯 CSS 选钮式，
 * 零内联脚本；装配住 `./workoutPlanLook.ts`、规则住 `./workoutPlanCss.ts`）→ 周区块内逐日**场次卡**
 * （头行「周X ｜ 场次名 ｜ 时段 ｜ 共 N 组 ｜ 节奏」＋卡内四列动作明细表，部位出彩色徽章；表住
 * `./workoutMovementTable.ts`）→ 空窗出完整空页（不返白页）→ 底部「复制数据／复制日志」双按钮。
 *
 * 复制数据载荷不照抄老页 `scene.snapshot`：计划数据投影成信封 `list` 形（`items` 逐周一行、`total` 记场数），
 * 日志用 `CopyLogFields` 五键；底部复制区走共用件 `./planCopyBlock.js`。只读既有取数层（`PlanView`／
 * `WritePreview`），不跨能力取数；动作字段形状的唯一出处是 `workout/planStore.ts` 的 `PlanMovement`
 * （本件不认动作字段，全部经 `./workoutPlanLook.js` 与 `./workoutMovementTable.js`）。
 * 内容只用共用位（`shared/docPage` ＋ `base-paint/blocks` 的整页版式／指标卡／表格／折叠／空态）＋本族页内样式。
 * 过程型两页走原五段式（本轮不动），页底加本写词的逐字 prompt（预检确认页要能复制 prompt 回给 AI）。
 */
import type { SerializableEnvelope } from 'base-paint';
import { escapeHtml } from 'base-paint';
import { renderDataTable, renderDisclosure, renderEmptyBlock, renderKpiGrid, renderListRows } from 'base-paint/blocks';
import { nowStamp } from './receipt.js';
import { planCopyBlock } from './planCopyBlock.js';
import { planPageCss, planViewCss } from './workoutPlanCss.js';
import { DOW, planWeeksHtml } from './workoutPlanLook.js';
import type { PlanWeek } from './workoutPlanLook.js';
import { weekOfDate } from './planPlate.js';
import type { PlanView, PlanVsActualView, PlanWizardView } from './planPlate.js';
import type { PlanSessionRow } from '../workout/planStore.js';
import type { WritePreview } from '../workout/write.js';
import { assembleDocPage, metricsOf } from '../shared/docPage.js';
import { copyLog } from '../shared/copyArea.js';
import { todayISO } from '../analysis/utils.js';
import { DASH } from './workoutMovementTable.js';

const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';
const DOC_TITLE = '卡路里·健身计划';

/** 写前预览操作的中文名（老 `process_progress` 复制区同口径，页上不出现英文 `op`）。 */
const OP_ZH: Record<string, string> = {
  copy: '复制训练计划',
  'set-week': '定一周计划',
  'add-movement': '加训练动作',
  'set-rest': '定休息日',
  update: '改训练计划',
  'update-day': '改某天训练',
  'delete-day': '删某天训练',
  'update-movement': '改动作',
  delete: '撤销训练计划',
};

interface PlanDocOpts {
  readonly key: string;
  readonly command: string;
  readonly wakeWord?: string;
  /** 该写词的逐字 prompt（预检确认页「复制 prompt」那一路）；结果页不传。 */
  readonly prompt?: string;
}

/** 复制区（过程型两页）：与结果页同形——冻结双按钮，并前置本写词的逐字 prompt（预检确认页的核心是
 *  「复制 prompt 回给 AI」，顺序照 `copyArea` 的 prompt 在前；两段的装配住 `./planCopyBlock.js`）。
 *  `dataTitle` 为必填的中文标题：不给时 `buildDataText` 回落到信封 `key`，页面上就会
 *  出现英文命令键（如 `calorie.view.plan-write-preview`）——负责人已明令中文单语，别退回去。 */
function dualCopy(input: {
  readonly key: string; readonly command: string; readonly source: string;
  readonly dataTitle: string; readonly prompt: string; readonly metrics: Record<string, number | null | undefined>;
}): string {
  const envelope: SerializableEnvelope = {
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: input.key,
    data: { metrics: metricsOf(input.metrics) },
  };
  return planCopyBlock({
    envelope, dataTitle: input.dataTitle, prompt: input.prompt,
    log: copyLog({
      command: input.command, source: input.source,
      actionAt: nowStamp(), version: DOC_VERSION,
    }),
  });
}

/** 复制数据的一行＝一周：周次 ＋ 场数 ＋ 逐场「周X 场次名 N 个动作」。 */
function weekLine(wn: number, list: readonly PlanSessionRow[]): string {
  const brief = list.map((s) => {
    const dow = DOW[s.day_of_week] ?? '周' + s.day_of_week;
    if (s.is_rest_day === 1) return dow + ' 休息日';
    const moves = Array.isArray(s.movements) ? s.movements : [];
    return dow + ' ' + (s.session_label === '' || s.session_label === undefined ? '训练' : s.session_label) + ' ' + moves.length + ' 个动作';
  });
  return '第 ' + wn + ' 周 · ' + list.length + ' 场 · ' + brief.join(' · ');
}

/** 结果/读验证（order176–184）：页头＋指标卡＋两级页签（周／日）＋场次卡四列明细＋空态＋复制区。
 *  T351-v6：两级页签各钉一个**默认选中项**——周＝**本周**（按计划起始日与今天算出，`weekOfDate` 是周次
 *  换算的唯一出处；算不出或那一周不在本页时由 `planWeeksHtml` 兜底选第 1 周），日＝周一（住
 *  `./workoutPlanLook.ts`）。页签里不再有「全部周次／全部」两枚（负责人裁定去掉）。 */
export function buildPlanResultDoc(v: PlanView, opts: PlanDocOpts): string {
  const byWeek = new Map<number, PlanSessionRow[]>();
  for (const s of v.sessions) {
    const list = byWeek.get(s.week_number) ?? [];
    list.push(s);
    byWeek.set(s.week_number, list);
  }
  const weeks: PlanWeek[] = [...byWeek.keys()].sort((a, b) => a - b)
    .map((week) => ({ week, sessions: byWeek.get(week) ?? [] }));
  const planName = v.title === null || v.title === '' ? '未命名计划' : v.title;
  // 周页签的默认选中项＝**本周**：计划起始日与今天都齐才算得出（`weekOfDate` 按「起始日那一周的周一为
  // 第 1 周」口径给周次号，与计划库 `day_of_week` 同源）；缺起始日 ⇒ 算不出 ⇒ 传 null 让它兜底第 1 周。
  const currentWeek = v.startDate === null || v.startDate === '' ? null : weekOfDate(v.startDate, todayISO()).week;
  // 副标题只留一件事：计划名。T351-v9（负责人 2026-09-15 第 ⑤ 条）把原来那串
  // `计划名 · 说明 · 起日 日期` 拆掉——三件事用 `·` 串成一行，正是「拿符号顶替设计」。
  // 说明与起日改住页头下的**计划信息条**：起日是一个「键＋值」，说明原文里若带 `·`
  // （老技能当年就写成 `科学定制·6天/周·270组`）拆成胶囊排开；说明是一句完整话（没有 `·`）时
  // 原样落一行文字，不硬塞进胶囊。
  // T351-v6 已砍掉的两项冗余不再回来：`版本 v1`（对用户无用）与 `共 4 周`（与指标卡「总周数」重复）。
  const desc = (v.description ?? '').trim();
  const descParts = desc.split('·').map((t) => t.trim()).filter((t) => t !== '').slice(0, 6);
  const descHtml = desc === ''
    ? ''
    : (descParts.length === 1 && descParts[0].length > 14
      ? '<span class="ilw-meta-v">' + escapeHtml(descParts[0]) + '</span>'
      : descParts.map((t) => '<span class="ilw-chip">' + escapeHtml(t) + '</span>').join(''));
  const metaStrip = '<div class="ilw-meta">'
    + (opts.wakeWord === undefined || opts.wakeWord === ''
      ? '' : '<span class="ilw-chip ilw-chip-strong">' + escapeHtml(opts.wakeWord) + '</span>')
    + (v.startDate === null || v.startDate === '' ? ''
      : '<span class="ilw-meta-k">起日</span><span class="ilw-meta-v">' + escapeHtml(v.startDate) + '</span>')
    + descHtml
    + '</div>';
  const parts: string[] = [
    metaStrip,
    renderKpiGrid([
      { label: '总场次', value: String(v.totalSessions), unit: '场' },
      { label: '总动作', value: String(v.totalMovements), unit: '个' },
      { label: '总周数', value: String(v.totalWeeks ?? weeks.length), unit: '周',
        detail: '其中 ' + weeks.length + ' 周有安排' + (v.totalWeeks === null ? '（计划未标总周数）' : '') },
    ]),
    weeks.length === 0
      ? renderEmptyBlock({ title: '训练安排', text: '这一周没有训练安排（换一周看，或先定训练计划）' })
      : planWeeksHtml(weeks, currentWeek),
    planCopyBlock({
      envelope: {
        version: DOC_VERSION, skill: DOC_SKILL, shape: 'list', key: opts.key,
        data: { items: weeks.map((w) => weekLine(w.week, w.sessions)), total: v.totalSessions },
      },
      dataTitle: '【calorie · 训练计划查看】',
      log: copyLog({
        command: opts.command,
        source: 'workout_plans（训练计划，只读）',
        actionAt: nowStamp(), version: DOC_VERSION,
      }),
    }),
  ];
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '健身计划',
    eyebrow: '训练计划查看',
    subtitle: planName,
    // 页内样式（本族唯一产出者，见 `./workoutPlanCss.ts`）随正文进内容区：晚于 head 的共享样式表，
    // 同特异性下本页胜；只作用本页（样式块不在别的页上）。
    content: planViewCss(weeks.length) + parts.join(''),
  });
}

/** 结果：计划对比实际（完成率＋动作级表）。 */
export function buildPlanVsActualDoc(v: PlanVsActualView, opts: PlanDocOpts): string {
  const rows = v.days
    .filter((d) => d.planned.length > 0 || d.logged.length > 0)
    .map((d) => ({
      date: d.date,
      plan: d.planned.length > 0 ? d.planned.join('、') : DASH,
      done: d.logged.length > 0 ? d.logged.join('、') : DASH,
      miss: d.missed.length === 0 ? '全命中' : '漏 ' + d.missed.join('、'),
    }));
  const parts: string[] = [
    renderKpiGrid([
      { label: '完成率', value: v.completionRate === null ? DASH : v.completionRate + '%' },
      { label: '计划', value: v.plannedCount + ' 个', detail: '窗内计划动作' },
      { label: '完成', value: v.doneCount + ' 个', detail: '命中动作' },
    ]),
    renderDataTable({
      columns: [
        { key: 'date', label: '日期' },
        { key: 'plan', label: '计划动作' },
        { key: 'done', label: '实际完成' },
        { key: 'miss', label: '缺口' },
      ],
      rows,
      caption: '逐日对照',
      emptyText: '范围内无计划或实绩数据',
    }),
    planCopyBlock({
      envelope: {
        version: DOC_VERSION, skill: DOC_SKILL, shape: 'list', key: opts.key,
        data: {
          items: rows.map((r) => r.date + ' · 计划 ' + r.plan + ' · 完成 ' + r.done + ' · ' + r.miss),
          total: v.plannedCount,
        },
      },
      dataTitle: '【calorie · 计划对比实际】',
      log: copyLog({
        command: opts.command,
        source: 'workout_plans ＋ exercise_log（计划对比实际，只读）',
        actionAt: nowStamp(), version: DOC_VERSION,
      }),
    }),
  ];
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '计划对比实际',
    eyebrow: '健身计划',
    // 窗口用 `→` 摆在副标题（唯一一处），不再进指标卡副行当重复件，也不用 `·` 串第二件事。
    subtitle: v.start + ' → ' + v.end,
    content: planPageCss() + parts.join(''),
  });
}

/** 过程：写前预览（改前／改后两栏 ＋ 复制区）。
 *  T351-v10：两栏改成**真表格**（周次｜星期｜训练｜动作数｜变更），不再是一列塞满
 *  `第1周周1·上肢（2动作）` 那种串——那种写法是拿 `·` 与括号顶替表格设计（负责人第 ⑤ 条）。
 *  页头三件也不再用 `·` 串：眉标只留「健身计划」，标题只留「写前预览」，副标题只留这是哪一条写词。 */
export function buildPlanProcessDoc(v: WritePreview, opts: PlanDocOpts): string {
  const opName = OP_ZH[v.op] ?? '写前预览';
  /** 预览行 → 表格行：`week` 为 null 的概述行只填「训练」一列，其余列印「—」。 */
  const rowsOf = (lines: readonly PreviewLine[], withChange: boolean) => lines.map((l) => ({
    week: l.week === null ? DASH : '第 ' + l.week + ' 周',
    dow: l.dow === null || l.dow === 0 ? DASH : DOW[l.dow] ?? '周' + l.dow,
    label: l.label,
    moves: l.moves === null ? DASH : l.moves + ' 个',
    ...(withChange ? { change: l.change === '' ? DASH : l.change } : {}),
  }));
  const cols = (withChange: boolean) => [
    { key: 'week', label: '周次' },
    { key: 'dow', label: '星期' },
    { key: 'label', label: '训练' },
    { key: 'moves', label: '动作数' },
    ...(withChange ? [{ key: 'change', label: '变更' }] : []),
  ];
  const parts: string[] = [
    renderDataTable({
      columns: cols(false),
      rows: rowsOf(v.before, false),
      caption: '改前（' + v.before.length + ' 行）',
      emptyText: '改前为空',
    }),
    renderDataTable({
      columns: cols(true),
      rows: rowsOf(v.after, true),
      caption: '改后（' + v.after.length + ' 行，只读不写库）',
      emptyText: '改后为空',
    }),
    renderDisclosure({
      title: '确认说明', open: true,
      contentHtml: renderListRows({
        items: [
          { left: '方式', main: '复制指令后执行写命令', right: '' },
          { left: '影响', main: v.note === '' ? DASH : v.note, right: '' },
        ],
      }),
    }),
    dualCopy({
      key: opts.key, command: opts.command, source: 'workout_plans（写前预览，只读）',
      dataTitle: '【calorie · 写前预览】', prompt: opts.prompt ?? '',
      metrics: { beforeLines: v.before.length, afterLines: v.after.length },
    }),
  ];
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '写前预览',
    eyebrow: '健身计划',
    subtitle: opName + ' · ' + v.title,
    content: pageChromeCss(960) + parts.join(''),
  });
}

/** 过程：构建向导五段式（校验结论＋错误/警告＋复制区）。 */
export function buildPlanWizardDoc(v: PlanWizardView, opts: PlanDocOpts): string {
  const ok = v.errorCount === 0;
  const parts: string[] = [
    renderKpiGrid([
      { label: '构建向导', value: ok ? '可落地' : '有硬止', status: ok ? 'ok' : 'warn' },
      { label: '错误', value: v.errorCount + ' 项' },
      { label: '警告', value: v.warningCount + ' 项' },
      { label: '已检查', value: v.checkedSessions + ' 个训练场次' + (v.errorCount > 0 ? '（' + v.errorCount + '硬止）' : ''), detail: '纯校验，不写库' },
    ]),
    // 零条时不出折叠块：KPI 卡已出「错误 0 项／警告 0 项」，两块空折叠是噪声（展开也无内容）。
    // 有硬止时那两块就是「为什么不能写」的正据，默认展开；警告是次要面，仍折叠。
    ...(v.errors.length === 0 ? [] : [renderDisclosure({
      title: '硬止错误（' + v.errors.length + ' 条）', open: true,
      contentHtml: renderListRows({ items: v.errors.map((e, i) => ({ left: '错误' + (i + 1), main: e, right: '' })) }),
    })]),
    ...(v.warnings.length === 0 ? [] : [renderDisclosure({
      title: '警告（' + v.warnings.length + ' 条）',
      contentHtml: renderListRows({ items: v.warnings.map((w, i) => ({ left: '警告' + (i + 1), main: w, right: '' })) }),
    })]),
    dualCopy({
      key: opts.key, command: opts.command, source: 'planStore 校验（构建向导，纯校验）',
      dataTitle: '【calorie · 构建向导】', prompt: opts.prompt ?? '',
      metrics: { errorCount: v.errorCount, warningCount: v.warningCount, checkedSessions: v.checkedSessions },
    }),
  ];
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '构建向导 · 定训练计划',
    eyebrow: '健身计划 · 预检确认页',
    subtitle: ok ? '可落地 · 已检查 ' + v.checkedSessions + ' 个训练场次' : '有硬止 · 先改计划再确认',
    content: parts.join(''),
  });
}
