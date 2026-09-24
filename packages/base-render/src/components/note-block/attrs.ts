/** note-block · **标记契约**（渲染与调用方共用的唯一事实：类名／形态闭集／语气闭集／入参类型）。
 *
 *  这一件是**重做件**（原型墙 3/3/3，`.scratch/ui-组件墙/重做设计口径.md` §5）：
 *  原型的**引语形态（B）三套皮肤全 2 分**——那个骨架（一根短横线 ＋ 一句斜体话）**直接砍掉**。
 *  留下的骨架靠**竖线 ＋ 缩进 ＋ 底色块**立层次：这三样在**零阴影、零圆角**的皮肤下都成立（投影一没，靠"浮起来"分家的件就塌）。
 *
 *  长备注**默认收起**（原生 `<details>`，首行给一句摘要）；带**归属**（「08-30 的备注」）与可选时间。
 *  **可编辑形态不在这里**：改备注走既有的 `editable-value`（同一条「值即入口」的路），本件不另造一套编辑入口。
 */

/** 本件的类名根。 */
export const NOTE_BLOCK_CLASS = 'ilife-block-note-block';

/** 槽位闭集。 */
export const NOTE_BLOCK_SLOTS = [
  /** 收起时的那一排（原生 `<summary>`：归属 ＋ 时间 ＋ 字数 ＋ 摘要）。 */
  'head',
  /** 展开三角（纯装饰；`<details>` 自己管开关，这里只画形状）。 */
  'caret',
  /** 归属（「08-30 的备注」）。 */
  'owner',
  /** 可选时间（「最后改于 09-25 20:14」）。 */
  'time',
  /** 语气字（「存疑」）：**语气非无时必出**——色不是唯一信息。 */
  'tone',
  /** 字数（「412 字」，由本件算）。 */
  'len',
  /** 收起时那行摘要（正文首行截出来的那一句）。 */
  'peek',
  /** 正文块（竖线 ＋ 缩进 ＋ 底色块就在它身上）。 */
  'body',
  /** 正文里的一段（一段一枚 `<p>`；换行按段拆）。 */
  'line',
  /** 归属行（展开后落在正文末尾：「附着于 09-25 体重」）。 */
  'att',
] as const;
export type NoteBlockSlot = (typeof NOTE_BLOCK_SLOTS)[number];

/** 槽类的类名（唯一拼法）。 */
export function noteBlockSlot(slot: NoteBlockSlot, prefix = 'ilife-'): string {
  return prefix + 'block-note-block-' + slot;
}

/** 形态闭集：本件只落地了形态 A「竖线备注」。**引语形态（B）已砍**（三套皮肤全 2 分，骨架不成立）。 */
export const NOTE_BLOCK_FORMS = ['note'] as const;
export type NoteBlockForm = (typeof NOTE_BLOCK_FORMS)[number];

/** 语气闭集（只改**取值**：竖线与底色块的颜色）。 */
export const NOTE_BLOCK_TONES = ['quiet', 'warn', 'danger'] as const;
export type NoteBlockTone = (typeof NOTE_BLOCK_TONES)[number];

/** 收起与否的那条线（字数）：正文长过它默认收起。 */
export const NOTE_BLOCK_COLLAPSE_CHARS = 80;

/** 摘要最多写几个字（首行截出来的那一句）。 */
export const NOTE_BLOCK_PEEK_CHARS = 24;

/** 摘要截断记号（**只用在摘要那一行**：正文里一个字都不许截）。 */
export const NOTE_BLOCK_ELLIPSIS = '…';

/** 字数那一格的说法（「412 字」）。 */
export const NOTE_BLOCK_LEN_SUFFIX = ' 字';

/** 归属行中间那个前导号（样式画，不由标记写；这里只记它是什么）。 */
export const NOTE_BLOCK_ATT_PREFIX = '附着于';

/** 备注块的入参。`text` 必填——没有正文的「备注块」是一个空壳。 */
export interface NoteBlockInput {
  /** 备注正文（「当时为什么这么记」）。**非空**；换行按段拆成逐段 `<p>`。 */
  readonly text: string;
  /** 归属（「08-30 的备注」）；不给＝头上只有时间／语气。 */
  readonly owner?: string;
  /** 可选时间（「最后改于 09-25 20:14」）。 */
  readonly time?: string;
  /** 语气档（缺省 `quiet`）。**非 `quiet` 时 `toneLabel` 必填**：色不是唯一信息。 */
  readonly tone?: NoteBlockTone;
  /** 语气字（「存疑」「口径待核」）：说清这个语气**是什么**。 */
  readonly toneLabel?: string;
  /** 收起时那行摘要；不给＝本件从正文首行截一句（最多 `NOTE_BLOCK_PEEK_CHARS` 字）。 */
  readonly summary?: string;
  /** 附着在哪条记录上（「09-25 体重」）；给了它，正文末尾出归属行。 */
  readonly attachedTo?: string;
  /** 强制收起／强制展开；不给＝按正文字数自动判（`NOTE_BLOCK_COLLAPSE_CHARS`）。 */
  readonly collapse?: boolean;
  /** 形态键（闭集，缺省 `note`）。 */
  readonly form?: NoteBlockForm;
  /** 附加类名（空格分隔；逐个过类名正则）。 */
  readonly extraClass?: string;
}
