/** popover-menu · **渲染**（纯函数产 HTML；本件只有形态 A「贴着按钮」一种骨架）。
 *
 *  —— 形态 A：贴着按钮 ——
 *
 *  骨架＝**一颗触发键 ＋ 贴着它弹出来的小菜单**。它替掉的两种错法：
 *   · 把几条动作摊在页面上——每页都要一张工具条，正文被挤成一条；
 *   · 自己搓弹层管「点外面关／`Esc` 关」——漏一条就把用户关在菜单里。
 *
 *  三条硬口径（判据断的就是它们）：
 *   · 面板是**真 `popover` ＋ `role=menu`**；触发键带 **`popovertarget`**（**一行脚本都没有也开得出来**）
 *     与 `aria-haspopup="true"`，展开态由运行时同步到 `aria-expanded`；
 *   · 定位两道：`@supports (anchor-name: --a)` 之内走 CSS 锚定（`position-area` ＋ 翻边），
 *     之外按**普通定位**（打开时运行时按触发键的矩形算边距）；逐实例锚名 `--ilife-menu-<id>`
 *     由标记写进 `style` 属性（触发键与面板写**同一个**名字）；
 *   · 每一枚项都是**真 `<button>`**（`role=menuitem`／`menuitemradio`），机器值落
 *     `data-ilife-menu-item`（**不落 id**：`id` 归页面所有）。
 */
import { esc } from '../shared/escape.js';
import {
  MENU_ANCHOR_PREFIX, MENU_ATTR, MENU_CARET, MENU_ITEM_ATTR, MENU_PANEL_ATTR,
  MENU_TICK, MENU_TRIGGER_ATTR, menuClass, menuSlot, type MenuForm,
} from './attrs.js';
import { normalizePopoverMenu, type MenuItemModel, type MenuModel } from './model.js';

/** 触发键上那颗「会弹出东西」的记号（装饰位，`aria-hidden`）。 */
function triggerHtml(m: MenuModel): string {
  return '<button class="' + menuSlot('trigger') + '" type="button"'
    + ' id="' + esc(m.id) + '-btn"'
    + ' popovertarget="' + esc(m.id) + '"'
    + ' aria-haspopup="true" aria-expanded="false"'
    + ' style="anchor-name:' + esc(MENU_ANCHOR_PREFIX + m.id) + '"'
    + ' ' + MENU_TRIGGER_ATTR + '="' + esc(m.id) + '">'
    + esc(m.trigger)
    + '<span aria-hidden="true">' + esc(MENU_CARET) + '</span>'
    + '</button>';
}

/** 一枚菜单项：分组头／发丝线由**前一项到这一项的差**决定（标记里不写「分隔符」）。 */
function itemHtml(item: MenuItemModel, prev: MenuItemModel | undefined): string {
  const parts: string[] = [];
  if (item.group !== undefined && (prev === undefined || prev.group !== item.group)) {
    parts.push('<div class="' + menuSlot('group') + '" role="presentation">' + esc(item.group) + '</div>');
  } else if (item.sep && prev !== undefined) {
    parts.push('<div class="' + menuSlot('sep') + '" role="presentation"></div>');
  }
  const classes = [menuSlot('item')].concat(item.kind === 'action' ? [] : ['is-' + item.kind]).join(' ');
  const role = item.kind === 'check' ? 'menuitemradio' : 'menuitem';
  const attrs: string[] = [
    'class="' + esc(classes) + '"',
    'type="button"',
    'role="' + role + '"',
    MENU_ITEM_ATTR + '="' + esc(item.value) + '"',
  ];
  if (item.kind === 'check') attrs.push('aria-checked="' + (item.checked ? 'true' : 'false') + '"');
  const tick = item.kind === 'check'
    ? '<span class="' + menuSlot('tick') + '" aria-hidden="true">' + (item.checked ? esc(MENU_TICK) : '') + '</span>'
    : '';
  const key = '<span class="' + menuSlot('key') + '">' + esc(item.label)
    + (item.note === undefined ? '' : '<span class="' + menuSlot('note') + '">' + esc(item.note) + '</span>')
    + '</span>';
  const shortcut = item.shortcut === undefined
    ? '' : '<span class="' + menuSlot('shortcut') + '">' + esc(item.shortcut) + '</span>';
  parts.push('<button ' + attrs.join(' ') + '>' + tick + key + shortcut + '</button>');
  return parts.join('');
}

/** 形态 A 的骨架。 */
function renderHug(m: MenuModel): string {
  const body = m.items.map((item, i) => itemHtml(item, i === 0 ? undefined : m.items[i - 1])).join('');
  const panel = '<div class="' + menuSlot('panel') + ' is-' + m.align + '"'
    + ' id="' + esc(m.id) + '"'
    + ' popover="auto" role="menu" aria-label="' + esc(m.menuLabel) + '"'
    + ' style="position-anchor:' + esc(MENU_ANCHOR_PREFIX + m.id) + '"'
    + ' ' + MENU_PANEL_ATTR + '="' + m.align + '">' + body + '</div>';
  return triggerHtml(m) + panel;
}

/** 形态 → 骨架（本件只有一格）。 */
const SKELETONS: Readonly<Record<MenuForm, (m: MenuModel) => string>> = {
  hug: renderHug,
};

/** 渲染一个浮出菜单（纯函数：同样的入参恒产同样的字节；转义只经 `shared/escape.ts`）。 */
export function renderPopoverMenu(input: unknown): string {
  const m = normalizePopoverMenu(input);
  const classes = [menuClass(), 'is-' + m.form]
    .concat(m.extraClass === undefined ? [] : [m.extraClass]).join(' ');
  return '<span class="' + esc(classes) + '" ' + MENU_ATTR + '="' + esc(m.id) + '">'
    + SKELETONS[m.form](m) + '</span>';
}
