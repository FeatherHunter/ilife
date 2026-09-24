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
 * 过程型两页走原五段式（本轮不动），页底出**两枚载荷**（#946；`#944` 故障 3／8）：确认指令＝可原样执行的
 * 命令串（带本次改后值）、修改指令＝回话模板＋同一条命令名——两枚由 `../workout/planPreviewPayloads.js`
 * 按本次 op 与本次参数算出，见 `./workoutPlanDocs.js` 的 `payloadBar`。
 */
import type { SerializableEnvelope } from 'base-paint';
import { HELP_COPY_ACTIONS, escapeHtml, renderActionBar } from 'base-paint';
import { renderDataTable, renderConclusionBar, renderDisclosure, renderEmptyBlock, renderKpiGrid, renderListRows } from 'base-paint/blocks';
import { nowStamp } from './receipt.js';
import { planCopyBlock } from '../workout/planCopyBlock.js';
// #946：本页的页框样式走 `planPreviewCss()`（页面级段 ＋ 同权单列规则）；`pageChromeCss` 不再由本件直取。
import { planPageCss, planPreviewCss, planViewCss } from './workoutPlanCss.js';
import { DOW, planWeeksHtml } from './workoutPlanLook.js';
import type { PlanWeek } from './workoutPlanLook.js';
import type { PlanView, PlanVsActualView, PlanWizardView } from './planPlate.js';
import type { PlanSessionRow } from '../workout/planStore.js';
import type { PreviewLine, WritePreview } from '../workout/write.js';
import { assembleDocPage, metricsOf } from '../shared/docPage.js';
import { copyLog } from '../shared/copyArea.js';
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
  /** **保留字段**：`render/html.ts` 的老入口 `renderPlanWritePreviewHtml` 仍带它（那是别人的件，本票不改）。
   *  #946 起写前预览页**不再出这一段**——页底那枚「复制指令」（载荷＝入口唤醒词的 `prompt_template`）
   *  已由下面两枚载荷取代（`#944` 故障 3／8），本页传空即不出。 */
  readonly prompt?: string;
  /** 确认指令（`#946`）：一条**可原样执行**的命令串，带本次改后值。缺省不出这一枚。 */
  readonly confirmPayload?: string;
  /** 修改指令（`#946`）：报障人要的那句话 ＋ 同一条命令名。缺省不出这一枚。 */
  readonly modifyPayload?: string;
}

/** 写前预览页底部的两枚载荷（确认指令／修改指令），两枚骑在**同一条按钮行**上。
 *
 *  为什么用 `copyData`／`copyLog` 两个位：`renderActionBar` 的复制按钮位只有这两个（ghost 行两颗按
 *  #247 两列平分）；场景按钮位（`buttons`）不写 `data-t`，运行时认领不到，做成第三颗就是个点不动的死按钮
 *  （口径见 `../workout/planCopyBlock.js` 的件头）。两颗用的都是冻结表 `HELP_COPY_ACTIONS` 里的 `actionId`：
 *  本页不再出「复制指令」那一段，故 `ilife-help-copy-prompt` 与 `ilife-help-copy-params` 在本页各只出现一次。 */
function payloadBar(confirmPayload: string, modifyPayload: string): string {
  if (confirmPayload === '' && modifyPayload === '') return '';
  return renderActionBar({
    ...(confirmPayload === '' ? {} : {
      copyData: {
        actionId: HELP_COPY_ACTIONS.prompt.actionId, label: '复制确认指令', text: confirmPayload,
      },
    }),
    ...(modifyPayload === '' ? {} : {
      copyLog: {
        actionId: HELP_COPY_ACTIONS.params.actionId, label: '复制修改指令', text: modifyPayload,
      },
    }),
  });
}

/** 复制区（过程型两页）：与结果页同形——冻结双按钮。两段的装配住 `./planCopyBlock.js`。
 *  `dataTitle` 为必填的中文标题：不给时 `buildDataText` 回落到信封 `key`，页面上就会
 *  出现英文命令键（如 `calorie.view.plan-write-preview`）——负责人已明令中文单语，别退回去。 */
function dualCopy(input: {
  readonly key: string; readonly command: string; readonly source: string;
  readonly dataTitle: string; readonly metrics: Record<string, number | null | undefined>;
}): string {
  const envelope: SerializableEnvelope = {
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: input.key,
    data: { metrics: metricsOf(input.metrics) },
  };
  return planCopyBlock({
    envelope, dataTitle: input.dataTitle,
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

/** #947 · 计划页没有周区块可出时那一块空态（判据点名的四句话都在这儿）。
 *
 *  为什么单独一件：改前这里只有一句「这一周没有训练安排（换一周看，或先定训练计划）」——**三态共用**，
 *  且那句许诺的两个出口（换一周看＝两级页签、先定训练计划＝入口）随周区块一起消失，#944 故障 4 的
 *  现场读数就是它。
 *
 *  **只有「本日无课」与「真无计划」走本件**：越界两态（`ended`／`future`）取数层回的是**全量**，
 *  页上照出整份计划的周区块（那是可点出口），故它们的状态词不走空态块——那两句住下面的
 *  `planStateBadge()`／`planStateSummary()`（页头徽章与摘要行，与周区块**同时**在场）。
 *  文案里的日期与周数都由 `PlanView` 给（取数层是唯一出处），本件不自己算。 */
function planEmptyBlock(v: PlanView, planWeeks: number): string {
  if (v.planState === 'empty') {
    return renderEmptyBlock({
      title: '训练安排',
      text: '计划里还没有任何训练安排（计划在，一行课都没有）',
      hint: '要说「定训练计划」，把第一周排出来',
    });
  }
  return renderEmptyBlock({
    title: '训练安排',
    text: '这一天没有训练安排',
    hint: '点上面那一周的「周一…周日」页签换一天看，或点「第 N 周」换一周看',
  });
}

/** #947 · 页面顶部的**态别结论条**：越界两态各一句状态词＋计划范围（说明「已结束／还没开始」是
 *  相对哪一段说的）；其余状态返回空串 ⇒ 一行都不出（常态页与改前逐字相同）。
 *
 *  为什么住正文而不走页头徽章／摘要：结果页走的是**老 A 壳**（`assembleDocPage` 只在给了
 *  `metaLeft` 时才走 B 线，而 A 线忽略 `badge`／`summary`）——要落页头就得整页换壳，那会把不带参数
 *  那一页也一起改掉（票面反向锁不许）。故状态词落在正文首件：它和周区块**同时**在场，不像空态块
 *  只在没有周区块时才出。 */
function planStateNote(v: PlanView, planWeeks: number): string {
  if (v.planState !== 'ended' && v.planState !== 'future') return '';
  const what = v.planState === 'ended' ? '计划已结束' : '计划还没开始';
  if (v.planStart === null || v.planEnd === null) return renderConclusionBar(what);
  return renderConclusionBar(what + '：计划范围 ' + v.planStart + ' 至 ' + v.planEnd
    + '（共 ' + String(planWeeks) + ' 周）');
}

/** 结果/读验证（order176–184）：页头＋指标卡＋两级页签（周／日）＋场次卡四列明细＋态别空态＋复制区。
 *  T351-v6：两级页签各钉一个**默认选中项**——周＝**本周**（按计划起始日与今天算出，`weekOfDate` 是周次
 *  换算的唯一出处；算不出或那一周不在本页时由 `planWeeksHtml` 兜底选第 1 周），日＝周一（住
 *  `./workoutPlanLook.ts`）。页签里不再有「全部周次／全部」两枚（负责人裁定去掉）。
 *
 *  **#947 四态出页 ＋ KPI 同口径**（报障单 #944 故障 4／5）：
 *  ① 取数层 `PlanView` 给出四态（`planState`：`ok`／`ended`／`future`／`empty`）与两个边界（`planStart`／
 *     `planEnd`），本件按态出页、**每态都留可点出口**——`ended`／`future` 两态里取数层回的是全量，故
 *     周区块照出一个不少（`data-wk` 全在，周次页签与星期页签都点得到，改前正是这两态被并成空态块、
 *     页签随切片消失）；只有「真无计划」（`empty`）与「日期过滤后空窗」两种才走空态块，且空态块里的
 *     `hint` 逐字写清往哪儿点。
 *  ② KPI 三张卡一律读**计划全量**（`planSessions`／`planMovements`／`totalWeeks` 同源）——改前「总场次／
 *     总动作」读的是过滤后那一份，于是 `date` 落在越界／空窗那天时页上印出 `总场次 0 ／ 总动作 0 ／
 *     总周数 4`，被读成空壳计划（#944 故障 5 的现场读数）。当次过滤到多少改由第 4 张卡「本周」表达。
 *  ③ 页底复制载荷的 `total` 仍用 `v.totalSessions`（＝过滤后那一份，报文现义保留）；复制行的数据本来就是
 *     页上那几周，「总场次」卡与载荷各说各的口径、各有各的出处，不互相冒充。 */
export function buildPlanResultDoc(v: PlanView, opts: PlanDocOpts): string {
  // 页上要出的周区块＝取数层本次给的那几周（`v.sessions`）：
  //  · `date` 落在计划范围外的两态（`ended`／`future`）下取数层回的是**全量**（口径见 `./planPlate.js` 的
  //    `PlanView`：那一档照过滤结果出页会只剩空态、周区块随切片一起消失）⇒ 整份计划的周区块铺在页上，
  //    `data-wk` 一个不少，周次页签与星期页签都点得到：**那正是这两态的可点出口**；
  //  · `ok` 态＝本次过滤后那几周，与改前逐字一致（`date` 落在某一天时只出那一周、`weekOffset`／`week`
  //    的周窗与 `movement` 照旧；`date` 那天没课但那一周有课时，页上出的是**那一周的全周场次**）；
  //  · `empty` 态没有周可出。
  // 走空态块的两档：「本日无课」（`ok` ＋ 日期档读 0 行）与「真无计划」。
  const byWeek = new Map<number, PlanSessionRow[]>();
  for (const s of v.sessions) {
    const list = byWeek.get(s.week_number) ?? [];
    list.push(s);
    byWeek.set(s.week_number, list);
  }
  const weeks: PlanWeek[] = [...byWeek.keys()].sort((a, b) => a - b)
    .map((week) => ({ week, sessions: byWeek.get(week) ?? [] }));
  const planName = v.title === null || v.title === '' ? '未命名计划' : v.title;
  // 周页签的默认选中项＝**本周**：周次由取数层按同一个 `weekOfDate` 算出（`PlanView.anchorWeek`，显式
  // 日期入参优先、否则今天）；算不出或那一周不在本页时由 `planWeeksHtml` 兜底选第 1 周。
  const currentWeek = v.anchorWeek;
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
  // #947 ②：三张卡一律读**计划全量**（`planSessions`／`planMovements`／`totalWeeks` 同源），
  // 故带参与不带参两页的「总场次」逐字相等；当次过滤读到多少由第 4 张卡「本周」表达。
  // 前两张卡的槽位与改前逐字相同（只换取数字段），不添说明行——不带参数那一页的读数按票面要逐字一致。
  const planWeeks = v.totalWeeks ?? weeks.length;
  const parts: string[] = [
    metaStrip,
    planStateNote(v, planWeeks),
    renderKpiGrid([
      { label: '总场次', value: String(v.planSessions), unit: '场' },
      { label: '总动作', value: String(v.planMovements), unit: '个' },
      { label: '总周数', value: String(planWeeks), unit: '周',
        detail: '其中 ' + weeks.length + ' 周有安排' + (v.totalWeeks === null ? '（计划未标总周数）' : '') },
      // 「本周」口径＝**本次过滤真读到多少**（越界／未开始的日子落在计划外 ⇒ 照实 0，不编数；
      // 本日无课 ⇒ 0 场，不拿「为保住出口而上屏的整周」冒充）。
      { label: '本周', value: String(v.visibleSessions), unit: '场',
        detail: (v.anchorWeek === null ? '算不出周次' : '第 ' + v.anchorWeek + ' 周')
          + ' · 动作 ' + v.visibleMovements + ' 个' },
    ]),
    // #947 ③：**本日无课**那一档（`ok` 态 ＋ 按日期过滤真读到 0 场）——那一周照出（要留住「换一天看」
    // 的星期页签），空态句另出一块说明「这一天没有安排」。判据读 `visibleSessions`（取数层的**过滤结果**），
    // 不拿 `weeks.length`：本档上屏的那一周是有内容的（为保住出口而上屏），拿它判会把这句空态吞掉。
    v.planState === 'ok' && v.scope === 'day' && v.visibleSessions === 0 && weeks.length > 0
      ? planEmptyBlock(v, planWeeks) : '',
    weeks.length === 0 ? planEmptyBlock(v, planWeeks) : planWeeksHtml(weeks, currentWeek),
    planCopyBlock({
      envelope: {
        version: DOC_VERSION, skill: DOC_SKILL, shape: 'list', key: opts.key,
        data: { items: weeks.map((w) => weekLine(w.week, w.sessions)), total: v.totalSessions },
      },
      dataTitle: '【calorie 训练计划查看】',
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
    pageUi: true,
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
      dataTitle: '【calorie 计划对比实际】',
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
    pageUi: true,
  });
}

/** 过程：写前预览（改前／改后两栏 ＋ 复制区）。
 *  T351-v10：两栏改成**真表格**（周次｜星期｜训练｜动作数｜变更），不再是一列塞满
 *  `第1周周1·上肢（2动作）` 那种串——那种写法是拿 `·` 与括号顶替表格设计（负责人第 ⑤ 条）。
 *  页头三件也不再用 `·` 串：眉标只留「健身计划」，标题只留「写前预览」，副标题只留这是哪一条写词。 */
export function buildPlanProcessDoc(v: WritePreview, opts: PlanDocOpts): string {
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
    // 改后一整栏都是「参数没齐」的提示行时不摆表：一句话填进「训练」列、其余四列全是「—」，
  // 那不是表格该有的样子（第 ⑤ 条）；改走共享空态块，一句话说清要补什么。
  v.after.length > 0 && v.after.every((l) => l.week === null)
    ? renderEmptyBlock({ title: '改后', text: v.after.map((l) => l.label).join('。') })
    : renderDataTable({
      columns: cols(true),
      rows: rowsOf(v.after, true),
      caption: '改后（' + v.after.length + ' 行，只读不写库）',
      emptyText: '改后为空',
    }),
    renderDisclosure({
      title: '确认说明', open: true,
      contentHtml: renderListRows({
        items: [
          { left: '方式', main: '复制确认指令后执行写命令', right: '' },
          { left: '影响', main: v.note === '' ? DASH : v.note, right: '' },
        ],
      }),
    }),
    // 两枚载荷（`#946`）：确认＝可原样执行的命令串；修改＝回话模板＋同一条命令名。这一枚的位置就是原来
    // 「复制指令」预览块那一处（那一段的载荷是入口唤醒词的 `prompt_template`，`#944` 故障 3 点名要换掉）。
    payloadBar(opts.confirmPayload ?? '', opts.modifyPayload ?? ''),
    dualCopy({
      key: opts.key, command: opts.command, source: 'workout_plans（写前预览，只读）',
      dataTitle: '【calorie 写前预览】',
      metrics: { beforeLines: v.before.length, afterLines: v.after.length },
    }),
  ];
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '写前预览',
    eyebrow: '健身计划',
    // 副标题只留一件事：这一页具体要写什么（`v.title` 例如「定第 1 周计划」）。
    // 另外那半句「这是哪一条写词」已由标题「写前预览」与表标题交代，不再叠一层重复。
    subtitle: v.title,
    // #946：本页的页内样式段多一条**同权单列规则**（正文子件一律住 880 那一列），见 `./workoutPlanCss.ts`。
    content: planPreviewCss() + parts.join(''),
    pageUi: true,
  });
}

/* 构建向导（`buildPlanWizardDoc`，order186）T351-v11 已搬进姊妹件 `./planWizardDocs.ts`：
 * 它要摊出「计划→周→日→时段→动作」五层时间线 ＋ 零脚本的就地改与计数，是本族里最大的一页，
 * 与本件的「看计划／写前预览／计划 vs 实际」三种版式也不同源。出口由 `./html.ts` 直接 import 姊妹件。 */
