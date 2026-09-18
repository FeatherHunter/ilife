/** 落地训练的跨技能跑道（HELP 场景 05「健身计划」下一级「落地训练」· 宿主独用）。
 *
 * 为什么是子进程：宿主命令处理函数是同步的（`run(params, db)` 直接回 `WriteOut`），而作息
 * `schedule.plan.write`／备忘 `memo.create` 是别的技能的统一出口（命令行边界，裁定件
 * `t593-A-跨技能调用-裁定.md` 一 · 主接缝）。本跑道用一次性的 `spawnSync` 把跨技能调用隔离进
 * 子进程（对方包内 `dist/cli/cmd_read.js`，与 `xunjiRunner.ts` 同形），父进程只做：存在性预检
 * → 限时调用 → 退出码直传 → 按码失败（`fail` 直接退，不落成功页）。
 *
 * 跨技能只经对方合成写命令调用（本票禁区）：作息 `schedule.plan.write op=ensure dates[]`（批量），
 * 备忘 `memo.create category=心愿 due`（逐段）。**不直引对方库，不碰对方包**（作息／备忘包不改）。
 * 训记两步复用 `./xunjiRunner.js`（`#614` 薄命令同跑道，不另起第二条训记跑道）。
 *
 * #676 · 两个出口与限时的取值改成读配置（配置文件是唯一真相）：
 *   - 出口：`land.scheduleCli`／`land.memoCli` 非空即用它（用户指到别的装机布局）；空串＝按包布局算；
 *   - 限时：`land.landSeconds`（毫秒换算在本件做），空／坏值回落默认档；
 *   - 挡板缝（原先四个 `CALORIE_LAND_*_STUB` 环境变量）**已退役**：读取删除，`stubbed` 恒 false。
 *     测试要挡板就把上面两个出口指到一个 fixture 脚本，让它吐出原来挡板吐的那份回执。
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CALORIE_CONFIG_DEFAULTS, loadCalorieConfig } from '../config.js';
import { fail } from '../shared/params.js';
import { invokeXunji, xunjiExitToCmd } from './xunjiRunner.js';
import type { XunjiCall } from './xunjiRunner.js';

export { xunjiExitToCmd };
export type { XunjiCall };

/** 子进程限时**默认值**毫秒（跨技能是本地库＋可选远端对齐；60 秒收敛，超了即 exit 4）。
 *  真值见 `landSpawnTimeoutMs()`（配置 `land.landSeconds`）。 */
export const LAND_SPAWN_TIMEOUT_MS = CALORIE_CONFIG_DEFAULTS.land.landSeconds * 1000;

/** 跨技能限时毫秒：配置 `land.landSeconds`（<1 的坏值回落默认档）。 */
export function landSpawnTimeoutMs(): number {
  const seconds = loadCalorieConfig().values.land.landSeconds;
  return (seconds >= 1 ? seconds : CALORIE_CONFIG_DEFAULTS.land.landSeconds) * 1000;
}

/** 一次跨技能调用的结局：退出码 ＋ 对方回执 data ＋ 子进程 stderr 尾行 ＋ 是否走挡板（挡板退役后恒 false）。 */
export interface LandCall {
  readonly code: number;
  readonly data: unknown;
  readonly stderr: string;
  readonly stubbed: boolean;
}

/** 跨技能出口的取值：配置里给了就用它（存在性先拦），没给按包布局算。
 *
 *  「谁在取」这一处是**唯一**的取值点：两个出口（作息／备忘）与测试的 fixture 都走它，
 *  于是「出口在哪」只有一个定义地，配置项也只有一处读法。 */
function crossSkillCliPath(configured: string, relative: readonly string[], label: string): string {
  const cli = configured !== '' ? configured : join(dirname(fileURLToPath(import.meta.url)), ...relative);
  if (!existsSync(cli)) {
    fail(4, label + '出口不在（' + cli + '）：先跑对应包的构建再调本命令；'
      + '若装机布局不同，请在卡路里设置页里把这条出口指到真实路径');
  }
  return cli;
}

/** 作息统一出口（编译产物；缺配置即按包布局算，两条路都要存在）。 */
export function scheduleCliPath(): string {
  return crossSkillCliPath(
    loadCalorieConfig().values.land.scheduleCli,
    ['..', '..', '..', 'skill-schedule', 'dist', 'cli', 'cmd_read.js'],
    '作息',
  );
}

/** 备忘统一出口（同上）。 */
export function memoCliPath(): string {
  return crossSkillCliPath(
    loadCalorieConfig().values.land.memoCli,
    ['..', '..', '..', 'skill-memo-ilife', 'dist', 'cli', 'cmd_read.js'],
    '备忘',
  );
}

/** stderr 尾行（失败点名用；截 300 字，空即 ''）。 */
function stderrTail(r: { stderr?: unknown }): string {
  const lines = String(r.stderr ?? '').split('\n').map((l) => l.trim()).filter((l) => l !== '');
  const last = lines.length === 0 ? '' : (lines[lines.length - 1] as string);
  return last.slice(0, 300);
}

/** 对方 envelope 的 data 位（`{..., data: 回执}`；坏即 exit 4，不许当成功跑）。 */
function envelopeData(text: string, step: string, key: string): unknown {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    fail(4, step + '回执解析失败（' + key + ' 的 stdout 不是 JSON）：' + (e instanceof Error ? e.message : String(e)));
  }
  const o = parsed as { data?: unknown } | null;
  if (typeof o !== 'object' || o === null || typeof (o as { data?: unknown }).data !== 'object') {
    fail(4, step + '回执解析失败（' + key + ' 的 stdout 缺 data 位）');
  }
  return (o as { data: unknown }).data;
}

/** 调一次跨技能子命令（argv 首位即对方 key，如 `schedule.plan.write`）。
 *  `spawnSync` 不给 `env`：缺省即继承父进程环境，与原来的逐字透传行为一致。 */
function invokeOther(cli: string, key: string, params: Record<string, unknown>, step: string): LandCall {
  const timeoutMs = landSpawnTimeoutMs();
  const r = spawnSync(process.execPath, [cli, key, '--params', JSON.stringify(params)], {
    encoding: 'utf8',
    timeout: timeoutMs,
  });
  const err = (r as { error?: unknown }).error;
  if (err !== undefined && err !== null) {
    const msg = err instanceof Error ? err.message : String(err);
    fail(4, step + '调起失败（含超时 ' + Math.round(timeoutMs / 1000) + ' 秒）：' + msg);
  }
  const code = typeof r.status === 'number' ? r.status : 1;
  const tail = stderrTail(r);
  const text = String(r.stdout ?? '').trim();
  if (text === '') {
    if (code === 0) fail(4, step + '回执解析失败（' + key + ' 退 0 但 stdout 为空）');
    return { code, data: null, stderr: tail, stubbed: false };
  }
  let data: unknown = null;
  try {
    data = envelopeData(text, step, key);
  } catch (e) {
    if (code === 0) throw e;
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
    const inner = (data as { data?: unknown } | null);
    if (typeof inner === 'object' && inner !== null && 'data' in inner) data = inner.data;
  }
  return { code, data, stderr: tail, stubbed: false };
}

/** 作息合成写批量（`schedule.plan.write op=ensure dates[]`；逐天复用单天合成写是对方的事）。 */
export function invokeSchedule(
  items: readonly { date: string; time_start: string; time_end: string; title: string; notes?: string }[],
  step: string,
): LandCall {
  const cli = scheduleCliPath();
  return invokeOther(cli, 'schedule.plan.write', { op: 'ensure', dates: items }, step);
}

/** 备忘合成写单条（`memo.create category=心愿 due`；本地判重＋远端一次成是对方的事）。 */
export function invokeMemo(
  input: { title: string; body: string; category: string; due: string | null },
  step: string,
): LandCall {
  const cli = memoCliPath();
  return invokeOther(cli, 'memo.create', { ...input }, step);
}

/** 训记推送（复用 `xunjiRunner` 同跑道，不另起第二条）。 */
export function invokeLandPush(date: string, step: string): XunjiCall {
  return invokeXunji(['push-plan', '--date', date], step);
}

/** 训记回写（同上；单日 `days=1`，与落地天数同源，修掉老 `--days` 与 `--backfill-days` 两张皮）。 */
export function invokeLandBackfill(end: string, step: string): XunjiCall {
  return invokeXunji(['backfill', '--date', end, '--days', '1'], step);
}
