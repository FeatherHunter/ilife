/** #88 实施 A 段 · **HELP 场景数据模型**自证（S1 数据模型；S2 壳落地／S3 三守卫随速查台下线）。
 *
 * 速查台（同一内容的第二份产物、组件式三态壳）已按用户 2026-09-24 裁定整支下线，故本文件只留**数据模型**
 * 那半（`helpScene.ts`：`buildHelpSceneData` ＋ `HELP_GROUPS`／`HELP_SUBFUNC_ORDER`／`HELP_TYPE_BADGES`）；
 * 原 S2（壳结构／三态同源）与 S3（标记残留／HTML 层 id 唯一／copyText 单实现）随壳一起删单——那几条判据的
 * 落点面（`renderHelpShell` 的产物）已不在本技能。历史证据件 `docs/research/t88-impl-a.md` 原样留档。
 *
 * 运行：先 `pnpm build`，再 `node --test packages/skill-calorie/test/help-center-88.test.mjs`
 * 每个用例名后括号里是「红点」＝把它改坏时本用例必须变红的那一处（变异自证口径）。
 */
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import {
  SPEC_FROZEN_SURFACE, TEMPLATE_MARKERS, buildSharedHelpersJs, renderHelpShell,
} from 'base-paint';
import {
  HELP_GROUPS, HELP_SKILL_NAME, HELP_SUBFUNC_ORDER,
  HELP_TITLE, HELP_TYPE_BADGES, buildHelpSceneData,
} from '../dist/render/index.js';
import { CATEGORIES, TRIGGERS } from '../dist/triggers/index.js';
import { configTestBase } from './helpers/config-test.mjs';

// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
configTestBase();

const HERE = dirname(fileURLToPath(import.meta.url));

const count = (haystack, needle) => haystack.split(needle).length - 1;
const flat = (data) => data.groups.flatMap((g) => g.subgroups.flatMap((s) => s.scenes));
const updatedAt = '2026-09-09 12:00';
const sceneData = buildHelpSceneData({ updatedAt });


/* ── S1 数据模型（A1） ─────────────────────────────────────────── */

test('A1 10 分组／54 子功能／437 场景（红点：分组或子功能聚合逻辑改坏）', () => {
  assert.equal(sceneData.groups.length, 10);
  assert.equal(sceneData.groups.reduce((n, g) => n + g.subgroups.length, 0), 54);
  // 条数派生（#645：手写 436 随词表增删必陈化；投影丢条由本断言捕获，SoT 收缩由 t291 的绝对钉守）。
  assert.equal(flat(sceneData).length, TRIGGERS.length, '投影不得丢条：场景数必须随 TRIGGERS 重算');
});

test('A1 分组序／label／图标逐字 = F3 十组（红点：HELP_GROUPS 任一项改动）', () => {
  assert.deepEqual(sceneData.groups.map((g) => g.id),
    ['home', 'diet', 'weight', 'exercise', 'workout', 'goal', 'body_detail', 'body_photo', 'profile', 'analysis']);
  assert.deepEqual(sceneData.groups.map((g) => g.label),
    ['主页', '饮食', '体重', '运动', '健身计划', '目标管理', '身体细节', '身材照片', '基础信息', '分析']);
  assert.deepEqual(sceneData.groups.map((g) => g.icon),
    ['🏠', '🍚', '⚖️', '🏃', '💪', '🎯', '🧬', '📸', '⚙️', '📊']);
  assert.deepEqual(sceneData.groups.map((g) => g.subgroups.length), [3, 9, 8, 5, 6, 3, 4, 4, 3, 9]);
  assert.equal(HELP_GROUPS.length, 10);
});

test('A1 每分组子功能序 = F3 显式序 ＋ 既有唤醒词恒最后（红点：HELP_SUBFUNC_ORDER 改坏）', () => {
  const diet = sceneData.groups.find((g) => g.id === 'diet');
  assert.deepEqual(diet.subgroups.map((s) => s.label),
    ['记饮食', '改饮食', '看饮食', '查食品', '看营养', '看排行', '饮食复盘', '餐别分布', '既有唤醒词']);
  assert.deepEqual(HELP_SUBFUNC_ORDER['健身计划'],
    ['定训练计划', '看训练计划', '改训练计划', '落地训练', '计划复盘', '安全检查']);
});

test('A1 types 直方图 329/79/6/22 ＋ 恒发 SceneTypeBadge{text,bg,fg}（红点：types 发字符串＝丢三档色）', () => {
  const hist = flat(sceneData).reduce((acc, scene) => {
    const key = (scene.types ?? ['(none)']).map((t) => (typeof t === 'string' ? t : t.text)).join(',');
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  // 直方图期望派生（#645）：从 SoT 现算——新场景按 output_type 分档＋legacy 无 types 计 (none)；整档错配仍必红。
  const expectedHist = {};
  for (const t of TRIGGERS) {
    const badge = 'output_type' in t ? HELP_TYPE_BADGES[t.output_type] : undefined;
    const sortKey = badge === undefined ? '(none)' : badge.text;
    expectedHist[sortKey] = (expectedHist[sortKey] ?? 0) + 1;
  }
  assert.deepEqual(hist, expectedHist);
  for (const scene of flat(sceneData)) {
    for (const badge of scene.types ?? []) {
      assert.equal(typeof badge, 'object', 'types 元素必须是对象（字符串会走 CSS 默认色）');
      assert.equal(typeof badge.text, 'string');
      assert.equal(typeof badge.bg, 'string');
      assert.equal(typeof badge.fg, 'string');
    }
  }
});

test('P-3 徽章色集 ⊆ F3 三档 ＋ 不触 H-01 禁色表（红点：改配色值）', () => {
  const allowed = new Set(Object.values(HELP_TYPE_BADGES).map((b) => b.bg + '/' + b.fg));
  assert.deepEqual([...allowed].sort(), ['#e2f7f5/#00897b', '#e8f2ff/#0a63ce']);
  const used = new Set(flat(sceneData).flatMap((s) => (s.types ?? []).map((b) => b.bg + '/' + b.fg)));
  for (const color of used) assert.ok(allowed.has(color), '白名单外配色：' + color);
  const forbidden = ['#0a84ff', '#af52de', '#ff375f', '#0071e3'];
  for (const color of used) for (const bad of forbidden) assert.ok(!color.includes(bad), 'H-01 禁色：' + color);
});

test('A1 顶层键 = F3 键集（skill_name/title/subtitle/contact/groups）（红点：多塞一个顶层字段）', () => {
  assert.deepEqual(Object.keys(sceneData), ['skill_name', 'title', 'subtitle', 'contact', 'groups']);
  assert.equal(sceneData.skill_name, HELP_SKILL_NAME);
  assert.equal(sceneData.title, HELP_TITLE);
  assert.equal(sceneData.subtitle, sceneData.groups.length + ' 分类 · ' + flat(sceneData).length + ' 场景 · 更新于 ' + updatedAt);
  assert.deepEqual(sceneData.contact.items.map((i) => i.label), ['GitHub', 'Issues']);
});

test('P-2 updatedAt 显式参数：缺省无时间戳且两次调用逐字相同（红点：改用 Date.now()）', () => {
  const a = buildHelpSceneData();
  const b = buildHelpSceneData();
  assert.equal(a.subtitle, a.groups.length + ' 分类 · ' + flat(a).length + ' 场景');
  assert.equal(JSON.stringify(a), JSON.stringify(b));
  assert.equal(count(JSON.stringify(a), '更新于'), 0);
  assert.equal(count(JSON.stringify(buildHelpSceneData({ updatedAt })), '更新于'), 1);
});

test('R1-7 legacy 22 条 id = main_prompt.cli 原文（红点：改回 legacy_{wake_word}）', () => {
  const legacy = TRIGGERS.filter((t) => !('output_type' in t));
  assert.equal(legacy.length, 22);
  const clis = legacy.map((t) => t.main_prompt.cli);
  assert.equal(new Set(clis).size, 22, 'legacy CLI 互不重复');
  const legacyScenes = flat(sceneData).filter((s) => s.types === undefined);
  assert.equal(legacyScenes.length, 22);
  assert.deepEqual(legacyScenes.map((s) => s.id).sort(), clis.slice().sort());
  assert.equal(count(JSON.stringify(sceneData), 'legacy_'), 0, '不得残留 F3 的 legacy_ 前缀 id');
});

test('R-cond-7 id 轴子集：F3 十 id ⊆ SoT CATEGORIES 十三 id（红点：HELP_GROUPS 自造 id）', () => {
  const categories = new Set(CATEGORIES.map(([, , key]) => key));
  for (const group of HELP_GROUPS) {
    assert.ok(categories.has(group.id), 'HELP_GROUPS.id 不在 SoT CATEGORIES：' + group.id);
  }
  assert.equal(categories.size, 13);
});

test('R1-12 437 条 prompt_template 无 </script>／<!--（红点：数据里注入破壳串）', () => {
  for (const scene of flat(sceneData)) {
    assert.ok(!scene.prompt_template.includes('</script>'));
    assert.ok(!scene.prompt_template.includes('<!--'));
    assert.notEqual(scene.prompt_template, '');
  }
});

test('D-1 三档徽章色**逐条**映射 = F3 TYPE_DEFAULT（红点：互换 receipt／process 配色——集合口径零鉴别力）', () => {
  // F3 `卡路里.html` 运行时 `var TYPE_DEFAULT`（`:1693-1703`）：结果／回执／查看／校验／选择 → `#e8f2ff/#0a63ce`，
  // 过程／向导 → `#e2f7f5/#00897b`。逐**文本**钉死：互换两档配色必红（A 段红队 MUT-E 曾证明「集合相等」口径零鉴别力）。
  const EXPECTED = {
    结果: { bg: '#e8f2ff', fg: '#0a63ce' },
    回执: { bg: '#e8f2ff', fg: '#0a63ce' },
    过程: { bg: '#e2f7f5', fg: '#00897b' },
  };
  assert.deepEqual(Object.keys(HELP_TYPE_BADGES).sort(), ['process', 'receipt', 'result']);
  const byKey = new Map(TRIGGERS.filter((t) => 'output_type' in t).map((t) => [t.key, t.output_type]));
  const hist = {};
  for (const scene of flat(sceneData)) {
    for (const badge of scene.types ?? []) {
      const want = EXPECTED[badge.text];
      assert.ok(want !== undefined, '未知徽章文本：' + badge.text);
      assert.equal(badge.bg, want.bg, badge.text + ' 的 bg 必须逐字取 F3 TYPE_DEFAULT');
      assert.equal(badge.fg, want.fg, badge.text + ' 的 fg 必须逐字取 F3 TYPE_DEFAULT');
      hist[badge.text] = (hist[badge.text] ?? 0) + 1;
    }
  }
  // 三档条数派生（#645）：从 SoT output_type 现算；互换配色在上逐条 bg/fg 处红，整档错配在这里红。
  const expectedTypeHist = {};
  for (const t of TRIGGERS.filter((t) => 'output_type' in t)) {
    const text = HELP_TYPE_BADGES[t.output_type].text;
    expectedTypeHist[text] = (expectedTypeHist[text] ?? 0) + 1;
  }
  assert.deepEqual(hist, expectedTypeHist, '三档文本的条数必须逐档对上（防整档错配）');
  // 徽章对象必须**恒等于** `HELP_TYPE_BADGES[output_type]`（防「换键不换色」／文本与色错配）。
  for (const scene of flat(sceneData)) {
    if (scene.types === undefined) continue;
    const outputType = byKey.get(scene.id);
    assert.ok(outputType !== undefined, '非新场景却带 types：' + scene.id);
    assert.equal(scene.types.length, 1);
    assert.equal(scene.types[0], HELP_TYPE_BADGES[outputType],
      scene.id + ' 的徽章必须恒取 HELP_TYPE_BADGES[' + outputType + ']');
  }
  assert.deepEqual(
    Object.fromEntries(Object.entries(HELP_TYPE_BADGES).map(([key, value]) => [key, value.text])),
    { process: '过程', result: '结果', receipt: '回执' },
  );
});

test('A2 复用冻结面 130 条 implemented／0 pending（红点：base-render 新增契约面）', () => {
  // 总数不写死（#645：base 侧 #525 已 130→148；总数由 base 自家签名测试锁，本处只守零 pending 且全 implemented）。
  assert.equal(SPEC_FROZEN_SURFACE.filter((entry) => entry.status === 'pending').length, 0);
  assert.equal(SPEC_FROZEN_SURFACE.filter((entry) => entry.status === 'implemented').length, SPEC_FROZEN_SURFACE.length);
});

test('守卫② id 唯一：数据层 437/437 ＋ 子功能 54/54（红点：id 派生规则碰撞）', () => {
  const ids = flat(sceneData).map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length);
  const subgroupIds = sceneData.groups.flatMap((g) => g.subgroups.map((s) => s.id));
  assert.equal(new Set(subgroupIds).size, subgroupIds.length);
  assert.ok(subgroupIds.every((id, i, all) => all.indexOf(id) === i));
});
