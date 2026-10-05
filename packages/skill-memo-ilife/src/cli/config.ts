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
import { configPaths } from 'base-link-core';
import { MEMO_CONFIG_STEM, loadMemoConfig, resetMemoConfig, saveMemoConfig } from '../config.js';
import { resolvedMemoPaths } from '../shared/paths.js';
import type { MemoResolvedPaths } from '../shared/paths.js';
import { readMemoConfigReadOnly } from './health/configRead.js';
import { dirVerdict } from './health/probe.js';

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
 * 三个 key 的载荷：读 → `{path, dataDir, created, values, resolved[, alerts]}`；写 → 入参 `{values}`，
 * 回执 `{path, values}`；重置 → `{path, backupPath}`（`backupPath` 为 null 表示本来就没有配置文件）。
 *
 * `resolved`（#760，照 #749 样板）＝一组**解析后的绝对路径**，给设置页的只读行显示用
 * （算式唯一定义地＝`src/shared/paths.ts`，面板不自己拼路径）。
 *
 * #1142 快慢分离：读路径禁外部进程与完整体检——飞书三档与完整报告只走 `memo.config.check`，
 * 本读路径只做本地文件与目录判定，lark 一格不再经这里返回（旧技能带它是兼容，面板读 check 优先、read 回退）。
 */

/** 人话路径一律正斜杠（与体检探针同口径）。 */
function p(path: string): string {
  return path.replace(/\\/g, '/');
}

/**
 * #915 第二步 + #1142 快路径：只给 `db.dir` 的行告警（本家唯一体检判红的格）。
 *
 * 只碰目录本身（`dirVerdict` 那一支：不在／在但写不进去／在且能写），不跑 lark 链、不组完整报告、
 * 不落默认配置文件（只读解析，文件不在即不告警、交由主读路径处理）。红才给，绿＝缺席（面板不亮）。
 * `media.dir` 与 `html.dir` 最高只到黄，一律不给——照旧只在体检视图里可见。
 */
function memoAlerts(): Record<string, { readonly code: string; readonly message: string }> | undefined {
  const read = withHumanError(() => readMemoConfigReadOnly());
  if (read.kind !== 'ok') return undefined;
  const dbGroup = (read.values as Record<string, unknown>)['db'];
  const configured = typeof dbGroup === 'object' && dbGroup !== null && !Array.isArray(dbGroup)
    ? String((dbGroup as Record<string, unknown>)['dir'] ?? '')
    : '';
  const dataDir = configured !== '' ? configured : configPaths(MEMO_CONFIG_STEM).dataDir;
  const verdict = withHumanError(() => dirVerdict(dataDir));
  if (verdict.exists && verdict.writable) return undefined;
  const message = !verdict.exists
    ? '不在：' + p(dataDir) + (verdict.reason !== '' ? '（' + verdict.reason + '）' : '')
    : '在，但写不进去：' + p(dataDir) + '（' + verdict.reason + '）。';
  const code = message.startsWith('不在') || message.startsWith('同名') ? 'DIR_MISSING' : 'DIR_UNWRITABLE';
  return { 'db.dir': { code, message } };
}

export function runConfigKey(key: string, params: Record<string, unknown>): string {
  if (key === CONFIG_KEYS.read) {
    const c = withHumanError(() => loadMemoConfig());
    const resolved: MemoResolvedPaths = withHumanError(() => resolvedMemoPaths());
    const alerts = withHumanError(() => memoAlerts());
    const data: Record<string, unknown> = { path: c.path, dataDir: c.dataDir, created: c.created, values: c.values, resolved };
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
