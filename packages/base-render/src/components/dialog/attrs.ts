/** dialog · **标记契约**（渲染与运行时共用的唯一事实：类名／`data-*`／事件名／闭集／入参类型）。
 *
 *  这一件落地的是原型墙（`.scratch/ui-组件墙/parts-10-容器与浮层.mjs`，2026-09 用户裁定）
 *  里的**形态 A「确认型」**——图标 ＋ 标题 ＋ 副语 ＋ 正文 ＋ 两条动作（最后一条是主动作）。
 *  用在哪：六个技能的覆盖确认、写库确认、详情确认。
 *
 *  落地路线（票面钉死）：**浏览器原生 `<dialog>` ＋ `showModal()`**——
 *  焦点锁、`Esc`、背景 `inert`、顶层（top layer）都是浏览器白送的，不拿 `<div>` 叠 `z-index` 自己造。
 *  与之配套的运行时只用**事件委派**（`document` 上一枚 `click` ＋ 捕获相位的 `close`／`cancel`）。
 */

/** 本件的类名根：全部槽位类名都是 `DIALOG_CLASS + '-' + 槽名`。 */
export const DIALOG_CLASS = 'ilife-block-dialog';

/** 触发键的类名（与面板分开：触发键在页面正文里，面板在顶层）。 */
export const DIALOG_OPENER_CLASS = 'ilife-block-dialog-opener';

/** 类名根（带前缀；样式段换前缀时走它，别处不许拼字面量）。 */
export function dialogClass(prefix = 'ilife-'): string {
  return prefix + 'block-dialog';
}

/** 触发键类名（带前缀）。 */
export function dialogOpenerClass(prefix = 'ilife-'): string {
  return dialogClass(prefix) + '-opener';
}

/** 槽位闭集（标记契约的一部分：`render.ts` 与判据都用这里的名字拼类名，不各抄一份字面量）。 */
export const DIALOG_SLOTS = [
  /** 头部那一排（图标 ＋ 文字块）。 */
  'head',
  /** 图标位（纯装饰，`aria-hidden`；`tone=plain` 时整格不出）。 */
  'icon',
  /** 头部右侧的文字块（标题 ＋ 副语）。 */
  'headtext',
  /** 标题（面板的 `aria-labelledby` 指它）。 */
  'title',
  /** 副语（如「这一步做完不能撤销」）。 */
  'sub',
  /** 正文（逐段一枚 `<p>`；滚的是它）。 */
  'body',
  /** 状态行（`error`／`busy`：写在动作条上方，`aria-describedby` 指它）。 */
  'status',
  /** 动作条（滚不动的那个）。 */
  'foot',
  /** 一枚动作键（最后一枚是主动作）。 */
  'act',
  /** 动作条上方的脚注小字。 */
  'note',
] as const;
export type DialogSlot = (typeof DIALOG_SLOTS)[number];

/** 槽类的类名（唯一拼法：别处不许再写 `DIALOG_CLASS + '-' + …`）。 */
export function dialogSlot(slot: DialogSlot, prefix = 'ilife-'): string {
  return dialogClass(prefix) + '-' + slot;
}

/** 形态闭集：本件只落地形态 A「确认型」（闭集外的值 → `bad-input`，不静默降级成别的骨架）。 */
export const DIALOG_FORMS = ['confirm'] as const;
export type DialogForm = (typeof DIALOG_FORMS)[number];

/** 语气闭集：决定图标位与主动作的档（`danger`＝破坏性动作）。 */
export const DIALOG_TONES = ['plain', 'warn', 'danger'] as const;
export type DialogTone = (typeof DIALOG_TONES)[number];

/** 状态行档闭集（`error`＝这次没成；`busy`＝正在写）。 */
export const DIALOG_STATUS_KINDS = ['error', 'busy'] as const;
export type DialogStatusKind = (typeof DIALOG_STATUS_KINDS)[number];

/** 关闭原因闭集（`ilife:dialog-close` 的 `detail.reason`）。 */
export const DIALOG_CLOSE_REASONS = ['action', 'esc', 'backdrop', 'programmatic'] as const;
export type DialogCloseReason = (typeof DIALOG_CLOSE_REASONS)[number];

/* ── `data-*` 名（运行时与判据都只认这些名字） ─────────────────────── */

/** 面板的发现锚：值＝面板 `id`（运行时按它认出「这是个对话框」）。 */
export const DIALOG_ATTR = 'data-ilife-dialog';
/** 触发键：值＝它开的面板 `id`（**焦点归还的锚**）。 */
export const DIALOG_OPEN_ATTR = 'data-ilife-dialog-open';
/** 渲染时就打开的面板（静态样张／打印快照）**不**由运行时接管：那是给「静态可读」用的，不是交互态。 */

/** 动作键：值＝该动作的机器值（关闭时原样送出）。 */
export const DIALOG_ACT_ATTR = 'data-ilife-dialog-act';
/** 状态行档（值＝`error`／`busy`）：样式按它分色，判据按它断「不只染色」。 */
export const DIALOG_STATUS_ATTR = 'data-ilife-dialog-status';
/** 绑定完成标记（运行时幂等：重复注入只绑一次）。 */
export const DIALOG_BOUND_ATTR = 'data-ilife-dialog-bound';

/** 事件名（冒泡 `CustomEvent`；`detail` 见 README 的「交互契约」）。 */
export const DIALOG_EVENT_OPEN = 'ilife:dialog-open';
export const DIALOG_EVENT_CLOSE = 'ilife:dialog-close';

/** 几何口径（写在常量里，也钉在判据里）：动作键命中高度下限／面板宽度上限／离容器边至少留多少。 */
export const DIALOG_MIN_HEIGHT_PX = 44;
export const DIALOG_MAX_WIDTH_PX = 344;
export const DIALOG_EDGE_PX = 16;

/** 一枚动作键。**最后一条是主动作**（贴右、实底）；前面的按次要档排。 */
export interface DialogAction {
  /** 键上的字（如「覆盖」「先不写」）。非空串；**许换行、不许 `…` 截断**。 */
  readonly label: string;
  /** 机器值（点它关闭时原样送出，写在 `ilife:dialog-close` 的 `detail.value`）。非空串，面板内唯一。 */
  readonly value: string;
}

/** 对话框入参（形态 A）。`id`／`title`／`body`／`actions` 必填。 */
export interface DialogInput {
  /** 面板 `id`（也是触发键 `data-ilife-dialog-open` 的值）。同页唯一；只许标识符字符。 */
  readonly id: string;
  /** 标题（面板的 `aria-labelledby` 指它）。一页一个 `<h2>` 的粒度。 */
  readonly title: string;
  /** 正文：串＝一段；数组＝逐段一枚 `<p>`（滚的是它）。至少一段。 */
  readonly body: string | readonly string[];
  /** 副语（跟在标题后的小字，如「这一步做完不能撤销」）。 */
  readonly sub?: string;
  /** 语气，缺省 `danger`（形态 A 的常见场景是覆盖，属于破坏性动作）。 */
  readonly tone?: DialogTone;
  /** 动作键：1～2 枚，**最后一枚是主动作**。 */
  readonly actions: readonly DialogAction[];
  /** 动作条上方的脚注小字（如「这一步做完不能撤销」）。 */
  readonly note?: string;
  /** 状态行：这次没成／正在写。给了就出那一行，并挂进 `aria-describedby`。 */
  readonly status?: { readonly kind?: DialogStatusKind; readonly text: string };
  /** 形态键（闭集，缺省 `confirm`）。 */
  readonly form?: DialogForm;
  /** 渲染时就打开（`<dialog open>`，**非模态**）：静态样张／打印快照用；真机交互一律由触发键开。 */
  readonly open?: boolean;
  /** 附加类名（空格分隔；逐个过类名正则，防选择器注入）。 */
  readonly extraClass?: string;
}

/** 触发键入参（焦点归还回路的另一头：它必须带 `data-ilife-dialog-open`）。 */
export interface DialogOpenerInput {
  /** 它要开的面板 `id`。 */
  readonly dialogId: string;
  /** 键上的字。 */
  readonly text: string;
  /** 无障碍名（不给＝用键上的字）。 */
  readonly label?: string;
  /** 附加类名。 */
  readonly extraClass?: string;
}
