/** dsh-calorie 取数桥（P10 脚手架：纯 CLI 单轨）。
 *
 * 本文件只剩「本家的规格 ＋ 契约收窄」：机械动作（定位已装技能包、异步 spawn、超时杀进程、
 * 信封校验、错误码映射）收进总管共用件 `dsh-life-pack` 根入口的 skill-cli 共用件——六家只有那一份实现。
 * 边界不变：面板与跨技能只经 host.call 触发本桥，本桥只经 spawn 调技能包唯一出口
 * packages/skill-calorie/dist/cli/cmd_read.js（argv+JSON+exit，stdout 纯 envelope JSON 一行）；
 * 本文件不 import 任何技能实现（只读消费其 dist/CLI）；缺失阻断不返空：
 * CLI 缺席/非 0/非 JSON/回执 key 不符一律抛错，绝不返回空数组冒充正常。
 * 技能包不动（只读）；combos.yaml 不动。
 */
import { installedVersionOf } from 'dsh-life-pack';
import { createSkillCliBridge, resolveNodeBin, SPAWN_TIMEOUT_MS } from 'dsh-life-pack';
import type { SkillCliErrorCode } from 'dsh-life-pack';
import type { ConfigSurfaceReply } from './contract.js';

export const SKILL_PACKAGE = 'skill-calorie' as const;
export const SKILL_CLI = 'packages/skill-calorie/dist/cli/cmd_read.js' as const;
export const HOST_CALL_METHOD = 'ilife.calorie.read' as const;
export const MANAGER_PACKAGE = 'dsh-life-pack' as const;

export const MANAGER_MISSING_HINT =
  '总管缺席，请补装：dsh plugin add dsh-life-pack dsh-calorie（不许单卸总管）';

/** #130 版本通道（host 侧动态读取已安装版本，client 纯渲染）；#918 阶段三起读值走总管共用件。
 *
 * 唯一真相源=磁盘 package.json：插件取自身 package.json 的 version，
 * skill 取已安装 skill-calorie/package.json 的 version。
 * 这两处读取**只有一处定义**＝总管（dsh-life-pack）的 `installedVersionOf(包名, from)`：
 * 它从 `from` 那份模块按包名解析**已装**的 `<包名>/package.json`，只解析 `version`，永不抛。
 * client 禁 node（见 client.ts 头注释），故读取只许在 host 侧（本文件），
 * 经现有 connection.rpc.call 模式（同 READ 端点、VERSION_READ_KEY 魔键）传给面板，
 * client 只渲染 host 给的值，读不到侧显示 unknown（见 client normalizeVersion）。
 * 不引入新运行时依赖；只解析 version 字段，不读 SKILL 正文、不改 provider 解析路径。
 */

/** 面板骨架的 unknown 占位（与共用件那处的 `VERSION_UNKNOWN` 同值 'unknown'）。
 *
 * 读失败的兜底住在共用件（本文件不再自己兜底）；本常量只为既有导出面与面板骨架保留，
 * client 侧另有一份镜像（client 禁直引 bridge，见 client.ts）。
 */
export const VERSION_UNKNOWN = 'unknown' as const;
export const VERSION_READ_KEY = 'dsh-calorie.version' as const;

export interface InstalledVersions {
  readonly plugin: string;
  readonly skill: string;
}

/** host 侧读已安装双 package.json（永不抛；读不到侧由共用件回 'unknown' 并 warn 留痕）。
 *
 * 两个包名按字面给：技能包名与 `SKILL_PACKAGE` 同值（那是本包自己的定义，见上），
 * 插件包名即本包名（与 index.ts 的 `name`／slot.ts 的 `PLUGIN` 同值）。
 * `from` 传本模块 URL：共用件据此按 Node 解析规则找 `<包名>/package.json`
 * （插件与技能包的 `exports` 都留了 `./package.json` 这一条），故开发单仓
 * （`packages/plugin-calorie/dist/bridge.js`）与安装态（`node_modules/dsh-calorie/dist/bridge.js`）
 * 走同一条路，读的都是**已装的那份**，不是构建期抄进代码里的字面量。 */
export function readInstalledVersions(): InstalledVersions {
  return { plugin: installedVersionOf('dsh-calorie', import.meta.url), skill: installedVersionOf(SKILL_PACKAGE, import.meta.url) };
}

export class SkillBridgeError extends Error {
  readonly code: SkillCliErrorCode;
  constructor(code: SkillCliErrorCode, message: string) {
    super(message);
    this.name = 'SkillBridgeError';
    this.code = code;
  }
}

/** 包内 CLI 相对路径（相对技能包根，与 SKILL_CLI 尾段一致）。 */
export const SKILL_CLI_REL = 'dist/cli/cmd_read.js' as const;

/** 本家的桥：规格只此一份（出口在哪、错误类是谁、版本魔键走同步读）。 */
const bridge = createSkillCliBridge({
  skillPackage: SKILL_PACKAGE,
  repoRelativeCli: SKILL_CLI,
  packageRelativeCli: SKILL_CLI_REL,
  moduleUrl: import.meta.url,
  hostCallMethod: HOST_CALL_METHOD,
  makeError: (code, message) => new SkillBridgeError(code, message),
  specialReads: new Map([[VERSION_READ_KEY, () => readInstalledVersions()]]),
});

export function cliPath(): string {
  return bridge.cliPath();
}

export function assertCliPresent(path?: string): void {
  bridge.assertCliPresent(path);
}

/** host.call 侧处理函数：由 host 注册到 connection RPC，供面板调用。 */
export function handleHostCall(key: string, params: Record<string, unknown> = {}): Promise<unknown> {
  return bridge.handleHostCall(key, params);
}

/** 面板侧请求函数：只经 host.call，不直调技能实现。 */
export function requestViaHost(host: { call(method: string, args: unknown): Promise<unknown> }, key: string, params: Record<string, unknown> = {}): Promise<unknown> {
  return bridge.requestViaHost(host, key, params);
}

/** 异步取数：spawn 技能 cmd_read，返回 envelope data（缺失阻断）。 */
export function readViaCli(key: string, params: Record<string, unknown> = {}): Promise<unknown> {
  return bridge.readViaCli(key, params);
}

export { resolveNodeBin, SPAWN_TIMEOUT_MS };

/** 设置页的三个配置 key。
 *
 * **唯一定义地是技能侧** `packages/skill-calorie/src/cli/config.ts` 的 `CONFIG_KEYS`
 * （那里写了「插件侧镜像同值」）；本处只是镜像，值改一处要两处一起改，
 * 对齐由 `test/config-surface-676.test.mjs` 的源码文本锁死。
 *
 * 为什么走 CLI 而不在插件里读盘：单品插件的冻结边界是「只读消费技能 dist／CLI，纯 CLI 单轨」
 * （`test/plugin-p10-boundaries.test.mjs`：单品不 import `base-*`、不 import `skill-*`，
 * 必须经 host.call 与 spawn 到 cmd_read）。配置文件的读写实现住技能的 `src/config.ts`，
 * 插件只经这三个 key 取用——同一份实现不抄第二处。
 */
export const CONFIG_READ_KEY = 'calorie.config.read' as const;
export const CONFIG_WRITE_KEY = 'calorie.config.write' as const;
export const CONFIG_RESET_KEY = 'calorie.config.reset' as const;
/** #706 配置体检：只读一条，回一份报告（判据由技能侧出，本包只透传，不重写一个字）。 */
export const CONFIG_CHECK_KEY = 'calorie.config.check' as const;

/** 设置页整面：文件在哪、数据在哪、当前值、是不是这次新建的（取自技能 `calorie.config.read`）。 */
export function readConfigSurface(): Promise<ConfigSurfaceReply> {
  return bridge.readViaCli(CONFIG_READ_KEY) as Promise<ConfigSurfaceReply>;
}

/** 保存一份配置（技能侧按键覆盖，组里没给的子项保留现值；写出去的是完整一份）。 */
export function writeConfigValues(values: Record<string, unknown>): Promise<{ path: string; values: Record<string, unknown> }> {
  return bridge.readViaCli(CONFIG_WRITE_KEY, { values }) as Promise<{ path: string; values: Record<string, unknown> }>;
}

/** 重置为默认（技能侧先另存 `<配置目录>/calorie.yaml.bak`）。 */
export function resetConfigToDefaults(): Promise<{ path: string; backupPath: string | null }> {
  return bridge.readViaCli(CONFIG_RESET_KEY) as Promise<{ path: string; backupPath: string | null }>;
}

/** 配置体检（#706）：只读一份报告，面板侧**不校验也不重写**——形状的唯一真相在技能侧
 *  `packages/skill-calorie/src/health.ts`，认形状是面板的事（`packages/plugin-manager/src/health-contract.ts`）。 */
export function readConfigHealth(): Promise<unknown> {
  return bridge.readViaCli(CONFIG_CHECK_KEY);
}
