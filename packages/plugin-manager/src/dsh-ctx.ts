/** DSH ctx 最小镜像：只含本仓实际使用的面（type-only，构建期擦除，零运行时）。
 *
 * 每条成员的用法出处见 docs/agents/dsh-client-contract.md §5（附源码路径+行）。
 * 禁止加镜外成员：要用新能力，先在 cookbook 落出处，再加镜像。用 `import type` 引用本文件。
 * 注意：总管侧镜像含 ledger/子槽/renderSlot 面（爱生活单卡方案），比单品包同名文件多；
 * 以 cookbook §5 为同步源，不再逐字一致。
 */
export interface SlotChildSpec {
  readonly kind: 'single' | 'list' | 'keyed' | 'chain';
  readonly scope: 'root' | 'session';
}

export interface SlotsRegisterOptions {
  readonly name: string;
  readonly id?: string;
  readonly order?: number;
  readonly label?: string | (() => string);
  readonly locale?: string;
  readonly inject?: () => Record<string, unknown>;
  readonly children?: Record<string, SlotChildSpec>;
}

/** 子槽 ledger 条目（只读投影 settings-plugins:1751-1756 同形）。 */
export interface SlotLedgerEntry {
  readonly options: {
    readonly id?: string;
    readonly order?: number;
    readonly label?: string | (() => string);
  };
}

export interface SlotsFace {
  inject(key: string, callback: () => (() => void) | Iterable<() => void>): () => void;
  register(options: SlotsRegisterOptions, component: unknown): () => void;
  entries(key: string): SlotLedgerEntry[];
  getVersion(key: string): number;
  subscribe(key: string, listener: () => void): () => void;
}

/** 爱生活页签槽行（总管自有形状：id=单品插件包名，order/label 随注册）。 */
export interface ConfigTabRow {
  readonly id: string;
  readonly order: number;
  readonly label: string;
}

/** ledger 观测源（uSES 对：getSnapshot+subscribe； absent 形见 renderer:212-215）。 */
export interface TabHookSource {
  getSnapshot(): ConfigTabRow[];
  subscribe(listener: () => void): () => void;
}

/** hooks.tabs 绑出的选择器 hook（`use<Name>` 命名见 slots lib:7-9；
 * 调用形 `(selector, equal?)` 见 renderer:203-210，用例见 settings-plugins:431）。 */
export interface UseTabsHook {
  <T>(selector: (rows: ConfigTabRow[]) => T, equal?: (a: T, b: T) => boolean): T;
}

/** 组件 props 侧 renderSlot 面（仅声明过 children 的条目才有，renderer:613-614；
 * 调用形 `(key, owner, opts)` 含 `{only}` 过滤，见 renderer:283-293 与 settings-plugins:511）。 */
export interface RenderSlotFace {
  (key: string, ownerProps: Record<string, unknown>, opts?: { only?: string }): unknown;
}

/** 爱生活 section 组件 props（kit 合成见 renderer:599-621：
 * `hooks.tabs` 源出 `useTabs`，children 声明出 `renderSlot`）。 */
export interface LifePackSectionProps {
  readonly renderSlot: RenderSlotFace;
  readonly useTabs: UseTabsHook;
}

export type RpcCallResult =
  | { readonly ok: true; readonly value: unknown }
  | { readonly ok: false; readonly error: { readonly code: string; readonly message: string; readonly details: Record<string, unknown> } };

export interface RpcCallFace {
  (channel: string, endpoint: string, payload: unknown, signal?: AbortSignal): Promise<RpcCallResult>;
}

export interface ClientCtx {
  readonly slots: SlotsFace;
  readonly connection?: { readonly rpc?: { readonly call: RpcCallFace } };
  effect(callback: () => ((() => void) | void), label?: string): () => void;
  get?(name: string): unknown;
}

export type RpcHandler = (endpoint: string, payload: unknown, signal?: AbortSignal) => Promise<unknown>;

export interface HostCtx {
  readonly connection: { readonly rpc: { handle(channel: string, handler: RpcHandler): () => void } };
  effect(callback: () => ((() => void) | void), label?: string): () => void;
  readonly logger?: unknown;
}
