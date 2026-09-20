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
  /** 本包自己那条 RPC 通道（单段，例 `/ilife-memo`）：注册方写进来，读方（总管）据此**通用地**
   *  调它，不必在源码里写死任何一家的通道名。出处＝总管侧同一格的镜像
   *  `packages/plugin-manager/src/dsh-ctx.ts:19-21`（#706 配置体检要走它；本包 `client.ts`
   *  由 #706 的 `f8957dd8` 已在注册处写上 `channel: RPC_CHANNEL`，此处补上缺的那一格）。 */
  readonly channel?: string;
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
 *
 * #696：设置页要在既有通道上加三个配置端点，宿主注册面的镜像类型补成具名的 `HostConnectionFace`
 * （出处同上一段，照 `packages/plugin-chef/src/dsh-ctx.ts` 那份写）；其余面一个字未动。
 */
export interface ConnectionFetchRegisterOptions {
  readonly path: string;
  readonly methods?: readonly string[];
  readonly requestBody?: string;
  fetch(request: unknown): Promise<Response> | Response;
}

/** 宿主 fetch 路由注册面（`ctx.connection.fetch.register`）：出处与上一件同源
 * （`@xmanrui/dsh-im` 的 `plugin-src/management-rpc.mjs`，宿主注册走 route 对象）。
 * #696 起 `index.ts` 用它做这个面的镜像类型（原先那里是就地写死的匿名结构）。 */
export interface HostConnectionFace {
  readonly fetch: { register(options: ConnectionFetchRegisterOptions): () => void };
}

export interface HostCtx {
  readonly connection: {
    readonly fetch: { register(options: ConnectionFetchRegisterOptions): () => void };
    readonly rpc?: { handle(channel: string, handler: RpcHandler): () => void };
  };
  readonly skills: SkillsFace;
  /** 模型工具注册表（#734）：本包把技能唯一出口开成 agent 工具。 */
  readonly tools?: ToolsFace;
  effect(callback: () => ((() => void) | void), label?: string): () => void;
  readonly logger?: unknown;
}

/** 宿主目录选择命名空间的服务名（#736；出处与禁令见 cookbook §13）。 */
export const REMOTE_DIRECTORY_PICKER = 'remote.directoryPicker' as const;

/** 宿主目录选择命名空间（DSH 平台提供）。本包**只用 `pick` 这一格**：不给 signal（平台那格可选）。
 *
 * **回执是信封，不是路径**（#743 真机缺陷的根因）：客户端把每次 Remote 调用包成
 * `{ok:true,value}`／`{ok:false,error}`（`@deepseek-ai/dsh-api-gateway/lib/client.js` 的 `invoke()`：
 * 失败不抛、成功也不回裸值），第一方消费方 `@deepseek-ai/dsh-client-ui-workspace/lib/client.js`
 * 的 `pickDirectory()` 就照这个形状拆：`const r = await pick(); if (!r.ok) throw …; return r.value`。
 * `value` 为 `null`＝用户取消；`ok:false`＝这条路供不了（例如组合里是 browse 后端）。 */
export interface DirectoryPickerAnswer {
  readonly ok: boolean;
  readonly value?: string | null;
  readonly error?: { readonly code?: string; readonly message?: string };
}

export interface DirectoryPickerFace {
  pick(): Promise<DirectoryPickerAnswer>;
}

/** 模型工具面镜像（#734；出处见 cookbook §14）。
 *
 * 出处：`@deepseek-ai/dsh-tools/lib/index.js` 的 `defineTool` 与 `ToolRuntime.register`——
 * 工具对象的形状是 `name`／`description`／`parameters`（JSON Schema）／`output{schema,render}`／
 * `execute`；`register` 只校验 `output.render` 是函数、`output.schema` 受支持、`timeoutMs` 为正、
 * 名字不是保留名 `run_code`，**不要求 `defineTool` 产物** ⇒ 本包按形状手写、零依赖。 */
export interface ToolTextPart {
  readonly type: 'text';
  readonly text: string;
}

export interface ToolDefinitionMirror {
  readonly name: string;
  readonly description: string;
  readonly parameters: Record<string, unknown>;
  readonly output: {
    readonly schema: Record<string, unknown>;
    render(args: unknown, value: string): readonly ToolTextPart[];
  };
  execute(args: Record<string, unknown>, exec?: unknown): Promise<unknown>;
}

export interface ToolsFace {
  register(definition: ToolDefinitionMirror): () => void;
}
