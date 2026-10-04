/** popover · **入参形状**（本组件对外的类型只有两个，都住这一件）。 */

/** `renderPopoverFullText()` 的入参。 */
export interface PopoverFullTextInput {
  /** 面板 `id`（同时是 `popovertarget` 指的那个）：同页唯一，只许标识符字符。 */
  readonly id: string;
  /** **全文**（纯文本；组件自己转义，页面不必先转义一次）。 */
  readonly text: string;
  /** 触发处**自己**的类（调用方那条省略号规则的挂点，逐字沿用；缺省＝不带）。 */
  readonly className?: string;
  /** 触发处的无障碍名（缺省 `看全文`——这三个字是用户看得见的，须是页面上已有的话术口径）。 */
  readonly label?: string;
}

/** `popoverFullTextCss()` 的入参。 */
export interface PopoverFullTextCssInput {
  /** 类名前缀；缺省 `ilife-`。 */
  readonly prefix?: string;
}

/** `buildPopoverFullTextJs()` 的入参。 */
export interface PopoverFullTextJsInput {
  /** 候选选择器；缺省 `POPOVER_DEFAULT_SELECTORS`。给了就是**整份替换**。 */
  readonly selectors?: readonly string[];
  /** 逐实例 `id` 的起号（同一页多次注入不撞号；缺省 1）。 */
  readonly startIndex?: number;
}
