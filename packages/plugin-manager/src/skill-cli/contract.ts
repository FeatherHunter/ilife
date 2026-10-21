/** 单品插件共用件：技能出口桥的公开契约（六家桥的唯一规格形状）。
 *
 * 六家单品（记账／卡路里／备忘录／作息／居家／大厨）的宿主半只做三件事：
 * ① 交一份规格（我家出口在哪、错误类是谁、哪些键不走子进程）；
 * ② 把自家 RPC 端点转成 `readViaCli` 调用；
 * ③ 把出参按本家契约件收窄。
 * 取数本身的机械动作——定位已装技能包、异步 spawn、超时杀进程、信封校验、错误码映射——
 * 全在本子路径里，只有一处实现（六家原先各抄一份同步 `spawnSync`，是首开卡顿的根因）。
 *
 * 为什么住在总管而不是新建 base-* 包：边界门禁（test/plugin-p10-boundaries.test.mjs）
 * 只允许单品依赖总管（dsh-life-pack），不许单品 import base-*／skill-*；
 * 总管是六家共同父件，共用件放这里是唯一合规的落点。
 */

/** 子进程上限（毫秒）：超期未退即杀掉，绝不无限挂起。
 *
 * #48 真机根因：Desktop 宿主的 process.execPath 是 Electron 二进制，直 spawn 会起 GUI 子进程永不退出；
 * 故需要二进制解析（`resolveNodeBin`）＋硬超时两件。六家同一口径，值只在唯一一处定义。
 */
export const SPAWN_TIMEOUT_MS = 20_000 as const;

/** 出口 stdout 的硬上限（字节）：超限杀掉子进程，按 fetch-failed 报出来。
 *
 * 改版前 `spawnSync` 的默认 maxBuffer 是 1 MiB；这里放宽到 8 MiB（配置面／体检回执远小于此），
 * 但仍要封顶——一条失控回执不许把宿主内存吃干。刻意**不静默截断**：截断的 JSON 会变成
 * bad-json，把真正的超限原因掩盖掉。
 */
export const MAX_STDOUT_BYTES = 8 * 1024 * 1024;

/** 桥错误的四个码（各家 `SkillBridgeError.code` 的联合，值同源）。
 *
 * · missing-cli：技能出口不在（没构建／没装）；
 * · fetch-failed：子进程起不来／超时／非 0／缺数据；
 * · bad-json：stdout 不是 JSON；
 * · key-mismatch：回执 key 与请求不符。
 */
export type SkillCliErrorCode = 'missing-cli' | 'fetch-failed' | 'bad-json' | 'key-mismatch';

/** 一套桥的规格：六家 bridge 交的唯一一份配置。 */
export interface SkillCliSpec {
  /** 技能包名（按 Node 解析规则定位它 → 出口真实落点）。 */
  readonly skillPackage: string;
  /** 单仓相对路径（解析不到已装包时的回退；也是边界门禁认的 `cmd_read` 字面）。 */
  readonly repoRelativeCli: string;
  /** 包内出口相对路径（相对技能包根，随已装包版本走）。 */
  readonly packageRelativeCli: string;
  /** 本家 bridge 模块自己的 URL：按包名解析时以它为起点（与改版前同一条解析路径）。 */
  readonly moduleUrl: string;
  /** 本家 host.call 的方法名（`host.call` 的第一段）。 */
  readonly hostCallMethod: string;
  /** 错误类工厂：工厂只负责 `new`，`instanceof` 判定留在各家 index.ts。 */
  readonly makeError: (code: SkillCliErrorCode, message: string) => Error;
  /** 不经子进程的同步取数（版本魔键等）：key → 取值函数。 */
  readonly specialReads?: ReadonlyMap<string, () => unknown>;
  /** 单家 spawn 上限（毫秒）：测试可注入短时限；生产六家不传，一律取 {@link SPAWN_TIMEOUT_MS}。 */
  readonly spawnTimeoutMs?: number;
}

/** host.call 那一侧的最小面（面板请求函数只认这一格）。 */
export interface HostCallFace {
  call(method: string, args: unknown): Promise<unknown>;
}

/** 一只桥：各家 bridge 文件把它 re-export 成既有导出面。 */
export interface SkillCliBridge {
  /** 技能出口的绝对路径（现解析，不缓存：安装态可能中途变）。 */
  cliPath(): string;
  /** 出口在不在（缺失抛 missing-cli；不返空）。 */
  assertCliPresent(cli?: string): void;
  /** 取数：spawn 技能出口，返回 envelope 的 data（缺失阻断）。 */
  readViaCli(key: string, params?: Record<string, unknown>): Promise<unknown>;
  /** host 侧处理函数：由 host 注册到 connection RPC，供面板调用。 */
  handleHostCall(key: string, params?: Record<string, unknown>): Promise<unknown>;
  /** 面板侧请求函数：只经 host.call，不直调技能实现。 */
  requestViaHost(host: HostCallFace, key: string, params?: Record<string, unknown>): Promise<unknown>;
  /** 本家 host.call 方法名（host.call 的第一段）。 */
  readonly hostCallMethod: string;
  /** 单家 spawn 上限（体检时限门禁与文案都读它）。 */
  readonly spawnTimeoutMs: number;
}
