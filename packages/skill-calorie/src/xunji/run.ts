/** 训记模块的子命令**分派**：把一条 argv 按声明分派到实现（对外面见 `subcommands.ts`）。
 *
 * #606 骨架只有 `verify` 有实现；#607 起 `upsert`／`push-plan` 真跑；
 * #608 起 `fetch`／`backfill` 真跑；#610 起 `key`／`overlay-plan`／`run-sync` 真跑（八条全实现）。——调用它们一律**明确拒绝**
 * （非 0 退出 ＋ 点名归属票），不返回任何成功形态的读数。「留位」不等于「留一个假实现」。
 *
 * 解析走**声明**（`parseSubcommandArgs`）：声明外的参数一律不认。
 * 分派是异步的（推送／回写链调网调库；`verify` 同样走 async 形状，调用方一律 `await`）。
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import { XUNJI_EXIT_CODES, XUNJI_SUBCOMMANDS, findSubcommand, parseSubcommandArgs } from './subcommands.js';
import type { XunjiSubcommand } from './subcommands.js';
import { verifyMovements } from './catalog.js';
import type { MovementVerifyReport } from './catalog.js';
import { dateProblem, resolveDayPlan } from './planSource.js';
import type { DayPlanSource } from './planSource.js';
import { pushDayPlan } from './push.js';
import type { XunjiResItem } from './request.js';
import { upsertTrains } from './upsert.js';
import type { UpsertTransport } from './upsert.js';
import { fetchTrains, parseTrains } from './fetch.js';
import type { FetchOutcome } from './fetch.js';
import { backfillDefaultDays, backfillRange } from './backfill.js';
import { runKeyCommand } from './key.js';
import { runOverlayPlanCommand, type OverlayDeps } from './overlay-plan.js';
import { runRunSyncCommand, type RunSyncDeps } from './run-sync.js';
import { resolveDbDir, resolveDbFileName } from '../paths.js';
import { exitForFailure } from './exitMap.js';
import { m } from '../entries/index.js';

/** 一次子命令调用的读数：退出码 ＋ 人话 ＋ 机器读数（＋ 命令行入口要打的那句）。 */
export interface XunjiRun {
  readonly subcommand: string | null;
  readonly code: number;
  readonly message: string;
  /** 给回执／页面的读数（`verify`＝`MovementVerifyReport`；用法错／未实现＝读得懂的说明） */
  readonly data: unknown;
  /** 命令行入口要打到 stderr 的那句；没有＝null */
  readonly stderr: string | null;
}

/** 分派的可注入件（测试挡板从这里进；生产缺省＝真时钟真睡真状态文件＋环境变量 KEY）。
 * 全可选：不传即生产缺省（`upsert`／`push-plan` 真调接口——测试必须注入挡板，**不许打真接口**）。 */
export interface XunjiCommandDeps {
  /** 取某天 sessions（缺省读卡路里库，见 `planSource.ts`）。 */
  readonly planSource?: DayPlanSource;
  /** upsert 传输（缺省全局 fetch）。 */
  readonly transport?: UpsertTransport;
  /** 显式 KEY（给了就不用 `readKey`）。 */
  readonly key?: string | null;
  /** KEY 来源（缺省读环境变量；#610 后改走能力门）。 */
  readonly readKey?: () => string | null;
  /** 睡眠（重试退避与限频等待共用；缺省真实 sleep）。 */
  readonly sleep?: (ms: number) => Promise<void>;
  /** 现在（毫秒；限频门用；缺省 `Date.now`）。 */
  readonly now?: () => number;
  /** 限频状态文件（缺省 `<状态目录>/xunji_push_rate.json`；传 null 只记内存）。 */
  readonly rateLimitPath?: string | null;
  /** upsert 超时毫秒（缺省 30000）。 */
  readonly timeoutMs?: number;
  /** upsert 重试次数（缺省 2）。 */
  readonly maxRetries?: number;
  /** 拉取限频总开关（`fetch --respect-rate-limit` 或回写链显式打开；缺省 false）。 */
  readonly respectRateLimit?: boolean;
  /** 拉取限频状态文件（缺省读侧 `xunji_bridge_rate.json`；传 null 即不守不记）。 */
  readonly fetchRateLimitPath?: string | null;
  /** 回写库文件（缺省 `<配置 db.dir／数据目录>/<配置 db.name>`；测试传 tmp）。 */
  readonly dbFile?: string;
  /** 回写开库（缺省 `openDb`；测试给挡板，**不许碰生产库**）。 */
  readonly openDb?: (dbFile: string) => DatabaseSync;
  /** 回写拉取（缺省真拉取；测试给挡板，**不许打真接口**）。 */
  readonly fetchDay?: (dateStr: string) => Promise<FetchOutcome>;
  /** 叠加取数面（缺省真拉取＋真 upsert）。KEY 存取面无注入缝（#676：唯一真相是配置文件）。 */
  readonly overlay?: OverlayDeps;
  readonly sync?: RunSyncDeps;
}

const NAMES = XUNJI_SUBCOMMANDS.map((s) => s.name).join('|');

function refusal(sub: XunjiSubcommand, why: string, data: unknown): XunjiRun {
  const line = m('skill-calorie.xunji-run.c001', { p0: String(why), p1: String(sub.usage) });
  return { subcommand: sub.name, code: XUNJI_EXIT_CODES.error, message: why, data, stderr: line };
}

/** `verify` 的真实现：按单个／批量动作名读库校验，退出码按读数定（不是恒 0）。 */
function runVerify(sub: XunjiSubcommand, names: readonly string[], catalogPath: string | undefined): XunjiRun {
  const report: MovementVerifyReport = verifyMovements(names, catalogPath === undefined ? {} : { catalogPath });
  if (!report.catalog_loaded) {
    // 老实现这里退 0（#595 附带发现判为缺陷，不照抄）：库读不出＝**无法验证**，必须让调用方看得见。
    return {
      subcommand: 'verify',
      code: XUNJI_EXIT_CODES.error,
      message: m('skill-calorie.xunji-run.c002', { p0: String(String(report.catalog_error)) }),
      data: report,
      stderr: m('skill-calorie.xunji-run.c003', { p0: String(String(report.catalog_error)) }),
    };
  }
  if (report.invalid_count > 0) {
    const bad = report.results.filter((r) => r.valid === false).map((r) => r.name).join('、');
    return { subcommand: 'verify', code: XUNJI_EXIT_CODES.invalid, message: m('skill-calorie.xunji-run.c004', { p0: String(report.invalid_count), p1: String(bad) }), data: report, stderr: null };
  }
  if (report.total === 0) return refusal(sub, m('skill-calorie.xunji-run.c005'), { usage: sub.usage });
  return { subcommand: 'verify', code: XUNJI_EXIT_CODES.ok, message: m('skill-calorie.xunji-run.c006', { p0: String(report.total) }), data: report, stderr: null };
}

/** `upsert` 的真实现（老 `__main__.py:163-213` 的入参口径，调用走 `upsertTrains`）。 */
async function runUpsert(sub: XunjiSubcommand, values: Readonly<Record<string, string | boolean | readonly string[]>>, deps: XunjiCommandDeps): Promise<XunjiRun> {
  const json = values['--json'];
  const jsonFile = values['--json-file'];
  const hasJson = typeof json === 'string';
  const hasFile = typeof jsonFile === 'string';
  if (hasJson === hasFile) {
    return refusal(sub, m('skill-calorie.xunji-run.c007'), { usage: sub.usage });
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(hasFile ? readFileSync(jsonFile as string, 'utf8') : (json as string));
  } catch (e) {
    return refusal(sub, m('skill-calorie.xunji-run.c008', { p0: String(e instanceof Error ? e.message : String(e)) }), { usage: sub.usage });
  }
  if (!Array.isArray(parsed)) {
    return refusal(sub, m('skill-calorie.xunji-run.c009'), { usage: sub.usage });
  }
  // 透传语义：只断言“数组”，条目形状不断言（`movements[].name` 原样上报，推送前不校验）。
  const resList = parsed as XunjiResItem[];
  const dryRun = values['--dry-run'] === true;
  const outcome = await upsertTrains(resList, {
    clientRequestId: typeof values['--client-request-id'] === 'string' ? (values['--client-request-id'] as string) : undefined,
    includeFullData: values['--include-full-data'] === true,
    dryRun,
    key: deps.key,
    readKey: deps.readKey,
    transport: deps.transport,
    timeoutMs: deps.timeoutMs,
    maxRetries: deps.maxRetries,
    sleep: deps.sleep,
  });
  if (outcome.ok) {
    const data = withAttempts(outcome.response, outcome.attempts);
    const n = Array.isArray(resList) ? resList.length : 0;
    return {
      subcommand: 'upsert',
      code: XUNJI_EXIT_CODES.ok,
      message: dryRun ? m('skill-calorie.xunji-run.c010', { p0: String(n) }) : m('skill-calorie.xunji-run.c011', { p0: String(n) }),
      data,
      stderr: null,
    };
  }
  const line = outcome.failure.message;
  return {
    subcommand: 'upsert',
    code: exitForFailure(outcome.failure),
    message: line,
    data: { err: true, ...outcome.failure, attempts: outcome.attempts },
    stderr: line,
  };
}

/** `attempts > 1` 才回写（老 `upsert.py:136-137` 同述；对象正文摊平，非对象包一层）。 */
function withAttempts(response: unknown, attempts: number): unknown {
  if (attempts <= 1) return response;
  if (typeof response === 'object' && response !== null && !Array.isArray(response)) {
    return { ...(response as Record<string, unknown>), attempts };
  }
  return { response, attempts };
}

/** `push-plan` 的真实现（老 `__main__.py:114-123` 的退出口径：`fail_count > 0` 即 3）。 */
async function runPushPlan(sub: XunjiSubcommand, values: Readonly<Record<string, string | boolean | readonly string[]>>, deps: XunjiCommandDeps): Promise<XunjiRun> {
  const date = values['--date'];
  if (typeof date !== 'string') return refusal(sub, m('skill-calorie.xunji-run.c012'), { usage: sub.usage });
  const bad = dateProblem(date);
  if (bad !== null) return refusal(sub, bad, { usage: sub.usage });
  const dryRun = values['--dry-run'] === true;
  const day = (deps.planSource ?? resolveDayPlan)(date);
  if (!day.found) return refusal(sub, day.reason, { date });
  const summary = await pushDayPlan(date, day.sessions, {
    dryRun,
    upsertOpts: {
      key: deps.key,
      readKey: deps.readKey,
      transport: deps.transport,
      timeoutMs: deps.timeoutMs,
      maxRetries: deps.maxRetries,
      sleep: deps.sleep,
    },
    rateLimit: { now: deps.now, sleep: deps.sleep, statePath: deps.rateLimitPath },
  });
  if (summary.fail_count > 0) {
    const line = m('skill-calorie.xunji-run.c013', { p0: String(summary.fail_count), p1: String(summary.session_count) });
    return { subcommand: 'push-plan', code: XUNJI_EXIT_CODES.api, message: line, data: summary, stderr: line };
  }
  return {
    subcommand: 'push-plan',
    code: XUNJI_EXIT_CODES.ok,
    message: dryRun
      ? m('skill-calorie.xunji-run.c014', { p0: String(date), p1: String(summary.session_count) })
      : m('skill-calorie.xunji-run.c015', { p0: String(date), p1: String(summary.session_count) }),
    data: summary,
    stderr: null,
  };
}

/** `fetch` 的真实现（老 `__main__.py:71-94` 的退出口径：鉴权错→2，接口错→3）。 */
async function runFetch(sub: XunjiSubcommand, values: Readonly<Record<string, string | boolean | readonly string[]>>, deps: XunjiCommandDeps): Promise<XunjiRun> {
  const date = values['--date'];
  if (typeof date !== 'string') return refusal(sub, m('skill-calorie.xunji-run.c016'), { usage: sub.usage });
  const bad = dateProblem(date);
  if (bad !== null) return refusal(sub, bad, { usage: sub.usage });
  const full = values['--full'] === true;
  const raw = values['--raw'] === true;
  const outcome = await fetchTrains(date, {
    includeFullData: full,
    key: deps.key,
    readKey: deps.readKey,
    transport: deps.transport,
    timeoutMs: deps.timeoutMs,
    maxRetries: deps.maxRetries,
    sleep: deps.sleep,
    respectRateLimit: values['--respect-rate-limit'] === true || deps.respectRateLimit === true,
    now: deps.now,
    rateLimitPath: deps.fetchRateLimitPath,
  });
  if (outcome.ok) {
    if (raw) {
      return {
        subcommand: 'fetch', code: XUNJI_EXIT_CODES.ok,
        message: m('skill-calorie.xunji-run.c017', { p0: String(date) }),
        data: withAttempts(outcome.response, outcome.attempts), stderr: null,
      };
    }
    const trains = parseTrains(outcome.response);
    return {
      subcommand: 'fetch', code: XUNJI_EXIT_CODES.ok,
      message: m('skill-calorie.xunji-run.c018', { p0: String(date), p1: String(trains.length) }),
      data: { date, trains_count: trains.length, trains }, stderr: null,
    };
  }
  const line = m('skill-calorie.xunji-run.c019', { p0: String(outcome.failure.message) });
  return {
    subcommand: 'fetch',
    code: exitForFailure(outcome.failure),
    message: line,
    data: { err: true, ...outcome.failure, attempts: outcome.attempts },
    stderr: line,
  };
}

/** `backfill` 的真实现（老 `__main__.py:97-111` 的形状，退出补上写库失败那支）。
 *
 * 退出口径（修掉老「写库失败仍退 0」）：「没拉到」按拉取失败分类走 2／3；
 * 「拉到了没写进」走 3；用法错（坏日期／坏天数／库指不对）走 1。
 */
async function runBackfill(sub: XunjiSubcommand, values: Readonly<Record<string, string | boolean | readonly string[]>>, deps: XunjiCommandDeps): Promise<XunjiRun> {
  const endRaw = values['--date'];
  const endStr = typeof endRaw === 'string' ? endRaw : null;
  if (endStr !== null) {
    const bad = dateProblem(endStr);
    if (bad !== null) return refusal(sub, bad, { usage: sub.usage });
  }
  let days = backfillDefaultDays();
  if (values['--days'] !== undefined) {
    const n = Number(values['--days']);
    if (!Number.isInteger(n) || n < 1) {
      return refusal(sub, m('skill-calorie.xunji-run.c020', { p0: String(String(values['--days'])) }), { usage: sub.usage });
    }
    days = n;
  }
  let dbFile = deps.dbFile;
  if (dbFile === undefined) {
    try {
      dbFile = join(resolveDbDir(), resolveDbFileName());
    } catch (e) {
      return refusal(sub, e instanceof Error ? e.message : String(e), { usage: sub.usage });
    }
  }
  const result = await backfillRange(endStr, days, {
    fetchDay: deps.fetchDay,
    openDb: deps.openDb,
    dbFile,
    fetchOpts: {
      key: deps.key,
      readKey: deps.readKey,
      transport: deps.transport,
      timeoutMs: deps.timeoutMs,
      maxRetries: deps.maxRetries,
      sleep: deps.sleep,
      respectRateLimit: deps.respectRateLimit,
      now: deps.now,
      rateLimitPath: deps.fetchRateLimitPath,
    },
  });
  for (const r of result.results) {
    if (r.fetch_ok === false && r.failure !== null) {
      const line = m('skill-calorie.xunji-run.c021', { p0: String(r.date), p1: String(r.failure.message) });
      return { subcommand: 'backfill', code: exitForFailure(r.failure), message: line, data: result, stderr: line };
    }
  }
  for (const r of result.results) {
    if (r.err !== null) {
      const line = m('skill-calorie.xunji-run.c022', { p0: String(r.date), p1: String(r.err) });
      return { subcommand: 'backfill', code: XUNJI_EXIT_CODES.api, message: line, data: result, stderr: line };
    }
  }
  const figured = result.days > 1 ? m('skill-calorie.xunji-run.c023', { p0: String(result.end_date), p1: String(result.days) }) : result.end_date;
  return {
    subcommand: 'backfill', code: XUNJI_EXIT_CODES.ok,
    message: m('skill-calorie.xunji-run.c024', {
      p0: String(figured),
      p1: String(result.total_inserted),
      p2: String(result.total_updated),
    }),
    data: result, stderr: null,
  };
}

/** 跑一条子命令（argv 不含程序名）。返回读数；命令行入口（`cli.ts`）负责打印与退出码。 */
export async function runXunjiCommand(argv: readonly string[], deps: XunjiCommandDeps = {}): Promise<XunjiRun> {
  const head = argv[0];
  if (head === undefined || head === '') {
    const line = m('skill-calorie.xunji-run.c025', { p0: String(NAMES) });
    return { subcommand: null, code: XUNJI_EXIT_CODES.error, message: line, data: { subcommands: XUNJI_SUBCOMMANDS.map((s) => s.name) }, stderr: line };
  }
  const sub = findSubcommand(head);
  if (!sub) {
    const line = m('skill-calorie.xunji-run.c026', { p0: String(head), p1: String(NAMES) });
    return { subcommand: head, code: XUNJI_EXIT_CODES.error, message: line, data: { subcommands: XUNJI_SUBCOMMANDS.map((s) => s.name) }, stderr: line };
  }
  const parsed = parseSubcommandArgs(sub, argv.slice(1));
  if (parsed.problem !== null) return refusal(sub, parsed.problem, { usage: sub.usage, args: parsed.values });
  if (sub.state === 'declared')
    return refusal(sub, m('skill-calorie.xunji-run.c027', { p0: String(sub.name), p1: String(String(sub.ownerTicket)) }), { subcommand: sub.name, owner_ticket: sub.ownerTicket, args: parsed.values });
  if (sub.name === 'verify') {
    const raw = parsed.values['<动作名>'];
    const names = Array.isArray(raw) ? raw : [];
    return runVerify(sub, names, typeof parsed.values['--catalog'] === 'string' ? parsed.values['--catalog'] : undefined);
  }
  if (sub.name === 'upsert') return runUpsert(sub, parsed.values, deps);
  if (sub.name === 'push-plan') return runPushPlan(sub, parsed.values, deps);
  if (sub.name === 'fetch') return runFetch(sub, parsed.values, deps);
  if (sub.name === 'backfill') return runBackfill(sub, parsed.values, deps);
  if (sub.name === 'key') return runKeyCommand(sub, parsed.values);
  if (sub.name === 'overlay-plan') return runOverlayPlanCommand(sub, parsed.values, deps.overlay);
  if (sub.name === 'run-sync') return runRunSyncCommand(sub, parsed.values, deps.sync);
  // 声明说已实现却没接上实现＝代码缺陷，直接抛（不许静默当成功）。
  throw new Error('子命令已声明实现但没有分派路径：' + sub.name);
}
