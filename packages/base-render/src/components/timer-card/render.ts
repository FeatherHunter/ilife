/** timer-card · **渲染**（纯函数产 HTML；零 DOM、零副作用）。
 *
 *  形状：`卡头（标题 ＋ 状态字）` → `大数字（＋单位）` → `进度条` → `读数（已过／总／还剩）` →
 *  `提示句（可选）` → `按钮排（主按钮 ＋ 重置 ＋ 错句）` → `空态（可选）`。
 *
 *  它替掉的是哪几种错法：
 *   · 倒计时写在一句话里（「这一锅还要等 1 分 20 秒」）⇒ 大数字当主读数，一眼看得出；
 *   · 进度条只有一条、没有读数 ⇒ 大数字 ＋ 条 ＋ 「已过／还剩」三样一起给；
 *   · 只有"开始"没有"暂停／重置"（等过了头只能干瞪眼）⇒ 主按钮按状态换字，另有一颗重置。
 *
 *  **时间口径**：`totalSeconds` 是唯一的数；`还剩 = total - elapsed`，`elapsed` 缺省 0。
 *  显示串走 `timerClockText()`（`MM:SS`，超过一小时才出小时位）。
 */
import { esc } from '../shared/escape.js';
import {
  TIMER_ACT_ATTR, TIMER_BAR_ATTR, TIMER_BUSY_ATTR, TIMER_CARD_EMPTY_LINE, TIMER_CARD_MISSING,
  TIMER_DISABLED_ATTR, TIMER_DISPLAY_ATTR, TIMER_ELAPSED_ATTR, TIMER_KEY_ATTR, TIMER_LOADING_LABEL,
  TIMER_PRIMARY_LABELS, TIMER_REMAIN_ATTR, TIMER_RESET_LABEL, TIMER_REST_ATTR, TIMER_STATE_ATTR,
  TIMER_STATE_WORDS, TIMER_TAG_ATTR, TIMER_TOTAL_ATTR, timerCardClass, timerCardSlot,
  type TimerCardSlot, type TimerState,
} from './attrs.js';
import { normalizeTimerCard, type TimerCardModel } from './model.js';
import type { TimerCardForm, TimerCardInput, TimerAct } from './attrs.js';

export type { TimerAct, TimerCardForm, TimerCardInput, TimerCardSlot, TimerState };

/** 槽类名的本件内缩写（前缀固定 `ilife-`：换前缀是样式段的事）。 */
const slot = (name: TimerCardSlot): string => timerCardSlot(name);

/** 两位补零。 */
const pad2 = (n: number): string => (n < 10 ? '0' : '') + String(n);

/** 秒 → 时钟串（`MM:SS`；≥1 小时才出小时位）。**运行时段里有一份同样的口径**（判据会把两边对上）。 */
export function timerClockText(totalSeconds: number): string {
  const sec = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec - h * 3600) / 60);
  const s = sec - h * 3600 - m * 60;
  return h > 0 ? h + ':' + pad2(m) + ':' + pad2(s) : pad2(m) + ':' + pad2(s);
}

/** 错态节点的 id（`aria-describedby` 指过来）。 */
function errId(key: string): string {
  return 'ilife-timer-err-' + key.replace(/[^A-Za-z0-9_-]+/g, '-');
}

/** 大数字 ＋ 单位（剩余时间当主读数；空态写 `—`）。 */
function displayHtml(remaining: number, state: TimerState, empty: boolean): string {
  const value = empty ? TIMER_CARD_MISSING : timerClockText(remaining);
  const unit = empty ? '' : (state === 'done' ? '已用完' : '还剩');
  return '<div class="' + slot('display') + '">'
    + '<b class="' + slot('display-value') + '" ' + TIMER_DISPLAY_ATTR + '="1">' + esc(value) + '</b>'
    + (unit === '' ? '' : '<span class="' + slot('display-unit') + '">' + esc(unit) + '</span>')
    + '</div>';
}

/** 按钮排：主按钮（按状态换字）＋ 重置 ＋（可选）错句。 */
function actsHtml(m: TimerCardModel, empty: boolean): string {
  const id = m.error === undefined ? undefined : errId(m.key);
  const described = id === undefined ? [] : ['aria-describedby="' + esc(id) + '"'];
  const off = m.disabled || empty;
  const primary = [TIMER_ACT_ATTR + '="toggle"'].concat(described);
  if (m.loading) primary.push('aria-busy="true"');
  if (off || m.loading) primary.push('disabled', 'aria-disabled="true"');
  const reset = [TIMER_ACT_ATTR + '="reset"'].concat(described);
  if (off) reset.push('disabled', 'aria-disabled="true"');
  const label = m.loading ? TIMER_LOADING_LABEL : TIMER_PRIMARY_LABELS[m.state];
  return '<div class="' + slot('acts') + '">'
    + '<button type="button" class="' + slot('button') + '" ' + primary.join(' ') + '>' + esc(label) + '</button>'
    + '<button type="button" class="' + slot('button') + ' is-quiet" ' + reset.join(' ') + '>'
    + esc(TIMER_RESET_LABEL) + '</button>'
    + (id === undefined
      ? '' : '<span class="' + slot('error') + '" id="' + esc(id) + '" role="alert">'
        + esc(m.error as string) + '</span>')
    + '</div>';
}

/** 计时卡：一张卡一个计时器。`totalSeconds = 0` ⇒ 走到空态（大数字写 `—`、按钮按不动）。 */
export function renderTimerCard(input: TimerCardInput): string {
  const m = normalizeTimerCard(input);
  const empty = m.totalSeconds === 0;
  const remaining = Math.max(0, m.totalSeconds - m.elapsedSeconds);
  const ratio = m.totalSeconds === 0 ? 0 : (m.totalSeconds - remaining) / m.totalSeconds;
  const rootAttrs = [
    'class="' + timerCardClass() + (m.extraClass === undefined ? '' : ' ' + m.extraClass) + '"',
    TIMER_KEY_ATTR + '="' + esc(m.key) + '"',
    TIMER_STATE_ATTR + '="' + esc(m.state) + '"',
    TIMER_TOTAL_ATTR + '="' + String(Math.round(m.totalSeconds * 1000)) + '"',
    TIMER_REMAIN_ATTR + '="' + String(Math.round(remaining * 1000)) + '"',
  ];
  if (m.disabled) rootAttrs.push(TIMER_DISABLED_ATTR + '="1"');
  if (m.loading) rootAttrs.push(TIMER_BUSY_ATTR + '="1"', 'aria-busy="true"');
  const head = '<div class="' + slot('head') + '">'
    + '<span class="' + slot('title') + '">' + esc(m.title) + '</span>'
    + '<span class="' + slot('tag') + ' is-' + m.state + '" ' + TIMER_TAG_ATTR + '="1">'
    + esc(TIMER_STATE_WORDS[m.state]) + '</span>'
    + '</div>';
  const bar = '<div class="' + slot('bar') + '" aria-hidden="true">'
    + '<i class="' + slot('bar-fill') + '" ' + TIMER_BAR_ATTR + '="1" style="transform:scaleX('
    + ratio.toFixed(4) + ')"></i></div>';
  const readouts = '<div class="' + slot('readouts') + '">'
    + '<span>已过 <b ' + TIMER_ELAPSED_ATTR + '="1">'
    + esc(timerClockText(m.totalSeconds - remaining)) + '</b></span>'
    + '<span>总 <b>' + esc(timerClockText(m.totalSeconds)) + '</b></span>'
    + '<span>还剩 <b ' + TIMER_REST_ATTR + '="1">' + esc(timerClockText(remaining)) + '</b></span>'
    + '</div>';
  const hint = m.hint === undefined
    ? ''
    : '<p class="' + slot('hint') + '">' + esc(m.hint) + '</p>';
  const absent = empty
    ? '<p class="' + slot('absent') + '">'
      + esc(m.absentLine === undefined ? TIMER_CARD_EMPTY_LINE : m.absentLine) + '</p>'
    : '';
  return '<div ' + rootAttrs.join(' ') + '>'
    + head + displayHtml(remaining, m.state, empty) + bar + readouts + hint
    + actsHtml(m, empty) + absent
    + '</div>';
}
