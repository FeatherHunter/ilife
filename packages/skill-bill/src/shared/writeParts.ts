/** 写命令回执的共用件（**唯一定义地**）：回执事实的形状（`BillReceipt`）＋ 影响行数口径（`totalChanges`）
 *  ＋ 回执的 `<section>` 段（`writeSection`）＋ 命令原文（`commandLine`）。**对外五件**；三字符转义（`esc`）只在本件内部
 *  给 `writeSection` 用，不转出去（铁律五：接口小、里面厚）。
 *
 * 谁在用（两个调用点，指名）：
 *   ① `src/record/write.ts`——两条写命令的处理体：影响行数取前后差、回执事实在这里装配、命令原文在这里拼；
 *   ② `src/record/receipt.ts` 与 `src/record/collect.ts`——两张整页的 `<section>` 段都由 `writeSection` 生，
 *      复制 prompt 区与复制日志的命令原文都走 `commandLine`。
 *  第二个消费者：`src/query/`（随兄弟图 #403 的查询域一起到位，同一套采集页／回执页／复制区）。
 *  （页面三个公共标识另立 `./pageIdentity.ts`：那是另一件活——标识取值，不是回执与 `<section>` 段。）
 *
 * 口径出处：
 *   - 影响行数＝SQLite `total_changes()` 在本次写库前后的增量（`INSERT`／`UPDATE`／软删标记一律计），
 *     与 `packages/skill-calorie/src/shared/writeParts.ts:38` 同一口径，**非自报**；
 *   - 回执 `<section>` 的槽位取值照卡路里同件的 `ilife:<技能>:<槽位>` 形状。
 *
 * 转义口径（**不得与公共层 `escapeHtml` 互换**）：本件 `esc` 只转 `&`／`<`／`>` 三字符；
 *   公共层 `escapeHtml`（`base-paint`）与 `src/render/html.ts:7` 的那份都转五字符（多 `"`／`'`）。
 *   两者混用会静默改产物（`docs/skills/skill-bill/t406-共用件依赖与提升改造清单.md` 第二节 `esc` 行）。
 */
import type { DatabaseSync } from 'node:sqlite';
import type { RecordOp } from '../policy/record.js';
import { DOC_SKILL } from './pageIdentity.js';

/** 一次写库的事实（回执页与复制日志都读它）。
 *  形状照卡路里同件的收据对象，只留饼干用得上的：操作／记录号／摘要／影响行数／写入字段／有无改动／来源／时刻。
 *  `noChange` 承接「值与改前一致」那一格，一页只出现这一处。 */
export interface BillReceipt {
  readonly op: RecordOp;
  readonly recordId: number | null;
  readonly summary: string;
  readonly affectedRows: number;
  readonly writtenFields: readonly string[];
  readonly noChange: boolean;
  /** 本次数据从哪里来（复制日志第 3 段；库文件名逐字由调用方给，共用件不取本包文件名）。 */
  readonly source: string;
  /** 写入时刻（本地时钟，`YYYY-MM-DD HH:MM:SS`）。 */
  readonly actionAt: string;
}

/** 回执格式串（页尾对账折叠区那一行）；本票口径 `v1`。 */
export const RECEIPT_FORMAT = 'v1（写库回执）';

/** 三字符转义：只转 `&`／`<`／`>`。**不得与五字符的 `escapeHtml` 互换**（见文件头）；只给本件的 `<section>` 段用。 */
function esc(s: unknown): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** 影响行数口径：SQLite `total_changes()` 的当前值；调用方取「写库前」与「写库后」两次之差。 */
export function totalChanges(db: DatabaseSync): number {
  const row = db.prepare('SELECT total_changes() AS n').get() as { n?: number } | undefined;
  return row && typeof row.n === 'number' ? Number(row.n) : 0;
}

/** 本次执行的命令原文（复制 prompt 区与复制日志第 4 段共用）：与 AI 实跑那条同形，含本次 `--params`，可照抄重跑。
 *  参数值里若出现半角单引号，原文会在此处被截断——真要照抄重跑请自行转义（本仓命令原文一贯用单引号包 JSON）。 */
export function commandLine(key: string, params: Record<string, unknown>): string {
  return 'bill-cmd-read ' + key + " --params '" + JSON.stringify(params) + "'";
}

/** 写域页面的 `<section>` 段：四个机器标记 ＋ 正文。
 *  标记：`data-skill`（技能名，取值同页标识）／`data-slot`（`receipt`＝结果型回执整页、`collect`＝过程型采集页）
 *  ／`data-shape`（＝本次 envelope 的形状，与老回执页同一枚）／`data-key`（命令名）。
 *  H1 与副标题**不在这里**：那是页面模板（`base-paint/blocks` 的 `renderPageShell`）的活，一处只出一次。 */
export function writeSection(input: {
  readonly slot: 'receipt' | 'collect';
  readonly shape: string;
  readonly key: string;
  readonly content: string;
}): string {
  return '<section class="ilife-write" data-skill="' + DOC_SKILL + '" data-slot="ilife:bill:' + input.slot
    + '" data-shape="' + esc(input.shape) + '" data-key="' + esc(input.key) + '">' + input.content + '</section>';
}
