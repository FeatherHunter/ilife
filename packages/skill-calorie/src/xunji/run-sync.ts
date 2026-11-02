/** 一条链跑完：补计划 → 记心愿 → 推送 → 回写（老 `sync_plan.py` 四步 ＋ `run_sync.py`，代码新写）。
 *
 * 口径（逐条对老）：
 * - 四步顺序固定（老 `sync_plan.py:329-332`）：补计划（飞书日历）→ 记心愿（飞书 task）→
 *   推送（串行 N 天 `push-plan`，45 秒限频）→ 回写（一次 `backfill --days N`）；
 * - 天数缺省 3、起始偏移缺省 0（今天）、`dry-run` 只建状态文件不实际跑（老 `run_sync.py:168-175`）；
 * - 状态文件与老同件名同写法（`<状态目录>/xunji_bridge_sync_state.json`，目录＝配置 `xunji.stateDir`，
 *   空串＝默认落点 `<数据目录>/xunji`；原子写，供外部轮询；老 `run_sync.py:32／52-58`）；
 * - 推送逐天记结果、回写记汇总（老 `:184-190／:221-225` 的摘要形状）。
 *
 * 修掉的老缺陷（不照抄）：老 `run_sync.py` 只在超时／抛错时判失败，子进程的 rc
 * （如推送 `fail_count > 0` 退 3）只记进 `results[].rc`、不进最终状态——推送全失败
 * 也可能 `status: completed` 退 0（`__main__:157-160` 只看 `status == "failed"`）。
 * 新仓任一步失败即停：状态 `failed` ＋ `failed_step` 点名哪一步（`推送 YYYY-MM-DD`／
 * `回写`／`补计划`／`记心愿`）＋ 非 0 退出（码复用 `exitMap`：无 KEY→2，其余→3，用法错→1）。
 *
 * 跨技能两步（补计划／记心愿）缺省跳过：作息管家／备忘录不在本仓，默认实现只记
 * `skipped` 不算失败；#614 接线后由调用方注入真实现（见证据件过渡债务 R3）。
 */

import { dirname, join } from 'node:path';
import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { backfillRange, todayLocalISO } from './backfill.js';
import type { BackfillDeps } from './backfill.js';
import { xunjiStateDir } from './rateLimit.js';
import { pushDayPlan } from './push.js';
import type { PushDayDeps, PushDaySummary } from './push.js';
import { resolveDayPlan } from './planSource.js';
import type { DayPlanSource } from './planSource.js';
import { exitForFailure } from './exitMap.js';
import { XUNJI_EXIT_CODES } from './subcommands.js';
import type { XunjiSubcommand } from './subcommands.js';
import type { XunjiRun } from './run.js';
import { m } from '../entries/index.js';
import { currentRenderLanguage, listJoin } from 'base-entries';

/** 四步的代号（顺序固定：plan → wish → push → backfill）。 */
export type RunSyncPhase = 'plan' | 'wish' | 'push' | 'backfill';

/** 四步的人话名（失败点名用这四个词，`key.ts` 的 `does` 同词）。
 *  取值在**调用时**才发生（模块级常量不得在顶层取词：语言由运行期上下文决定）。 */
export function phaseLabel(phase: RunSyncPhase): string {
  const id = {
    plan: 'skill-calorie.xunji-runSync.c001',
    wish: 'skill-calorie.xunji-runSync.c002',
    push: 'skill-calorie.xunji-runSync.c003',
    backfill: 'skill-calorie.xunji-runSync.c004',
  } as const;
  return m(id[phase]);
}

/** 一步的成功（含 `skipped`：没跑但不算失败，如缺省的补计划／记心愿）。 */
export interface RunSyncStepOk {
  readonly ok: true;
  readonly skipped?: boolean;
  readonly note?: string;
  readonly detail?: unknown;
}

/** 一步的失败（`code` 取值复用 `XUNJI_EXIT_CODES` 的 1／2／3，不另造码表）。 */
export interface RunSyncStepFail {
  readonly ok: false;
  readonly code: 1 | 2 | 3;
  readonly error: string;
  readonly detail?: unknown;
}

/** 一步的结局（ok 即过；`skipped` 的 ok 也是 true，不触发失败停链）。 */
export type RunSyncStepResult = RunSyncStepOk | RunSyncStepFail;

/** `runSync` 的注入缝（四步皆可换；缺省＝推送／回写真跑，补计划／记心愿跳过）。 */
export interface RunSyncDeps {
  /** 今天（`YYYY-MM-DD`；缺省本地今天；测试钉住它）。 */
  readonly todayISO?: string;
  /** 补计划（缺省跳过：作息管家不在本仓，#614 接线）。 */
  readonly plan?: (dates: readonly string[]) => Promise<RunSyncStepResult>;
  /** 记心愿（缺省跳过：备忘录不在本仓，#614 接线）。 */
  readonly wish?: (dates: readonly string[]) => Promise<RunSyncStepResult>;
  /** 推一天（缺省读本仓计划＋`pushDayPlan` 真推）。 */
  readonly pushDay?: (dateStr: string) => Promise<RunSyncStepResult>;
  /** 回写（缺省 `backfillRange` 真写）。 */
  readonly backfill?: (endISO: string, days: number) => Promise<RunSyncStepResult>;
  /** 缺省推一天的取数口（读卡路里库，只读）。 */
  readonly planSource?: DayPlanSource;
  /** 缺省推一天的透传件（upsert／限频；测试挡板从这里进）。 */
  readonly pushDeps?: PushDayDeps;
  /** 缺省回写的透传件（拉取／开库；测试挡板从这里进）。 */
  readonly backfillDeps?: BackfillDeps;
  /** 状态文件（缺省老路径；传 null 即不写，测试用 tmp）。 */
  readonly statePath?: string | null;
}

/** 链里一步的记录（`date` 只推送那步有；`code` 只失败有）。 */
export interface RunSyncPhaseEntry {
  readonly phase: RunSyncPhase;
  readonly label: string;
  readonly ok: boolean;
  readonly skipped?: boolean;
  readonly date?: string;
  readonly note?: string;
  readonly error?: string;
  readonly code?: 1 | 2 | 3;
  readonly detail?: unknown;
}

/** 整条链的最终状态（老 `run_sync` 状态文件同键 ＋ 点名 `failed_step`／`failed_code`）。 */
export interface RunSyncState {
  readonly status: 'running' | 'completed' | 'failed';
  readonly started_at: string;
  readonly finished_at: string | null;
  readonly total_days: number;
  readonly current_day: number;
  readonly phase: RunSyncPhase | null;
  readonly results: readonly RunSyncPhaseEntry[];
  readonly error_summary: string | null;
  readonly failed_step: string | null;
  readonly failed_code: 1 | 2 | 3 | null;
}

/** 缺省状态文件（老 `run_sync.py:32` 同件名；目录＝`xunjiStateDir()`，外部轮询读它）。 */
export function defaultRunSyncStatePath(): string {
  return join(xunjiStateDir(), 'xunji_bridge_sync_state.json');
}

function nowISO(): string {
  return new Date().toISOString();
}

/** `YYYY-MM-DD` 加 N 天（调用方保证形状；纯函数）。 */
export function addDaysISO(startISO: string, offset: number): string {
  const [y, m, d] = startISO.split('-').map(Number);
  return new Date(Date.UTC(y as number, (m as number) - 1, d as number) + offset * 86400000).toISOString().slice(0, 10);
}

function writeState(statePath: string | null, state: RunSyncState): void {
  if (statePath === null) return;
  try {
    mkdirSync(dirname(statePath), { recursive: true });
    const tmp = statePath + '.tmp';
    writeFileSync(tmp, JSON.stringify(state, null, 2), 'utf8');
    renameSync(tmp, statePath);
  } catch {
    /* 状态写坏不许堵死同步（坏文件当无历史；`fetch.ts` 限频落盘同口径） */
  }
}

/** 推送汇总里第一个失败定码：本地缺 KEY（无 HTTP）→2，其余→3（`exitMap` 同口径）。 */
function codeOfPushSummary(summary: PushDaySummary): 2 | 3 {
  let sawAuthMissing = false;
  for (const r of summary.results) {
    if (r.ok) continue;
    const resp = (typeof r.resp === 'object' && r.resp !== null ? r.resp : {}) as Record<string, unknown>;
    if (resp.err === true && resp.error_type === 'auth' && (resp.code === null || resp.code === undefined)) {
      sawAuthMissing = true;
      continue;
    }
    return XUNJI_EXIT_CODES.api;
  }
  return sawAuthMissing ? XUNJI_EXIT_CODES.auth : XUNJI_EXIT_CODES.api;
}

/** 缺省推一天：读本仓计划 → `pushDayPlan`（无计划即失败，不静默跳过）。 */
async function defaultPushDay(dateStr: string, deps: RunSyncDeps): Promise<RunSyncStepResult> {
  const day = (deps.planSource ?? resolveDayPlan)(dateStr);
  if (!day.found) return { ok: false, code: XUNJI_EXIT_CODES.error, error: m('skill-calorie.xunji-run-sync.c001', { p0: String(dateStr), p1: String(day.reason) }) };
  const summary = await pushDayPlan(dateStr, day.sessions, deps.pushDeps ?? {});
  if (summary.fail_count > 0) {
    return {
      ok: false, code: codeOfPushSummary(summary),
      error: m('skill-calorie.xunji-run-sync.c002', {
        p0: String(dateStr),
        p1: String(summary.fail_count),
        p2: String(summary.session_count),
      }),
      detail: summary,
    };
  }
  return { ok: true, detail: summary };
}

/** 缺省回写：`backfillRange`（失败分“没拉到”走 2／3、“拉到了没写进”走 3，`run.ts` 同词）。 */
async function defaultBackfill(endISO: string, days: number, deps: RunSyncDeps): Promise<RunSyncStepResult> {
  const result = await backfillRange(endISO, days, deps.backfillDeps ?? {});
  for (const r of result.results) {
    if (r.fetch_ok === false && r.failure !== null) {
      const code = exitForFailure(r.failure);
      return { ok: false, code: code === 2 ? 2 : 3, error: m('skill-calorie.xunji-run-sync.c003', { p0: String(r.date), p1: String(r.failure.message) }), detail: result };
    }
  }
  for (const r of result.results) {
    if (r.err !== null) {
      return { ok: false, code: XUNJI_EXIT_CODES.api, error: m('skill-calorie.xunji-run-sync.c004', { p0: String(r.date), p1: String(r.err) }), detail: result };
    }
  }
  return { ok: true, detail: result };
}

/** 缺省跳过（补计划／记心愿）：外部技能不在本仓，记 `skipped` 不算失败（#614 接线后换真实现）。 */
function skippedStep(note: string): Promise<RunSyncStepResult> {
  return Promise.resolve({ ok: true, skipped: true, note });
}

/** 跑整条链（`days`／`startOffset` 由分派层校验；任一步失败即停并点名）。 */
export async function runSync(opts: { readonly days?: number; readonly startOffset?: number; readonly dryRun?: boolean; readonly deps?: RunSyncDeps }): Promise<RunSyncState> {
  const days = opts.days ?? 3;
  const startOffset = opts.startOffset ?? 0;
  if (!Number.isInteger(days) || days < 1) throw new Error('days 须为 ≥1 整数（实际：' + String(days) + '）');
  if (!Number.isInteger(startOffset)) throw new Error('startOffset 须为整数（实际：' + String(startOffset) + '）');
  const deps = opts.deps ?? {};
  const statePath = deps.statePath === undefined ? defaultRunSyncStatePath() : deps.statePath;
  const today = deps.todayISO ?? todayLocalISO();
  const dates = Array.from({ length: days }, (_, i) => addDaysISO(today, startOffset + i));
  const startedAt = nowISO();
  const write = (s: RunSyncState): void => writeState(statePath, s);
  const running: RunSyncState = {
    status: 'running', started_at: startedAt, finished_at: null,
    total_days: days, current_day: 0, phase: null, results: [], error_summary: null, failed_step: null, failed_code: null,
  };
  write(running);
  if (opts.dryRun === true) {
    const done: RunSyncState = {
      ...running, status: 'completed', finished_at: nowISO(), phase: 'push',
      error_summary: m('skill-calorie.xunji-run-sync.c005'),
    };
    write(done);
    return done;
  }
  const results: RunSyncPhaseEntry[] = [];
  const fail = (entry: RunSyncPhaseEntry, failedStep: string, code: 1 | 2 | 3, error: string): RunSyncState => {
    const done: RunSyncState = {
      status: 'failed', started_at: startedAt, finished_at: nowISO(),
      total_days: days, current_day: entry.phase === 'push' ? results.filter((e) => e.phase === 'push').length : days,
      phase: entry.phase, results: [...results, entry], error_summary: error, failed_step: failedStep, failed_code: code,
    };
    write(done);
    return done;
  };
  const plan = await (deps.plan ?? ((ds) => skippedStep(m('skill-calorie.xunji-run-sync.c006', { p0: String(ds.length) }))))(dates);
  results.push({
    phase: 'plan', label: phaseLabel('plan'), ok: plan.ok,
    skipped: plan.ok ? plan.skipped === true : undefined, note: plan.ok ? plan.note : undefined,
    error: plan.ok ? undefined : plan.error, code: plan.ok ? undefined : plan.code, detail: plan.detail,
  });
  if (!plan.ok) return fail(results[results.length - 1] as RunSyncPhaseEntry, phaseLabel('plan'), plan.code, plan.error);
  const wish = await (deps.wish ?? ((ds) => skippedStep(m('skill-calorie.xunji-run-sync.c007', { p0: String(ds.length) }))))(dates);
  results.push({
    phase: 'wish', label: phaseLabel('wish'), ok: wish.ok,
    skipped: wish.ok ? wish.skipped === true : undefined, note: wish.ok ? wish.note : undefined,
    error: wish.ok ? undefined : wish.error, code: wish.ok ? undefined : wish.code, detail: wish.detail,
  });
  if (!wish.ok) return fail(results[results.length - 1] as RunSyncPhaseEntry, phaseLabel('wish'), wish.code, wish.error);
  const pushDay = deps.pushDay ?? ((d) => defaultPushDay(d, deps));
  for (const dateStr of dates) {
    const step = await pushDay(dateStr);
    const entry: RunSyncPhaseEntry = {
      phase: 'push', label: phaseLabel('push'), ok: step.ok, date: dateStr,
      note: step.ok ? step.note : undefined,
      error: step.ok ? undefined : step.error, code: step.ok ? undefined : step.code, detail: step.detail,
    };
    results.push(entry);
    if (!step.ok) return fail(entry, phaseLabel('push') + ' ' + dateStr, step.code, step.error);
  }
  const endISO = dates[dates.length - 1] as string;
  const bf = await (deps.backfill ?? ((end, n) => defaultBackfill(end, n, deps)))(endISO, days);
  const bfEntry: RunSyncPhaseEntry = {
    phase: 'backfill', label: phaseLabel('backfill'), ok: bf.ok,
    note: bf.ok ? bf.note : undefined,
    error: bf.ok ? undefined : bf.error, code: bf.ok ? undefined : bf.code, detail: bf.detail,
  };
  results.push(bfEntry);
  if (!bf.ok) return fail(bfEntry, phaseLabel('backfill'), bf.code, bf.error);
  const done: RunSyncState = {
    status: 'completed', started_at: startedAt, finished_at: nowISO(),
    total_days: days, current_day: days, phase: null, results, error_summary: null, failed_step: null, failed_code: null,
  };
  write(done);
  return done;
}

type Values = Readonly<Record<string, string | boolean | readonly string[]>>;

/** `run-sync` 子命令的分派（`run.ts` 调；失败即非 0 并点名哪一步）。 */
export async function runRunSyncCommand(sub: XunjiSubcommand, values: Values, deps: RunSyncDeps = {}): Promise<XunjiRun> {
  const refuse = (why: string, data: unknown): XunjiRun => ({
    subcommand: 'run-sync', code: XUNJI_EXIT_CODES.error, message: why, data, stderr: m('skill-calorie.xunji-run-sync.c008', { p0: String(why), p1: String(sub.usage) }),
  });
  let days = 3;
  if (values['--days'] !== undefined) {
    const n = Number(values['--days']);
    if (!Number.isInteger(n) || n < 1) return refuse(m('skill-calorie.xunji-run-sync.c009', { p0: String(String(values['--days'])) }), { usage: sub.usage });
    days = n;
  }
  let startOffset = 0;
  if (values['--start-offset'] !== undefined) {
    const n = Number(values['--start-offset']);
    if (!Number.isInteger(n)) return refuse(m('skill-calorie.xunji-run-sync.c010', { p0: String(String(values['--start-offset'])) }), { usage: sub.usage });
    startOffset = n;
  }
  const state = await runSync({ days, startOffset, dryRun: values['--dry-run'] === true, deps });
  if (state.status === 'failed') {
    const line = m('skill-calorie.xunji-run-sync.c011', {
      p0: String(String(state.failed_step)),
      p1: String(String(state.error_summary)),
    });
    return { subcommand: 'run-sync', code: state.failed_code ?? XUNJI_EXIT_CODES.api, message: line, data: state, stderr: line };
  }
  const skipped = state.results.filter((e) => e.skipped === true).map((e) => e.label);
  const skipNote = skipped.length > 0 ? m('skill-calorie.xunji-run-sync.c012', { p0: String(listJoin(currentRenderLanguage(), skipped)) }) : m('skill-calorie.xunji-run-sync.c013');
  return {
    subcommand: 'run-sync', code: XUNJI_EXIT_CODES.ok,
    message: m('skill-calorie.xunji-run-sync.c014', { p0: String(days), p1: String(skipNote) }),
    data: state, stderr: null,
  };
}
