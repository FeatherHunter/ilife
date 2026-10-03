/** prompt-box · **常量与渲染**（本件唯一的常量出处 ＋ 纯函数产 HTML；零 DOM）。
 *
 *  一句话：**一段拿得走的提示文本**——标题 ＋ 等宽正文 ＋ 一枚复制按钮。
 *  落点是「填参数 → 生成提示 → 复制出去」这条链的可视化一端：页面把要说的话印出来，
 *  点复制后由运行时（`runtime.ts`）把正文交出去并派发一条事件，落库归页面自己。
 *
 *  只落一种形态（`card`）：标题在上、正文居中、按钮在下；不做第二种骨架。
 */
import { esc } from '../shared/escape.js';
import { assertPlainObject, badInput, optExtraClass, optText, reqText } from '../shared/validate.js';

/** 本件的类名根（标记与样式共用这一份拼法）。 */
export const PROMPT_BOX_CLASS = 'ilife-block-prompt-box';

/** 槽位闭集（各槽的类名只经 `promptBoxSlot()` 拼）。 */
export const PROMPT_BOX_SLOTS = [
  /** 标题（「复制提示给 AI」这类短句）。 */
  'head',
  /** 正文（等宽 `<pre>`：换行与空格原样保留）。 */
  'body',
  /** 复制按钮（真 `<button>`；点击的翻译归运行时）。 */
  'copy',
  /** 按钮行（按钮 ＋ 小字横排；窄容器自动换行）。 */
  'action',
  /** 按钮旁那句小字（用法说明；复制结果的回执由事件带回页面写）。 */
  'hint',
] as const;
export type PromptBoxSlot = (typeof PROMPT_BOX_SLOTS)[number];

/** 槽类的唯一拼法。 */
export function promptBoxSlot(slot: PromptBoxSlot, prefix = 'ilife-'): string {
  return prefix + 'block-prompt-box-' + slot;
}

/** 形态闭集：
 *  · `card`＝标题 ＋ 等宽正文 ＋ 复制按钮一张卡（本件原样）；
 *  · `paper`＝**判地票据纸那枚暖底纯文本框**（`x01` 判地 `.prompt-box`：底 `#fbf7ec`、边 1px `--line`、
 *    圆角 12px、内距 `12px 13px 11px`、13.5px／行高 1.7、字色 `#5f574a`、`white-space:pre-wrap`）——
 *    没有标题、没有复制按钮（判地那枚就是一段留白文本）。 */
export const PROMPT_BOX_FORMS = ['card', 'paper'] as const;
export type PromptBoxForm = (typeof PROMPT_BOX_FORMS)[number];

/** 根的发现锚（运行时的 `closest` 锚）。 */
export const PROMPT_BOX_ROOT_ATTR = 'data-ilife-prompt-box';
/** 复制按钮的发现锚。 */
export const PROMPT_BOX_COPY_ATTR = 'data-ilife-prompt-copy';
/** 运行时幂等标记（重复注入只绑一次）。 */
export const PROMPT_BOX_BOUND_ATTR = 'data-ilife-prompt-bound';
/** 复制事件（冒泡 `CustomEvent`，`detail = { label, chars, ok }`）。 */
export const PROMPT_BOX_EVENT_COPY = 'ilife:prompt-copy';
/** 复制按钮的缺省字（调用方不给就用它）。 */
export const PROMPT_BOX_COPY_TEXT = '复制';

/** 提示框的入参。`text` 必填——没有正文的提示框是个空壳。 */
export interface PromptBoxInput {
  /** 提示正文（非空；换行与空格原样保留）。 */
  readonly text: string;
  /** 标题（「复制提示给 AI」）；不给＝只出正文与按钮。 */
  readonly label?: string;
  /** 复制按钮的字；缺省 `复制`。 */
  readonly copyText?: string;
  /** 按钮旁那句小字（用法说明）。 */
  readonly hint?: string;
  /** 形态键（闭集，缺省 `card`）。 */
  readonly form?: PromptBoxForm;
  /** 附加类名（空格分隔；逐个过类名正则）。 */
  readonly extraClass?: string;
}

/** 根对象只许带的键（未知键一律拒：静默吞掉＝调用方拼错字段名还绿）。 */
const ROOT_KEYS: readonly string[] = ['text', 'label', 'copyText', 'hint', 'form', 'extraClass'];

function assertKeys(value: object, allowed: readonly string[], field: string): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) badInput(field + ' 不认识这个键：' + key);
  }
}

function reqForm(value: unknown): PromptBoxForm {
  if (value === 'card' || value === 'paper') return value;
  badInput('form 必须是 ' + PROMPT_BOX_FORMS.join('／'));
}

/** 渲染提示框（纯函数：同样的入参恒产同样的字节；用户串只经 `esc`）。 */
export function renderPromptBox(input: unknown): string {
  assertPlainObject(input, 'input');
  const raw = input as Record<string, unknown>;
  assertKeys(raw, ROOT_KEYS, 'input');
  const text = reqText(raw.text, 'text');
  const label = raw.label === undefined ? undefined : optText(raw.label, 'label');
  const copy = raw.copyText === undefined ? PROMPT_BOX_COPY_TEXT : reqText(raw.copyText, 'copyText');
  const hint = raw.hint === undefined ? undefined : optText(raw.hint, 'hint');
  const form = raw.form === undefined ? 'card' : reqForm(raw.form);
  const extra = raw.extraClass === undefined ? undefined : optExtraClass(raw.extraClass, 'extraClass');
  // paper 形态**只出正文**：判地那枚没有标题与复制按钮；给这三样会被静默丢掉 ⇒ 当场拒，
  // 免得调用方以为印了个按钮、页面上却没有（静默吞掉＝拼错字段名还绿）。
  if (form === 'paper' && (label !== undefined || raw.copyText !== undefined || hint !== undefined)) {
    badInput('form:paper 不带 label／copyText／hint（判地那枚是纯文本框）');
  }
  if (form === 'paper') {
    return '<div class="' + PROMPT_BOX_CLASS + ' is-paper'
      + (extra === undefined ? '' : ' ' + extra) + '" ' + PROMPT_BOX_ROOT_ATTR + '="1">'
      + '<p class="' + promptBoxSlot('body') + '">' + esc(text) + '</p></div>';
  }
  const head = label === undefined
    ? '' : '<p class="' + promptBoxSlot('head') + '">' + esc(label) + '</p>';
  const hintHtml = hint === undefined
    ? '' : '<span class="' + promptBoxSlot('hint') + '">' + esc(hint) + '</span>';
  return '<div class="' + PROMPT_BOX_CLASS + ' is-' + form + (extra === undefined ? '' : ' ' + extra) + '"'
    + ' ' + PROMPT_BOX_ROOT_ATTR + '="1">'
    + head
    + '<pre class="' + promptBoxSlot('body') + '">' + esc(text) + '</pre>'
    + '<span class="' + promptBoxSlot('action') + '">'
    + '<button type="button" class="' + promptBoxSlot('copy') + '"'
    + ' ' + PROMPT_BOX_COPY_ATTR + '="1">' + esc(copy) + '</button>'
    + hintHtml + '</span></div>';
}
