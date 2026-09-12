/** #213 · 私家大厨 HELP 内容资产的自检锁：typed const → `SceneData` → 包根校验器 ＋ 三条自补断言。
 *
 * 为什么要有这一件：生产路（A 路 `renderHelpShellHtml`）对资产**几乎无校验**——全文唯一一句是 `groups` 非空，
 * 写错 id／枚举／字段名不报错、只有肉眼能发现。所以本件把**包根**的 `renderHelpShell`（带完整 fail-closed 校验，
 * 四码 `duplicate-id`／`status-invalid`／`types-invalid`／`schema-invalid`）当**校验探针**用——与兄弟件
 * `packages/skill-memo-ilife/test/help-file-228.test.mjs:9-16`／`:120-152` 同法（那边连探针的隔离都做了一遍）。
 * ⚠️ 校验器**只在测试里跑**：生产路不跑——校验失败该在 CI 红，不该让用户的 HELP 现场报错。
 *
 * 本件管**语义**（计数／枚举／逐条映射／探针有没有牙）；**字节一致**归生成器的 `--check`
 * （`node packages/skill-chef/scripts/gen-help-assets.mjs --check`，含三把 sha256 摘要锁）。
 *
 * 跑法（**只构建本包**，禁仓级 `tsc -b`）：
 *   node node_modules/typescript/bin/tsc --build packages/skill-chef/tsconfig.json
 *   node --test packages/skill-chef/test/scene-data.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
// ⚠️ 校验器在**包根**：`base-paint/help-shell` 子路径导出的 `renderHelpShell` 只是 `renderHelpShellHtml` 的别名
//    （生成物里逐字 `typeof renderHelpShellHtml`），**不做 schema 校验**。
import { renderHelpShell } from 'base-paint';
import { CHEF_SCENES, buildChefSceneData } from '../dist/help/sceneData.js';
import * as pkg from '../dist/index.js';

/** B 路校验器的探针用最小资产（`TemplateAssets` 两件即可，本探针只走校验那一步）。 */
const ASSETS = { sharedHelpersJs: '/*js*/', sharedCssText: '/*css*/' };
const probe = (sceneData) => {
  try { renderHelpShell({ sceneData, assets: ASSETS }); return null; } catch (e) { return e; }
};

const DATA = buildChefSceneData();
const GROUPS = DATA.groups;
const SUBS = GROUPS.flatMap((g) => g.subgroups);
const SCENES = SUBS.flatMap((s) => s.scenes);
const FIELDS = SCENES.flatMap((s) => s.editable_fields || []);

/** 十域（逐字；出处＝老技能 `scenes/*.yaml` 的文件级 `domain:` 块，t2 §一／§二 ＋ t236 §1.2）。 */
const DOMAINS = [
  ['cook', '做菜', '🍳'], ['view', '查看', '👀'], ['search', '搜索筛选', '🔍'], ['update', '修改', '✏️'],
  ['history', '历史', '📜'], ['shopping', '采购', '🛒'], ['add', '录入', '📝'], ['relation', '派生', '🌿'],
  ['setup', '开始使用', '🚀'], ['data', '数据管理', '🗄️'],
];

/** 13 个不在 `WAKE_TABLE`（`src/policy/wakewords.ts`）的老组名 → 该组下**应**标 `'【待开发】'` 的卡（t2 §3.2）。 */
const PENDING = {
  筛选难度: ['filter_difficulty_easy'],
  筛选时间: ['filter_time_quick'],
  筛选炊具: ['filter_by_cookware'],
  筛选状态: ['filter_by_status'],
  修改步骤: ['update_step_content'],
  修改食材: ['update_ingredient'],
  导入食谱: ['import_from_json', 'import_validation_failed'],
  添加派生关系: ['add_relation'],
  查看派生关系: ['view_relation_tree'],
  首次使用: ['first_use'],
  批量改: ['data_batch_edit'],
  备份: ['data_export_backup'],
  从已有派生新菜: ['derive_from_existing'],
};

/** 老件 11 种 `type` 字符串拆出来的原子（`t2` §七 映射口径：按 `+` 拆、去括号注）。 */
const TYPE_ATOMS = ['向导', '选择', '回执', '查看', '对比', '确认', '采集', '勾选', '转移'];

test('#213 探针有牙：四码逐条生效，本票资产全过', () => {
  assert.equal(probe(DATA), null, '本票资产必须过 B 路四道校验');
  const one = (scene) => ({
    skill_name: 'X', title: 'Y',
    groups: [{ id: 'g', label: 'g', subgroups: [{ id: 'g1', label: 'g1', scenes: [scene] }] }],
  });
  const good = { id: 'a', title: 'A', wake_word: 'w', status: '', prompt_template: 'p' };
  assert.equal(probe(one(good)), null, '对照件必须过（否则下面的失败证明不了探针有牙）');
  const cases = [
    ['duplicate-id', one(good), (d) => d.groups[0].subgroups[0].scenes.push({ ...good })],
    ['status-invalid', one({ ...good, status: '待开发' }), null],
    ['types-invalid', one({ ...good, types: [1] }), null],
    ['schema-invalid', one({ ...good, editable_fields: [{ name: 'n', label: 'l' }] }), null],
  ];
  for (const [code, data, mutate] of cases) {
    if (mutate) mutate(data);
    const e = probe(data);
    assert.ok(e, code + ' 该抛而没抛（探针没牙）');
    assert.equal(e.name, 'HelpSchemaError');
    assert.equal(e.code, code);
  }
});

test('#213 三层计数：10 域／33 组／48 卡（分别钉死，防以后改资产静默漂移）', () => {
  assert.equal(GROUPS.length, 10, '域数');
  assert.equal(SUBS.length, 33, '组数');
  assert.equal(SCENES.length, 48, '卡数');
  assert.equal(new Set(GROUPS.map((g) => g.id)).size, 10, '域 id 唯一');
  assert.equal(new Set(SUBS.map((s) => s.id)).size, 33, '组 id 唯一');
  assert.equal(new Set(SCENES.map((s) => s.id)).size, 48, '卡 id 唯一');
  // 字段账：42 键／80 条 − 丁类畸形键 1 条（值 null，过不了 `value: string`）＝ 41 键／79 条
  assert.equal(SCENES.filter((s) => s.editable_fields).length, 46, '带参数卡的卡数');
  assert.equal(FIELDS.length, 79, '参数条数');
  assert.equal(new Set(FIELDS.map((f) => f.name)).size, 41, '参数键唯一数');
});

test('#213 十域 id／label／icon 逐字 ∈ 定案表（顺序也钉）', () => {
  assert.deepEqual(GROUPS.map((g) => [g.id, g.label, g.icon]), DOMAINS);
});

test("#213 status：恰好 14 张标 '【待开发】'，且 id ↔ 13 个老组名逐条对得上", () => {
  const dev = SCENES.filter((s) => s.status === '【待开发】');
  assert.equal(dev.length, 14, '待开发卡数');
  assert.equal(SCENES.filter((s) => s.status === '').length, 34, '可用卡数');
  assert.deepEqual([...new Set(dev.map((s) => s.wake_word))].sort(), Object.keys(PENDING).sort(), '14 张卡落在恰好这 13 个组名上');
  for (const [group, ids] of Object.entries(PENDING)) {
    assert.deepEqual(dev.filter((s) => s.wake_word === group).map((s) => s.id), ids, group);
  }
  const shouldBePending = new Set(Object.values(PENDING).flat());
  for (const s of SCENES) {
    assert.ok(s.status === '' || s.status === '【待开发】', s.id + ' 的 status 出枚举');
    assert.equal(s.status === '【待开发】', shouldBePending.has(s.id), s.id + ' 的状态与组名归位不一致');
  }
});

test('#213 卡面 chip（`wake_word`）＝ 所属组名，且 33 个组名逐字保留老骨架', () => {
  for (const sub of SUBS) {
    for (const s of sub.scenes) assert.equal(s.wake_word, sub.id, s.id + ' 的 chip ≠ 组名');
  }
  assert.deepEqual(SUBS.map((s) => s.id), [
    '做菜模式', '查看食谱', '查看食材', '查看步骤', '查看营养', '查看背景', '搜索食谱', '筛选菜系', '筛选食材',
    '筛选难度', '筛选时间', '筛选炊具', '筛选口味', '筛选季节', '筛选状态', '查看全部', '修改食谱', '修改步骤',
    '修改食材', '废弃食谱', '记录做菜', '查看历史', '查看统计', '生成清单', '录入食谱', '导入食谱', '添加派生关系',
    '查看派生关系', '从已有派生新菜', '首次使用', '体检', '批量改', '备份',
  ], '二级组＝老 33 组，逐字且按域收组（`从已有派生新菜` 随域归位到「派生」）');
});

test('#213 逐字保真：48 段 prompt 原文在、双花括号填写位没被吃掉', () => {
  const holes = SCENES.filter((s) => s.prompt_template.includes('{{'));
  assert.equal(holes.length, 16, '含填写位的卡数（老件 `{{菜名}}` 15 处 ＋ `{{N}}` 1 处）');
  assert.equal(SCENES.reduce((n, s) => n + s.prompt_template.split('{{菜名}}').length - 1, 0), 15, '`{{菜名}}` 出现次数');
  for (const s of SCENES) {
    assert.ok(s.prompt_template.length > 0, s.id + ' 的 prompt 空');
    assert.ok(s.title.length > 0 && s.wake_word.length > 0, s.id + ' 的 title／wake_word 空');
    assert.equal('type' in s, false, s.id + ' 不许留单数 `type`（契约唯一字段名是 `types`）');
    assert.equal(s.prompt_template.includes('过程型'), false, s.id + ' 的 prompt 混进了括号注');
  }
});

test('#213 `types`：全是老 11 种取值的拆分原子，括号注已去', () => {
  for (const s of SCENES) {
    assert.ok(Array.isArray(s.types) && s.types.length > 0, s.id + ' 的 types 非空数组');
    for (const t of s.types) assert.ok(TYPE_ATOMS.includes(t), s.id + ' 的 types 出表：' + t);
  }
  const used = new Set(SCENES.flatMap((s) => s.types));
  assert.deepEqual([...used].sort(), [...TYPE_ATOMS].sort(), '9 个原子全用到');
});

test('#213 `editable_fields`：name／label／value 全是非空 string，唯一那条 hint 逐字', () => {
  for (const f of FIELDS) {
    for (const k of ['name', 'label', 'value']) assert.equal(typeof f[k], 'string', '字段 ' + k);
    assert.ok(f.name && f.label && f.value, '字段三键非空');
    assert.equal(f.label, f.name, 'label 取键名逐字（不自造中文名）');
  }
  const fixed = FIELDS.filter((f) => f.hint);
  assert.equal(fixed.length, 1, '全图唯一一条 hint（t2 丁类定案）');
  assert.deepEqual(fixed[0], {
    name: 'include_archived', label: 'include_archived', value: '是否含已废弃(选填',
    hint: '是否含已废弃(选填，默认不含)',
  });
});

test('#213 `SceneData` 顶层：键集是 4 个，`title` 含技能名（标签页不重复）', () => {
  assert.deepEqual(Object.keys(DATA).sort(), ['groups', 'skill_name', 'title', 'version']);
  assert.equal(DATA.skill_name, '私家大厨');
  assert.equal(DATA.title.includes(DATA.skill_name), true, '`composeDocTitle` 走原样支');
  assert.equal(DATA.version, '0.1.0');
  assert.equal(DATA.groups, CHEF_SCENES, 'groups 直接引资产本体，不复制一份');
});

test('#213 出口：两个名字都从包根可及，且是同一个东西', () => {
  assert.equal(pkg.CHEF_SCENES, CHEF_SCENES);
  assert.equal(pkg.buildChefSceneData, buildChefSceneData);
  assert.equal(pkg.buildChefSceneData().groups, CHEF_SCENES);
});
