/** #974 · 备忘录 HELP 资产重写不变式（30 场景逐句重写＋kind 全量标注）。
 *
 * 本件锁的是**重写口径本身**（生成器与资产两侧都要成立），与 #243 的 DOM 尺子、#228 的载荷锁分工：
 *   #228 锁载荷键集与计数；#243 锁渲染后 DOM；本件锁「正文与字段的形状」——首行形、无骨架残留、
 *   无裸预置值、`{{name}}` 集＝字段集、kind 闭集与 `(选填)`／`required` 一致、标题与唤醒词一致。
 *
 * 为什么单列一件：这六条是 #974 的交付口径，散进 #228／#243 会让那两件的票面范围外溢；
 * 重写变了、口径没变时，应该只有本件红。
 *
 * 规范：`.scratch/help-prompt-rewrite/PROMPT-REWRITE.md`（卡路里标杆，口径取其关闭后终态）；
 * kind 闭集：`.scratch/help-detail-kind/REPORT.md` §3。
 *
 * 跑法（只构建本包，禁仓根 `tsc -b`，见 #241）：
 *   node node_modules/typescript/bin/tsc --build packages/skill-memo-ilife/tsconfig.json
 *   node --test packages/skill-memo-ilife/test/t974-help-rewrite.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MEMO_HELP_GROUPS } from '../dist/help/sceneData.js';

const SCENES = MEMO_HELP_GROUPS.flatMap((g) => g.subgroups.flatMap((s) => s.scenes));
const KINDS = ['text', 'number', 'select', 'date', 'week'];
const firstLine = (w) => '请你加载技能 备忘录,执行唤醒词「' + w + '」。';

/** 正文里的人话部分（剥掉 `{{name}}` 机器键）：实现记号扫描只看它。 */
const proseOf = (tpl) => tpl.replace(/\{\{[a-z0-9_]+\}\}/g, '');

test('#974 ① 30 场景逐句重写：首行形／无骨架残留／无裸预置值', () => {
  assert.equal(SCENES.length, 30, '资产仍是 30 场景');
  for (const s of SCENES) {
    assert.ok(s.prompt_template.startsWith(firstLine(s.wake_word)),
      s.id + ' 首行不是约定形：「' + s.prompt_template.split('\n')[0] + '」');
    const prose = proseOf(s.prompt_template);
    for (const banned of ['请按以下格式', '期望效果', '无需参数', '_____________', '____']) {
      assert.equal(prose.includes(banned), false, s.id + ' 正文仍有骨架残留：' + banned);
    }
    assert.equal(/\d{4}-\d{2}-\d{2}/.test(prose), false, s.id + ' 正文里有裸 ISO 日期（格式只许住 hint）');
    assert.equal(/\d{4}-W\d{2}/.test(prose), false, s.id + ' 正文里有 ISO 周串');
  }
});

test('#974 ② 正文 `{{name}}` 集＝字段集，且参数行按字段序一行一参', () => {
  for (const s of SCENES) {
    const fields = s.editable_fields || [];
    const holes = [...s.prompt_template.matchAll(/\{\{([a-z0-9_]+)\}\}/g)].map((m) => m[1]);
    assert.deepEqual(holes, fields.map((f) => f.name),
      s.id + ' 正文占位与字段名不是同一串同序：占位 ' + JSON.stringify(holes) + '，字段 ' + JSON.stringify(fields.map((f) => f.name)));
    assert.equal(new Set(fields.map((f) => f.name)).size, fields.length, s.id + ' 字段名有重复');
    const paramLines = s.prompt_template.split('\n').filter((l) => /\{\{[a-z0-9_]+\}\}$/.test(l));
    assert.equal(paramLines.length, fields.length, s.id + ' 参数行数 ≠ 字段数');
    fields.forEach((f, i) => {
      assert.equal(paramLines[i], f.label + ':{{' + f.name + '}}',
        s.id + ' 第 ' + (i + 1) + ' 行不是「标签:占位」形：' + paramLines[i]);
    });
  }
});

test('#974 ③ kind 闭集／select 带非空 options／`(选填)` 与 required 一致／无预置值', () => {
  for (const s of SCENES) {
    for (const f of s.editable_fields || []) {
      assert.ok(KINDS.includes(f.kind), s.id + '/' + f.name + ' kind 不在闭集：' + String(f.kind));
      assert.equal(f.value, '', s.id + '/' + f.name + ' value 非空串（不预置值）');
      assert.equal(/\(选填\)$/.test(f.label), f.required === false,
        s.id + '/' + f.name + ' 标签的 (选填) 与 required 不一致');
      if (f.kind === 'select') {
        assert.ok(Array.isArray(f.options) && f.options.length > 0, s.id + '/' + f.name + ' select 缺非空 options');
      } else {
        assert.equal(f.options, undefined, s.id + '/' + f.name + ' 非 select 带了 options');
      }
      assert.equal(typeof f.hint, 'string', s.id + '/' + f.name + ' hint 必须是字符串');
      assert.equal(typeof f.label, 'string', s.id + '/' + f.name + ' label 必须是字符串');
    }
  }
});

test('#974 ④ 计数与 kind 分布（当场读数，计划变更即改这里）', () => {
  const withFields = SCENES.filter((s) => Array.isArray(s.editable_fields));
  const fields = withFields.flatMap((s) => s.editable_fields);
  assert.equal(withFields.length, 27, '带字段场景 27');
  assert.equal(fields.length, 60, '字段 60');
  assert.equal(SCENES.filter((s) => s.editable_fields === undefined).length, 3,
    '零参场景 3：不发空数组（`editable_fields` 缺席，沿 REPORT §2.4）');
  const dist = {};
  for (const f of fields) dist[f.kind] = (dist[f.kind] || 0) + 1;
  assert.deepEqual(dist, { text: 43, select: 10, date: 7 },
    '本家 60 条落在 text／select／date 三种；number／week 零实例');
});

test('#974 ⑤ 标题＝唤醒词；撞名的两处（备忘改分类）按标题区分', () => {
  const disambiguated = new Set(['memo_batch_change_category']);
  for (const s of SCENES) {
    if (disambiguated.has(s.id)) {
      assert.notEqual(s.title, s.wake_word, s.id + ' 与另一场景共用唤醒词，标题必须区分');
    } else {
      assert.equal(s.title, s.wake_word, s.id + ' 标题应与唤醒词一致（卡路里 430/437 同款）');
    }
  }
  const shared = SCENES.filter((s) => s.wake_word === '备忘改分类').map((s) => s.id);
  assert.deepEqual(shared, ['memo_change_category_single', 'memo_batch_change_category'],
    '共用词就这两处，别处再撞名要显式进本件的区分名单');
});

test('#974 ⑥ 路由面一行未动：唤醒词与别名仍是老骨架那一套', () => {
  const words = SCENES.map((s) => s.wake_word);
  assert.equal(words.length, new Set(words).size + 1, '唤醒词只有一处重复（备忘改分类）');
  assert.deepEqual(SCENES.filter((s) => s.aliases).map((s) => s.id).sort(),
    ['memo_add_basic', 'memo_add_mood', 'memo_batch_change_category', 'memo_change_subcategory',
      'memo_complete_wish', 'memo_delete_mood', 'memo_init_setup', 'memo_reminders_active',
      'memo_search_mood', 'memo_update_mood'].sort(), '别名仍挂在原来那 10 个场景上（共 12 条）');
  for (const s of SCENES) assert.equal(s.status, '', s.id + ' 的 status 只许空串（不标缺失）');
});
