/** 健身计划预检确认页（写前预览／构建向导）的逐字 prompt：唤醒词 → 该词的 `prompt_template`。
 *
 * 谁在用（写得出哪两个在用）：**写前预览**（`plan.ts` 的 `viewPlanWritePreview`，按 op 认领写词）与
 * **构建向导**（`wizard.ts` 的 `viewPlanWizard`，认领「定训练计划」）。
 *
 * 读 prompt_template 的活留在命令／取数层（本目录）：`render/` 不 import `triggers/`（层级倒置），
 * 页面装配层只收这段文本。逐字取用，不改写、不自造——`prompt_template` 是 SoT 派生件
 * `triggers/scene-05-workout.ts` 的字段（口径同 `goal/read.ts:112-116`）。
 */
import { SCENE_05_WORKOUT } from '../triggers/scene-05-workout.js';

/** 过程页 op → 写词（`routes.ts` 场景 05 里这九个 op 各对一条会改数据库的命令与一个唤醒词）。 */
const WAKE_BY_OP: Record<string, string> = {
  copy: '复制训练计划',
  'set-week': '定一周计划',
  'add-movement': '加训练动作',
  'set-rest': '定休息日',
  update: '改训练计划',
  'update-day': '改某天训练',
  'delete-day': '删某天训练',
  'update-movement': '改动作',
  delete: '撤销训练计划',
};

/** 构建向导认领的写词（`calorie.view.plan-wizard` 就是这条词的过程页）。 */
export const WIZARD_WAKE_WORD = '定训练计划';

/** 该唤醒词在场景 05 里的逐字 prompt；词不在表里即空串（页面照缺项不出这一段，不编文案）。 */
export function workoutPrompt(wakeWord: string): string {
  const hit = SCENE_05_WORKOUT.find((t) => t.wake_word === wakeWord);
  return hit !== undefined && 'prompt_template' in hit ? String(hit.prompt_template ?? '') : '';
}

/** 写前预览该 op 的逐字 prompt（op 未知即空串，由 `previewWrite` 上游先拦）。 */
export function previewPrompt(op: string): string {
  const wake = WAKE_BY_OP[op];
  return wake === undefined ? '' : workoutPrompt(wake);
}
