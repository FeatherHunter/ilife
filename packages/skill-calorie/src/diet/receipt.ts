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
import { renderCaliberLine, renderDataTable, renderKpiGrid, renderTocBlock } from 'base-paint/blocks';
import type { KpiCardInput, StatusKind } from 'base-paint/blocks';
import type { SerializableEnvelope } from 'base-paint';
import type { CrudReceipt } from '../render/receipt.js';
import { getDailySummary } from '../fetch/diet.js';
import { todayISO } from '../analysis/utils.js';
import { assembleDocPage } from '../shared/docPage.js';
import { copyArea, copyLog } from '../shared/copyArea.js';
import { fieldLabel } from '../shared/fieldLabel.js';
import { DIET_DOMAIN } from './fieldLabels.js';
import { reconcileDisclosure } from '../shared/receiptParts.js';
import { commandLine } from '../shared/writeParts.js';
import { ENTRY_PRECHECK as PRECHECK_ENTRY } from './precheckPort.js';

const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';
const DOC_TITLE = '卡路里·饮食回执';

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
  return fieldLabel(DIET_DOMAIN, key);
}

/* ───────────────────────── ① ✅ 操作回执（老实物 :135-153、:211-222） ───────────────────────── */

/** 本次操作的中文名（老实物 `:192` 的 `opLabels`）＋状态徽章档位（`:193` 的 `opColors`）。 */
function opWordOf(op: CrudReceipt['op']): string {
  return op === 'update' ? '修改' : op === 'delete' ? '删除' : '新增';
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
  if (key === 'calorie.product.deprecate') return '已从食品库下架。要重新上架，说「批量导入食品」可再存一次。';
  if (PRODUCT_KEYS.has(key)) return '已写入食品库。说「查食品」可复查这一条。';
  if (key === 'calorie.water.log') {
    return op === 'delete' ? '已从饮水记录中删除。' : '已写入饮水记录。说「看今日喝水」可复查。';
  }
  if (op === 'delete') return '已从饮食记录中删除。本页没有撤销按钮。';
  if (op === 'update') return '已更新饮食记录。要改回去，照「📋 字段变更」里「改前」那一列改；'
    + '那一列没有读数时，本页给不出写前原值。';
  return '已写入饮食记录。说「看今日饮食」可复查。';
}

/** 状态读数卡（老实物 `id-card`＋备注行＋`kpi-grid` 三块的等价物）。删类没有写入字段，故不出
 *  「写入字段」那张卡——免得读者把「0 项」读成失败。 */
function statusCards(key: string, receipt: CrudReceipt): KpiCardInput[] {
  const cards: KpiCardInput[] = [
    {
      label: '状态', value: opWordOf(receipt.op) + '成功',
      detail: receipt.noChange ? '值与改前一致' : writtenDetailOf(key, receipt.op),
      status: statusKindOf(receipt.op), statusText: receipt.noChange ? '无改动' : '已改动',
    },
    { label: '影响行数', value: receipt.affectedRows + ' 行', detail: '本次写入的行数' },
  ];
  if (receipt.writtenFields.length > 0) {
    cards.push({
      label: '写入字段', value: receipt.writtenFields.length + ' 项',
      detail: receipt.writtenFields.map(fieldLabelOf).join('、'),
    });
  }
  return cards;
}

/** 批量补记那张读数卡：从本域 `writeDietBatch`（`./log.ts`）自己产出的摘要里读回三个计数。
 *  三格各带一句说明（`test/t496-文案统一.test.mjs` 第 ③ 条第 4 条逐字钉着后两格那几句）；
 *  摘要本体的机器面（`envelope.message` 与 `receipt.summary`）一字不动，这里只供**上屏**。
 *  `批量记饮食：新增` 那一串公式不上屏——它就住在这张卡的上方。格式对不上即不出这张卡，读数不编。 */
const BATCH_COUNT_RE = /批量记饮食：新增 (\d+)，跳过 (\d+)，失败 (\d+)/;

function batchCountsCard(receipt: CrudReceipt): string {
  const m = BATCH_COUNT_RE.exec(receipt.summary);
  if (m === null) return '';
  return renderKpiGrid([
    { label: '新增', value: m[1], unit: '条', detail: '这次记进库的' },
    { label: '已在库跳过', value: m[2], unit: '条', detail: '同名同餐的记录不会重复添加' },
    {
      label: '分类失败', value: m[3], unit: '条',
      detail: '没读出是哪一餐；这些条留在下方明细里，可手动补一次',
      status: m[3] === '0' ? 'empty' : 'warn',
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
    const m = /^(.+?)\s*→\s*(.+)$/.exec(it.reason ?? '');
    if (m !== null && m[1].includes(label)) return m[1].trim();
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
    columns: [{ key: 'id', label: '记录编号' }, { key: 'date', label: '日期' },
      { key: 'keep', label: '删除前的原值' }, { key: 'status', label: '状态' }],
    rows,
    caption: '删除前的原值（逐条）',
    emptyText: '本次回执未带删除前的逐条原值——按条件删的那几条，写口只回报删掉了几条。',
  });
}

/** 📋 字段变更 区块：改类出「改前 → 改后」；删类出被删快照；新增类只摆写入字段名。 */
function changeSection(receipt: CrudReceipt, params: Record<string, unknown>): Section {
  const title = '📋 字段变更';
  if (receipt.op === 'delete') return { id: 'sec-change', title, html: snapshotTable(receipt) };
  const written = receipt.writtenFields.map(fieldLabelOf).join('、') || '未设置';
  if (receipt.op === 'update') {
    const html = renderDataTable({
      columns: [{ key: 'k', label: '字段' }, { key: 'before', label: '改前' }, { key: 'after', label: '改后' }],
      rows: changeRowsOf(receipt, params), caption: '改前 → 改后对照',
      emptyText: '本次回执未带逐字段对照（写入字段：' + written + '）',
    }) + renderCaliberLine(beforeMissing(receipt)
      ? '「改前」那一列的原值由写执行那一层回报；当前饮食写口只回报变更字段名，故这一列写 —，不拿新值顶替。'
      : '「改前」是本次写前那一列的原值。');
    return { id: 'sec-change', title, html };
  }
  /* 新增类（含批量导入）：**不硬套「改前 → 改后」**（票面专属约束①）——它是新长出来的一条，
     没有改前可言；老实物 `:351-372` 的 create 分支摆的是新值、箭位藏起来，本支只摆**本次写入的
     字段名**，值由副题摘要（含食物名）与「📋 复制明细」给：导入成批时逐条值不落在这一张表里。 */
  const html = renderDataTable({
    columns: [{ key: 'k', label: '字段' }, { key: 'v', label: '本次结果' }],
    rows: receipt.writtenFields.map((col) => ({
      k: fieldLabelOf(col),
      v: '已写入' + (receipt.meta.source.includes('食品库') ? '食品库' : '饮食记录'),
    })),
    caption: '新增内容（本次写入的字段）',
    emptyText: '本次没有写入字段——逐条结果（含跳过与失败）见「📋 复制明细」。',
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
  if (goal === null || goal === undefined) return '未设目标';
  const rest = goal - used;
  return rest >= 0 ? '还剩 ' + rest : '已超 ' + Math.abs(rest);
}

/** 📊 今日累计 区块（老实物 `ctx-card`）：写后现值，不自算口径（`getDailySummary` 正本）。
 *  老实物 `:374-387` 只在 `op !== 'delete'` 时画（删除场景整卡隐藏）——调用方按 `op` 判。 */
function dailySection(db: DatabaseSync, date: string): Section {
  const s = getDailySummary(db, date);
  const g = s.goal;
  const html = renderDataTable({
    columns: [{ key: 'k', label: '项' }, { key: 'v', label: '值' }],
    rows: [
      { k: '日期', v: s.date },
      { k: '热量累计', v: s.totals.cal + ' 卡（' + leftText(s.totals.cal, g?.calorie_goal) + '）' },
      { k: '蛋白累计', v: s.totals.pro + ' g（' + leftText(s.totals.pro, g?.protein_goal) + '）' },
      { k: '碳水累计', v: s.totals.carbs + ' g（' + leftText(s.totals.carbs, g?.carbs_goal) + '）' },
      { k: '脂肪累计', v: s.totals.fat + ' g（' + leftText(s.totals.fat, g?.fat_goal) + '）' },
      { k: '饮食条数', v: s.entryCount + ' 条' },
      { k: '饮水累计', v: s.waterMl + ' ml' },
    ],
    caption: '今日累计',
  }) + renderCaliberLine(g === null
    ? '还没有设过每天的目标，故这里只报累计值；说「定营养目标」之后还会报还剩多少。'
    : '括号里是相对今天的目标还剩多少；超出目标写「已超」。');
  return { id: 'sec-sum', title: '📊 今日累计', html };
}

/* ──────────────── ④ 📋 复制明细（老实物 :165-168 的 items-card ＋ :389-410） ──────────────── */

/** 📋 复制明细 区块（老实物 `item-row`：时间／内容／状态）。老实物 `:390` 按 `context.items.length`
 *  判出不出这一块；新仓按回执逐行有没有可读内容判（`detail` 空的行列出来没有信息量，故不列）。
 *  删类不出这一块：删了哪几条已经由「📋 字段变更」那张快照表逐条说了，再列一遍是同一件事两处。 */
function itemsSection(receipt: CrudReceipt): Section | null {
  if (receipt.op === 'delete') return null;
  const detailed = receipt.items.filter((it) => it.status !== '' && it.detail !== undefined && it.detail !== '');
  const skipped = receipt.items.filter((it) => it.status.includes('跳过')).length;
  const html = renderDataTable({
    columns: [{ key: 'time', label: '时间' }, { key: 'food', label: '内容' }, { key: 'status', label: '状态' }],
    rows: detailed.map((it) => ({
      time: cellOf(it.reason), food: cellOf(it.detail),
      status: cellOf(it.status) + (it.id === undefined || it.id === null ? '' : '（编号 ' + it.id + '）'),
    })),
    caption: '本次逐条明细（共 ' + detailed.length + ' 条'
      + (skipped > 0 ? '，其中跳过 ' + skipped + ' 条' : '') + '）',
    emptyText: '本次回执没有逐条读数——上方的读数卡与「📊 今日累计」就是这次的全部结果。',
  });
  return { id: 'sec-items', title: '📋 复制明细', html };
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
      id: 'sec-op', title: '✅ 操作回执',
      html: renderKpiGrid(statusCards(key, receipt)) + batchCountsCard(receipt),
    },
    changeSection(receipt, params),
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
    renderCaliberLine('📊 数据来源：本机饮食库 ｜ 本次影响 ' + receipt.affectedRows + ' 行'
      + ' ｜ 时间 ' + receipt.meta.actionAt),
  ].join('');
  return assembleDocPage({
    docTitle: DOC_TITLE, title: receipt.scene + ' · 回执', eyebrow: '',
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
  if (batch !== null) return '本次批量补记：' + batch[1] + ' 条已记下';
  return receipt.summary
    .replace(/ · 硬删除，不可恢复/, '；删了就找不回来')
    .replace(/（硬删除，不可恢复）/g, '；删了就找不回来')
    .replace(/^已删除饮食 #\d+/, '已删除这条饮食记录')
    .replace(/#\d+/, '')
    .replace(/(\d{4}-\d{2}-\d{2})~(\d{4}-\d{2}-\d{2})/g, (all, a, b) => (a === b ? a + '（单日）' : all))
    .replace(/(\d{4}-\d{2}-\d{2})→(\d{4}-\d{2}-\d{2})/g, (all, a, b) => (a === b ? '同一天（' + a + '）' : all));
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
