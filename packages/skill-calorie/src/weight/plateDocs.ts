/** #109 → #294 → #337 → #483 · 体重各页共用的文档件（文档头 ＋ 页内共用件）。
 *
 * 留下的理由（逐件点名）：
 * - `DOC_VERSION`／`DOC_SKILL`／`DOC_TITLE` 被 6 个子功能文件的整页装配共用——第二用法（×6），留。
 * - #337 融合新增的一层：**回执页共用件**（状态卡、可见文本缺值写法、一句话结论块、
 *   复制区＋页脚数据来源行三件）。用法数得出两个以上：回执页的两条写命令（`logReceipt.ts`）
 *   与另外两条（`receipt.ts`）——同一件事只写一处，页面不各抄一份。（`log.ts` 体重盘只取
 *   `DOC_*` 与 `conclusionBlock`／`signed`，页脚来源行它自持一份，故 #483 不动它。）
 * - #483 文本审查：状态卡改成**三槽各说一件事**（值槽＝本次动了几条｜徽章＝结果词｜副说明＝
 *   接下来怎么办），页尾对账区只留跟进要用到的两条，字段名一律走中文标签（`weight/fieldLabels.ts`）。
 * 5 个整页装配已按 HELP 下一级归位（见 `plate.ts` 头注的对照表）；`fmt` 未被任何一页使用
 * （死码，随归位删掉）；`COMPARE_COLUMNS` 只有对比页用，已随装配迁入 `compare.ts`。
 */
import { escapeHtml } from 'base-paint';
import type { SerializableEnvelope } from 'base-paint';
import { renderCaliberLine, renderDataTable, renderDisclosure } from 'base-paint/blocks';
import type { KpiCardInput } from 'base-paint/blocks';
import type { CrudReceipt } from '../render/receipt.js';
import { assembleDocPage } from '../shared/docPage.js';
import { copyArea, copyLog } from '../shared/copyArea.js';
import { fieldLabel } from '../shared/fieldLabel.js';
import { WEIGHT_DOMAIN } from './fieldLabels.js';
import { weightUiCss } from './weightUi.js';

/** envelope 头（值冻结对齐 cli/keys.ts ENVELOPE_VERSION／CALORIE_SKILL；测试钉死一致）。 */
export const DOC_VERSION = '0.1.0';
export const DOC_SKILL = 'calorie';

/** 体重各页共用的 head 标题（整页模板住 `src/shared/docPage.ts`，标题走参数）。 */
export const DOC_TITLE = '卡路里·体重';

/* ── 回执页共用件（#337 融合：三个用法起共用） ── */

/** 徽章种类（冻结四值 `spec/controls.ts:312`；非法值图表层回落 `empty`，页面不自造状态名）。 */
export type Kind = 'ok' | 'warn' | 'danger' | 'empty';

/** 逐条状态词 ↔ 徽章种类（唯一定义地）：词进表格（`renderDataTable` 单元格只收文本，
 *  `blocks.ts:306-312`），种类进卡上徽章——两样同源。 */
const STATUS_KIND: Record<string, Kind> = {
  写入: 'ok', 已写入: 'ok', 成功: 'ok', 已更新: 'ok', 已改动: 'ok', 跳过: 'warn', 已删除: 'warn', 失败: 'danger', 无改动: 'empty',
};

export const kindOf = (word: string): Kind => STATUS_KIND[word] ?? 'empty';

/** 可见文本的缺值写法（全批统一：页面写 `—`，复制载荷里留空不写这一格）。 */
export function cell(v: unknown): string {
  if (v === null || v === undefined) return '—';
  const s = String(v).trim();
  return s === '' ? '—' : s;
}

/** 带单位的有符号体重差。 */
export const signed = (n: number): string => (n >= 0 ? '+' : '') + n + ' kg';

/** 字段键 → 中文标签一行（走 `weight/fieldLabels.ts` 那张域表；缺项回退原键名，不编词）。
 *  #483 之前这里是 `receipt.writtenFields.join('、')`——把 `kg、note、date、time` 这类参数名直接摆上屏。 */
export function fieldLabelList(keys: readonly string[]): string {
  const labels = keys.map((k) => fieldLabel(WEIGHT_DOMAIN, k)).filter((s) => s !== '');
  return labels.length === 0 ? '—' : labels.join('、');
}

/** 状态卡（一页只此一处）：**三个槽各说一件事**——值槽＝本次动了几条（短数字＋单位），
 *  徽章＝结果词（color 由 `STATUS_KIND` 给），副说明＝「接下来怎么办」那一句（调用方按命令给）。
 *  #483 之前值槽「已改动」＋副说明「已写入 weight_log 体重记录」＋徽章「已写入」是同一件事说三遍，
 *  另有一张「影响行数 N 行／本次写入的行数」卡把同一个数再说一遍——现在合成这一张。 */
export function stateCard(
  receipt: CrudReceipt,
  input: { readonly label: string; readonly word: string; readonly count: number; readonly detail: string },
): KpiCardInput {
  const noChange = receipt.noChange === true;
  return {
    label: input.label,
    value: String(input.count),
    unit: '条',
    detail: noChange ? '这次没有写出任何改动' : input.detail,
    status: kindOf(noChange ? '无改动' : input.word),
    statusText: noChange ? '无改动' : input.word,
  };
}

/** 一句话结论块：一页只许这一种形态（折叠区标题「结论」＋ 默认展开）；正文由取数层拼好，此处只转义。 */
export function conclusionBlock(sentence: string): string {
  return renderDisclosure({ title: '结论', contentHtml: '<p>' + escapeHtml(sentence) + '</p>', open: true });
}

/** 形状化结论块（#505）：与 `conclusionBlock` 同一个形态（同一个标题、同一个默认展开），
 *  收的是**已成形的小段 HTML**（`weightUi.verdict()` ＋ `factStrip()` 那一串）而不是一句人话。
 *  为什么另立一个入口而不是给 `conclusionBlock` 加开关：那个函数的契约是「正文只转义」
 *  （#483 定稿，锁死一句话结论），形状化的页面要的是「正文已经是形状」——
 *  两件事混淆过一次的代价就是形状被当成字面量印上屏（本票实测）。入口分开，两边契约各自清楚。 */
export function shapedConclusionBlock(bodyHtml: string): string {
  return renderDisclosure({ title: '结论', contentHtml: bodyHtml, open: true });
}

/** 页尾「对账信息」折叠区（体重域口径，替换共用件 `reconcileDisclosure`）：只留跟进要用到、
 *  页面别处没有的两条，且**两条恒在场**（键集 ≥2：记录编号 ＋ 落库时间）。
 *  - 记录编号（叫法按对抗审查裁定 G：这个字段全族只此一个叫法，值写数字）：
 *    单条写／单条删取本次那条的号，按日期或范围定位的那几条命令取回执逐行的号，
 *    两条路都取不到才写「本次不适用」。先前这里是**整行不摆**——#483 对抗审查缺陷 3：
 *    折区只剩一个时间戳，而该族这几页时间戳几乎同值，读者对不上「改／删的是哪条」。
 *  - 落库时间（原叫「写入时间」）：这次真正落库的时刻，跟表里「体重记在哪一天」不是一件事。
 *    缺陷 7 改叫「落库时间」——它与记录日期同屏时，读一眼就会被当成同一样东西。
 *  #483 删掉的「回执格式 v1（写库回执）」是机器面契约号，读者零收益（登记见证据件）。 */
export function reconcileBlock(receipt: CrudReceipt): string {
  return renderDisclosure({
    title: '对账信息',
    contentHtml: renderDataTable({
      columns: [{ key: 'k', label: '项' }, { key: 'v', label: '值' }],
      rows: [
        { k: '记录编号', v: recordNoOf(receipt) },
        { k: '落库时间', v: receipt.meta.actionAt },
      ],
    }),
  });
}

/** 对账区的记录编号取值（缺陷 3）：本次那条的号 → 回执逐行的号 → 都没有才说「本次不适用」。
 *  只收数字写法（裁定 G）：`#1` 那种写法留在复制载荷里，页面上不用。 */
function recordNoOf(receipt: CrudReceipt): string {
  if (receipt.recordId !== null) return String(receipt.recordId);
  const ids = receipt.ids.length > 0
    ? receipt.ids
    : receipt.items.map((it) => it.id).filter((n): n is number => typeof n === 'number');
  return ids.length === 0 ? '本次不适用' : ids.join('、');
}

/** 复制载荷（写命令一律 receipt 形，`test/cmd-registry-294.test.mjs:262`）：`message` 取**本页结论句 ＋
 *  本页表格逐行**，三格式复制出来的数字与页面逐个对得上；缺的那一格不写进载荷。 */
export function envelopeOf(receipt: CrudReceipt, message: string): SerializableEnvelope {
  return {
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'receipt', key: receipt.meta.wakeWord,
    data: { ok: true, message },
  };
}

/** 复制区（数据＋日志，日志第 3 段是渲染命令原文）＋页末数据来源行
 *  （来源行写法照 `diet/nutritionPortDocs.ts:58-61`：哪张库／哪个窗口／多少条；形态走 #420
 *  浅色口径行 `renderCaliberLine`——页脚来源是口径行，不是需要注意的提示，故不用深色 toast 卡）。
 *  **裁定 F（#483 对抗审查）**：可见的页脚只说人话来源「体重记录」——库文件名与表名退出可见面
 *  （本族可见文本里 `calorie_data.db`／`weight_log` 命中数为 0）。机器面照旧不丢：复制日志第 3 段
 *  由 `shared/copyArea.ts:170` 写成 `DB_FILENAME ｜ source`，库名与 `weight_log` 仍逐字在里面。
 *  调用方只给「实时部分」（本次记录／写入 N 条／窗口…），同一行接着写。 */
export function deliveryBlocks(
  envelope: SerializableEnvelope, receipt: CrudReceipt, command: string, sourceText: string,
): string {
  return copyArea({
    data: { envelope },
    log: {
      envelope,
      copyLog: copyLog({
        command, source: receipt.meta.source, m5Line: receipt.m5Line,
        actionAt: receipt.meta.actionAt, version: DOC_VERSION,
      }),
    },
  }) + renderCaliberLine('📊 数据来源：体重记录 ｜ ' + sourceText);
}

/** 写后回执整页壳（标题三件套＋区块）：整页模板恒由 `assembleDocPage` 一处产出。
 *  `subtitle` 不给就用回执摘要（机器面那一句）；传空串即整行撤掉（`assembleDocPage` 遇空省略，
 *  不回退到摘要）。#542 起记／批量／删除三支回执不再写可见副标题（事实各住形状里），
 *  改体重两页（02／10，未点名）仍走默认摘要。
 *
 *  #505 两处：
 *  - **正文里零 `·`**（负责人 2026-09-15 第 5 条）：页题原写 `记体重 · 回执`——那个 `·` 是把
 *    「做什么 ＋ 这是一张回执」两件事串成一句符号，与「体重 · 写后回执」眉标说同一件事（眉标已整族删）。
 *    改成 `记体重回执`。**副标题那一句同样落掉 `·`**：它照抄的是回执摘要（`receipt.summary`），
 *    而摘要是**机器面**（信封 `message`／复制载荷，逐字不许动）——所以做法是**只删可见面那一个字符**
 *    （`visualSubtitleOf`），机器面一字不改。
 *  - `weightUiCss()` 进正文第一项：本族四个页壳共用这一处（`assembleDocPage` 没有页内 CSS 入口），
 *    故四种回执页都在这里带上形状词汇的样式（`logReceipt.ts`／`receipt.ts` 的正文都用它）。 */
export function receiptPageOf(receipt: CrudReceipt, content: string, subtitle?: string): string {
  return assembleDocPage({
    docTitle: '卡路里·体重回执',
    title: receipt.scene + '回执',
    eyebrow: '',
    subtitle: visualSubtitleOf(subtitle ?? receipt.summary),
    content: weightUiCss() + content,
    pageUi: true,
  });
}

/** 可见副标题的写法：**只把 `·` 落掉**，其余逐字照摘要（#505）。
 *  摘要本体（信封 `message`／复制载荷）是机器面、一字不动；这一句是页面上给人读的，
 *  分类符在这里没有信息量（`已删除体重 #1（2025-05-01 80 kg · 硬删除，不可恢复）` 的两半各说各的一件事）。 */
function visualSubtitleOf(s: string): string {
  return s.replace(/·/g, '');
}

/** 状态卡副说明那一句「接下来怎么办」（按命令取，一处定义）。**不复述徽章的结果词**：
 *  #483 之前这一格写的是「已写入 weight_log 体重记录」——既把徽章的话又说一遍，又把库表名摆上屏。
 *  改类那格按对抗审查缺陷 1 改口：对照表第一列是「记录」（`#1`／`#494`），`改前 → 改后` 在第二列，
 *  原来说「上表左列就是改前的原值」是**指错列**——原值在标题含「改前」的那一列里。
 *
 *  #505 两处收紧：
 *  - **这一格吃纯文本**（`renderKpiGrid` → `esc(card.detail)`，共享层转义）⇒ 形状词汇的 HTML 进不来，
 *    故这里一个字都不用 `·`／`；`：把「做什么」与「下一步」写成两句人话（对照表／表本身已在同页说清那件事）。
 *  - 「上表左列」那句改成「表里「改前」那一列」——「上表」在本页有两张表（现值表 ＋ 对照表），
 *    靠方位词指表读者要自己猜；点名列头才是无歧义的写法。 */
export function writtenDetailOf(key: string): string {
  if (key === 'calorie.weight.update') return '已按新值写回体重记录。要改回去，照表里「改前」那一列的原值再改一次。';
  if (key === 'calorie.weight.remove') return '删除的行已从体重记录里移除。本页没有撤销按钮。';
  if (key === 'calorie.weight.batch') return '跳过与失败的行没写进库。改好日期或体重，可再补录一次。';
  return '已存入体重记录。照「看今日体重」可复查。';
}
