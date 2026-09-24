/** sync-status · **标记契约**（渲染与运行时共用的唯一事实：类名／形态闭集／结果闭集／事件名／入参类型）。
 *
 *  这一件落地的是原型墙（`.scratch/ui-组件墙/parts-11-加量池.mjs`，2026-09 用户裁定）
 *  里的**形态 B「带『同步一次』动作」**：一页里跟外面那套东西对上没有——
 *  每个目标一行（名字 ／ 方向 · 最近一次时间 · 这次跑了多久 ／ 结果），
 *  **失败那一行必须能读出「原因」与「怎么修」**，底下带一枚「同步一次」。
 *
 *  交互契约（真运行时，见 `runtime.ts`）：
 *   · 按「同步一次」→ 按钮进 `running`（原地换字、**宽度锁住不跳版**）＋ 派发 `SYNC_STATUS_EVENT_RUN`；
 *   · 调用方跑完回来派发 `SYNC_STATUS_EVENT_DONE`（`detail = { ok, message? }`）→ 按钮出 `running`；
 *     `ok === false` ⇒ **错误行写在控件旁边** ＋ `aria-describedby` 指过去（不只染色）；
 *   · 到点还没消息（`SYNC_STATUS_RUN_TIMEOUT_MS`）也出错误行——**不许卡在「同步中…」**。
 */

/** 本件的类名根：全部槽位类名都是 `<前缀>block-sync-status-<槽名>`。 */
export const SYNC_STATUS_CLASS = 'ilife-block-sync-status';

/** 槽位闭集。 */
export const SYNC_STATUS_SLOTS = [
  /** 顶上那行汇总（最后检查 ／ 共几个目标 ／ 几个失败）。 */
  'meta',
  /** 目标行的容器。 */
  'list',
  /** 一个目标一行；带 `is-<结果>` 与 `data-ilife-sync-result` 两样结果标记。 */
  'target',
  /** 目标名（「飞书多维表」）；**非关键长名**，允许换行。 */
  'name',
  /** 那一行的时间线（方向 ／ 最近一次 ／ 这一趟的读数）：逐段一枚 `<span>`，**标记里不写分隔符**。 */
  'detail',
  /** 结果徽标：**记号 ＋ 字**（✓ 已同步 ／ ✗ 失败 ／ ○ 待运行）——色只是第三样。 */
  'badge',
  /** 失败行的两句话：原因 ＋ 怎么修（只有 `failed` 才出）。 */
  'why',
  /** 按钮那一排（说明 ＋ 按钮）。 */
  'tool',
  /** 按钮旁那句说明（按下去会发生什么）。 */
  'hint',
  /** 那枚按钮（两枚字占同一格，宽度取宽者）。 */
  'button',
  /** 按钮静止时的字（「同步一次」）。 */
  'btn-rest',
  /** 按钮跑起来时的字（「同步中…」）——两枚字**占同一格**，宽度取宽者 ⇒ 换字不跳版。 */
  'btn-busy',
  /** 错误行（写在控件旁边；`aria-describedby` 指过来）。 */
  'error',
  /** 一个目标都没有时的空态。 */
  'empty',
] as const;
export type SyncStatusSlot = (typeof SYNC_STATUS_SLOTS)[number];

/** 槽类的类名（唯一拼法）。 */
export function syncStatusSlot(slot: SyncStatusSlot, prefix = 'ilife-'): string {
  return prefix + 'block-sync-status-' + slot;
}

/** 形态闭集：本件只落地了形态 B「带『同步一次』动作」。 */
export const SYNC_STATUS_FORMS = ['run'] as const;
export type SyncStatusForm = (typeof SYNC_STATUS_FORMS)[number];

/** 结果闭集（**机器键**）：`ok` 已同步 ／ `failed` 失败 ／ `pending` 还没跑过。 */
export const SYNC_STATUS_RESULTS = ['ok', 'failed', 'pending'] as const;
export type SyncStatusResult = (typeof SYNC_STATUS_RESULTS)[number];

/** 结果 → 屏上那句话（**记号在前、字在后**：色之外还有两样）。唯一出处，判据从这里取。 */
export const SYNC_STATUS_RESULT_WORDS: Readonly<Record<SyncStatusResult, string>> = Object.freeze({
  ok: '✓ 已同步',
  failed: '✗ 失败',
  pending: '○ 待运行',
});

/** 失败行两句的左端标签（「原因」／「怎么修」）：**只要出失败行就带它们**。 */
export const SYNC_STATUS_REASON_LABEL = '原因';
export const SYNC_STATUS_FIX_LABEL = '怎么修';

/** 按钮缺省的字（两枚：静止 / 跑起来）。 */
export const SYNC_STATUS_ACTION_LABEL = '同步一次';
export const SYNC_STATUS_RUNNING_LABEL = '同步中…';

/** 到点没消息时错误行那句话（**不许卡在「同步中…」**）。 */
export const SYNC_STATUS_TIMEOUT_TEXT = '没有收到回应：这一趟同步没跑完；可以再按一次「同步一次」，或者先看上面失败那一行的「怎么修」。';
/** 调用方回了失败但没带话时的兜底错误句。 */
export const SYNC_STATUS_FAILED_TEXT = '这一趟同步没有成功；上面失败那一行的「怎么修」写了下一步。';

/** 按钮进入「跑起来了」的等待上限（毫秒）。 */
export const SYNC_STATUS_RUN_TIMEOUT_MS = 15000;

/** 发现锚：根元素上的 `data-*`（运行时按它找件）。 */
export const SYNC_STATUS_ATTR = 'data-ilife-sync-status';
/** 动作锚：按钮上的 `data-*`（`value` ＝ 动作名）。 */
export const SYNC_STATUS_ACTION_ATTR = 'data-ilife-sync-action';
/** 状态锚：根元素上的 `data-*`（`idle` ／ `running` ／ `failed`）。 */
export const SYNC_STATUS_STATE_ATTR = 'data-ilife-sync-state';
/** 绑定过的记号（重复注入只绑一次）。 */
export const SYNC_STATUS_BOUND_ATTR = 'data-ilife-sync-bound';
/** 错误行上的 `data-*`（运行时找它）。 */
export const SYNC_STATUS_ERROR_ATTR = 'data-ilife-sync-error';

/** 动作名（按钮 `data-*` 的取值；闭集，运行时只认它）。 */
export const SYNC_STATUS_ACTIONS = ['run'] as const;
export type SyncStatusAction = (typeof SYNC_STATUS_ACTIONS)[number];

/** 运行时状态闭集（根元素 `data-*` 的取值）。 */
export const SYNC_STATUS_STATES = ['idle', 'running', 'failed'] as const;
export type SyncStatusState = (typeof SYNC_STATUS_STATES)[number];

/** 按钮派发的事件名（调用方按它去真的同步）。 */
export const SYNC_STATUS_EVENT_RUN = 'ilife:sync-run';
/** 调用方跑完后派发的事件名（`detail = { ok, message? }`），冒泡到 `document` 即被接住。 */
export const SYNC_STATUS_EVENT_DONE = 'ilife:sync-done';

/** 一个同步目标。 */
export interface SyncStatusTarget {
  /** 目标名（「飞书多维表」「训记」「备份」）。**非空**；长了换行，不许 `…` 截断。 */
  readonly name: string;
  /** 方向（「双向」／「推送」／「上传」）；不给＝时间线里少一段。 */
  readonly direction?: string;
  /** 最近一次的时间（「09-25 20:14」）；不给＝这一趟还没跑过。 */
  readonly lastAt?: string;
  /** 这一趟的读数（「用时 1.2 秒」／「3 条未上」／「14.6 MB」）；不给＝不出这一段。 */
  readonly detail?: string;
  /** 结果（闭集）。**`failed` 必带 `reason` 与 `fix`**（说不出原因与下一步的失败行等于没说）。 */
  readonly result: SyncStatusResult;
  /** 徽标上的短话（覆盖闭集算出来的那句，如「动作名缺失」）；**记号仍按结果给**，所以不会只剩一个色。 */
  readonly status?: string;
  /** 失败的原因（`failed` 必填）。 */
  readonly reason?: string;
  /** 怎么修（`failed` 必填）。 */
  readonly fix?: string;
}

/** 同步状态的入参。`targets` 必填——没有目标的「同步状态」是空壳（空数组走设计过的空态）。 */
export interface SyncStatusInput {
  /** 要跟外面那套东西对上的目标。空数组 ⇒ 出空态（不出按钮：没有可跑的）。 */
  readonly targets: readonly SyncStatusTarget[];
  /** 汇总句：最后检查是什么时候（「09-25 20:14」）；共几个目标与几个失败由本件算。 */
  readonly checkedAt?: string;
  /** 按钮旁那句说明（按下去会发生什么，**不是**「点击同步」这种废话）。 */
  readonly hint?: string;
  /** 按钮上的字（缺省「同步一次」）。 */
  readonly actionLabel?: string;
  /** 页面锚点：也用作错误行 id 的前缀（`<id>-error`）；一页多个时**务必给**（`aria-describedby` 不许撞车）。 */
  readonly id?: string;
  /** 形态键（闭集，缺省 `run`）。 */
  readonly form?: SyncStatusForm;
  /** 附加类名（空格分隔；逐个过类名正则）。 */
  readonly extraClass?: string;
}
