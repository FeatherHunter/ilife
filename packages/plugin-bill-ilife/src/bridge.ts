/** dsh-bill-ilife 取数桥（P10 脚手架：纯 CLI 单轨）。
 *
 * 面板与跨技能只经 host.call 触发本桥，本桥只经 spawn 调技能包唯一出口
 * packages/skill-bill/dist/cli/cmd_read.js（argv+JSON+exit，stdout 纯 envelope JSON 一行）。
 * 本文件不 import 任何技能实现（只读消费其 dist/CLI）；缺失阻断不返空：
 * CLI 缺席/非 0/非 JSON/回执 key 不符一律抛错，绝不返回空数组冒充正常。
 * 技能包不动（只读）；combos.yaml 不动。
 */
import { spawnSync } from 'node:child_process';
import { accessSync, constants } from 'node:fs';
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ConfigSurfaceReply } from './contract.js';

export const SKILL_PACKAGE = 'skill-bill' as const;
export const SKILL_CLI = 'packages/skill-bill/dist/cli/cmd_read.js' as const;
export const HOST_CALL_METHOD = 'ilife.bill.read' as const;
export const MANAGER_PACKAGE = 'dsh-life-pack' as const;

export const MANAGER_MISSING_HINT =
  '总管缺席，请补装：dsh plugin add dsh-life-pack dsh-bill-ilife（不许单卸总管）';

export class SkillBridgeError extends Error {
  readonly code: 'missing-cli' | 'fetch-failed' | 'bad-json' | 'key-mismatch';
  constructor(code: SkillBridgeError['code'], message: string) {
    super(message);
    this.name = 'SkillBridgeError';
    this.code = code;
  }
}

function repoRoot(): string {
  return join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
}

/** 包内 CLI 相对路径（相对技能包根，与 SKILL_CLI 尾段一致）。 */
export const SKILL_CLI_REL = 'dist/cli/cmd_read.js' as const;

/** 按包名解析技能出口（#50 修法①之二，照抄 #48 卡路里样板）：createRequire 定位技能包（SKILL_PACKAGE）
 * 的 package.json，再拼包内 dist/cli/cmd_read.js。只读消费其 dist/CLI（spawn），
 * 绝不 import 技能实现。包名解析失败回退单仓相对路径；两者皆无由 assertCliPresent
 * 抛 missing-cli（缺失阻断不返空）。 */
function resolveSkillCli(): string {
  try {
    const pkgJson = createRequire(import.meta.url).resolve(SKILL_PACKAGE + '/package.json');
    return join(dirname(pkgJson), SKILL_CLI_REL);
  } catch {
    return join(repoRoot(), SKILL_CLI);
  }
}

export function cliPath(): string {
  return resolveSkillCli();
}

export function assertCliPresent(path?: string): void {
  const p = path ?? cliPath();
  try {
    accessSync(p, constants.R_OK);
  } catch {
    throw new SkillBridgeError('missing-cli', '技能出口缺失（先构建对应包）：' + p);
  }
}

/** host.call 侧处理函数：由 host 注册到 connection RPC，供面板调用。 */
export function handleHostCall(key: string, params: Record<string, unknown> = {}): unknown {
  return readViaCli(key, params);
}

/** 面板侧请求函数：只经 host.call，不直调技能实现。 */
export function requestViaHost(host: { call(method: string, args: unknown): Promise<unknown> }, key: string, params: Record<string, unknown> = {}): Promise<unknown> {
  return host.call(HOST_CALL_METHOD, { key, params });
}

/** spawn 超时毫秒：子进程超期未退即杀掉，转 fetch-failed，绝不无限挂起。
 * #48 真机根因（本件由 #670 回填，照 calorie/memo 同形）：Desktop 宿主的 process.execPath 是 Electron 二进制，直 spawn 会起 GUI 子进程永不退出。 */
export const SPAWN_TIMEOUT_MS = 20_000 as const;

/** node 可执行体解析（纯函数，execPath 可注入单测）。
 * execPath 是 node 即直用；否则（Electron 宿主）沿用该二进制但加官方 ELECTRON_RUN_AS_NODE 语义当 node 用。 */
export function resolveNodeBin(execPath: string = process.execPath): { readonly bin: string; readonly extraEnv: Record<string, string> } {
  if (/(^|[\\/])node(\.exe)?$/i.test(execPath)) return { bin: execPath, extraEnv: {} };
  return { bin: execPath, extraEnv: { ELECTRON_RUN_AS_NODE: '1' } };
}

/** 同步取数：spawn 技能 cmd_read，返回 envelope data（缺失阻断）。 */
export function readViaCli(key: string, params: Record<string, unknown> = {}): unknown {
  const bin = cliPath();
  assertCliPresent(bin);
  const { bin: node, extraEnv } = resolveNodeBin();
  const r = spawnSync(node, [bin, key, '--params', JSON.stringify(params)], { encoding: 'utf8', timeout: SPAWN_TIMEOUT_MS, env: { ...process.env, ...extraEnv } });
  if (r.error) {
    if ((r.error as NodeJS.ErrnoException)?.code === 'ETIMEDOUT') {
      throw new SkillBridgeError('fetch-failed', '出口超 ' + String(SPAWN_TIMEOUT_MS / 1000) + 's 未退，已杀掉（宿主非 node 时见 resolveNodeBin）');
    }
    throw new SkillBridgeError('fetch-failed', '出口 spawn 失败：' + (r.error as Error).message);
  }
  if (r.status !== 0) {
    const tail = String(r.stderr ?? '').trim().split('\n').pop() ?? '';
    throw new SkillBridgeError('fetch-failed', '出口非 0（' + String(r.status) + '）：' + tail);
  }
  let env: { key?: unknown; data?: unknown };
  try {
    env = JSON.parse(String(r.stdout)) as { key?: unknown; data?: unknown };
  } catch {
    throw new SkillBridgeError('bad-json', '出口非 JSON');
  }
  if (!env || env.key !== key) throw new SkillBridgeError('key-mismatch', '出口回执 key 不符');
  if (env.data === null || env.data === undefined) throw new SkillBridgeError('fetch-failed', '缺失阻断取数，不返空：' + key);
  return env.data;
}

/** 设置页的三个配置 key。
 *
 * **唯一定义地是技能侧** `packages/skill-bill/src/cli/config.ts` 的 `CONFIG_KEYS`
 * （那里写了「插件侧镜像同值」）；本处只是镜像，值改一处要两处一起改，
 * 对齐由 `test/config-surface-677.test.mjs` 的编译产物锁死。
 *
 * 为什么走 CLI 而不在插件里读盘：单品插件的冻结边界是「只读消费技能 dist／CLI，纯 CLI 单轨」
 * （`test/plugin-p10-boundaries.test.mjs`：单品不 import `base-*`、不 import `skill-*`，
 * 必须经 host.call 与 spawn 到 cmd_read）。配置文件的读写实现住技能的 `src/config.ts`，
 * 插件只经这三个 key 取用——同一份实现不抄第二处。
 */
export const CONFIG_READ_KEY = 'bill.config.read' as const;
export const CONFIG_WRITE_KEY = 'bill.config.write' as const;
export const CONFIG_RESET_KEY = 'bill.config.reset' as const;
/** #706 配置体检：只读一条，回一份报告（判据由技能侧出，本包只透传，不重写一个字）。 */
export const CONFIG_CHECK_KEY = 'bill.config.check' as const;

/** 设置页整面：文件在哪、数据在哪、当前值、是不是这次新建的（取自技能 `bill.config.read`）。 */
export function readConfigSurface(): ConfigSurfaceReply {
  return readViaCli(CONFIG_READ_KEY, {}) as ConfigSurfaceReply;
}

/** 保存一份配置（技能侧按键覆盖，组里没给的子项保留现值；写出去的是完整一份）。 */
export function writeConfigValues(values: Record<string, unknown>): { path: string; values: Record<string, unknown> } {
  return readViaCli(CONFIG_WRITE_KEY, { values }) as { path: string; values: Record<string, unknown> };
}

/** 重置为默认（技能侧先另存 `<配置目录>/bill.yaml.bak`）。 */
export function resetConfigToDefaults(): { path: string; backupPath: string | null } {
  return readViaCli(CONFIG_RESET_KEY, {}) as { path: string; backupPath: string | null };
}

/** 配置体检（#706）：只读一份报告，面板侧**不校验也不重写**——形状的唯一真相在技能侧
 *  `packages/skill-bill/src/health.ts`，认形状是面板的事
 *  （`packages/plugin-manager/src/health-contract.ts`）。 */
export function readConfigHealth(): unknown {
  return readViaCli(CONFIG_CHECK_KEY, {});
}
