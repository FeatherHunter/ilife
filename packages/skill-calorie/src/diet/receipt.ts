/** 饮食（HELP 场景 02「饮食」）· 写后回执页装配（#269 骨架）。
 *
 * 13 条会改数据库的命令按命令名认领整页回执；其余命令一律返回 null（调用方原样放行）。
 * 必须在 `withM5` 之后调用：新页要印 `affectedRows`／`writtenFields`／`m5Line`。
 * 命令原文与库与回执一起交给装配页（复制日志第 4 段与写后累计计算用）。
 *
 * 形状照抄场景 07 `src/profile/setup.ts` 的 `buildProfileSettingReceiptDoc` 与
 * `src/profile/update.ts` 的 `buildProfileUpdateReceiptDoc`（同一份 `assembleDocPage`、
 * 同一组 `copyArea`／`copyLog`、同一对 `statusCard`／`reconcileDisclosure`），只换内容：
 * 饮食回执摆“今日累计”（`fetch/diet.ts` 的 `getDailySummary` 现值）与改动字段／对照，
 * 不摆档案字段。老实物 `crud_receipt.html` 的四块（操作回执／字段变更／今日累计／复制明细）
 * 在本页的落点见各段注释；字段级逐字对齐是 #270 的事，本票只立骨架。
 */
import type { DatabaseSync } from 'node:sqlite';
import { renderCaliberLine, renderDataTable, renderKpiGrid } from 'base-paint/blocks';
import type { SerializableEnvelope } from 'base-paint';
import type { CrudReceipt } from '../render/receipt.js';
import { getDailySummary } from '../fetch/diet.js';
import { todayISO } from '../analysis/utils.js';
import { assembleDocPage } from '../shared/docPage.js';
import { copyArea, copyLog } from '../shared/copyArea.js';
import { fieldLabel } from '../shared/fieldLabel.js';
import { DIET_DOMAIN } from './fieldLabels.js';
import { reconcileDisclosure, statusCard } from '../shared/receiptParts.js';
import { commandLine } from '../shared/writeParts.js';

const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';
const DOC_TITLE = '卡路里·饮食回执';

/** 饮食 13 条会改数据库的命令（数据位，具名键集；分派层只调本文件，不再写命令名字面量比较）。
 *
 *  #496 · 补一条 `calorie.product.import`（批量导入食品）：它不在册时走的是老 `receiptHtml`
 *  回退面（`shared/writeParts.ts:83` 的 `<div>op=create · id=N</div>`），实测产物里既没有页壳
 *  也没有复制区——`.scratch/t155o/text-review-P0.md` 第 9 条点的 `op=create` 就是这一页。
 *  接上之后它和其余 13 条同形：页壳＋读数卡＋今日累计＋改动＋对账＋三格式复制区。
 *  （批量导入的**专用预检页**是 #277 的事，本票只把它接到已有的饮食回执面上，不新造版式。） */
const DIET_RECEIPT_KEYS: ReadonlySet<string> = new Set([
  'calorie.diet.add',
  'calorie.diet.batch',
  'calorie.diet.copy',
  'calorie.diet.remove',
  'calorie.diet.remove-by-date',
  'calorie.diet.remove-by-range',
  'calorie.diet.remove-by-type',
  'calorie.diet.update',
  'calorie.diet.update-by-date',
  'calorie.product.add',
  'calorie.product.import',
  'calorie.product.update',
  'calorie.product.deprecate',
  'calorie.water.log',
]);

/** 食品库相关键走食品库措辞，其余走饮食记录措辞（`statusCard` 的必填参数，不给默认值）。 */
const PRODUCT_KEYS: ReadonlySet<string> = new Set([
  'calorie.product.add',
  'calorie.product.import',
  'calorie.product.update',
  'calorie.product.deprecate',
]);

function writtenDetailOf(key: string, op: CrudReceipt['op']): string {
  /* #496 · 这句说明原按**键**取（饮食键一律「已写入饮食记录」），于是删类／改类页的「状态」卡
     读到「已改动 ／ 已写入饮食记录」——在删除页上读作「又写了一条」，与事实相反（审查件第
     34、36、38、40 条，12 页）。改成按**本次操作**（回执自带的 `op`）取：删类说删了、改类说改了，
     只有新增类才说写入。`op=update` 的下架键另按事实说「下架」（它是软删，不是写入新行）。 */
  if (key === 'calorie.product.deprecate') return '已从食品库下架';
  if (PRODUCT_KEYS.has(key)) return '已写入食品库';
  if (key === 'calorie.water.log') return op === 'delete' ? '已从饮水记录中删除' : '已写入饮水记录';
  if (op === 'delete') return '已从饮食记录中删除';
  if (op === 'update') return '已更新饮食记录';
  return '已写入饮食记录';
}

/** 本次影响的日期（累计按它算）：参数里有哪天就按哪天，都没有即今天。 */
function receiptDate(params: Record<string, unknown>): string {
  const pick = (name: string): string | null => {
    const v = params[name];
    return typeof v === 'string' && v !== '' ? v : null;
  };
  return pick('date') ?? pick('from') ?? pick('fromDate') ?? pick('to') ?? pick('toDate')
    ?? pick('start') ?? pick('end') ?? todayISO();
}

/** 老实物 `ctx-card`（今日累计）：写后现值，不自算口径（`getDailySummary` 正本）。
 *
 *  #496 · 表下那句口径改人话：原句「写后累计（`getDailySummary` 现值；目标对照是 #270 的事）」
 *  把源码函数名与内部工单号一起印给用户看（`.scratch/t155o/text-review-P0.md` 第 1、24、30 条，
 *  四份审查件共 14 席命中）。现在只留一句读者能用的：这张是刚写完的临时统计，还没跟目标比。
 *  与热量目标对照那一块是 **#270** 的地盘，本票不代做。 */
function dailyTable(db: DatabaseSync, date: string): string {
  const s = getDailySummary(db, date);
  return renderDataTable({
    columns: [{ key: 'k', label: '项' }, { key: 'v', label: '值' }],
    rows: [
      { k: '日期', v: s.date },
      { k: '热量累计', v: String(s.totals.cal) + ' 卡' },
      { k: '蛋白累计', v: String(s.totals.pro) + ' g' },
      { k: '碳水累计', v: String(s.totals.carbs) + ' g' },
      { k: '脂肪累计', v: String(s.totals.fat) + ' g' },
      { k: '饮食条数', v: String(s.entryCount) + ' 条' },
      { k: '饮水累计', v: String(s.waterMl) + ' ml' },
    ],
    caption: '今日累计',
  }) + renderCaliberLine('临时统计，尚未与你的目标做对比。');
}

/** 回执行状态串 → 用户读得懂的「本次结果」：删类说删了、其余说改了。
 *  **只改上屏这一处**：`receipt.items[].status` 的值是写链三源共用的机器面（`#97` M5 冻结，
 *  各域回执测试逐字钉着它），一个字不动。 */
function statusText(status: string): string {
  if (status.includes('删除')) return '本次已删除';
  if (status.includes('下架')) return '本次已下架';
  return status === '成功' ? '本次已改' : status;
}

/** 老实物 `diff-card`／`items-card` 的骨架位：回执带对照即摆对照，否则只摆写入字段。
 *
 *  #496 · 两处内部说法改人话（审查件第 18、34/36/38/40 条）：标题里的括号原本在给读者解释
 *  「回执没带对照时这张表是空的」这条程序分支；表头「字段｜改动」与表体（状态串＋原因）也对不上。
 *  现在标题只写「本次改动」，空表由 `emptyText` 自己说，表头改「字段｜本次结果」，状态串过 `statusText`。 */
function itemsTable(receipt: CrudReceipt): string {
  const rows = receipt.items
    .filter((it) => (it.status ?? '') !== '')
    .map((it) => ({
      field: statusText(it.status),
      change: [it.reason ?? '', it.detail ?? ''].filter((p) => p !== '').join(' · ') || '—',
    }));
  return renderDataTable({
    columns: [{ key: 'field', label: '字段' }, { key: 'change', label: '本次结果' }],
    rows,
    caption: '本次改动',
    emptyText: '本次回执未带逐字段对照（写入字段：'
      + (receipt.writtenFields.map(fieldLabelOf).join('、') || '未设置') + '）',
  });
}

/** 字段键 → 中文标签（走 `./fieldLabels.ts` 那张域表；缺项回退原键名，不编词）。 */
function fieldLabelOf(key: string): string {
  return fieldLabel(DIET_DOMAIN, key);
}

/** 批量补记那张读数卡的取数：从本域 `writeDietBatch`（`./log.ts`）自己产出的摘要里读回三个计数。
 *  摘要本体仍是机器面（`envelope.message` 与 `receipt.summary` 一字不动），这一处只供**上屏**；
 *  格式对不上（将来换了摘要写法）就不出这张卡，读数不编。 */
const BATCH_COUNT_RE = /批量记饮食：新增 (\d+)，跳过 (\d+)，失败 (\d+)/;

/** 批量补记的三格读数卡（审查件第 26 条：原文是「新增 1，跳过 0，失败 0」四个数字串成的公式，
 *  读者不知道「跳过 0」跳过的是什么）。三格各带一句说明，最后那格把「跳过」说清楚。 */
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

/** 回执摘要 → 副题（**只翻上屏这一处**，`receipt.summary` 与 envelope 的 `message` 一字不动）。
 *
 *  #496 · 原文直接印 `receipt.summary`，里面混着三种读者用不上的东西（审查件第 31、33、35、37、39 条）：
 *   · `#1` 这类内部记录编号（对账区已经有「记录编号」一行）；
 *   · 删类的「硬删除，不可恢复」——库层措辞，读者要的是「删了就找不回来」；
 *   · 相同日期／相同区间两端照抄（`2026-09-14→2026-09-14`、`2026-09-14~2026-09-14`）。
 *  形态照档案域先例：`src/profile/update.ts:87` 也是「页面印派生句、数据面不动」。
 *
 *  #496 · 批量补记那一页的摘要（「批量记饮食：新增 1，跳过 0，失败 0」）不在上屏现印：那句是四个
 *  数字串成的公式，三个计数的含义改由 `batchCountsCard` 逐格说（审查件第 26 条），副题只留一句结论。 */
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

/** 饮食 13 条的通用回执整页：状态 ＋ 影响行数 ＋ 写入字段 ＋ 今日累计 ＋ 对照 ＋ 对账 ＋ 复制区。 */
function buildDietReceiptDoc(
  db: DatabaseSync, key: string, params: Record<string, unknown>, receipt: CrudReceipt, command: string,
): string {
  const envelope: SerializableEnvelope = {
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'receipt', key: receipt.meta.wakeWord,
    data: { ok: true, message: receipt.summary },
  };
  const content = [
    renderKpiGrid([
      statusCard(receipt, writtenDetailOf(key, receipt.op)),
      { label: '影响行数', value: receipt.affectedRows + ' 行', detail: '本次写入的行数' },
      {
        label: '写入字段',
        value: receipt.writtenFields.length + ' 项',
        /* #496 · 这一行原本直印 `writtenFields`（CLI 参数名，如 `productName`／`dietaryFiber`），
           是审查件第 4、17、23、29 条点的「英文字段名上屏」。改走本域标签表（缺项回退原键名）。 */
        detail: receipt.writtenFields.map(fieldLabelOf).join('、') || '未设置',
      },
    ]),
    batchCountsCard(receipt),
    dailyTable(db, receiptDate(params)),
    itemsTable(receipt),
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
    title: receipt.scene + ' · 回执',
    /* #496 · 眉标原写「饮食 · 写后回执」，与 head 标题「卡路里·饮食回执」重复一遍，
       读者看到的两行没有新信息 ⇒ 不出这一行（`assembleDocPage` 收到空串即不出眉标行）。 */
    eyebrow: '',
    subtitle: subtitleOf(receipt),
    content,
  });
}

/** 饮食 13 条会改数据库的命令的整页回执端口（分派层只调本函数）。 */
export function dietReceiptDoc(
  key: string, params: Record<string, unknown>, receipt: CrudReceipt, db: DatabaseSync,
): string | null {
  if (!DIET_RECEIPT_KEYS.has(key)) return null;
  return buildDietReceiptDoc(db, key, params, receipt, commandLine(key, params));
}
