/** 心愿域 · **通用回执页的装配件**（票 #829）：本域 4 张结果页（记／改／删／完成心愿）只填槽位，
 *  页壳与版式一律交给族定义地 `src/render/receipt.ts` 的 `buildReceiptPage`——本件**不写第二份布局**。
 *
 *  为什么住本域：4 张结果页是**心愿类**的场景交付物（册子 `BOOKLET_ROWS` seq 18／20／21／22），
 *  文件主体由族定义地经 `bookletFileStem(sceneId)` 取，本件不自己拼名字（同 `t822` §二「只在一处算」）。
 *
 *  与 `memo/run.ts` 的分工：那边是**分派**（三条共用写命令按分类分岔），本件是**本域的页装配**。
 *  分派只挑场景 id 并把「查得到的那一行」交给这里，摘要／明细的措辞住本件一处。
 *
 *  铁律二：`(分类, content, due)` 的本地自然键与 `WishReceipt` 三格都取自写侧 `ensure.ts`，本件不重算。
 */
import { buildReceiptPage } from '../render/receipt.js';
import { fillMemoPage } from '../render/pages.js';
import type { PageSnapshot } from '../render/pages.js';
import type { ReceiptScene } from '../render/receipt.js';
import { bookletFileStem } from '../help/booklet.js';
import type { MemoNote } from '../db/readonly.js';
import type { WishReceipt } from './ensure.js';

/** 排期那一格的人话：`YYYY-MM-DD` 原样；没有即写「未定」，不空着也不拿 0 顶。 */
function dueText(due: string | null): string {
  return due === null || due === '' ? '未定' : due;
}

/** 本域结果页的场景 id（`src/help/booklet.ts` seq 18／19／20／21／22 逐字）。 */
export type WishReceiptScene = Extract<
  ReceiptScene,
  'memo_add_wish' | 'memo_update_wish' | 'memo_delete_wish' | 'memo_complete_wish' | 'memo_wish_schedule'
>;

/** 记／改／删／完成心愿四条真跑到的入参。
 *  `loc` 留空＝这一次没有可查的那一行（如新建没拿到 id、批量排期不指向单条）——此时明细改走 `notes`。
 *  `extraSections` 是批量那一支的记账（已更新／已同步／跳过／错误），一条命一条。
 *  `page` 给定时改出**过程页**（排期／完成向导），主体由册子按 `kind:'过程页'` 取——同一个场景 id
 *  在册子里有「结果页 ＋ 过程页」两格（seq 19／33），故取名必须带上 kind，否则两格会撞同一个主体。 */
export interface WishReceiptInput {
  readonly scene: WishReceiptScene;
  readonly title: string;
  readonly loc?: MemoNote | null;
  readonly receipt: WishReceipt;
  /** 结果页主对象那两格：默认从 `loc` 取；批量排期没有单条，用「一批心愿」与条数顶上。 */
  readonly entityLabel?: string;
  readonly entityId?: string | number;
  readonly extraSections?: readonly PageSnapshot['sections'][number][];
  readonly extraSummary?: readonly string[];
  /** 过程页分流：`'过程页'` ＋ `values`（已有 JSON 载荷，向导页自带）即走窄兼容支。 */
  readonly page?: {
    readonly kind: '过程页';
    readonly template: string;
    readonly values: Record<string, unknown>;
  };
}

/** 一条心愿的摘要（页首事实条）：心愿 ID ／ 心愿内容 ／ 排期；`loc` 缺则只剩结论那一条。 */
function summaryOf(title: string, loc: MemoNote | null, extra: readonly string[]): string[] {
  const out: string[] = [title + '：' + (loc === null ? '见下方结果' : loc.content)];
  if (loc !== null) {
    out.push('心愿 ID ' + loc.id);
    out.push('排期 ' + dueText(loc.due));
  }
  for (const line of extra) out.push(line);
  return out;
}

/** 整页装配：槽位 → 族定义地。返回 `{html, stem}`，`stem` 即册子主体（落盘由出口的 `deliver` 钩子做）。 */
export function buildWishReceipt(input: WishReceiptInput): { readonly html: string; readonly stem: string } {
  // 过程页那两支（排期／完成向导）：结果页壳换向导模板，主体按 `kind` 取，其余一字不动。
  if (input.page !== undefined) {
    return {
      html: fillMemoPage(input.page.template, input.page.values),
      stem: bookletFileStem(input.scene, input.page.kind),
    };
  }
  const loc = input.loc ?? null;
  const r = input.receipt;
  const entityLabel = input.entityLabel ?? loc?.category ?? '心愿';
  const entityId = input.entityId ?? loc?.id ?? '—';
  return buildReceiptPage({
    scene: input.scene,
    title: input.title,
    message: r.message,
    badges: { category: loc?.category ?? '心愿', sub: loc?.sub_category ?? null },
    summary: summaryOf(input.title, loc, input.extraSummary ?? []),
    sections: [...(input.extraSections ?? [])],
    receipt: { entityLabel, entityId, local: r.local, remote: r.remote, remoteId: r.remoteId },
    copyLog: {
      thinking: input.title + ' · 心愿域写回执渲染为通用回执页（页族定义处 src/render/receipt.ts）',
      data_structure: 'notes 表（id/content/category/sub_category/due/feishu_task_guid）；回执三格 local／remote／remoteId 取自写侧',
      call_chain: 'cmd_read 分派 → ' + input.scene + ' → buildWishReceipt → buildReceiptPage → fillMemoPage(receipt) → deliver 落盘',
      exception: '无',
    },
    retryPrompt: '若这一页的内容不对，请把要改的那一条（心愿 ID 与要改成的样子）发我，我重跑一次：' + input.title,
  });
}

/** #829 · 跨域入口的窄封装：给分派层（`src/memo/run.ts` 的三条共用写命令）用的那一形。
 *  `loc` 缺＝这一次没有可查的那一行（如新建没拿到 id）。这里只补可选参数，不加第二套口径。 */
export function wishReceiptFor(
  scene: WishReceiptScene,
  title: string,
  receipt: WishReceipt,
  loc: MemoNote | null,
  extras?: {
    readonly entityLabel?: string;
    readonly entityId?: string | number;
    readonly extraSummary?: readonly string[];
    readonly extraSections?: readonly PageSnapshot['sections'][number][];
  },
): { readonly html: string; readonly stem: string } {
  return buildWishReceipt({ scene, title, loc, receipt, ...(extras ?? {}) });
}
