/** bulk-bar · **尺寸事实**（本件几个数字的唯一出处：样式段、判据与说明书都读这一处）。
 *
 *  为什么单独一件：条目列的样式住 `style-column.ts`、操作条与确认面的样式住 `style.ts`／`style-confirm.ts`，
 *  两处都要这几个数；写两份就迟早走散（铁律二）。这里只放**数**，不放样式。
 */
/** 触控地板的数字（判据与说明书都读这一处）。 */
export const BULK_BAR_MIN_TARGET_PX = 44;
/** 一行的高度下限（整行是命中区 ⇒ 它也是命中盒的下限）。 */
export const BULK_BAR_ROW_MIN_HEIGHT_PX = 52;
/** 勾选框的视觉盒边长（命中盒由 44×44 那份承担，视觉盒小一号）。 */
export const BULK_BAR_BOX_PX = 24;
/** 窄容器阈值（px）：动作排改走「整排铺满、每枚等分」。
 *  **这是本件自己的宽度**（`@container` 判的），不是视口宽度。 */
export const BULK_BAR_NARROW_PX = 560;
