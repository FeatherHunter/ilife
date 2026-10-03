/** missing-badge · **渲染**（纯函数产 HTML；零 DOM、零副作用）。
 *
 *  —— 缺项徽章（1015-M1：逐项行里“缺的那一项”无处住，TEXT 写“见下面的缺项徽章”）——
 *
 *  缺项名 ＋ 为什么进不去 ＋ 状态字（缺／待补）三位一体：色不是唯一信息，
 *  状态必须有字（`缺`／`待补`）。命名一律全拼（缺项＝“missing”，不缩写）。
 *  本件**没有运行时段**。
 */
import { esc } from '../shared/escape.js';
import { assertPlainObject, badInput, optExtraClass, optText, reqText } from '../shared/validate.js';

/** 本件的类名根（**常量只住这里**：样式从这里取，不各写一份）。 */
export const MISSING_BADGE_CLASS = 'ilife-block-missing-badge';
/** 状态闭集（缺／待补：状态必须有字，色只是第二样）。 */
export const MISSING_BADGE_STATES = ['missing', 'pending'] as const;
export type MissingBadgeState = (typeof MISSING_BADGE_STATES)[number];
/** 状态字（与闭集同序：调用方与读者只认这两个字）。 */
export const MISSING_BADGE_STATE_WORDS = Object.freeze({ missing: '缺', pending: '待补' });
/** 槽位闭集。 */
export const MISSING_BADGE_SLOTS = ['label', 'state', 'reason'] as const;
export type MissingBadgeSlot = (typeof MISSING_BADGE_SLOTS)[number];
/** 槽类名（唯一拼法）。 */
export function missingBadgeSlot(slot: MissingBadgeSlot, prefix = 'ilife-'): string {
  return prefix + 'block-missing-badge-' + slot;
}
/** 缺项徽章入参（3 位）。 */
export interface MissingBadgeInput {
  /** 缺项名（如“借给谁”）。 */
  readonly label: string;
  /** 为什么进不去（如“这一笔没写对方”）。 */
  readonly reason?: string;
  /** 状态（缺／待补；缺省 `missing`）。 */
  readonly state?: MissingBadgeState;
  readonly extraClass?: string;
}
/** 归一化后的入参（内部形态）。 */
export interface MissingBadgeModel {
  readonly label: string;
  readonly reason?: string;
  readonly state: MissingBadgeState;
  readonly extraClass?: string;
}
/** 根对象只许带的键（未知键一律拒：静默吞掉＝调用方拼错字段名还绿）。 */
const ROOT_KEYS: readonly string[] = ['label', 'reason', 'state', 'extraClass'];

function assertKeys(value: object, allowed: readonly string[], field: string): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) badInput(field + ' 不认识这个键：' + key);
  }
}

/** 入参归一化（唯一入口：`renderMissingBadge` 只吃它产出的模型）。 */
export function normalizeMissingBadge(input: unknown): MissingBadgeModel {
  assertPlainObject(input, 'renderMissingBadge: input');
  const raw = input as Record<string, unknown>;
  for (const k of Object.keys(raw)) if (/^on/i.test(k)) badInput('renderMissingBadge: input 不得含内联事件字段：' + k);
  assertKeys(raw, ROOT_KEYS, 'renderMissingBadge: input');
  const state = raw.state === undefined ? 'missing' : raw.state;
  if (!(MISSING_BADGE_STATES as readonly unknown[]).includes(state)) {
    badInput('renderMissingBadge: input.state 必须是 ' + MISSING_BADGE_STATES.join('／') + ' 之一');
  }
  return {
    label: reqText(raw.label, 'renderMissingBadge: input.label'),
    reason: optText(raw.reason, 'renderMissingBadge: input.reason'),
    state: state as MissingBadgeState,
    extraClass: optExtraClass(raw.extraClass, 'renderMissingBadge: input.extraClass'),
  };
}
/** 渲染缺项徽章（纯函数：同样入参恒产同样字节；转义只经 `shared/escape.ts`）。 */
export function renderMissingBadge(input: unknown): string {
  const m = normalizeMissingBadge(input);
  const extra = m.extraClass === undefined ? '' : ' ' + m.extraClass;
  const word = MISSING_BADGE_STATE_WORDS[m.state];
  const parts: string[] = ['<span class="' + MISSING_BADGE_CLASS + ' is-' + m.state + extra + '">'];
  parts.push('<b class="' + missingBadgeSlot('label') + '">' + esc(m.label) + '</b>');
  parts.push('<i class="' + missingBadgeSlot('state') + '">' + esc(word) + '</i>');
  if (m.reason !== undefined) parts.push('<span class="' + missingBadgeSlot('reason') + '">' + esc(m.reason) + '</span>');
  parts.push('</span>');
  return parts.join('');
}
