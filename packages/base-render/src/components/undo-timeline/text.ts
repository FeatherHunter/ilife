/** undo-timeline · **缺省文案**（渲染与运行时读同一份；调用方可以换，但语义别换）。
 *
 *  为什么单独一件（照 `bulk-bar/style-sizes.ts` 的口径）：本件的标记契约（`attrs.ts`）已经装到告警线边上，
 *  而这几句是**文案**、不是标记形状——拆出来两边都清爽；**取值一个字节都没动**。
 *  判据与渲染都从这里读，别处不许再抄一遍字面量（同一个句子两处各写一份，迟早走散）。
 *
 *  用词纪律：这几句是本件**自己生成的可见文本**，不写 `·`／`｜` 这类并列分隔符（段间由版式承担）。
 */
import type { UndoTimelineState } from './attrs.js';

/** 缺省卡头标题。 */
export const UNDO_TIMELINE_TITLE = '改动记录';
/** 空态：这一段时间里一条改动都没有。 */
export const UNDO_TIMELINE_EMPTY_TEXT = '这一段时间里没有改动';
/** 行里那枚主按钮的三档缺省字（按三态算；调用方可以换）。 */
export const UNDO_TIMELINE_GO_TEXT: Readonly<Record<UndoTimelineState, string>> = Object.freeze({
  undoable: '撤销这次改动',
  undone: '恢复这笔',
  locked: '已不可撤',
});
/** 三态状态片的缺省字（`undoable` 缺省不出片，由调用方的 `tag` 承担「会连带重算…」）。 */
export const UNDO_TIMELINE_STATE_TAG: Readonly<Record<UndoTimelineState, string>> = Object.freeze({
  undoable: '',
  undone: '已撤销，读数已还原',
  locked: '不可撤',
});
/** 不可撤那一档：片上除了「不可撤」还要写出**为什么**（孤零零一枚灰按钮是中间档）。 */
export const UNDO_TIMELINE_LOCKED_SEP = '：';
/** 回滚单里"勾不动"那一行的片语。 */
export const UNDO_TIMELINE_WHY_TEXT = '撤不了：';
/** 页脚那句结论的两段：前面按勾了几项现算，后面是调用方给的注（缺省「撤销后若要重做就得再走一次」）。 */
export const UNDO_TIMELINE_SUM_PRE = '勾了 ';
export const UNDO_TIMELINE_SUM_MID = ' 项，';
export const UNDO_TIMELINE_SUM_ZERO = '一项都没勾，撤销得先勾一项。';
export const UNDO_TIMELINE_SUM_NOTE = '撤销后若要重做就得再走一次';
/** 主按钮那枚字的缺省写法（按勾了几项算）。 */
export const UNDO_TIMELINE_SUBMIT_PRE = '撤销这 ';
export const UNDO_TIMELINE_SUBMIT_POST = ' 项';
export const UNDO_TIMELINE_SUBMIT_ZERO = '一项都没勾';
/** 取消那枚的字。 */
export const UNDO_TIMELINE_CANCEL_TEXT = '取消';
/** 忙碌那枚字的前缀（`正在` ＋ 按钮字，原地换）。 */
export const UNDO_TIMELINE_BUSY_PRE = '正在';
