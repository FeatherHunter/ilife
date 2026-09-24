/** confirm-strip · **标记契约**（渲染与运行时共用的唯一事实：类名／槽位／`data-*`／事件名／闭集／入参类型）。
 *
 *  这一件落地的是原型墙 `.scratch/ui-组件墙/parts-09-选择与反馈.mjs` 里 47 二次确认条的
 *  **形态 A「清单式：把要删的列出来」**（2026-09 用户裁定落地的那一形态），按层规重写
 *  （原型是一次性代码：无判据、无错误处理、读的是墙稿变量）。
 *
 *  这一件替掉三种错法：
 *   · 「确定／取消」两个词 —— 读的人不知道按下去会删掉什么、删几条、能不能撤销；
 *   · 只说「要删掉这 3 条？」却不把三条列出来 —— 用户得回上一屏比对；
 *   · 危险档**只靠红** —— 大字报刊皮肤下强调色是墨黑，红一失手，危险与普通动作长得一样。
 *  所以本件的两个结构性口径都写进标记里：
 *   ① **危险按钮自己带动词与条数**（`<dangerVerb>这 <count> <unit>`，由本件拼，不交给调用方写「确定」）；
 *   ② **能不能撤销写在标记里**（徽标 ＋ 那句后果话），色只是第三样。
 *
 *  形态键住 `CONFIRM_STRIP_FORMS` 闭集（今天只有 `list` 一格）：加第二形态是往闭集里加一格，
 *  不是新开一件（「形态是骨架，不是地址」）。闭集外的值一律 `badInput`（不静默降级：
 *  降级会让调用方以为自己拿到了另一种骨架）。
 */

/** 本件的类名根：全部槽位类名都是 `CONFIRM_STRIP_CLASS + '-' + 槽名`。 */
export const CONFIRM_STRIP_CLASS = 'ilife-block-confirm-strip';

/** 槽位闭集（标记契约的一部分：`render.ts`、`runtime.ts` 与判据都用这里的名字拼类名，不各抄一份字面量）。 */
export const CONFIRM_STRIP_SLOTS = [
  /** 题面那一排：徽标 ＋ 题面。 */
  'head',
  /** 徽标：**用字说出能不能撤销**（不靠色）。 */
  'badge',
  /** 题面（缺省由本件拼「要删掉这 3 条吗？」）。 */
  'title',
  /** 要删掉的每一条（`<ul>`）。 */
  'items',
  /** 一条（`<li>`）。 */
  'item',
  /** 这一条叫什么（内容是**点名**的要害）。 */
  'name',
  /** 这一条的旁证（时间／域／账户）。 */
  'meta',
  /** 这一条的值（金额／热量／字数；右对齐等宽数字）。 */
  'value',
  /** 可选复选项（删之前先备份之类）——整行是命中区。 */
  'opt',
  /** 复选框本体（视觉画在 `optbox` 上，控件本身留在可聚焦位置）。 */
  'optbox',
  /** 复选项的文字。 */
  'opttext',
  /** 后果话：能不能撤销、撤销入口在哪、保留多久。 */
  'note',
  /** 状态行（`busy`／`disabled` 时出字；三种状态都占位 ⇒ 切状态不跳版）。 */
  'status',
  /** 动作排：左安全、右危险。 */
  'acts',
  /** 安全动作（左）。 */
  'keep',
  /** 危险动作（右）：字是动词 ＋ 条数。 */
  'danger',
] as const;
export type ConfirmStripSlot = (typeof CONFIRM_STRIP_SLOTS)[number];

/** 槽类的类名（唯一拼法：别处不许再写 `CONFIRM_STRIP_CLASS + '-' + …`）。 */
export function confirmStripSlot(slot: ConfirmStripSlot, prefix = 'ilife-'): string {
  return prefix + 'block-confirm-strip-' + slot;
}

/** 形态键属性（值＝`ConfirmStripForm`）；运行时不读它，判据与皮肤矩阵判据读它。 */
export const CONFIRM_STRIP_FORM_ATTR = 'data-ilife-confirm-form';
/** 状态键属性（值＝`ConfirmStripState`）：运行时不读它也能干活，判据读它。 */
export const CONFIRM_STRIP_STATE_ATTR = 'data-ilife-confirm-state';
/** 动作键属性：值＝`keep`｜`danger`。**运行时的发现锚**（事件委派读它，不认类名）。 */
export const CONFIRM_STRIP_ACT_ATTR = 'data-ilife-confirm-act';
/** 条数（机器读数：页面重算与运行时事件都读它，不从字面上抠数字）。 */
export const CONFIRM_STRIP_COUNT_ATTR = 'data-ilife-confirm-count';
/** 量词（机器读数：与条数一起进事件 `detail`）。 */
export const CONFIRM_STRIP_UNIT_ATTR = 'data-ilife-confirm-unit';
/** 不可撤销标记：`1` ＝ 不可撤销。样式据它上双线框与字重（**危险档的第二种手段**）。 */
export const CONFIRM_STRIP_IRREVERSIBLE_ATTR = 'data-ilife-confirm-irreversible';
/** 备份复选项的命中锚（运行时读它的勾选态，进事件 `detail.backup`）。 */
export const CONFIRM_STRIP_BACKUP_ATTR = 'data-ilife-confirm-backup';
/** 绑定完成标记（运行时幂等：重复注入不重复绑定）。 */
export const CONFIRM_STRIP_BOUND_ATTR = 'data-ilife-confirm-bound';

/** 危险动作事件名（冒泡 `CustomEvent`，`detail = { action, count, unit, irreversible, backup }`）。
 *  页面用 `document.addEventListener(CONFIRM_STRIP_EVENT_COMMIT, …)` 接自己的删除逻辑——**不引入全局**。 */
export const CONFIRM_STRIP_EVENT_COMMIT = 'ilife:confirm';
/** 安全动作（再想想／Esc）事件名：`detail = { action, count, unit, irreversible, backup }`。 */
export const CONFIRM_STRIP_EVENT_CANCEL = 'ilife:confirm-cancel';

/** 形态闭集：本件只落地形态 A「清单式：把要删的列出来」。 */
export const CONFIRM_STRIP_FORMS = ['list'] as const;
export type ConfirmStripForm = (typeof CONFIRM_STRIP_FORMS)[number];

/** 状态闭集。三档的差别只有两处：按钮可不可点、状态行说什么（**版面一字不动**⇒ 切状态不跳版）。 */
export const CONFIRM_STRIP_STATES = ['rest', 'busy', 'disabled'] as const;
export type ConfirmStripState = (typeof CONFIRM_STRIP_STATES)[number];

/** 动作闭集（`data-ilife-confirm-act` 的取值）。 */
export const CONFIRM_STRIP_ACTS = ['keep', 'danger'] as const;
export type ConfirmStripAct = (typeof CONFIRM_STRIP_ACTS)[number];

/** **空词表**：这些词不回答「按下去会怎样」，一律不许当危险动词。
 *  写的是闭集不是正则——「删除」这种**光有动词、没有对象与条数**的情形由本件拼装时补全
 *  （危险按钮恒为 `<动词>这 <条数> <单位>`），所以这里只拦「确定」这类纯确认词。 */
export const CONFIRM_STRIP_BARE_WORDS = [
  '确定', '确认', '好', '好的', '是', '是的', '行', '可以', '提交', '继续', '下一步', 'OK', 'ok', 'yes', 'no',
] as const;

/** 量词缺省值（「3 **条**记录」）：六个技能的记录都以「条」计。 */
export const CONFIRM_STRIP_UNIT_DEFAULT = '条';
/** 安全按钮的缺省字（左边的动作恒是「先别删」）。 */
export const CONFIRM_STRIP_KEEP_DEFAULT = '再想想';
/** 不可撤销时的缺省后果话（调用方可用 `loss` 覆盖得更具体）。 */
export const CONFIRM_STRIP_LOSS_DEFAULT = '删掉之后找不回来，也没有回收站。';
/** 缺省的备份复选项文字（`backup: true` 且没给 `backupLabel` 时用这一句）。 */
export const CONFIRM_STRIP_BACKUP_DEFAULT = '删之前先把这几条导出备份';

/** 要删掉的一条（**点名**：这三格合起来让用户认得出「就是它」）。 */
export interface ConfirmStripItem {
  /** 这一条叫什么（非空；长名可换行，不许 `…` 截断）。 */
  readonly name: string;
  /** 旁证：时间／域／账户／分类（可选）。 */
  readonly meta?: string;
  /** 这一条的值：金额／热量／字数（可选；右对齐等宽数字，**永不截断**）。 */
  readonly value?: string;
}

/** 二次确认条入参。形状定死**删记录**这一件事：说什么（`dangerVerb`）＋ 删几条（`count` ＋ `items`）
 *  ＋ 能不能撤销（`undoable` ＋ `undoHint`／`loss`）。 */
export interface ConfirmStripInput {
  /** 危险动词（**动词打头**，如「删掉」「永久删除」「丢弃」）；不许是「确定」这类空词、不许带空白。 */
  readonly dangerVerb: string;
  /** 删几条（整数 ≥1），且**必须与 `items` 的条数相等**（说不清「删几条 vs 列出几条」就是错）。 */
  readonly count: number;
  /** 要删掉的每一条（非空数组，逐条点名）。 */
  readonly items: readonly ConfirmStripItem[];
  /** 能不能撤销。`true` ⇒ 必须给 `undoHint`；`false` ⇒ 出不可撤销的后果话（`loss` 可覆盖）。 */
  readonly undoable: boolean;
  /** 撤销入口与保留期（`undoable: true` 时**必填**，如「入口在本页顶部的『最近删除』，保留 30 天」）。 */
  readonly undoHint?: string;
  /** 不可撤销时的后果话（只在 `undoable: false` 时有效；不给＝用本件缺省那句）。 */
  readonly loss?: string;
  /** 题面（缺省＝本件拼「要删掉这 3 条吗？」）；自己写时也要点名条数。 */
  readonly title?: string;
  /** 量词（缺省「条」）。 */
  readonly unit?: string;
  /** 安全按钮的字（缺省「再想想」）。 */
  readonly keepLabel?: string;
  /** 要不要出「删之前先备份」那一项（缺省不出）。 */
  readonly backup?: boolean;
  /** 备份项的措辞（只在 `backup: true` 时有效；不给＝用 `CONFIRM_STRIP_BACKUP_DEFAULT`）。 */
  readonly backupLabel?: string;
  /** 状态（缺省 `rest`）：`busy` ＝ 正在执行；`disabled` ＝ 现在不能做（**必须**同时给 `disabledHint`）。 */
  readonly state?: ConfirmStripState;
  /** `state: 'disabled'` 时**必填**：为什么现在不能做（禁用的"看着能点、点了没反应"是不许留的中间档）。 */
  readonly disabledHint?: string;
  /** 形态键（闭集，缺省 `list`）。 */
  readonly form?: ConfirmStripForm;
  /** 附加类名（空格分隔；逐个过类名正则）。 */
  readonly extraClass?: string;
}
