/** DSH ctx 最小镜像：只含本仓实际使用的面（type-only，构建期擦除，零运行时）。
 *
 * 每条成员的用法出处见 docs/agents/dsh-client-contract.md（附源码路径+行）。
 * 禁止加镜外成员：要用新能力，先在 cookbook 落出处，再加镜像。用 `import type` 引用本文件。
 * skills 面出处见 cookbook §12（#56 卡路里样板，badge 同形）。
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
 * candidate 校验红线见 `validateCandidate`（同文件 `:452`），`get` 回定义须与候选同名（同文件 `:259`）。
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

export interface HostCtx {
  readonly connection: { readonly rpc: { handle(channel: string, handler: RpcHandler): () => void } };
  readonly skills: SkillsFace;
  effect(callback: () => ((() => void) | void), label?: string): () => void;
  readonly logger?: unknown;
}
