/** toast-card · **入参归一化与校验**（把 `any` 与说不出的 `unknown` 挡在门外，产出内部类型）。
 *
 *  三条口径：
 *   1. **非法入参一律 `badInput()`**（抛 `BlocksError`）——不静默降级、不猜；
 *   2. **算得出来的都不许调用方再给**：语气字、图标字形、`role`／`aria-live`、竖条粗细都由 `tone` 算；
 *   3. **危险档必须说得清**：`tone: 'danger'` 而不给 `detail` ⇒ 拒——
 *      关键信息不许只活在这条会自动消失的提示里（写错库这类必须同时有落点）。
 */
import { assertPlainObject, badInput, optExtraClass, optText, reqText } from '../shared/validate.js';
import {
  TOAST_CARD_ACTION_ID_RE,
  TOAST_CARD_CLOSE_LABEL,
  TOAST_CARD_DEFAULT_MS,
  TOAST_CARD_MAX_MS,
  TOAST_CARD_MAX_STACK,
  TOAST_CARD_MIN_MS,
  TOAST_CARD_TONES,
  TOAST_CARD_TONE_GLYPHS,
  TOAST_CARD_TONE_LIVE,
  TOAST_CARD_TONE_ROLES,
  TOAST_CARD_TONE_WORDS,
  type ToastCardAction,
  type ToastCardTone,
} from './attrs.js';

/** 归一化后的一条提示。 */
export interface ToastCardModel {
  readonly tone: ToastCardTone;
  /** 语气字（「已完成」／「请注意」／「没成功」）：**色之外的第二样**。 */
  readonly toneWord: string;
  /** 图标字形（**第三样**；`aria-hidden`）。 */
  readonly glyph: string;
  /** `role`（危险档 `alert`，其余 `status`）——由 `tone` 算，调用方不许给。 */
  readonly role: string;
  /** `aria-live`（`assertive` ／ `polite`）——由 `tone` 算。 */
  readonly live: string;
  readonly title: string;
  readonly detail?: string;
  readonly action?: ToastCardAction;
  readonly closeLabel: string;
  readonly durationMs: number;
  readonly extraClass?: string;
}

/** 归一化后的堆栈入参。 */
export interface ToastCardStackModel {
  readonly max: number;
  readonly extraClass?: string;
}

/** 一处入参不符合「哪个字段、必须是什么」时抛错的那句话里的字段名统一带件名前缀。 */
const at = (field: string): string => 'toast-card: ' + field;

/** 数字串／数字 → 整数；给不出整数返回 `null`（调用方决定报哪句错）。 */
function intOf(value: unknown): number | null {
  if (typeof value === 'number') return Number.isInteger(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isInteger(n) ? n : null;
  }
  return null;
}

/** 至多一个动作：**一个对象**（数组一律拒——「至多一个」就靠入参面守住）。 */
function actionModel(value: unknown): ToastCardAction {
  if (Array.isArray(value)) {
    badInput(at('input.action 只许给一个动作对象（不是数组）：一条提示至多一个动作，'
      + '多出来的动作请写成两句话，或放回页面上'));
  }
  assertPlainObject(value, at('input.action'));
  const raw = value as Record<string, unknown>;
  const id = reqText(raw.id, at('input.action.id'));
  if (!TOAST_CARD_ACTION_ID_RE.test(id)) {
    badInput(at('input.action.id 只许小写字母开头的动作名（小写字母／数字／横线）：' + id
      + '——它会原样进 data-* 并在事件里回给调用方'));
  }
  return { id, label: reqText(raw.label, at('input.action.label')) };
}

/** 自动消失的时长：缺省 4 秒，只许 3–5 秒（要更久就让用户点关闭）。 */
function durationModel(value: unknown): number {
  if (value === undefined) return TOAST_CARD_DEFAULT_MS;
  const ms = intOf(value);
  if (ms === null) badInput(at('input.durationMs 必须是整数毫秒'));
  if (ms < TOAST_CARD_MIN_MS || ms > TOAST_CARD_MAX_MS) {
    badInput(at('input.durationMs 必须落在 ' + String(TOAST_CARD_MIN_MS) + '～' + String(TOAST_CARD_MAX_MS)
      + ' 毫秒之间（3–5 秒）：要更久就让用户点关闭——关键信息不许押在计时上'));
  }
  return ms;
}

/** 入参归一化。**唯一入口**：`render.ts` 与 `runtime.ts` 都只吃它产出的 `ToastCardModel`。 */
export function normalizeToastCard(input: unknown): ToastCardModel {
  assertPlainObject(input, 'renderToastCard: input');
  const raw = input as Record<string, unknown>;

  const title = reqText(raw.title, at('input.title'));
  if (title.trim() === '') badInput(at('input.title 不能只有空白字符：标题要写清这条提示做完了什么'));

  const toneGiven: unknown = raw.tone;
  const tone = toneGiven === undefined ? TOAST_CARD_TONES[0] : toneGiven;
  if (!(TOAST_CARD_TONES as readonly unknown[]).includes(tone)) {
    badInput(at('input.tone 必须是 ' + TOAST_CARD_TONES.join('／') + ' 之一'));
  }
  const realTone = tone as ToastCardTone;

  const detail = optText(raw.detail, at('input.detail'));
  if (realTone === 'danger' && detail === undefined) {
    badInput(at('语气是 danger ⇒ input.detail 必填：说清出了什么事、下一步在哪儿——'
      + '关键信息不许只活在这条会自动消失的提示里'));
  }

  const actionGiven: unknown = raw.action;
  const action = actionGiven === undefined ? undefined : actionModel(actionGiven);

  return {
    tone: realTone,
    toneWord: TOAST_CARD_TONE_WORDS[realTone],
    glyph: TOAST_CARD_TONE_GLYPHS[realTone],
    role: TOAST_CARD_TONE_ROLES[realTone],
    live: TOAST_CARD_TONE_LIVE[realTone],
    title,
    detail,
    action,
    closeLabel: optText(raw.closeLabel, at('input.closeLabel')) ?? TOAST_CARD_CLOSE_LABEL,
    durationMs: durationModel(raw.durationMs),
    extraClass: optExtraClass(raw.extraClass, at('input.extraClass')),
  };
}

/** 堆栈入参归一化（不给＝缺省容量 3）。 */
export function normalizeToastCardStack(input: unknown): ToastCardStackModel {
  if (input !== undefined && input !== null) assertPlainObject(input, 'renderToastCardStack: input');
  const raw = (input === undefined || input === null ? {} : input) as Record<string, unknown>;
  const maxGiven: unknown = raw.max;
  let max = TOAST_CARD_MAX_STACK;
  if (maxGiven !== undefined) {
    const n = intOf(maxGiven);
    if (n === null) badInput(at('input.max 必须是整数'));
    if (n < 1 || n > TOAST_CARD_MAX_STACK) {
      badInput(at('input.max 必须落在 1～' + String(TOAST_CARD_MAX_STACK) + ' 之间：同一时刻最多堆 '
        + String(TOAST_CARD_MAX_STACK) + ' 条，第 ' + String(TOAST_CARD_MAX_STACK + 1) + ' 条来时挤掉最旧的一条'));
    }
    max = n;
  }
  return { max, extraClass: optExtraClass(raw.extraClass, at('input.extraClass')) };
}
