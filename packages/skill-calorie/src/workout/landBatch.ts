/** 批量落地（HELP 场景 05「健身计划」下一级「落地训练」）：`calorie.workout.land-weekend`／`calorie.workout.land-monthend` 写。
 *
 * 口径（设计件 `t593-设计-训记模块与落地五条.md` §3.2，修掉老两张皮）：
 * - 天数宿主自己算：`weekend`＝今天 → 本周日（含今天，周日即 1 天）；
 *   `monthend`＝今天 → 本月末（含今天，月底即 1 天）。唯一定义地 `batchDates`；
 * - 逐天循环复用 #612 单日链：每天调一次 `calorie.workout.land`（子进程边界，
 *   与 `landRunner.ts` 同形），**不重复实现**四步；
 * - 推送与回写用同一份天数：单日链每天内推当天＋回写当天（同源），**有训练段的天**才跑，
 *   于是推送天数＝回写天数＝范围内有段的天数（#943；旧口径把休息日也数成一"天"，报出 7 天全是假的）；
 * - 失败逐天读数：首个失败天即停（与单日链／`run-sync` 的 fail-fast 一致），
 *   点名第几天＋日期＋原因，非 0 退出。
 *
 * 两态（同一命令，`dryRun` 分流，与单日链同形）：
 * - `dryRun: true` → 过程页（可复制实跑指令先出，**零子进程**，远端未调用；
 *   页上带训记 KEY 有无与 0 段原因，不拿预演页当成功用）；
 * - 缺省 → 结果页（逐天结局 ＋ 推送回写天数 ＋ 本地远端分清）。
 *
 * 挡板缝（#676 已退役）：原先的 `CALORIE_LAND_BATCH_FAIL_DATE` 短路（某天强制失败）与单日四路
 * `CALORIE_LAND_*_STUB` 环境变量读取全部删除（配置文件是唯一真相）。#757 起跨技能两出口删键，
 * 测试不再经配置指 fixture：训记两步走 `xunji.cli` 页外键，跨技能两步走真实兄弟包（家目录注入隔离）。
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DatabaseSync } from 'node:sqlite';
import { todayISO } from '../analysis/utils.js';
import { CALORIE_CONFIG_DEFAULTS, loadCalorieConfig } from '../config.js';
import { dayField, fail } from '../shared/params.js';
import { R, provided } from '../shared/writeParts.js';
import type { WriteOut } from '../shared/commandSpec.js';
import { getPlan } from './planStore.js';
// #943 · 「某天有几段／为什么没得落地」只有一个定义地（`land.ts`），本件引它，不另算一遍。
import { landNoSegmentWhy, landSessionsOf } from './land.js';
import { buildLandBatchProcessPage, buildLandBatchResultPage } from './landBatchPages.js';

export const LAND_WEEKEND_KEY = 'calorie.workout.land-weekend';
export const LAND_MONTH_KEY = 'calorie.workout.land-monthend';
const LAND_WEEKEND_WAKE = '落地到本周末';
const LAND_MONTH_WAKE = '落地到本月底';

/** 批量范围（唯一定义地；`weekend`＝到本周日，`monthend`＝到本月底）。 */
export type LandBatchScope = 'weekend' | 'monthend';

/** 范围人话名（失败点名与页上标题用；唯一定义地）。 */
export const LAND_BATCH_SCOPE_LABEL: Record<LandBatchScope, string> = {
  weekend: '本周末',
  monthend: '本月底',
};

/** 单日链子进程限时**默认值**毫秒（单日实跑可能走远端，与 `xunjiRunner.ts` 同档；超了即 exit 4）。
 *  真值见 `landDayTimeoutMs()`（配置 `land.xunjiSeconds`）。 */
export const LAND_DAY_TIMEOUT_MS = CALORIE_CONFIG_DEFAULTS.land.xunjiSeconds * 1000;

/** 单日链限时毫秒：配置 `land.xunjiSeconds`（<1 的坏值回落默认档）。 */
export function landDayTimeoutMs(): number {
  const seconds = loadCalorieConfig().values.land.xunjiSeconds;
  return (seconds >= 1 ? seconds : CALORIE_CONFIG_DEFAULTS.land.xunjiSeconds) * 1000;
}

/** 单日结局：退出码 ＋ 单日链回执 message ＋ 子进程 stderr 尾行 ＋ 是否走挡板。 */
export interface LandDayCall {
  readonly code: number;
  readonly message: string;
  readonly stderr: string;
  readonly stubbed: boolean;
}

/** 单日执行缝（测试从这里注入假单日；生产缺省＝真子进程调单日链）。 */
export type LandDayRunner = (date: string, step: string) => LandDayCall;

/** 批量里一天的读数（页上逐天表与失败点名都用它）。 */
export interface LandBatchDayRead {
  readonly index: number;
  readonly date: string;
  readonly code: number;
  readonly ok: boolean;
  readonly message: string;
  readonly stubbed: boolean;
  readonly tail: string;
}

/** 整批的汇总（推送／回写天数只数成功的单日：单日链内推当天＋回写当天同源）。 */
export interface LandBatchSummary {
  readonly scope: LandBatchScope;
  readonly anchor: string;
  readonly start: string;
  readonly end: string;
  readonly dates: readonly string[];
  readonly pushDays: number;
  readonly backfillDays: number;
  readonly reads: readonly LandBatchDayRead[];
  readonly failed: LandBatchDayRead | null;
}

/** `YYYY-MM-DD` 加 N 天（纯函数；与 `xunji/run-sync.ts#addDaysISO` 同算式，宿主侧自有，不深引训记件）。 */
function addDaysISO(startISO: string, offset: number): string {
  const [y, m, d] = startISO.split('-').map(Number);
  return new Date(Date.UTC(y as number, (m as number) - 1, d as number) + offset * 86400000)
    .toISOString().slice(0, 10);
}

/** 日期是否真实日历日（`batchDates` 的纯校验；坏即抛，调用方按用法错 exit 2）。 */
function assertRealDate(v: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new Error('日期须为 YYYY-MM-DD（实际：' + v + '）');
  const [y, m, d] = v.split('-').map(Number);
  const dt = new Date(Date.UTC(y as number, (m as number) - 1, d as number));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== (m as number) - 1 || dt.getUTCDate() !== d) {
    throw new Error('日期不是真实日历日（实际：' + v + '）');
  }
}

/** 周一＝1..周日＝7（与 `planPlate.ts#weekOfDate` 同口径，不另起第二份）。 */
function dowMon1(dateISO: string): number {
  return (new Date(dateISO + 'T12:00:00Z').getUTCDay() + 6) % 7 + 1;
}

/** 批量天数表（纯函数；跨月自然跨：周末批可进下月，月末批在本月内收敛）。 */
export function batchDates(anchorISO: string, scope: LandBatchScope): string[] {
  assertRealDate(anchorISO);
  if (scope === 'weekend') {
    const n = 8 - dowMon1(anchorISO);
    return Array.from({ length: n }, (_, i) => addDaysISO(anchorISO, i));
  }
  const [y, m, d] = anchorISO.split('-').map(Number);
  const last = new Date(Date.UTC(y as number, m as number, 0)).getUTCDate();
  const n = last - (d as number) + 1;
  return Array.from({ length: n }, (_, i) => addDaysISO(anchorISO, i));
}

/** 单日链 CLI 入口（编译产物；不存在＝环境没建好，先拦，不起子进程）。 */
function landCliPath(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const cli = join(here, '..', 'cli', 'cmd_read.js');
  if (!existsSync(cli)) fail(4, '命令出口不在（' + cli + '）：先跑对应包的构建再调本命令');
  return cli as string;
}

/** stderr 尾行（失败点名用；截 300 字，空即 ''，与 `landRunner.ts` 同形）。 */
function stderrTail(r: { stderr?: unknown }): string {
  const lines = String(r.stderr ?? '').split('\n').map((l) => l.trim()).filter((l) => l !== '');
  const last = lines.length === 0 ? '' : (lines[lines.length - 1] as string);
  return last.slice(0, 300);
}

/** 调一次单日链（`calorie.workout.land --params {"date"}`）。
 *  `spawnSync` 不给 `env`：缺省即继承父进程环境。 */
export function invokeLandDay(date: string, step: string): LandDayCall {
  const timeoutMs = landDayTimeoutMs();
  const r = spawnSync(process.execPath, [landCliPath(), 'calorie.workout.land', '--params', JSON.stringify({ date })], {
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
  let message = '';
  const text = String(r.stdout ?? '').trim();
  if (text !== '') {
    try {
      const env = JSON.parse(text) as { data?: { message?: unknown } };
      if (typeof env?.data?.message === 'string') message = env.data.message;
    } catch {
      /* 单日链成功与否只看退出码；message 读不出即空（页上按日期结局摆，不猜） */
    }
  }
  return { code, message, stderr: tail, stubbed: false };
}

/** 跑整批（fail-fast：首个失败天即停；成功天才计入推送／回写天数；本函数不 `fail`，调用方按 `failed` 点名）。 */
export function runLandBatchDays(
  dates: readonly string[],
  runDay: LandDayRunner = invokeLandDay,
): { dates: readonly string[]; pushDays: number; backfillDays: number; reads: LandBatchDayRead[]; failed: LandBatchDayRead | null } {
  const reads: LandBatchDayRead[] = [];
  let failed: LandBatchDayRead | null = null;
  let pushDays = 0;
  let backfillDays = 0;
  for (let i = 0; i < dates.length; i++) {
    const date = dates[i] as string;
    const call = runDay(date, '落地第 ' + (i + 1) + ' 天');
    const read: LandBatchDayRead = {
      index: i + 1, date, code: call.code, ok: call.code === 0,
      message: call.message, stubbed: call.stubbed, tail: call.stderr,
    };
    reads.push(read);
    if (!read.ok) {
      failed = read;
      break;
    }
    pushDays += 1;
    backfillDays += 1;
  }
  return { dates, pushDays, backfillDays, reads, failed };
}

/** `dryRun` 参数：缺省 false；非布尔即用法错（exit 2，不调外部，与单日链同形）。 */
function readDryRun(params: Record<string, unknown>): boolean {
  const v = params['dryRun'];
  if (v === undefined || v === null) return false;
  if (typeof v !== 'boolean') fail(2, '参数 dryRun 须为布尔值');
  return v as boolean;
}

function failBatch(wake: string, read: LandBatchDayRead): never {
  const code = read.code === 2 ? 2 : read.code === 3 ? 3 : 4;
  const why = read.tail !== '' ? read.tail : read.message !== '' ? read.message : '单日链没过';
  fail(code, '批量' + wake + '失败在第 ' + read.index + ' 天 ' + read.date + '：' + why);
}

/** 批量宿主编排（两条写命令共用；`scope` 定天数口径与文案，页装配走 `landBatchPages.ts`）。
 *
 *  #943 · 无段即缺失阻断：整段范围里一天都没排训练段 ⇒ `fail(4, …)` 点名，不落页、不调任何外部。
 *  范围里**有段的天才跑**单日链（休息日跳过）：旧口径把空天也当成功的一"天"，
 *  于是 7 天里只有 1 天有训练段也报「推送 7 天 回写 7 天」——那次成功是假的。 */
function writeLandBatch(
  params: Record<string, unknown>, db: DatabaseSync, scope: LandBatchScope, key: string, wake: string,
): WriteOut {
  const anchor = dayField(params, 'date') ?? todayISO();
  const dryRun = readDryRun(params);
  let dates: string[];
  try {
    dates = batchDates(anchor, scope);
  } catch (e) {
    fail(2, e instanceof Error ? e.message : String(e));
  }
  const scopeLabel = LAND_BATCH_SCOPE_LABEL[scope];
  const plan = getPlan(db);
  const perDay = dates.map((date) => ({ date, sessions: landSessionsOf(plan, date) }));
  const segs = perDay.reduce((n, d) => n + d.sessions.length, 0);
  const runDays = perDay.filter((d) => d.sessions.length > 0).map((d) => d.date);
  const first = dates[0] as string;
  const last = dates[dates.length - 1] as string;
  if (segs === 0) {
    // 范围级判据走 `landNoSegmentWhy` 同一份：（含第一天的诊断），别处不许再算一遍。
    fail(4, '落地到' + scopeLabel + '没有可落地的训练段：' + first + ' 至 ' + last + ' 共 ' + dates.length
      + ' 天里一天都没排训练段。' + (landNoSegmentWhy(plan, first) ?? '先看完整计划核对哪里排了训练'));
  }
  if (dryRun) {
    const message = '预演：' + anchor + ' 至' + scopeLabel + ' ' + dates.length + ' 天 ' + segs + ' 段待落地（远端未调用）';
    const receipt = R(wake, 'create', message, wake, '训练计划（workout_plans）＋ 批量预演', {
      recordId: null, ids: [], idSource: 'condition', writtenFields: provided(params, ['date', 'dryRun']),
      items: [{ status: '成功', reason: '', detail: message }],
    });
    return {
      data: { ok: true, message, receipt },
      html: buildLandBatchProcessPage({
        key, params, wake, scopeLabel, anchor, dates, perDay, receipt,
        planStart: plan.config?.start_date ?? null,
      }),
    };
  }
  const summary: LandBatchSummary = {
    scope, anchor, start: first, end: last,
    ...runLandBatchDays(runDays),
  };
  if (summary.failed !== null) failBatch(wake, summary.failed);
  const skipped = dates.length - runDays.length;
  const message = '已批量' + wake + ' ' + first + ' 至 ' + last + '：共 ' + dates.length + ' 天里 '
    + runDays.length + ' 天有训练段' + (skipped === 0 ? '' : '（' + skipped + ' 天空天跳过）')
    + ' 推送 ' + summary.pushDays + ' 天 回写 ' + summary.backfillDays + ' 天';
  const receipt = R(wake, 'create', message, wake, '训练计划（workout_plans）＋ 批量读数', {
    recordId: null, ids: [], idSource: 'condition', writtenFields: provided(params, ['date', 'dryRun']),
    items: [{ status: '成功', reason: '', detail: message }],
  });
  return {
    data: { ok: true, message, receipt },
    html: buildLandBatchResultPage({
      key, params, wake, scopeLabel, summary, message, receipt,
      stubbed: summary.reads.some((r) => r.stubbed),
    }),
  };
}

/** `calorie.workout.land-weekend` · 落地到本周末（今天 → 本周日逐天复用单日链）。 */
export function writeLandWeekend(params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  return writeLandBatch(params, db, 'weekend', LAND_WEEKEND_KEY, LAND_WEEKEND_WAKE);
}

/** `calorie.workout.land-monthend` · 落地到本月底（今天 → 本月末逐天复用单日链）。 */
export function writeLandMonthend(params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  return writeLandBatch(params, db, 'monthend', LAND_MONTH_KEY, LAND_MONTH_WAKE);
}
