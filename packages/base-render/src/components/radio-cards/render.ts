/** radio-cards · **渲染**（纯函数产 HTML；零 DOM、零副作用）。
 *
 *  —— 形态 A：竖排卡（图标位 ＋ 标题 ＋ 读数 ＋ 卡里一行说明）——
 *
 *  骨架（顺序固定，判据逐槽断）：
 *    `legend`（组名 ＋ 次段）→ `list`（`role="radiogroup"`，逐张 `card`）→ 可选的 `error`。
 *  一张卡：`<label>`（**整卡是命中区**）里放 原生 `<input type="radio">` ＋ 标记位 ＋ 图标位 ＋ 标题/读数 ＋ 说明。
 *
 *  三条硬口径：
 *   · **真单选语义**：原生 `<input type="radio">`（同 `name` 成一组）＋ 容器 `role="radiogroup"`；
 *     视觉隐藏走 `opacity:0` ＋ 1px 盒（**不是** `display:none`——那会把键盘可达性一起干掉）；
 *   · **选中态至少两重标记**：左端 4px 竖条（样式画的形状）＋ 标记位里的对钩 `✓`（字）；
 *     边框与底色只是第三重（颜色）；皮肤「大字报刊」下强调色＝墨黑时，前两重照样读得出；
 *   · 缺的槽**不留空位**、不拿占位符顶替；空数组出**设计过的空态**，不是空白。
 */
import { esc } from '../shared/escape.js';
import {
  RADIO_CARDS_CLASS,
  RADIO_CARDS_FORM_ATTR,
  RADIO_CARDS_FORMS,
  RADIO_CARDS_LOADING_ATTR,
  RADIO_CARDS_NAME_ATTR,
  RADIO_CARDS_OPTION_ATTR,
  RADIO_CARDS_REQUIRED_ATTR,
  RADIO_CARDS_VALUE_ATTR,
  radioCardsSlot,
  type RadioCardsForm,
} from './attrs.js';
import { normalizeRadioCards, radioCardsErrorId, type RadioCardsCard, type RadioCardsModel } from './model.js';

/** 组名行：主段（组名）＋ 次段（补充说明，如「这一笔记到哪儿」）。 */
function legendHtml(m: RadioCardsModel): string {
  const parts: string[] = ['<p class="' + radioCardsSlot('legend') + '">'];
  parts.push('<b class="' + radioCardsSlot('legend-title') + '">' + esc(m.label) + '</b>');
  if (m.hint !== undefined) parts.push('<span class="' + radioCardsSlot('legend-hint') + '">' + esc(m.hint) + '</span>');
  parts.push('</p>');
  return parts.join('');
}

/** 读数：小标签 ＋ 等宽数字（窄容器下由 `@container` 让它自己另起一行）。 */
function readingHtml(card: RadioCardsCard, loadingText: string, loading: boolean): string {
  if (card.reading === undefined && card.readingLabel === undefined) return '';
  const parts: string[] = ['<span class="' + radioCardsSlot('reading') + '">'];
  if (card.readingLabel !== undefined) {
    parts.push('<i class="' + radioCardsSlot('reading-label') + '">' + esc(card.readingLabel) + '</i>');
  }
  /* 加载态：**原地换字**（读数位还在、盒模型不动，屏上不跳版）。 */
  parts.push(esc(loading ? loadingText : (card.reading === undefined ? '' : card.reading)));
  parts.push('</span>');
  return parts.join('');
}

/** 一张卡（`<label>`：整卡是命中区 ⇒ 触控目标 = 卡，恒 ≥44px 高）。 */
function cardHtml(m: RadioCardsModel, card: RadioCardsCard): string {
  const inputDisabled = card.disabled || m.loading;
  const checked = m.value !== null && m.value === card.value;
  /* 状态一律写在**原生面**上，不另挂 `is-*` 修饰类：勾选＝`input:checked`、禁用＝`input[disabled]`、
     加载＝根上的 `data-ilife-radio-loading`。两三个字母的类名是全仓共享的拼写空间：
     重名就会被别件的选择器命中（判据「跨件零交集」会红）。 */
  const cls = radioCardsSlot('card');

  const input: string[] = ['<input type="radio"', ' name="' + esc(m.name) + '"', ' value="' + esc(card.value) + '"'];
  if (checked) input.push(' checked');
  if (inputDisabled) input.push(' disabled');
  if (m.required) input.push(' aria-required="true"');
  input.push('>');

  const parts: string[] = [];
  parts.push('<label class="' + cls + '" ' + RADIO_CARDS_OPTION_ATTR + '="' + esc(card.value) + '">');
  parts.push(input.join(''));
  parts.push('<span class="' + radioCardsSlot('mk') + '" aria-hidden="true"></span>');
  if (card.lead !== undefined) {
    /* 图标位是**记号**（1–2 字），不进无障碍树：title 已经把话说全了，重复读一遍是噪声。 */
    parts.push('<span class="' + radioCardsSlot('lead') + '" aria-hidden="true">' + esc(card.lead) + '</span>');
  }
  parts.push('<span class="' + radioCardsSlot('line') + '">');
  parts.push('<b class="' + radioCardsSlot('title') + '">' + esc(card.title) + '</b>');
  parts.push(readingHtml(card, m.loadingText, m.loading));
  parts.push('</span>');
  if (card.desc !== undefined || card.disabledReason !== undefined) {
    /* 说明与"为什么不能选"住在**同一个**脚槽里（一个格位一个元素：两枚各自占位会重叠）。 */
    parts.push('<span class="' + radioCardsSlot('desc') + '">'
      + (card.desc === undefined ? '' : esc(card.desc))
      + (card.disabledReason === undefined
        ? ''
        : '<i class="' + radioCardsSlot('why') + '">' + esc(card.disabledReason) + '</i>')
      + '</span>');
  }
  parts.push('</label>');
  return parts.join('');
}

/** 选项列（`role="radiogroup"`）：三个状态各出各的骨架，互不叠。 */
function listHtml(m: RadioCardsModel): string {
  const attrs: string[] = [
    'class="' + radioCardsSlot('list') + '"',
    'role="radiogroup"',
    'aria-label="' + esc(m.label) + '"',
  ];
  if (m.required) attrs.push('aria-required="true"');
  if (m.error !== undefined) {
    attrs.push('aria-invalid="true"');
    attrs.push('aria-describedby="' + esc(radioCardsErrorId(m.name)) + '"');
  }
  if (m.loading) attrs.push('aria-busy="true"');
  return '<div ' + attrs.join(' ') + '>' + m.cards.map((c) => cardHtml(m, c)).join('') + '</div>';
}

/** 形态 A 的骨架（本件今天只有这一格）。三个"没有正常内容"的状态各出各的骨架，互不叠：
 *  · 有选项 ⇒ 出选项列（加载态下读数**原地换字**，盒模型不动、不跳版）；
 *  · 一个选项都没有 ＋ `loading` ⇒ 出「正在读取」（还什么都不知道）；
 *  · 一个选项都没有 ＋ 不加载 ⇒ 出**设计过的空态**（说清"这里没有东西"，不是留白）。 */
function renderCards(m: RadioCardsModel): string {
  const parts: string[] = [legendHtml(m)];
  if (m.cards.length > 0) {
    parts.push(listHtml(m));
  } else if (m.loading) {
    parts.push('<p class="' + radioCardsSlot('loading') + '" role="status">' + esc(m.loadingText) + '</p>');
  } else {
    parts.push('<p class="' + radioCardsSlot('empty') + '" role="status">' + esc(m.emptyText) + '</p>');
  }
  if (m.error !== undefined) {
    parts.push('<p class="' + radioCardsSlot('error') + '" id="' + esc(radioCardsErrorId(m.name)) + '">' + esc(m.error) + '</p>');
  }
  return parts.join('');
}

/** 形态 → 骨架（加第二形态就是加一支）。 */
const SKELETONS: Readonly<Record<RadioCardsForm, (m: RadioCardsModel) => string>> = {
  cards: renderCards,
};

/** 渲染单选卡组（纯函数：同样的入参恒产同样的字节；转义只经 `shared/escape.ts`）。 */
export function renderRadioCards(input: unknown): string {
  const m = normalizeRadioCards(input);
  const extra = m.extraClass === undefined ? '' : ' ' + m.extraClass;
  const attrs: string[] = [
    'class="' + RADIO_CARDS_CLASS + ' is-' + m.form + extra + '"',
    RADIO_CARDS_NAME_ATTR + '="' + esc(m.name) + '"',
    RADIO_CARDS_FORM_ATTR + '="' + esc(m.form) + '"',
  ];
  if (m.value !== null) attrs.push(RADIO_CARDS_VALUE_ATTR + '="' + esc(m.value) + '"');
  if (m.required) attrs.push(RADIO_CARDS_REQUIRED_ATTR + '="1"');
  if (m.loading) attrs.push(RADIO_CARDS_LOADING_ATTR + '="1"');
  return '<div ' + attrs.join(' ') + '>' + SKELETONS[m.form](m) + '</div>';
}
