/** `bill.account.query`（账户汇总）的处理体。
 *
 * 谁在用（一个调用点，指名）：`src/account/commands.ts` 那条读命令声明引本件——
 *  出口分派 `src/cli/cmd_read.ts` 只查注册表再调声明里的 `run`。
 *
 * 一页一件事：**账户表 ＋ 账本**两份事实合成「账户汇总」那一页（老 `账户/account_view.html`）。
 *  出口载荷（stdout 那份）与页面**同源不同形**：载荷给机器（`items`／`total`／`totals`／`flows`），
 *  页面给人（读数卡、账户卡、流水表都由同一份 `AccountSummary` 排版）。
 *
 * 老侧对应件：`scripts/account/cli.py` 的 `cmd_summary` ＋ `scripts/account/render.py` 的 `cmd_view`。
 *  老侧那条 `scripts/account/cli.py summary --json` 是子进程调用（渲染器另起一次 CLI 取数），
 *  新侧一次调用内取数（同进程，少一次进程间搬 JSON）。
 *
 * 红线（照查询域同一套语义，本件不发明新的）：这一页**只读**——不建列、不写文件、不改库；
 *  一条记录都没有时照出完整页（标题 ＋ 空态句 ＋ 引导句 ＋ 来源脚注），不当故障。
 */
import { loadGoals, resolveGoalsPath } from '../fetch/index.js';
import type { BillDb } from '../fetch/index.js';
import type { ViewOut } from '../shared/commandSpec.js';
import { actionStamp } from '../shared/copyArea.js';
import { projectWakeWord } from '../triggers/wakeTable.js';
import { accountSummary } from './accounts.js';
import { SOURCE_READ } from './pageParts.js';
import { accountSummaryDoc } from './template-summary.js';
import type { AccountSummaryData } from './template-summary.js';

/** 没有流水的库在来源脚注的窗口起止位写这两个字（留空会读成缺值）。 */
const NO_WINDOW = '不限';

/** `bill.account.query`：看账户汇总（账户表 ＋ 账本聚合，只读）。 */
export function viewAccountSummary(params: Record<string, unknown>, db: BillDb): ViewOut {
  const key = 'bill.account.query';
  const summary = accountSummary(db, loadGoals(resolveGoalsPath()));
  const wakeWord = projectWakeWord({ key });
  const data: AccountSummaryData = {
    items: [...summary.accounts],
    total: summary.accounts.length,
    totals: summary.totals,
    flows: summary.flows,
    flow_count: summary.flow_count,
    records: summary.records,
  };
  const window = String(summary.accounts.length) + ' 个账户 · 最近 ' + String(summary.flow_count) + ' 笔流水';
  return {
    data,
    html: accountSummaryDoc({
      key,
      params,
      wakeWord,
      window,
      summary,
      data,
      windowStart: summary.first_time === '' ? NO_WINDOW : summary.first_time,
      windowEnd: summary.last_time === '' ? NO_WINDOW : summary.last_time,
      actionAt: actionStamp(),
    }),
  };
}

/** 本次数据来源（复制日志第 3 段）；页面上的来源脚注那句人话住 `./pageParts.js`。 */
export { SOURCE_READ as accountReadSource };
