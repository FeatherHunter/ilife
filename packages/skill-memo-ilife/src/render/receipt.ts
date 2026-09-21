/** 「通用回执」页族（#831）—— 本族的**唯一定义地**。
 *
 * 族归属出处：`src/help/booklet.ts` 的 `BOOKLET_ROWS`（34 格里本族占 19 格，含 `mood` 域 3 格）。
 * `t822-册子冻结.md` §四对本族的约束：**只参数化标题与字段，不单独设计**。所以本件只给
 * 「一份页壳 ＋ 一份槽位契约」，各场景只填槽位、不各写布局。
 *
 * 槽位契约定为 8 个字段（铁律五「一个类型的字段不多于八个」）：
 *   title（页题）／message（一句话结论）／badges（分类徽章）／summary（事实条）
 *   ／sections（小表）／receipt（本地·远端·远端标识三行）／copyLog（复制区日志）／retryPrompt（重试指引）。
 *
 * 与 `pages.ts` 的分工：那边管「列表／报告／向导」族的快照，本件只管回执族的槽位与整页组装；
 * 两边都只调共用件（`fillMemoPage`／`pageEnvelope`），不各立第二份填充机制。
 */
import { bookletFileStem } from '../help/booklet.js';
import { pageEnvelope, fillMemoPage, type PageSnapshot, type PageCopyLog } from './pages.js';

/** 场景 id → 本族页。逐域**追加**，不改别人的行（写集互斥）：
 *  mood 域三条 ← #831；remind 域两条 ← #828；wish 域五条 ← #829；memo 域六条 ← #826；
 *  checkin 域三条 ← #830（本族 19 格至此齐）。 */
export const RECEIPT_SCENES = [
  'memo_add_mood',
  'memo_delete_mood',
  'memo_update_mood',
  'memo_remind_with_note',
  'memo_remind_existing',
  'memo_add_wish',
  'memo_update_wish',
  'memo_delete_wish',
  'memo_complete_wish',
  'memo_wish_schedule',
  'memo_add_basic',
  'memo_update_basic',
  'memo_delete_basic',
  'memo_change_category_single',
  'memo_change_subcategory',
  'memo_batch_change_category',
  'memo_add_checkin',
  'memo_delete_checkin',
  'memo_update_checkin',
] as const;
export type ReceiptScene = (typeof RECEIPT_SCENES)[number];

/** 顶层分类徽章：分类名 ＋ 可选子分类（子分类空即不显示）。 */
export interface ReceiptBadges {
  readonly category: string;
  readonly sub?: string | null;
}

/** 回执三行（取自写命令回执：`src/wish/ensure.ts` 的 `WishReceipt`）。 */
export interface ReceiptRows {
  readonly entityLabel: string;
  readonly entityId: string | number;
  readonly local: string;
  readonly remote: string;
  readonly remoteId: string | null;
}

export interface ReceiptPageInput {
  readonly scene: ReceiptScene;
  readonly title: string;
  readonly message: string;
  readonly badges: ReceiptBadges;
  readonly summary: readonly string[];
  readonly sections: PageSnapshot['sections'];
  readonly receipt: ReceiptRows;
  readonly copyLog: PageCopyLog;
  readonly retryPrompt: string;
}

/** 本地侧做了什么 → 人话（`WishReceipt['local']` 的六个取值，一处定义）。 */
const LOCAL_LABEL: Record<string, string> = {
  created: '已新建',
  existing: '已存在（未重复建）',
  updated: '已修改',
  unchanged: '未改动',
  removed: '已删除',
  checked: '只校验远端（本地零写）',
};

/** 远端侧做了什么 → 人话（`WishReceipt['remote']` 的七个取值，一处定义）。 */
const REMOTE_LABEL: Record<string, string> = {
  created: '已在飞书新建任务',
  existing: '飞书已有任务',
  synced: '已同步飞书',
  partial: '飞书部分成功',
  unavailable: '飞书不可用（本机没装或没登录）',
  failed: '飞书同步失败',
  'not-applicable': '不适用（这条没有飞书任务）',
};

/** 三格里的**前三行**：对象（本地记录号）／本地侧／远端侧——屏上与数据面共用过一段，一处定义。
 *  取值不认得的原样透出，不静默吞掉。 */
function receiptUserRows(r: ReceiptRows): string[] {
  return [
    '对象：' + r.entityLabel + ' #' + String(r.entityId),
    '本地侧：' + (LOCAL_LABEL[r.local] ?? r.local),
    '远端侧：' + (REMOTE_LABEL[r.remote] ?? r.remote),
  ];
}

/** 数据面（#876）：三格里的**第四行「远端标识」只进 `snapshot.sections`（页内载荷），不上屏**。
 *
 *  为什么屏上没有它：那一格装的是**远端平台的机器值**（`tk_done` 这类 guid），用户既认不出、
 *  也拿它做不了任何事；而「飞书那边成了没有」这件事，`远端侧` 那一行已经用人话说全了
 *  （`已在飞书新建任务`／`已同步飞书`／`飞书同步失败`／`不适用（这条没有飞书任务）`）——
 *  再印一串 guid 就是同一事实一页两遍，且两遍里有一遍是黑话。
 *  用户真要用标识指代对象时，给的是**本地记录号**（`对象` 那一行的 `#N`），不是远端 guid。
 *
 *  收掉不等于丢掉：#657／#658 合成写契约要求的三格（本地侧／远端侧／远端标识）**仍逐格读得到** ——
 *  它仍在下面这份载荷里，仍是命令出口回执 JSON 的 `local`／`remote`／`remoteId`
 *  （`docs/agents/合成写判据.md` §一判据 4 的「机器读在哪」逐字写的是**出口回执行**；
 *  契约管的是那份 JSON，不是页面形状）。模板侧 `renderRows()` 按 heading「处理结果」把这整段滤掉，
 *  故本段只作数据面，一个字都不上屏。 */
function receiptSection(r: ReceiptRows): PageSnapshot['sections'][number] {
  return {
    heading: '处理结果',
    rows: [...receiptUserRows(r), '远端标识：' + (r.remoteId === null || r.remoteId === '' ? '无' : r.remoteId)],
  };
}

/** 整页组装：槽位 → 信封（`pageEnvelope`）→ 模板填充（`fillMemoPage`）＋ 文件名主体（册子唯一定义）。
 *
 *  文件名主体只经 `bookletFileStem(sceneId)` 取，本件**不自己拼名字**；库侧落盘由出口的
 *  `deliver` 钩子交给共用件 `base-paint/save-html`（时间戳与独占递补都在那儿）。 */
export function buildReceiptPage(input: ReceiptPageInput): { html: string; stem: string } {
  const payload = pageEnvelope({
    commandCn: input.title,
    wakeWord: input.title,
    sceneId: input.scene,
    title: input.title,
    summary: [...input.summary],
    sections: [...input.sections, receiptSection(input.receipt)],
    copyLog: input.copyLog,
    extra: {
      receipt: {
        message: input.message,
        category: input.badges.category,
        sub: input.badges.sub ?? '',
        rows: receiptUserRows(input.receipt),
        retry_prompt: input.retryPrompt,
      },
    },
    message: input.message,
  });
  return { html: fillMemoPage('receipt', payload), stem: bookletFileStem(input.scene) };
}
