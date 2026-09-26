/** quick-capture · **标记契约**（渲染与运行时共用的唯一事实：类名／槽位／`data-*`／事件名／闭集／入参类型）。
 *
 *  这一件落地的是原型墙（`.scratch/ui-组件墙/新件/parts-交互与流程.mjs` 第 86 件，2026-09 起用户逐格打分）
 *  里 **A 一档「一行式录入 ＋ 解析预览（哪格认错了点哪格改）」**——三套皮肤都打 4 分的那一版；
 *  2026-09-26 用户给 **B 档「常驻条（一行）↔ 推开的 6 格」** 补分（中性／小票纸／大字报刊三套皮各 4 分），
 *  照**砍过字的那一版原型**补落为第二档 `drawer`（同一份入参契约，只换骨架：解析预览住进推开的抽屉）。
 *
 *  它替掉的两种错法（原型墙那一格的原文）：①「随手记一笔也要开浮层、填 6 格、再点保存」；
 *  ②「一句话里说了三件事（吃了什么／多少钱／哪张卡），人得自己拆成三格」。
 *
 *  **一屏只留一层话**（2026-09-25 用户口径：原型里写了好多文字、看起来很混乱）：本件屏上只有三样——
 *  「写的那一句话」（输入框里的字）＋「它认出来的几格」（每格：原文那一截 ＋ ＝ ＋ 认成的值 ＋ 改）
 *  ＋「能按什么」（分开填／存、记过的那几条）。原型里的旁白与口径句（「解析成」「这样记过的」，
 *  以及句尾那些说明）**一句都不进屏面**：那些话住在本说明书里。同一个数只印一次。
 *
 *  **本件不猜词**：一句话怎么拆成几格、每一格认成了什么，**由调用方给**（`cells`）；
 *  运行时段只在人改了某一格时把那一格原地重写，不重算别的格、也不从字面反推字段——
 *  「午饭」是哪一类、32 元该记成 32.00 还是 3.20，那是各技能自己的词表（铁律一：能力自治）。
 *
 *  **触屏可达是底线**（触屏优先法条）：一行里两颗按钮、每一格、每一枚候选、记过的每一条都是 ≥44×44 的
 *  真按钮，相邻留 8px 缝；「哪格认错了点哪格改」一根手指走完（点那一格 → 点一枚候选）。
 *  打字只是**一条**通路：「记过的」那几条点一下就把那句话填回输入框。
 *  键盘（`:focus-visible`）只留给真实键盘用户，是本件的地板，不是通路。
 *
 *  **零键盘语汇**：标记与文案里没有键帽（`⌘`／`Esc`／`↑↓` 那一路），运行时段不接任何键盘事件。
 */

/** 本件的类名根：全部槽位类名都是 `QUICK_CAPTURE_CLASS + '-' + 槽名`。 */
export const QUICK_CAPTURE_CLASS = 'ilife-block-quick-capture';

/** 槽位闭集（标记契约的一部分：`render.ts`／`style.ts`／`runtime.ts` 与判据都用这里的名字拼类名）。
 *
 *  取名避开「一个槽名是另一个槽名的前缀」那种撞法（`pick` 与 `picks`／`field` 与 `fields`）：
 *  判据在标记串上找槽位时才不会把容器当项。 */
export const QUICK_CAPTURE_SLOTS = [
  /** 根（卡：写的那一行 ＋ 解析预览 ＋ 记过的；它自己就是容器）。 */
  'host',
  /** 写的那一行（行首小签 ＋ 输入框 ＋ 分开填 ＋ 存）。 */
  'line',
  /** 行首那枚小签（「随手记」：这一行是干什么的，只有三个字）。 */
  'lead',
  /** 输入框（那一句话本身）。 */
  'input',
  /** 「分开填」那枚（形态 `oneline`：去字段表单里一格格填，本件只报一件事；
   *  **形态 `drawer`：它是抽屉开关**——点它把下面那 6 格推开／收起）。 */
  'more',
  /** 「存」那枚（这一件的主按钮，看得见的第一动作）。 */
  'save',
  /** 解析预览那一条带（**形态 `oneline` 专属**：每一格就在这一行上）。 */
  'parse',
  /** 推开的抽屉（**形态 `drawer` 专属**：常驻收起时 `hidden`，一格都不上屏）。 */
  'drawer',
  /** 抽屉的标题（「分开填 · 6 格」：这一屉是什么、里面几格）。 */
  'hd',
  /** 抽屉里那 6 格的网格（两列；本件窄于常量那个宽度时走一列）。 */
  'grid',
  /** 抽屉里的一格 ＋ 它自己的候选带（**网格的一项**：带子摊开时留在这一项里，不横跨整行）。 */
  'unit',
  /** 一格里的一枚（**整枚就是那颗按钮**：命中盒就是它）。 */
  'chip',
  /** 原文那一截（「午饭」；这一格是从这句话里认出来的）。 */
  'src',
  /** 补出来的那一格的名字（如「日期」：原文里没写，这一格是补上的默认值）。 */
  'field',
  /** 认成的值（这一格真正的读数；**永不截断**，运行时原地重写的就是它）。 */
  'to',
  /** 格尾那枚「改」（装饰：整枚是按钮，这一枚说明点它会改这一格）。 */
  'pen',
  /** 某一格的候选带（**收起时 `hidden`**：一屏只留一层话，一次只摊开一格）。 */
  'tray',
  /** 候选带里的一枚候选（点它＝这一格改成它）。 */
  'pick',
  /** 候选带里那枚「不改」（取消：收起带子，这一格一动不动）。 */
  'keep',
  /** 「记过的」那一条带（点一条＝把那句话填回输入框）。 */
  'recent',
  /** 「记过的」那三个字。 */
  'lb',
  /** 记过的一条（点它＝不用打字也能换一句话）。 */
  'recall',
] as const;
export type QuickCaptureSlot = (typeof QUICK_CAPTURE_SLOTS)[number];

/** 槽类的类名（唯一拼法：别处不许再写 `QUICK_CAPTURE_CLASS + '-' + …`）。 */
export function quickCaptureSlot(slot: QuickCaptureSlot, prefix = 'ilife-'): string {
  return prefix + 'block-quick-capture-' + slot;
}

/** 形态闭集（**两档英文键**，同一份入参契约）：
 *   · `oneline`＝A 档「一行式录入 ＋ 解析预览」（录入与预览都在这一行上，哪格认错了点哪格改）；
 *   · `drawer` ＝B 档「常驻条（一行）↔ 推开的 6 格」（解析预览住进抽屉；「分开填」那枚是抽屉开关）。 */
export const QUICK_CAPTURE_FORMS = ['oneline', 'drawer'] as const;
export type QuickCaptureForm = (typeof QUICK_CAPTURE_FORMS)[number];

/* ── `data-*` 名（渲染与运行时共用的发现锚） ───────────────────────── */

/** 根（值＝机器键 `id`）。 */
export const QUICK_CAPTURE_ATTR = 'data-ilife-quick-capture';
/** 形态（值是闭集内的那一个键，照实写进标记）。 */
export const QUICK_CAPTURE_FORM_ATTR = 'data-ilife-quick-capture-form';
/** 输入框（值＝`id`）：运行时按它认「哪一句话的字变了」。 */
export const QUICK_CAPTURE_BOX_ATTR = 'data-ilife-quick-capture-box';
/** 根上：现在写的那一句话（机器读数；输入框里的字是它的另一种摆法，两处一起写）。 */
export const QUICK_CAPTURE_TEXT_ATTR = 'data-ilife-quick-capture-text';
/** 一格里的一枚（值＝这一格的机器键）。 */
export const QUICK_CAPTURE_CELL_ATTR = 'data-ilife-quick-capture-cell';
/** 这一格现在认成的机器键（运行时改完原地重写它：屏面与机器读数一起翻）。 */
export const QUICK_CAPTURE_VALUE_ATTR = 'data-ilife-quick-capture-value';
/** 格里的读数那一格（值＝这一格的机器键；运行时按它原地重写那一串字）。 */
export const QUICK_CAPTURE_READ_ATTR = 'data-ilife-quick-capture-read';
/** 某一格的候选带（值＝这一格的机器键）。 */
export const QUICK_CAPTURE_TRAY_ATTR = 'data-ilife-quick-capture-tray';
/** 候选带里的一枚候选（值＝这一枚的机器键）。 */
export const QUICK_CAPTURE_PICK_ATTR = 'data-ilife-quick-capture-pick';
/** 候选带里那枚「不改」（值＝这一格的机器键）。 */
export const QUICK_CAPTURE_KEEP_ATTR = 'data-ilife-quick-capture-keep';
/** 「存」那枚（值＝`id`）。 */
export const QUICK_CAPTURE_SAVE_ATTR = 'data-ilife-quick-capture-save';
/** 「分开填」那枚（值＝`id`）。**形态 `drawer` 下它是抽屉开关**：`aria-expanded` 说得出摊开没收起。 */
export const QUICK_CAPTURE_SPLIT_ATTR = 'data-ilife-quick-capture-split';
/** 推开的抽屉（值＝`id`；**形态 `drawer` 专属**，常驻收起时 `hidden`）。 */
export const QUICK_CAPTURE_DRAWER_ATTR = 'data-ilife-quick-capture-drawer';
/** 记过的一条（值＝`id`；那句话就是这一枚自己的字）。 */
export const QUICK_CAPTURE_RECALL_ATTR = 'data-ilife-quick-capture-recall';
/** 记账：这张卡已被运行时段接管（幂等读数，不是开关）。 */
export const QUICK_CAPTURE_BOUND_ATTR = 'data-ilife-quick-capture-bound';
/** 幂等开关：挂在 `<html>` 上（重复注入只绑一次）。 */
export const QUICK_CAPTURE_RUNTIME_ATTR = 'data-ilife-quick-capture-runtime';

/* ── 事件（冒泡 `CustomEvent`；`detail` 见 README 的「交互契约」） ────── */

/** 写的那一句话变了（打字，或点了一条记过的）：`detail={id,text}`。
 *  **页面按它重算解析预览并重渲染**（本件不猜词）：`text` 是新句子的机器读数。 */
export const QUICK_CAPTURE_EVENT_CHANGE = 'ilife:quick-capture-change';
/** 某一格改成别的了：`detail={id,key,value,to}`（`key`＝哪一格，`value`＝新机器键，`to`＝新读数）。 */
export const QUICK_CAPTURE_EVENT_PICK = 'ilife:quick-capture-pick';
/** 点了「存」：`detail={id,text,cells}`（`cells`＝每一格现在的读数，顺序＝屏上顺序）。本件不写库。 */
export const QUICK_CAPTURE_EVENT_SAVE = 'ilife:quick-capture-save';
/** 点了「分开填」：`detail={id,text}`（本件不开表单，开表单归页面）。 */
export const QUICK_CAPTURE_EVENT_SPLIT = 'ilife:quick-capture-split';

/* ── 几何与能力（判据与样式段读同一份常量） ─────────────────────── */

/** 触控地板：每一枚可点件的命中盒不小于这个数（px）。 */
export const QUICK_CAPTURE_TOUCH_PX = 44;
/** 相邻触控目标之间的缝（px）：一行里的两颗按钮、格与格、候选与候选都按它让开。 */
export const QUICK_CAPTURE_GAP_PX = 8;
/** 本件自己的**容器**名（`@container` 按它命中，不会跟别件的容器串味）。 */
export const QUICK_CAPTURE_CONTAINER = 'ilife-quick-capture';
/** 窄档断点（px）：**本件自己**窄于它就把那一行摊开（输入框占满一行，两颗按钮跟着走）。
 *  这是容器断点，不是视口断点。 */
export const QUICK_CAPTURE_NARROW_PX = 560;
/** 抽屉那 6 格走单列的容器宽（px）：本件窄于它就一格一列（两列在一格里放不下读数时，宁可往下排）。
 *  同样是容器断点。 */
export const QUICK_CAPTURE_DRAWER_NARROW_PX = 480;
/** 悬停只许是增强：这一段能力查询**样式段读它**（运行时不抢焦点，不读它）。 */
export const QUICK_CAPTURE_HOVER_QUERY = '(hover: hover) and (pointer: fine)';
/** 输入框在窄档下的最小可用宽（px）：比它再窄就整行占满（不让输入框被两颗按钮挤成一道缝）。 */
export const QUICK_CAPTURE_BOX_MIN_PX = 120;
/** 一格能改成的那几枚候选：**至少 1 枚、至多 6 枚**（一个都改不了的格不该做成可点件）。 */
export const QUICK_CAPTURE_MIN_CHOICES = 1;
export const QUICK_CAPTURE_MAX_CHOICES = 6;
/** 一句话能拆成几格：**至少 1 格、至多 6 格**。 */
export const QUICK_CAPTURE_MIN_CELLS = 1;
export const QUICK_CAPTURE_MAX_CELLS = 6;
/** 「记过的」最多摆几条（0 条＝不出这一条带）。 */
export const QUICK_CAPTURE_MAX_RECENT = 4;

/* ── 形（选中／打开那两档的「形」那一半：不只靠颜色） ─────────────── */

/** 候选带里现在这一枚前面那枚勾。 */
export const QUICK_CAPTURE_TICK = '✓';
/** 候选带里现在这一枚的勾选槽位宽（px）：**未选也留同宽**，一排候选的左右沿才齐平。 */
export const QUICK_CAPTURE_TICK_PX = 14;
/** 格尾那枚「改」的高度（px）：它住在整枚按钮里，是**记号不是命中盒**（命中盒＝整枚格 ≥44）。 */
export const QUICK_CAPTURE_PEN_PX = 32;

/* ── 文案（缺省的那几句；调用方换句子与格名，这几枚控制字样别换） ─────
 *
 *  **屏上只留一层话**：这一份里每一句都是「这一处是什么／这一枚按了会怎样」，
 *  一句解释性的话都没有（「认错了点那一格改」这类口径由**格上那枚「改」**承担，不由句子承担）。 */

export const QUICK_CAPTURE_TEXT = Object.freeze({
  /** 行首那枚小签。 */
  lead: '随手记',
  /** 左边是原话、右边是认成的值，中间这一枚（印在左边那一截的末尾：「午饭」＝）。 */
  eq: '＝',
  /** 格尾那枚（点它会改这一格）。 */
  pen: '改',
  /** 候选带里那枚取消。 */
  keep: '不改',
  /** 主按钮。 */
  save: '存',
  /** 第二颗按钮。 */
  split: '分开填',
  /** 「记过的」那三个字。 */
  recentLead: '记过的',
  /** 抽屉标题里那一段连接（「分开填 · 6 格」）：标题＝`split ＋ 这一截 ＋ 格数 ＋ 单位`。 */
  drawerJoin: ' · ',
  /** 抽屉标题里的单位（「分开填 · 6 格」）。 */
  drawerUnit: ' 格',
  /** 输入框的无障碍名（不上屏）。 */
  boxLabel: '一句话记一笔',
  /** 候选带的无障碍名尾巴（不上屏）：`<这一格叫什么>能改成`。 */
  trayLead: '能改成',
} as const);

/* ── 入参类型 ───────────────────────────────────────────────────── */

/** 一格能改成的那一枚（词表里的一项：机器键 ＋ 屏上那两个字）。 */
export interface QuickCaptureChoice {
  /** 机器键（事件 `detail.value` 就是它）。**非空、只许标识符字符**，同一格内唯一。 */
  readonly key: string;
  /** 屏上那一串（如「餐饮」／「32.00」／「现金账户」）。**非空、且不能只有空白**；长了换行，绝不截断。 */
  readonly label: string;
}

/** 一句话拆出来的一格（哪一格认错了，点哪一格改）。 */
export interface QuickCaptureCell {
  /** 这一格的机器键（如 `category`／`amount`；事件 `detail.key` 就是它）。**非空、只许标识符字符**，表内唯一。 */
  readonly key: string;
  /** 这一格现在认成的机器键：**必须命中 `choices` 里的一枚**（屏上那一串就是它的名字）。 */
  readonly value: string;
  /** 这一格能改成的那几枚（**含现在这一枚**；1–6 枚）。一枚都不给＝这一格改不了，那种格不许做成可点件。 */
  readonly choices: readonly QuickCaptureChoice[];
  /** 原文那一截（如「午饭」；屏上印成「午饭」）。**与 `label` 恰好给一个**：
   *  给了它＝这一格是从这句话里认出来的。**非空、且不能只有空白**。 */
  readonly from?: string;
  /** 这一格叫什么（如「日期」）。**与 `from` 恰好给一个**：给了它＝原文里没写这一格，
   *  它是**补上的**（屏上不带引号，形是虚线边框）。**非空、且不能只有空白**。 */
  readonly label?: string;
}

/** 快速录入条入参。`id`／`text`／`cells` 三样必填——没有 `text` 就没有「写的那一句话」，
 *  没有 `cells` 就没有「它认出来的几格」（两半各印一半，屏上会自相矛盾）。 */
export interface QuickCaptureInput {
  /** 机器键（根上的发现锚与事件 `detail.id` 都拿它）。**非空、只许标识符字符**。 */
  readonly id: string;
  /** 现在写着的那一句话（如「午饭 32 元 现金」）。**非空、且不能只有空白**。 */
  readonly text: string;
  /** 一句话拆出来的几格（**1–6 格**，顺序＝屏上顺序）。**调用的那一方算出来的**：本件不猜词。 */
  readonly cells: readonly QuickCaptureCell[];
  /** 「记过的」那几条（0–4 条，每条是一句完整的话；点一条＝把它填回输入框）。不给＝不出这一条带。 */
  readonly recent?: readonly string[];
  /** 形态键（闭集，缺省 `oneline`）。 */
  readonly form?: QuickCaptureForm;
  /** 附加类名（空格分隔；逐个过类名正则）。 */
  readonly extraClass?: string;
}

/** 一格在「认成哪一枚」这件事上的唯一口径：**渲染期标选中态、运行时段翻选中态跑的是同一份源码**
 *  （`buildQuickCaptureJs()` 把它的 `toString()` 原样嵌进产出的 JS）。
 *
 *  故函数体只许读**自己的入参**（不许碰模块作用域里的任何名字），返回命中的那一枚的机器键；
 *  一枚都不命中＝`''`（这种情形由入参校验挡住，运行时段不做兜底猜谜）。 */
export function quickCaptureChoiceOn(keys: readonly string[], value: string): string {
  for (const key of keys) {
    if (key === value) return key;
  }
  return '';
}
