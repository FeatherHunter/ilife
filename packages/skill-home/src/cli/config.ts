/** 设置页专用的三个配置 key：读／写／重置。**它们不是唤醒词命令**。
 *
 * 为什么事实住这儿、不进 `src/policy/wakewords.ts` 那张唤醒词表：那张表管的是**唤醒词命令**
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
import { loadHomeConfig, resetHomeConfig, saveHomeConfig } from '../config.js';

/** 三个 key 的唯一定义地（插件侧镜像同值，见 `packages/plugin-home-ilife/src/bridge.ts`）。 */
export const CONFIG_KEYS = {
  read: 'home.config.read',
  write: 'home.config.write',
  reset: 'home.config.reset',
} as const;

/** 是不是配置 key（分派层拦截用）。 */
export function isConfigKey(key: string): boolean {
  return key === CONFIG_KEYS.read || key === CONFIG_KEYS.write || key === CONFIG_KEYS.reset;
}

/** 本技能的 envelope skill 名（与 `src/render/envelope.ts` 的 `buildHomeEnvelope` 同值）。 */
const HOME_SKILL = 'home' as const;

function fail(code: number, msg: string): never {
  console.error('ERR ' + code + ': ' + msg);
  process.exit(code);
}

function envelope(key: string, shape: EnvelopeShape, data: unknown): string {
  return JSON.stringify({ version: ENVELOPE_VERSION, skill: HOME_SKILL, shape, key, data });
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
 * 三个 key 的载荷：读 → `{path, dataDir, created, values}`；写 → 入参 `{values}`，回执 `{path, values}`；
 * 重置 → `{path, backupPath}`（`backupPath` 为 null 表示本来就没有配置文件）。
 */
export function runConfigKey(key: string, params: Record<string, unknown>): string {
  if (key === CONFIG_KEYS.read) {
    const c = withHumanError(() => loadHomeConfig());
    return envelope(key, 'detail', { path: c.path, dataDir: c.dataDir, created: c.created, values: c.values });
  }
  if (key === CONFIG_KEYS.write) {
    const raw = params['values'];
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) fail(2, '缺参数 values（须为对象）');
    const current = withHumanError(() => loadHomeConfig()).values as unknown as ConfigRecord;
    const merged = mergeValues(current, raw as ConfigRecord);
    const r = withHumanError(() => saveHomeConfig(merged));
    return envelope(key, 'receipt', { path: r.path, values: merged });
  }
  const r = withHumanError(() => resetHomeConfig());
  return envelope(key, 'receipt', { path: r.path, backupPath: r.backupPath });
}
