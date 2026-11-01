/** 饮食（HELP 场景 02「饮食」）· 写后回执页装配（#269 立骨架、#270 按老实物摆内容）。
 *
 * 15＋1 条会改数据库的命令按命令名认领整页回执；其余命令一律返回 null（调用方原样放行）。
 * 必须在 `withM5` 之后调用：本页要印 `affectedRows`／`writtenFields`／`m5Line`。
 *
 * 老实物对照（`D:\2Study\StudyNotes\SKILLS\卡路里\templates\crud_receipt.html`，26279 B，**只读**）：
 * 四块标题逐字对齐——`✅ 操作回执`（`:140`）／`📋 字段变更`（`:156` 的 `diff-card`）／
 * `📊 今日累计`（`:161` 的 `ctx-card`）／`📋 复制明细`（`:166` 的 `items-card`）。#269 只立骨架、
 * 不摆内容，那四串当刻在产物里一个都不存在；本票把它们摆上（见 §①～§④ 四个出口）。
 *
 * 老实物两处**按操作整块隐藏**，本页照办：`📊 今日累计` 见 `:374-387` 的 `op !== 'delete'`；
 * `📋 复制明细` 见 `:390` 按 `context.items.length` 判（删了哪几条已由「📋 字段变更」那张
 * 快照表逐条说明，再列一遍是同一件事两处）。两处都改一句空态说明为什么空（裁定 4）。
 *
 * 融合裁定（`docs/skills/skill-calorie/t425-融合基准.md` §四）：**1** 页题写内容、眉标不出；
 * **2** 结论句走副标题槽；**3** 页内导航／口径说明行／来源脚注三条恒出、全走公共层；
 * **4** 缺值写 `—`、空态出句；**7** 复制区恒双按钮、不出与按钮同名的标题、日志第 4 段是
 * 本次命令原文（`commandLine()`）。
 *
 * 专属约束（票面）：① 改类出「改前 → 改后」、删类出被删快照（老实物 `diff-card` 的 update
 * `:302-327` 与 delete `:328-350` 两分支口径），**导入类是新增不是改动，不硬套对照**；
 * ② 老实物把「今日累计」摆在回执页上（`sum-kpis`／`ctx-card`），今天新仓回执没有这一块 ⇒ 本票补上。
 *
 * **数据面缺口（本票实测，报编排者不越界）**：「改前」值与删前快照只有写执行那一层拿得到
 * （`fetch/diet.ts` 的 `updateMeal`／`updateMealsByDate`／`deleteMealsWhere` 分别回 `before`），
 * 而饮食写口 `src/diet/edit.ts` 只往 `receipt.items` 里放只言片语；补齐须改 `src/diet/edit.ts`
 * 与 `src/diet/products.ts`（都不在本票声明路径内）⇒ 本页只做成「带了就出、没带就出 `—`
 * 与一句空态说明」，**不编数、也不拿本次参数顶替改前值**。
 */
import type { DatabaseSync } from 'node:sqlite';
import { renderCaliberLine, renderChips, renderDataTable, renderKpiGrid, renderTocBlock } from 'base-paint/blocks';
import type { KpiCardInput, StatusKind } from 'base-paint/blocks';
import type { SerializableEnvelope } from 'base-paint';
import type { CrudReceipt } from '../render/receipt.js';
import { getDailySummary, listMeals } from '../fetch/diet.js';
import type { MealRow } from '../fetch/diet.js';
import { todayISO } from '../analysis/utils.js';
import { assembleDocPage } from '../shared/docPage.js';
import { copyArea, copyLog } from '../shared/copyArea.js';
import { dietFieldLabel } from './fieldLabels.js';
import { reconcileDisclosure } from '../shared/receiptParts.js';
import { commandLine } from '../shared/writeParts.js';
import { ENTRY_PRECHECK as PRECHECK_ENTRY } from './precheckPort.js';
import { m } from '../entries/index.js';

const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';
const DOC_TITLE = (): string => m('skill-calorie.diet-receipt.c085');

/** 15＋1 条会改数据库的命令（数据位，具名命令集；分派层只认这一个集合，不再写命令名字面量比较）。
 *
 *  「15 条」怎么数：`calorie.diet.add` 底下挂着 5 个唤醒词（记一餐／记一餐（含备注）／补记饮食／
 *  拍营养表记一餐／拍营养表补记一餐）＋ 8 条饮食记录命令 ＋ 4 条食品库 ＋ 1 条饮水；再加批量导入
 *  （`calorie.product.import`，它原走 `shared/writeParts.ts:83` 的片段回退面：产物里既没有整页
 *  也没有复制区——`.scratch/t155o/text-review-P0.md` 第 9 条点的 `op=create` 就是这一页）
 *  ＝票面的「15＋1」。（批量导入的专用预检页是 #277 的事，本票只把它接到这张面上。） */
const DIET_RECEIPT_KEYS: ReadonlySet<string> = new Set([
  'calorie.diet.add', 'calorie.diet.batch', 'calorie.diet.copy',
  'calorie.diet.remove', 'calorie.diet.remove-by-date', 'calorie.diet.remove-by-range',
  'calorie.diet.remove-by-type', 'calorie.diet.update', 'calorie.diet.update-by-date',
  'calorie.product.add', 'calorie.product.import', 'calorie.product.update', 'calorie.product.deprecate',
  'calorie.water.log',
]);

/** 食品库相关命令走食品库措辞（`writtenDetailOf`／`changeSection` 的必填参数，不给默认值）。 */
const PRODUCT_KEYS: ReadonlySet<string> = new Set([
  'calorie.product.add', 'calorie.product.import', 'calorie.product.update', 'calorie.product.deprecate',
]);

/** 字段名 → 中文标签（走 `./fieldLabels.ts` 那张域表；缺项回退原名，不编词）。 */
function fieldLabelOf(key: string): string {
  return dietFieldLabel(key);
}

/* ───────────────────────── ① ✅ 操作回执（老实物 :135-153、:211-222） ───────────────────────── */

/** 本次操作的中文名（老实物 `:192` 的 `opLabels`）＋状态徽章档位（`:193` 的 `opColors`）。 */
function opWordOf(op: CrudReceipt['op']): string {
  return op === 'update' ? m('skill-calorie.diet-receipt.c001') : op === 'delete' ? m('skill-calorie.diet-receipt.c002') : m('skill-calorie.diet-receipt.c003');
}
function statusKindOf(op: CrudReceipt['op']): StatusKind {
  return op === 'update' ? 'warn' : op === 'delete' ? 'danger' : 'ok';
}

/** 缺值一律 `—`（裁定 4）：空串／null／undefined 都读作缺，不写 0、不写空串。 */
function cellOf(v: string | number | null | undefined): string {
  return v === null || v === undefined || v === '' ? '—' : String(v);
}

/** 状态卡副说明（按**本次操作**取，不按命令名取；照兄弟域 `weight/plateDocs.ts:197` 的做法）。
 *  四串开头逐字＝`test/t496-文案统一.test.mjs` 第 ② 条钉住的读数（删类说删了、改类说改了、
 *  新增说写了），删类另说「本页没有撤销按钮」——全仓 0 个恢复入口，不许承诺可恢复。 */
function writtenDetailOf(key: string, op: CrudReceipt['op']): string {
  if (key === 'calorie.product.deprecate') return m('skill-calorie.diet-receipt.c004');
  if (PRODUCT_KEYS.has(key)) return m('skill-calorie.diet-receipt.c005');
  if (key === 'calorie.water.log') {
    return op === 'delete' ? m('skill-calorie.diet-receipt.c006') : m('skill-calorie.diet-receipt.c007');
  }
  if (op === 'delete') return m('skill-calorie.diet-receipt.c008');
  if (op === 'update') return m('skill-calorie.diet-receipt.c009');
  return m('skill-calorie.diet-receipt.c010');
}

/** 状态读数卡（老实物 `id-card`＋备注行＋`kpi-grid` 三块的等价物）。删类没有写入字段，故不出
 *  「写入字段」那张卡——免得读者把「0 项」读成失败。 */
function statusCards(key: string, receipt: CrudReceipt): KpiCardInput[] {
  const cards: KpiCardInput[] = [
    {
      label: m('skill-calorie.diet-receipt.c011'), value: m('skill-calorie.diet-receipt.c012', { p0: String(opWordOf(receipt.op)) }),
      detail: receipt.noChange ? m('skill-calorie.diet-receipt.c013') : writtenDetailOf(key, receipt.op),
      status: statusKindOf(receipt.op), statusText: receipt.noChange ? m('skill-calorie.diet-receipt.c014') : m('skill-calorie.diet-receipt.c015'),
    },
    { label: m('skill-calorie.diet-receipt.c016'), value: m('skill-calorie.diet-receipt.c017', { p0: String(receipt.affectedRows) }), detail: m('skill-calorie.diet-receipt.c018') },
  ];
  if (receipt.writtenFields.length > 0) {
    cards.push({
      label: m('skill-calorie.diet-receipt.c019'), value: m('skill-calorie.diet-receipt.c020', { p0: String(receipt.writtenFields.length) }),
      detail: m('skill-calorie.diet-receipt.c021'),
    });
  }
  return cards;
}

/** 写入字段徽章列（#581：顿号并列换公共层 `renderChips` 现成件，一字段一徽章）。
 *  删类没有写入字段，故不出（调用方只在有字段时调，见 `buildDietReceiptDoc`）。 */
function writtenChips(receipt: CrudReceipt): string {
  if (receipt.writtenFields.length === 0) return '';
  return renderChips({ items: receipt.writtenFields.map((col) => ({ text: fieldLabelOf(col) })) });
}

/** 批量补记那张读数卡：从本域 `writeDietBatch`（`./log.ts`）自己产出的摘要里读回三个计数。
 *  三格各带一句说明（`test/t496-文案统一.test.mjs` 第 ③ 条第 4 条逐字钉着后两格那几句）；
 *  摘要本体的机器面（`envelope.message` 与 `receipt.summary`）一字不动，这里只供**上屏**。
 *  `批量记饮食：新增` 那一串公式不上屏——它就住在这张卡的上方。格式对不上即不出这张卡，读数不编。 */
const BATCH_COUNT_RE = /批量记饮食：新增 (\d+)，跳过 (\d+)，失败 (\d+)/;

function batchCountsCard(receipt: CrudReceipt): string {
  const hit = BATCH_COUNT_RE.exec(receipt.summary);
  if (hit === null) return '';
  return renderKpiGrid([
    { label: m('skill-calorie.diet-receipt.c022'), value: hit[1], unit: m('skill-calorie.diet-receipt.c023'), detail: m('skill-calorie.diet-receipt.c024') },
    { label: m('skill-calorie.diet-receipt.c025'), value: hit[2], unit: m('skill-calorie.diet-receipt.c026'), detail: m('skill-calorie.diet-receipt.c027') },
    {
      label: m('skill-calorie.diet-receipt.c028'), value: hit[3], unit: m('skill-calorie.diet-receipt.c029'),
      detail: m('skill-calorie.diet-receipt.c030'),
      status: hit[3] === '0' ? 'empty' : 'warn',
    },
  ]);
}

/* ───────────── ② 📋 字段变更（老实物 :155-158 的 diff-card ＋ :302-372 三分支） ───────────── */

/** 参数里的一个值：先按库列名取，再按 CLI 参数名（驼峰）取。 */
function paramValue(col: string, params: Record<string, unknown>): string | number | null {
  const camel = col.replace(/_([a-z])/g, (_all, ch: string) => ch.toUpperCase());
  const raw = params[col] ?? params[camel];
  if (raw === undefined || raw === null || raw === '') return null;
  return typeof raw === 'number' || typeof raw === 'string' ? raw : null;
}

/** 新增类回执的「本次结果」列要印**真值**（#591 裁定4：记一餐那张表不许 9 行复读同一个 `—`）。
 *  单条写入的写口报了 `recordId` 与写入日期 ⇒ 按 `listMeals` 读回那一行，逐字段印库里的值
 *  （写口填的缺省如克数 100／碳水 0 也是**真写进去的值**，不是编的）；读不回那一行就退本次参数。 */
const DIET_COL_OF: Readonly<Record<string, keyof MealRow>> = {
  foodName: 'food_name', calories: 'calories', protein: 'protein', carbs: 'carbs',
  fat: 'fat', grams: 'grams', note: 'note', date: 'date', time: 'time',
};

/** 本次真写进去的那一行（按 `recordId` 认行、按回执报的写入日期读回）；多行写入／无 id 即 null。 */
function writtenRowOf(receipt: CrudReceipt, db: DatabaseSync): MealRow | null {
  if (receipt.recordId === null) return null;
  const date = receipt.items.map((it) => it.date).find((d) => typeof d === 'string' && d !== '');
  if (date === undefined) return null;
  return listMeals(db, date).find((r) => r.id === receipt.recordId) ?? null;
}

/** 新增类一行「本次结果」：库里那一行的真值优先，取不到才退本次参数（缺值仍 `—`）。 */
function createdValueOf(col: string, written: MealRow | null, eff: Record<string, unknown>): string | number | null {
  const key = DIET_COL_OF[col];
  if (written !== null && key !== undefined) return written[key];
  return paramValue(col, eff);
}

/** 改某日那一族把待改字段放在 `params.fields` 里；摊平后与普通参数同一读法。 */
function flatParams(params: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(params)) {
    if (k === 'fields' || k === 'items' || k === 'key') continue;
    out[k] = v;
  }
  const nested = params['fields'];
  if (nested !== null && typeof nested === 'object') {
    for (const [k, v] of Object.entries(nested as Record<string, unknown>)) out[k] = v;
  }
  return out;
}

/** 改前值：回执逐行的 `reason` 若是兄弟域那种「旧 → 新」对子（`weight/edit.ts:29` 的写法）
 *  且左半是本字段，就取它；没有就回 `null` ⇒ 上屏 `—`（裁定 4）。**不许拿本次参数顶替**：
 *  参数里装的是写进去的新值，摆进「改前」那一列即把改后值当改前值印（本票实测到的缺陷）。 */
function beforeOf(col: string, items: CrudReceipt['items']): string | number | null {
  const label = fieldLabelOf(col);
  for (const it of items) {
    const hit = /^(.+?)\s*→\s*(.+)$/.exec(it.reason ?? '');
    if (hit !== null && hit[1].includes(label)) return hit[1].trim();
  }
  return null;
}

/** 改类对照表：改后＝本次写进去的那个值（参数原文），改前＝`beforeOf` 的真值或 `—`。 */
function changeRowsOf(receipt: CrudReceipt, params: Record<string, unknown>): Record<string, unknown>[] {
  const eff = flatParams(params);
  return receipt.writtenFields.map((col) => ({
    k: fieldLabelOf(col),
    before: cellOf(beforeOf(col, receipt.items)),
    after: cellOf(paramValue(col, eff)),
  }));
}

/** 改前真值一个都没来 ⇒ 表下补一句口径行（裁定 4：空要说出为什么空）。 */
const beforeMissing = (r: CrudReceipt): boolean => r.writtenFields.some((c) => beforeOf(c, r.items) === null);

/** 删类快照表（老实物 `:328-350`）：逐条列出删前的原值。原值取回执逐行的 `detail`（单条删放食物名、
 *  删喝水放毫升数），`detail` 空时退 `reason`；回执没带行时出空态句——那正是数据面缺口的表现。 */
function snapshotTable(receipt: CrudReceipt): string {
  const rows = receipt.items.map((it) => ({
    id: it.id === undefined || it.id === null ? '—' : String(it.id), date: cellOf(it.date),
    keep: cellOf(it.detail !== undefined && it.detail !== '' ? it.detail : it.reason),
    status: cellOf(it.status),
  }));
  return renderDataTable({
    columns: [{ key: 'id', label: m('skill-calorie.diet-receipt.c031') }, { key: 'date', label: m('skill-calorie.diet-receipt.c032') },
      { key: 'keep', label: m('skill-calorie.diet-receipt.c033') }, { key: 'status', label: m('skill-calorie.diet-receipt.c034') }],
    rows,
    caption: m('skill-calorie.diet-receipt.c035'),
    emptyText: m('skill-calorie.diet-receipt.c036'),
  });
}

/** 📋 字段变更 区块：改类出「改前 → 改后」；删类出被删快照；新增类逐字段印本次真值。 */
function changeSection(receipt: CrudReceipt, params: Record<string, unknown>, db: DatabaseSync): Section {
  const title = m('skill-calorie.diet-receipt.c037');
  if (receipt.op === 'delete') return { id: 'sec-change', title, html: snapshotTable(receipt) };
  if (receipt.op === 'update') {
    const html = renderDataTable({
      columns: [{ key: 'k', label: m('skill-calorie.diet-receipt.c038') }, { key: 'before', label: m('skill-calorie.diet-receipt.c039') }, { key: 'after', label: m('skill-calorie.diet-receipt.c040') }],
      rows: changeRowsOf(receipt, params), caption: m('skill-calorie.diet-receipt.c041'),
      emptyText: m('skill-calorie.diet-receipt.c042'),
    }) + (beforeMissing(receipt)
      ? renderCaliberLine(m('skill-calorie.diet-receipt.c043'))
        + renderCaliberLine(m('skill-calorie.diet-receipt.c044'))
      : renderCaliberLine(m('skill-calorie.diet-receipt.c045')));
    return { id: 'sec-change', title, html };
  }
  /* 新增类（含批量导入）：**不硬套「改前 → 改后」**（票面专属约束①）——它是新长出来的一条，
     没有改前可言；老实物 `:351-372` 的 create 分支摆的是新值、箭位藏起来，本支摆**本次写进去的值**
     （#591 裁定4：单条写入的那 9 行照库里那一行逐字段印真值，不摆字段名复读同一个缺值符）。
     多行写入（批量补记／复制）没有单行 id ⇒ 那两页仍按本次参数印，取不到就是 `—`（不编数）。 */
  const eff = flatParams(params);
  const written = writtenRowOf(receipt, db);
  const html = renderDataTable({
    columns: [{ key: 'k', label: m('skill-calorie.diet-receipt.c046') }, { key: 'v', label: m('skill-calorie.diet-receipt.c047') }],
    rows: receipt.writtenFields.map((col) => ({
      k: fieldLabelOf(col),
      v: cellOf(createdValueOf(col, written, eff)),
    })),
    caption: m('skill-calorie.diet-receipt.c048'),
    emptyText: m('skill-calorie.diet-receipt.c049'),
  });
  return { id: 'sec-change', title, html };
}

/* ──────────────── ③ 📊 今日累计（老实物 :160-163 的 ctx-card ＋ :374-387） ──────────────── */

/** 本次影响的日期（今日累计按它算）：参数里有哪天就按哪天，都没有即今天。 */
function receiptDate(params: Record<string, unknown>): string {
  const pick = (name: string): string | null => {
    const v = params[name];
    return typeof v === 'string' && v !== '' ? v : null;
  };
  return pick('date') ?? pick('from') ?? pick('fromDate') ?? pick('to') ?? pick('toDate')
    ?? pick('start') ?? pick('end') ?? todayISO();
}

/** 相对目标还剩多少（老实物 `:378` 的 `pct` 槽 `/ 目标 (N%)` 那半句的等价物）。 */
function leftText(used: number, goal: number | null | undefined): string {
  if (goal === null || goal === undefined) return m('skill-calorie.diet-receipt.c050');
  const rest = goal - used;
  return rest >= 0 ? m('skill-calorie.diet-receipt.c051', { p0: String(rest) }) : m('skill-calorie.diet-receipt.c052', { p0: String(Math.abs(rest)) });
}

/** 📊 今日累计 区块（老实物 `ctx-card`）：写后现值，不自算口径（`getDailySummary` 正本）。
 *  老实物 `:374-387` 只在 `op !== 'delete'` 时画（删除场景整卡隐藏）——调用方按 `op` 判。 */
function dailySection(db: DatabaseSync, date: string): Section {
  const s = getDailySummary(db, date);
  const g = s.goal;
  const html = renderDataTable({
    columns: [{ key: 'k', label: m('skill-calorie.diet-receipt.c053') }, { key: 'v', label: m('skill-calorie.diet-receipt.c054') }],
    rows: [
      { k: m('skill-calorie.diet-receipt.c055'), v: s.date },
      { k: m('skill-calorie.diet-receipt.c056'), v: m('skill-calorie.diet-receipt.c057', {
        p0: String(s.totals.cal),
        p1: String(leftText(s.totals.cal, g?.calorie_goal)),
      }) },
      { k: m('skill-calorie.diet-receipt.c058'), v: m('skill-calorie.diet-receipt.c059', {
        p0: String(s.totals.pro),
        p1: String(leftText(s.totals.pro, g?.protein_goal)),
      }) },
      { k: m('skill-calorie.diet-receipt.c060'), v: m('skill-calorie.diet-receipt.c061', {
        p0: String(s.totals.carbs),
        p1: String(leftText(s.totals.carbs, g?.carbs_goal)),
      }) },
      { k: m('skill-calorie.diet-receipt.c062'), v: m('skill-calorie.diet-receipt.c063', {
        p0: String(s.totals.fat),
        p1: String(leftText(s.totals.fat, g?.fat_goal)),
      }) },
      { k: m('skill-calorie.diet-receipt.c064'), v: m('skill-calorie.diet-receipt.c065', { p0: String(s.entryCount) }) },
      { k: m('skill-calorie.diet-receipt.c066'), v: s.waterMl + ' ml' },
    ],
    caption: m('skill-calorie.diet-receipt.c067'),
  }) + (g === null
    ? renderCaliberLine(m('skill-calorie.diet-receipt.c068'))
      + renderCaliberLine(m('skill-calorie.diet-receipt.c069'))
    : renderCaliberLine(m('skill-calorie.diet-receipt.c070'))
      + renderCaliberLine(m('skill-calorie.diet-receipt.c071')));
  return { id: 'sec-sum', title: m('skill-calorie.diet-receipt.c072'), html };
}

/* ──────────────── ④ 📋 复制明细（老实物 :165-168 的 items-card ＋ :389-410） ──────────────── */

/** 📋 复制明细 区块（老实物 `item-row`：时间／内容／状态）。老实物 `:390` 按 `context.items.length`
 *  判出不出这一块；新仓按回执逐行有没有可读内容判（`detail` 空的行列出来没有信息量，故不列）。
 *  删类不出这一块：删了哪几条已经由「📋 字段变更」那张快照表逐条说了，再列一遍是同一件事两处。 */
function itemsSection(receipt: CrudReceipt): Section | null {
  if (receipt.op === 'delete') return null;
  const detailed = receipt.items.filter((it) => it.status !== '' && it.detail !== undefined && it.detail !== '');
  const skipped = receipt.items.filter((it) => it.status.includes('跳过')).length;
  const skippedPhrase = skipped > 0 ? m('skill-calorie.diet-receipt.c073', { p0: String(skipped) }) : '';
  const html = renderDataTable({
    columns: [{ key: 'time', label: m('skill-calorie.diet-receipt.c074') }, { key: 'food', label: m('skill-calorie.diet-receipt.c075') }, { key: 'status', label: m('skill-calorie.diet-receipt.c076') }],
    rows: detailed.map((it) => ({
      time: cellOf(it.reason), food: cellOf(it.detail),
      status: cellOf(it.status) + (it.id === undefined || it.id === null ? '' : m('skill-calorie.diet-receipt.c077', { p0: String(it.id) })),
    })),
    caption: m('skill-calorie.diet-receipt.c078', { p0: String(detailed.length), p1: String(skippedPhrase) }),
    emptyText: m('skill-calorie.diet-receipt.c079'),
  });
  return { id: 'sec-items', title: m('skill-calorie.diet-receipt.c080'), html };
}

/* ─────────────────────── 页面骨架（`t425` §五 那 15 行的本类子集） ─────────────────────── */

/** 一个区块：`id` 即页内导航锚点（裁定 3），`title` 既当导航项文字也当区块标题。 */
interface Section { readonly id: string; readonly title: string; readonly html: string }

/** 区块标题：老实物的四串里 `:140` 那行是 `<h1>`、其余三行是 `<h2>`；本页的 `<h1>` 已由
 *  `assembleDocPage` 占用（页题），故四块统一用 `<h2>`。版式与色值全走公共层那份样式表。 */
function sectionEl(s: Section): string {
  return '<section id="' + s.id + '"><h2>' + s.title + '</h2>' + s.html + '</section>';
}

/** 饮食 15＋1 条回执整页：页内导航 ＋ 四块（老实物逐字）＋ 读数卡 ＋ 对账 ＋ 复制区 ＋ 来源脚注。 */
function buildDietReceiptDoc(
  db: DatabaseSync, key: string, params: Record<string, unknown>, receipt: CrudReceipt, command: string,
): string {
  const envelope: SerializableEnvelope = {
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'receipt', key: receipt.meta.wakeWord,
    data: { ok: true, message: receipt.summary },
  };
  const sections: Section[] = [
    {
      id: 'sec-op', title: m('skill-calorie.diet-receipt.c081'),
      html: renderKpiGrid(statusCards(key, receipt)) + writtenChips(receipt) + batchCountsCard(receipt),
    },
    changeSection(receipt, params, db),
  ];
  if (receipt.op !== 'delete') sections.push(dailySection(db, receiptDate(params)));
  const items = itemsSection(receipt);
  if (items !== null) sections.push(items);
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
    renderCaliberLine(m('skill-calorie.diet-receipt.c082', {
      p0: String(receipt.affectedRows),
      p1: String(receipt.meta.actionAt.slice(0, 16)),
    })),
  ].join('');
  return assembleDocPage({
    docTitle: DOC_TITLE(), title: m('skill-calorie.diet-receipt.c083', { p0: String(receipt.scene) }), eyebrow: '',
    pageUi: true,
    subtitle: subtitleOf(receipt), content,
  });
}

/** 回执摘要 → 副题（**只翻上屏这一处**，`receipt.summary` 与 envelope 的 `message` 一字不动）。
 *
 *  #496 · 原文混着三种读者用不上的东西（审查件第 31、33、35、37、39 条）：内部记录编号 `#1`（对账区
 *  已有「记录编号」一行）／删类的「硬删除，不可恢复」（库层措辞，读者要的是「删了就找不回来」）／相同
 *  日期照抄（`2026-09-14→2026-09-14`）。形态照档案域先例 `src/profile/update.ts:87`：印派生句、数据面不动。
 *  批量补记那句是四个数字串成的公式，三个计数的含义由三张读数卡逐格说，副题只留一句结论。 */
function subtitleOf(receipt: CrudReceipt): string {
  const batch = BATCH_COUNT_RE.exec(receipt.summary);
  if (batch !== null) return m('skill-calorie.diet-receipt.c084', { p0: String(batch[1]) });
  const gonePhrase = m('skill-calorie.diet-receipt.c086');
  const deletedPhrase = m('skill-calorie.diet-receipt.c087');
  const singleDayPhrase = m('skill-calorie.diet-receipt.c088');
  const toWord = m('skill-calorie.diet-receipt.c089');
  const sameDayPhrase = m('skill-calorie.diet-receipt.c090');
  return receipt.summary
    .replace(/ · 硬删除，不可恢复/, gonePhrase)
    .replace(/（硬删除，不可恢复）/g, gonePhrase)
    .replace(/^已删除饮食 #\d+/, deletedPhrase)
    .replace(/#\d+/, '')
    .replace(/(\d{4}-\d{2}-\d{2})~(\d{4}-\d{2}-\d{2})/g, (all, a, b) => (a === b ? a + singleDayPhrase : a + toWord + b))
    .replace(/(\d{4}-\d{2}-\d{2})→(\d{4}-\d{2}-\d{2})/g, (all, a, b) => (a === b ? sameDayPhrase + a + '）' : all))
    /* #581 · 副题是分隔符门禁的管辖面（`audit-separators.mjs`）：数据面原样不动，上屏在这里归一——
       全角分号改句号、间隔号改逗号、日期区间波浪线改「至」。 */
    .replace(/；/g, '。')
    .replace(/ ?· ?/g, '，');
}

/** 饮食 15＋1 条会改数据库的命令的整页回执端口（分派层只调本函数）。 */
export function dietReceiptDoc(
  key: string, params: Record<string, unknown>, receipt: CrudReceipt, db: DatabaseSync,
): string | null {
  if (!DIET_RECEIPT_KEYS.has(key)) return null;
  /* #277 · 入口带 `entry:"precheck"` 时这一趟出的是**预检确认页**（写前页，在处理体里直接组装），
     回执页整个让位。不带这一位＝从前的行为，一字不差。 */
  if (params['entry'] === PRECHECK_ENTRY) return null;
  return buildDietReceiptDoc(db, key, params, receipt, commandLine(key, params));
}
