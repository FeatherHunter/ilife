/** DSH ctx 最小镜像：只含本仓实际使用的面（type-only，构建期擦除，零运行时）。
 *
 * 每条成员的用法出处见 docs/agents/dsh-client-contract.md（附源码路径+行）。
 * 禁止加镜外成员：要用新能力，先在 cookbook 落出处，再加镜像。用 `import type` 引用本文件。
 * skills 面出处见 cookbook §12（#56 卡路里样板，badge 同形；#150 记账／#218 大厨同形）。
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

/** 打包技能提供方镜像（cookbook §12，badge 同形；type-only，零运行时）。
 *
 * 出处：`ctx.skills.registerProvider(create)`（`dsh-skill/lib/index.js:147`）；
 * candidate 校验红线见 `validateCandidate`（同文件 `:452`）——`provider` 须等于注册名、
 * `description` 非空、`rank` 有限数；`get` 回定义须与候选同名（同文件 `:259`）。
 */
export interface SkillInvocationPolicy {
  readonly modelInvocable: boolean;
  readonly userInvocable: boolean;
}

export interface SkillCandidate {
  readonly name: string;
  readonly description: string;
  readonly invocation: SkillInvocationPolicy;
  readonly provider: string;
  readonly source: string;
  readonly rank: number;
  readonly locator: unknown;
  readonly resourceBase?: { readonly kind: 'directory'; readonly path: string };
}

export interface SkillDefinition {
  readonly name: string;
  readonly description: string;
  readonly invocation: SkillInvocationPolicy;
  readonly provider: string;
  readonly source: string;
  readonly resourceBase?: { readonly kind: 'directory'; readonly path: string };
  readonly content: string;
}

export interface SkillProvider {
  readonly name: string;
  list(options?: unknown): Promise<readonly SkillCandidate[]>;
  get(candidate: SkillCandidate, options?: unknown): Promise<SkillDefinition | undefined>;
}

export interface SkillsFace {
  registerProvider(
    create: (control: { readonly signal: AbortSignal; invalidate(): void }) => SkillProvider,
  ): () => void;
}

/** 本插件用到的宿主面（apply 入参）。
 *
 * `connection` 面：#80 起本插件走的是 DSH 公开的 `/api` 载体 `ctx.connection.fetch.register`
 * （见 `src/index.ts` 的拆雷注释与 `docs/agents/plugin-webserver-inject.md`），不再是早期脚手架的
 * `connection.rpc.handle`。此前镜像一直停在旧那一版（复审 F 的 S3）——现照**实现**对齐；
 * `rpc` 降为可选，因为 `contract.ts` 的信封仍按 RPC 语义命名（`RpcResult`／`RpcHandler`）。
 */
export interface ConnectionFetchRegisterOptions {
  readonly path: string;
  readonly methods?: readonly string[];
  readonly requestBody?: string;
  fetch(request: unknown): Promise<Response> | Response;
}

export interface HostCtx {
  readonly connection: {
    readonly fetch: { register(options: ConnectionFetchRegisterOptions): () => void };
    readonly rpc?: { handle(channel: string, handler: RpcHandler): () => void };
  };
  readonly skills: SkillsFace;
  effect(callback: () => ((() => void) | void), label?: string): () => void;
  readonly logger?: unknown;
}
