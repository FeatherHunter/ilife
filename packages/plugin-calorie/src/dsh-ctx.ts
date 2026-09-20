/** DSH ctx 最小镜像：只含本仓实际使用的面（除末尾那枚服务名常量外全是 type-only，构建期擦除）。
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
  /** 本包自己那条 RPC 通道（单段）：注册时交出去，总管据此**通用地**调配置体检（票 #706）。 */
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
  /** 模型工具注册表（#734）：本包把技能唯一出口开成 agent 工具。 */
  readonly tools?: ToolsFace;
  effect(callback: () => ((() => void) | void), label?: string): () => void;
  readonly logger?: unknown;
}

/** 宿主目录选择命名空间的服务名（#736；出处与禁令见 cookbook §13）。 */
export const REMOTE_DIRECTORY_PICKER = 'remote.directoryPicker' as const;

/** 宿主目录选择命名空间（DSH 平台提供）：本包用它的 `pick`（系统对话框）与
 * `list`／`createDirectory`（应用内浏览那两格原语，由共用件的 `browseFaceOf` 拆信封）。不给 signal
 * （平台那格可选；描述符按「业务参数个数 ＋ 1」判有没有 signal，显式传 `undefined` 会炸）。
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

/** 宿主「这条路没给」的回执码（#744）：一次组合里只服务一种能力（native 或 browse），
 * 另一条路上的动词一律回它。
 *
 * 出处：`@deepseek-ai/dsh-api-workspace-controller/lib/types/directory-picker.js` 的 `requireCapability()`
 * ——`RemoteError('directory-picker/unavailable', …)`。三条动词在客户端命名空间上都在，
 * 所以只有真调一次、看它拒没拒，才知道组合里服务哪种能力。
 * 共用件不认识这个名字（只照比对），于是这条宿主事实住在本镜像里。 */
export const DIRECTORY_PICKER_REFUSED = 'directory-picker/unavailable' as const;

export interface DirectoryPickerFace {
  pick(): Promise<DirectoryPickerAnswer>;
}

/** 总管那条电话通道的两个字面量（#744）：载体第一段与第二段。
 *
 * 出处：主管包 `packages/plugin-manager/src/update-contract.ts` 的 `MANAGER_RPC.base`／`.endpoint`
 * ——那边是一处定义，这边是镜像（本包不许 import 总管的宿主半：会把 node 内建带进浏览器束）。
 * 传错第一段就是 404：总管自己在 #678 栽过一次、各家的配置体检在 #735 又栽过一次。 */
export const MANAGER_RPC_BASE = '/api' as const;
export const MANAGER_RPC_ENDPOINT = 'ilife-manager' as const;

/** 总管那通「本机根清单」电话名（#744）：入参 `{}`，回包 `{roots: [{path, kind}]}`。
 *
 * 出处：主管包 `update-contract.ts` 的 `MANAGER_ACTIONS.roots`。为什么要走总管：
 * 浏览器里没有卷清单接口，宿主那条目录选择接缝也只有 `list`／`createDirectory` 两格，
 * 「这台机器上有哪些盘」只能由宿主去问操作系统——那份实现在总管宿主半的 `roots.ts`。 */
export const MANAGER_ROOTS_METHOD = 'ilife-manager.roots' as const;

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
