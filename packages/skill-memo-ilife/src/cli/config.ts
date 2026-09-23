/** 设置页专用的三个配置 key：读／写／重置。**它们不是唤醒词命令**。
 *
 * 为什么事实住这儿、不进唤醒词路由表（各域 `src/<域>/routes.ts`，记录面 `src/triggers/routes.generated.ts`）：
 * 那张表管的是**唤醒词命令**
 * （短语→key→形状→示例），要进 HELP 与唤醒词计数；这三个 key 只由设置页（插件）经既有
 * 「RPC → spawn 技能 CLI」通道调用，没有唤醒词、不进 HELP、也不该出现在用户的命令面上。
 * 按「一条命令的事实只住一处」的同一取向，它们的唯一定义地是这里，并由 `cmd_read.ts` 在
 * **预检与分派层之前**拦下来（读写配置不该要求库目录已配、也不需要形状表里有它）。
 *
 * 输出仍守唯一出口那条规矩：stdout 一行 envelope JSON（version／skill／shape／key／data 五字段）。
 * 解析器与校验在 `base-link-core`：本件只把它的报错原样交给人看（配置件第 N 行那句人话）。
 */
import { ENVELOPE_VERSION } from 'base-link-core';
import type { ConfigRecord, EnvelopeShape } from 'base-link-core';
import { loadMemoConfig, resetMemoConfig, saveMemoConfig } from '../config.js';
import { resolvedMemoPaths } from '../shared/paths.js';
import type { MemoResolvedPaths } from '../shared/paths.js';
import { buildMemoHealthReport } from './health/index.js';
import { larkTierInfo, larkSetupInfo, LARK_WEBSITE_URL } from '../sync/index.js';
import type { LarkTier } from '../sync/index.js';

/** 三个 key 的唯一定义地（插件侧镜像同值，见 `packages/plugin-memo-ilife/src/bridge.ts`）。 */
export const CONFIG_KEYS = {
  read: 'memo.config.read',
  write: 'memo.config.write',
  reset: 'memo.config.reset',
} as const;

/** 是不是配置 key（分派层拦截用）。 */
export function isConfigKey(key: string): boolean {
  return key === CONFIG_KEYS.read || key === CONFIG_KEYS.write || key === CONFIG_KEYS.reset;
}

/** 本技能的 envelope skill 名（与 `render/envelope.ts` 的 `createEnvelope({skill:'memo'})` 同值）。 */
const MEMO_SKILL = 'memo' as const;

function fail(code: number, msg: string): never {
  console.error('ERR ' + code + ': ' + msg);
  process.exit(code);
}

function envelope(key: string, shape: EnvelopeShape, data: unknown): string {
  return JSON.stringify({ version: ENVELOPE_VERSION, skill: MEMO_SKILL, shape, key, data });
}

/** 局部写：给的组按键覆盖，组里没给的子项保留现值（设置页一次只提交改动过的项）。 */
function mergeValues(current: ConfigRecord, incoming: ConfigRecord): ConfigRecord {
  const out: ConfigRecord = {};
  for (const [key, value] of Object.entries(current)) out[key] = value;
  for (const [key, value] of Object.entries(incoming)) {
    const group = typeof value === 'object' && value !== null && !Array.isArray(value);
    const base = out[key];
    if (!group) {
      out[key] = value as ConfigRecord[string];
      continue;
    }
    const merged: Record<string, unknown> = { ...(typeof base === 'object' && base !== null ? (base as Record<string, unknown>) : {}) };
    for (const [child, inner] of Object.entries(value as Record<string, unknown>)) merged[child] = inner;
    out[key] = merged as ConfigRecord[string];
  }
  return out;
}

/** 人话交回：base-link-core 的 `ConfigError` 报文里已经带了行号与文件名，别包成栈。 */
function withHumanError<T>(run: () => T): T {
  try {
    return run();
  } catch (e) {
    fail(1, e instanceof Error ? e.message : String(e));
  }
}

/**
 * 跑一个配置 key，返回整行 envelope JSON。
 *
 * 三个 key 的载荷：读 → `{path, dataDir, created, values, resolved, lark[, alerts]}`；写 → 入参 `{values}`，
 * 回执 `{path, values}`；重置 → `{path, backupPath}`（`backupPath` 为 null 表示本来就没有配置文件）。
 *
 * `resolved`（#760，照 #749 样板）＝一组**解析后的绝对路径**，给设置页的只读行显示用
 * （算式唯一定义地＝`src/shared/paths.ts`，面板不自己拼路径）。
 * `lark`（#760，定稿 #759）＝飞书 CLI 三档读数 ＋ 复制安装指引全文 ＋ 官网行
 * （判据唯一定义地＝`src/sync/feishu.ts` 的 `larkTierInfo`，面板只显示）。
 *
 * `lark.version`（#936）＝ `lark-cli --version` 里那个**版本号**（首个数字段，如 `1.0.82`）：
 * 面板「飞书 CLI」状态区第二行「路径（`cliPath`）＋ 版本胶囊」的胶囊就是它。读不到＝`null`
 * ——这一格**不交值**（不编 `unknown` 之类），面板拿 `null` 就把胶囊留空；探测照样出三档，不因此失败。
 * 镜面：`packages/plugin-memo-ilife/src/contract.ts` 的 `LarkState.version`。
 */
export interface MemoConfigReadLark {
  readonly tier: LarkTier;
  readonly cliPath: string | null;
  /** `lark-cli --version` 的版本号（首个数字段）；没找到 CLI 或读不到＝`null`（这一格不交值）。 */
  readonly version: string | null;
  readonly prompt: string;
  readonly websiteLine: string;
  readonly websiteUrl: string;
}

/**
 * #915 第二步：只给 `db.dir` 的行告警（本家唯一体检判红的格）。
 *
 * 结论复用体检 `db.dir` 那一项（`src/cli/health/` 的 `dirVerdict`：不在／在但写不进去／
 * 在且能写），红才给，`message` 原样取体检那句故障本身，不合成新句子；绿＝缺席（面板不亮）。
 * `media.dir`（附件目录）与 `html.dir` 的体检最高只到黄（提醒、非"用不了"），一律不给——
 * 它们照旧只在体检视图里可见。故障码只按体检报文首字区分，供判据与回执用，面板只画 `message`。
 */
function memoAlerts(): Record<string, { readonly code: string; readonly message: string }> | undefined {
  const item = buildMemoHealthReport().items.find((entry) => entry.id === 'db.dir');
  if (item === undefined || item.status !== 'red') return undefined;
  const code = item.message.startsWith('不在') || item.message.startsWith('同名') ? 'DIR_MISSING' : 'DIR_UNWRITABLE';
  return { 'db.dir': { code, message: item.message } };
}

export function runConfigKey(key: string, params: Record<string, unknown>): string {
  if (key === CONFIG_KEYS.read) {
    const c = withHumanError(() => loadMemoConfig());
    const resolved: MemoResolvedPaths = withHumanError(() => resolvedMemoPaths());
    const tier = withHumanError(() => larkTierInfo());
    const setup = larkSetupInfo();
    const alerts = withHumanError(() => memoAlerts());
    const lark: MemoConfigReadLark = {
      tier: tier.tier, cliPath: tier.cliPath, version: tier.version,
      prompt: setup.prompt, websiteLine: setup.websiteLine, websiteUrl: LARK_WEBSITE_URL,
    };
    const data: Record<string, unknown> = { path: c.path, dataDir: c.dataDir, created: c.created, values: c.values, resolved, lark };
    if (alerts !== undefined) data['alerts'] = alerts;
    return envelope(key, 'detail', data);
  }
  if (key === CONFIG_KEYS.write) {
    const raw = params['values'];
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) fail(2, '缺参数 values（须为对象）');
    const current = withHumanError(() => loadMemoConfig()).values as unknown as ConfigRecord;
    const merged = mergeValues(current, raw as ConfigRecord);
    const r = withHumanError(() => saveMemoConfig(merged));
    return envelope(key, 'receipt', { path: r.path, values: merged });
  }
  const r = withHumanError(() => resetMemoConfig());
  return envelope(key, 'receipt', { path: r.path, backupPath: r.backupPath });
}
