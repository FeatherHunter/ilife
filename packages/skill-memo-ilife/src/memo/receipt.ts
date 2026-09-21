/** 备忘域 · 6 格回执槽位装配（票 #826）：`memo.create`／`memo.update`／`memo.remove`／`memo.batch`
 *  落到备忘类那 6 个场景时，本域这一格的槽位措辞住这里；页壳与版式一律交给族定义地
 *  `src/render/receipt.ts` 的 `buildReceiptPage`——本件**不写第二份布局**（册子 §四只许参数化）。
 *
 *  与 `./receiptPage.js` 的分工：那边是三条共用写命令的通用翻译件（`buildReceipt`／`receiptOptsOf`，
 *  #829 从 `run.ts` 拆出）；本件是**备忘类 6 场景往槽位里填什么**（场景 id、标题、摘要措辞）加
 *  「哪一行算本域」的选配（分类分岔）。分派（`run.ts`）只问本件要 `{html, stem} | undefined`，
 *  拿不到（别家分类）就原样落回执、不出页——各域的页装配互不串门。
 *
 *  铁律二：回执字段的唯一来源是写侧 `WishReceipt` 与 notes 表那一行，本件不重算口径。
 */
import { buildReceipt, receiptOptsOf } from './receiptPage.js';
import type { ReceiptScene } from '../render/receipt.js';
import type { MemoNote } from '../db/readonly.js';
import type { WishReceipt } from '../wish/index.js';

/** 本域 6 格的场景 id（`src/help/booklet.ts` seq 1–6 逐字；6 格全在通用回执族）。 */
export type MemoReceiptScene = Extract<
  ReceiptScene,
  | 'memo_add_basic'
  | 'memo_update_basic'
  | 'memo_delete_basic'
  | 'memo_change_category_single'
  | 'memo_change_subcategory'
  | 'memo_batch_change_category'
>;

type MemoPage = { readonly html: string; readonly stem: string };

/** 记备忘：只认 notes 表那一行的分类＝备忘；其他分类归各自域票，本件回 undefined。 */
export function memoCreatePage(r: WishReceipt, created: MemoNote | null): MemoPage | undefined {
  if (created === null || created.category !== '备忘') return undefined;
  return buildReceipt('memo_add_basic', '记备忘', r, receiptOptsOf(created));
}

/** 改备忘系三格：纯分类补丁 → 单条改分类；纯子分类补丁 → 改子分类；
 *  其余字段改且行分类＝备忘 → 改备忘；其余（打卡等）→ undefined。
 *  调用方保证心愿／情绪日记两支已提前分岔，故本函数只会见到备忘／打卡两类行。 */
export function memoUpdatePage(
  r: WishReceipt,
  after: MemoNote,
  patchKeys: readonly string[],
): MemoPage | undefined {
  if (patchKeys.length === 1 && patchKeys[0] === 'category') {
    return buildReceipt('memo_change_category_single', '备忘改分类', r, receiptOptsOf(after));
  }
  if (patchKeys.length === 1 && patchKeys[0] === 'sub_category') {
    return buildReceipt('memo_change_subcategory', '备忘改子分类', r, receiptOptsOf(after));
  }
  if (after.category !== '备忘') return undefined;
  return buildReceipt('memo_update_basic', '改备忘', r, receiptOptsOf(after));
}

/** 删备忘：删前那一行的分类＝备忘才出页；其他 → undefined。 */
export function memoRemovePage(r: WishReceipt, before: MemoNote): MemoPage | undefined {
  if (before.category !== '备忘') return undefined;
  return buildReceipt('memo_delete_basic', '删备忘', r, receiptOptsOf(before));
}

/** 批量改分类执行支的结果页（册子 seq 6，通用回执族）：更新／跳过记账进摘要，
 *  逐条错误也进摘要（一条一行，不静默）；远端一格如实写不适用（批量两条路都不调飞书）。 */
export function memoBatchResultPage(input: {
  readonly updated: number;
  readonly skipped: number;
  readonly errors: readonly string[];
  readonly from: string | null;
  readonly to: string;
}): MemoPage {
  const doneAll = input.errors.length === 0;
  const message = '改分类完成：更新=' + input.updated + '，跳过=' + input.skipped;
  const r: WishReceipt = { ok: doneAll, message, local: 'updated', remote: 'not-applicable', remoteId: null };
  return buildReceipt('memo_batch_change_category', '备忘改分类', r, {
    entityLabel: '批量改分类',
    entityId: '更新 ' + input.updated + ' 条',
    category: input.to,
    summary: [
      '原分类 ' + (input.from ?? '全部') + ' → 目标分类 ' + input.to,
      '更新 ' + input.updated + ' 条',
      '跳过 ' + input.skipped + ' 条',
      ...input.errors.map((e) => '没做成：' + e),
    ],
  });
}
