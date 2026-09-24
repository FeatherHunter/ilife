/** switch-row · **渲染**（纯函数产 HTML；零 DOM、零副作用）。**重做件**。
 *
 *  屏上是一行：**标签 ＋ 说明句**（左）／**固定一枚状态字**（中）／**开关本体**（右）。
 *
 *  为什么长这样（对着重做口径第 1 节逐条来的）：
 *   · **形**：轨道在「关」时是**空心**（透明底 ＋ 一圈发丝线），「开」时**实心**；滑块在关时贴着左边、开时贴着右边
 *     —— 把颜色全拿掉，光看滑块位置也分得出开合（判据真机里就是这么量的）；
 *   · **字**：开关旁边**固定一枚状态字**（`已开`／`已关`／`更新中`），它不靠 CSS 生成内容，就在标记里；
 *     说明句写清**打开会怎样**（`note` 必填，渲染期就拦），禁用态写清**为什么不能开**（`disabledReason` 必填）；
 *   · **色**：`ok` 只是第三样；零阴影下开关的边界靠**一圈发丝线**立（小票纸与大字报刊两套皮肤零阴影、
 *     圆角接近 0，靠"浮起来"表示关系的做法在那儿都会塌）。
 *
 *  语义：整行是一枚 `<label>`，里面是一枚原生 `checkbox[role=switch]`——点哪儿都能翻、`空格`就能翻、
 *  读屏器念得出开合与说明（`aria-describedby` 指向说明句）。
 */
import { esc } from '../shared/escape.js';
import {
  SWITCH_ROW_CHECKED_ATTR,
  SWITCH_ROW_CLASS,
  SWITCH_ROW_DISABLED_ATTR,
  SWITCH_ROW_FORMS,
  SWITCH_ROW_HIT_ATTR,
  SWITCH_ROW_INPUT_ATTR,
  SWITCH_ROW_LABEL_ATTR,
  SWITCH_ROW_LOADING,
  SWITCH_ROW_LOADING_ATTR,
  SWITCH_ROW_NAME_ATTR,
  SWITCH_ROW_NOTE_ATTR,
  SWITCH_ROW_OFF,
  SWITCH_ROW_ON,
  SWITCH_ROW_STATE_ATTR,
  SWITCH_ROW_THUMB_ATTR,
  SWITCH_ROW_TRACK_ATTR,
  switchRowSlot,
  type SwitchRowForm,
} from './attrs.js';
import { normalizeSwitchRow, type SwitchRowModel } from './model.js';

/** 说明句的锚 id（输入的 `aria-describedby` 指向它：**打开会怎样**读屏器也要念出来）。 */
function noteId(name: string): string {
  return SWITCH_ROW_CLASS + '-' + name + '-note';
}

/** 错误说明／禁用原因的锚 id。 */
function errorId(name: string): string {
  return SWITCH_ROW_CLASS + '-' + name + '-error';
}

/** 状态字：**字**这一档（更新中 → 已开／已关）。它永远在，不是 hover 才出现。 */
function stateWord(m: SwitchRowModel): string {
  if (m.loading) return SWITCH_ROW_LOADING;
  return m.checked ? SWITCH_ROW_ON : SWITCH_ROW_OFF;
}

/** 开关本体：`.sw`（命中盒）＞ `.track`（轨道）＞ `.thumb`（滑块）。 */
function switchHtml(m: SwitchRowModel): string {
  const described: string[] = [noteId(m.name)];
  if (m.error !== undefined) described.push(errorId(m.name));
  if (m.disabled && m.disabledReason !== undefined) described.push(errorId(m.name));
  const attrs: string[] = [
    'class="' + switchRowSlot('input') + '"',
    SWITCH_ROW_INPUT_ATTR + '=""',
    'type="checkbox"',
    'role="switch"',
    'aria-label="' + esc(m.label) + '"',
    'aria-describedby="' + esc(described.join(' ')) + '"',
  ];
  if (m.checked) attrs.push('checked');
  if (m.disabled) attrs.push('disabled aria-disabled="true"');
  else if (m.loading) attrs.push('aria-disabled="true" tabindex="-1"');
  return '<span class="' + switchRowSlot('sw') + '" ' + SWITCH_ROW_HIT_ATTR + '="">'
    + '<input ' + attrs.join(' ') + '>'
    + '<span class="' + switchRowSlot('track') + '" ' + SWITCH_ROW_TRACK_ATTR + '="" aria-hidden="true">'
    + '<i class="' + switchRowSlot('thumb') + '" ' + SWITCH_ROW_THUMB_ATTR + '=""></i>'
    + '</span></span>';
}

/** 一行：标签 ＋ 说明句（左）／状态字（中）／开关（右）。 */
function renderRow(m: SwitchRowModel): string {
  const parts: string[] = [];
  parts.push('<label class="' + switchRowSlot('row') + '">');
  parts.push('<span class="' + switchRowSlot('text') + '">'
    + '<b class="' + switchRowSlot('label') + '">' + esc(m.label) + '</b>'
    + '<em class="' + switchRowSlot('note') + '" id="' + esc(noteId(m.name)) + '" '
    + SWITCH_ROW_NOTE_ATTR + '="">' + esc(m.note) + '</em>'
    + '</span>');
  parts.push('<span class="' + switchRowSlot('state') + '" ' + SWITCH_ROW_STATE_ATTR + '="">'
    + esc(stateWord(m)) + '</span>');
  parts.push(switchHtml(m));
  parts.push('</label>');
  if (m.error !== undefined) {
    parts.push('<p class="' + switchRowSlot('error') + '" id="' + esc(errorId(m.name)) + '" role="alert">'
      + esc(m.error) + '</p>');
  } else if (m.disabled && m.disabledReason !== undefined) {
    parts.push('<p class="' + switchRowSlot('error') + '" id="' + esc(errorId(m.name)) + '">'
      + esc(m.disabledReason) + '</p>');
  }
  if (m.caliber !== undefined) {
    parts.push('<p class="' + switchRowSlot('caliber') + '">' + esc(m.caliber) + '</p>');
  }
  return parts.join('');
}

const SKELETONS: Readonly<Record<SwitchRowForm, (m: SwitchRowModel) => string>> = {
  row: renderRow,
};

/** 渲染开关行（纯函数：同样的入参恒产同样的字节；转义只经 `shared/escape.ts`）。 */
export function renderSwitchRow(input: unknown): string {
  const m = normalizeSwitchRow(input);
  const cls = [SWITCH_ROW_CLASS, 'is-' + m.form, m.checked ? 'is-on' : 'is-off'];
  if (m.disabled) cls.push('is-disabled');
  if (m.loading) cls.push('is-loading');
  if (m.error !== undefined) cls.push('is-invalid');
  if (m.extraClass !== undefined) cls.push(m.extraClass);

  const attrs: string[] = [
    'class="' + esc(cls.join(' ')) + '"',
    SWITCH_ROW_NAME_ATTR + '="' + esc(m.name) + '"',
    SWITCH_ROW_CHECKED_ATTR + '="' + (m.checked ? '1' : '0') + '"',
    SWITCH_ROW_LABEL_ATTR + '="' + esc(m.label) + '"',
  ];
  if (m.disabled) attrs.push(SWITCH_ROW_DISABLED_ATTR + '="1"');
  if (m.loading) attrs.push(SWITCH_ROW_LOADING_ATTR + '="1"');
  return '<div ' + attrs.join(' ') + '>' + SKELETONS[m.form](m) + '</div>';
}
