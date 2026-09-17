/** DSH ctx 最小镜像（只含本仓实际使用的面；type-only，构建期擦除，零运行时）。
 *
 * skills 面出处见 `docs/agents/dsh-client-contract.md` §12（#56 卡路里样板；
 * #150 记账／#206 作息／#218 大厨同形，本票 #193 居家同形）：
 *   `ctx.skills.registerProvider(create)`（`dsh-skill/lib/index.js:147`）；
 *   candidate 校验红线见 `validateCandidate`（同文件 `:452`）；`get` 回定义须与候选同名（同文件 `:259`）。
 * slots 面出处见 cookbook §11（爱生活单卡方案）：
 *   `inject(key, cb)` 等声明同步跑否则等待（`dsh-client-ui-renderer/lib/client.js:1015`）；
 *   `register` list 必 `{id}`（`dsh-client-ui-slots/lib/index.js:72`）；
 *   爱生活页签槽注册形见 cookbook §11（`{name:'ilife.config-tab', id, order, label}`）。
 * 禁止加镜外成员：要用新能力，先在 cookbook 落出处，再加镜像。用 `import type` 引用本文件。
 *
 * 本插件 host 侧用 skills 面，client 侧用 slots 面（最小静态注册，不取数，故无 connection）。
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

/** 居家 client 上下文（最小静态版：只读 slots，不碰 connection／DOM／node）。 */
export interface ClientCtx {
  readonly slots: SlotsFace;
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

/** 本插件用到的宿主面（apply 入参）。 */
export interface SkillHostCtx {
  readonly skills: SkillsFace;
  readonly logger?: unknown;
}
