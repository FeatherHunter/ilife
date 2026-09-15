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
  renderCaliberLine, renderChangeRows, renderConclusionBar, renderDataTable, renderDisclosure,
  renderKpiGrid, renderPreBlock,
} from 'base-paint/blocks';
import type { ChangeRowInput, KpiCardInput } from 'base-paint/blocks';
import type { SerializableEnvelope } from 'base-paint';
import type { CrudReceipt, ReceiptItem } from '../render/receipt.js';
import { MEASUREMENT_FIELDS, MEASUREMENT_ZH } from '../fetch/body.js';
import { CALIPER_SITE_LABELS } from './bodyPlate.js';
import { JP7_METHOD } from './log.js';
import { assembleDocPage } from '../shared/docPage.js';
import { copyArea, copyLog, notice } from '../shared/copyArea.js';
import { OPERATION_ICONS, OPERATION_LABELS, OPERATION_TONES } from '../shared/operationHead.js';
import { commandLine } from '../shared/writeParts.js';
import { CALORIE_COPY_ACTION } from '../render/copy.js';
import { bodyReceiptCss, groupHead, labeledChips } from './receiptUi.js';
import {
  cell, currentRows, deleteSnapshotRows, entityOf, hasValue, isMeasure, otherItems, payloadMessage,
  snapshotOf, zhLabel,
} from './receiptData.js';

const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';

/** 页签名（七页同值，由编排者裁定）：**空格分层、不带任何符号**——`·` 是设计债
 *  （`scripts/audit-separators.mjs` 的 R1），同仓已交付先例是 `卡路里 身材照片`。
 *  页与页的分家靠页内主标题与眉标，不靠页签。 */
const DOC_TITLE = '卡路里 身体细节';

/** 归属词（眉标，**一页一处**）：说清这是哪一族，不再在同一页里说三遍。 */
const EYEBROW = '身体细节';

/** 身体细节 4 条会改数据库的命令（**具名键集**，命令名权威源＝`body/commands.ts`；分派层只调本文件）。 */
const BODY_RECEIPT_KEYS: ReadonlySet<string> = new Set([
  'calorie.body.composition-add',
  'calorie.body.measure-add',
  'calorie.body.composition-remove',
  'calorie.body.measure-remove',
]);

/** 「这一条是不是补记」的判据（编排者 2026-09-15 裁定）：分派层只把命令名与参数交给本件，
 *  `meta.wakeWord` 恒是命令面的两个字，唤醒词进不来——所以**由记录本身判**：
 *  **落库日期早于这一条回执的写入日**就是补记。判据是日期比较，不是猜的；当天写的那几条与
 *  补记那几条由此在页名与判语上自然分家（不动路由、不动冻结的词名与示例）。 */
const writtenOn = (receipt: CrudReceipt): string => receipt.meta.actionAt.slice(0, 10);

function isBackfill(receipt: CrudReceipt, row: Record<string, unknown> | null): boolean {
  if (row === null || receipt.op === 'delete') return false;
  const date = String(row['date'] ?? '');
  return date !== '' && date < writtenOn(receipt);
}

/** 这一页叫什么：由**记录本身**推（见上）。体脂按来源分两条路：皮褶钳来源是按 7 点换算来的，
 *  其余来源是外部量来的读数。七条唤醒词由此各自落到一个页名上。 */
function pageNameOf(key: string, op: CrudReceipt['op'], source: unknown, backfill: boolean): string {
  if (isMeasure(key)) return op === 'delete' ? '删围度' : (backfill ? '补记围度' : '记围度');
  if (op === 'delete') return '删体脂';
  if (backfill) return '补记体脂';
  return source === 'home_caliper' ? '记体脂（皮褶钳）' : '记体脂（外部测量）';
}

/** 逐格段里插组头（「躯干」「左右成对」「皮褶读数」这类）——一长串裸数字按部位分家。
 *  **组头只插在行与行之间**：行序一位不动（逐格比对是顺序敏感的，三条写词测试钉的就是这个序）。
 *  每行还包一层**档位**（见 `rowClass`）：身份字段抬到组外，部位读数留在组内。 */
function groupedRows(
  key: string, rows: readonly ChangeRowInput[], heads: Readonly<Record<string, string>>,
): string {
  return rows.map((r) => (heads[r.label] === undefined ? '' : groupHead(heads[r.label]))
    + '<div class="' + rowClass(r.label) + '">'
    + renderChangeRows({ rows: [r] }) + '</div>').join('');
}

/** 组头表（按家族取；键是**已有的中文标签**，不是库列名——组头只挑行，不改行的名字）。 */
const GROUP_HEADS: Readonly<Record<'caliper' | 'measure', Readonly<Record<string, string>>>> = {
  caliper: { 胸: '皮褶读数（毫米）' },
  measure: { 胸围: '躯干（厘米）', 左大腿: '左右成对（厘米）' },
};

/** 身份字段（不是部位读数）：它们落在所有组之外，整行抬开一档（`.brc-meta`）。 */
const META_LABELS: ReadonlySet<string> = new Set(['日期', '来源', '体脂率', '备注']);

/** 逐格行落在哪一档：身份字段走 `.brc-meta`（组外），部位读数不带单位——
 *  **单位只留组头一处**（编排者视觉复核：组头已写「（厘米）」，行里再写就成同事实两处说，
 *  且行里那根单位前的短横读起来像负号）。 */
function rowClass(label: string): string {
  return META_LABELS.has(label) ? 'brc-none brc-meta' : 'brc-none';
}

/** **只留有值的行**（缺值的整行不摆，见编排者视觉裁定第 1 条）——「没记」这件事由段下那一句
 *  计数说清，不让十几行 `—` 把两张表撑成一堵墙。删类**不过这道筛**：删除回执要摆的是
 *  「这条记录里原来有什么」，缺的格子也是它的一部分（`t364` 的逐格同源契约钉的就是这一条）。 */
const filledOnly = (rows: readonly ChangeRowInput[]): ChangeRowInput[] =>
  rows.filter((r) => (r.after ?? r.before) !== '—');

/** 「对账信息」折叠区（`render/receipt.ts:82-134` 的七个字段里**读者核对得到的几样**）。
 *
 *  #537 三处收口：① `影响行数来源`（值恒是内部计数器 `sqlite:total_changes`）与 `记录号来源`
 *  （值恒是内部枚举 `record`）两行整行撤——它们说的是代码怎么取数，读者核不了；
 *  ② 「回执契约版本」改「回执格式」（`契约` 是仓内词）；③ 「这次写进去的字段」由卡片明细
 *  里一整行 `、` 串改成**徽章列**（形状住 `receiptUi.ts`）——它是对账信息，与页面上那段
 *  逐格快照（值）分工：这里回答**命令写了哪些字段**，快照回答**这条记录现在是什么值**。
 *  字段名一律经 `zhLabel` 取唯一来源的中文名（库列名与 CLI 参数名都不上屏）。 */
function m5Disclosure(receipt: CrudReceipt, withFields: boolean): string {
  const fields = withFields
    ? labeledChips('这次写进去的', receipt.writtenFields.map((f) => zhLabel(f)))
    : '';
  return renderDisclosure({
    title: '对账信息',
    contentHtml: fields + renderDataTable({
      columns: [{ key: 'k', label: '项' }, { key: 'v', label: '值' }],
      rows: [
        { k: '影响行数', v: receipt.affectedRows + ' 行' },
        { k: '回执格式', v: 'v' + receipt.m5Contract },
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

/** 删类那句「接下来怎么办」：照仓内**软删除**口径说全（行保留、已从查询与统计排除、暂无恢复
 *  入口），但**不摆「软删除」这个仓内叫法**——读者话是「行还留在库里」。
 *  #537：这句原先与结论条／状态卡各说一遍（同一事实三处说），现在**只跟结论条一处走**
 *  （记／补记页按命令指下一步复查入口，删类页出在警示块的详情行里）。 */
const DELETE_NOTE = '行还留在库里，查询和统计里不再出现它，暂时没有恢复入口。';

/** 记／补记类结论句尾巴：这条记录以后去哪儿复查（两条唤醒词各指各的）。 */
const nextStepOf = (key: string): string =>
  (isMeasure(key) ? '可照「看围度趋势」复查' : '可照「看体脂趋势」复查');

/** **结论那一句**（一页只有这一处说「写成功／已删除」）。
 *
 *  值取自库内那一行（不回显命令参数：手改库里一个字段，这一句跟着变）。换算只说方法
 *  （`按 Jackson-Pollock 7 点法换算`），**系数与「7 点合计 82mm ＋ 年龄 30 ＋ 男」整段不上屏**。 */
function conclusionOf(
  key: string, receipt: CrudReceipt, row: Record<string, unknown> | null, backfill: boolean,
): string {
  if (receipt.noChange === true) return '这次没有改动任何东西。';
  const date = row === null ? '—' : cell(row['date']);
  if (receipt.op === 'delete') return date + ' 的这条' + entityOf(key) + '记录已经删掉。';
  const done = (backfill ? '已补记 ' : '已记下 ') + date + ' 的' + entityOf(key) + '记录';
  if (isMeasure(key)) return done + '，' + nextStepOf(key) + '。';
  const byCaliper = row !== null && row['source'] === 'home_caliper';
  return done + (byCaliper ? '，按 ' + JP7_METHOD + '换算' : '') + '，' + nextStepOf(key) + '。';
}

/** 一张读数卡：值缺省写 `—`，缺值时**连单位一起省**（不留 `—%` 这种半截写法）。 */
function numCard(label: string, raw: unknown, unit: string): KpiCardInput {
  const v = cell(raw);
  return v === '—' ? { label, value: v } : { label, value: v, unit };
}

/** 读卡上那枚操作徽章：**图标＋文字＋色档三样都由 `op` 驱动**（老正本 `:192-197` 的标签／色档／
 *  图标三张表 ＋ `:201` 的 `op` → class）。三张表的唯一来源是共用件 `shared/operationHead.ts:23-45`，
 *  本件不写第二份。它说的是**这次是什么操作**（新增／删除），与结论条那句**结果**分工不同——
 *  「写成功」这件事一页只在结论条（删类在警示块）说一处。 */
const opBadge = (op: CrudReceipt['op'], backfill: boolean): Pick<KpiCardInput, 'status' | 'statusText'> => ({
  // #539 收口：补记页顶「✓ 新增」语义矛盾（终审指控成立）——落库日期早于今天即补记（J6 同规则），
  // 徽章改「补记」，图标色档沿用共享表（只换标签字，不动共享件）。
  status: OPERATION_TONES[op],
  statusText: OPERATION_ICONS[op] + ' ' + (backfill && op !== 'delete' ? '补记' : OPERATION_LABELS[op]),
});

/** 读数卡两张（**主角数字 ＋ 日期**）：体脂族给体脂率，围度族给这条记录里量到的部位数。
 *  影响行数与「这次写进去的字段」进页尾对账区；记录编号是内部主键，整张撤（#537）。 */
function kpiCards(key: string, receipt: CrudReceipt, row: Record<string, unknown> | null, backfill: boolean): KpiCardInput[] {
  const at = (c: string): unknown => (row === null ? undefined : row[c]);
  const date: KpiCardInput = { label: '日期', value: cell(at('date')) };
  const head: KpiCardInput = isMeasure(key)
    ? {
      label: receipt.op === 'delete' ? '删掉的部位' : '量到的部位',
      value: String(MEASUREMENT_FIELDS.filter((f) => hasValue(at(f))).length), unit: '个',
    }
    : numCard('体脂率', at('body_fat_pct'), '%');
  return [{ ...head, ...opBadge(receipt.op, backfill) }, date];
}

/** 一条既有记录的现值块（同日已有记录／补记冲突时出；没有那一条就整块不出现）。
 *  #537：口径行里的记录主键 `#5` 撤掉——「同一天还记过这条」说的是事实，主键不是读者的话。
 *  整块包一层 `.brc-alt`（浅底＋描边），与上面「这次记下的」那张**一眼分得开**；
 *  同样只摆有值的行（缺项不占位）。 */
function existingBlock(db: DatabaseSync, key: string, item: ReceiptItem): string {
  const id = typeof item.id === 'number' ? item.id : -1;
  const rows = filledOnly(currentRows(db, key, id));
  return '<div class="brc-alt">' + renderCaliberLine('同一天还记过这条')
    + groupedRows(key, rows, GROUP_HEADS[isMeasure(key) ? 'measure' : 'caliper']) + '</div>';
}

/** 七条写词共用的写后回执整页。`command` ＝ AI 真跑那条写命令的原文，进「复制日志」第 4 段。 */
function buildBodyReceiptDoc(
  db: DatabaseSync, key: string, receipt: CrudReceipt, command: string,
): string {
  const id = receipt.recordId;
  const isDel = receipt.op === 'delete';
  const row = id === null ? null : snapshotOf(db, key, id);
  const backfill = isBackfill(receipt, row);
  const heads = GROUP_HEADS[isMeasure(key) ? 'measure' : 'caliper'];
  // 逐格段的题目：**口径一句话说清单位与范围**（原先括号里印的是库表名与「读自库内」的实现细节，
  // 而数值一律裸摆、没有单位）。段名本身是三条写词测试的锚点，逐字不动。
  const allRows = isDel
    ? deleteSnapshotRows(db, key, id, receipt.items[0])
    : (id === null ? [] : currentRows(db, key, id));
  // 记／补记类**只摆有值的行**（缺值的整行不占位）；缺了几项由段下那一句计数说清。
  const snapRows = isDel ? allRows : filledOnly(allRows);
  const leftOut = allRows.length - snapRows.length;
  const existing = otherItems(receipt);
  const envelope: SerializableEnvelope = {
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'receipt', key: receipt.meta.wakeWord,
    data: { ok: true, message: payloadMessage(db, key, receipt) },
  };
  const content = [
    bodyReceiptCss(),
    // ① 结论：**一页只在这一处说「写成功／已补记／已删除」**（原先是结论条／状态卡／表各说一遍）。
    //    删类走警示块（浅色静态提示），记／补记类走结论条。
    isDel
      ? notice({ icon: 'warn', msg: conclusionOf(key, receipt, row, backfill), detail: DELETE_NOTE })
      : renderConclusionBar(conclusionOf(key, receipt, row, backfill)),
    // ② 主角读数卡（原先四张：状态／记录编号／影响行数／写入字段——后两张进页尾对账区，
    //    记录编号是内部主键、整张撤）。
    renderKpiGrid(kpiCards(key, receipt, row, backfill)),
    // ③ 逐格快照（删类＝删除前的原值，记／补记类＝记录现值）：两段都**逐格读自库内**，
    //    缺值可见文本写 `—`；行序与列序一位不动（那是三条写词测试钉住的契约），只在行与行之间
    //    插组头，让裸数字按部位分家（编排者视觉裁定第 3 条）。
    snapRows.length === 0
      ? ''
      : '<div class="brc-now">'
        + renderCaliberLine((isDel ? '删除前的原值：' : '这次记下的：'))
        + groupedRows(key, snapRows, heads)
        + (leftOut === 0 ? '' : renderCaliberLine('另有 ' + leftOut + ' 项这次没记，就没摆上来'))
        + '</div>',
    ...existing.map((it) => existingBlock(db, key, it)),
    m5Disclosure(receipt, !isDel),
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
    // ④ 口径两行：原先是一条 `；`-串（还夹着库文件名与库表名、两个反引号），现在一条一件事，
    //    段内分隔用 `renderCaliberLine` 自带的 `｜` 段位（它把每段摊成独立节点，不落可见文本）。
    renderCaliberLine('数据来源：身体细节 ｜ 单位：皮褶读毫米 ｜ 围度读厘米 ｜ 体脂率读百分比'),
    renderCaliberLine('表里没记到的格子写 — ｜ 复制出去的数据里，没值的项整项不出现'),
  ].join('');
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: pageNameOf(key, receipt.op, row === null ? undefined : row['source'], backfill),
    eyebrow: EYEBROW,
    subtitle: null,
    content,
    pageUi: true,
  });
}

/** 身体细节 4 条会改数据库的命令的整页回执端口（分派层只调本函数；其余键返 null 原样放行）。 */
export function bodyReceiptDoc(
  key: string, params: Record<string, unknown>, receipt: CrudReceipt, db: DatabaseSync,
): string | null {
  if (!BODY_RECEIPT_KEYS.has(key)) return null;
  return buildBodyReceiptDoc(db, key, receipt, commandLine(key, params));
}
