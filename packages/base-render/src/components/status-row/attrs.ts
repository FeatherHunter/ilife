/** status-row · **标记契约**（渲染与调用方共用的唯一事实：类名／槽名／形态闭集／档位闭集／入参类型）。
 *
 *  这一件落地的是原型墙（`.scratch/ui-组件墙/parts-06-状态与台账.mjs`，2026-09 用户裁定）
 *  里的**形态 A「单行台账」**——"一笔还没走完的事走到哪了"：一笔一行，
 *  左轨的点给**位置**，徽标给**阶段字**，右侧给**金额**，第二行给补充与**到期日**。
 *
 *  **颜色纪律（本族最容易塌的地方）**：状态一律「字 ＋ 形 ＋ 色」三样同时给——
 *  徽标必须带字；点／框必须带形状差异（空心圆／双环实心／实心圆／空心方／双线菱）；
 *  色只是第三样。「大字报刊」皮肤下强调色＝墨黑，靠变色区分的件在那档会失去区分度。
 */
export const STATUS_ROW_CLASS = 'ilife-block-status-row';

/** 槽位闭集（渲染与判据都用这里的名字拼类名，不各抄一份字面量）。
 *  数组里带注释 ⇒ 它不会被 `gen-components.mjs` 当成"形态闭集"（形态闭集是 `STATUS_ROW_FORMS`）。 */
export const STATUS_ROW_SLOTS = [
  /* 头：小标题 ＋ 右侧计数。 */
  'head',
  'heading',
  'count',
  /* 台账本体：清单与逐行。 */
  'list',
  'item',
  /* 行内：左轨（点 ＋ 连线）／正文两行。 */
  'rail',
  'node',
  'body',
  'line1',
  'name',
  'badge',
  'amount',
  'line2',
  'meta',
  'due',
  /* 空态与脚注。 */
  'absent',
  'foot',
] as const;
export type StatusRowSlot = (typeof STATUS_ROW_SLOTS)[number];

/** 类名根（别处不许再写 `'ilife-block-status-row'` 字面量）。 */
export function statusRowClass(prefix = 'ilife-'): string {
  return prefix + 'block-status-row';
}

/** 槽类的唯一拼法。 */
export function statusRowSlot(slot: StatusRowSlot, prefix = 'ilife-'): string {
  return statusRowClass(prefix) + '-' + slot;
}

/** 形态闭集：本件只落地形态 A「单行台账」，日后加形态是在这里加一格，不是新开一件。 */
export const STATUS_ROW_FORMS = ['ledger'] as const;
export type StatusRowForm = (typeof STATUS_ROW_FORMS)[number];

/** 档位闭集。形状跟着档位走（见 `style.ts`），色只是第三样。 */
export const STATUS_ROW_TONES = ['neutral', 'active', 'ok', 'warn', 'danger'] as const;
export type StatusRowTone = (typeof STATUS_ROW_TONES)[number];

/** 缺值的写法：**缺值写成 `—`，不许写 0、不许留空**（全仓同一条地板）。 */
export const STATUS_ROW_MISSING = '—';

/** 台账里的一行：一笔在途的事。 */
export interface StatusRowItem {
  /** 这一笔事是什么（`手机分期 · 第 4 期`）。必填非空。 */
  readonly name: string;
  /** 阶段字（`本期待扣`／`已还 3 期`／`已过期`）。**必填**——状态必须带字，只给色等于没给。 */
  readonly phase: string;
  /** 档位，缺省 `neutral`。徽标与轨道点的形状跟着它走。 */
  readonly tone?: StatusRowTone;
  /** 金额／主读数（`¥620.00`）：右对齐 ＋ 等宽数字 ＋ **永不截断**。换算归调用方（本件不换算）。 */
  readonly amount?: string;
  /** 金额单位（`元`）：小一号跟在金额后。 */
  readonly amountUnit?: string;
  /** 第二行的补充（`招商信用卡 · 自动扣款`）。串＝一段；数组＝逐段一枚 `<span>`（分隔由列距承担）。 */
  readonly meta?: string | readonly string[];
  /** 到期日（`10-18`／`2027-06-18`）：等宽数字 ＋ **永不截断**。 */
  readonly due?: string;
  /** 到期日后面的小字（`还剩 23 天`）；给了它就必须同时给 `due`（它是那一天的注脚）。 */
  readonly dueNote?: string;
  /** 到期日的档位（缺省跟 `tone`）——一笔"已完成"的事也可能当年逾期过，两档各自独立。 */
  readonly dueTone?: StatusRowTone;
}

export interface StatusRowInput {
  /** 台账逐行；空数组且无 `absentLine` ⇒ 空串（与"没内容不留空块"同口径）。 */
  readonly rows: readonly StatusRowItem[];
  /** 小标题（`在途的事`）。 */
  readonly heading?: string;
  /** 右侧计数（`4 笔在途`）：**本件不数数**，数由调用方给（数得对是调用方的事）。 */
  readonly count?: string;
  /** 空态那一句（`没有在途的事`）——**这是"没什么"，不是一行**，所以住独立槽位、不进 `rows`。 */
  readonly absentLine?: string;
  /** 脚注（`共 4 笔 · 在途 ¥5,900`）：串＝一句；数组＝逐段一枚。 */
  readonly foot?: string | readonly string[];
  /** 形态键（闭集，缺省 `ledger`）。 */
  readonly form?: StatusRowForm;
  /** 附加类名（空格分隔；逐个过类名正则）。 */
  readonly extraClass?: string;
}
