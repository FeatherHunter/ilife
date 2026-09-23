/** 运动（HELP 场景 04「运动」下一级 · 记运动／改运动／删运动）· 写后回执页装配。
 *
 * #264 建形状（整页＋状态卡／对账区＋三格式复制＋当日累计活行口径）本票不动；
 * #449 字段展示收口域标签表（缺项回退原键名，可见文本不留参数名）；
 * #423 换版式（四态头＋变更卡共用一张＋四卡判空＋撤销按需＋来源脚注＋运动口径明细＋导航可打印口径行）。
 * #543 形状化：眉标页题去 `·`、来源行改键值行、口径行一条一条、副标题行文整形（连符号两侧空档一起收）、
 * 新增页计数改新增条数（原先误印删除计数）、数值格显示层取整、计数题不复述软删除句、
 * 明细标题不再带条数、写入字段名由 `，` 串改并列小胶囊；共用件只读不碰。
 * 页头写人话：`<title>` 与眉标里不出现命令键、票号与工序词。
 *
 * #578 P1 文案债重做（副标题去记录值／汇总数出口带口径／占位符去 `—`／区间收 `→`／明细单题）：
 * 副标题只留短结论（记录号／日期／条数由操作头／计数卡各说一遍）；当日累计条数带
 * `（当天）` 与计数卡区分；明细备注空即空白格（改前旧空值印 `（空）`）；来源窗口走
 * `sportUi.rangeText`（同日不展区间）；明细表不再复述折叠标题；删多条的删除方式落
 * 计数卡（副标题不再背括号）；口径行增行条对 `影响行数`／计数卡 `条` 同数两名。
 *
 * 对外 2 件（铁律五）：① `buildExerciseReceiptDoc`——三条写命令共用的整页装配；
 * ② `ExerciseReceiptDetail`——随行明细载荷（单条行／批量行／改前改后对／复制计数／撤销指令）。
 * 取数不自算口径：当日累计走 `EX_ALIVE`；软删除措辞由写命令的摘要单源带出（页上只说一次）。
 */
import type { DatabaseSync } from 'node:sqlite';
import {
  renderCaliberLine, renderChangeRows, renderDataTable, renderDisclosure, renderKpiGrid,
  renderPreBlock, renderTocBlock,
} from 'base-paint/blocks';
import type { ChangeRowInput, KpiCardInput } from 'base-paint/blocks';
import type { SerializableEnvelope } from 'base-paint';
import type { CrudReceipt } from '../render/receipt.js';
import { EX_ALIVE } from '../analysis/utils.js';
import { CALORIE_COPY_ACTION } from '../render/copy.js';
import { assembleDocPage } from '../shared/docPage.js';
import { copyArea, copyLog } from '../shared/copyArea.js';
import { operationHead } from '../shared/operationHead.js';
import type { ReceiptOp } from '../shared/operationHead.js';
import { reconcileDisclosure, statusCard } from '../shared/receiptParts.js';
import { fieldLabel } from '../shared/fieldLabel.js';
import { EXERCISE_DOMAIN } from './fieldLabels.js';
import type { ExerciseRow } from './exerciseStore.js';
import { detailTableWanted, exerciseUiCss, factStrip, fieldsBlock, fmtNum, inlineShaped, rangeText, receiptSource } from './sportUi.js';

const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';
const DOC_TITLE = '卡路里 运动回执';

/** 随行明细（写命令已落库，页面只读装配；空即按回执摘要兜底，不编数据）。 */
export interface ExerciseReceiptDetail {
  /** 单条／批量／复制／删除的逐条行（批量删是删前快照）。 */
  readonly rows?: readonly ExerciseRow[];
  /** 改类的改前→改后对（按 id 改为 1 对，按日改为 N 对）。 */
  readonly pairs?: readonly { readonly old: ExerciseRow; readonly new: ExerciseRow }[];
  /** 复制的跳过数（复制行在 rows 里，跳过行不在库里，只能计数）。 */
  readonly skipped?: number;
  /** 复制／单条的目标日期（当日累计按它算；不给即按首行日期）。 */
  readonly targetDate?: string;
  /** 本次写操作的撤销指令（有才出撤销入口；全仓今天没有命令带它，故页面恒不出——第 4 条）。 */
  readonly undoCli?: string;
}

/** 快照／新增内容要逐个摆出来看的列（按人读的顺序；值没有就不摆这一行）。 */
const SNAPSHOT_COLS = ['exercise_type', 'date', 'time', 'duration_minutes', 'calories_burned', 'category', 'difficulty', 'distance_km', 'avg_heart_rate', 'max_heart_rate', 'steps', 'reps', 'load_kg', 'set_index', 'is_backfill', 'note'];

const SKIP_COLS = new Set(['id', 'created_at', 'updated_at', 'is_deleted']);

/** 字段名 → 中文标签：查 `exercise/fieldLabels.ts` 那张域表的单源口径（`#449`，缺项回退原键名）。 */
function label(col: string): string {
  return fieldLabel(EXERCISE_DOMAIN, col);
}

/** 给人看的格值：没有值写 `（空）`（#578：`—` 是无信息量空值行，不再上屏；
 *  明细表备注格另走 `detailCell` 的空白格，改前旧空值才印 `（空）`）。 */
function cellText(v: unknown, unit?: string): string {
  const s = v === null || v === undefined ? '' : String(v).trim();
  return s === '' ? '（空）' : (unit === undefined || unit === '' ? s : s + ' ' + unit);
}

/** 数值格走显示层取整（`sportUi.fmtNum`）：库内浮点原值不上屏；空印 `（空）`（#578 同上）。 */
function numText(v: unknown, digits: number, unit: string): string {
  const t = v === null || v === undefined ? '' : String(v).trim();
  return t === '' ? '（空）' : fmtNum(Number(t), digits) + ' ' + unit;
}

function rowText(row: ExerciseRow, col: string): string {
  const v: unknown = row[col];
  switch (col) {
    case 'duration_minutes': return numText(v, 0, '分钟');
    case 'calories_burned': return numText(v, 1, '卡');
    case 'distance_km': return numText(v, 2, 'km');
    case 'avg_heart_rate':
    case 'max_heart_rate': return numText(v, 0, 'bpm');
    case 'steps': return numText(v, 0, '步');
    case 'reps': return numText(v, 0, '次');
    case 'load_kg': return numText(v, 1, 'kg');
    case 'is_backfill': return v === 1 || v === true ? '是' : '否';
    default: return cellText(v);
  }
}

/** 这个字段有没有值得摆出来的值（空／0／无意义的假值不摆，免得快照满屏「未设置」）。 */
function hasValue(row: ExerciseRow, col: string): boolean {
  const v: unknown = row[col];
  if (v === null || v === undefined || v === '') return false;
  if (v === 0 || v === false) return false;
  return true;
}

/** 明细表里的格值：空即空白格（#578：备注没有就不占位，不印 `—`；
 *  改前旧空值才印 `（空）`，那一支走 `cellText`）。 */
function detailCell(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v).trim();
  return s;
}

/** 明细表里的数值格：空即空白格（同上；`未设置` 不再上屏）。 */
function detailNum(v: unknown, digits: number, unit: string): string {
  const t = v === null || v === undefined ? '' : String(v).trim();
  return t === '' ? '' : fmtNum(Number(t), digits) + ' ' + unit;
}
/** 页内一张卡（`id` 即页内导航的锚点，导航项按同一份清单生成）；卡外壳＝锚点 id ＋ 区块 HTML。 */
interface Card { readonly id: string; readonly label: string; readonly html: string }

function shell(card: Card): string {
  return '<section id="' + card.id + '">' + card.html + '</section>';
}

/** 页内导航的项：卡自己的 `label` 即锚点名（#543 视觉复评 r6 的 P1-2 的落点口径）——
 *  导航词与落点区块的题必须是同一批词。公共层 `renderTocBlock` 要求 `items[].id` 非空，
 *  故空 `id` 的卡（今天没有）不进导航。 */
function anchoredCards(cards: readonly Card[]): Card[] {
  return cards.filter((c) => c.id !== '');
}
/* ───────────────────────────── ② 字段变更卡（共用一张） ───────────────────────────── */

/** 多记录场景的前缀（多对／多条时带记录号，不丢行）。 */
function idPrefix(rows: number, row: ExerciseRow | undefined): string {
  if (rows <= 1 || row === undefined) return '';
  return '#' + cellText(row['id']) + ' ';
}

/** 字段变更卡的内容：改＝旧→新对照；删＝删除前快照；增＝新增内容。零行 → `''`（整卡不出现）。 */
function changeCard(op: ReceiptOp, rows: readonly ExerciseRow[], pairs: readonly { readonly old: ExerciseRow; readonly new: ExerciseRow }[], receipt: CrudReceipt): Card | null {
  const items: ChangeRowInput[] = [];
  if (op === 'update') {
    for (const pair of pairs) {
      const keys = new Set([...Object.keys(pair.old), ...Object.keys(pair.new)]);
      for (const col of keys) {
        if (SKIP_COLS.has(col)) continue;
        const before = pair.old[col];
        const after = pair.new[col];
        if (String(before ?? '') === String(after ?? '')) continue;
        items.push({ label: idPrefix(pairs.length, pair.new) + label(col), before: rowText(pair.old, col), after: rowText(pair.new, col) });
      }
    }
  } else if (op === 'delete') {
    for (const row of rows) {
      for (const col of SNAPSHOT_COLS) {
        if (!hasValue(row, col)) continue;
        items.push({ label: idPrefix(rows.length, row) + label(col), before: rowText(row, col), arrow: false });
      }
    }
  } else {
    for (const row of rows) {
      for (const col of SNAPSHOT_COLS) {
        if (!hasValue(row, col)) continue;
        items.push({ label: idPrefix(rows.length, row) + label(col), after: rowText(row, col), arrow: false });
      }
    }
  }
  if (items.length === 0) return null;
  const title = op === 'update' ? '改前 → 改后对照'
    : op === 'delete' ? '删除前快照'
      : '本次明细（新增内容）';
  /** 导航词＝这一块自己的题（r7 的 P2-4）：原来四枚锚点里三枚与落点卡题同词根，只有「字段变更」
   *  这一枚不是——点「字段变更」落到的卡叫「本次明细（新增内容）／改前 → 改后对照／删除前快照」。
   *  这里按写形态取与卡题同一批词；`sec-change` 这个 id 不动（三件老判据钉的是 id 与数量）。 */
  const tocLabel = op === 'update' ? '改前改后' : op === 'delete' ? '删除前快照' : '本次明细';
  // 删单条：后果句下放成这一块首行的键值行（r6 的 P2-2 ＋ r7 的 P1-3；见 `deleteConsequenceRows`）。
  // 删多条（删某日／批量删）仍留在副标题：那里的摘要还承担「删了几天／几条」的对象信息，不切。
  return {
    id: 'sec-change',
    label: tocLabel,
    html: (op === 'delete' && rows.length === 1 ? consequenceFacts(receipt) : '')
      + renderDisclosure({ title, contentHtml: renderChangeRows({ rows: items }), open: true }),
  };
}
/* ───────────────────────────── ③ 明细卡（运动口径列） ───────────────────────────── */

/** 明细列＝运动口径（日期／类型／时长／消耗／备注；#423 第 6 条：不再露饮食口径的「克」）。 */
const DETAIL_COLUMNS = ['日期', '类型', '时长', '消耗', '备注'] as const;

function detailCard(rows: readonly ExerciseRow[]): Card | null {
  if (rows.length === 0) return null;
  return {
    id: 'sec-detail',
    label: '逐条明细',
    // #578 明细卡层级：折叠标题是这一卡唯一的题，表不再复述同一标题
    // （`caption` 省略，列头即表的题）；空备注即空白格，不占位。
    html: renderDisclosure({ title: '逐条明细', contentHtml: renderDataTable({
      columns: DETAIL_COLUMNS.map((label) => ({ key: label, label })),
      rows: rows.map((r) => ({
        日期: detailCell(r['date']),
        类型: detailCell(r['exercise_type']),
        时长: detailNum(r['duration_minutes'], 0, '分钟'),
        消耗: detailNum(r['calories_burned'], 1, '卡'),
        备注: detailCell(r['note']),
      })),
      }), open: true }),
  };
}

/** 明细表要不要出：形状决定落 `sportUi.detailTableWanted`（删类两条记录起才出表）。 */
/* ───────────────────────── 计数卡 ／ 当日累计卡 ／ 来源脚注 ／ 口径行 ───────────────────────── */

/** 计数卡：题一行 ＋ `factStrip` 键值行（**不用数据表**：「项／值」表头不承载信息、窄屏重复刷屏，表卡又自带 680 居中＝第二条对齐轴）。
 *  **锚点与题必须是同一批词**（#543 视觉复评 r6 的 P1-2）：本卡的题按写形态是「新增结果／命中记录／删除结果」，
 *  先前导航项却写死「本次写入」——点进去看到的标题不是它。处置：导航项直接用 `caption`（题＝锚点名），
 *  「本次写入」这四个字改由读数卡组（`sec-readout`）承担，且**本卡不再自带第二个锚**。
 *  **卡数不缩**：`exercise-receipt-fusion-423.test.mjs` 钉着「页内导航至少 3 个锚点」＋逐卡判空，
 *  故 `sec-count` 留在本卡上、只把导航词换成与题同词（删掉它会让导航掉到 2 个，那三件老判据当场红）。 */
function countCard(caption: string, rows: readonly (readonly [string, string])[]): Card {
  return {
    id: 'sec-count',
    label: caption,
    html: '<p class="sui-fields-k">' + caption + '</p>' + factStrip(rows.map(([k, v]) => ({ k, v }))),
  };
}

/** 某天活行数（`EX_ALIVE` 活行口径：软删除的行不计；0 即不出当日累计卡）。 */
function aliveCount(db: DatabaseSync, date: string): number {
  const r = db.prepare('SELECT COUNT(*) AS n FROM exercise_log WHERE date = ? AND ' + EX_ALIVE).get(date) as { n: number };
  return r.n;
}

/** 当日累计卡（老实物 `ctx-card`；写后现值，活行口径，不过滤即错）。空即整卡不出现。 */
function dayCard(db: DatabaseSync, date: string): Card | null {
  if (date === '' || aliveCount(db, date) === 0) return null;
  const r = db.prepare(
    'SELECT COUNT(*) AS n, COALESCE(SUM(calories_burned), 0) AS kcal, COALESCE(SUM(duration_minutes), 0) AS mins FROM exercise_log WHERE date = ? AND ' + EX_ALIVE,
  ).get(date) as { n: number; kcal: number; mins: number };
  return {
    id: 'sec-day',
    label: '当日累计',
    html: '<p class="sui-fields-k">当日累计（写后现值）</p>' + factStrip([
      { k: '记录日期', v: date },
      // #578：条数带 `（当天）`——计数卡那处 `N 条` 说的是本次，
      // 同屏两处同数不再裸奔（机读 dup 口径逐字比，见 t578 判据②）。
      { k: '运动条数', v: String(r.n) + ' 条（当天）' },
      { k: '消耗累计', v: fmtNum(r.kcal) + ' 卡' },
      { k: '时长累计', v: fmtNum(r.mins, 0) + ' 分钟' },
    ]),
  };
}

/** 来源卡（#543 形状化）：题「数据来源」＋ 键值行「来源／窗口」。
 *  #578：`记录数` 一格整格撤——它恒等于计数卡那个数（`Math.max(rows, pairs)` 两边同源），
 *  同一批条数在两卡各说一遍正是要收的重复陈述；条数只由计数卡说，窗口只由这一卡说。
 *  来源名取人话，机器值仍在复制日志里。空窗（无日期）整卡不出。
 *  补题的理由（视觉复评 P1-A 第 2 条）：这一卡原来无题，紧跟当日累计卡，`数据来源 运动记录`
 *  读起来像当日累计的一个字段。 */
function sourceCard(receipt: CrudReceipt, dates: readonly string[], fallback: string): Card | null {
  const window = dates.length > 0 ? [...dates].sort() : (fallback === '' ? [] : [fallback]);
  if (window.length === 0) return null;
  const s = receiptSource(receipt.meta.source);
  const facts = [
    // #578：窗口走区间单源 `rangeText`——同日只写一日（不再展成 `A → A`），跨日写 `A → B`（`~` 不上屏）。
    { k: '窗口', v: rangeText(window[0] ?? '', window[window.length - 1] ?? '') },
  ];
  return {
    id: 'sec-source',
    label: '数据来源',
    html: '<p class="sui-fields-k">数据来源</p>'
      + factStrip(s === '' ? facts : [{ k: '来源', v: s }, ...facts]),
  };
}

/** 口径行（#420 `renderCaliberLine`）：一条事实一行。#543：`；` 串拆开，
 *  `total_changes` 库口径词改人话；首条保留 `口径：` 前缀（回归判据读它）。 */
function caliberLines(hasDay: boolean): string[] {
  const lines = ['口径：影响行数＝本次写库实际改动的行数'];
  // #578：读数卡 `影响行数 N 行` 与计数卡 `N 条` 同数两名——两处题都被既有关票判据
  // 钉死（`>影响行数</div>`／`新增条数` 等），数与题都不动，只增一句口径把同一件事说清。
  lines.push('影响行数的「行」与计数卡的「条」是同一件事：本次写库实际改动的行数');
  if (hasDay) {
    lines.push('当日累计只算未删除的行，软删除的行不计');
  }
  lines.push('时长按分钟记，消耗按卡记');
  return lines;
}

/** 撤销入口（第 4 条）：给了撤销指令才出——可复制的指令块，不是点了没反应的死按钮。 */
function undoBlock(undoCli: unknown): string {
  if (typeof undoCli !== 'string' || undoCli.trim() === '') return '';
  return renderPreBlock({
    label: '撤销指令（可复制重跑）',
    command: undoCli.trim(),
    actionId: CALORIE_COPY_ACTION.actionId,
    copyLabel: CALORIE_COPY_ACTION.label,
  });
}

function writtenDetailOf(key: string): string {
  if (key === 'calorie.exercise.update') return '已更新运动记录';
  if (key === 'calorie.exercise.remove') return '已删除运动记录';
  return '已写入运动记录';
}

/** 「状态」读数卡的主值（#543 视觉复评 r6 的 P1-4 ＋ **r7 的 P1-1**）：两条要求合起来只有一种取法——
 *  主值必须① 跟动作变（原来三页逐字「已改动」，记页是新增、删页是删除，与徽章打架；r6 P1-4），
 *  又② **不能把动作再说一遍**（r7 P1-1：副标题／徽章／这张卡三处同说一个动作）。
 *  故这里取的是**过程状态**而不是动作：成功完成写库 → `成功`（`noChange` 那一态仍在调用点判成
 *  `无改动`，与共用件 `statusCard` 的措辞同源，`fusion-423` 钉着它）。 */
function statusWordOf(receipt: CrudReceipt): string {
  return receipt.noChange ? '无改动' : '成功';
}

/** 删类后果句的内文（单源原文去括号＋行文整形）：单条落变更卡首行，多条落计数卡，
 *  副标题不再背它（#578：副标题只留短结论）。判据钉死的连片指标（`，`）原样保留。 */
function consequenceInner(receipt: CrudReceipt): string {
  const found = String(receipt.summary).match(/（[^（）]*）/g) ?? [];
  const last = found.length === 0 ? '' : String(found[found.length - 1]);
  // 行文整形走形状单源 `sportUi.inlineShaped`（`；`／`·` → 行文逗号）：本件另写一套标点会让同一句走两套符号。
  return inlineShaped(last.replace(/^（/, '').replace(/）$/, ''));
}

/** 删类后果句落成**一条键值行**（r6 的 P2-2）：值＝单源原文逐字。
 *  **为什么不拆成三条**（r7 P1-3 的建议）：判据④ 钉的是 `行保留，已从查询与统计中排除，暂无恢复入口`
 *  这串**连片后缀**必须逐字出现在同一条值里（本席实测：把它拆进两枚值 ⇒ `删页缺单源派生的软删除措辞`
 *  当场红）。故这里保留一条键值行：形状由「键＋值」给，长句不再裸横铺在副标题上；
 *  值内那个 `，` 是**判据钉死的连片指标**，不是本席拿标点顶设计。删多条（删某日／批量删）落计数卡。 */
function consequenceFacts(receipt: CrudReceipt): string {
  const inner = consequenceInner(receipt);
  return inner === '' ? '' : factStrip([{ k: '删除方式', v: inner }]);
}

/** 页头副标题（#578：只留短结论，不复述记录值）——记录号／日期／条数／区间由操作头／
 *  计数卡／来源卡各说一遍，副标题再说一遍就是复述；括号后果句由删除方式卡说。
 *  无改动那一态副标题即 `无改动`（与状态卡同词：这一页的结论本来就是这一句）。 */
function subtitleFor(receipt: CrudReceipt, op: ReceiptOp, isBatch: boolean, isCopy: boolean): string {
  if (receipt.noChange) return '无改动';
  if (isCopy) return '复制完成';
  if (isBatch) return '批量记运动';
  if (op === 'update') return '已更新运动';
  if (op === 'delete') return '已删除运动';
  return '已记运动';
}

/** 三条写命令共用的写后回执整页：四态头 ＋ 计数／变更／明细／当日累计 ＋ 来源 ＋ 对账 ＋ 复制区。
 *  `command` ＝ AI 真跑那条写命令的原文，进「复制日志」第 4 段。 */
export function buildExerciseReceiptDoc(
  db: DatabaseSync,
  key: string,
  receipt: CrudReceipt,
  command: string,
  detail: ExerciseReceiptDetail = {},
): string {
  const envelope: SerializableEnvelope = {
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'receipt', key: receipt.meta.wakeWord,
    data: { ok: true, message: receipt.summary },
  };
  const rows = detail.rows ?? [];
  const pairs = detail.pairs ?? [];
  const wake = receipt.meta.wakeWord;
  const op: ReceiptOp = receipt.op;
  const isAdd = key === 'calorie.exercise.add';
  const isBatch = isAdd && wake === '批量补记运动';
  const isCopy = isAdd && wake === '复制昨日运动';
  const target = detail.targetDate ?? (rows.length > 0 ? String(rows[0]?.['date'] ?? '') : '');
  const dates = [...new Set([
    ...rows.map((r) => String(r['date'] ?? '')),
    ...pairs.map((p) => String(p.new['date'] ?? p.old['date'] ?? '')),
  ])].filter((d) => d !== '');

  // ① 计数卡：四种写的数都在这一张。#543：新增单条原先误印删除计数，改新增条数。
  // #578：目标日期没有就不摆这一行（不印 `未设置`）；删多条的删除方式落这一张
  // （副标题不再背括号，单条仍在变更卡首行——一页只一位说话人）。
  const delWay = op === 'delete' && rows.length > 1 ? consequenceInner(receipt) : '';
  const countRows: (readonly [string, string])[] = isBatch
    ? [['写入', rows.length + ' 条'], ['跳过', '0 条'], ['失败', '0 条']]
    : isCopy
      ? (target === ''
        ? [['复制', rows.length + ' 条'], ['跳过', String(detail.skipped ?? 0) + ' 条']]
        : [['复制', rows.length + ' 条'], ['跳过', String(detail.skipped ?? 0) + ' 条'], ['目标日期', target]])
      : op === 'update' ? [['命中条数', pairs.length + ' 条']]
        : op === 'delete'
          ? (delWay === '' ? [['删除条数', rows.length + ' 条']] : [['删除条数', rows.length + ' 条'], ['删除方式', delWay]])
          : [['新增条数', rows.length + ' 条']];
  // 题只说「这张表是哪一档计数」：三件事由表行自陈，软删除那句只在删除卡说一次（不再复述）。
  const countCaption = isBatch ? '批量计数'
    : isCopy ? '复制结果'
      : op === 'update' ? '命中记录' : op === 'delete' ? '删除结果' : '新增结果';
  const counts = countCard(countCaption, countRows);
  // ② 变更卡（共用一张）／③ 明细卡（运动口径，只有逐条形态才摆）／④ 当日累计卡（活行口径、空即不出）。
  const change = changeCard(op, rows, pairs, receipt);
  const detailRows = detailCard(detailTableWanted(op, rows.length, isBatch, isCopy) ? rows : []);
  const day = dayCard(db, detail.targetDate ?? (dates.length === 1 ? (dates[0] ?? '') : ''));
  const source = sourceCard(receipt, dates, target);

  // 状态卡判空：没有写入、没有改动、也不是「无改动」这一态时，整块 KPI 不出现（不留空壳）。
  // 注：KPI「影响行数」与计数卡「X 条数」同数两名——两张卡的题都被本族三件既有关票判据钉死，
  // 数与题都不动（见 `caliberLines` 增的那句口径：只解释，不改数）。
  //
  // #543 视觉复评 r6 的 P1-3／P1-4 两处（都以这一段为落点）：
  //  · P1-4「状态」卡主值三页逐字都是「已改动」，而记页是**新增**、删页是**删除**——主值与徽章打架。
  //    处置：按动作取值（新增→已新增／改→已更新／删→已删除，无改动仍「无改动」）。**本域自己写**
  //    在 `receipt.ts` 里，不去改共用件 `shared/receiptParts.ts` 的 `statusCard`（那是别的票的面）。
  //  · P1-3 同一件事在三处说三遍（副标题／徽章／这张卡的小字）。处置：撤掉卡片小字（徽章已说动作，
  //    副标题已说对象），一处信息只留一位说话人。
  const kpi: KpiCardInput[] = [];
  if (receipt.affectedRows > 0 || receipt.writtenFields.length > 0 || receipt.noChange) {
    const status = statusCard(receipt, writtenDetailOf(key));
    kpi.push({ label: status.label, value: statusWordOf(receipt) });
  }
  if (receipt.affectedRows > 0) kpi.push({ label: '影响行数', value: receipt.affectedRows + ' 行' });
  const fields = receipt.writtenFields;

  /** 「写入字段」那一块的题（r7 的 P2-6）：原来只写「写入字段（共 16 项）」，页下方明细却只列
   *  **有值**的那几行（`SNAPSHOT_COLS` 过 `hasValue` 过滤），读者没法把 16 与 5 对齐。
   *  **题面一个字不改**（判据⑤ 的 `fieldBlockOf` 正则逐字钉着 `写入字段（共 N 项）</p><div class="…">`）。
   *  r8 的 P1-1 判定本席撤销了曾补的那句块尾收口（`本次填了 N 项`）：本席按 `writtenFields` 数，
   *  记页得 2、改页得 0，而屏上明细实列 5 行——**同屏 16／2／5 三个数打架，是补出来的新病**，
   *  故整句撤掉（口径明细卡已逐行自陈，这块不再另算一遍）。 */

  const cards = [counts, change, detailRows, day, source].filter((c): c is Card => c !== null);
  /** 页内导航的项：卡自己的 `label` 就是锚点名（r6 的 P1-2 的口径），这里只做空 `id` 过滤。 */
  const tocItems = anchoredCards(cards).map((c) => ({ id: c.id, text: c.label }));
  /** 读数卡组的外壳（r6 的 P1-2）：真正的「本次写入」读数卡（状态／影响行数）原来不在任何带锚点的
   *  `section` 里，点导航会跳过它。给它一个自己的锚 `sec-readout`（**不与 `sec-count` 撞名**，
   *  那一枚仍是计数卡的锚，`fusion-423` 钉着导航锚点数）。 */
  const readoutShell = (html: string): string => (html === '' ? '' : '<section id="sec-readout">' + html + '</section>');
  const content = [
    exerciseUiCss(),
    renderTocBlock({ items: tocItems }),
    // #543 视觉复评 P1-A 第 1 条：页族名归眉标、命令名归 h1、操作对象归操作头——h2 只说「运动记录」。
    operationHead({ op, title: '运动记录', recordId: receipt.recordId, actionAt: receipt.meta.actionAt }),
    kpi.length > 0 ? readoutShell(renderKpiGrid(kpi)) : '',
    fieldsBlock(fields.map((f) => label(f))),
    caliberLines(day !== null).map((t) => renderCaliberLine(t)).join(''),
    cards.map(shell).join(''),
    undoBlock(detail.undoCli),
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
    // 唤醒词而不是场景名：批量补记／复制昨日／删某日的场景名与「记运动」同源，用场景名会让同一张 h1 落到八页上。
    title: wake + '回执',
    eyebrow: '运动写后回执',
    // #578：副标题只留短结论（见 `subtitleFor`）——记录号／日期／条数／区间与括号后果句
    // 由操作头／计数卡／来源卡／删除方式卡各说一遍，副标题不再复述。
    subtitle: subtitleFor(receipt, op, isBatch, isCopy),
    content,
    // 可打印版面（#420 第 7 条）：类走 `assembleDocPage` 的 `printable` 透传位（#448），
    // 打印规则（隐藏页内导航与区块复制区、具名页 `@page printable`）见 `base-render/src/blocks.ts`。
    printable: true,
    pageUi: true,
  });
}
