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
 * 不登记的键：选择器类（`id`／`from`／`to`／`items`／`copyFrom`）不进 `writtenFields`、也不进变更卡；
 * 同步列的 `xunji_localid`／`xunji_title` 没有任何命令能写、变更卡也就摆不出来（没有中文名就不编）。
 */
import { registerFieldLabels } from '../shared/fieldLabel.js';

/** 本域的域名字符串（查表用；域表一个定义地，别处不许再写字面量）。 */
export const EXERCISE_DOMAIN = 'exercise';

/** 运动域字段 → 中文标签（CLI 参数名 ＋ 库列名，两套键同表）。 */
export const EXERCISE_FIELD_LABELS: Readonly<Record<string, string>> = Object.freeze({
  // ① CLI 参数名（写命令回执 `writtenFields` 的口径）
  type: '运动类型', calories: '消耗', minutes: '时长', date: '日期', time: '时间', note: '备注',
  category: '分类', difficulty: '强度', distance: '距离', steps: '步数', reps: '次数',
  loadKg: '重量', setIndex: '组号', backfill: '补录', heartRate: '平均心率', maxHeartRate: '最高心率',
  // ② 库列名（字段变更卡按行键摆）
  exercise_type: '运动类型', duration_minutes: '时长', calories_burned: '消耗', distance_km: '距离',
  avg_heart_rate: '平均心率', max_heart_rate: '最高心率', load_kg: '重量', set_index: '组号',
  is_backfill: '补录', is_deleted: '删除标记',
});

registerFieldLabels(EXERCISE_DOMAIN, EXERCISE_FIELD_LABELS);
