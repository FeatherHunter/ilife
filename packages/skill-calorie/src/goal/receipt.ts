/** #253 · 目标管理（HELP 场景 06）**五条会改数据库的命令的写后回执整页**。
 *
 * 本文件是 `cli/write.ts:85` 整页装配链的**第六个装配口**（前五个：档案／饮食／体重／训练计划／
 * 身体细节），形状照 `diet/receipt.ts` 与 `body/receipt.ts` 抄——同一份 `assembleDocPage`、同一组
 * `copyArea`／`copyLog`、同一张 `statusCard`，只换内容。接入前这五条命令落在共用位
 * `shared/writeParts.ts:83` 的 `receiptHtml()`：产物是 275 字节上下的裸片段（没有 `<!doctype html>`、
 * 没有 charset、没有样式、没有页框），还把内部词 `op=update · id=1` 印在屏幕上。
 *
 * 五条命令 → 十条写词（命令名以 `goal/commands.ts` 注册表为准，本件不抄唤醒词）：
 *   定营养目标／改营养目标 → `calorie.goal.set`；定饮水目标／改饮水目标 → `calorie.goal.water`；
 *   定体重目标／改体重目标 → `calorie.goal.weight`；暂停所有目标 → `calorie.goal.pause`；
 *   重启所有目标 → `calorie.goal.resume`。
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
 */
import type { DatabaseSync } from 'node:sqlite';
import { renderCaliberLine, renderDataTable, renderKpiGrid, renderTocBlock } from 'base-paint/blocks';
import type { KpiCardInput } from 'base-paint/blocks';
import type { SerializableEnvelope } from 'base-paint';
import type { CrudReceipt } from '../render/receipt.js';
import { getNutritionGoal } from './nutritionGoal.js';
import type { NutritionGoalRow } from './nutritionGoal.js';
import { getPausedState } from './goalStore.js';
import { assembleDocPage } from '../shared/docPage.js';
import { copyArea, copyLog } from '../shared/copyArea.js';
import { reconcileDisclosure, statusCard } from '../shared/receiptParts.js';
import { commandLine } from '../shared/writeParts.js';

const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';
/** 页签名（编排者裁定）：空格分层、不带任何符号——`·` 是设计债（`scripts/audit-separators.mjs` R1）。 */
const DOC_TITLE = '卡路里 目标回执';
/** 归属词（眉标，**一页一处**）：说清这一页属于哪一族。 */
const EYEBROW = '目标管理';

/** 目标管理 5 条会改数据库的命令（**具名命令集**，命令名权威源＝`goal/commands.ts`）。 */
const GOAL_RECEIPT_KEYS: ReadonlySet<string> = new Set([
  'calorie.goal.set', 'calorie.goal.water', 'calorie.goal.weight',
  'calorie.goal.pause', 'calorie.goal.resume',
]);

/** 写入去向那句说明（共用件 `statusCard` 的必填参数，按命令取本域自己的说法）。 */
const WRITTEN_DETAIL: Readonly<Record<string, string>> = {
  'calorie.goal.set': '已写入每天的目标。说「看今日目标进度」可复查。',
  'calorie.goal.water': '已写入饮水目标。说「看今日目标进度」可复查。',
  'calorie.goal.weight': '已写入体重目标。说「看目标状态」可复查。',
  'calorie.goal.pause': '目标已暂停，记录照常。说「看目标状态」可复查。',
  'calorie.goal.resume': '目标已恢复。说「看目标状态」可复查。',
};

/** 库列 → 中文名（名字逐字取 `precheck.ts` 的现值表与体重块，本件不另编名）＋ 值的单位。 */
interface GoalColumn {
  readonly col: string;
  readonly label: string;
  readonly unit: string;
}

/** 目标行逐列（顺序＝现值表的读法：四宏量 → 饮水 → 体重目标 → 日期 → 起点 → 暂停态）。 */
const COLUMNS: readonly GoalColumn[] = [
  { col: 'calorie_goal', label: '热量(卡)', unit: '卡' },
  { col: 'protein_goal', label: '蛋白(g)', unit: 'g' },
  { col: 'carbs_goal', label: '碳水(g)', unit: 'g' },
  { col: 'fat_goal', label: '脂肪(g)', unit: 'g' },
  { col: 'water_goal', label: '饮水(ml)', unit: 'ml' },
  { col: 'weight_goal', label: '体重目标(kg)', unit: 'kg' },
  { col: 'goal_deadline', label: '截止日期', unit: '' },
  { col: 'start_weight', label: '起点体重(kg)', unit: 'kg' },
  { col: 'start_date', label: '起始日', unit: '' },
  { col: 'goal_paused', label: '目标状态', unit: '' },
];

/** CLI 参数名 → 库列名（写口 `writtenFields` 报的是参数名，页面要说的是库里的那一列）。 */
const PARAM_COLUMN: Readonly<Record<string, string>> = {
  calorie: 'calorie_goal', protein: 'protein_goal', carbs: 'carbs_goal', fat: 'fat_goal',
  water: 'water_goal', kg: 'weight_goal', deadline: 'goal_deadline',
  startKg: 'start_weight', startDate: 'start_date', goal_paused: 'goal_paused',
};

/** 库列名 → 那一列的登记（名单外回 `undefined`：调用面已按 `PARAM_COLUMN`／`COLUMNS` 筛过）。 */
const metaOf = (col: string): GoalColumn | undefined => COLUMNS.find((c) => c.col === col);

/** 库列名 → 中文名（名单外回原名；调用面已按 `PARAM_COLUMN` 筛过，走到这里恒是名单内的列）。 */
const labelOf = (col: string): string => metaOf(col)?.label ?? col;

/** 一格现值：**逐格读库**，缺值写 `—`（不写 0、不写空串），有单位的写「值 单位」。 */
function cellValue(col: string, row: NutritionGoalRow | null, paused: boolean): string {
  if (col === 'goal_paused') return paused ? '已暂停' : '正常（未暂停）';
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
    statusCard(receipt, WRITTEN_DETAIL[key] ?? '已写入每天的目标。'),
    { label: '影响行数', value: receipt.affectedRows + ' 行', detail: '本次写入的行数' },
  ];
  const labels: string[] = [];
  for (const name of receipt.writtenFields) {
    const col = PARAM_COLUMN[name];
    if (col !== undefined) labels.push(labelOf(col));
  }
  if (labels.length > 0) {
    cards.push({ label: '写入字段', value: labels.length + ' 项', detail: labels.join('、') });
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
    columns: [{ key: 'k', label: '字段' }, { key: 'before', label: '改前' }, { key: 'after', label: '改后' }],
    rows,
    caption: '改前 → 改后对照',
    emptyText: '本次回执没有可对照的写入字段。',
  }) + renderCaliberLine(missing
    ? '「改前」那一列的原值由写执行那一层回报；当前目标写口只回报变更字段名，故这一列写 —，不拿新值顶替。'
    : '「改前」是本次写前那一列的原值。');
  return { id: 'sec-change', title: '📋 字段变更', html };
}

/** ③ 库里现在的目标：逐格读库的现值表（含暂停态），与上一块「改后」同源。 */
function goalSection(row: NutritionGoalRow | null, paused: boolean): Section {
  const rows = COLUMNS.map((c) => ({ k: c.label, v: cellValue(c.col, row, paused) }));
  return {
    id: 'sec-goal',
    title: '📊 库里现在的目标',
    html: renderDataTable({
      columns: [{ key: 'k', label: '项' }, { key: 'v', label: '值' }],
      rows,
      caption: '库里现在的目标',
      emptyText: '库里还没有目标行。',
    }) + renderCaliberLine('这一块逐格读自库内，与上面「改后」同源；没设过的格子写 —。'),
  };
}

/** 副题槽（`t425` 裁定 2：结论句走副题）：写库回执的结论句上屏。**数据面一字不动**
 *  （`receipt.summary` 与 envelope 的 `message` 仍是原文），只把并列用的 `·` 换成句读。 */
function subtitleOf(receipt: CrudReceipt): string {
  return receipt.summary.replace(/\s*·\s*/g, '，');
}

/** 五条命令共用的写后回执整页。`command` ＝ AI 真跑那条写命令的原文，进「复制日志」第 4 段。 */
function buildGoalReceiptDoc(db: DatabaseSync, key: string, receipt: CrudReceipt, command: string): string {
  const row = getNutritionGoal(db);
  const paused = getPausedState(db).paused;
  const sections: Section[] = [
    { id: 'sec-op', title: '✅ 操作回执', html: renderKpiGrid(opCards(key, receipt)) },
    changeSection(receipt, row, paused),
    goalSection(row, paused),
  ];
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
    docTitle: DOC_TITLE,
    title: receipt.scene,
    eyebrow: EYEBROW,
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
  return buildGoalReceiptDoc(db, key, receipt, commandLine(key, params));
}
