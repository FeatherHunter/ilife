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
 * 挡板缝（禁真网真 KEY，测试与墙产物用）：四个环境变量为非空时不 spawn，生产调用方永远不设它们。
 * 值一律 JSON（`{code, data}`），原样走码直传与页组装。口径先例同 `XUNJI_STUB_ENV`。
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fail } from '../shared/params.js';
import { invokeXunji, xunjiExitToCmd } from './xunjiRunner.js';
import type { XunjiCall } from './xunjiRunner.js';

export { xunjiExitToCmd };
export type { XunjiCall };

/** 子进程限时毫秒（跨技能是本地库＋可选远端对齐；60 秒收敛，超了即 exit 4）。 */
export const LAND_SPAWN_TIMEOUT_MS = 60000;

/** 挡板缝的环境变量名（唯一定义地；调用方与测试只认这一处）。 */
export const LAND_SCHEDULE_STUB_ENV = 'CALORIE_LAND_SCHEDULE_STUB';
export const LAND_MEMO_STUB_ENV = 'CALORIE_LAND_MEMO_STUB';
export const LAND_PUSH_STUB_ENV = 'CALORIE_LAND_PUSH_STUB';
export const LAND_BACKFILL_STUB_ENV = 'CALORIE_LAND_BACKFILL_STUB';

/** 一次跨技能调用的结局：退出码 ＋ 对方回执 data ＋ 子进程 stderr 尾行 ＋ 是否走挡板。 */
export interface LandCall {
  readonly code: number;
  readonly data: unknown;
  readonly stderr: string;
  readonly stubbed: boolean;
}

/** 作息统一出口（编译产物；不存在＝环境没建好，先拦，不起子进程）。 */
export function scheduleCliPath(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const cli = join(here, '..', '..', '..', 'skill-schedule', 'dist', 'cli', 'cmd_read.js');
  if (!existsSync(cli)) fail(4, '作息出口不在（' + cli + '）：先跑对应包的构建再调本命令');
  return cli as string;
}

/** 备忘统一出口（同上）。 */
export function memoCliPath(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const cli = join(here, '..', '..', '..', 'skill-memo-ilife', 'dist', 'cli', 'cmd_read.js');
  if (!existsSync(cli)) fail(4, '备忘出口不在（' + cli + '）：先跑对应包的构建再调本命令');
  return cli as string;
}

/** 挡板 JSON 的形状守卫：`{code: number, data?: unknown}`，坏了即 exit 4。 */
function stubOf(raw: string, step: string, envName: string): LandCall {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    fail(4, step + '挡板数据不是合法 JSON（' + envName + '）：' + (e instanceof Error ? e.message : String(e)));
  }
  const o = parsed as { code?: unknown; data?: unknown };
  if (typeof o !== 'object' || o === null || typeof o.code !== 'number' || !Number.isInteger(o.code)) {
    fail(4, step + '挡板数据形状不对（要 {code: 整数, data?: 任意}）：' + raw.slice(0, 120));
  }
  return { code: o.code as number, data: (o as { data?: unknown }).data ?? null, stderr: '', stubbed: true };
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

/** 调一次跨技能子命令（argv 首位即对方 key，如 `schedule.plan.write`）。 */
function invokeOther(cli: string, key: string, params: Record<string, unknown>, step: string): LandCall {
  const r = spawnSync(process.execPath, [cli, key, '--params', JSON.stringify(params)], {
    encoding: 'utf8',
    timeout: LAND_SPAWN_TIMEOUT_MS,
    env: process.env,
  });
  const err = (r as { error?: unknown }).error;
  if (err !== undefined && err !== null) {
    const msg = err instanceof Error ? err.message : String(err);
    fail(4, step + '调起失败（含超时 ' + Math.round(LAND_SPAWN_TIMEOUT_MS / 1000) + ' 秒）：' + msg);
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
  const stubRaw = process.env[LAND_SCHEDULE_STUB_ENV];
  if (stubRaw !== undefined && stubRaw !== '') return stubOf(stubRaw, step, LAND_SCHEDULE_STUB_ENV);
  const cli = scheduleCliPath();
  return invokeOther(cli, 'schedule.plan.write', { op: 'ensure', dates: items }, step);
}

/** 备忘合成写单条（`memo.create category=心愿 due`；本地判重＋远端一次成是对方的事）。 */
export function invokeMemo(
  input: { title: string; body: string; category: string; due: string | null },
  step: string,
): LandCall {
  const stubRaw = process.env[LAND_MEMO_STUB_ENV];
  if (stubRaw !== undefined && stubRaw !== '') return stubOf(stubRaw, step, LAND_MEMO_STUB_ENV);
  const cli = memoCliPath();
  return invokeOther(cli, 'memo.create', { ...input }, step);
}

/** 训记推送（挡板优先走本票缝，否则复用 `xunjiRunner` 同跑道，不另起第二条）。 */
export function invokeLandPush(date: string, step: string): XunjiCall {
  const stubRaw = process.env[LAND_PUSH_STUB_ENV];
  if (stubRaw !== undefined && stubRaw !== '') {
    const c = stubOf(stubRaw, step, LAND_PUSH_STUB_ENV);
    return { code: c.code, data: c.data, stderr: c.stderr, stubbed: true };
  }
  return invokeXunji(['push-plan', '--date', date], step);
}

/** 训记回写（同上；单日 `days=1`，与落地天数同源，修掉老 `--days` 与 `--backfill-days` 两张皮）。 */
export function invokeLandBackfill(end: string, step: string): XunjiCall {
  const stubRaw = process.env[LAND_BACKFILL_STUB_ENV];
  if (stubRaw !== undefined && stubRaw !== '') {
    const c = stubOf(stubRaw, step, LAND_BACKFILL_STUB_ENV);
    return { code: c.code, data: c.data, stderr: c.stderr, stubbed: true };
  }
  return invokeXunji(['backfill', '--date', end, '--days', '1'], step);
}
