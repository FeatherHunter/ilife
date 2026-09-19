/** 来源脚注（写入域取值口径）：**两页型的「数据来源 · 窗口 · 条数」三样各取什么值，只在本件写一份**。
 *
 * 出处：`docs/skills/skill-bill/688-融合基准.md` §五 5.2 第 26 行——`●` **七类恒出** ⇒ 写入域的结果型
 *  回执页（④）与过程型采集页（①）都要出，位置照表序（在复制区之后）；版面走共用位 `../shared/sourceLine.js`，
 *  本件只给那三样值（该件不认库名、不认命令名，照裁定 1 不把内部标识带上屏）。
 *
 * 三样值照写入域的真事实给：
 *   来源＝复制日志第 3 段那句「库文件名 ＋ 用途」的**人话版**——日志给机器看、可带库文件名；
 *     脚注给人看，故只写「记账库」这一句（裁定 1：**库文件名、命令名与脚本路径一律不上屏**，
 *     老侧把 `scripts/record_bill.py` 印进页脚就是反面那条）；
 *   窗口＝这一笔的时间（同一串给起止两端：这回记的是**一笔**，不是一段）；这一格没给写 `—`（裁定 4）；
 *   条数＝本次改动笔数（`BillReceipt.affectedRows`）；采集页没写库 ⇒ 0（照实报，不拿 1 顶）。
 *
 * 谁在用（五个调用点，指名）：`src/write/template-{expense,flow,batch,installment,update}.ts`——
 *  每张模板的两页各引它一次（回执页 `receiptSourceNote`、采集页 `collectSourceNote`）。
 */
import { sourceLine } from '../shared/sourceLine.js';

/** 回执页那句来源（＝`./write.ts` 的 `SOURCE_RECEIPT` 那句的人话版）。 */
const SOURCE_RECEIPT_TEXT = '记账库（写入）';

/** 采集页那句来源（＝`./write.ts` 的 `SOURCE_COLLECT` 那句的人话版：这一页只读、不写库）。 */
const SOURCE_COLLECT_TEXT = '记账库（只读）';

/** 缺值占位（照裁定 4「缺值一律 `—`」，不写 0、不写空串、不拿缺省值顶替）。 */
const MISSING = '—';

/** 三样值合成那一行：窗口起止同一串（一笔事）、条数非负整数、来源由调用方按页型给。 */
function sourceNote(time: string, count: number, source: string): string {
  const at = time.trim() === '' ? MISSING : time.trim();
  return sourceLine({ source, start: at, end: at, count });
}

/** 结果型回执页（④）的来源脚注：窗口＝这一笔的时间、条数＝本次改动笔数。 */
export function receiptSourceNote(time: string, changed: number): string {
  return sourceNote(time, changed, SOURCE_RECEIPT_TEXT);
}

/** 过程型采集页（①）的来源脚注：窗口＝这一笔的时间、条数＝本次改动笔数（这一页没写库 ⇒ 0）。 */
export function collectSourceNote(time: string): string {
  return sourceNote(time, 0, SOURCE_COLLECT_TEXT);
}
