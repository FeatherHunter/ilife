/** DSH ctx 最小镜像（只含本仓实际使用的面；type-only，构建期擦除，零运行时）。
 *
 * 每条成员的用法出处见 `docs/agents/dsh-client-contract.md`（附源码路径 ＋ 行）。
 * skills 面出处见 `docs/agents/dsh-client-contract.md` §12（#56 卡路里样板；
 * #150 记账／#206 作息／#218 大厨同形，本票 #193 居家同形）：
 *   `ctx.skills.registerProvider(create)`（`dsh-skill/lib/index.js:147`）；
 *   candidate 校验红线见 `validateCandidate`（同文件 `:452`）；`get` 回定义须与候选同名（同文件 `:259`）。
 * slots 面出处见 cookbook §11（爱生活单卡方案）：
 *   `inject(key, cb)` 等声明同步跑否则等待（`dsh-client-ui-renderer/lib/client.js:1015`）；
 *   `register` list 必 `{id}`（`dsh-client-ui-slots/lib/index.js:72`）；
 *   爱生活页签槽注册形见 cookbook §11（`{name:'ilife.config-tab', id, order, label}`）。
 * connection 面出处：宿主注册走 `connection.fetch.register(route)`、面板调用走
 *   `connection.rpc.call(channel, endpoint, payload, signal)`（#80 迁移到公开 `/api` 载体，样式见
 *   `@xmanrui/dsh-im` 的 `plugin-src/management-rpc.mjs`）。
 * 禁止加镜外成员：要用新能力，先在 cookbook 落出处，再加镜像。用 `import type` 引用本文件。
 *
 * #696：本文件原先是「最小静态注册，不取数，故无 connection」。设置页要读改配置，
 * 按 #56 卡路里／#677 记账／#696 大厨先例补上 connection 两侧（host 注册 ＋ client 调用），其余面不动。
 */

/** 爱生活页签槽注册项（cookbook §11 options 全形子集，只取本次用到的面）。 */
export interface SlotsRegisterOptions {
  readonly name: string;
  readonly id?: string;
  readonly order?: number;
  readonly label?: string | (() => string);
  readonly locale?: string;
  readonly inject?: () => Record<string, unknown>;
}

/** 总管声明的爱生活页签槽面（client 侧只用 inject＋register）。 */
export interface SlotsFace {
  inject(key: string, callback: () => (() => void) | Iterable<() => void>): () => void;
  register(options: SlotsRegisterOptions, component: unknown): () => void;
}

/** rpc.call 的回执信封（本包只读 ok／value／error 三处）。 */
export interface RpcCallResult {
  readonly ok: boolean;
  readonly value?: unknown;
  readonly error?: { readonly code?: string; readonly message?: string };
}

/** 面板侧调用口（每次取数时现取：connection 后到也不永久缺席）。 */
export type RpcCallFace = (
  path: string,
  channel: string,
  body: unknown,
  signal?: AbortSignal,
) => Promise<unknown>;

/** 居家 client 上下文（只读 slots 与 connection；不碰 DOM／node）。 */
export interface ClientCtx {
  readonly slots: SlotsFace;
  /** 宿主连接面：客户端经它把请求送进宿主注册的 /api 路由。缺席即由组件判「宿主连接缺席」。 */
  readonly connection?: { readonly rpc?: { readonly call?: RpcCallFace } };
  /** 服务取用（本包暂不用，保留面以对齐兄弟件镜像）。 */
  get?(name: string): unknown;
  /** 卸载清理登记。 */
  effect?(callback: () => void, label?: string): void;
}

/** 技能的调用策略（模型可调／用户可调）。 */
export interface SkillInvocationPolicy {
  readonly modelInvocable: boolean;
  readonly userInvocable: boolean;
}

/** 候选摘要（宿主 `list` 的返回项；`provider` 须等于注册名，否则宿主校验抛）。 */
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

/** 技能全文（宿主 `get` 的返回项；`content` 为 frontmatter 后正文）。 */
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

/** RPC 处理函数：端点 ＋ 载荷 → 信封回执（照大厨那份同形）。 */
export type RpcHandler = (endpoint: string, payload: unknown) => Promise<unknown>;

/** 宿主 fetch 路由注册面（`ctx.connection.fetch.register`）。 */
export interface HostConnectionFace {
  readonly fetch: { register(options: Record<string, unknown>): () => void };
}

/** 本插件用到的宿主面（apply 入参）。 */
export interface SkillHostCtx {
  readonly skills: SkillsFace;
  /** 宿主连接面：设置页的三个配置端点注册在这上面（#696 起用）。 */
  readonly connection?: HostConnectionFace;
  /** 卸载清理登记。 */
  effect?(callback: () => void, label?: string): void;
  readonly logger?: unknown;
}
