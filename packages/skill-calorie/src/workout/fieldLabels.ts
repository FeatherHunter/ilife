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
import { registerFieldLabels } from '../shared/fieldLabel.js';

/** 本域的域名字符串（查表用；域表一个定义地，别处不许再写字面量）。 */
export const WORKOUT_DOMAIN = 'workout';

/** 训练计划域字段 → 中文标签（`write.ts` 里 `writtenFields` 的全部键）。 */
export const WORKOUT_FIELD_LABELS: Readonly<Record<string, string>> = Object.freeze({
  plan: '整份计划',
  newTitle: '新计划名',
  week: '第几周',
  toWeek: '复制到第几周',
  days: '这一周每天的安排',
  dayOfWeek: '星期几',
  date: '日期',
  sessionIndex: '第几段',
  sessionLabel: '时段名',
  newLabel: '改后的时段名',
  timeStart: '开始时间',
  timeEnd: '结束时间',
  rest: '休息标记',
  movements: '动作清单',
  movement: '要加的动作',
  oldMovement: '原动作名',
  newMovement: '换成哪个动作',
  title: '计划名',
  version: '版本',
  description: '说明',
  start_date: '起始日',
});

registerFieldLabels(WORKOUT_DOMAIN, WORKOUT_FIELD_LABELS);
