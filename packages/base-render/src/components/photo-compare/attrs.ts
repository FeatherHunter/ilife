/** photo-compare · **标记契约**（渲染与运行时共用的唯一事实：类名／形态闭集／方向闭集／入参类型）。
 *
 *  这一件是**重做件**（原型墙 3/3/3，`.scratch/ui-组件墙/重做设计口径.md` §4）：原型只给了「拖动」，
 *  读者拖半天读不出「变了多少」。重做后**三个读数一起给**：
 *   ① 拖动的视觉（竖线 ＋ 把手，钉在照片上）；
 *   ② **两张的日期标签**（左／右角，各自贴在自己那张上）；
 *   ③ **数值差值行**（体重 70.8 → 68.4 千克，Δ −2.4 千克）——拖动读不出来的那件事，这里读得出。
 *
 *  门槛与降级：拖动把手命中盒 **≥ PHOTO_COMPARE_MIN_HIT_PX（44px）**、键盘 `←`／`→` 可调（原生 `range`）；
 *  容器窄于 `PHOTO_COMPARE_NARROW_PX` 时**退成左右并排两张 ＋ 中间差值条**（不许变成没法用的小滑块）。
 *
 *  占位物同 `photo-grid`：定形框 ＋ 四角取景角标 ＋ 题注条 ⇒ 没真图时也读得出那是相片位。
 */

/** 本件的类名根。 */
export const PHOTO_COMPARE_CLASS = 'ilife-block-photo-compare';

/** 槽位闭集。 */
export const PHOTO_COMPARE_SLOTS = [
  /** 叠着两张的那块台面（宽档两张重叠，窄档并排）。 */
  'stage',
  /** 一张（`<figure>`）；`is-before`／`is-after` 分前后。 */
  'layer',
  /** **定形框**：`aspect-ratio` 在它身上，真图与占位共用同一个框。 */
  'frame',
  /** 四角取景角标（纯装饰）。 */
  'marks',
  /** 中央那枚相机记号（只有占位时才出）。 */
  'lens',
  /** 占位时写在框里的那句话。 */
  'alt',
  /** 真图的 `<img>`。 */
  'img',
  /** **日期标签**（左／右角，贴在自己那张上：`08-30`）。 */
  'tag',
  /** 题注条（框下面那一行：位置／朝向 ＋ 可选读数）。 */
  'caption',
  /** 题注条里的说明。 */
  'text',
  /** 题注条里的读数（「1120×1480 · 1.8 MB」）。 */
  'size',
  /** 中间那根可拖的竖线。 */
  'divider',
  /** 拖动条（原生 `range`；命中盒铺满台面，把手 44×44）。 */
  'range',
  /** **数值差值行**的容器。 */
  'deltas',
  /** 一行差值：读数名 ／ 前值 → 后值 ／ 变了多少。 */
  'delta',
  /** 方向记号（↓／↑／＝，纯装饰：正负号已经写在「变了多少」那句里）。 */
  'delta-mark',
  /** 差值行的读数名（「体重」）。 */
  'delta-label',
  /** 前值 → 后值（两个数之间的箭头由样式画，不由标记写）。 */
  'delta-value',
  /** 前值与后值之间那个箭头（纯装饰：两个数自己就排得清前后）。 */
  'delta-arrow',
  /** 「变了多少」那一格（**带正负号**：色只是第二样）。 */
  'delta-change',
  /** 窄档才出的**差值条**（一句话把「变了多少」写清）。 */
  'verdict',
  /** 底下那句口径（「拖照片上那根竖线：左边 08-30，右边 09-25」）。 */
  'note',
] as const;
export type PhotoCompareSlot = (typeof PHOTO_COMPARE_SLOTS)[number];

/** 槽类的类名（唯一拼法）。 */
export function photoCompareSlot(slot: PhotoCompareSlot, prefix = 'ilife-'): string {
  return prefix + 'block-photo-compare-' + slot;
}

/** 形态闭集：本件只落地了形态 A「拖动对照」。 */
export const PHOTO_COMPARE_FORMS = ['drag'] as const;
export type PhotoCompareForm = (typeof PHOTO_COMPARE_FORMS)[number];

/** 「变了多少」的方向闭集（**只改视觉档**：正负号写在那句话里，色只是第二样）。 */
export const PHOTO_COMPARE_TONES = ['down', 'up', 'same'] as const;
export type PhotoCompareTone = (typeof PHOTO_COMPARE_TONES)[number];

/** 方向 → 屏上那个记号（钉在差值行左端，色之外的第二样）。 */
export const PHOTO_COMPARE_TONE_MARKS: Readonly<Record<PhotoCompareTone, string>> = Object.freeze({
  down: '↓',
  up: '↑',
  same: '＝',
});

/** 拖动把手的命中下限（px）：**命中盒不得小于它**（视觉圆可以小，命中盒必须够）。 */
export const PHOTO_COMPARE_MIN_HIT_PX = 44;

/** 拖动位置住在**本件自己的一个局部自定义属性**里（竖线、把手、裁切三处都从它算——一个事实一处存）。
 *  它是**几何量**，不是皮肤 token：不占 `--ilife-` 名字空间，也不经 `skinVar()` 读。
 *  唯一出处在本行，`render.ts`（渲初值）／`style.ts`（算位置）／`runtime.ts`（写新值）三处都引它。 */
export const PHOTO_COMPARE_SPLIT_VAR = '--photo-compare-split';

/** 拖动的档数（`←`／`→` 各移一格；`range` 的 `step`）。 */
export const PHOTO_COMPARE_STEP = 2;

/** 缺值那一栏的写法（缺的读数不编数）。 */
export const PHOTO_COMPARE_MISSING = '—';

/** 一张照片（前或后）。 */
export interface PhotoCompareSide {
  /** 日期（「08-30」）——**必填**：它是这一件的第二个读数（读者要知道比的是哪两天）。 */
  readonly date: string;
  /** 这一格该放什么照片（「正面」）。**必填**：占位格上唯一说得清「放什么」的话；真图时也是 `alt`。 */
  readonly alt: string;
  /** 图源；不给＝占位格（取景角标 ＋ 相机记号 ＋ `alt`）。 */
  readonly src?: string;
  /** 题注条里的说明（「沙发 · 修复前」）；不给＝题注条只有读数（或整条不出）。 */
  readonly caption?: string;
  /** 一行读数（「1120×1480 · 1.8 MB」）；不给＝不出。 */
  readonly size?: string;
}

/** 一行数值差值。 */
export interface PhotoCompareDelta {
  /** 读数名（「体重」「腰围」）。**非空**。 */
  readonly label: string;
  /** 前值（「70.8」）。**非空**。 */
  readonly before: string;
  /** 后值（「68.4」）。**非空**。 */
  readonly after: string;
  /** 变了多少那句（「−2.4 千克」／「可比」）。**非空**——这一件重做就是为了它。 */
  readonly change: string;
  /** 方向档（`down`／`up`／`same`）：只改视觉，正负号已在 `change` 里。 */
  readonly tone?: PhotoCompareTone;
}

/** 前后对比的入参。`before`／`after`／`deltas` 必填——没有差值的「前后对比」只剩两张图。 */
export interface PhotoCompareInput {
  /** 前一张。 */
  readonly before: PhotoCompareSide;
  /** 后一张。 */
  readonly after: PhotoCompareSide;
  /** 数值差值行（一件里通常 2–4 行）。**空数组＝错**：那正是本件要替掉的「只有拖动」。 */
  readonly deltas: readonly PhotoCompareDelta[];
  /** 窄档差值条那句话（「比 08-30 轻 2.4 千克」）；不给＝窄档只靠差值行。 */
  readonly verdict?: string;
  /** 底下那句口径（怎么读这块）。 */
  readonly note?: string;
  /** 拖动竖线的初始位置（0–100，缺省 50）。 */
  readonly position?: number;
  /** 形态键（闭集，缺省 `drag`）。 */
  readonly form?: PhotoCompareForm;
  /** 附加类名（空格分隔；逐个过类名正则）。 */
  readonly extraClass?: string;
}
