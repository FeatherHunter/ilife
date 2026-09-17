/** 训记模块的子命令**分派**：把一条 argv 按声明分派到实现（对外面见 `subcommands.ts`）。
 *
 * 本票（#606 骨架）只有 `verify` 有实现；其余七条**只有声明**——调用它们一律**明确拒绝**
 * （非 0 退出 ＋ 点名归属票），不返回任何成功形态的读数。「留位」不等于「留一个假实现」：
 * 空壳导出（有名字、有签名、回空值／回成功）正是本票不许出现的东西。
 *
 * 解析走**声明**（`parseSubcommandArgs`）：声明外的参数一律不认，所以那八条声明不是墙纸——
 * 例如 `fetch` 缺 `--date` 报的是用法错，而不是「未实现」。
 */
import { XUNJI_EXIT_CODES, XUNJI_SUBCOMMANDS, findSubcommand, parseSubcommandArgs } from './subcommands.js';
import type { XunjiSubcommand } from './subcommands.js';
import { verifyMovements } from './catalog.js';
import type { MovementVerifyReport } from './catalog.js';

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

/** 跑一条子命令（argv 不含程序名）。返回读数；命令行入口（`cli.ts`）负责打印与退出码。 */
export function runXunjiCommand(argv: readonly string[]): XunjiRun {
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
  // 声明说已实现却没接上实现＝代码缺陷，直接抛（不许静默当成功）。
  throw new Error('子命令已声明实现但没有分派路径：' + sub.name);
}
