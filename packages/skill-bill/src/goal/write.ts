/** `bill.goal.write`（设定预算／设定目标）的处理体：两支操作，一处分流。
 *
 * 谁在用（一个调用点，指名）：`src/goal/commands.ts` 那条命令声明引本件——
 *  出口分派 `src/cli/cmd_read.ts` 只查注册表再调声明里的 `run`，不再认这个命令名。
 *
 * 两支的分岔口径（照写入域两条写命令、账户域那条写命令的同一套规矩）：
 *   **有阻断项不再报参数错退出**，改出过程型采集页，退出码 0、`ok:false`、不写库；
 *   阻断项＝缺必需槽位、值进不去（金额非正数／月份形态不认／截止日不是真实日期），
 *   **或**目标表那一层的冲突（同月同类预算已存在，且没给「确认覆盖」）。
 *   阻断项清空即写库：设定预算动 `goals.json` 的 `budgets`（覆盖＝删旧加新），设定目标动 `savings`；
 *   两支都出结果型回执整页。
 *
 * 老侧对应件：`scripts/goal/cli.py` 的 `cmd_set_budget`／`cmd_set_saving`。三处行为差异逐条记在
 *  `docs/skills/skill-bill/t730-差异表.md`（其中一处最要紧）：
 *  ① 老侧「同月同类预算已存在」是一句 `emit_ok`（`status:ok` ＋ `data.conflict:true`）＋ 一句
 *     「确认覆盖请加 --force」，退出码 0 但不写库；新侧出**阻断页**（exit 0、`ok:false`、不写库、逐项点名），
 *     并把「已存在哪一条、原来的金额」摆到页上——两边的实质相同（都要用户确认），新侧把这件事
 *     收进与缺项同一条路径（#688 裁定 9），用户不必去 stdout 里读那句提示。
 *  ② 覆盖是**删旧加新**（新的那条拿新编号），照老侧 `cli.py:149-153` 逐字同形。
 *  ③ 回执文案用规范词：空分类写「全月总预算」（老侧 CLI 那句写「总」、页面写「总预算」——**同域两套**，
 *     新侧取一处；见仓规 `用词纪律`）。
 */
import { loadGoals, resolveGoalsPath, saveGoals } from '../fetch/index.js';
import type { BillGoals } from '../fetch/index.js';
import type { WriteOut } from '../shared/commandSpec.js';
import { actionStamp } from '../shared/copyArea.js';
import { MONTH_RE } from '../shared/dateRange.js';
import { projectWakeWord } from '../triggers/wakeTable.js';
import { appendBudget, appendSaving, budgetsOf, findBudget, savingsOf } from './goalData.js';
import type { GoalBudgetRow } from './goalData.js';
import { SOURCE_COLLECT, SOURCE_WRITE, money } from './pageParts.js';
import { FORCE_SLOT, goalBlocked, localMonth, parseGoalWriteOp, textOf, validateSetBudget, validateSetSaving } from './params.js';
import type { GoalBlocked, GoalWriteOp } from './params.js';
import { writeSceneFor } from './scene.js';
import type { GoalReceipt, GoalWriteScene } from './scene.js';

/** 空分类在上屏时的规范说法（一处定义：回执、页面、日志都读它）。 */
const ALL_CATEGORY_CN = '全月总预算';

/** 目标表那一层的阻断：同月同类预算已经有一条，而用户没给「确认覆盖」（老侧 `cli.py:143-147` 那条路）。
 *  **本件只吃参数与预算表**，判定与文案都在这里一处（缺项那半住 `./params.js`）。 */
function conflictBlockedOf(
  op: GoalWriteOp, params: Record<string, unknown>, budgets: readonly GoalBudgetRow[],
): readonly GoalBlocked[] {
  if (op !== 'set-budget' || params['force'] === true) return [];
  const raw = textOf(params['month']);
  const month = MONTH_RE.test(raw) ? raw : localMonth();
  const category = textOf(params['category']);
  const hit = findBudget(budgets, month, category);
  if (hit === null) return [];
  return [{
    name: FORCE_SLOT.name,
    label: FORCE_SLOT.label,
    why: '「' + month + ' · ' + (category === '' ? ALL_CATEGORY_CN : category) + '」已经有一条 '
      + money(hit.amount) + ' 元的预算；要覆盖它就把「' + FORCE_SLOT.label + '」给上',
  }];
}

/** 有阻断项时那句载荷说明（envelope 的 `message`；也是 stdout 上那句 `data.message`）。 */
function blockedMessageOf(word: string, blocked: readonly GoalBlocked[]): string {
  return word + '还差 ' + String(blocked.length) + ' 项：' + blocked.map((b) => b.label).join('、')
    + '（已出采集页，补齐之后跟助手说一遍）';
}

/** 两支写操作共用的收口：回执事实 ＋ 回执整页。`at` 由调用方取一次（同一次调用只有一个写入时刻）。 */
function finish(input: {
  readonly key: string;
  readonly op: GoalWriteOp;
  readonly params: Record<string, unknown>;
  readonly scene: GoalWriteScene;
  readonly goals: BillGoals;
  readonly at: string;
  readonly summary: string;
  readonly detail: readonly { readonly k: string; readonly v: string }[];
  readonly overwritten: GoalReceipt['overwritten'];
}): WriteOut {
  const receipt: GoalReceipt = {
    op: input.op,
    summary: input.summary,
    /** 改动处数：目标表住 `goals.json`（不在 SQLite），**没有 `total_changes()` 可读**，
     *  故**自报**——一条预算／一个目标就是一处（与账户域的账户表那一半同一处置与同一理由）。 */
    affectedRows: 1,
    actionAt: input.at,
    source: SOURCE_WRITE,
    overwritten: input.overwritten,
    budgetCount: input.goals.budgets.length,
    savingCount: input.goals.savings.length,
  };
  return {
    data: { ok: true, message: input.summary, receipt },
    html: input.scene.receipt({ key: input.key, params: input.params, receipt, detail: input.detail }),
  };
}

/** `bill.goal.write`：设定预算与设定目标，一处分流。
 *  **不收库句柄**：这两支动的都是 `goals.json` 的 `budgets`／`savings` 两键（`bills` 表一字不改），
 *  故不需要 `BillDb`——声明里的 `WriteHandler` 多给一个参数，本件少收一个（TS 里合法、且是真话）。 */
export function writeGoal(params: Record<string, unknown>): WriteOut {
  const key = 'bill.goal.write';
  const op = parseGoalWriteOp(params);
  const scene = writeSceneFor(op);
  const goalsPath = resolveGoalsPath();
  const goals = loadGoals(goalsPath);
  const budgets = budgetsOf(goals);
  const blocked = [...goalBlocked(op, params), ...conflictBlockedOf(op, params, budgets)];
  if (blocked.length > 0) {
    const word = projectWakeWord({ key, op });
    return {
      data: { ok: false, message: blockedMessageOf(word, blocked) },
      html: scene.collect({
        key, op, params, blocked, budgets, savings: savingsOf(goals),
        source: SOURCE_COLLECT, actionAt: actionStamp(),
      }),
    };
  }
  const at = actionStamp();
  if (op === 'set-budget') {
    const { month, category, amount } = validateSetBudget(params);
    const before = findBudget(budgets, month, category);
    appendBudget(goals, { month, category, amount, createdAt: at });
    saveGoals(goalsPath, goals);
    const label = category === '' ? ALL_CATEGORY_CN : category;
    return finish({
      key, op, params, scene, goals, at,
      summary: '已设定预算：' + month + ' ' + label + ' ' + money(amount) + ' 元'
        + (before === null ? '' : '（覆盖了原来的 ' + money(before.amount) + ' 元）'),
      detail: [
        { k: '月份', v: month },
        { k: '分类', v: label },
        { k: '金额', v: money(amount) + ' 元' },
        { k: '记下的时间', v: at },
      ],
      overwritten: before === null ? null : { month, category, amount: before.amount },
    });
  }
  const { name, amount, deadline } = validateSetSaving(params);
  appendSaving(goals, { name, amount, deadline, createdAt: at });
  saveGoals(goalsPath, goals);
  return finish({
    key, op, params, scene, goals, at,
    summary: '已设定目标「' + name + '」' + money(amount) + ' 元' + (deadline === null ? '' : '（截止 ' + deadline + '）'),
    detail: [
      { k: '目标', v: name },
      { k: '目标金额', v: money(amount) + ' 元' },
      { k: '截止日期', v: deadline === null ? '不限' : deadline },
      { k: '记下的时间', v: at },
    ],
    overwritten: null,
  });
}
