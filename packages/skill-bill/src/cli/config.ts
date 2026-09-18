/** 设置页专用的三个配置 key：读／写／重置。**它们不是唤醒词命令。**
 *
 * 与卡路里那份（`packages/skill-calorie/src/cli/config.ts`）同形，理由同它：
 * 唤醒词命令那套登记要进 `registry.ts` 与生成物、还会算进 HELP 与唤醒词计数；
 * 这三个 key 只由设置页（插件）经既有「RPC → spawn 技能 CLI」通道调用，没有唤醒词、
 * 不进 HELP，故它们的唯一事实放在这里，并由 `cmd_read.ts` 在**预检与分派层之前**拦下来
 * （读写配置不该要求库目录已配）。
 *
 * 输出仍守唯一出口那条规矩：stdout 一行 envelope JSON（version／skill／shape／key／data 全字段）。
 * 解析器与校验在 `base-link-core`：本件只把它的报错原样交给人看（配置件第 N 行那句人话）。
 */
import { ENVELOPE_VERSION } from 'base-link-core';
import type { ConfigRecord, EnvelopeShape } from 'base-link-core';
import { loadBillConfig, resetBillConfig, saveBillConfig } from '../config.js';

/** 三个 key 的唯一定义地（插件侧镜像同值，见 `packages/plugin-bill-ilife/src/bridge.ts`）。 */
export const CONFIG_KEYS = {
  read: 'bill.config.read',
  write: 'bill.config.write',
  reset: 'bill.config.reset',
} as const;

/** 是不是配置 key（分派层拦截用）。 */
export function isConfigKey(key: string): boolean {
  return key === CONFIG_KEYS.read || key === CONFIG_KEYS.write || key === CONFIG_KEYS.reset;
}

function envelope(key: string, shape: EnvelopeShape, data: unknown): string {
  return JSON.stringify({ version: ENVELOPE_VERSION, skill: 'bill', shape, key, data });
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
    console.error('ERR 1: ' + (e instanceof Error ? e.message : String(e)));
    process.exit(1);
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
    const c = withHumanError(() => loadBillConfig());
    return envelope(key, 'detail', { path: c.path, dataDir: c.dataDir, created: c.created, values: c.values });
  }
  if (key === CONFIG_KEYS.write) {
    const raw = params['values'];
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
      console.error('ERR 2: 缺参数 values（须为对象）');
      process.exit(2);
    }
    const current = withHumanError(() => loadBillConfig()).values as unknown as ConfigRecord;
    const merged = mergeValues(current, raw as ConfigRecord);
    const r = withHumanError(() => saveBillConfig(merged));
    return envelope(key, 'receipt', { path: r.path, values: merged });
  }
  const r = withHumanError(() => resetBillConfig());
  return envelope(key, 'receipt', { path: r.path, backupPath: r.backupPath });
}
