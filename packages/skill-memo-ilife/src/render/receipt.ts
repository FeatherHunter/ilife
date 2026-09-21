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

/** 场景 id → 本族页（`mood` 域三条；本族其余 16 格由各自域票照此调用）。 */
export const RECEIPT_SCENES = ['memo_add_mood', 'memo_delete_mood', 'memo_update_mood'] as const;
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

/** 回执三行：本地侧／远端侧／远端标识。取值不认得的原样透出，不静默吞掉。 */
function receiptSection(r: ReceiptRows): PageSnapshot['sections'][number] {
  return {
    heading: '处理结果',
    rows: [
      '对象：' + r.entityLabel + ' #' + String(r.entityId),
      '本地侧：' + (LOCAL_LABEL[r.local] ?? r.local),
      '远端侧：' + (REMOTE_LABEL[r.remote] ?? r.remote),
      '远端标识：' + (r.remoteId === null || r.remoteId === '' ? '无' : r.remoteId),
    ],
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
        rows: receiptSection(input.receipt).rows,
        retry_prompt: input.retryPrompt,
      },
    },
    message: input.message,
  });
  return { html: fillMemoPage('receipt', payload), stem: bookletFileStem(input.scene) };
}
