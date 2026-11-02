/** #449 · 运动域字段 → 中文标签表（本域标签表的**唯一定义地**）。
 *
 * 口径照 #422 `shared/fieldLabel.ts`：表按域住能力目录，共用位只留查表口径；缺项回退**原键名**
 * （不回退英文标签、不编中文）。本件在加载时按 `exercise` 域登记一次，全仓只此一处登记——
 * 回执页（`receipt.ts`）查表，任何人都不许另写第二份映射。
 *
 * 两套键同表，因为回执的两个面各自拿到的是两套键：
 *   ① **CLI 参数名**——写命令回执的 `writtenFields` 报的就是它（`edit.ts` 的 `cliNames`、`log.ts` 的 `F.exercise`），
 *      如 `minutes`／`calories`／`loadKg`；
 *   ② **库列名**——字段变更卡按行键逐个摆（`exercise_log` 的列），如 `duration_minutes`／`calories_burned`。
 * 同一个字段的两套键给同一个中文（`minutes` 与 `duration_minutes` 都是「时长」），免得两张卡两种说法。
 *
 * 不登记的键：选择器类（`id`／`from`／`to`／`items`／`copyFrom`）不进 `writtenFields`、也不进变更卡。
 *
 * 同步列的 `xunji_localid`／`xunji_title`（#608 登记：回写链补上写入路径后，
 * 这两列有了落库来源，变更卡摆得出来，故给中文名）。
 */
import { m } from '../entries/index.js';
import { registerFieldLabels } from '../shared/fieldLabel.js';

/** 本域的域名字符串（查表用；域表一个定义地，别处不许再写字面量）。 */
export const EXERCISE_DOMAIN = 'exercise';

/** 运动域字段 → 中文标签（CLI 参数名 ＋ 库列名，两套键同表）。
 *  取词在**调用时**发生：表值是按需取词的 m() 结果，语言由运行期上下文决定
 *  （登记进 `shared/fieldLabel.ts` 的是取表函数，不是加载期快照）。 */
export function EXERCISE_FIELD_LABELS(): Readonly<Record<string, string>> {
  return Object.freeze({
  // ① CLI 参数名（写命令回执 `writtenFields` 的口径）
  type: m('skill-calorie.exercise-fieldLabels.c001'), calories: m('skill-calorie.exercise-fieldLabels.c002'), minutes: m('skill-calorie.exercise-fieldLabels.c003'), date: '日期', time: m('skill-calorie.exercise-fieldLabels.c004'), note: m('skill-calorie.exercise-fieldLabels.c005'),
  category: m('skill-calorie.exercise-fieldLabels.c006'), difficulty: m('skill-calorie.exercise-fieldLabels.c007'), distance: m('skill-calorie.exercise-fieldLabels.c008'), steps: m('skill-calorie.exercise-fieldLabels.c009'), reps: m('skill-calorie.exercise-fieldLabels.c010'),
  loadKg: m('skill-calorie.exercise-fieldLabels.c011'), setIndex: m('skill-calorie.exercise-fieldLabels.c012'), backfill: m('skill-calorie.exercise-fieldLabels.c013'), heartRate: m('skill-calorie.exercise-fieldLabels.c014'), maxHeartRate: m('skill-calorie.exercise-fieldLabels.c015'),
  // ② 库列名（字段变更卡按行键摆）
  exercise_type: m('skill-calorie.exercise-fieldLabels.c016'), duration_minutes: m('skill-calorie.exercise-fieldLabels.c017'), calories_burned: m('skill-calorie.exercise-fieldLabels.c018'), distance_km: m('skill-calorie.exercise-fieldLabels.c019'),
  avg_heart_rate: m('skill-calorie.exercise-fieldLabels.c020'), max_heart_rate: m('skill-calorie.exercise-fieldLabels.c021'), load_kg: m('skill-calorie.exercise-fieldLabels.c022'), set_index: m('skill-calorie.exercise-fieldLabels.c023'),
  is_backfill: m('skill-calorie.exercise-fieldLabels.c024'), is_deleted: m('skill-calorie.exercise-fieldLabels.c025'),
    xunji_localid: m('skill-calorie.exercise-fieldLabels.c026'), xunji_title: m('skill-calorie.exercise-fieldLabels.c027'),
  });
}

/** 查运动域字段标签：命中给标签，缺项回退原键名（与 shared/fieldLabel.ts 同一口径）。 */
export function exerciseFieldLabel(key: string): string {
  return EXERCISE_FIELD_LABELS()[key] ?? key;
}

// 登记进共用查表口径：存的是**取表函数**（不是加载期快照），查表时现取词。
registerFieldLabels(EXERCISE_DOMAIN, EXERCISE_FIELD_LABELS);
