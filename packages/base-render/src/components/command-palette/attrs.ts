/** command-palette · **标记契约**（渲染与运行时共用的唯一事实：类名／`data-*`／事件名／闭集／入参类型）。
 *
 *  这一件落地的是原型墙（`.scratch/ui-组件墙/新件/parts-交互与流程.mjs` 第 81 件，2026-09 用户裁定）
 *  里的**形态 A「单栏分组结果（动作在前／页面在后）」**——一页顶部一枚**看得见的**入口键，
 *  点开是一块面板：搜一行 ＋「动作（在当前技能里直接做）」一组 ＋「页面（跳到别的技能）」一组，
 *  每一行整行可点、行右一格写着这一行要干什么；收起来靠面板里那枚 ✕ 或点面板外。
 *
 *  它替掉的错法（原型墙那一格的原文）：功能藏在三级菜单里只能一层层点进去找，以及
 *  **把入口做成隐式**（按某个键才出现）——那条路在手机上等于不存在（见 `docs/base/base-render/触屏优先.md`）。
 *  用户点名要的四样东西，逐条落在本文件与 `render.ts`／`runtime.ts` 里：
 *   ① 入口＝页头一枚**看得见、点得到**的按钮；② 面板里**整行可点＝执行或打开**；
 *   ③ **零键帽**（标记与文案里没有 ⌘K／方向键／Esc 那一路，也没把它们当唯一通路）；
 *   ④ 空输入时列的是**常用去处**，不是「等您按某个键」。
 *
 *  形态键写在 `COMMAND_PALETTE_FORMS`（闭集）：本件只有一格（原型形态 A），但键必须存在——
 *  「形态是骨架，不是地址」，日后加第二形态（原型形态 B「两栏：先选技能，再看它的页面与动作」）是在
 *  闭集里加一格，不是新开一件。闭集外的值一律 `badInput`（不静默降级：降级会让调用方以为自己拿到了另一种骨架）。
 */

/** 本件的类名根：全部槽位类名都是 `COMMAND_PALETTE_CLASS + '-' + 槽名`。 */
export const COMMAND_PALETTE_CLASS = 'ilife-block-command-palette';

/** 槽位闭集（标记契约的一部分：`render.ts`／`style.ts`／`runtime.ts` 与判据都用这里的名字拼类名）。 */
export const COMMAND_PALETTE_SLOTS = [
  /** 入口那一排：一枚看得见的按钮 ＋ 一句提示（页头放它就够）。 */
  'entry',
  /** 入口键（`popovertarget` 指面板；**不靠脚本也开得出来**）。 */
  'open',
  /** 入口键里那枚记号（纯装饰，`aria-hidden`；形状由标记里的 SVG 给）。 */
  'mark',
  /** 入口键旁边那行提示（说明这一枚就是入口）。 */
  'hint',
  /** 面板本体（`popover`）：输入行 ＋ 分组 ＋ 脚注。 */
  'panel',
  /** 输入行（输入框 ＋ 关掉键）。 */
  'in',
  /** 搜索输入框。 */
  'q',
  /** 关掉键（44×44；面板外的空白处也能关）。 */
  'x',
  /** 错态那一行（写在输入框下边，并由输入框的 `aria-describedby` 指到它）。 */
  'err',
  /** 一枚分组标题（动作／页面）。 */
  'grp',
  /** 一组的行容器（行与行之间留 8px 缝：相邻触控目标的地板）。 */
  'rows',
  /** 一行结果（**整行就是那颗按钮**）。 */
  'row',
  /** 行左那枚来源技能片（如「卡路里」）。 */
  'sk',
  /** 行的文字格（主文字 ＋ 副文字）。 */
  'tx',
  /** 行主文字（命中词在这里被标出来；**许换行、不许 `…` 截断**）。 */
  'lb',
  /** 行副文字（一行一句人话：这条现在是什么样）。 */
  'nt',
  /** 行右那一格「这一行要干什么」（执行／打开）——**是整行那颗按钮的写法，不是第二颗按钮**。 */
  'act',
  /** 空态（一条都没命中时出来，`role="status"` 会念出来）。 */
  'empty',
  /** 脚注行：这一屏现在是什么状态（常用去处／命中几条／换个词／正在找）。 */
  'foot',
  /** 命中词（`<mark>`：形是下划线加粗，字是加粗 ⇒ 不只靠颜色）。 */
  'hit',
] as const;
export type CommandPaletteSlot = (typeof COMMAND_PALETTE_SLOTS)[number];

/** 槽类的类名（唯一拼法：别处不许再写 `COMMAND_PALETTE_CLASS + '-' + …`）。 */
export function commandPaletteSlot(slot: CommandPaletteSlot, prefix = 'ilife-'): string {
  return prefix + 'block-command-palette-' + slot;
}

/** 形态闭集：本件只落地**形态 A「单栏分组结果（动作在前／页面在后）」**。
 *  键名用打分台账里的字母（与 `result-row` 的 `RESULT_FORMS` 同一口径）——
 *  A ＝ 单栏分组（本件）；B ＝ 两栏先选技能（未落地，仍在原型墙里等复看）。 */
export const COMMAND_PALETTE_FORMS = ['A'] as const;
export type CommandPaletteForm = (typeof COMMAND_PALETTE_FORMS)[number];

/** 行档闭集（顺序即屏上顺序：**动作在前、页面在后**——这正是形态 A 的识别特征）。 */
export const COMMAND_PALETTE_KINDS = ['action', 'page'] as const;
export type CommandPaletteKind = (typeof COMMAND_PALETTE_KINDS)[number];

/* ── `data-*` 名（渲染与运行时共用的发现锚） ───────────────────────── */

/** 根（值＝面板 `id`）。 */
export const COMMAND_PALETTE_ATTR = 'data-ilife-command-palette';
/** 入口键（值＝面板 `id`）：运行时按它找「开合记录在哪一颗键上」。 */
export const COMMAND_PALETTE_OPEN_ATTR = 'data-ilife-command-palette-open';
/** 面板（值＝面板 `id`）。 */
export const COMMAND_PALETTE_PANEL_ATTR = 'data-ilife-command-palette-panel';
/** 搜索输入框（值＝面板 `id`）。 */
export const COMMAND_PALETTE_QUERY_ATTR = 'data-ilife-command-palette-query';
/** 关掉键（值＝面板 `id`；关的动作由 `popovertargetaction="hide"` 白送）。 */
export const COMMAND_PALETTE_CLOSE_ATTR = 'data-ilife-command-palette-close';
/** 一行（值＝这一行的机器值）。 */
export const COMMAND_PALETTE_ITEM_ATTR = 'data-ilife-command-palette-item';
/** 一行的档（值＝`action`／`page`）：分组标题按它认领自己那一组。 */
export const COMMAND_PALETTE_KIND_ATTR = 'data-ilife-command-palette-kind';
/** 一行的**可搜底串**（小写；输入框里打的词在它里面找子串）。 */
export const COMMAND_PALETTE_SEARCH_ATTR = 'data-ilife-command-palette-search';
/** 行的主文字格（运行时按它重画命中词；它的 `textContent` 就是那一行的主文字）。 */
export const COMMAND_PALETTE_LABEL_ATTR = 'data-ilife-command-palette-label';
/** 分组标题（值＝档名）。 */
export const COMMAND_PALETTE_GROUP_ATTR = 'data-ilife-command-palette-group';
/** 空态那一行。 */
export const COMMAND_PALETTE_EMPTY_ATTR = 'data-ilife-command-palette-empty';
/** 脚注行（这一屏现在是什么状态）。 */
export const COMMAND_PALETTE_FOOT_ATTR = 'data-ilife-command-palette-foot';
/** 命中词（`<mark>`）。 */
export const COMMAND_PALETTE_HIT_ATTR = 'data-ilife-command-palette-hit';
/** 载入档（挂在面板上；值 `1`）。 */
export const COMMAND_PALETTE_LOADING_ATTR = 'data-ilife-command-palette-loading';
/** 错态那一行（值 `1`）。 */
export const COMMAND_PALETTE_ERROR_ATTR = 'data-ilife-command-palette-error';
/** 记账：这枚入口键已被运行时段接管（幂等读数，不是开关）。 */
export const COMMAND_PALETTE_BOUND_ATTR = 'data-ilife-command-palette-bound';
/** 幂等开关：挂在 `<html>` 上（重复注入只绑一次）。 */
export const COMMAND_PALETTE_RUNTIME_ATTR = 'data-ilife-command-palette-runtime';

/* ── 事件（冒泡 `CustomEvent`；`detail` 见 README 的「交互契约」） ────── */

/** 点了一行（或按下回车那一路由页面自己接）：`detail={id,value,kind,label}`；面板此时已收起。 */
export const COMMAND_PALETTE_EVENT_RUN = 'ilife:command-palette-run';
/** 输入即筛之后报一次真读数：`detail={id,query,hits}`（hits＝现在露着的行数）。 */
export const COMMAND_PALETTE_EVENT_QUERY = 'ilife:command-palette-query';

/* ── 几何与能力（判据与样式段读同一份常量） ─────────────────────── */

/** 触控地板：命中盒不小于这个数（px）。 */
export const COMMAND_PALETTE_TOUCH_PX = 44;
/** 行高下限（px）：整行是命中区，比地板再宽裕一档。 */
export const COMMAND_PALETTE_ROW_MIN_PX = 48;
/** 相邻触控目标的缝（px）：行与行之间、独立控件之间都按它让开。 */
export const COMMAND_PALETTE_GAP_PX = 8;
/** 面板宽上限（px）：宽档下也不铺满屏（它是浮面，不是整页）。 */
export const COMMAND_PALETTE_PANEL_MAX_PX = 640;
/** 面板离屏边至少留多少（px）。 */
export const COMMAND_PALETTE_EDGE_PX = 14;
/** 面板自己的**容器**名（`@container` 按它命中，不会跟别件的容器串味）。 */
export const COMMAND_PALETTE_CONTAINER = 'ilife-command-palette-panel';
/** 窄档断点（px）：**面板自己**窄于它就把行改成两行（来源技能片独占一行）。这是容器断点，不是视口断点。 */
export const COMMAND_PALETTE_NARROW_PX = 560;
/** 悬停只许是增强：这一段能力查询**样式段与运行时读同一个串**（两边必须说同一件事）。 */
export const COMMAND_PALETTE_HOVER_QUERY = '(hover: hover) and (pointer: fine)';

/* ── 文案（缺省的那几句；调用方可以换，但语义别换） ─────────────────── */

/** 缺省文案与状态句（渲染期与运行时段**读同一份**，免得两处各写一句）。 */
export const COMMAND_PALETTE_TEXT = Object.freeze({
  /** 入口键上的字。 */
  entry: '找页面 / 动作',
  /** 入口键旁那行提示：它解释「入口就是这一枚，不用记任何东西」。 */
  hint: '页头这一枚就是入口，点它就行。',
  /** 分组标题两枚，以及它们各自的说明。 */
  actionGroup: '动作',
  actionNote: '在当前技能里直接做',
  pageGroup: '页面',
  pageNote: '跳到别的技能',
  /** 行右那一格的字：动作是「执行」，页面是「打开」。 */
  actAction: '执行',
  actPage: '打开',
  /** 停用那一档：行的副文字写原因，行右那格写这个。 */
  off: '不可用',
  offPrefix: '不可用：',
  /** 关掉键的无障碍名（键上写的是 ✕）。 */
  close: '关掉',
  /** 输入框的无障碍名。 */
  query: '搜页面与动作',
  /** 空态：没有一条命中时写的那句话（中间夹着用户打的词）。 */
  emptyPre: '没有找到与「',
  emptyPost: '」相关的页面或动作。',
  /** 脚注四档：空输入列常用去处／命中几条／一条没中／正在找。 */
  footIdle: '列的是常用去处，点任意一行就执行或打开。',
  footHitPre: '命中 ',
  footHitPost: ' 条，点任意一行就执行或打开。',
  footNone: '换个短一点的词试试。',
  footBusy: '正在找…',
} as const);

/* ── 入参类型 ───────────────────────────────────────────────────── */

/** 一行结果：一个动作（在当前技能里就地做）或一个页面（跳到别处）。 */
export interface CommandPaletteItem {
  /** 机器值（点这一行时原样送出）。**非空、只许标识符字符**，面板内唯一。 */
  readonly id: string;
  /** 档：`action`（动作，分组在前）／`page`（页面，分组在后）。 */
  readonly kind: CommandPaletteKind;
  /** 主文字（如「记体重」）。**非空**；命中词在这里标出来；许换行、不许 `…` 截断。 */
  readonly label: string;
  /** 副文字（一行一句人话，如「上次 68.4 kg（09-24）」）。 */
  readonly note?: string;
  /** 来源技能（行左那枚片，如「卡路里」）；不给＝不出这枚片。 */
  readonly skill?: string;
  /** 行右那一格的字（缺省：动作＝`执行`，页面＝`打开`）。 */
  readonly go?: string;
  /** 行右那一格要强调的那一档：给了就用它（颜色由样式段给，取值走皮肤）。 */
  readonly primary?: boolean;
  /** 搜得着但不上屏的别名（拼音、旧叫法）；不给＝只按主文字／副文字／来源技能找。 */
  readonly keywords?: string;
  /** 停用档：这一行现在点不动（**必须同时给 `why`**：停用要说得清为什么）。 */
  readonly disabled?: boolean;
  /** 停用的原因（一行一句人话，写在行的副文字那一位）。`disabled` 为真时必填。 */
  readonly why?: string;
}

/** 命令面板入参。`id`／`items` 两样必填——没有 `id` 就接不上入口键与面板（`popovertarget` 认的是它）。 */
export interface CommandPaletteInput {
  /** 面板 `id`（同页唯一；也是入口键 `popovertarget` 指的那个 id）。**只许标识符字符**。 */
  readonly id: string;
  /** 面板条目（顺序＝组内顺序；**分组由 `kind` 决定：动作在前、页面在后**）。至少一项。 */
  readonly items: readonly CommandPaletteItem[];
  /** 入口键上的字（缺省 `找页面 / 动作`）。 */
  readonly entry?: string;
  /** 入口键旁那行提示（缺省一句；空串＝未给）。 */
  readonly hint?: string;
  /** 面板的无障碍名（缺省＝入口键上的字）。 */
  readonly label?: string;
  /** 面板打开时的初值（渲染期就按它筛一遍；不给＝空，列常用去处）。 */
  readonly query?: string;
  /** 面板的错态（写在输入框下边的那一句；给了就出这一行）。 */
  readonly error?: string;
  /** 面板的载入档：脚注原地换成「正在找…」，行与宽度都不动。 */
  readonly loading?: boolean;
  /** 形态键（闭集，缺省 `A`）。 */
  readonly form?: CommandPaletteForm;
  /** 附加类名（空格分隔；逐个过类名正则）。 */
  readonly extraClass?: string;
}
