/** 打卡域 · **通用回执页的装配件**（票 #830）：本域 3 张结果页（记／删／改打卡，册子
 *  `BOOKLET_ROWS` seq 23／24／25）只填槽位，页壳与版式一律交给族定义地 `src/render/receipt.ts`
 *  的 `buildReceiptPage`——本件**不写第二份布局**（`t822-册子冻结.md` §四：本族只参数化标题与字段）。
 *
 *  为什么住本域：这 3 格是**打卡类**场景的交付物，文件主体由族定义地经 `bookletFileStem(sceneId)` 取，
 *  本件不自己拼名字（同 `t822` §二「只在一处算」）。
 *
 *  与 `memo/run.ts` 的分工：那边是**分派**（三条共用写命令按 `notes` 表那一行的顶层分类分岔），
 *  本件是**本域的页装配**。分派只挑场景 id 并把那一行交给这里，摘要措辞住本件一处。
 *
 *  铁律二：回执三格（`local`／`remote`／`remoteId`）取自写侧 `WishReceipt`，分类与子分类取自
 *  `notes` 表那一行，本件不重算任何口径。 */
import { buildReceiptPage } from '../render/receipt.js';
import type { ReceiptScene } from '../render/receipt.js';
import type { MemoNote } from '../db/readonly.js';
import type { WishReceipt } from '../wish/index.js';

/** 本域 3 格的场景 id（`src/help/booklet.ts` seq 23／24／25 逐字；3 格全在通用回执族）。 */
export type CheckinReceiptScene = Extract<
  ReceiptScene,
  'memo_add_checkin' | 'memo_delete_checkin' | 'memo_update_checkin'
>;

/** 本域顶层分类（老库口径：`notes.category` 的中文取值，与路由 `preset` 同一个词）。 */
const CHECKIN_TOP = '打卡';

interface CheckinPage {
  readonly html: string;
  readonly stem: string;
}

/** 打卡那一行的事实条：编号 ／ 正文 ／ 分类（子分类空即不显示那一段）。 */
function summaryOf(note: MemoNote): string[] {
  return [
    '打卡编号 ' + note.id,
    '内容：' + note.content,
    '分类 ' + note.category + (note.sub_category === null ? '' : '／' + note.sub_category),
  ];
}

/** 整页装配：槽位 → 族定义地。返回 `{html, stem}`，`stem` 即册子主体（落盘由出口的 `deliver` 钩子做）。 */
function buildCheckinReceipt(
  scene: CheckinReceiptScene,
  title: string,
  r: WishReceipt,
  note: MemoNote,
): CheckinPage {
  return buildReceiptPage({
    scene,
    title,
    message: r.message,
    badges: { category: note.category, sub: note.sub_category },
    summary: summaryOf(note),
    sections: [],
    receipt: { entityLabel: '打卡', entityId: note.id, local: r.local, remote: r.remote, remoteId: r.remoteId },
    copyLog: {
      thinking: title + ' 写命令回执渲染为通用回执页（页族定义处 src/render/receipt.ts）',
      data_structure: 'notes 表（id／content／category／sub_category）；回执三格 local／remote／remoteId 取自写侧',
      call_chain: 'cmd_read 分派 → ' + scene + ' → buildCheckinReceipt → buildReceiptPage → fillMemoPage(receipt) → deliver 落盘',
      exception: '无',
    },
    retryPrompt: '若这一页的内容不对，请把要改的那一条（打卡编号与要改成的样子）发我，我重跑一次：' + title,
  });
}

/** 记打卡：只认 `notes` 表那一行的分类＝打卡；其他分类归各自域，本件回 `undefined`。 */
export function checkinCreatePage(r: WishReceipt, created: MemoNote | null): CheckinPage | undefined {
  if (created === null || created.category !== CHECKIN_TOP) return undefined;
  return buildCheckinReceipt('memo_add_checkin', '记打卡', r, created);
}

/** 改打卡：改完那一行的分类＝打卡才出页（改前那一行由调用方先判，见 `runUpdate` 的分岔顺序）。 */
export function checkinUpdatePage(r: WishReceipt, after: MemoNote): CheckinPage | undefined {
  if (after.category !== CHECKIN_TOP) return undefined;
  return buildCheckinReceipt('memo_update_checkin', '改打卡', r, after);
}

/** 删打卡：删前那一行的分类＝打卡才出页（删完就取不到了，调用方必须先取）。 */
export function checkinRemovePage(r: WishReceipt, before: MemoNote): CheckinPage | undefined {
  if (before.category !== CHECKIN_TOP) return undefined;
  return buildCheckinReceipt('memo_delete_checkin', '删打卡', r, before);
}
