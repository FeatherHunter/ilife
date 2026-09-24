/** streak-badge · **标记契约**（渲染与调用方共用的唯一事实：类名／槽名／形态闭集／强弱闭集／入参类型）。
 *
 *  这一件落地的是原型墙（`.scratch/ui-组件墙/parts-06-状态与台账.mjs`，2026-09 用户裁定）
 *  里的**形态 A「一行几个徽标（三种强弱）」**——"你已经连着做了 N 天"这一类**一句话徽标**：
 *  前词 ＋ 数（放大成读数）＋ 量词，强弱三档。
 *
 *  **强弱三档靠形状分**（色只是第三样）：`strong` 实底、`mid` 描边空底、`weak` 无框只带底线，
 *  三档的字重依次 800／700／600。「大字报刊」皮肤下强调色＝墨黑，只靠变色就分不出来了。
 */
export const STREAK_BADGE_CLASS = 'ilife-block-streak-badge';

/** 槽位闭集（数组里带注释 ⇒ 不会被当成"形态闭集"）。 */
export const STREAK_BADGE_SLOTS = [
  'head',
  'heading',
  'list',
  'badge',
  'label',
  'value',
  'unit',
  'absent',
] as const;
export type StreakBadgeSlot = (typeof STREAK_BADGE_SLOTS)[number];

/** 类名根。 */
export function streakBadgeClass(prefix = 'ilife-'): string {
  return prefix + 'block-streak-badge';
}

/** 槽类的唯一拼法。 */
export function streakBadgeSlot(slot: StreakBadgeSlot, prefix = 'ilife-'): string {
  return streakBadgeClass(prefix) + '-' + slot;
}

/** 形态闭集：本件只落地形态 A「一行几个徽标」。 */
export const STREAK_BADGE_FORMS = ['row'] as const;
export type StreakBadgeForm = (typeof STREAK_BADGE_FORMS)[number];

/** 强弱闭集（三档各有自己的形状，见 `style.ts`）。 */
export const STREAK_STRENGTHS = ['strong', 'mid', 'weak'] as const;
export type StreakStrength = (typeof STREAK_STRENGTHS)[number];

/** 缺值的写法：**缺值写成 `—`，不许写 0、不许留空**（全仓同一条地板）。 */
export const STREAK_BADGE_MISSING = '—';

/** 一个徽标：前词 ＋ 数 ＋ 量词。**数只收"已经是给人看的样子"的串**（本件不算数）。 */
export interface StreakBadgeItem {
  /** 强弱档（`strong` 实底／`mid` 描边／`weak` 无框只带底线）。必填——它决定形状，不是可选装饰。 */
  readonly strength: StreakStrength;
  /** 前词（`连续记录`／`本月`／`上次断在`）。必填非空。 */
  readonly label: string;
  /** 数（`37`／`21 / 30`／`08-14`）。必填非空；等宽数字、**永不截断**。 */
  readonly value: string;
  /** 量词或尾巴（`天`／`天有记录`）。不给＝不出这一槽。 */
  readonly unit?: string;
}

export interface StreakBadgeInput {
  /** 徽标逐个；空数组且无 `absentLine` ⇒ 空串（与"没内容不留空块"同口径）。 */
  readonly badges: readonly StreakBadgeItem[];
  /** 小标题（`连记`）。 */
  readonly heading?: string;
  /** 空态那一句（`还没有连记记录`）——**这是"没什么"，不是一个徽标**，所以住独立槽位。 */
  readonly absentLine?: string;
  /** 形态键（闭集，缺省 `row`）。 */
  readonly form?: StreakBadgeForm;
  /** 附加类名（空格分隔；逐个过类名正则）。 */
  readonly extraClass?: string;
}
