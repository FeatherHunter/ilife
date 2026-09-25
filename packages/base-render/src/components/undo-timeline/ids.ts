/** undo-timeline · **行内 `id` 的拼法**（同页唯一那一半）。
 *
 *  为什么单独一件（照 `bulk-bar/style-sizes.ts` 的口径）：`model.ts` 装的是入参形状，
 *  这里装的是**给这个份标记起名字**的规矩——两件事一起改的时候很少，拆开两边都清爽；
 *  `model.ts` 也因此退到告警线里面（本包告警线 350 行，LF 口径）。
 *
 *  运行时段按 `aria-controls` 反查那一块（`getElementById`）⇒ `id` 必须**同页唯一**：
 *  `name` 由调用方保证同页唯一，键由各清单保证唯一，两段一起编码 ⇒ 不同的（件名，键）必得不同的 `id`。
 */

/** `id` 里那一段的编码：**逐字符可逆**（`encodeURIComponent`）。
 *
 *  为什么不能用「把非法字符一串换成 `-`」：`'记账条'`／`'改分类'`／`'改账户'` 换成 `-` 之后**都是同一个串**
 *  ⇒ 同页出现两个同名 `id`，而运行时按 `aria-controls` 反查 ⇒ 点第二行摊开的是第一行那块回滚单
 *  （同层 `bulk-bar` 真机上实测过这个坑）。逐字符编码可逆 ⇒ 不同的（件名，键）必得不同的 `id`。
 *  `id` 只出现在属性里，人读不到，多几个百分号不值一提。 */
function idPart(s: string): string {
  return encodeURIComponent(s);
}

/** 就地回滚单的 `id`（同页唯一：`name` 同页唯一 ＋ 键在清单内唯一）。 */
export function undoTimelinePickId(name: string, key: string): string {
  return 'ilife-undo-pick-' + idPart(name) + '-' + idPart(key);
}

/** 错态那句字的 `id`（那一行按钮的 `aria-describedby` 指它）。 */
export function undoTimelineErrorId(name: string, key: string): string {
  return 'ilife-undo-error-' + idPart(name) + '-' + idPart(key);
}

/** 卡底那句提示的 `id`（按不动的那几枚指它：「为什么按不动」写在那儿）。 */
export function undoTimelineHintId(name: string): string {
  return 'ilife-undo-hint-' + idPart(name);
}

/** 状态片的 `id`（**不能撤**的那一枚按钮指它：为什么按不动就写在那片字上）。 */
export function undoTimelineTagId(name: string, key: string): string {
  return 'ilife-undo-tag-' + idPart(name) + '-' + idPart(key);
}

/** 页脚那句结论的 `id`（`aria-live` 的落点，运行时段原地改写的就是它）。 */
export function undoTimelineSumId(name: string, key: string): string {
  return 'ilife-undo-sum-' + idPart(name) + '-' + idPart(key);
}
