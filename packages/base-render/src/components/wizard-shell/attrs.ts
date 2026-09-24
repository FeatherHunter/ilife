/** wizard-shell · **标记契约**（渲染与运行时共用的唯一事实：类名／槽位／`data-*`／事件名／闭集／入参类型）。
 *
 *  这一件落地的是原型墙（`.scratch/ui-组件墙/新件/parts-交互与流程.mjs` 第 84 件）里
 *  **用户打 4/4/4 的那一档＝形态 B「一问一屏（大字问题 ＋ 一条细进度）」**：
 *  一条细进度（N 格）→ 读数行「第 n / N 问」→ 大字问题 → 这一问的答法 → 脚行三枚键。
 *
 *  它替掉的两种错法：
 *   · 「五组字段一屏灌下来」——填到一半不知道还剩几问、也不知道哪些已经填过；
 *   · 「填到第 3 问退出去，回来从第 1 问重来」——本件把「当前是第几问」写在根属性上
 *     （`data-ilife-wizard-step`／`-total`），页面拿它当草稿的坐标，回来直接渲染同一问。
 *
 *  **回退**是这一档的第三条腿：脚行恒有「上一问」；它在第 1 问上**按不动**（原生 `disabled`），
 *  而「为什么按不动」写在读数行的次段里（`aside` 那枚 `<span>`，按钮用 `aria-describedby` 指到它）。
 *
 *  形态键写在 `WIZARD_SHELL_FORMS`（闭集）：本件只落地形态 B「一问一屏」。闭集外的值一律 `badInput`
 *  （不静默降级——降级会让调用方以为自己拿到了另一种骨架）。
 */

/** 本件的类名根：全部槽位类名都是 `WIZARD_SHELL_CLASS + '-' + 槽名`。 */
export const WIZARD_SHELL_CLASS = 'ilife-block-wizard-shell';

/** 槽位闭集（标记契约的一部分：`render.ts`／`style.ts` 与判据都用这里的名字拼类名，不各抄一份字面量）。 */
export const WIZARD_SHELL_SLOTS = [
  /** 这一屏（卡壳；进度条与脚行都在它里面）。 */
  'now',
  /** 细进度：N 格并排那一条（纯装饰，`aria-hidden`）。 */
  'prog',
  /** 进度里的一格（`is-done` 走过／`is-now` 正走／`is-todo` 没到）。 */
  'seg',
  /** 读数行：「第 n / N 问」（段间的缝由列距承担，**标记里不写分隔符**）。 */
  'step',
  /** 读数行的次段（前面走过几问、这一问为什么回不去）。 */
  'aside',
  /** 大字问题（`<h2>`；它就是这一屏的主角）。 */
  'q',
  /** 为什么要问这一句（弱文字，可很长、必须能换行）。 */
  'why',
  /** 这一问的答法（答题区；`aria-describedby` 落在它上面）。 */
  'answer',
  /** 选项列（`role="radiogroup"`）。 */
  'opts',
  /** 一个选项（`<label>`：**整条是命中区**）。 */
  'opt',
  /** 选项标记位（空圆环／实心圆＋对钩；纯装饰，`aria-hidden`）。 */
  'mk',
  /** 选项的文字块（标题 ＋ 说明）。 */
  'tx',
  /** 选项标题（选项上那行主字）。 */
  'opt-title',
  /** 选项说明（选了会怎样，一句话）。 */
  'opt-desc',
  /** 填空列（本形态的另一种答法）。 */
  'fields',
  /** 一格填空（标签 ＋ 输入框 ＋ 提示）。 */
  'fld',
  /** 填空的标签。 */
  'fld-label',
  /** 填空的输入框（`type` 由 `kind` 定）。 */
  'fld-input',
  /** 填空的提示（弱文字）。 */
  'fld-hint',
  /** 确认屏那句话（这一问没有答法时出的**设计过的空态**，不是留白）。 */
  'confirm',
  /** 错态那句／禁用原因（写在控件旁边，`aria-describedby` 指它）。 */
  'error',
  /** 脚行（提示句 ＋ 三枚键）。 */
  'foot',
  /** 脚行左端那句（答完这一问会发生什么）。 */
  'hint',
  /** 三枚键并成的那一组。 */
  'acts',
  /** 一枚键（触区 ≥44×44）。 */
  'bt',
  /** 键上那枚字（主键的两枚字叠在同一格里 ⇒ 换字时**宽度锁住不跳版**）。 */
  'bt-label',
] as const;
export type WizardShellSlot = (typeof WIZARD_SHELL_SLOTS)[number];

/** 槽类的类名（唯一拼法：别处不许再写 `WIZARD_SHELL_CLASS + '-' + …`）。 */
export function wizardShellSlot(slot: WizardShellSlot, prefix = 'ilife-'): string {
  return prefix + 'block-wizard-shell-' + slot;
}

/** 形态闭集：本件只落地形态 B「一问一屏」。加第二形态是在闭集里加一格，不是新开一件。 */
export const WIZARD_SHELL_FORMS = ['one'] as const;
export type WizardShellForm = (typeof WIZARD_SHELL_FORMS)[number];

/** 填空的输入类型闭集（只两格：文本与数字；日期／下拉各有自己的件，不在这件壳里重造）。 */
export const WIZARD_SHELL_FIELD_KINDS = ['text', 'number'] as const;
export type WizardShellFieldKind = (typeof WIZARD_SHELL_FIELD_KINDS)[number];

/** 这一屏的**答法**（`data-ilife-wizard-answer` 的取值；闭集，三格恰好对应 `答案三种` 那三条分支）。
 *  **这不是形态**（形态键住 `WIZARD_SHELL_FORMS`）：`options`／`fields` 是两种答法，`confirm` 是没有答法那一屏。 */
export type WizardShellAnswer = 'options' | 'fields' | 'confirm';

/** 进度一格的三个状态类（无文字的条在皮肤语汇里只有 `accent` 一档 ⇒ 当前那格靠**形**分辨：高一档）。 */
export const WIZARD_SHELL_SEG_DONE = 'is-done';
export const WIZARD_SHELL_SEG_NOW = 'is-now';
export const WIZARD_SHELL_SEG_TODO = 'is-todo';
/** 主键的修饰类（实底那一枚）。 */
export const WIZARD_SHELL_BT_PRIMARY = 'is-primary';
/** 主键里「加载态那枚字」的修饰类（两枚字叠在同一格 ⇒ 宽度锁住）。 */
export const WIZARD_SHELL_LABEL_LOADING = 'is-loading';

/** 根锚：值 `1`（运行时的发现锚 `[data-ilife-wizard]`）。 */
export const WIZARD_SHELL_ROOT_ATTR = 'data-ilife-wizard';
/** 机器键（值＝`WizardShellInput.name`）：事件的 `detail.name` 读它。 */
export const WIZARD_SHELL_NAME_ATTR = 'data-ilife-wizard-name';
/** 当前是第几问（0 起；页面拿它当草稿坐标）。 */
export const WIZARD_SHELL_STEP_ATTR = 'data-ilife-wizard-step';
/** 一共几问。 */
export const WIZARD_SHELL_TOTAL_ATTR = 'data-ilife-wizard-total';
/** 当前问已答的机器值（未答＝这个属性不出现，不是空串）。 */
export const WIZARD_SHELL_VALUE_ATTR = 'data-ilife-wizard-value';
/** 这一屏出的是哪一种答法（值域 `WizardShellAnswer`）——根属性上的**诊断信号**：
 *  页面读它就能分辨「这一屏没有答法」是设计过的确认屏（`confirmText`），还是这一屏的数据没落进来。
 *  （整趟数据不由本件持：`steps`／`questions` 这类键本件既不读也不认，传进来只会让答题区落到 `confirm`。） */
export const WIZARD_SHELL_ANSWER_ATTR = 'data-ilife-wizard-answer';
/** 一个选项（`<label>`）的标记：值＝选项机器值。 */
export const WIZARD_SHELL_OPTION_ATTR = 'data-ilife-wizard-option';
/** 一格填空的标记：值＝字段机器名（运行时段按它收值）。 */
export const WIZARD_SHELL_FIELD_ATTR = 'data-ilife-wizard-field';
/** 一枚键按下去要往哪走（`back`／`skip`／`next`）。 */
export const WIZARD_SHELL_GO_ATTR = 'data-ilife-wizard-go';
/** 推进中标记（`1`＝这一屏在等写库回来）。 */
export const WIZARD_SHELL_LOADING_ATTR = 'data-ilife-wizard-loading';
/** 绑定完成标记（运行时幂等：重复注入不重复绑定）。 */
export const WIZARD_SHELL_BOUND_ATTR = 'data-ilife-wizard-bound';
/** 运行时装在文档根上的幂等键。 */
export const WIZARD_SHELL_RUNTIME_ATTR = 'data-ilife-wizard-runtime';

/** 三枚键的动作闭集（值写在 `data-ilife-wizard-go` 上，也只出现在事件的 `detail.go` 里）。 */
export const WIZARD_SHELL_GOES = { back: 'back', skip: 'skip', next: 'next' } as const;
export type WizardShellGo = (typeof WIZARD_SHELL_GOES)[keyof typeof WIZARD_SHELL_GOES];

/** 选项选中事件（冒泡 `CustomEvent`，`detail = { name, index, value, title, prev }`）。 */
export const WIZARD_SHELL_EVENT_PICK = 'ilife:wizard-pick';
/** 推进事件（冒泡 `CustomEvent`，`detail = { name, index, go, value, fields }`）。
 *  **运行时不自己改 `index`**：走到第几问是页面的数据，页面接这条事件去换下一屏。 */
export const WIZARD_SHELL_EVENT_GO = 'ilife:wizard-go';

/** 一路最少／最多几问：一问不成"分步"，十几问该拆成几趟（进度条在 390 档也要一格看得出）。 */
export const WIZARD_SHELL_TOTAL_MIN = 2;
export const WIZARD_SHELL_TOTAL_MAX = 12;

/** 三枚键的缺省字。**上一问／跳过**恒是这个；主键走到最后一问换「完成」。 */
export const WIZARD_SHELL_BACK_LABEL = '上一问';
export const WIZARD_SHELL_SKIP_LABEL = '跳过';
export const WIZARD_SHELL_NEXT_LABEL = '继续';
export const WIZARD_SHELL_DONE_LABEL = '完成';

/** 读数行次段的缺省写法：第 1 问上没有可回的（这句话同时是「上一问」按不动的原因）。 */
export const WIZARD_SHELL_ASIDE_FIRST = '这是第 1 问，前面没有可回的';
/** 推进中主键换上的那枚字（原字不撤，两枚叠在同一格 ⇒ 宽度锁住不跳版）。 */
export const WIZARD_SHELL_LOADING_TEXT = '保存中';
/** 没有答法那一问的空态（**设计过的空态**，不是留白）。 */
export const WIZARD_SHELL_CONFIRM_TEXT = '这一问不用填，读完按继续';

/* ── 尺寸事实（判据与两份样式段共用这一份；改这里就是改几何，别在样式里再抄一遍数） ───────── */

/** 触控目标的地板（px）：全宽口径，不只窄屏——低于它的命中区就是不许留的中间档。 */
export const WIZARD_SHELL_MIN_TARGET_PX = 44;
/** 一条选项的最小高度（px）：大于地板（选项里还有一行说明）。 */
export const WIZARD_SHELL_OPTION_MIN_HEIGHT_PX = 56;
/** 相邻触控目标之间的最小间距（px）：8 是地板，这里留 10。 */
export const WIZARD_SHELL_TARGET_GAP_PX = 10;
/** 进度一格的高度（px）：「一条**细**进度」，细到不抢大字问题。 */
export const WIZARD_SHELL_SEG_PX = 4;
/** 当前那一格的高度（px）：无文字的条只有 `accent` 一档，当前那格靠**高一档的形**分辨。 */
export const WIZARD_SHELL_SEG_NOW_PX = 6;
/** 选中那条选项左端竖条的宽度（px）——**形状**那一重标记（对钩是字那一重）。 */
export const WIZARD_SHELL_BAR_PX = 4;
/** 卡壳内的左右内距（px）：各槽自己吃这一份，脚行才能整幅铺底（不靠 `overflow: hidden` 圆角）。 */
export const WIZARD_SHELL_PAD_PX = 16;
/** 窄容器阈值（px）：脚行改「提示句独占一行 ＋ 三枚键均分一行」，选项内距收一档。
 *  **这是本件自己的宽度**（`@container` 判的），不是视口宽度。 */
export const WIZARD_SHELL_NARROW_PX = 560;

/** 一个选项。`value` 与 `title` 必填：机器值与屏上字是两码事（`three_to_four` / `3–4 次`）。 */
export interface WizardShellOption {
  /** 机器值（`<input value>` 与事件 `detail.value`）。**非空、这一问内唯一**。 */
  readonly value: string;
  /** 选项标题（选项上那行主字）。**非空**。 */
  readonly title: string;
  /** 选项说明（选了会怎样，一句话；不给＝这一行不出）。 */
  readonly desc?: string;
}

/** 一格填空。 */
export interface WizardShellField {
  /** 字段机器名（`data-ilife-wizard-field` 与事件 `detail.fields` 的键）。**非空、这一问内唯一**。 */
  readonly name: string;
  /** 字段标签（屏上那行字）。**非空**。 */
  readonly label: string;
  /** 已填的值（回退到这一问时的复填；不给＝空格）。 */
  readonly value?: string;
  /** 标签下面那句提示（如「不填也能继续」）。 */
  readonly hint?: string;
  /** 输入类型（闭集 `text`／`number`；缺省 `text`）。 */
  readonly kind?: WizardShellFieldKind;
}

/** 分步录入壳入参。**这一件渲染的是「当前那一问」这一屏**——整趟有几问、走到第几问由页面给。 */
export interface WizardShellInput {
  /** 机器键（事件 `detail.name`）。**非空**。不给 `id` 时它同时是单选组名与件内 `id` 的前缀。 */
  readonly name: string;
  /** **同页实例标识**：同一页里摆多份本件时，**每份给一个不同的值**（单选组名与件内 `id` 都由它派生）。
   *  为什么需要它：单选组的组名在**整篇文档**里互斥 —— 两屏同名时，浏览器只认最后那一条 `checked`，
   *  在另一屏点一下就会把这一屏已选中的那条**静默取消**（根属性说"已答"，屏上却没有一条是选中的）；
   *  件内 `id` 也会重号（`aria-labelledby`／`aria-describedby` 指到别的屏上去）。同一页只摆一份时不必给。
   *  只许 `[A-Za-z0-9_-]`（它直接进 `id=`／`name=`：含糊的写法会与另一份撞名，撞了就是上面那种静默互踢）。 */
  readonly id?: string;
  /** 大字问题：这一问在问什么。**非空**（没有问题的"问"不存在）。 */
  readonly question: string;
  /** 当前是第几问（**0 起**）。 */
  readonly index: number;
  /** 一共几问（**`WIZARD_SHELL_TOTAL_MIN`…`WIZARD_SHELL_TOTAL_MAX`**，且必须大于 `index`）。 */
  readonly total: number;
  /** 这一问的答法之一：选项（**至少 1 个**）。给了 `options` 就不给 `fields`。 */
  readonly options?: readonly WizardShellOption[];
  /** 这一问的答法之二：填空（**至少 1 格**）。给了 `fields` 就不给 `options`。 */
  readonly fields?: readonly WizardShellField[];
  /** 当前问已答的机器值（未答＝不给或 `null`）；给了串**必须命中一个选项**。 */
  readonly value?: string | null;
  /** 为什么要问这一句（写在问题下面，弱文字）。 */
  readonly why?: string;
  /** 读数行的次段；不给＝按 `index` 出（第 1 问写"前面没有可回的"）。 */
  readonly aside?: string;
  /** 脚行左端那句（答完这一问会发生什么，如「答完这句就能生成买菜清单」）。 */
  readonly hint?: string;
  /** 主键的字；不给＝最后一问写「完成」，其余写「继续」。 */
  readonly nextLabel?: string;
  /** 「跳过」那枚出不出的开关（缺省 `true`）。`false` ＝ **不摆一枚按不动的键**。 */
  readonly skippable?: boolean;
  /** 推进中：三枚键一起按不动，主键原地换成 `loadingText`（宽度锁住不跳版）。 */
  readonly loading?: boolean;
  /** 推进中主键上那枚字（缺省 `保存中`；只在 `loading` 时给）。 */
  readonly loadingText?: string;
  /** 整壳禁用（如这一趟已经交过了）；**`disabledReason` 写清为什么**。 */
  readonly disabled?: boolean;
  /** 整壳禁用的原因（写在脚行上方那一行；说不出为什么不许＝读者只能猜）。 */
  readonly disabledReason?: string;
  /** 这一问的错（写在控件旁边 ＋ `aria-describedby` 指着它）。 */
  readonly error?: string;
  /** 没有答法那一问的空态那句话（缺省 `这一问不用填，读完按继续`）。 */
  readonly confirmText?: string;
  /** 形态键（闭集，缺省 `one`）。 */
  readonly form?: WizardShellForm;
  /** 附加类名（空格分隔；逐个过类名正则）。 */
  readonly extraClass?: string;
}
