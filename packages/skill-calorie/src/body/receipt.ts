/** #365 · 身体细节（HELP 一级分组「身体细节」／场景 08）**七条写词的结果型整页**。
 *
 * 本文件是 `cli/write.ts:80` 整页装配链的**第五个装配口**（前四个：档案／饮食／体重／训练计划），
 * 形状照 `workout/receipt.ts` 与 `weight/receipt.ts` 抄——同一份 `assembleDocPage`、同一组
 * `copyArea`／`copyLog`、同一张 `statusCard`，只换内容。接入前七条写词落在共用位
 * `shared/writeParts.ts:83` 的 `receiptHtml()`（只有 `h1`＋一行摘要＋items）。
 *
 * 七条写词 → 四条命令（命令名以 `body/commands.ts` 注册表为准，本件不抄唤醒词）：
 *   记体脂（皮褶钳）／记体脂（外部测量）／补记体脂 → `calorie.body.composition-add`；
 *   记围度／补记围度 → `calorie.body.measure-add`；
 *   删体脂 → `calorie.body.composition-remove`；删围度 → `calorie.body.measure-remove`。
 *
 * 老正本 `templates/crud_receipt.html`（只读参照）逐条落点：
 *   ① **id 卡三态** `:26-29`（`.id-card` 基态／`.delete`／`.update` 三套配色）＋ `:192-197` 三张表
 *      （`:192` `opLabels`／`:193` `opColors`／`:194` `opIcons`）＋ `:201`（`op` → class）＋ `:202-203`
 *      （图标与标题上卡）→ **图标＋文字＋色档三样都由 `receipt.op` 驱动**，三张表的唯一来源是共用件
 *      `shared/operationHead.ts:23-45`（本件不写第二份）；图标按老页 `:31`「摆在 id 卡内」对位到徽章前缀；
 *   ② **diff 三列＋中文标签** `:61-69`（`:64` 旧值＝红删除线、`:65` 新值＝绿）／`:276-291`（标签表）→
 *      走共用件 `renderChangeRows`（箭头 `arrow:false` 仍占位，与老 `:344`／`:365` 同一手法）。
 *      **值槽按操作类型分**——老正本三支要**逐支读**，`:315-322` 那一支是「改」模式、不是全体：
 *      增类 `:351-371`（`:364` 写 `.diff-new`）⇒ 现值落**新值槽**；删类 `:328-350`（`:343` 写
 *      `.diff-old`）⇒ 删前原值落**旧值槽**。落错槽是看得见的错：`.block-change-row-old` 带
 *      `text-decoration: line-through`（`base-render/src/blocks.ts:1333-1336`）⇒ 增类页会把刚写入的现值画成删除线；
 *   ③ **删除前快照** `:328-350`（`:343` 只留旧值、`:344` 箭头 `visibility:hidden` 占位）→
 *      `deleteSnapshotRows()`，数据面由 **#364** 备好（`items[0].detail` ＝ `标签 值` 以「、」分隔）；
 *      「无行不出空卡」的 `:324-327`（改）／`:348-350`（删）由 `renderChangeRows` 对空数组返空串承接。
 *      **一处有意偏离**：老正本 `:337`（删支）／`:360`（增支）对空值是**整行不摆**，本件按基准
 *      `t395-融合基准.md` §四 裁定 2 的可见文本口径**逐格写 `—`**（`cell()`）——空的那格照摆、值写 `—`；
 *   ④ **撤销按钮** `:414-429`（`:420` 撤销指令文本、`:423` 复制提示）→ `undoBlock()`：**只在回执带
 *      撤销指令时出现**（本域写命令不传 ⇒ 真出口产物里连「撤销」二字都没有）；出现时走冻结复制运行时的 toast。
 *
 * 新保留（新有老无）：**M5 自证**（`render/receipt.ts:82-134` 的 `M5Fields`／`buildM5`／`withM5`）→
 *   `m5Disclosure()`：影响行数／影响行数来源／记录号来源／契约版本四样上页（融合基准 §六-C 第 4 行）；
 *   **复制区** → `shared/copyArea.ts:116` 的 `copyArea`（数据位恒出三格式菜单，与老 `:98` 的 `.fmt-menu`
 *   同形；三样全没给时不出按钮，见该件 `:41`）。
 *
 * **裁定 2**（`docs/skills/skill-calorie/t395-融合基准.md` §四）在复制区这一半的落法：
 *   可见文本缺值一律 `—`（`cell()`），**复制数据里缺值不写 `—`**——`payloadMessage()` 只摆
 *   **有值的**项，缺项**整项缺位**（连标签一起省），与 `weight/plateDocs.ts:105`「缺的那一格
 *   不写进载荷」同口径。两条分开断言，不互相顶替。
 *
 * 取数两条路（**页面不改数据面**）：`items[0].detail`（#364 删前快照，只切分、标签不信本件）＋
 *   `compositionSnapshot`／`measurementSnapshot`（#364 按 id 复取口，软删后仍可回读）——页面现值
 *   逐格读自库内，**不回显输入**：手改库里一个字段，页面跟着变。
 * 中文名一律取唯一来源：13 部位 `MEASUREMENT_ZH`、7 点站名 `CALIPER_SITE_LABELS`、来源
 * `SOURCE_LABELS`（＋「日期」「备注」），本件不写第二份名表。
 */
import type { DatabaseSync } from 'node:sqlite';
import {
  renderCaliberLine, renderChangeRows, renderDataTable, renderDisclosure, renderKpiGrid, renderPreBlock,
} from 'base-paint/blocks';
import type { ChangeRowInput, KpiCardInput } from 'base-paint/blocks';
import type { SerializableEnvelope } from 'base-paint';
import type { CrudReceipt, ReceiptItem } from '../render/receipt.js';
import {
  CALIPER_FIELDS, MEASUREMENT_FIELDS, MEASUREMENT_ZH, compositionSnapshot, measureCamelName, measurementSnapshot,
} from '../fetch/body.js';
import { CALIPER_SITE_LABELS } from './bodyPlate.js';
import { SOURCE_LABELS } from '../kcal.js';
import type { SourceChoice } from '../kcal.js';
import { DB_FILENAME } from '../paths.js';
import { assembleDocPage } from '../shared/docPage.js';
import { copyArea, copyLog } from '../shared/copyArea.js';
import { OPERATION_ICONS, OPERATION_LABELS, OPERATION_TONES } from '../shared/operationHead.js';
import { statusCard } from '../shared/receiptParts.js';
import { commandLine } from '../shared/writeParts.js';
import { CALORIE_COPY_ACTION } from '../render/copy.js';

const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';
const DOC_TITLE = '卡路里·身体细节回执';

/** 身体细节 4 条会改数据库的命令（**具名键集**，命令名权威源＝`body/commands.ts`；分派层只调本文件）。 */
const BODY_RECEIPT_KEYS: ReadonlySet<string> = new Set([
  'calorie.body.composition-add',
  'calorie.body.measure-add',
  'calorie.body.composition-remove',
  'calorie.body.measure-remove',
]);

/** 徽章种类（冻结四值；非法值由冻结语义降级 `empty`）。 */
type Kind = 'ok' | 'warn' | 'danger' | 'empty';

/** id 卡三态：老正本 `:192-197` 的标签／色档／图标三张表 ＋ `:201` 的 `op` → class ⇒
 *  **三态由操作类型驱动**。三张表的唯一来源是共用件 `shared/operationHead.ts:23-45`，本件不写第二份
 *  （原先这里自持一份 `{status, text}` 表，`update` 的文字已与唯一来源走散：写「更新」而唯一来源是
 *  「修改」——本域 `update` 恒不命中所以没暴露，仍按唯一来源收口）。 */
const badgeOf = (op: CrudReceipt['op']): { status: Kind; text: string; icon: string } => ({
  status: OPERATION_TONES[op], text: OPERATION_LABELS[op], icon: OPERATION_ICONS[op],
});

/** 非围度／非皮褶列的中文名（`is_deprecated` 照仓内软删口径给中文，不让库内列名直接上屏）。 */
const COL_ZH: Record<string, string> = {
  date: '日期', note: '备注', source: '来源', body_fat_pct: '体脂率', is_deprecated: '删除标志',
};

/** 写入字段摘要里那几个**不进库列**的 CLI 参数名（`bodyFatPct` 写进的是 `body_fat_pct`；
 *  `age`／`sex` 只喂 JP7 换算）——不换中文就会把参数名直接摆上屏。 */
const CLI_ZH: Record<string, string> = { bodyFatPct: '体脂率', age: '年龄', sex: '性别' };

/** 逐字段中文标签（老正本 `:276-291` 那张表的本域等价物）：库列名与 CLI 参数名都收，
 *  一律查唯一来源（13 部位／7 点／来源／日期／备注），未命中回退原键名。 */
function zhLabel(key: string): string {
  const site = CALIPER_FIELDS.indexOf(key);
  if (site >= 0) return CALIPER_SITE_LABELS[site] ?? key;
  const camelCol = MEASUREMENT_FIELDS.find((f) => measureCamelName(f) === key);
  return MEASUREMENT_ZH[key]
    ?? (camelCol === undefined ? undefined : MEASUREMENT_ZH[camelCol])
    ?? COL_ZH[key]
    ?? CLI_ZH[key]
    ?? key;
}

/** 取值列序（＝#364 两条快照口跳过 `id` 之后的列序；本件不假设返回对象的键序）。 */
function colsOf(key: string): readonly string[] {
  return isMeasure(key)
    ? ['date', ...MEASUREMENT_FIELDS, 'note']
    : ['date', 'source', 'body_fat_pct', ...CALIPER_FIELDS, 'note'];
}

const isMeasure = (key: string): boolean => key.includes('measure');

/** 记／补记／删三条路共用的实体词（列表头与页脚来源行用）。 */
const entityOf = (key: string): string => (isMeasure(key) ? '围度' : '体脂');

const TABLE_OF: Record<string, string> = {
  'calorie.body.composition-add': 'body_composition',
  'calorie.body.measure-add': 'body_measurements',
  'calorie.body.composition-remove': 'body_composition',
  'calorie.body.measure-remove': 'body_measurements',
};

/** #364 的按 id 复取口：软删后行仍在 ⇒ 写后与删后都能回读同一行（页面现值与删前快照同源）。 */
function snapshotOf(db: DatabaseSync, key: string, id: number): Record<string, unknown> | null {
  return isMeasure(key) ? measurementSnapshot(db, id) : compositionSnapshot(db, id);
}

/** 可见文本的缺值写法（裁定 2 的可见文本那一半）：`null`／`undefined`／空串一律 `—`。 */
function cell(v: unknown): string {
  return v === null || v === undefined || String(v) === '' ? '—' : String(v);
}

/** 库内原始值是否「有值」（裁定 2 的 payload 那一半：缺项整项缺位，不写 `—`）。 */
const hasValue = (v: unknown): boolean => v !== null && v !== undefined && String(v) !== '';

/** 来源列照老正本与 #364 的删前快照一致地换中文名（`SOURCE_LABELS` 是唯一来源，本件不编词）。 */
function cellOf(col: string, v: unknown): string {
  if (col === 'source') {
    const s = String(v ?? '');
    return SOURCE_LABELS[s as SourceChoice] ?? cell(v);
  }
  return cell(v);
}

/** 值落在哪一槽：`old` ＝ 改前（`renderChangeRows` 画**红删除线**，`base-render/src/blocks.ts:1333-1336`）、
 *  `new` ＝ 改后（同件 `:1344-1348`，正文字重 600）。**由操作类型定，不是由调用点随手定**。 */
type Slot = 'old' | 'new';

/** 一行「标签 ＋ 值」落在指定槽（`arrow:false` 仍占箭位，与老 `:344`／`:365` 同一手法）。 */
const rowIn = (label: string, value: string, slot: Slot): ChangeRowInput => (slot === 'new'
  ? { label, after: value, arrow: false }
  : { label, before: value, arrow: false });

/** 库内那一行的逐格 `[中文标签, 可见文本值]`（`currentRows` 与删前快照**共用同一份取值**，
 *  免得两处各读一次、其中一处读错槽）。 */
function currentCells(db: DatabaseSync, key: string, id: number): Array<[string, string]> {
  const snap = snapshotOf(db, key, id);
  return snap === null ? [] : colsOf(key).map((c) => [zhLabel(c), cellOf(c, snap[c])]);
}

/** **记录现值（逐格读自库内）**——落**新值槽**（老正本增类那一支 `:351-371`，`:364` 把值写进
 *  `.diff-new`）。落旧槽会被 `renderChangeRows` 的 `.block-change-row-old` 画成红删除线，把
 *  「本次刚写入的现值」读成「这些值要被删掉」。
 *  防「回显输入」的那一面：手改库里一个字段，本段跟着变。 */
function currentRows(db: DatabaseSync, key: string, id: number): ChangeRowInput[] {
  return currentCells(db, key, id).map(([label, value]) => rowIn(label, value, 'new'));
}

/** **删除前的原值**（老正本 `:328-350`）：#364 把每条记录逐字段铺成 `标签 值`（项间「、」），
 *  这里只按首个空格切成有序 `[标签, 值]`；标签不信本件、由 #364 的唯一来源给。
 *  **值落旧值槽**（老正本删类那一支 `:343` 写 `.diff-old`）——删除页的删除线正对：被删的就是它。
 *  **值改读库内现值**（软删除不改内容，两者恒等）——删前快照与「现值」是同一行，故只出一段、
 *  不摆两遍；同时页面跟着库走，手改库里一个字段这一段跟着变（不回显命令参数）。 */
function deleteSnapshotRows(
  db: DatabaseSync, key: string, id: number | null, item: ReceiptItem | undefined,
): ChangeRowInput[] {
  const detail = item?.detail ?? '';
  if (detail === '') return [];
  const fromDb = new Map(id === null ? [] : currentCells(db, key, id));
  return detail.split('、').map((seg) => {
    const at = seg.indexOf(' ');
    if (at < 0) return rowIn(seg, '—', 'old');
    const label = seg.slice(0, at);
    return rowIn(label, fromDb.get(label) ?? seg.slice(at + 1), 'old');
  });
}

/** 同日已有记录（#363 的补记口径）：`items` 里**除本次写入那条以外**的行，逐行按 id 复取库内现值。 */
const otherItems = (receipt: CrudReceipt): ReceiptItem[] =>
  receipt.items.filter((it) => it.id !== receipt.recordId);

/** 复制数据的正文（**裁定 2**）：只摆有值的项，缺项整项缺位 ⇒ 载荷里不含 `—`。 */
function payloadLines(db: DatabaseSync, key: string, id: number): string[] {
  const snap = snapshotOf(db, key, id);
  if (snap === null) return [];
  return colsOf(key)
    .filter((c) => hasValue(snap[c]))
    .map((c) => zhLabel(c) + ' ' + (c === 'source' ? cellOf(c, snap[c]) : String(snap[c])));
}

/** 复制数据那句头（本件自己拼，**不取 `receipt.summary`**——那是一句人类话，含 **#363** 的
 *  冲突段与 `—` 占位，进载荷会违反裁定 2）。 */
function payloadMessage(db: DatabaseSync, key: string, receipt: CrudReceipt): string {
  const id = receipt.recordId;
  const head = '本次' + OPERATION_LABELS[receipt.op] + entityOf(key) + '记录'
    + (id === null ? '' : ' #' + id);
  return [head, ...(id === null ? [] : payloadLines(db, key, id))].join(' ｜ ');
}

/** M5 自证折叠区（`render/receipt.ts:82-134` 的七个字段里**读者核对得到的四样**＋写入时间）。 */
function m5Disclosure(receipt: CrudReceipt): string {
  return renderDisclosure({
    title: '对账信息',
    contentHtml: renderDataTable({
      columns: [{ key: 'k', label: '项' }, { key: 'v', label: '值' }],
      rows: [
        { k: '影响行数', v: receipt.affectedRows + ' 行' },
        { k: '影响行数来源', v: receipt.affectedRowsSource },
        { k: '记录号来源', v: receipt.idSource },
        { k: '回执契约版本', v: 'v' + receipt.m5Contract },
        { k: '写入时间', v: receipt.meta.actionAt },
      ],
    }),
  });
}

/** 撤销入口（老正本 `:414-429`）：**给了撤销指令才出**——可复制的指令块，不是点了没反应的
 *  死按钮（复制成功／失败的提示由页面运行时 `buildSharedHelpersJs` 自带，本件不产第二条通道）。
 *  本域四条写命令今天都不传撤销指令，故这条分支在真出口上恒不命中。 */
function undoBlock(undoCli: unknown): string {
  if (typeof undoCli !== 'string' || undoCli.trim() === '') return '';
  return renderPreBlock({
    label: '撤销指令（可复制重跑）',
    command: undoCli.trim(),
    actionId: CALORIE_COPY_ACTION.actionId,
    copyLabel: CALORIE_COPY_ACTION.label,
  });
}

/** 回执上的撤销指令（本域写命令不传 ⇒ 恒缺席；照 `exercise/receipt.ts:54` 的可选位口径读）。 */
function undoCliOf(receipt: CrudReceipt): unknown {
  return (receipt as unknown as Record<string, unknown>)['undoCli'];
}

/** 状态卡副说明那一句「接下来怎么办」（按命令取，一处定义）。删类两条照仓内**软删除口径**说全
 *  （行保留、已从查询与统计排除、暂无恢复入口），措辞取共用位 `shared/writeParts.ts:19` 的同款。 */
function writtenDetailOf(key: string): string {
  if (key === 'calorie.body.composition-remove' || key === 'calorie.body.measure-remove') {
    return '已从查询与统计中排除，行仍在库里（软删除：暂无恢复入口）';
  }
  return key === 'calorie.body.composition-add'
    ? '已存入体脂记录，可照「看体脂趋势」复查'
    : '已存入围度记录，可照「看围度趋势」复查';
}

/** 一条既有记录的现值块（同日已有记录／补记冲突时出；没有那一条就整块不出现）。 */
function existingBlock(db: DatabaseSync, key: string, item: ReceiptItem): string {
  const id = typeof item.id === 'number' ? item.id : -1;
  return renderCaliberLine('同日已有记录 #' + id + '（' + cell(item.date) + '）：')
    + renderChangeRows({ rows: currentRows(db, key, id) });
}

/** 七条写词共用的写后回执整页。`command` ＝ AI 真跑那条写命令的原文，进「复制日志」第 4 段。 */
function buildBodyReceiptDoc(
  db: DatabaseSync, key: string, receipt: CrudReceipt, command: string,
): string {
  const id = receipt.recordId;
  const badge = badgeOf(receipt.op);
  // id 卡三态：共用件 `statusCard` 出状态那两槽，三态**图标＋文字＋色档**由 `op` 补
  // （老 `:26-29` 三套配色 ＋ `:192-197`／`:201-203`）。图标按老页对位摆在 id 卡内（`:31`）——
  // 本页 id 卡是 KPI 卡，卡内唯一由 `op` 驱动的槽就是徽章，故图标取徽章文字前缀（仓内同法：
  // `diet/nutritionPortDocs.ts:67` 的 `badge: '✓ 均衡'`）。`update` 在本域四条写命令里走不到。
  const idCard: KpiCardInput = {
    ...statusCard(receipt, writtenDetailOf(key)),
    status: badge.status,
    statusText: badge.icon + ' ' + badge.text,
  };
  const existing = otherItems(receipt);
  const envelope: SerializableEnvelope = {
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'receipt', key: receipt.meta.wakeWord,
    data: { ok: true, message: payloadMessage(db, key, receipt) },
  };
  const content = [
    renderKpiGrid([
      idCard,
      {
        label: '记录编号', value: id === null ? '—' : '#' + id,
        detail: '本次操作的记录就是这一条（来源：' + (TABLE_OF[key] ?? '—') + '）',
      },
      { label: '影响行数', value: receipt.affectedRows + ' 行', detail: '本次写入的行数' },
      {
        label: '写入字段', value: receipt.writtenFields.length + ' 项',
        detail: receipt.writtenFields.map((f) => zhLabel(f)).join('、') || '未设置',
      },
    ]),
    // 删类出「删除前的原值」（老 `:328-350`），记／补记类出「记录现值」；两段都**逐格读自库内**，
    // 缺值可见文本写 `—`；`renderChangeRows` 对空数组返空串 ⇒ 无行即不出空卡（老 `:325-327`／`:348-350`）。
    ...(receipt.op === 'delete'
      ? [
        renderCaliberLine('删除前的原值（逐格读自库内 ' + (TABLE_OF[key] ?? '—') + '；软删除：行保留）：'),
        renderChangeRows({ rows: deleteSnapshotRows(db, key, id, receipt.items[0]) }),
      ]
      : [
        renderCaliberLine('记录现值（逐格读自库内 ' + (TABLE_OF[key] ?? '—') + '）：'),
        renderChangeRows({ rows: id === null ? [] : currentRows(db, key, id) }),
      ]),
    ...existing.map((it) => existingBlock(db, key, it)),
    m5Disclosure(receipt),
    undoBlock(undoCliOf(receipt)),
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
    renderCaliberLine('📊 数据来源：身体细节（' + DB_FILENAME + ' · ' + (TABLE_OF[key] ?? '') + '） ｜ '
      + '单位：皮褶 mm、围度 cm、体脂率 %；可见文本缺值写 `—`，复制数据里缺项整项缺位'),
  ].join('');
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: receipt.scene + ' · 回执',
    eyebrow: '身体细节 · 写后回执',
    subtitle: receipt.summary,
    content,
  });
}

/** 身体细节 4 条会改数据库的命令的整页回执端口（分派层只调本函数；其余键返 null 原样放行）。 */
export function bodyReceiptDoc(
  key: string, params: Record<string, unknown>, receipt: CrudReceipt, db: DatabaseSync,
): string | null {
  if (!BODY_RECEIPT_KEYS.has(key)) return null;
  return buildBodyReceiptDoc(db, key, receipt, commandLine(key, params));
}
