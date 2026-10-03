/** negative-bar · **渲染**（纯函数产 HTML；零 DOM、零副作用）。
 *
 *  —— 负值条（1017-M5 落定：**虚线空框 ＋ 注**，不画实条）——
 *
 *  负值（b07 −1123／−363／−300 三行）不按正值画砖红实条：实条的长度语义是
 *  “越多越长”，负值套它会读成“欠得越多条越长”。落定形态＝虚线空框（形）＋
 *  数值原文（字）＋ 一句注（为什么没条）。本件**没有运行时段**。
 */
import { esc } from '../shared/escape.js';
import { assertPlainObject, badInput, optExtraClass, optText, reqText } from '../shared/validate.js';

/** 本件的类名根（**常量只住这里**：样式从这里取，不各写一份）。 */
export const NEGATIVE_BAR_CLASS = 'ilife-block-negative-bar';
/** 形态闭集：只落地 `hollow`（虚线空框 ＋ 注；M5 三选一的落定项）。 */
export const NEGATIVE_BAR_MODES = ['hollow'] as const;
export type NegativeBarMode = (typeof NEGATIVE_BAR_MODES)[number];
/** 语气闭集（只改描边与数字的颜色；框的虚线形状不变）。 */
export const NEGATIVE_BAR_TONES = ['neutral', 'danger'] as const;
export type NegativeBarTone = (typeof NEGATIVE_BAR_TONES)[number];
/** 缺省注（调用方不给就用它：说清为什么没条）。 */
export const NEGATIVE_BAR_DEFAULT_NOTE = '负值不画实条，只留数';
/** 槽位闭集。 */
export const NEGATIVE_BAR_SLOTS = ['label', 'box', 'value', 'note'] as const;
export type NegativeBarSlot = (typeof NEGATIVE_BAR_SLOTS)[number];
/** 槽类名（唯一拼法）。 */
export function negativeBarSlot(slot: NegativeBarSlot, prefix = 'ilife-'): string {
  return prefix + 'block-negative-bar-' + slot;
}
/** 负值条入参（5 位）。 */
export interface NegativeBarInput {
  /** 负值原文（调用侧算好再传，如“−1123”；本件不做数值运算）。 */
  readonly value: string;
  /** 行名（如账户名）。 */
  readonly label: string;
  /** 占比文案（如“−12.3%”；只作字印，不定条长）。 */
  readonly pctText?: string;
  /** 形态键（闭集，缺省 `hollow`）。 */
  readonly mode?: NegativeBarMode;
  /** 语气（缺省 `danger`）。 */
  readonly tone?: NegativeBarTone;
  /** 注（缺省“负值不画实条，只留数”）。 */
  readonly note?: string;
  readonly extraClass?: string;
}
/** 归一化后的入参（内部形态）。 */
export interface NegativeBarModel {
  readonly value: string;
  readonly label: string;
  readonly pctText?: string;
  readonly mode: NegativeBarMode;
  readonly tone: NegativeBarTone;
  readonly note: string;
  readonly extraClass?: string;
}
/** 根对象只许带的键（未知键一律拒：静默吞掉＝调用方拼错字段名还绿）。 */
const ROOT_KEYS: readonly string[] = ['value', 'label', 'pctText', 'mode', 'tone', 'note', 'extraClass'];

function assertKeys(value: object, allowed: readonly string[], field: string): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) badInput(field + ' 不认识这个键：' + key);
  }
}

/** 入参归一化（唯一入口：`renderNegativeBar` 只吃它产出的模型）。 */
export function normalizeNegativeBar(input: unknown): NegativeBarModel {
  assertPlainObject(input, 'renderNegativeBar: input');
  const raw = input as Record<string, unknown>;
  for (const k of Object.keys(raw)) if (/^on/i.test(k)) badInput('renderNegativeBar: input 不得含内联事件字段：' + k);
  assertKeys(raw, ROOT_KEYS, 'renderNegativeBar: input');
  const mode = raw.mode === undefined ? 'hollow' : raw.mode;
  if (!(NEGATIVE_BAR_MODES as readonly unknown[]).includes(mode)) {
    badInput('renderNegativeBar: input.mode 必须是 ' + NEGATIVE_BAR_MODES.join('／') + ' 之一');
  }
  const toneGiven = raw.tone === undefined ? 'danger' : raw.tone;
  if (!(NEGATIVE_BAR_TONES as readonly unknown[]).includes(toneGiven)) {
    badInput('renderNegativeBar: input.tone 必须是 ' + NEGATIVE_BAR_TONES.join('／') + ' 之一');
  }
  return {
    value: reqText(raw.value, 'renderNegativeBar: input.value'),
    label: reqText(raw.label, 'renderNegativeBar: input.label'),
    pctText: optText(raw.pctText, 'renderNegativeBar: input.pctText'),
    mode: mode as NegativeBarMode,
    tone: toneGiven as NegativeBarTone,
    note: optText(raw.note, 'renderNegativeBar: input.note') ?? NEGATIVE_BAR_DEFAULT_NOTE,
    extraClass: optExtraClass(raw.extraClass, 'renderNegativeBar: input.extraClass'),
  };
}
/** 渲染负值条（纯函数：同样入参恒产同样字节；转义只经 `shared/escape.ts`）。 */
export function renderNegativeBar(input: unknown): string {
  const m = normalizeNegativeBar(input);
  const extra = m.extraClass === undefined ? '' : ' ' + m.extraClass;
  const reading = m.pctText === undefined ? m.value : m.value + ' · ' + m.pctText;
  return '<div class="' + NEGATIVE_BAR_CLASS + ' is-' + m.mode + ' is-' + m.tone + extra + '">'
    + '<span class="' + negativeBarSlot('label') + '">' + esc(m.label) + '</span>'
    + '<span class="' + negativeBarSlot('box') + '" role="img" aria-label="' + esc(reading) + '">'
    + '<b class="' + negativeBarSlot('value') + '">' + esc(reading) + '</b></span>'
    + '<p class="' + negativeBarSlot('note') + '">' + esc(m.note) + '</p>'
    + '</div>';
}
