/** 健身计划预检确认页的逐字 prompt：唤醒词 → 该词的 `prompt_template`。
 *
 * 谁在用（写得出哪两个在用）：**构建向导**（`wizard.ts` 的 `viewPlanWizard`，认领「定训练计划」）一处。
 *
 * 读 prompt_template 的活留在命令／取数层（本目录）：`render/` 不 import `triggers/`（层级倒置），
 * 页面装配层只收这段文本。逐字取用，不改写、不自造——`prompt_template` 是 SoT 派生件
 * `triggers/scene-05-workout.ts` 的字段（口径同 `goal/read.ts:112-116`）。
 *
 * #946 收窄（#944 故障 3／8）：**写前预览页不再走这一段**——那一页底部的两个载荷（确认指令＝可原样执行的
 * 命令串；修改指令＝回话模板＋同一条命令名）住 `./planPreviewPayloads.ts`，按本次 op 与本次参数现算。
 * 本件原来那张「op → 入口唤醒词」的表（`WAKE_BY_OP`）与 `previewPrompt()` 随载荷改版一并删除：
 * 它正是故障 3 的出处（把用户进来时那句带 `新值:____` 空位的模板又还给他）。本件只剩构建向导一条词。
 */
import { SCENE_05_WORKOUT } from '../triggers/scene-05-workout.js';

/** 构建向导认领的写词（`calorie.view.plan-wizard` 就是这条词的过程页）。 */
export const WIZARD_WAKE_WORD = '定训练计划';

/** 该唤醒词在场景 05 里的逐字 prompt；词不在表里即空串（页面照缺项不出这一段，不编文案）。 */
export function workoutPrompt(wakeWord: string): string {
  const hit = SCENE_05_WORKOUT.find((t) => t.wake_word === wakeWord);
  return hit !== undefined && 'prompt_template' in hit ? String(hit.prompt_template ?? '') : '';
}
