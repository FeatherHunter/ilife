/** 训记模块的子命令**分派**：把一条 argv 按声明分派到实现（对外面见 `subcommands.ts`）。
 *
 * #606 骨架只有 `verify` 有实现；#607 起 `upsert`／`push-plan` 真跑，
 * 其余五条**只有声明**——调用它们一律**明确拒绝**（非 0 退出 ＋ 点名归属票），
 * 不返回任何成功形态的读数。「留位」不等于「留一个假实现」。
 *
 * 解析走**声明**（`parseSubcommandArgs`）：声明外的参数一律不认。
 * 分派是异步的（推送链调网；`verify` 同样走 async 形状，调用方一律 `await`）。
 */
import { readFileSync } from 'node:fs';
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
import { exitForFailure } from './exitMap.js';

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
  /** 限频状态文件（缺省 `~/.mavis/xunji_push_rate.json`；传 null 只记内存）。 */
  readonly rateLimitPath?: string | null;
  /** upsert 超时毫秒（缺省 30000）。 */
  readonly timeoutMs?: number;
  /** upsert 重试次数（缺省 2）。 */
  readonly maxRetries?: number;
}

const NAMES = XUNJI_SUBCOMMANDS.map((s) => s.name).join('|');

function refusal(sub: XunjiSubcommand, why: string, data: unknown): XunjiRun {
  const line = why + '（用法：' + sub.usage + '）';
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
      message: '动作库读不出，无法验证（不是「动作不合法」）：' + String(report.catalog_error),
      data: report,
      stderr: '动作库读不出，无法验证：' + String(report.catalog_error),
    };
  }
  if (report.invalid_count > 0) {
    const bad = report.results.filter((r) => r.valid === false).map((r) => r.name).join('、');
    return { subcommand: 'verify', code: XUNJI_EXIT_CODES.invalid, message: report.invalid_count + ' 个动作名不在库：' + bad, data: report, stderr: null };
  }
  if (report.total === 0) return refusal(sub, '缺参数：<动作名>', { usage: sub.usage });
  return { subcommand: 'verify', code: XUNJI_EXIT_CODES.ok, message: '全部 ' + report.total + ' 个动作名都在库', data: report, stderr: null };
}

/** `upsert` 的真实现（老 `__main__.py:163-213` 的入参口径，调用走 `upsertTrains`）。 */
async function runUpsert(sub: XunjiSubcommand, values: Readonly<Record<string, string | boolean | readonly string[]>>, deps: XunjiCommandDeps): Promise<XunjiRun> {
  const json = values['--json'];
  const jsonFile = values['--json-file'];
  const hasJson = typeof json === 'string';
  const hasFile = typeof jsonFile === 'string';
  if (hasJson === hasFile) {
    return refusal(sub, '用法：upsert 必须二选一传 --json <res[]> 字符串 或 --json-file <路径>', { usage: sub.usage });
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(hasFile ? readFileSync(jsonFile as string, 'utf8') : (json as string));
  } catch (e) {
    return refusal(sub, 'res[] 解析失败：' + (e instanceof Error ? e.message : String(e)), { usage: sub.usage });
  }
  if (!Array.isArray(parsed)) {
    return refusal(sub, 'res[] 必须是 JSON 数组', { usage: sub.usage });
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
      message: dryRun ? 'dry-run：备好 ' + n + ' 条，未调接口' : 'upsert 成功（' + n + ' 条）',
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
  if (typeof date !== 'string') return refusal(sub, '缺参数：--date', { usage: sub.usage });
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
    const line = summary.fail_count + ' 个 session 推送失败（共 ' + summary.session_count + ' 个）';
    return { subcommand: 'push-plan', code: XUNJI_EXIT_CODES.api, message: line, data: summary, stderr: line };
  }
  return {
    subcommand: 'push-plan',
    code: XUNJI_EXIT_CODES.ok,
    message: dryRun
      ? 'dry-run：' + date + ' 备好 ' + summary.session_count + ' 个 session，未调接口'
      : '推送成功：' + date + ' ' + summary.session_count + ' 个 session',
    data: summary,
    stderr: null,
  };
}

/** 跑一条子命令（argv 不含程序名）。返回读数；命令行入口（`cli.ts`）负责打印与退出码。 */
export async function runXunjiCommand(argv: readonly string[], deps: XunjiCommandDeps = {}): Promise<XunjiRun> {
  const head = argv[0];
  if (head === undefined || head === '') {
    const line = '缺子命令（可用：' + NAMES + '）';
    return { subcommand: null, code: XUNJI_EXIT_CODES.error, message: line, data: { subcommands: XUNJI_SUBCOMMANDS.map((s) => s.name) }, stderr: line };
  }
  const sub = findSubcommand(head);
  if (!sub) {
    const line = '未知子命令：' + head + '（可用：' + NAMES + '）';
    return { subcommand: head, code: XUNJI_EXIT_CODES.error, message: line, data: { subcommands: XUNJI_SUBCOMMANDS.map((s) => s.name) }, stderr: line };
  }
  const parsed = parseSubcommandArgs(sub, argv.slice(1));
  if (parsed.problem !== null) return refusal(sub, parsed.problem, { usage: sub.usage, args: parsed.values });
  if (sub.state === 'declared') {
    return refusal(sub, '未实现：' + sub.name + '（归 ' + String(sub.ownerTicket) + '）', {
      subcommand: sub.name,
      owner_ticket: sub.ownerTicket,
      args: parsed.values,
    });
  }
  if (sub.name === 'verify') {
    const raw = parsed.values['<动作名>'];
    const names = Array.isArray(raw) ? raw : [];
    return runVerify(sub, names, typeof parsed.values['--catalog'] === 'string' ? parsed.values['--catalog'] : undefined);
  }
  if (sub.name === 'upsert') return runUpsert(sub, parsed.values, deps);
  if (sub.name === 'push-plan') return runPushPlan(sub, parsed.values, deps);
  // 声明说已实现却没接上实现＝代码缺陷，直接抛（不许静默当成功）。
  throw new Error('子命令已声明实现但没有分派路径：' + sub.name);
}
