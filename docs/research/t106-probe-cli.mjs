/** #106 只读探针（可复跑 · 断言式）：把本票两半决策的**事实底座**逐条打出来。
 *
 * 跑法（只读，不写共享产物）：
 *   node docs/research/t106-probe-cli.mjs
 * 机器可读摘要：末行 `RESULT: n/m fails=k`（fails>0 → exit 1）。
 *
 * 断言清单（每条对应报告里的一句结论）：
 *  A. 冻结契约没有 `cli` 字段（派单前提勘误）——`Scene` 机读属性集恒七键。
 *  B. 逐场景可执行 CLI 覆盖率 341/436（取 #81 路由层 exec 桶），且逐字等于路由 `cli`。
 *  C. SoT `main_prompt.cli` 原文里 376/436 是死命令（旧架构 python／mavis／mmx）→ 不能当展示面。
 *  D. 341 条 CLI 去重后 261 条 → 不能塞进 `Scene.id`（会 `duplicate-id`）。
 *  E. 变体 5 条／3 宿主，label 全部不可路由（非唤醒词／非别名／无路由）→ 「不补」的事实依据。
 *  F. 三态实测：file／inline 各 341 条 `data-field="cli"`，text 0 条且场景行恒 436。
 */
import { strict as assert } from 'node:assert';
import {
  buildHelpSceneData, helpSceneCli, renderHelpCenterHtml,
} from '../../packages/skill-calorie/dist/render/helpCenter.js';
import { TRIGGERS } from '../../packages/skill-calorie/dist/triggers/index.js';
import { routesFor } from '../../packages/skill-calorie/dist/triggers/routing.js';
import { isExecCli } from '../../packages/skill-calorie/dist/triggers/help-lookup.js';
import { SCENE_DATA_SCHEMA } from '../../packages/base-render/dist/spec/help.js';

let total = 0;
let fails = 0;
const check = (label, fn) => {
  total += 1;
  try { fn(); console.log('  ok  ' + label); } catch (error) {
    fails += 1;
    console.log('  FAIL ' + label + ' → ' + (error && error.message ? error.message : String(error)));
  }
};
const count = (haystack, needle) => haystack.split(needle).length - 1;
const flat = (data) => data.groups.flatMap((g) => g.subgroups.flatMap((s) => s.scenes));

const sceneData = buildHelpSceneData({ updatedAt: '2026-09-09 12:00' });
const scenes = flat(sceneData);
const file = renderHelpCenterHtml({ mode: 'file', updatedAt: '2026-09-09 12:00' });
const inline = renderHelpCenterHtml({ mode: 'inline', updatedAt: '2026-09-09 12:00' });
const text = renderHelpCenterHtml({ mode: 'text', updatedAt: '2026-09-09 12:00' });

const execCli = (wakeWord) => {
  const hit = routesFor(wakeWord).find((route) => route.kind === 'exec');
  return hit === undefined ? null : hit.cli;
};
const withCli = scenes.filter((scene) => helpSceneCli(scene.wake_word) !== null);
const deadRaw = TRIGGERS.filter((trigger) => !isExecCli(trigger.main_prompt.cli));

console.log('A. 冻结契约无 `cli` 字段');
const sceneProps = SCENE_DATA_SCHEMA.properties.groups.items.properties.subgroups
  .items.properties.scenes.items.properties;
check('Scene 机读属性集 = 七键（id/title/wake_word/types/status/prompt_template/editable_fields）', () => {
  assert.deepEqual(Object.keys(sceneProps).sort(),
    ['editable_fields', 'id', 'prompt_template', 'status', 'title', 'types', 'wake_word']);
  assert.equal('cli' in sceneProps, false, '契约里不应有 cli');
});

console.log('B. 逐场景可执行 CLI 覆盖 341/436');
check('exec 场景 341 条／non-exec 95 条', () => {
  assert.equal(scenes.length, 436);
  assert.equal(withCli.length, 341);
  assert.equal(scenes.length - withCli.length, 95);
});
check('每条 CLI 逐字等于路由层 exec 路由且形态恒 calorie-cmd-read calorie.*', () => {
  for (const scene of withCli) {
    const expected = execCli(scene.wake_word);
    assert.equal(helpSceneCli(scene.wake_word), expected, scene.wake_word);
    assert.ok(expected.startsWith('calorie-cmd-read calorie.'), expected);
  }
});
check('未知唤醒词返 null（不返空串冒充）', () => {
  assert.equal(helpSceneCli('不存在'), null);
});

console.log('C. SoT 原文 376/436 是死命令');
check('main_prompt.cli 可执行 60／死命令 376（python 370 ＋ mavis 3 ＋ mmx 2 ＋ 1 例外）', () => {
  assert.equal(TRIGGERS.length - deadRaw.length, 60);
  assert.equal(deadRaw.length, 376);
  const buckets = { python: 0, mavis: 0, mmx: 0, other: 0 };
  for (const trigger of deadRaw) {
    const cli = trigger.main_prompt.cli;
    if (cli.startsWith('python ')) buckets.python += 1;
    else if (cli.startsWith('mavis ')) buckets.mavis += 1;
    else if (cli.startsWith('mmx ')) buckets.mmx += 1;
    else buckets.other += 1;
  }
  console.log('     死命令构成：' + JSON.stringify(buckets));
  assert.equal(buckets.python + buckets.mavis + buckets.mmx + buckets.other, 376);
});
check('产物零死命令（file 态不含 python／mavis／mmx 起头的 CLI 值）', () => {
  for (const value of withCli.map((scene) => helpSceneCli(scene.wake_word))) {
    assert.equal(/^(python|mavis|mmx)\b/.test(value), false, value);
  }
  assert.equal(count(file.html, '<span class="ilife-help-shell-field-value">python '), 0,
    '命令行值不得是 python 死命令');
});

console.log('D. 341 条 CLI 去重 261 条');
check('唯一 CLI 261 条 < 341 → 不能进 Scene.id（duplicate-id）', () => {
  assert.equal(new Set(withCli.map((scene) => helpSceneCli(scene.wake_word))).size, 261);
});

console.log('E. 变体 5 条／3 宿主，label 不可路由');
const variants = TRIGGERS.flatMap((trigger) => trigger.variants.map((v) => ({ wake: trigger.wake_word, ...v })));
check('变体总数 5／宿主 3；label 非唤醒词、零路由、产物零出现', () => {
  assert.equal(variants.length, 5);
  assert.equal(new Set(variants.map((v) => v.wake)).size, 3);
  for (const variant of variants) {
    assert.equal(TRIGGERS.some((trigger) => trigger.wake_word === variant.label), false, variant.label);
    assert.equal(routesFor(variant.label).length, 0, variant.label);
    assert.equal(file.html.includes(variant.label), false, variant.label);
    assert.equal(text.html.includes(variant.label), false, variant.label);
  }
});

console.log('F. 三态实测');
check('file／inline 各 341 条 data-field="cli"；text 0 条', () => {
  assert.equal(count(file.html, 'data-field="cli"'), 341);
  assert.equal(count(inline.html, 'data-field="cli"'), 341);
  assert.equal(count(text.html, 'data-field="cli"'), 0);
});
check('text 态场景行恒 436（`唤醒词 · id`，无第三段）', () => {
  const lines = text.html.split('\n').filter((line) => line.startsWith('    '));
  assert.equal(lines.length, 436);
  assert.equal(lines.some((line) => line.includes('calorie-cmd-read')), false);
});
check('卡面 `code.cli` 436 条逐字 = Scene.id（壳冻结面不动）', () => {
  const decode = (s) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  const cardClis = [...file.html.matchAll(/<code class="ilife-help-shell-cli">([^<]*)<\/code>/g)]
    .map((match) => decode(match[1]));
  assert.equal(cardClis.length, 436);
  assert.deepEqual(cardClis, scenes.map((scene) => scene.id));
});

console.log('');
console.log('RESULT: ' + (total - fails) + '/' + total + ' fails=' + fails);
process.exit(fails === 0 ? 0 : 1);
