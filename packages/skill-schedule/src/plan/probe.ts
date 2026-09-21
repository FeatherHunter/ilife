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
 */
import { authOpenId, checkCalendar, findLarkCli, larkVersion } from '../fetch/index.js';
import { receiptResult, type PlanOpCtx, type PlanOpResult } from './context.js';
import { buildReceipt } from './receipt.js';

/** 三档（老侧 `tier` 的三值）。 */
export type FeishuTier = 'full' | 'partial' | 'missing';

export interface TierReport {
  readonly tier: FeishuTier;
  /** lark-cli 的可执行路径（没找到＝null）。 */
  readonly cliPath: string | null;
  readonly version: string | null;
  readonly openId: string | null;
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
      tier: 'missing', cliPath: null, version: null, openId: null, calendar: false,
      why: '本机没找到 lark-cli，同步与探测都跑不了。装它需要你自己动手（本技能不代装）',
    };
  }
  const version = larkVersion(cli);
  let openId: string | null = null;
  try {
    openId = authOpenId(cli);
  } catch (e) {
    return {
      tier: 'partial', cliPath: cli, version, openId: null, calendar: false,
      why: 'lark-cli 装了但没登录（' + (e instanceof Error ? e.message : String(e)) + '），先在终端里跑一次授权登录',
    };
  }
  const calendar = checkCalendar(cli);
  if (!calendar) {
    return {
      tier: 'partial', cliPath: cli, version, openId, calendar: false,
      why: 'lark-cli 装了也登录了，但日历拉不动（多半是缺日历授权），补一次授权再探',
    };
  }
  return {
    tier: 'full', cliPath: cli, version, openId, calendar: true,
    why: 'lark-cli 在场，授权与日历两道门都过了，可以同步',
  };
}

/** 探测这一趟的回执：档位 ＋ 本地这一天的账（不碰远端写入，也不拉远端读数）。 */
export function runProbe(ctx: PlanOpCtx, report: TierReport): PlanOpResult {
  const date = ctx.params.date === undefined || ctx.params.date === null || ctx.params.date === ''
    ? null : String(ctx.params.date);
  const message = '飞书探测：' + TIER_CN[report.tier] + '。' + report.why + '。这一趟只探，没有写任何对象';
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
    counts: { cliInstalled: report.cliPath === null ? 0 : 1, authenticated: report.openId === null ? 0 : 1, calendar: report.calendar ? 1 : 0 },
    extra: {
      probe: true,
      tier: report.tier,
      tierText: TIER_CN[report.tier],
      tierWhy: report.why,
      cliPath: report.cliPath,
      cliVersion: report.version,
      calendarReady: report.calendar,
    },
  }));
}

/** 三档在回执那一句话里的说法（一处定义）。 */
export const TIER_CN: Record<FeishuTier, string> = {
  full: '三档里的全通',
  partial: '三档里的不完全',
  missing: '三档里的没装',
};

/** 三档在页上读数卡里的短说法（一处定义）。 */
export const TIER_VALUE: Record<FeishuTier, string> = {
  full: '全通',
  partial: '不完全',
  missing: '没装',
};

/** 三档各自下一步怎么走（页上那一段；只此一处）。 */
export const TIER_NEXT: Record<FeishuTier, readonly string[]> = {
  full: [
    '要看这一天本地与飞书的差异，下一步就说「日程管家同步」，它会回填标识，补齐远端并清掉孤儿。',
    '要动的是别的一天，把日期一并说清楚（比如「同步 2026-09-22 的日程」）。',
  ],
  partial: [
    '先在终端里把 lark-cli 的授权补上，再回来说一次「飞书探测」。',
    '授权没过之前，「日程管家同步」会停在阻断那一档，本地照写，远端一行不动。',
  ],
  missing: [
    'lark-cli 没装：装与不装由你定，本技能不代装也不代登。',
    '不装也能用：本地那些事照跑（记作息，排计划，复盘），只是日程不会出现在飞书日历上。',
    '要装的话，用你惯用的包管理器装一个全局命令行即可，装完回来说「飞书探测」。',
  ],
};
