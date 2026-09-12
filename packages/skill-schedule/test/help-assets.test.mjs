// #201 · 作息 HELP 内容资产锁：旧 HELP 85 条场景逐字 ＋ 三层分组对账 ＋ 待开发标记 ＋ 可重跑。
// 事实源在 `.scratch/`（工作副本，不入库），故「逐条对账」与「可重跑」在源不在盘时跳过；
// 源不在盘时改由摘要锁钉住内容（改一个字即变红）。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  HELP_GROUPS, HELP_ASSETS, HELP_SCENE_RESULTS, HELP_GROUP_NOTES, HELP_TOTALS,
} from '../dist/help/scenes/help-assets.js';
import { NO_COMMAND_WAKE_WORDS } from '../scripts/gen-help-assets.mjs';

const PKG_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(PKG_DIR, '..', '..', '.scratch', 't198', 'old-scenarios.json');
const ASSET = join(PKG_DIR, 'src', 'help', 'scenes', 'help-assets.ts');
const GEN = join(PKG_DIR, 'scripts', 'gen-help-assets.mjs');
const HAS_SOURCE = existsSync(SRC);
const SKIP_NO_SOURCE = HAS_SOURCE ? false : '事实源不在盘上（.scratch 不入库）';

/** `status` 的两值（契约 `SCENE_STATUS`）。 */
const PENDING = '【待开发】';

/** 「今天没有命令可执行」的唤醒词清单只在生成器里写一份（上面 import 的导出），本测试不再抄第二份；
 *  文档里的那份（`docs/skills/skill-schedule/t198-old-help-truth.md` §三）不在代码路径上，不参与断言。
 *  下面「待开发标记」用例另保留对源数据的独立存在性断言：否则清单写错时产物与期望一起错、
 *  集合等式照样通过，这份复核就失效了。 */

/** 85 条场景的规范形（id／标题／唤醒词／状态／prompt 全文／各字段）sha256——内容锁。 */
const DIGEST_SCENES = '5b8556ad3e153614b659f79642a5c7118e0f784d2bdfcd82f45fbdde553d46a7';
/** 85 条 prompt 逐一拼接（`\n`）的 sha256——「逐字零差异」锁（双方各算一遍，不比对方的话术）。 */
const DIGEST_PROMPTS = '38fc4b4fb53917576ea2af84bb150a90cbf967b5c44f536c0e892b50406565a5';

/** 规范形：与生成器各写一份，互为独立复核。 */
function canonicalScenes(scenes) {
  return JSON.stringify(scenes.map((s) => [
    s.id, s.title, s.wake_word, s.status, s.prompt_template,
    s.editable_fields.map((f) => [f.name, f.label, f.value, f.hint, f.required]),
  ]));
}

function digest(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

/** 源的扁平场景（照源里的先后次序）。 */
function sourceScenes(payload) {
  return payload.categories.flatMap((c) => c.wake_words.flatMap((w) => w.scenarios));
}

function sourcePayload() {
  return JSON.parse(readFileSync(SRC, 'utf8'));
}

/** 源场景按验收面该有的状态：源自标待开发照旧；属无命令唤醒词者补标。 */
function expectedStatus(scene) {
  if (scene.status !== '') return scene.status;
  return NO_COMMAND_WAKE_WORDS.includes(scene.wake_word) ? PENDING : '';
}

describe('#201 作息 HELP 内容资产', () => {
  it('三层结构：分组／唤醒词／场景条条数得出，二级组场景非空', () => {
    const subgroups = HELP_GROUPS.flatMap((g) => g.subgroups);
    assert.equal(HELP_TOTALS.groups, HELP_GROUPS.length);
    assert.equal(HELP_TOTALS.subgroups, subgroups.length);
    assert.equal(HELP_TOTALS.scenes, HELP_ASSETS.length);
    assert.equal(HELP_TOTALS.scenes, subgroups.reduce((n, s) => n + s.scenes.length, 0));
    assert.equal(HELP_TOTALS.pending, HELP_ASSETS.filter((s) => s.status !== '').length);
    for (const sub of subgroups) assert.ok(sub.scenes.length >= 1, sub.id + ' 没有场景（契约 scenes[] 非空）');
    const ids = HELP_ASSETS.map((s) => s.id);
    assert.equal(new Set(ids).size, ids.length, '场景 id 必须全局唯一');
    assert.equal(new Set(HELP_GROUPS.map((g) => g.id)).size, HELP_GROUPS.length);
    assert.equal(new Set(subgroups.map((s) => s.id)).size, subgroups.length);
  });

  it('字段闭集与两态状态（多一个键即被共享 help 模板拒收）', () => {
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
          for (const f of s.editable_fields) {
            assert.equal(keys(f), 'hint,label,name,required,value', s.id + ' 的字段越界');
            assert.ok(f.hint.length > 0, s.id + '／' + f.name + ' 的说明为空（源说明一律逐字带走）');
            assert.equal(typeof f.required, 'boolean');
          }
        }
      }
    }
  });

  it(`逐条对账：与源数据 ${HELP_GROUPS.length} 个分组／${HELP_GROUPS.flatMap((g) => g.subgroups).length} 条唤醒词／${HELP_ASSETS.length} 条场景逐条对得上`, { skip: SKIP_NO_SOURCE }, () => {
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
      assert.equal(HELP_GROUP_NOTES[g.id], c.desc, g.id + ' 的分组说明丢失');
      assert.equal(g.subgroups.length, c.wake_words.length);
      c.wake_words.forEach((w, si) => {
        const sub = g.subgroups[si];
        assert.equal(sub.label, w.wake_word, '唤醒词次序／名字不符');
        assert.equal(sub.scenes.length, w.scenarios.length);
        w.scenarios.forEach((s) => {
          const scene = HELP_ASSETS[sceneIndex];
          assert.equal(scene.id, s.scenario_id);
          assert.equal(scene.title, s.scenario_title);
          assert.equal(scene.wake_word, s.wake_word);
          assert.equal(scene.status, expectedStatus(s), s.scenario_id + ' 的待开发标记不符');
          assert.equal(HELP_SCENE_RESULTS[scene.id], s.result, s.scenario_id + ' 的结果说明丢失');
          assert.deepEqual(scene.editable_fields, Object.entries(s.dimensions).map(([name, raw]) => ({
            name,
            label: name,
            value: '',
            hint: typeof raw === 'string' ? raw : JSON.stringify(raw),
            required: false,
          })), s.scenario_id + ' 的参数转换不符');
          sceneIndex += 1;
        });
      });
    });
    assert.equal(sceneIndex, HELP_ASSETS.length);
    assert.equal(Object.keys(HELP_SCENE_RESULTS).length, HELP_ASSETS.length, '结果说明条数不符');
    assert.equal(Object.keys(HELP_GROUP_NOTES).length, HELP_GROUPS.length, '分组说明条数不符');
  });

  it(`${HELP_ASSETS.length} 条 prompt 零差异：逐条逐字节比`, { skip: SKIP_NO_SOURCE }, () => {
    const scenes = sourceScenes(sourcePayload());
    assert.equal(HELP_ASSETS.length, scenes.length);
    scenes.forEach((s, i) => {
      assert.equal(Buffer.compare(
        Buffer.from(HELP_ASSETS[i].prompt_template, 'utf8'),
        Buffer.from(s.prompt, 'utf8'),
      ), 0, s.scenario_id + ' 的 prompt 有差异');
    });
  });

  it('摘要锁：内容摘要与 prompt 摘要都钉死，源侧各算一遍也对得上', () => {
    assert.equal(digest(canonicalScenes(HELP_ASSETS)), DIGEST_SCENES);
    assert.equal(digest(HELP_ASSETS.map((s) => s.prompt_template).join('\n')), DIGEST_PROMPTS);
    const text = readFileSync(ASSET, 'utf8');
    assert.ok(!text.includes('\uFFFD'), '资产出现替换字符（UTF-8 写入坏了）');
    assert.ok(!text.includes('\r'), '资产不得带回车（仓库口径 LF）');
    if (HAS_SOURCE) {
      const scenes = sourceScenes(sourcePayload());
      assert.equal(digest(scenes.map((s) => s.prompt).join('\n')), DIGEST_PROMPTS,
        '源侧算出的 prompt 摘要与锁不符——源或资产被改过');
    }
  });

  it(`待开发标记：源自标项 ＋ 无命令唤醒词下辖项，共 ${HELP_ASSETS.filter((s) => s.status !== '').length} 条`, { skip: SKIP_NO_SOURCE }, () => {
    const scenes = sourceScenes(sourcePayload());
    const expected = scenes.filter((s) => expectedStatus(s) !== '').map((s) => s.scenario_id).sort();
    const actual = HELP_ASSETS.filter((s) => s.status !== '').map((s) => s.id).sort();
    assert.deepEqual(actual, expected, '待开发集合必须逐条等于源侧推出的集合（不写死条数）');
    assert.ok(actual.includes('record_add_illegal_category'), '源自标待开发的场景必须在其中');
    const sourceWakeWords = new Set(scenes.map((s) => s.wake_word));
    for (const word of NO_COMMAND_WAKE_WORDS) {
      assert.ok(sourceWakeWords.has(word), '源里没有这条唤醒词：' + word);
      const under = HELP_ASSETS.filter((s) => s.wake_word === word);
      assert.ok(under.length >= 1, '产物里没有这条唤醒词下辖的场景：' + word);
      for (const s of under) assert.equal(s.status, PENDING, word + ' 下辖场景应标待开发：' + s.id);
    }
  });

  it('可重跑：生成器 --check 与仓库内资产字节一致', { skip: SKIP_NO_SOURCE }, () => {
    const out = execFileSync(process.execPath, [GEN, '--check'], { encoding: 'utf8' });
    assert.match(out, /一致：/);
    assert.doesNotMatch(out, /不一致/);
  });
});
