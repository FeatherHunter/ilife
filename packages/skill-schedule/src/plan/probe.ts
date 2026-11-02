/** #788 · 飞书能力探测（`op=sync` ＋ `dryRun`，唤醒词「飞书探测」）：**只读**，三档。
 *
 *  老侧那三档（`feishu_sync.py` 的 `FeishuStatus.tier`）逐条照搬：
 *    ① lark-cli 装没装（家目录那几个绝对候选 ＋ `where`／`which` 那一档，`fetch` 层已有的候选表）；
 *    ② 授权过没过（`auth status` 里的 openId）；
 *    ③ 日历可不可达（`calendar +agenda` 拉得动）。
 *  三档＝`full`（三门全过）／`partial`（装了但授权或日历那一门没过）／`missing`（没装）。
 *
 *  **为什么要有这一支**：路由表里「飞书探测」的预设是 `{op:'sync', dryRun:true}`——那一枚预设
 *  就是「先看，不写」的意思；而 `runSync` 此前**根本不看 `dryRun`**，于是「飞书探测」会真跑一趟
 *  同步（真往用户的飞书日历里写）。本票把这一支补上（#787 的证据件把「先问再写」那一问划给了本票）：
 *  探测**只读**，一门写都不发；要看差异就先跑它，要真同步再说「日程管家同步」。
 *
 *  **探测结论不是失败**：没装 lark-cli 也 exit 0（回执 remote 记 `none`——本命令不碰远端），
 *  档位与「下一步怎么办」照实写在回执与页上（老侧原话：缺失依赖不报错，调用方按探测结果决定后续流程）。
 *
 *  #896 · 授权那道门只传布尔位，不传 openId 原值：`TierReport.openId` 是探测源真值（`probeTiers()`
 *  里刚拿到的那一个），但回执（`runProbe()` 的 `extra` → `data` 顶层）里只放 `authReady: boolean`，
 *  不放 openId 原串——页上「授权登录过」与进度条都只读这个布尔位。`handlers.ts` 重建出来的副本
 *  因此把 `openId` 置 null（仅占形状，页上不读它），显示以 `authenticated` 为准。
 */
import { authOpenId, checkCalendar, findLarkCli, larkVersion } from '../fetch/index.js';
import { receiptResult, type PlanOpCtx, type PlanOpResult } from './context.js';
import { buildReceipt } from './receipt.js';
import { m } from '../entries/index.js';

/** 三档（老侧 `tier` 的三值）。 */
export type FeishuTier = 'full' | 'partial' | 'missing';

export interface TierReport {
  readonly tier: FeishuTier;
  /** lark-cli 的可执行路径（没找到＝null）。 */
  readonly cliPath: string | null;
  readonly version: string | null;
  /** 探测源真值（`auth status` 里的 openId 原串；回执不带它，页上不读它——显示读 `authenticated`）。 */
  readonly openId: string | null;
  /** 授权那道门过没过（`openId !== null` 的布尔投影；页上「授权登录过」与进度条只读它）。 */
  readonly authenticated: boolean;
  /** 日历那一道门的结果（没过或没探到＝false）。 */
  readonly calendar: boolean;
  /** 为什么停在这一档（说人话，进回执与页）。 */
  readonly why: string;
}

/** 三门逐道探一遍（**纯读**：`--version`／`auth status`／`calendar +agenda` 都不写字）。 */
export function probeTiers(): TierReport {
  const cli = findLarkCli();
  if (cli === null) {
    return {
      tier: 'missing', cliPath: null, version: null, openId: null, authenticated: false, calendar: false,
      why: m('skill-schedule.plan-probe.c001'),
    };
  }
  const version = larkVersion(cli);
  let openId: string | null = null;
  try {
    openId = authOpenId(cli);
  } catch {
    return {
      tier: 'partial', cliPath: cli, version, openId: null, authenticated: false, calendar: false,
      why: m('skill-schedule.plan-probe.c002'),
    };
  }
  const calendar = checkCalendar(cli);
  if (!calendar) {
    return {
      tier: 'partial', cliPath: cli, version, openId, authenticated: true, calendar: false,
      why: m('skill-schedule.plan-probe.c003'),
    };
  }
  return {
    tier: 'full', cliPath: cli, version, openId, authenticated: true, calendar: true,
    why: m('skill-schedule.plan-probe.c004'),
  };
}

/** 探测这一趟的回执：档位 ＋ 本地这一天的账（不碰远端写入，也不拉远端读数）。 */
export function runProbe(ctx: PlanOpCtx, report: TierReport): PlanOpResult {
  const date = ctx.params.date === undefined || ctx.params.date === null || ctx.params.date === ''
    ? null : String(ctx.params.date);
  const message = m('skill-schedule.plan-probe.c005', { p0: String(tierCnOf(report.tier)), p1: String(report.why) });
  return receiptResult(buildReceipt({
    op: 'sync',
    message,
    local: 'checked',
    // 探测不碰远端写入：`none` ＝ 本命令与远端无关（达成判据据此给 0，不把「没装」当失败）。
    remote: 'none',
    remoteId: null,
    errors: [],
    notes: [report.why],
    ...(date === null ? {} : { date }),
    counts: { cliInstalled: report.cliPath === null ? 0 : 1, authenticated: report.authenticated ? 1 : 0, calendar: report.calendar ? 1 : 0 },
    extra: {
      probe: true,
      tier: report.tier,
      tierText: tierCnOf(report.tier),
      tierWhy: report.why,
      cliPath: report.cliPath,
      cliVersion: report.version,
      // #896 · 只给布尔位，不给 openId 原串（隐私）：页上「授权登录过」与进度条读它。
      authReady: report.authenticated,
      calendarReady: report.calendar,
    },
  }));
}

/** 三档在回执那一句话里的说法（一处定义）。
 *  #1197：由模块级常量表改成函数——常量的初值会在模块加载期定死语言，`m()` 只在渲染期取词。 */
export function tierCnOf(tier: FeishuTier): string {
  const table: Record<FeishuTier, string> = {
    full: m('skill-schedule.plan-probe.c006'),
    partial: m('skill-schedule.plan-probe.c007'),
    missing: m('skill-schedule.plan-probe.c008'),
  };
  return table[tier];
}

/** 三档在页上读数卡里的短说法（一处定义）。同 `tierCnOf`：#1197 起改函数。 */
export function tierValueOf(tier: FeishuTier): string {
  const table: Record<FeishuTier, string> = {
    full: m('skill-schedule.plan-probe.c009'),
    partial: m('skill-schedule.plan-probe.c010'),
    missing: m('skill-schedule.plan-probe.c011'),
  };
  return table[tier];
}

/** 三档各自下一步怎么走（页上那一段；只此一处）。同 `tierCnOf`：#1197 起改函数。 */
export function tierNextOf(tier: FeishuTier): readonly string[] {
  const table: Record<FeishuTier, readonly string[]> = {
    full: [
      m('skill-schedule.plan-probe.c012'),
      m('skill-schedule.plan-probe.c013'),
    ],
    partial: [
      m('skill-schedule.plan-probe.c014'),
      m('skill-schedule.plan-probe.c015'),
    ],
    missing: [
      m('skill-schedule.plan-probe.c016'),
      m('skill-schedule.plan-probe.c017'),
      m('skill-schedule.plan-probe.c018'),
    ],
  };
  return table[tier];
}
