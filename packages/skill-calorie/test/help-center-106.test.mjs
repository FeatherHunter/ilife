/** #106 · HELP 逐场景「可执行命令」回补（裁决 Q11 第二半：F3 丢了逐场景 CLI 展示）。
 *
 * 本文件锁五件事（逐条对票面验收「回补清单逐条勾选」）：
 *  ① **口径唯一**：逐场景 CLI 恒取 #81 路由层该唤醒词的首条 `kind==='exec'` 路由
 *     （`calorie-cmd-read calorie.*`），**不取** `main_prompt.cli` 原文（353/436 是已不存在的
 *     `python scripts/render_*.py`／`mavis`／`mmx` 死命令）。
 *  ② **落位**：发在冻结槽位 `SceneEditableField`（`{name:'cli', label:'可执行命令', value}`），
 *     壳渲染进 Sheet 详情层（`data-field="cli"`），**卡面 `cliText` 仍是 `Scene.id`**（壳冻结面不动）。
 *  ③ **不新增契约面**：`SPEC_FROZEN_SURFACE` 恒 130 条；`Scene` 的机读 schema 属性集不变。
 *  ④ **三态记账**：`file`／`inline` 含 341 条命令行；`text` 态**不含**（纯文本索引，且 #88 D-3
 *     锁「text 尖括号集恒 {<N>}」，CLI 里含 `<照片路径>` 会撞该断言 → 登记不补）。
 *  ⑤ **变体示例不补的机械锁**：SoT 仅 5 条变体（3 个宿主场景），其 label 全部**不可路由**
 *     （非唤醒词／非别名／无路由），故 HELP 产物里**不得出现**任何变体 label／prompt（红点：
 *     未经契约追加就把变体塞进产物）。
 *
 * 运行：先 `pnpm build`，再 `node --test packages/skill-calorie/test/help-center-106.test.mjs`
 * 每个用例名后括号里是「红点」＝把它改坏时本用例必须变红的那一处。
 */
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import { SPEC_FROZEN_SURFACE, SCENE_DATA_SCHEMA } from 'base-paint';
import {
  HELP_CLI_FIELD_LABEL, HELP_CLI_FIELD_NAME, buildHelpSceneData, helpSceneCli, renderHelpCenterHtml,
} from '../dist/render/helpCenter.js';
import { TRIGGERS } from '../dist/triggers/index.js';
import { routesFor } from '../dist/triggers/routing.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = readFileSync(join(HERE, '..', 'src', 'render', 'helpCenter.ts'), 'utf8');

const count = (haystack, needle) => haystack.split(needle).length - 1;
const flat = (data) => data.groups.flatMap((g) => g.subgroups.flatMap((s) => s.scenes));
const updatedAt = '2026-09-09 12:00';
const sceneData = buildHelpSceneData({ updatedAt });
const scenes = flat(sceneData);
const file = renderHelpCenterHtml({ mode: 'file', updatedAt });
const inline = renderHelpCenterHtml({ mode: 'inline', updatedAt });
const text = renderHelpCenterHtml({ mode: 'text', updatedAt });

/** 期望值：唤醒词 → 路由层首条 exec 路由的 cli。 */
const routeCli = (wakeWord) => {
  const hit = routesFor(wakeWord).find((r) => r.kind === 'exec');
  return hit === undefined ? null : hit.cli;
};

/** 场景卡片段（`data-scene-id="<id>"` 起、到下一张卡或分组收尾为止）。 */
function cardFragment(html, sceneId) {
  const start = html.indexOf('data-scene-id="' + sceneId + '"');
  assert.ok(start > 0, '产物缺场景卡：' + sceneId);
  const next = html.indexOf('data-scene-id="', start + 1);
  return html.slice(start, next < 0 ? undefined : next);
}

/** HTML 实体还原（`&amp;` 最后，避免二次解码）。 */
const decodeEntities = (s) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

/* ── ① 口径：逐场景 CLI 恒取路由层 exec ──────────────────────────── */

test('① 341/436 场景带可执行 CLI，逐条逐字 = 路由层 exec 路由（红点：helpSceneCli 改回 main_prompt.cli 原文）', () => {
  const withCli = scenes.filter((s) => helpSceneCli(s.wake_word) !== null);
  assert.equal(withCli.length, 341, 'exec 场景数 = #81 路由层 exec 桶 341');
  assert.equal(scenes.length - withCli.length, 95, 'non-exec 95（out-of-scope 10 ＋ legacy-chain 85）');
  for (const scene of withCli) {
    const expected = routeCli(scene.wake_word);
    assert.ok(expected !== null, '路由层应给出 exec CLI：' + scene.wake_word);
    assert.equal(helpSceneCli(scene.wake_word), expected, 'CLI 逐字取路由层：' + scene.wake_word);
    assert.ok(expected.startsWith('calorie-cmd-read calorie.'), '唯一出口形态：' + expected);
  }
  // 去重事实（台账：261 条唯一 → 不能塞进 `Scene.id`，那会触发 duplicate-id）
  assert.equal(new Set(withCli.map((s) => helpSceneCli(s.wake_word))).size, 261, '唯一 CLI 261 条');
});

test('① 死命令零泄漏：任何 CLI 值都不是 python／mavis／mmx 原文（红点：改回 main_prompt.cli 原文）', () => {
  const bad = scenes.map((s) => helpSceneCli(s.wake_word)).filter((c) => c !== null)
    .filter((c) => /^(python|mavis|mmx)\b/.test(c));
  assert.deepEqual(bad, [], 'CLI 不得是旧架构死命令');
  // 前置鉴别力：SoT 原文里确实有 353 条死命令（否则本用例无鉴别力）
  const dead = TRIGGERS.filter((t) => /^(python|mavis|mmx)\b/.test(t.main_prompt.cli));
  assert.ok(dead.length > 300, 'SoT 里死命令条数应 >300，实际 ' + dead.length);
  // 源码级：`helpSceneCli` 函数体内不得出现 `main_prompt`（取值只许走路由层）
  const body = /export function helpSceneCli\([\s\S]*?\n\}/.exec(SRC);
  assert.ok(body !== null, '缺 helpSceneCli 函数体');
  assert.equal(body[0].includes('main_prompt'), false, '不得以 SoT 原文充当 CLI');
  assert.ok(body[0].includes('routesFor'), '取值必须走路由层');
});

test('① 未知唤醒词返 null（不返空串冒充，红点：return ""）', () => {
  assert.equal(helpSceneCli('这个词不存在'), null);
  assert.equal(helpSceneCli(''), null);
});

/* ── ② 落位：冻结槽位 editable_fields → Sheet 详情层 ───────────────── */

test('② 数据层：341 条 `editable_fields` 恰 1 行（name/label/value），95 条不发（红点：给全部场景发空值行）', () => {
  const withField = scenes.filter((s) => Array.isArray(s.editable_fields) && s.editable_fields.length > 0);
  assert.equal(withField.length, 341);
  for (const scene of withField) {
    assert.equal(scene.editable_fields.length, 1, '恰 1 行：' + scene.id);
    const field = scene.editable_fields[0];
    assert.deepEqual(Object.keys(field).sort(), ['label', 'name', 'value'], '字段形状 = 冻结面三键');
    assert.equal(field.name, HELP_CLI_FIELD_NAME);
    assert.equal(field.label, HELP_CLI_FIELD_LABEL);
    assert.equal(field.value, routeCli(scene.wake_word), 'value 逐字 = 路由层 CLI：' + scene.id);
  }
  for (const scene of scenes.filter((s) => helpSceneCli(s.wake_word) === null)) {
    assert.equal(scene.editable_fields, undefined, 'non-exec 场景不发字段：' + scene.id);
  }
});

test('② 渲染层：file／inline 各 341 条 `data-field="cli"`，落在场景卡内的 Sheet 里（红点：字段发到卡外／不发）', () => {
  for (const [label, html] of [['file', file.html], ['inline', inline.html]]) {
    assert.equal(count(html, 'data-field="' + HELP_CLI_FIELD_NAME + '"'), 341, label + ' 命令行数');
    assert.equal(count(html, '>' + HELP_CLI_FIELD_LABEL + '</span>'), 341, label + ' 标签文案数');
  }
  const sample = cardFragment(file.html, 'home_today_overview');
  assert.ok(sample.includes('class="ilife-help-shell-sheet"'), '卡内含 Sheet 详情层');
  assert.ok(sample.includes('data-field="' + HELP_CLI_FIELD_NAME + '"'), '命令行落在卡内');
  assert.ok(decodeEntities(sample).includes(routeCli('看今日主页')), '命令行逐字渲染：' + routeCli('看今日主页'));
  // 命令行必须在 Sheet 之后（详情层），不得跑到卡头
  assert.ok(sample.indexOf('data-field="cli"') > sample.indexOf('class="ilife-help-shell-sheet"'),
    '命令行须在 Sheet 内');
});

test('② 卡面 `cliText` 不动：436 条 `<code class="…-cli">` 逐字 = Scene.id（红点：把 CLI 塞进 id）', () => {
  const cardClis = [...file.html.matchAll(/<code class="ilife-help-shell-cli">([^<]*)<\/code>/g)]
    .map((m) => decodeEntities(m[1]));
  assert.equal(cardClis.length, 436);
  assert.deepEqual(cardClis, scenes.map((s) => s.id), '卡面 CLI 文本恒 = Scene.id（壳冻结面 R32）');
  assert.equal(new Set(cardClis).size, 436, 'id 仍全局唯一');
  // 卡面文本不得是 exec CLI（那会撞 duplicate-id：261 唯一 < 341 条）
  assert.equal(cardClis.some((c) => c.startsWith('calorie-cmd-read ')), false);
});

test('② `复制参数` 文本记账：exec 场景 = `可执行命令: <cli>`，non-exec 场景 = Scene.id（红点：壳回落口径漂移）', () => {
  const paramsOf = (html, sceneId) => {
    const card = cardFragment(html, sceneId);
    const hit = /class="[^"]*btn-params"[^>]*data-t="([^"]*)"/.exec(card);
    assert.ok(hit !== null, '缺参数按钮：' + sceneId);
    return decodeEntities(hit[1]);
  };
  assert.equal(paramsOf(file.html, 'home_today_overview'),
    HELP_CLI_FIELD_LABEL + ': ' + routeCli('看今日主页'));
  assert.equal(paramsOf(file.html, 'diet_scan_label'), 'diet_scan_label', 'non-exec 回落 Scene.id（R32）');
});

/* ── ③ 不新增契约面 ───────────────────────────────────────────── */

test('③ 冻结面恒 130 条／`Scene` 属性集不变（红点：往 Scene 上加 cli 字段）', () => {
  assert.equal(SPEC_FROZEN_SURFACE.length, 130);
  assert.equal(SPEC_FROZEN_SURFACE.filter((e) => e.status === 'pending').length, 0);
  const sceneProps = SCENE_DATA_SCHEMA.properties.groups.items.properties.subgroups
    .items.properties.scenes.items.properties;
  assert.deepEqual(Object.keys(sceneProps).sort(),
    ['editable_fields', 'id', 'prompt_template', 'status', 'title', 'types', 'wake_word'],
    'scene 机读属性集 = #78 冻结七键（本票零新增）');
  assert.equal('cli' in sceneProps, false, '不得新增 `cli` 契约字段');
});

/* ── ④ 三态记账 ─────────────────────────────────────────────── */

test('④ text 态不含命令行（纯文本索引；#88 D-3 锁尖括号集恒 {<N>}）（红点：把 CLI 写进 text）', () => {
  assert.equal(count(text.html, HELP_CLI_FIELD_LABEL), 0, 'text 态不发命令行');
  const sceneLines = text.html.split('\n').filter((line) => line.startsWith('    '));
  assert.equal(sceneLines.length, 436);
  assert.equal(sceneLines.some((line) => line.includes('calorie-cmd-read')), false,
    'text 态场景行仍是 `唤醒词 · id`（不得追加第三段 CLI）');
  assert.deepEqual([...new Set([...text.html.matchAll(/<[^<>]*>/g)].map((m) => m[0]))], ['<N>'],
    'text 态尖括号集恒 {<N>}（#88 D-3 口径不破）');
});

/* ── ⑤ 变体示例：不补的机械锁 ─────────────────────────────────── */

test('⑤ 变体不补：SoT 5 条变体全部不可路由，产物里零出现（红点：未经契约追加塞进产物）', () => {
  const variants = TRIGGERS.flatMap((t) => t.variants.map((v) => ({ wake: t.wake_word, ...v })));
  assert.equal(variants.length, 5, 'SoT 变体总数（F1 的 31 条属旧快照，数据已不存在）');
  assert.equal(new Set(variants.map((v) => v.wake)).size, 3, '宿主场景 3 个');
  for (const v of variants) {
    assert.equal(TRIGGERS.some((t) => t.wake_word === v.label), false, '变体 label 不是唤醒词：' + v.label);
    assert.equal(routesFor(v.label).length, 0, '变体 label 不可路由：' + v.label);
    for (const [label, html] of [['file', file.html], ['text', text.html]]) {
      assert.equal(html.includes(v.label), false, label + ' 不得出现变体 label：' + v.label);
      assert.equal(html.includes(v.prompt.slice(0, 24)), false, label + ' 不得出现变体 prompt：' + v.label);
    }
  }
});
