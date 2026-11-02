/** #253 · 目标管理（HELP 场景 06）**六条会改数据库的命令的写后回执整页**。
 *
 * 本文件是 `cli/write.ts:85` 整页装配链的**第六个装配口**（前五个：档案／饮食／体重／训练计划／
 * 身体细节），形状照 `diet/receipt.ts` 与 `body/receipt.ts` 抄——同一份 `assembleDocPage`、同一组
 * `copyArea`／`copyLog`、同一张 `statusCard`，只换内容。接入前这五条命令落在共用位
 * `shared/writeParts.ts:83` 的 `receiptHtml()`：产物是 275 字节上下的裸片段（没有 `<!doctype html>`、
 * 没有 charset、没有样式、没有页框），还把内部词 `op=update · id=1` 印在屏幕上。
 *
 * 六条命令 → 十一条写词（命令名以 `goal/commands.ts` 注册表为准，本件不抄唤醒词）：
 *   定营养目标／改营养目标 → `calorie.goal.set`；定饮水目标／改饮水目标 → `calorie.goal.water`；
 *   定体重目标／改体重目标 → `calorie.goal.weight`；定运动目标 → `calorie.goal.exercise`；
 *   暂停所有目标 → `calorie.goal.pause`；重启所有目标 → `calorie.goal.resume`。
 *
 * 块序（本票裁定）：① 操作回执 ② 字段变更（改前 → 改后）③ 库里现在的目标 ④ 对账信息 ⑤ 复制区。
 * **#561（2026-09-15 用户裁决）**：原块序里的「⑤ 复制区 ＋ 来源脚注」中**来源脚注整行撤**——
 * 「所有 HTML 页面底部的「数据来源：xxx」都删掉（用户直接看得见按钮与内容，不需要脚注复读来路）」；
 * 来源名仍住复制日志第 3 段（`copyLog({ source: receipt.meta.source })`），技术原件一字不动。
 * 页头三件：`docTitle`＝「卡路里 目标回执」、眉标＝「目标管理」、
 * 主标题＝`receipt.scene`（＝那条命令的中文名）。
 *
 * 取数两条路（**页面不改数据面**）：
 *   · 「改后」逐格**读库**（`getNutritionGoal` ＋ `getPausedState`），**不回显命令参数**——
 *     手改库里一个字段，页面跟着变；
 *   · 「改前」只认**回执自带**的 `旧 → 新` 对子（`items[].reason`，或摘要里那一对），写口没回报
 *     就写 `—` ＋ 表下一条口径行，**不许拿新值顶替**（那是把改后值当改前值印）。
 *
 * 中文名一律取唯一来源：`goal/precheck.ts:35-41,60-74` 那几张表（字段名一处一处照抄，本件不另编名）；
 * 暂停态的「正常（未暂停）」逐字取 `goalStore.ts:163`。
 *
 * #289 · 三族区块：营养 `sec-macro`（宏量合计与换算式＋BMR 提示，吃草稿 `energy`）、饮水 `sec-water`
 * （`recommendWaterGoal` 的 ml/kg＋季节＋推荐对照）、体重 `sec-rate`（剩余天数与建议速率及极端警示）、
 * 自动算 `sec-auto`（写参带 `profile` 时推荐值＋采纳值两段对照）。不新增命令，不改唤醒词。
 */
import type { DatabaseSync } from 'node:sqlite';
import { renderCaliberLine, renderConclusionBar, renderDataTable, renderFeedbackBlock, renderKpiGrid, renderTocBlock } from 'base-paint/blocks';
import type { KpiCardInput } from 'base-paint/blocks';
import type { SerializableEnvelope } from 'base-paint';
import type { CrudReceipt } from '../render/receipt.js';
import { getNutritionGoal, recommendWaterGoal, type NutriProfile } from './nutritionGoal.js';
import type { NutritionGoalRow } from './nutritionGoal.js';
import { getPausedState } from './goalStore.js';
import { buildGoalDraft, isGoalProfile, type GoalDraft } from './set.js';
import { assembleDocPage } from '../shared/docPage.js';
import { copyArea, copyLog } from '../shared/copyArea.js';
import { reconcileDisclosure, statusCard } from '../shared/receiptParts.js';
import { commandLine } from '../shared/writeParts.js';
import { m } from '../entries/index.js';
import { currentRenderLanguage, listJoin } from 'base-entries';

const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';
/** 页签名（编排者裁定）：空格分层、不带任何符号——`·` 是设计债（`scripts/audit-separators.mjs` R1）。 */

/** 归属词（眉标，**一页一处**）：说清这一页属于哪一族。 */


/** 目标管理 6 条会改数据库的命令（**具名命令集**，命令名权威源＝`goal/commands.ts`）。 */
const GOAL_RECEIPT_KEYS: ReadonlySet<string> = new Set([
  'calorie.goal.set', 'calorie.goal.water', 'calorie.goal.weight',
  'calorie.goal.pause', 'calorie.goal.resume', 'calorie.goal.exercise',
]);

/** 写入去向那句说明（共用件 `statusCard` 的必填参数，按命令取本域自己的说法）。 */
function writtenDetail(key: string): string | undefined {
  switch (key) {
    case 'calorie.goal.set': return m('skill-calorie.goal-receipt.c092');
    case 'calorie.goal.water': return m('skill-calorie.goal-receipt.c093');
    case 'calorie.goal.weight': return m('skill-calorie.goal-receipt.c094');
    case 'calorie.goal.pause': return m('skill-calorie.goal-receipt.c095');
    case 'calorie.goal.resume': return m('skill-calorie.goal-receipt.c096');
    case 'calorie.goal.exercise': return m('skill-calorie.goal-receipt.c097');
    default: return undefined;
  }
}

/** 库列 → 中文名（名字逐字取 `precheck.ts` 的现值表与体重块，本件不另编名）＋ 值的单位。 */
interface GoalColumn {
  readonly col: string;
  readonly label: string;
  readonly unit: string;
}

/** 目标行逐列（顺序＝现值表的读法：四宏量 → 饮水 → 体重目标 → 日期 → 起点 → 暂停态）。 */
function columns(): GoalColumn[] {
  const kcal = (): string => m('skill-calorie.goal-receipt.c109');
  return [
    { col: 'calorie_goal', label: m('skill-calorie.goal-receipt.c098'), unit: kcal() },
    { col: 'protein_goal', label: m('skill-calorie.goal-receipt.c099'), unit: 'g' },
    { col: 'carbs_goal', label: m('skill-calorie.goal-receipt.c100'), unit: 'g' },
    { col: 'fat_goal', label: m('skill-calorie.goal-receipt.c101'), unit: 'g' },
    { col: 'water_goal', label: m('skill-calorie.goal-receipt.c102'), unit: 'ml' },
    { col: 'exercise_goal', label: m('skill-calorie.goal-receipt.c103'), unit: kcal() },
    { col: 'weight_goal', label: m('skill-calorie.goal-receipt.c104'), unit: 'kg' },
    { col: 'goal_deadline', label: m('skill-calorie.goal-receipt.c105'), unit: '' },
    { col: 'start_weight', label: m('skill-calorie.goal-receipt.c106'), unit: 'kg' },
    { col: 'start_date', label: m('skill-calorie.goal-receipt.c107'), unit: '' },
    { col: 'goal_paused', label: m('skill-calorie.goal-receipt.c108'), unit: '' },
  ];
}

/** CLI 参数名 → 库列名（写口 `writtenFields` 报的是参数名，页面要说的是库里的那一列）。 */
const PARAM_COLUMN: Readonly<Record<string, string>> = {
  calorie: 'calorie_goal', protein: 'protein_goal', carbs: 'carbs_goal', fat: 'fat_goal',
  water: 'water_goal', kg: 'weight_goal', deadline: 'goal_deadline', goal: 'exercise_goal',
  startKg: 'start_weight', startDate: 'start_date', goal_paused: 'goal_paused',
};

/** 库列名 → 那一列的登记（名单外回 `undefined`：调用面已按 `PARAM_COLUMN`／`COLUMNS` 筛过）。 */
const metaOf = (col: string): GoalColumn | undefined => columns().find((c) => c.col === col);

/** 库列名 → 中文名（名单外回原名；调用面已按 `PARAM_COLUMN` 筛过，走到这里恒是名单内的列）。 */
const labelOf = (col: string): string => metaOf(col)?.label ?? col;

/** 一格现值：**逐格读库**，缺值写 `—`（不写 0、不写空串），有单位的写「值 单位」。 */
function cellValue(col: string, row: NutritionGoalRow | null, paused: boolean): string {
  if (col === 'goal_paused') return paused ? m('skill-calorie.goal-receipt.c001') : m('skill-calorie.goal-receipt.c002');
  const raw = row === null ? null : (row as unknown as Record<string, unknown>)[col];
  if (raw === null || raw === undefined || raw === '') return '—';
  const unit = metaOf(col)?.unit ?? '';
  return unit === '' ? String(raw) : String(raw) + ' ' + unit;
}

/** 回执自带的 `旧 → 新` 对子 → 改前值；回执没带就回 `null`（⇒ 上屏 `—`）。 */
function beforeOf(col: string, after: string, receipt: CrudReceipt): string | null {
  const label = labelOf(col);
  for (const it of receipt.items) {
    const m = /^(.+?)\s*→\s*(.+)$/.exec(it.reason ?? '');
    if (m !== null && m[1].includes(label)) return m[1].trim();
  }
  // 摘要里那一对（饮水命令有真值：`已定饮水目标：2000→2400 ml`）。两条门槛，宁缺勿错：
  // 右端必须**与库内现值一致**，且本次只写了一个字段——否则这一对说不清属于哪一列。
  const pairs = [...receipt.summary.matchAll(/(-?\d+(?:\.\d+)?)\s*→\s*(-?\d+(?:\.\d+)?)/g)];
  if (pairs.length !== 1 || receipt.writtenFields.length !== 1 || after === '—') return null;
  const now = Number((/-?\d+(?:\.\d+)?/.exec(after) ?? [])[0]);
  return Number(pairs[0][2]) === now ? pairs[0][1] : null;
}

/** 「改前」那一格：写口没回报就写 `—`。**不许拿本次参数或库内现值顶替**。 */
function beforeCell(col: string, after: string, receipt: CrudReceipt): string {
  const v = beforeOf(col, after, receipt);
  return v === null ? '—' : v;
}

/** ① 操作回执的读数卡：状态 ＋ 影响行数 ＋（写过的字段名，中文）。 */
function opCards(key: string, receipt: CrudReceipt): KpiCardInput[] {
  const cards: KpiCardInput[] = [
    statusCard(receipt, writtenDetail(key) ?? m('skill-calorie.goal-receipt.c003')),
    { label: m('skill-calorie.goal-receipt.c004'), value: m('skill-calorie.goal-receipt.c005', { p0: String(receipt.affectedRows) }), detail: m('skill-calorie.goal-receipt.c006') },
  ];
  const labels: string[] = [];
  for (const name of receipt.writtenFields) {
    const col = PARAM_COLUMN[name];
    if (col !== undefined) labels.push(labelOf(col));
  }
  if (labels.length > 0) {
    cards.push({ label: m('skill-calorie.goal-receipt.c007'), value: m('skill-calorie.goal-receipt.c008', { p0: String(labels.length) }), detail: listJoin(currentRenderLanguage(), labels) });
  }
  return cards;
}

/** 一个区块：`id` 即页内导航锚点，`title` 既当导航项文字也当区块标题。 */
interface Section { readonly id: string; readonly title: string; readonly html: string }

const sectionEl = (s: Section): string =>
  '<section id="' + s.id + '"><h2>' + s.title + '</h2>' + s.html + '</section>';

/** ② 字段变更（改前 ← 回执回报的旧值，改后 ← 库内现值）：一张三列表 ＋ 表下一条口径行。 */
function changeSection(receipt: CrudReceipt, row: NutritionGoalRow | null, paused: boolean): Section {
  const rows: Record<string, unknown>[] = [];
  for (const name of receipt.writtenFields) {
    const col = PARAM_COLUMN[name];
    if (col === undefined) continue;   // 名单外的字段名是内部叫法，不拿它上屏
    const after = cellValue(col, row, paused);
    rows.push({ k: labelOf(col), before: beforeCell(col, after, receipt), after });
  }
  const missing = rows.some((r) => r['before'] === '—');
  const html = renderDataTable({
    columns: [{ key: 'k', label: m('skill-calorie.goal-receipt.c009') }, { key: 'before', label: m('skill-calorie.goal-receipt.c010') }, { key: 'after', label: m('skill-calorie.goal-receipt.c011') }],
    rows,
    caption: m('skill-calorie.goal-receipt.c012'),
    emptyText: m('skill-calorie.goal-receipt.c013'),
  }) + renderCaliberLine(missing
    ? m('skill-calorie.goal-receipt.c014')
    : m('skill-calorie.goal-receipt.c015'));
  return { id: 'sec-change', title: m('skill-calorie.goal-receipt.c016'), html };
}

/** ③ 库里现在的目标：逐格读库的现值表（含暂停态），与上一块「改后」同源。 */
function goalSection(row: NutritionGoalRow | null, paused: boolean): Section {
  const rows = columns().map((c) => ({ k: c.label, v: cellValue(c.col, row, paused) }));
  return {
    id: 'sec-goal',
    title: m('skill-calorie.goal-receipt.c017'),
    html: renderDataTable({
      columns: [{ key: 'k', label: m('skill-calorie.goal-receipt.c018') }, { key: 'v', label: m('skill-calorie.goal-receipt.c019') }],
      rows,
      caption: m('skill-calorie.goal-receipt.c020'),
      emptyText: m('skill-calorie.goal-receipt.c021'),
    }) + renderCaliberLine(m('skill-calorie.goal-receipt.c022')),
  };
}

/** #289 · 两列表（项／值）：三族区块共用，表题即段内小标题。 */
function kvTable(caption: string, rows: Readonly<Record<string, unknown>[]>): string {
  return renderDataTable({
    columns: [{ key: 'k', label: m('skill-calorie.goal-receipt.c023') }, { key: 'v', label: m('skill-calorie.goal-receipt.c024') }],
    rows,
    caption,
    emptyText: m('skill-calorie.goal-receipt.c025'),
  });
}

/** #289 营养族（`calorie.goal.set` 专属）：行值重算宏量合计与换算式（口径照 `nutritionGoal.ts:67`），BMR 提示走草稿 `energy`。 */
function macroSection(row: NutritionGoalRow | null, draft: GoalDraft): Section {
  const cal = row === null ? null : row.calorie_goal, p = row?.protein_goal ?? null, c = row?.carbs_goal ?? null, f = row?.fat_goal ?? null;
  if (cal === null || p === null || c === null || f === null) return { id: 'sec-macro', title: m('skill-calorie.goal-receipt.c026'), html: renderCaliberLine(m('skill-calorie.goal-receipt.c027')) };
  const sum = p * 4 + c * 4 + f * 9, diff = sum - cal;
  const bmr = draft.energy.bmr;
  const below = bmr !== null && cal < bmr;
  const verdict = bmr === null ? m('skill-calorie.goal-receipt.c028', { p0: String(listJoin(currentRenderLanguage(), draft.energy.missing)) }) : below ? m('skill-calorie.goal-receipt.c029', { p0: String(cal), p1: String(bmr) }) : m('skill-calorie.goal-receipt.c030', { p0: String(cal), p1: String(bmr) });
  const diffVerdict = Math.abs(diff) <= 50 ? m('skill-calorie.goal-receipt.c031') : m('skill-calorie.goal-receipt.c032');
  return { id: 'sec-macro', title: m('skill-calorie.goal-receipt.c033'), html: kvTable(m('skill-calorie.goal-receipt.c034'), [
      { k: m('skill-calorie.goal-receipt.c035'), v: m('skill-calorie.goal-receipt.c036', { p0: String(cal) }) },
      { k: m('skill-calorie.goal-receipt.c037'), v: m('skill-calorie.goal-receipt.c038', { p0: String(sum), p1: String(sum) }) },
      { k: m('skill-calorie.goal-receipt.c039'), v: m('skill-calorie.goal-receipt.c040', {
        p0: String(diff >= 0 ? '＋' : ''),
        p1: String(diff),
        p2: String(diffVerdict),
      }) },
      { k: m('skill-calorie.goal-receipt.c041'), v: bmr === null ? '—' : m('skill-calorie.goal-receipt.c042', { p0: String(bmr) }) },
    ]) + (below ? renderFeedbackBlock({ toast: { msg: verdict, icon: 'warn' }, staticNotice: true }) : renderConclusionBar(verdict))
      + renderCaliberLine(m('skill-calorie.goal-receipt.c043', { p0: String(p), p1: String(c), p2: String(f), p3: String(sum) })),
  };
}

/** #289 饮水族（`calorie.goal.water` 专属）：体重×ml/kg＋季节＋推荐值，改类加旧→新 vs 推荐。 */
function waterSection(db: DatabaseSync, receipt: CrudReceipt, row: NutritionGoalRow | null): Section {
  const rec = recommendWaterGoal(db, {}), now = row?.water_goal ?? null;
  const old = beforeOf('water_goal', now === null ? '—' : now + ' ml', receipt);
  const change = old === null || now === null ? null : m('skill-calorie.goal-receipt.c044', {
    p0: String(old),
    p1: String(now),
    p2: String(rec.recommendedWaterMl),
  });
  return { id: 'sec-water', title: m('skill-calorie.goal-receipt.c045'), html: kvTable(m('skill-calorie.goal-receipt.c046'), [
      { k: m('skill-calorie.goal-receipt.c047'), v: rec.weightKg.toFixed(1) + ' kg × ' + rec.mlPerKg + ' ml/kg' },
      { k: m('skill-calorie.goal-receipt.c048'), v: rec.season },
      { k: m('skill-calorie.goal-receipt.c049'), v: m('skill-calorie.goal-receipt.c050', { p0: String(rec.recommendedWaterMl) }) },
    ]) + (change === null ? '' : renderConclusionBar(change))
      + renderCaliberLine(rec.basis),
  };
}

/** #289 体重族（`calorie.goal.weight` 专属）：剩余天数与建议速率，公式与极端口径照 `t251-老技能体重与状态页.md:143-146,233`。 */
function rateSection(row: NutritionGoalRow | null, paused: boolean, draft: GoalDraft): Section {
  const w = draft.weight, gap = w.gapKg, days = w.daysLeft;
  let rate = '—';
  let verdict = m('skill-calorie.goal-receipt.c051');
  let extreme = false;
  if (gap !== null && days !== null && days > 0) {
    const perWeek = Math.abs(gap) / days * 7, pw = perWeek.toFixed(2);
    rate = m('skill-calorie.goal-receipt.c052', { p0: String(pw) });
    const formula = m('skill-calorie.goal-receipt.c053', {
      p0: String(gap.toFixed(1)),
      p1: String(days),
      p2: String(pw),
      p3: String((perWeek * 52 / 12).toFixed(1)),
    });
    const adj = w.requiredDailyKcal;
    extreme = perWeek >= 1.0 || (adj !== null && Math.abs(adj) > 1000);
    const daily = adj === null ? '' : adj > 0 ? m('skill-calorie.goal-receipt.c054', { p0: String(adj) }) : adj < 0 ? m('skill-calorie.goal-receipt.c055', { p0: String(Math.abs(adj)) }) : m('skill-calorie.goal-receipt.c056');
    const rateVerdict = extreme ? m('skill-calorie.goal-receipt.c057') : perWeek >= 0.25 ? m('skill-calorie.goal-receipt.c058') : m('skill-calorie.goal-receipt.c059');
    verdict = m('skill-calorie.goal-receipt.c060', {
      p0: String(rateVerdict),
      p1: String(rate),
      p2: String(daily),
      p3: String(formula),
    });
  }
  const daysText = days === null ? '—' : m('skill-calorie.goal-receipt.c061', { p0: String(days) });
  return { id: 'sec-rate', title: m('skill-calorie.goal-receipt.c062'), html: kvTable(m('skill-calorie.goal-receipt.c063'), [
      { k: m('skill-calorie.goal-receipt.c064'), v: m('skill-calorie.goal-receipt.c065', {
        p0: String(cellValue('weight_goal', row, paused)),
        p1: String(cellValue('goal_deadline', row, paused)),
      }) },
      { k: m('skill-calorie.goal-receipt.c066'), v: m('skill-calorie.goal-receipt.c067', { p0: String(daysText), p1: String(rate) }) },
      { k: m('skill-calorie.goal-receipt.c068'), v: m('skill-calorie.goal-receipt.c069', {
        p0: String(cellValue('start_date', row, paused)),
        p1: String(cellValue('start_weight', row, paused)),
      }) },
    ]) + (extreme ? renderFeedbackBlock({ toast: { msg: verdict, icon: 'danger' }, staticNotice: true }) : renderConclusionBar(verdict)),
  };
}

/** #289 自动算（写参带 `profile`）：推荐值＋采纳后写入值两段对照，推荐数与 wizard 页同源 `buildGoalDraft`。 */
function autoSection(db: DatabaseSync, receipt: CrudReceipt, profile: NutriProfile, paused: boolean): Section {
  const id = 'sec-auto';
  const title = m('skill-calorie.goal-receipt.c070');
  const d = buildGoalDraft(db, { profile }), r = d.recommend;
  if (r === null) return { id, title, html: renderCaliberLine(m('skill-calorie.goal-receipt.c071', { p0: String(listJoin(currentRenderLanguage(), d.energy.missing)) })) };
  const recOf = (col: string): string => col === 'calorie_goal' ? m('skill-calorie.goal-receipt.c072', { p0: String(r.calorieGoal) })
    : col === 'protein_goal' ? r.proteinGoal + ' g'
    : col === 'carbs_goal' ? r.carbsGoal + ' g'
    : col === 'fat_goal' ? r.fatGoal + ' g'
    : col === 'water_goal' ? r.waterGoal + ' ml' : '—';
  const taken = receipt.writtenFields.flatMap((name) => {
    const col = PARAM_COLUMN[name];
    return col === undefined ? [] : [{ k: labelOf(col), r: recOf(col), a: cellValue(col, d.current, paused) }];
  });
  return {
    id,
    title,
    html: kvTable(m('skill-calorie.goal-receipt.c073'), [
      { k: m('skill-calorie.goal-receipt.c074'), v: (d.profileLabel ?? profile) + '（' + profile + '）' },
      { k: m('skill-calorie.goal-receipt.c075'), v: m('skill-calorie.goal-receipt.c076', {
        p0: String(r.calorieGoal),
        p1: String(r.proteinGoal),
        p2: String(r.carbsGoal),
        p3: String(r.fatGoal),
      }) },
      { k: m('skill-calorie.goal-receipt.c077'), v: r.waterGoal + ' ml' },
      { k: m('skill-calorie.goal-receipt.c078'), v: m('skill-calorie.goal-receipt.c079', { p0: String(r.bmr), p1: String(r.tdee) }) },
      { k: m('skill-calorie.goal-receipt.c080'), v: m('skill-calorie.goal-receipt.c081', {
        p0: String(r.weeklyRateKg.toFixed(1)),
        p1: String(r.selfCheck.calculatedKcal),
        p2: String(r.selfCheck.diffKcal >= 0 ? '＋' : ''),
        p3: String(r.selfCheck.diffKcal),
      }) },
    ]) + renderCaliberLine(m('skill-calorie.goal-receipt.c082')) + r.planReasons.map(renderCaliberLine).join('')
      + renderDataTable({ columns: [{ key: 'k', label: m('skill-calorie.goal-receipt.c083') }, { key: 'r', label: m('skill-calorie.goal-receipt.c084') }, { key: 'a', label: m('skill-calorie.goal-receipt.c085') }], rows: taken, caption: m('skill-calorie.goal-receipt.c086'), emptyText: m('skill-calorie.goal-receipt.c087') }) + renderCaliberLine(m('skill-calorie.goal-receipt.c088', { p0: String(d.profileLabel ?? profile) })),
  };
}

/** 副题槽（`t425` 裁定 2：结论句走副题）：写库回执的结论句上屏。**数据面一字不动**
 *  （`receipt.summary` 与 envelope 的 `message` 仍是原文），只把并列用的 `·` 换成句读。 */
function subtitleOf(receipt: CrudReceipt): string {
  return receipt.summary.replace(/\s*·\s*/g, '，');
}

/** 五条命令共用的写后回执整页。`command` ＝ AI 真跑那条写命令的原文，进「复制日志」第 4 段。 */
function buildGoalReceiptDoc(db: DatabaseSync, key: string, params: Record<string, unknown>, receipt: CrudReceipt, command: string): string {
  const row = getNutritionGoal(db);
  const paused = getPausedState(db).paused;
  const startKgRaw = params['startKg'];
  const startKg = startKgRaw === undefined || startKgRaw === null || startKgRaw === '' ? null : Number(startKgRaw);
  const draft = buildGoalDraft(db, { weight: { startKg: Number.isFinite(startKg) ? startKg : null } });
  const sections: Section[] = [
    { id: 'sec-op', title: m('skill-calorie.goal-receipt.c089'), html: renderKpiGrid(opCards(key, receipt)) },
    changeSection(receipt, row, paused),
    goalSection(row, paused),
  ];
  if (key === 'calorie.goal.set') sections.push(macroSection(row, draft));
  if (key === 'calorie.goal.water') sections.push(waterSection(db, receipt, row));
  if (key === 'calorie.goal.weight') sections.push(rateSection(row, paused, draft));
  const rawProfile = params['profile'];
  if (typeof rawProfile === 'string' && isGoalProfile(rawProfile)
    && (key === 'calorie.goal.set' || key === 'calorie.goal.water' || key === 'calorie.goal.weight')) {
    sections.push(autoSection(db, receipt, rawProfile, paused));
  }
  const envelope: SerializableEnvelope = {
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'receipt', key: receipt.meta.wakeWord,
    data: { ok: true, message: receipt.summary },
  };
  const content = [
    renderTocBlock({ items: sections.map((s) => ({ id: s.id, text: s.title })) }),
    sections.map(sectionEl).join(''),
    reconcileDisclosure(receipt),
    copyArea({
      data: { envelope },
      log: {
        envelope,
        copyLog: copyLog({
          command, source: receipt.meta.source, m5Line: receipt.m5Line,
          actionAt: receipt.meta.actionAt, version: DOC_VERSION,
        }),
      },
    }),
  ].join('');
  return assembleDocPage({
    docTitle: m('skill-calorie.goal-receipt.c090'),
    title: receipt.scene,
    eyebrow: m('skill-calorie.goal-receipt.c091'),
    subtitle: subtitleOf(receipt),
    content,
    pageUi: true,
  });
}

/** 目标管理 5 条会改数据库的命令的整页回执端口（分派层只调本函数；其余命令返 null 原样放行）。 */
export function goalReceiptDoc(
  key: string, params: Record<string, unknown>, receipt: CrudReceipt, db: DatabaseSync,
): string | null {
  if (!GOAL_RECEIPT_KEYS.has(key)) return null;
  return buildGoalReceiptDoc(db, key, params, receipt, commandLine(key, params));
}
