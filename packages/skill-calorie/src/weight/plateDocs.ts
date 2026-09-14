/** #109 → #294 → #337 · 体重各页共用的文档件（文档头 ＋ 页内共用件）。
 *
 * 留下的理由（逐件点名）：
 * - `DOC_VERSION`／`DOC_SKILL`／`DOC_TITLE` 被 6 个子功能文件的整页装配共用——第二用法（×6），留。
 * - #337 融合新增的一层：**回执页共用件**（状态卡带徽章、可见文本缺值写法、一句话结论块、
 *   复制区＋页脚数据来源行三件）。用法数得出两个以上：`log.ts`（体重盘）与回执页
 *   （`logReceipt.ts` 两条写命令、`receipt.ts` 两条写命令）——同一件事只写一处，页面不各抄一份。
 * 5 个整页装配已按 HELP 下一级归位（见 `plate.ts` 头注的对照表）；`fmt` 未被任何一页使用
 * （死码，随归位删掉）；`COMPARE_COLUMNS` 只有对比页用，已随装配迁入 `compare.ts`。
 */
import { escapeHtml } from 'base-paint';
import type { SerializableEnvelope } from 'base-paint';
import { renderDisclosure } from 'base-paint/blocks';
import type { KpiCardInput } from 'base-paint/blocks';
import type { CrudReceipt } from '../render/receipt.js';
import { assembleDocPage } from '../shared/docPage.js';
import { copyArea, copyLog, notice } from '../shared/copyArea.js';
import { statusCard } from '../shared/receiptParts.js';

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
  写入: 'ok', 成功: 'ok', 已更新: 'ok', 跳过: 'warn', 已删除: 'warn', 失败: 'danger', 无改动: 'empty',
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

/** 状态卡：共用件 `statusCard` 出那处「无改动／已改动」的四槽文本（一页只此一处），徽章由这里补。 */
export function stateCard(receipt: CrudReceipt, written: string, word: string, text: string): KpiCardInput {
  return { ...statusCard(receipt, written), status: kindOf(word), statusText: text };
}

/** 一句话结论块：一页只许这一种形态（折叠区标题「结论」＋ 默认展开）；正文由取数层拼好，此处只转义。 */
export function conclusionBlock(sentence: string): string {
  return renderDisclosure({ title: '结论', contentHtml: '<p>' + escapeHtml(sentence) + '</p>', open: true });
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
 *  （来源行写法照 `diet/nutritionPortDocs.ts:58-61`：哪张库／哪个窗口／多少条）。 */
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
  }) + notice({ icon: 'info', msg: '📊 数据来源:' + sourceText });
}

/** 写后回执整页壳（标题三件套＋区块）：整页模板恒由 `assembleDocPage` 一处产出。 */
export function receiptPageOf(receipt: CrudReceipt, content: string): string {
  return assembleDocPage({
    docTitle: '卡路里·体重回执',
    title: receipt.scene + ' · 回执',
    eyebrow: '体重 · 写后回执',
    subtitle: receipt.summary,
    content,
  });
}

/** 状态卡上那句「写入去向」措辞（按命令取，一处定义）。 */
export function writtenDetailOf(key: string): string {
  if (key === 'calorie.weight.update') return '旧值已按新值写回库，可照上表原值再改一次';
  if (key === 'calorie.weight.remove') return '快照即删除前的取值，行已从库中移除';
  return '已写入 weight_log 体重记录';
}
