/** tooltip · **入参归一化与校验**（把 `any` 与说不出的 `unknown` 挡在门外，产出内部类型）。
 *
 *  三条口径：
 *   1. **非法入参一律 `badInput()`**（抛 `BlocksError`）——不静默降级；
 *   2. **`id` 只许标识符字符**：它同时喂 `id=`／`popovertarget=`／`aria-describedby=`／
 *      **逐实例锚名** `--tooltip-<id>`（**不带 `ilife-`**：那是皮肤 token 的命名空间，锚名是结构不是语言）；
 *   3. **`why` 必填**：形态 B 的识别特征就是那一段「为什么重要」——省掉它，这条气泡就退化成
 *      「再说一遍词面意思」，读的人拿不到新信息（原型墙裁定里这一档正是被选中的理由）。
 */
import { assertPlainObject, badInput, optExtraClass, optText, reqText } from '../shared/validate.js';
import {
  TOOLTIP_BADGES, TOOLTIP_BADGE_TEXT, TOOLTIP_FORMS, TOOLTIP_HINT,
  type TooltipBadge, type TooltipForm, type TooltipInput,
} from './attrs.js';

/** `id` 的字面口径（与同族其余件同一套；本件自足，不从别的件取）。 */
const ID_RE = /^[A-Za-z0-9_\u00a0-\uffff][A-Za-z0-9_-\u00a0-\uffff]*$/;

/** 内部类型。 */
export interface TooltipModel {
  readonly id: string;
  readonly form: TooltipForm;
  readonly word: string;
  readonly title: string;
  readonly text: string;
  readonly why: string;
  readonly badge: TooltipBadge;
  readonly badgeText: string;
  readonly hint: string;
  readonly extraClass?: string;
}

/** 入参归一化（**唯一入口**：`render.ts` 只吃它产出的 `TooltipModel`）。 */
export function normalizeTooltip(input: unknown): TooltipModel {
  assertPlainObject(input, 'renderTooltip: input');
  const raw = input as Record<string, unknown>;

  const form = raw.form === undefined ? TOOLTIP_FORMS[0] : raw.form;
  if (!(TOOLTIP_FORMS as readonly unknown[]).includes(form)) {
    badInput('tooltip: input.form 必须是 ' + TOOLTIP_FORMS.join('／') + ' 之一（本件只落地形态 B「宽气泡」）');
  }
  const badge = raw.badge === undefined ? TOOLTIP_BADGES[0] : raw.badge;
  if (!(TOOLTIP_BADGES as readonly unknown[]).includes(badge)) {
    badInput('tooltip: input.badge 必须是 ' + TOOLTIP_BADGES.join('／') + ' 之一');
  }
  const id = reqText(raw.id, 'tooltip: input.id');
  if (!ID_RE.test(id)) {
    badInput('tooltip: input.id 只许标识符字符（字母／数字／下划线／连字符／汉字）：' + id);
  }
  return {
    id,
    form: form as TooltipForm,
    word: reqText(raw.word, 'tooltip: input.word'),
    title: reqText(raw.title, 'tooltip: input.title'),
    text: reqText(raw.text, 'tooltip: input.text'),
    why: reqText(raw.why, 'tooltip: input.why（形态 B 的识别特征就是这一段：省掉它，这条气泡只剩下词面意思）'),
    badge: badge as TooltipBadge,
    badgeText: optText(raw.badgeText, 'tooltip: input.badgeText') ?? TOOLTIP_BADGE_TEXT[badge as TooltipBadge],
    /* `hint` 给了空串＝不出那一格（`optText` 把空串按「未给」处理 ⇒ 这里显式分辨「给了空串」）。 */
    hint: typeof raw.hint === 'string' && raw.hint.trim() === '' ? '' : (optText(raw.hint, 'tooltip: input.hint') ?? TOOLTIP_HINT),
    extraClass: optExtraClass(raw.extraClass, 'tooltip: input.extraClass'),
  };
}

export type { TooltipInput };
