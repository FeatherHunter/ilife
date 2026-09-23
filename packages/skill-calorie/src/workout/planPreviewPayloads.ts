/** #946 · 写前预览页（`calorie.view.plan-write-preview`，九个 op 共用一页）底部的两枚载荷。
 *
 * 谁在用（写得出哪两个在用）：命令层 `./plan.ts` 的 `viewPlanWritePreview` 一处——它按本次 op 与本次参数
 * 算出两段文本，交给页面装配件 `../render/workoutPlanDocs.ts` 的 `buildPlanProcessDoc` 出页。
 *
 * 为什么要有这张表（#944 故障 3／8）：页底此前只有一枚「复制指令」，载荷是**入口唤醒词的
 * `prompt_template`**（带 `新值:____` 空位、不含本次改后值、也不指向任何会改数据库的命令），
 * 而「九个 op 各对哪一条命令」在全仓没有落点。本件把这张对应关系落成**字面量表**：九个 op 一一对应
 * `./routes.ts` 场景 05 里那九条「确认…」唤醒词指向的命令（`确认定一周计划` → `calorie.workout.plan-set-week`
 * 这一族的九条）。
 *
 * 两枚载荷（报障人原话的复述，`#944` 故障 8「要做成的样子」）：
 *   · 确认指令＝一条**可原样执行**的命令串（含本次改后值）：复制给 AI，AI 照着跑就落库；
 *   · 修改指令＝「我现在需要把什么修改为什么，确定录入，可以进行修改了」＋同一条命令名：
 *     用户要接着改，就把这句改好发回去。
 *
 * 「本次改后值」的出处＝**这一页进来时的那一份参数**：过程页与写实现同一定位规则（`./write.ts` 里
 * `previewWrite` 与 `writePlan*` 同件同口径），故原样透传就是这一次要写进去的值，不另算一份。
 *
 * 口径：命令原文的拼法有唯一定义地（`../shared/writeParts.ts` 的 `commandLine`），本件只给命令名与参数；
 * 中文里不写「写键」（`docs/agents/wording.md`），代码标识符与命令名照原样。
 */
import { commandLine } from '../shared/writeParts.js';

/** op → 该 op 的确认命令（九条）。顺序＝`../render/workoutPlanDocs.ts` 的 `OP_ZH` 与
 *  `../render/workoutPlanCss.ts` 同一族的既有排法（copy 起头、delete 收尾）。 */
export const PLAN_WRITE_COMMAND_BY_OP: Readonly<Record<string, string>> = Object.freeze({
  copy: 'calorie.workout.plan-copy',
  'set-week': 'calorie.workout.plan-set-week',
  'add-movement': 'calorie.workout.plan-add-movement',
  'set-rest': 'calorie.workout.plan-set-rest',
  update: 'calorie.workout.plan-update',
  'update-day': 'calorie.workout.plan-update-day',
  'delete-day': 'calorie.workout.plan-delete-day',
  'update-movement': 'calorie.workout.plan-update-movement',
  delete: 'calorie.workout.plan-delete',
});

/** 修改指令的句头（报障人原话逐字；`#944` 故障 8「要做成的样子」第 2 条）。 */
const MODIFY_LEAD = '我现在需要把什么修改为什么，确定录入，可以进行修改了';

/** 该 op 的确认命令名；op 不在表里即空串（页面照缺项不出那一枚，不编一个命令名出来）。 */
function commandOf(op: string): string {
  const hit = PLAN_WRITE_COMMAND_BY_OP[op];
  return hit === undefined ? '' : hit;
}

/** 确认指令：本次 op 的**会改数据库的命令** ＋ 本次参数（去掉过程页自己的 `op` 那一段）。
 *
 *  `delete` 那一条另带 `confirm:true`：那是 `writePlanDelete` 自己的入参硬止（不带即 exit 2，
 *  防一次裸调清空整份计划），不是再一次确认。
 *  参数键序＝进来那一份（`JSON.stringify` 保序），故同一次调用两次产出逐字相同。 */
export function planConfirmCommand(op: string, params: Record<string, unknown>): string {
  const key = commandOf(op);
  if (key === '') return '';
  const body: Record<string, unknown> = {};
  for (const [field, value] of Object.entries(params)) {
    if (field !== 'op' && value !== undefined) body[field] = value;
  }
  if (op === 'delete') body['confirm'] = true;
  return commandLine(key, body);
}

/** 修改指令：句头 ＋ 同一条确认命令名（op 不在表里即空串）。 */
export function planModifyPayload(op: string): string {
  const key = commandOf(op);
  return key === '' ? '' : MODIFY_LEAD + ' ' + key;
}
