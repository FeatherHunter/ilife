/** #486 · 运动域「字段键 → 中文」逐条绑定判据（#449 审查 S2 承接票）。
 *
 * 背景：`test/field-labels-449.test.mjs` 里带具体中文的绑定断言只有一条
 * （`fieldLabel('exercise','duration_minutes')==='时长'`），其余靠「纯中文」与
 * 「零参数名」兜。后果：两键中文对调（用户可见文本里「消耗」印在时长行上）
 * 旧判据件、#264、#423 三份都不会红（审查席已实跑证实）。
 *
 * 本件做法：运动域全部字段键 → 中文逐条写死断言。键与中文都在本件写死，
 * **不 import 被测表（`dist/exercise/fieldLabels.js` 的 `EXERCISE_FIELD_LABELS`）
 * 当期望值**——拿被测物当基准是典型的自证陷阱。对被测表的唯一引用是
 * 裸副作用 import（触发 `registerFieldLabels('exercise', …)` 登记），从不读它的导出。
 * 另补 `shared/fieldLabel.ts` 空串回退分支（`label !== ''`）的判据：只补判据，不改接口。
 *
 * 运行：先建本包（`pnpm --filter skill-calorie build` 或整仓 `pnpm build`），再
 * `node packages/skill-calorie/test/field-label-bindings-486.test.mjs`
 * （`node --test` 同形可跑）。
 */
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { fieldLabel, registerFieldLabels } from '../dist/shared/fieldLabel.js';
/* 副作用 import：只为触发运动域标签表的登记；不读它的任何导出当期望值。 */
import '../dist/exercise/fieldLabels.js';
import { configTestBase } from './helpers/config-test.mjs';

// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
configTestBase();

/** 运动域全部字段键 → 中文（写死在本件；与 `src/exercise/fieldLabels.ts` 当刻逐字对照）。
 * ① CLI 参数名 16 键（写命令回执 `writtenFields` 的口径）＋ ② 库列名 10 键（字段变更卡行键），共 26 键。 */
const BINDINGS = [
  // ① CLI 参数名
  ['type', '运动类型'],
  ['calories', '消耗'],
  ['minutes', '时长'],
  ['date', '日期'],
  ['time', '时间'],
  ['note', '备注'],
  ['category', '分类'],
  ['difficulty', '强度'],
  ['distance', '距离'],
  ['steps', '步数'],
  ['reps', '次数'],
  ['loadKg', '重量'],
  ['setIndex', '组号'],
  ['backfill', '补录'],
  ['heartRate', '平均心率'],
  ['maxHeartRate', '最高心率'],
  // ② 库列名
  ['exercise_type', '运动类型'],
  ['duration_minutes', '时长'],
  ['calories_burned', '消耗'],
  ['distance_km', '距离'],
  ['avg_heart_rate', '平均心率'],
  ['max_heart_rate', '最高心率'],
  ['load_kg', '重量'],
  ['set_index', '组号'],
  ['is_backfill', '补录'],
  ['is_deleted', '删除标记'],
];

test('#486 绑定表共 26 键（删一行即红：防覆盖面静默缩水）', () => {
  assert.equal(BINDINGS.length, 26, '绑定表必须是 26 条，少一条即红');
  const keys = BINDINGS.map(([k]) => k);
  assert.equal(new Set(keys).size, keys.length, '绑定表里有重复键：' + keys.join('、'));
});

for (const [key, zh] of BINDINGS) {
  test('#486 绑定 exercise/' + key + '→' + zh, () => {
    assert.equal(fieldLabel('exercise', key), zh, '字段 ' + key + ' 的中文必须是「' + zh + '」');
  });
}

test('#486 空串回退：表值为空串时回退原键名（`label !== ""` 分支）', () => {
  registerFieldLabels('t486-empty', { blank_key_486: '' });
  assert.equal(fieldLabel('t486-empty', 'blank_key_486'), 'blank_key_486', '空串表值必须回退原键名，不许印空串');
  assert.equal(fieldLabel('t486-empty', 'no_such_key_486'), 'no_such_key_486', '同域缺项同样回退原键名');
});
