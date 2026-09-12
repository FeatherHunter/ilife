/** T2-① #133 · 唤醒词资产清单断言（`src/triggers/wake-assets.ts`）。
 *
 * 覆盖任务四项：总数 436／分组 10／≥6 条 wake_word 逐字／HELP 不在资产内（元词豁免）。
 * 加固：prompt 全量指纹（逐字证据）、legacy 三源一致、verdict 辨析（23＝理由码闭集）。
 * 运行：先 `pnpm build`，再 `node --test packages/skill-calorie/test/wake-assets-133.test.mjs`
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  WAKE_GROUPS, WAKE_ASSETS, SCENE_BY_ID, WAKE_ASSET_TOTAL,
} from '../dist/triggers/wake-assets.js';
import { TRIGGERS } from '../dist/triggers/index.js';
import { NON_EXEC_REASONS } from '../dist/triggers/routing.js';

const flatSubgroups = WAKE_GROUPS.flatMap((g) => g.subgroups.map((s) => ({ g: g.id, ...s })));

/** 12 条抽查：10 组全覆盖 ＋ legacy ＋ title≠wake 边 ＋ 孪生词（记身材照×3 之首条）。 */
const SPOT = [
  { id: 'home_today_overview', sub: 'home_1', wake_word: '看今日主页', title: '看今日主页', types: ['结果'] },
  { id: 'diet_add_meal', sub: 'diet_1', wake_word: '记一餐', title: '记一餐', types: ['回执'] },
  { id: 'diet_view_with_note', sub: 'diet_3', wake_word: '看有备注的饮食记录', title: '看「有备注」的饮食记录', types: ['结果'] },
  { id: 'w_overview', sub: 'weight_1', wake_word: '看体重总览', title: '看体重总览', types: ['结果'] },
  { id: 'exercise_add', sub: 'exercise_1', wake_word: '记运动', title: '记运动', types: ['回执'] },
  { id: 'plan_set', sub: 'workout_1', wake_word: '定训练计划', title: '定训练计划', types: ['回执'] },
  { id: 'goal_set_nutrition', sub: 'goal_1', wake_word: '定营养目标', title: '定营养目标', types: ['回执'] },
  { id: 'body_comp_add_caliper', sub: 'body_detail_1', wake_word: '记体脂（皮褶钳）', title: '记体脂（皮褶钳）', types: ['回执'] },
  { id: 'body_photo_add_single', sub: 'body_photo_1', wake_word: '记身材照', title: '存一张照片', types: ['回执'] },
  { id: 'profile_setup', sub: 'profile_1', wake_word: '设置档案', title: '设置档案', types: ['回执'] },
  { id: 'report_full_week_cur', sub: 'analysis_1', wake_word: '看健康报告(本周)', title: '看健康报告(本周)', types: ['结果'] },
  { id: 'legacy_复盘', sub: 'analysis_9', wake_word: '复盘', title: '复盘', types: undefined },
];

describe('T2-① #133 唤醒词资产清单', () => {
  it('总数 436（扁平／总量常量／id 索引／分组求和四口径一致）', () => {
    assert.equal(WAKE_ASSETS.length, 436);
    assert.equal(WAKE_ASSET_TOTAL, 436);
    assert.equal(Object.keys(SCENE_BY_ID).length, 436);
    assert.equal(flatSubgroups.reduce((n, s) => n + s.scenes.length, 0), 436);
  });

  it('分组 10（id／label／icon 逐字＝实物，子组 54）', () => {
    assert.deepEqual(WAKE_GROUPS.map((g) => g.id),
      ['home', 'diet', 'weight', 'exercise', 'workout', 'goal', 'body_detail', 'body_photo', 'profile', 'analysis']);
    assert.deepEqual(WAKE_GROUPS.map((g) => g.label),
      ['主页', '饮食', '体重', '运动', '健身计划', '目标管理', '身体细节', '身材照片', '基础信息', '分析']);
    assert.deepEqual(WAKE_GROUPS.map((g) => g.icon),
      ['🏠', '🍚', '⚖️', '🏃', '💪', '🎯', '🧬', '📸', '⚙️', '📊']);
    assert.deepEqual(WAKE_GROUPS.map((g) => g.subgroups.length), [3, 9, 8, 5, 6, 3, 4, 4, 3, 9]);
    assert.equal(flatSubgroups.length, 54);
  });

  it('12 条抽查 wake_word／title／types／子组归属逐字一致', () => {
    assert.ok(SPOT.length >= 6, '任务要求抽查 ≥6 条');
    for (const w of SPOT) {
      const got = SCENE_BY_ID[w.id];
      assert.ok(got, 'id 缺失：' + w.id);
      assert.equal(got.wake_word, w.wake_word, 'wake_word 逐字：' + w.id);
      assert.equal(got.title, w.title, 'title 逐字：' + w.id);
      assert.deepEqual(got.types, w.types, 'types 逐字：' + w.id);
      const sub = flatSubgroups.find((s) => s.scenes.some((s2) => s2.id === w.id));
      assert.equal(sub.id, w.sub, '子组归属：' + w.id);
      assert.ok(got.prompt_template.startsWith('请你加载技能 卡路里,执行唤醒词「' + w.wake_word + '」。'),
        'prompt 锚定唤醒词：' + w.id);
    }
  });

  it('prompt 全量指纹（逐字证据：总字符＋sha256）', () => {
    const concat = WAKE_ASSETS.map((s) => s.prompt_template).join('');
    assert.equal(concat.length, 47874);
    assert.equal(createHash('sha256').update(concat, 'utf8').digest('hex'),
      'bef742ac3307ed117f5286651f3d4402e0f9f850355b40259f8160a558db4429');
  });

  it('legacy 三源一致（资产无 types 22 条 ＝ 新家无 key 22 条，逐词相等）', () => {
    const assetLegacy = WAKE_ASSETS.filter((s) => s.types === undefined).map((s) => s.wake_word).sort();
    const homeLegacy = TRIGGERS.filter((t) => !('key' in t)).map((t) => t.wake_word).sort();
    assert.equal(assetLegacy.length, 22);
    assert.deepEqual(assetLegacy, homeLegacy);
    for (const s of WAKE_ASSETS.filter((x) => x.types === undefined)) {
      assert.ok(s.id.startsWith('legacy_'), 'legacy id 前缀：' + s.wake_word);
    }
    for (const s of WAKE_ASSETS.filter((x) => x.types !== undefined)) {
      assert.equal(s.types.length, 1, '非 legacy 恰一类型：' + s.id);
      assert.ok(['结果', '回执', '过程'].includes(s.types[0]), '类型闭集：' + s.id);
    }
    assert.ok(WAKE_ASSETS.every((s) => s.status === ''), 'status 实物全空');
  });

  it('wake 多重集 ＝ TRIGGERS（含记身材照×3，一词三 id）', () => {
    assert.deepEqual(WAKE_ASSETS.map((s) => s.wake_word).sort(), TRIGGERS.map((t) => t.wake_word).sort());
    assert.deepEqual(WAKE_ASSETS.filter((s) => s.wake_word === '记身材照').map((s) => s.id).sort(),
      ['body_photo_add_batch', 'body_photo_add_note', 'body_photo_add_single']);
  });

  it('HELP 不在资产内（元词豁免：载体非场景，防自指）', () => {
    assert.equal(WAKE_ASSETS.filter((s) => /HELP|帮助|速查台/i.test(s.id + s.title + s.wake_word)).length, 0);
    assert.equal(SCENE_BY_ID.help, undefined);
    assert.equal(TRIGGERS.filter((t) => /HELP/i.test(t.wake_word)).length, 0, '老家 AST 同样不含 HELP');
  });

  it('verdict 辨析：23＝路由理由码闭集条数，非 legacy（不存在第 23 条）', () => {
    assert.equal(Object.keys(NON_EXEC_REASONS).length, 23);
    assert.equal(WAKE_ASSETS.filter((s) => s.types === undefined).length, 22);
    assert.equal(TRIGGERS.filter((t) => !('key' in t)).length, 22);
  });
});
