/** #422 口径 · **训练计划域（workout）的字段 → 中文标签表**（本域表的唯一定义地）。
 *
 * 为什么补这一张（T351-v11，负责人 2026-09-15 第 ④ 条）：回执页的「写入字段」原来直接印
 * `writtenFields` 的**原键名**——页上出现 `plan` 这种英文裸词，读者看不懂。
 * 口径照 `shared/fieldLabel.ts`：表按域住能力目录，缺项回退**原键名**（不编中文）；
 * 本件在加载时按 `workout` 域登记一次，全仓只此一处登记——回执页查表，谁都不许另写第二份映射。
 *
 * 键的来源是 `workout/write.ts` 各命令的 `writtenFields`（`writePlanUpdate` 那类用 `provided(params, […])`
 * 把实参名交上去）。**逐键对着那张清单核过**，不凭印象添键：查不到的键会回退原键名，
 * 添一个不存在的键只是死数据，但会让人以为表比实际全。
 *
 * 不登记的键：`confirm`（确认开关，不是被写的字段）；`from`／`to`／`items` 这类选择器不进 `writtenFields`。
 */
/** 本域的域名字符串（查表用；域表一个定义地，别处不许再写字面量）。 */
import { m } from '../entries/index.js';
export const WORKOUT_DOMAIN = 'workout';

/** 训练计划域字段 → 中文标签（`write.ts` 里 `writtenFields` 的全部键）。 */
export const workoutFieldLabels = (): Readonly<Record<string, string>> => Object.freeze({
  plan: m('skill-calorie.workout-fieldLabels.c001'),
  newTitle: m('skill-calorie.workout-fieldLabels.c002'),
  week: m('skill-calorie.workout-fieldLabels.c003'),
  toWeek: m('skill-calorie.workout-fieldLabels.c004'),
  days: m('skill-calorie.workout-fieldLabels.c005'),
  dayOfWeek: m('skill-calorie.workout-fieldLabels.c006'),
  date: m('skill-calorie.workout-fieldLabels.c007'),
  sessionIndex: m('skill-calorie.workout-fieldLabels.c008'),
  sessionLabel: m('skill-calorie.workout-fieldLabels.c009'),
  newLabel: m('skill-calorie.workout-fieldLabels.c010'),
  timeStart: m('skill-calorie.workout-fieldLabels.c011'),
  timeEnd: m('skill-calorie.workout-fieldLabels.c012'),
  rest: m('skill-calorie.workout-fieldLabels.c013'),
  movements: m('skill-calorie.workout-fieldLabels.c014'),
  movement: m('skill-calorie.workout-fieldLabels.c015'),
  oldMovement: m('skill-calorie.workout-fieldLabels.c016'),
  newMovement: m('skill-calorie.workout-fieldLabels.c017'),
  title: m('skill-calorie.workout-fieldLabels.c018'),
  version: m('skill-calorie.workout-fieldLabels.c019'),
  description: m('skill-calorie.workout-fieldLabels.c020'),
  start_date: m('skill-calorie.workout-fieldLabels.c021'),
  // 撤销那条命令的 `writtenFields` 只报一个确认开关（它没有别的可写字段）；页上原来印成 `confirm`，
  // 是英文裸词。给它一个人话说法——「写入字段 1 项：确认执行」读得通，也不假装写了别的东西。
  confirm: m('skill-calorie.workout-fieldLabels.c022'),
});

/** 查训练计划域字段标签：命中给标签，缺项回退原键名（与 shared/fieldLabel.ts 同一口径）。 */
export function workoutFieldLabel(key: string): string {
  return workoutFieldLabels()[key] ?? key;
}
