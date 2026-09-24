/** popover-menu · **入参归一化与校验**（把 `any` 与说不出的 `unknown` 挡在门外，产出内部类型）。
 *
 *  三条口径（与同族两件同一套）：
 *   1. **非法入参一律 `badInput()`**（抛 `BlocksError`）——不静默降级；
 *   2. **`id` 只许标识符字符**：它同时喂 `id=`／`popovertarget=`／**逐实例锚名** `--ilife-menu-<id>`；
 *   3. **说不清的档是错**：`kind='check'` 与 `checked` 一起给才算数；`danger` 不许带打勾位。
 */
import { assertPlainObject, badInput, optExtraClass, optText, reqText } from '../shared/validate.js';
import {
  MENU_ALIGNS, MENU_FORMS, MENU_KINDS,
  type MenuAlign, type MenuForm, type MenuKind, type PopoverMenuInput, type PopoverMenuItem,
} from './attrs.js';

/** `id` 的字面口径（与同族两件同一套口径；本件自足，不从别的件取）。 */
const ID_RE = /^[A-Za-z0-9_\u00a0-\uffff][A-Za-z0-9_-\u00a0-\uffff]*$/;

/** 菜单项的内部形状（已归一）。 */
export interface MenuItemModel {
  readonly value: string;
  readonly label: string;
  readonly note?: string;
  readonly shortcut?: string;
  readonly group?: string;
  readonly sep: boolean;
  readonly kind: MenuKind;
  readonly checked: boolean;
}

/** 内部类型。 */
export interface MenuModel {
  readonly id: string;
  readonly form: MenuForm;
  readonly trigger: string;
  readonly menuLabel: string;
  readonly align: MenuAlign;
  readonly items: readonly MenuItemModel[];
  readonly extraClass?: string;
}

/** 菜单项：逐项校验；`value` 菜单内唯一；`check`／`danger` 两档不许打架。 */
function reqItems(value: unknown): readonly MenuItemModel[] {
  if (!Array.isArray(value) || value.length === 0) {
    badInput('popover-menu: input.items 必须是非空数组（一枚都没有的菜单不发）');
  }
  const seen = new Set<string>();
  const out: MenuItemModel[] = [];
  for (let i = 0; i < value.length; i += 1) {
    assertPlainObject(value[i], 'popover-menu: input.items[' + i + ']');
    const raw = value[i] as Record<string, unknown>;
    const kind = raw.kind === undefined ? 'action' : raw.kind;
    if (!(MENU_KINDS as readonly unknown[]).includes(kind)) {
      badInput('popover-menu: input.items[' + i + '].kind 必须是 ' + MENU_KINDS.join('／') + ' 之一');
    }
    if (raw.checked !== undefined && typeof raw.checked !== 'boolean') {
      badInput('popover-menu: input.items[' + i + '].checked 必须是布尔值');
    }
    if (raw.sep !== undefined && typeof raw.sep !== 'boolean') {
      badInput('popover-menu: input.items[' + i + '].sep 必须是布尔值');
    }
    if (raw.checked === true && kind !== 'check') {
      /* 打勾位只归 `check` 档：别的档打了勾，读的人分不清是「当前项」还是「选中的项」。 */
      badInput('popover-menu: items[' + i + '].checked 只对 kind=check 有效');
    }
    const item: MenuItemModel = {
      value: reqText(raw.value, 'popover-menu: input.items[' + i + '].value'),
      label: reqText(raw.label, 'popover-menu: input.items[' + i + '].label'),
      note: optText(raw.note, 'popover-menu: input.items[' + i + '].note'),
      shortcut: optText(raw.shortcut, 'popover-menu: input.items[' + i + '].shortcut'),
      group: optText(raw.group, 'popover-menu: input.items[' + i + '].group'),
      sep: raw.sep === true,
      kind: kind as MenuKind,
      checked: raw.checked === true,
    };
    if (seen.has(item.value)) badInput('popover-menu: items 的 value 必须唯一：' + item.value);
    seen.add(item.value);
    out.push(item);
  }
  return out;
}

/** 入参归一化（**唯一入口**：`render.ts` 只吃它产出的 `MenuModel`）。 */
export function normalizePopoverMenu(input: unknown): MenuModel {
  assertPlainObject(input, 'renderPopoverMenu: input');
  const raw = input as Record<string, unknown>;

  const form = raw.form === undefined ? MENU_FORMS[0] : raw.form;
  if (!(MENU_FORMS as readonly unknown[]).includes(form)) {
    badInput('popover-menu: input.form 必须是 ' + MENU_FORMS.join('／') + ' 之一（本件只落地形态 A「贴着按钮」）');
  }
  const align = raw.align === undefined ? MENU_ALIGNS[1] : raw.align;
  if (!(MENU_ALIGNS as readonly unknown[]).includes(align)) {
    badInput('popover-menu: input.align 必须是 ' + MENU_ALIGNS.join('／') + ' 之一');
  }
  const id = reqText(raw.id, 'popover-menu: input.id');
  if (!ID_RE.test(id)) {
    badInput('popover-menu: input.id 只许标识符字符（字母／数字／下划线／连字符／汉字）：' + id);
  }
  const trigger = reqText(raw.trigger, 'popover-menu: input.trigger');
  return {
    id,
    form: form as MenuForm,
    trigger,
    menuLabel: optText(raw.menuLabel, 'popover-menu: input.menuLabel') ?? trigger,
    align: align as MenuAlign,
    items: reqItems(raw.items),
    extraClass: optExtraClass(raw.extraClass, 'popover-menu: input.extraClass'),
  };
}

export type { PopoverMenuInput, PopoverMenuItem };
