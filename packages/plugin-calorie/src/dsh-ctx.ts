/** DSH ctx 最小镜像：只含本仓实际使用的面（type-only，构建期擦除，零运行时）。
 *
 * 每条成员的用法出处见 docs/agents/dsh-client-contract.md（附源码路径+行）。
 * 禁止加镜外成员：要用新能力，先在 cookbook 落出处，再加镜像。用 `import type` 引用本文件。
 */
export interface SlotsRegisterOptions {
  readonly name: string;
  readonly id?: string;
  readonly order?: number;
  readonly label?: string | (() => string);
  readonly locale?: string;
  readonly inject?: () => Record<string, unknown>;
}

export interface SlotsFace {
  inject(key: string, callback: () => (() => void) | Iterable<() => void>): () => void;
  register(options: SlotsRegisterOptions, component: unknown): () => void;
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
