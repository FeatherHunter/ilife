/** type-badge · **样式段**：本件**零样式**——胶囊（`renderChips`／`renderChipRow`）、
 *  状态徽章（`renderStatusBadge`）、口径行（`renderCaliberLine`）三枚零件的样式各由 `blocksCss()` 出。
 *  本件只出**组合**，不新造视觉。 */
export const TYPE_BADGE_CSS = [
  '/* type-badge（页面徽章列）：本件**只做组合、零新视觉**——三枚零件的样式各由 blocksCss() 出。',
  '   本段唯一那条规则是**分组包裹节退场**：包裹节只为「本件样式段有自己的选择器」而存在，',
  '   从布局里退场后，屏上与包裹节不存在时逐像素相同（与 docPage 的 .ilife-write 同一手法）。 */',
  '.ilife-page-ui .ilife-block-type-badge { display: contents; }',
].join('\n');
/** 样式段（调用方显式拼；本段只有一条「包裹节退场」，不影响视觉）。 */
export function typeBadgeCss(): string {
  return TYPE_BADGE_CSS;
}
