/** rank-list · **组件出口**（本组件对外的唯一名字面）。
 *
 *  三个运行名：`renderRankList(input)`（产标记，零 DOM）／`rankListCss()`（样式段）／
 *  形态闭集 `RANK_LIST_FORMS`（本件只落地形态 A「领奖台」）。
 *  标记契约也一并转出（类名根 ＋ 槽位拼法 ＋ 领奖台位数 ＋ 口径标签）：
 *  判据与调用方都从这一份事实派生，不各抄一份字面量。
 *
 *  用法与参数表见同目录 `README.md`。消费方走 `base-paint/blocks`（组件层出口），不走根出口。
 */
export {
  RANK_LIST_CALIBER_LABEL,
  RANK_LIST_CLASS,
  RANK_LIST_FORMS,
  RANK_LIST_PODIUM_SIZE,
  RANK_LIST_SLOTS,
  rankListPlaceClass,
  rankListSlot,
} from './attrs.js';
export type { RankListForm, RankListInput, RankListRow, RankListSlot } from './attrs.js';
export { renderRankList } from './render.js';
export {
  RANK_LIST_BAR_MIN_PX,
  RANK_LIST_BAR_THICKNESS_PX,
  RANK_LIST_CARD_MIN_EM,
  RANK_LIST_FIRST_VALUE_SCALE,
  RANK_LIST_NARROW_PX,
  rankListCss,
} from './style.js';
