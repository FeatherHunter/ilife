/** `bill.goal.query`（看预算／看目标）的处理体：两支操作，一处分流。
 *
 * 谁在用（一个调用点，指名）：`src/goal/commands.ts` 那条读命令声明引本件——
 *  出口分派 `src/cli/cmd_read.ts` 只查注册表再调声明里的 `run`。
 *
 * 一页一件事：**预算表 ＋ 账本**两份事实合成「预算执行」那一页（老 `目标/budget_view.html`）、
 *  **目标表 ＋ 账本**合成「目标进度」那一页（老 `目标/saving_view.html`）。出口载荷（stdout 那份）
 *  与页面**同源不同形**：载荷给机器（`items`／`total`／`totals` 等窗口事实），页面给人。
 *
 * 老侧对应件：`scripts/goal/cli.py` 的 `cmd_budget` ＋ `cmd_saving`（老 `render.py:144-182` 把 CLI 的
 *  JSON 再包一层交给模板）。老侧那条链是**子进程调用**（渲染器另起一次 CLI 取数），新侧一次调用内取数。
 *
 * 红线（照查询域／账户域同一套语义，本件不发明新的）：这两页**只读**——不建列、不写文件、不改库；
 *  一条记录都没有时照出完整页（标题 ＋ 空态句 ＋ 引导句 ＋ 来源脚注），不当故障。
 *
 * 载荷的两处口径（差异表逐条记）：
 *   - `items` 是 `list` 形必填的那一格（老侧那两支的键名分别是 `budgets`／`savings`，形状换名不换物）；
 *   - `total` ＝ 这一页几条（老侧写 `count`，两个键在新侧都留着）。
 */
import { loadGoals, resolveGoalsPath } from '../fetch/index.js';
import type { BillDb } from '../fetch/index.js';
import type { ViewOut } from '../shared/commandSpec.js';
import { actionStamp } from '../shared/copyArea.js';
import { MONTH_RE, monthRange } from '../shared/dateRange.js';
import { projectWakeWord } from '../triggers/wakeTable.js';
import { budgetExecution, savingProgress } from './goalData.js';
import { localDay, localMonth, parseGoalReadOp, textOf } from './params.js';
import { readSceneFor } from './scene.js';
import type { GoalProgressData, GoalProgressInput } from './scene.js';

/** 没有记录可算窗口时，来源脚注的起止位写这两个字（留空会读成缺值）。 */
const NO_WINDOW = '不限';

/** 这一页看的是哪个月（参数给的月份归一不了就按本月——与写命令那一支同一处口径）。 */
function monthOf(params: Record<string, unknown>): string {
  const raw = textOf(params['month']);
  return MONTH_RE.test(raw) ? raw : localMonth();
}

/** `bill.goal.query`：看预算执行与目标进度（两支操作，只读）。 */
export function viewGoal(params: Record<string, unknown>, db: BillDb): ViewOut {
  const key = 'bill.goal.query';
  const op = parseGoalReadOp(params);
  const scene = readSceneFor(op);
  const goals = loadGoals(resolveGoalsPath());
  const wakeWord = projectWakeWord({ key, op });
  const actionAt = actionStamp();
  if (op === 'budget') {
    const month = monthOf(params);
    const execution = budgetExecution(db, goals, month, textOf(params['category']));
    const data: GoalProgressData = {
      items: [...execution.budgets],
      total: execution.count,
      op,
      month: execution.month,
      count: execution.count,
      budgets: [...execution.budgets],
      totals: execution.totals,
      records: execution.records,
    };
    const { start, end } = monthRange(month);
    return { data, html: scene.view({ key, params, wakeWord, budget: execution, saving: null, data, windowStart: start, windowEnd: end, actionAt }) };
  }
  const progress = savingProgress(db, goals, textOf(params['name']));
  const data: GoalProgressData = {
    items: [...progress.savings],
    total: progress.count,
    op,
    count: progress.count,
    done_count: progress.done_count,
    savings: [...progress.savings],
    records: progress.records,
  };
  const first = progress.savings.reduce<string>((min, s) => (min === '' || s.start_month < min ? s.start_month : min), '');
  return {
    data,
    html: scene.view({
      key, params, wakeWord, budget: null, saving: progress, data,
      windowStart: first === '' ? NO_WINDOW : monthRange(first).start,
      windowEnd: progress.savings.length === 0 ? NO_WINDOW : localDay(),
      actionAt,
    } satisfies GoalProgressInput),
  };
}
