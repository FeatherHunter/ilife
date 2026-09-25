/** undo-timeline · **渲染**（纯函数产 HTML；零 DOM、零副作用）。
 *
 *  —— 形态 `track`：一条轨 ——
 *  一列改动往下排，每行四格：**时刻 ‖ 竖轨 ‖ 三行文字 ‖ 那一枚动作**。
 *  三行文字写清原型钉住的三样：`say`（谁改了什么）／`eff`（动了什么读数，逐条摆开）／
 *  `note` 与 `tag`（补充与状态）。**能不能撤**同时由三样说：按钮上的字、状态片上的字、
 *  轨上圆点的形（三态三形）——**色只是第三重**。
 *
 *  —— 形态 `impact`：一次改动的回滚单 ——
 *  一张卡：头（这是哪次改动、在哪儿改的）→ 影响面清单（**整行是 `<label>`**，勾哪几项就撤哪几项）
 *  → 页脚（勾了几项的结论 ＋ 取消 ＋ 撤销这 N 项）。**`track` 的每一行摊开的就是同一块**。
 *
 *  四条硬口径（判据断的就是它们）：
 *   · **撤销能用手点做完**：每一枚动作都是真 `<button>`；标记里没有键帽／键名／方向键那一路；
 *   · **三态不靠颜色**：片上的字 ＋ 圆点的形 ＋ 动作句的删除线 ＋ 按钮上的字，至少两样同时在；
 *   · **一次只开一块**：`track` 的行里最多摊开一块回滚单（`openKey` 定渲染时那一块）；
 *   · **时间、条数、金额永不 `…` 截断**：长了折行（`overflow-wrap:anywhere`）。
 */
import { esc } from '../shared/escape.js';
import {
  UNDO_TIMELINE_ATTR,
  UNDO_TIMELINE_BUSY_ATTR,
  UNDO_TIMELINE_BUSY_PRE,
  UNDO_TIMELINE_CANCEL_ATTR,
  UNDO_TIMELINE_CLASS,
  UNDO_TIMELINE_CLOSE_ATTR,
  UNDO_TIMELINE_FORM_ATTR,
  UNDO_TIMELINE_GO_ATTR,
  UNDO_TIMELINE_ITEM_ATTR,
  UNDO_TIMELINE_KEY_ATTR,
  UNDO_TIMELINE_LOCKED_SEP,
  UNDO_TIMELINE_NOTE_ATTR,
  UNDO_TIMELINE_ON_ATTR,
  UNDO_TIMELINE_PICK_ATTR,
  UNDO_TIMELINE_RESTORE_ATTR,
  UNDO_TIMELINE_ROLL_ATTR,
  UNDO_TIMELINE_STATE_ATTR,
  UNDO_TIMELINE_STATE_TAG,
  UNDO_TIMELINE_SUBMIT_ATTR,
  UNDO_TIMELINE_SUBMIT_POST,
  UNDO_TIMELINE_SUBMIT_PRE,
  UNDO_TIMELINE_SUBMIT_ZERO,
  UNDO_TIMELINE_SUM_ATTR,
  UNDO_TIMELINE_SUM_MID,
  UNDO_TIMELINE_SUM_PRE,
  UNDO_TIMELINE_SUM_ZERO,
  UNDO_TIMELINE_WHY_TEXT,
  undoTimelineSlot,
  type UndoTimelineForm,
} from './attrs.js';
import {
  undoTimelineErrorId,
  undoTimelineHintId,
  undoTimelinePickId,
  undoTimelineSumId,
  undoTimelineTagId,
  normalizeUndoTimeline,
  type UndoTimelineEntryModel,
  type UndoTimelineImpactModel,
  type UndoTimelineModel,
} from './model.js';

/** 一枚按钮的那两枚字：正常那枚**占着按钮那一格**，忙碌那枚住在它里面、绝对定位在它这块上
 *  ⇒ 忙碌那枚（`正在 ＋ 按钮字`）一个字都不参与按钮的固有宽，换字时按钮尺寸纹丝不动。 */
function buttonHtml(cls: string, text: string, busy: boolean): string {
  const parts: string[] = ['<span class="' + undoTimelineSlot('label') + '">' + esc(text)];
  if (busy) {
    parts.push('<span class="' + undoTimelineSlot('busy') + '" aria-hidden="true">'
      + esc(UNDO_TIMELINE_BUSY_PRE + text) + '</span>');
  }
  parts.push('</span>');
  return parts.join('');
}

/** 一条读数：读数名 ＋ 改前的值（删除线）＋ 箭头 ＋ 改后的值（加粗）。 */
function readingHtml(r: UndoTimelineEntryModel['readings'][number]): string {
  const parts: string[] = ['<span class="' + undoTimelineSlot('rdg') + '">'];
  if (r.label !== undefined) {
    parts.push('<span class="' + undoTimelineSlot('rlabel') + '">' + esc(r.label) + '</span>');
  }
  parts.push('<s class="' + undoTimelineSlot('from') + '">' + esc(r.from) + '</s>');
  parts.push('<span class="' + undoTimelineSlot('arrow') + '" aria-hidden="true">→</span>');
  parts.push('<b class="' + undoTimelineSlot('to') + '">' + esc(r.to) + '</b>');
  parts.push('</span>');
  return parts.join('');
}

/** 状态片：三态各自的那句话（`undoable` 缺省不出片，出的是调用方给的「会连带重算…」）。
 *  **色只是第三重**：片上的字是第二重（`undoed` 写「已撤销，读数已还原」、`locked` 写「不可撤＋为什么」），
 *  第三重是轨迹上那枚圆点的形。 */
function tagOf(e: UndoTimelineEntryModel): { readonly text: string; readonly warn: boolean } | undefined {
  if (e.state === 'locked') {
    return { text: (e.tag ?? UNDO_TIMELINE_STATE_TAG.locked) + UNDO_TIMELINE_LOCKED_SEP + (e.lockedReason ?? ''), warn: false };
  }
  if (e.state === 'undone') return { text: e.tag ?? UNDO_TIMELINE_STATE_TAG.undone, warn: false };
  if (e.tag === undefined) return undefined;
  return { text: e.tag, warn: true };
}

/** 影响面清单里的一行：**整行是 `<label>`**（点这一行的任何地方都算勾/取消）。 */
function impactRowHtml(row: UndoTimelineImpactModel['rows'][number]): string {
  const parts: string[] = ['<label class="' + undoTimelineSlot('item') + (row.locked ? ' is-off' : '') + '">'];
  parts.push('<span class="' + undoTimelineSlot('check') + '">');
  parts.push('<input type="checkbox"' + (row.checked ? ' checked' : '') + (row.locked ? ' disabled' : '')
    + ' value="' + esc(row.key) + '" ' + UNDO_TIMELINE_ITEM_ATTR + '="' + esc(row.key) + '"'
    + (row.checked ? ' ' + UNDO_TIMELINE_ON_ATTR + '="1"' : '') + '>');
  parts.push('<span class="' + undoTimelineSlot('box') + '" aria-hidden="true"></span>');
  parts.push('</span>');
  parts.push('<span class="' + undoTimelineSlot('ibody') + '">');
  parts.push('<b class="' + undoTimelineSlot('ititle') + '">' + esc(row.title) + '</b>');
  if (row.note !== undefined) parts.push('<i class="' + undoTimelineSlot('inote') + '">' + esc(row.note) + '</i>');
  if (row.lockedReason !== undefined) {
    parts.push('<i class="' + undoTimelineSlot('why') + '">' + esc(UNDO_TIMELINE_WHY_TEXT + row.lockedReason) + '</i>');
  }
  parts.push('</span>');
  if (row.count !== undefined) parts.push('<span class="' + undoTimelineSlot('count') + '">' + esc(row.count) + '</span>');
  parts.push('</label>');
  return parts.join('');
}

/** 页脚那句结论的**文字**：前半段按勾了几项现算，后半段是调用方给的注（缺省那句）。
 *  运行时段按同一个口径重算（`data-ilife-undo-sum` 那枚元素的 `textContent` 归它改）。 */
function sumText(checked: number, note: string): string {
  if (checked === 0) return UNDO_TIMELINE_SUM_ZERO;
  return UNDO_TIMELINE_SUM_PRE + String(checked) + UNDO_TIMELINE_SUM_MID + note;
}

/** 主按钮那枚字：按勾了几项算（一项都没勾时它按不动）。 */
function submitText(checked: number): string {
  return checked === 0 ? UNDO_TIMELINE_SUBMIT_ZERO : UNDO_TIMELINE_SUBMIT_PRE + String(checked) + UNDO_TIMELINE_SUBMIT_POST;
}

/** 一张回滚单的三块：头 → 影响面清单 → 页脚。
 *  `key`＝这次改动的机器键（`track` 的行用行键，`impact` 用 `changeKey`）；
 *  `inPick`＝这张单是不是摊在某一行里（摊着的那张，「取消」是**收起**；单独成件的那张，「取消」只派发事件）。 */
function impactInnerHtml(m: UndoTimelineModel, p: UndoTimelineImpactModel, key: string, inPick: boolean): string {
  const parts: string[] = [];
  parts.push('<div class="' + undoTimelineSlot('pkh') + '">');
  parts.push('<b class="' + undoTimelineSlot('pkt') + '">' + esc(p.title) + '</b>');
  if (p.note !== undefined) parts.push('<span class="' + undoTimelineSlot('pkn') + '">' + esc(p.note) + '</span>');
  parts.push('</div>');
  parts.push('<div class="' + undoTimelineSlot('picks') + '">');
  for (const row of p.rows) parts.push(impactRowHtml(row));
  parts.push('</div>');
  parts.push('<div class="' + undoTimelineSlot('foot') + '">');
  parts.push('<span class="' + undoTimelineSlot('sum') + '" id="' + esc(undoTimelineSumId(m.name, key)) + '"'
    + ' ' + UNDO_TIMELINE_SUM_ATTR + '="1" ' + UNDO_TIMELINE_NOTE_ATTR + '="' + esc(p.sumNote) + '"'
    + ' aria-live="polite">' + esc(sumText(p.checkedCount, p.sumNote)) + '</span>');
  parts.push('<button type="button" class="' + undoTimelineSlot('bt') + ' ' + undoTimelineSlot('cancel') + '"'
    + (inPick ? ' ' + UNDO_TIMELINE_CLOSE_ATTR + '="' + esc(key) + '"' : ' ' + UNDO_TIMELINE_CANCEL_ATTR + '="1"')
    + '>' + buttonHtml('cancel', p.cancelLabel, false) + '</button>');
  parts.push('<button type="button" class="' + undoTimelineSlot('bt') + ' is-primary ' + undoTimelineSlot('submit') + '"'
    + ' ' + UNDO_TIMELINE_SUBMIT_ATTR + '="' + esc(key) + '"'
    + ' aria-describedby="' + esc(undoTimelineSumId(m.name, key)) + '"'
    + (p.checkedCount === 0 ? ' disabled' : '') + '>'
    + buttonHtml('submit', submitText(p.checkedCount), false) + '</button>');
  parts.push('</div>');
  return parts.join('');
}

/** 一行（一条改动）：时刻 ‖ 竖轨 ‖ 三行文字 ‖ 那一枚动作（＋ 就地摊开的回滚单）。 */
function rowHtml(m: UndoTimelineModel, e: UndoTimelineEntryModel): string {
  const parts: string[] = ['<div class="' + undoTimelineSlot('row') + ' is-' + e.state + '"'
    + ' ' + UNDO_TIMELINE_KEY_ATTR + '="' + esc(e.key) + '"'
    + ' ' + UNDO_TIMELINE_STATE_ATTR + '="' + esc(e.state) + '">'];
  parts.push('<span class="' + undoTimelineSlot('time') + '">' + esc(e.time) + '</span>');
  parts.push('<span class="' + undoTimelineSlot('rail') + '" aria-hidden="true"><i class="'
    + undoTimelineSlot('dot') + '"></i></span>');
  parts.push('<span class="' + undoTimelineSlot('body') + '">');
  parts.push('<b class="' + undoTimelineSlot('say') + '">' + esc(e.say) + '</b>');
  if (e.readings.length > 0) {
    parts.push('<span class="' + undoTimelineSlot('eff') + '">'
      + e.readings.map((r) => readingHtml(r)).join('') + '</span>');
  }
  if (e.note !== undefined) parts.push('<span class="' + undoTimelineSlot('note') + '">' + esc(e.note) + '</span>');
  const tag = tagOf(e);
  if (tag !== undefined) {
    parts.push('<span class="' + undoTimelineSlot('tag') + (tag.warn ? ' is-warn' : '') + '"'
      + ' id="' + esc(undoTimelineTagId(m.name, e.key)) + '">' + esc(tag.text) + '</span>');
  }
  parts.push('</span>');
  parts.push('<span class="' + undoTimelineSlot('act') + '">');
  if (e.state === 'undone') {
    parts.push('<button type="button" class="' + undoTimelineSlot('bt') + ' ' + undoTimelineSlot('go') + '"'
      + ' ' + UNDO_TIMELINE_RESTORE_ATTR + '="' + esc(e.key) + '"'
      + (e.busy ? ' disabled aria-busy="true" ' + UNDO_TIMELINE_BUSY_ATTR + '="1"' : '') + '>'
      + buttonHtml('go', e.go, e.busy) + '</button>');
  } else {
    const open = m.openKey === e.key;
    /* 「为什么按不动」可能有三处，**一处都不许少**：这一条的错态句、不可撤的原因片、卡底那句提示。 */
    const why: string[] = [];
    if (e.impact !== undefined) {
      parts.push('<button type="button" class="' + undoTimelineSlot('bt') + ' '
        + (e.state === 'undoable' ? 'is-primary ' : '') + undoTimelineSlot('go') + '"'
        + ' ' + UNDO_TIMELINE_GO_ATTR + '="' + esc(e.key) + '"'
        + ' aria-expanded="' + (open ? 'true' : 'false') + '"'
        + ' aria-controls="' + esc(undoTimelinePickId(m.name, e.key)) + '"');
    } else {
      parts.push('<button type="button" class="' + undoTimelineSlot('bt') + ' '
        + (e.state === 'undoable' ? 'is-primary ' : '') + undoTimelineSlot('go') + '"'
        + ' ' + UNDO_TIMELINE_GO_ATTR + '="' + esc(e.key) + '"');
    }
    if (e.error !== undefined) why.push(undoTimelineErrorId(m.name, e.key));
    if (e.state === 'locked') why.push(undoTimelineTagId(m.name, e.key));
    else if (e.error === undefined && m.hint !== undefined) why.push(undoTimelineHintId(m.name));
    if (why.length > 0) parts.push(' aria-describedby="' + esc(why.join(' ')) + '"');
    if (e.state === 'locked' || e.busy) parts.push(' disabled');
    if (e.busy) parts.push(' aria-busy="true" ' + UNDO_TIMELINE_BUSY_ATTR + '="1"');
    parts.push('>' + buttonHtml('go', e.go, e.busy) + '</button>');
  }
  if (e.error !== undefined) {
    parts.push('<p class="' + undoTimelineSlot('error') + '" id="' + esc(undoTimelineErrorId(m.name, e.key))
      + '" role="alert">' + esc(e.say) + '：' + esc(e.error) + '</p>');
  }
  parts.push('</span>');
  if (e.impact !== undefined) {
    parts.push('<div class="' + undoTimelineSlot('pick') + '" id="' + esc(undoTimelinePickId(m.name, e.key)) + '"'
      + ' ' + UNDO_TIMELINE_PICK_ATTR + '="' + esc(e.key) + '"'
      + ' role="group" aria-label="' + esc(e.impact.title) + '"' + (m.openKey === e.key ? '' : ' hidden') + '>'
      + impactInnerHtml(m, e.impact, e.key, true) + '</div>');
  }
  parts.push('</div>');
  return parts.join('');
}

/** 形态 `track`：卡头 → 那一列改动（或空态）→ 页脚（整段回滚）→ 卡底那句提示。 */
function renderTrack(m: UndoTimelineModel): string {
  const parts: string[] = [];
  parts.push('<div class="' + undoTimelineSlot('head') + '">');
  parts.push('<b class="' + undoTimelineSlot('title') + '">' + esc(m.title) + '</b>');
  if (m.cap !== undefined) parts.push('<span class="' + undoTimelineSlot('cap') + '">' + esc(m.cap) + '</span>');
  parts.push('</div>');
  parts.push('<div class="' + undoTimelineSlot('list') + '">');
  if (m.entries.length === 0) {
    parts.push('<p class="' + undoTimelineSlot('empty') + '" role="status">' + esc(m.emptyText) + '</p>');
  } else {
    for (const e of m.entries) parts.push(rowHtml(m, e));
  }
  parts.push('</div>');
  if (m.rollback !== undefined) {
    parts.push('<div class="' + undoTimelineSlot('foot') + '">');
    if (m.rollback.note !== undefined) {
      parts.push('<span class="' + undoTimelineSlot('sum') + '">' + esc(m.rollback.note) + '</span>');
    }
    parts.push('<button type="button" class="' + undoTimelineSlot('bt') + ' ' + undoTimelineSlot('roll') + '"'
      + ' ' + UNDO_TIMELINE_ROLL_ATTR + '="' + esc(m.rollback.label) + '">'
      + buttonHtml('roll', m.rollback.label, false) + '</button>');
    parts.push('</div>');
  }
  if (m.hint !== undefined) {
    parts.push('<p class="' + undoTimelineSlot('hint') + '" id="' + esc(undoTimelineHintId(m.name)) + '">'
      + esc(m.hint) + '</p>');
  }
  return parts.join('');
}

/** 形态 `impact`：这一张卡**整个就是**那张回滚单（头 ＋ 影响面清单 ＋ 页脚）＋ 卡底那句提示。 */
function renderImpact(m: UndoTimelineModel): string {
  const p = m.change as UndoTimelineImpactModel;
  const parts: string[] = [impactInnerHtml(m, p, m.changeKey, false)];
  if (m.hint !== undefined) {
    parts.push('<p class="' + undoTimelineSlot('hint') + '" id="' + esc(undoTimelineHintId(m.name)) + '">'
      + esc(m.hint) + '</p>');
  }
  return parts.join('');
}

/** 形态 → 骨架（分派写在这里，加第三形态就是加一支）。 */
const SKELETONS: Readonly<Record<UndoTimelineForm, (m: UndoTimelineModel) => string>> = {
  track: renderTrack,
  impact: renderImpact,
};

/** 渲染撤销时间线（纯函数：同样的入参恒产同样的字节；转义只经 `shared/escape.ts`）。 */
export function renderUndoTimeline(input: unknown): string {
  const m = normalizeUndoTimeline(input);
  const extra = m.extraClass === undefined ? '' : ' ' + m.extraClass;
  return '<div class="' + UNDO_TIMELINE_CLASS + ' is-' + m.form + extra + '"'
    + ' ' + UNDO_TIMELINE_ATTR + '="' + esc(m.name) + '"'
    + ' ' + UNDO_TIMELINE_FORM_ATTR + '="' + esc(m.form) + '">'
    + SKELETONS[m.form](m) + '</div>';
}
