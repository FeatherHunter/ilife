// #975 · 作息 HELP 内容资产锁（重写后）：结构对账（fixture）＋内容对账（重写表）＋信息不丢失台账
// ＋正文门（`{{name}}`＝字段表）＋kind 闭集 ＋ 待开发标记 ＋ 可重跑。
//
// 事实源两个（与生成器 `scripts/gen-help-assets.mjs` 同一套，但实现各写一份，互为复核）：
//  1. 结构＝`test/fixtures/t198-old-scenarios.json`（受跟踪的老实物取证，**一个字不改**）；
//  2. 内容＝`scripts/help-rewrite-table.mjs`（#975 逐句重写表，分域住 `scripts/help-rewrite/`）。
// #312 的教训仍生效：源不在盘就是仓库坏了，**直接红**，不许退化成「跳过也算绿」。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HELP_GROUPS, HELP_ASSETS, HELP_TOTALS } from '../dist/help/scenes/help-assets.js';
import { NO_COMMAND_WAKE_WORDS, bareWake } from '../scripts/gen-help-assets.mjs';
import { REWRITE, REWRITE_COUNTS } from '../scripts/help-rewrite-table.mjs';

const PKG_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(PKG_DIR, 'test', 'fixtures', 't198-old-scenarios.json');
const ASSET = join(PKG_DIR, 'src', 'help', 'scenes', 'help-assets.ts');
const GEN = join(PKG_DIR, 'scripts', 'gen-help-assets.mjs');

/** `status` 的两值（契约 `SCENE_STATUS`）。 */
const PENDING = '【待开发】';
/** kind 闭集（与 `packages/base-render/src/spec/help.ts` 的 `SceneFieldKind` 同集）。 */
const KINDS = ['text', 'number', 'select', 'date', 'week', 'month', 'year', 'time'];
/** 字段键：必有的 ＋ 允许的附属。 */
const FIELD_REQUIRED = ['name', 'label', 'value', 'kind'];
const FIELD_OPTIONAL = ['hint', 'required', 'options', 'min', 'max', 'step', 'placeholder'];

/** 85 条场景的规范形（id／标题／唤醒词／状态／prompt 全文／各字段全量键）sha256——内容锁。 */
const DIGEST_SCENES = 'c2d0375ccedf2cbf4554a37bff167f42fee1731ee564e1627cd2aa5a7f662951';
/** 85 条 prompt 逐一拼接（`\n`）的 sha256——「重写后的正文逐字」锁（重写表与产物各算一遍）。 */
const DIGEST_PROMPTS = 'ebdea29d4be9253274a08f7e2ba126bd1daec195cec5ddca2c249a1938d2212a';

/** 规范形（与生成器各写一份，互为独立复核）。 */
function canonicalField(f) {
  return [
    f.name, f.label, f.value, f.kind || 'text', f.required === true,
    f.hint === undefined ? null : f.hint,
    f.options === undefined ? null : f.options,
    f.min === undefined ? null : f.min,
    f.max === undefined ? null : f.max,
    f.step === undefined ? null : f.step,
    f.placeholder === undefined ? null : f.placeholder,
  ];
}
function canonicalScenes(scenes) {
  return JSON.stringify(scenes.map((s) => [
    s.id, s.title, s.wake_word, s.status, s.prompt_template,
    s.editable_fields.map(canonicalField),
  ]));
}
function digest(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

/** 源的扁平场景（照源里的先后次序）。 */
function sourceScenes(payload) {
  return payload.categories.flatMap((c) => c.wake_words.flatMap((w) => w.scenarios));
}
/** 读事实源。**fixture 缺了即红**（#312：受跟踪件丢了就是仓库坏了）。 */
function sourcePayload() {
  assert.ok(existsSync(SRC), '受跟踪事实源缺失：' + SRC + '（#312：不许静默跳过）');
  return JSON.parse(readFileSync(SRC, 'utf8'));
}
/** 源场景按验收面该有的状态：源自标待开发照旧；属无命令唤醒词者补标（唤醒词一律按裸词比）。 */
function expectedStatus(scene) {
  if (scene.status !== '') return scene.status;
  return NO_COMMAND_WAKE_WORDS.includes(bareWake(scene.wake_word)) ? PENDING : '';
}

describe('#975 作息 HELP 内容资产（重写后）', () => {
  it('三层结构：分组／唤醒词／场景条条数得出，二级组场景非空', () => {
    const subgroups = HELP_GROUPS.flatMap((g) => g.subgroups);
    assert.equal(HELP_TOTALS.groups, HELP_GROUPS.length);
    assert.equal(HELP_TOTALS.subgroups, subgroups.length);
    assert.equal(HELP_TOTALS.scenes, HELP_ASSETS.length);
    assert.equal(HELP_TOTALS.scenes, subgroups.reduce((n, s) => n + s.scenes.length, 0));
    assert.equal(HELP_TOTALS.pending, HELP_ASSETS.filter((s) => s.status !== '').length);
    assert.equal(HELP_TOTALS.fields, HELP_ASSETS.reduce((n, s) => n + s.editable_fields.length, 0));
    for (const sub of subgroups) assert.ok(sub.scenes.length >= 1, sub.id + ' 没有场景（契约 scenes[] 非空）');
    const ids = HELP_ASSETS.map((s) => s.id);
    assert.equal(new Set(ids).size, ids.length, '场景 id 必须全局唯一');
    assert.equal(new Set(HELP_GROUPS.map((g) => g.id)).size, HELP_GROUPS.length);
    assert.equal(new Set(subgroups.map((s) => s.id)).size, subgroups.length);
  });

  it('场景与字段的键闭集：多一个键即被共享 help 模板拒收；kind 在闭集内；附属只给该 kind 用得上的', () => {
    const keys = (o) => Object.keys(o).sort().join(',');
    for (const g of HELP_GROUPS) {
      assert.equal(keys(g), 'icon,id,label,subgroups', g.id + ' 分组字段越界');
      for (const sub of g.subgroups) {
        assert.equal(keys(sub), 'id,label,scenes', sub.id + ' 二级组字段越界');
        for (const s of sub.scenes) {
          assert.equal(keys(s), 'editable_fields,id,prompt_template,status,title,wake_word', s.id + ' 场景字段越界');
          assert.ok(s.status === '' || s.status === PENDING, s.id + ' 状态越出两值：' + s.status);
          assert.ok(s.prompt_template.length > 0, s.id + ' prompt 为空');
          assert.ok(s.wake_word.length > 0, s.id + ' 唤醒词为空');
          assert.equal(/^#\d+\s|^T\d+\s/.test(s.wake_word), false, s.id + ' 唤醒词还带序号前缀：' + s.wake_word);
          for (const f of s.editable_fields) {
            const fk = Object.keys(f);
            for (const k of FIELD_REQUIRED) assert.ok(fk.includes(k), s.id + '／' + f.name + ' 缺必有键 ' + k);
            for (const k of fk) {
              assert.ok(FIELD_REQUIRED.includes(k) || FIELD_OPTIONAL.includes(k),
                s.id + '／' + f.name + ' 出现闭集外的键 ' + k);
            }
            assert.match(f.name, /^[a-z][a-z0-9_]*$/, s.id + '／字段名不合 snake_case：' + f.name);
            assert.ok(KINDS.includes(f.kind), s.id + '／' + f.name + ' kind 越出闭集：' + f.kind);
            assert.equal(f.value, '', s.id + '／' + f.name + ' 的 value 必须空串（无预置值）');
            assert.equal(typeof f.required, 'boolean', s.id + '／' + f.name + ' required 不是布尔');
            assert.ok(typeof f.label === 'string' && f.label.length > 0, s.id + '／' + f.name + ' label 为空');
            if (f.hint !== undefined) assert.ok(f.hint.length > 0, s.id + '／' + f.name + ' hint 是空串');
            if (f.kind === 'select') {
              assert.ok(Array.isArray(f.options) && f.options.length > 0,
                s.id + '／' + f.name + ' 是 select 却没给非空 options');
            } else {
              assert.equal(f.options, undefined, s.id + '／' + f.name + ' 不是 select 却给了 options');
            }
            for (const k of ['min', 'max', 'step']) {
              if (f[k] !== undefined) assert.equal(f.kind, 'number', s.id + '／' + f.name + ' 不是 number 却给了 ' + k);
            }
          }
        }
      }
    }
  });

  it('逐条对账（结构面）：与源数据的分组／唤醒词／场景逐条对得上，唤醒词＝源去序号后的裸词', () => {
    const payload = sourcePayload();
    const groups = payload.categories;
    assert.equal(HELP_GROUPS.length, groups.length, '一级分组数不符');
    assert.equal(HELP_GROUPS.reduce((n, g) => n + g.subgroups.length, 0),
      groups.reduce((n, c) => n + c.wake_words.length, 0), '唤醒词数不符');
    assert.equal(HELP_ASSETS.length, sourceScenes(payload).length, '场景数不符');

    let sceneIndex = 0;
    groups.forEach((c, gi) => {
      const g = HELP_GROUPS[gi];
      assert.equal(g.id, c.key, '一级分组次序／标识不符');
      assert.equal(g.label, c.name);
      assert.equal(g.icon, c.icon);
      assert.equal(g.subgroups.length, c.wake_words.length);
      c.wake_words.forEach((w, si) => {
        const sub = g.subgroups[si];
        assert.equal(sub.label, bareWake(w.wake_word), '唤醒词次序／名字不符（应＝源去序号后的裸词）');
        assert.equal(sub.scenes.length, w.scenarios.length);
        w.scenarios.forEach((s) => {
          const scene = HELP_ASSETS[sceneIndex];
          assert.equal(scene.id, s.scenario_id);
          assert.equal(scene.wake_word, bareWake(s.wake_word), s.scenario_id + ' 的唤醒词不等于源裸词');
          assert.equal(scene.status, expectedStatus(s), s.scenario_id + ' 的待开发标记不符');
          sceneIndex += 1;
        });
      });
    });
    assert.equal(sceneIndex, HELP_ASSETS.length);
  });

  it('逐条对账（内容面）：标题／正文／字段表逐字等于重写表，且信息不丢失台账成立', () => {
    const payload = sourcePayload();
    const scenes = sourceScenes(payload);
    assert.equal(REWRITE.size, scenes.length, '重写表条数 ≠ 源场景数');
    let total = 0;
    for (const [k, n] of Object.entries(REWRITE_COUNTS)) total += n;
    assert.equal(total, scenes.length, '分域条数之和 ≠ 源场景数');

    for (const src of scenes) {
      const r = REWRITE.get(src.scenario_id);
      assert.ok(r, '重写表缺场景：' + src.scenario_id);
      const scene = HELP_ASSETS.find((s) => s.id === src.scenario_id);
      assert.equal(scene.title, r.title, src.scenario_id + ' 的标题与重写表不符');
      assert.equal(scene.prompt_template, r.prompt_template, src.scenario_id + ' 的正文与重写表不符');
      assert.deepEqual(scene.editable_fields, r.editable_fields.map((f) => ({
        name: f.name, label: f.label, value: '', kind: f.kind, required: f.required === true,
        ...(f.hint === undefined ? {} : { hint: f.hint }),
        ...(f.options === undefined ? {} : { options: [...f.options] }),
        ...(f.min === undefined ? {} : { min: f.min }),
        ...(f.max === undefined ? {} : { max: f.max }),
        ...(f.step === undefined ? {} : { step: f.step }),
        ...(f.placeholder === undefined ? {} : { placeholder: f.placeholder }),
      })), src.scenario_id + ' 的字段表与重写表不符');

      /* 信息不丢失台账：老维度名要么在新字段里、要么在重写表的 drops 里具名声明（独立再算一遍）。 */
      const names = r.editable_fields.map((f) => f.name);
      const drops = r.drops || [];
      for (const old of Object.keys(src.dimensions)) {
        assert.ok(names.includes(old) || drops.includes(old),
          '信息丢失未声明：' + src.scenario_id + ' 的老维度「' + old + '」既不在字段里也没进 drops');
      }
      for (const gone of drops) {
        assert.equal(names.includes(gone), false, 'drops 与字段重复：' + src.scenario_id + '／' + gone);
      }
    }
    assert.equal(REWRITE.size, new Set(scenes.map((s) => s.scenario_id)).size, '重写表有源里没有的 id');
  });

  it('正文门：`{{name}}` 与字段表同序一一对应、无 ____、无裸 ISO 日期、首行＝唤醒词行', () => {
    for (const s of HELP_ASSETS) {
      const found = [...s.prompt_template.matchAll(/\{\{([a-z][a-z0-9_]*)\}\}/g)].map((m) => m[1]);
      const names = s.editable_fields.map((f) => f.name);
      assert.deepEqual(found, names, s.id + ' 的正文占位与字段表不同序／不对应');
      assert.equal(s.prompt_template.includes('____'), false, s.id + ' 正文残留 ____');
      assert.equal(/\d{4}-\d{2}-\d{2}/.test(s.prompt_template), false, s.id + ' 正文残留裸 ISO 日期');
      assert.equal(s.prompt_template.split('\n')[0],
        '请你加载技能 作息管家,执行唤醒词「' + s.wake_word + '」。', s.id + ' 首行不是唤醒词行');
    }
  });

  it(`待开发标记：源自标项 ＋ 无命令唤醒词下辖项，共 ${HELP_ASSETS.filter((s) => s.status !== '').length} 条`, () => {
    const scenes = sourceScenes(sourcePayload());
    const expected = scenes.filter((s) => expectedStatus(s) !== '').map((s) => s.scenario_id).sort();
    const actual = HELP_ASSETS.filter((s) => s.status !== '').map((s) => s.id).sort();
    assert.deepEqual(actual, expected, '待开发集合必须逐条等于源侧推出的集合（不写死条数）');
    assert.ok(actual.includes('record_add_illegal_category'), '源自标待开发的场景必须在其中');
    const sourceWakeWords = new Set(scenes.map((s) => bareWake(s.wake_word)));
    for (const word of NO_COMMAND_WAKE_WORDS) {
      assert.ok(sourceWakeWords.has(word), '源里没有这条唤醒词：' + word);
      const under = HELP_ASSETS.filter((s) => s.wake_word === word);
      assert.ok(under.length >= 1, '产物里没有这条唤醒词下辖的场景：' + word);
      for (const s of under) assert.equal(s.status, PENDING, word + ' 下辖场景应标待开发：' + s.id);
    }
  });

  it('摘要锁：内容摘要与 prompt 摘要都钉死，源侧各算一遍也对得上', () => {
    assert.equal(digest(canonicalScenes(HELP_ASSETS)), DIGEST_SCENES);
    assert.equal(digest(HELP_ASSETS.map((s) => s.prompt_template).join('\n')), DIGEST_PROMPTS);
    const text = readFileSync(ASSET, 'utf8');
    assert.ok(!text.includes('\uFFFD'), '资产出现替换字符（UTF-8 写入坏了）');
    assert.ok(!text.includes('\r'), '资产不得带回车（仓库口径 LF）');
    /* 源侧各算一遍：正文摘要必须**等于锁**（源是结构源，正文由重写表给，故这里比的是重写表）。 */
    const scenes = sourceScenes(sourcePayload());
    const fromTable = scenes.map((s) => REWRITE.get(s.scenario_id).prompt_template).join('\n');
    assert.equal(digest(fromTable), DIGEST_PROMPTS, '重写表算出的 prompt 摘要与锁不符');
  });

  it('可重跑：生成器 --check 与仓库内资产字节一致', () => {
    const out = execFileSync(process.execPath, [GEN, '--check'], { encoding: 'utf8' });
    assert.match(out, /一致：/);
    assert.doesNotMatch(out, /不一致/);
  });
});
