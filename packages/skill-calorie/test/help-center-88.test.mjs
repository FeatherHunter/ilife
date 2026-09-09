/** #88 实施 A 段 · HELP 速查台自证（S1 数据模型／S2 壳落地／S3 三守卫）。
 *
 * 三条守卫（#88 验收原文 ＋ 返修单 R1-2）：
 *  ① 占位符 **6/6 冻结标记逐个 0 残留** ＋ 泛化 `<!--[A-Z0-9-]+-->` 残留 0 ＋ `report.markers` 六键；
 *  ② **id 唯一**（数据层 436/436 ＋ HTML 层 ＋ 人为重复抛 `duplicate-id`）；
 *  ③ **copyText 单实现**（`COPY_RUNTIME_JS === buildSharedHelpersJs()`；剥掉 helpers 块后全文
 *     `navigator.clipboard`／`execCommand`／`onclick=` 命中 0；技能侧 src 零复制实现）。
 *
 * 运行：先 `pnpm build`，再 `node --test packages/skill-calorie/test/help-center-88.test.mjs`
 * 每个用例名后括号里是「红点」＝把它改坏时本用例必须变红的那一处（变异自证口径，见
 * `docs/research/t88-impl-a.md` §4）。
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
  COPY_RUNTIME_JS, HELP_CENTER_MODES, HELP_GROUPS, HELP_SKILL_NAME, HELP_SUBFUNC_ORDER,
  HELP_TITLE, HELP_TYPE_BADGES, buildHelpSceneData, helpCenterAssets, renderHelpCenterHtml,
} from '../dist/render/index.js';
import { CATEGORIES, TRIGGERS } from '../dist/triggers/index.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC_HELP_CENTER = readFileSync(join(HERE, '..', 'src', 'render', 'helpCenter.ts'), 'utf8');

const count = (haystack, needle) => haystack.split(needle).length - 1;
const flat = (data) => data.groups.flatMap((g) => g.subgroups.flatMap((s) => s.scenes));
const updatedAt = '2026-09-09 12:00';
const sceneData = buildHelpSceneData({ updatedAt });
const file = renderHelpCenterHtml({ mode: 'file', updatedAt });
const inline = renderHelpCenterHtml({ mode: 'inline', updatedAt });
const text = renderHelpCenterHtml({ mode: 'text', updatedAt });

/** 剥掉共享 helpers 块（唯一运行时块，逐字等于 `COPY_RUNTIME_JS` 的包裹形态）。 */
const stripHelpers = (html) => html.split('<script>' + COPY_RUNTIME_JS + '</script>').join('');

/* ── S1 数据模型（A1） ─────────────────────────────────────────── */

test('A1 10 分组／54 子功能／436 场景（红点：分组或子功能聚合逻辑改坏）', () => {
  assert.equal(sceneData.groups.length, 10);
  assert.equal(sceneData.groups.reduce((n, g) => n + g.subgroups.length, 0), 54);
  assert.equal(flat(sceneData).length, 436);
  assert.equal(TRIGGERS.length, 436, 'SoT 条数漂移：数据模型必须随 TRIGGERS 重算');
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
  assert.deepEqual(hist, { 结果: 329, 回执: 79, 过程: 6, '(none)': 22 });
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
  assert.equal(sceneData.subtitle, '10 分类 · 436 场景 · 更新于 ' + updatedAt);
  assert.deepEqual(sceneData.contact.items.map((i) => i.label), ['GitHub', 'Issues']);
});

test('P-2 updatedAt 显式参数：缺省无时间戳且两次调用逐字相同（红点：改用 Date.now()）', () => {
  const a = buildHelpSceneData();
  const b = buildHelpSceneData();
  assert.equal(a.subtitle, '10 分类 · 436 场景');
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

test('R1-12 436 条 prompt_template 无 </script>／<!--（红点：数据里注入破壳串）', () => {
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
  assert.deepEqual(hist, { 结果: 329, 回执: 79, 过程: 6 }, '三档文本的条数必须逐档对上（防整档错配）');
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

test('D-3 text 态裸 `<N>` = legacy CLI 原文（逐字保留、非 HTML；红点：把原文转义成 &lt;N&gt;）', () => {
  const angles = [...new Set([...text.html.matchAll(/<[^<>]*>/g)].map((m) => m[0]))];
  assert.deepEqual(angles, ['<N>'], 'text 态的尖括号文本必须恰为 legacy CLI 原文的 <N>（不得新增别的）');
  const originals = flat(sceneData).flatMap((s) => [s.id, s.wake_word, s.title, s.prompt_template]);
  for (const seq of angles) {
    assert.ok(originals.some((o) => o.includes(seq)), '尖括号文本必须逐字来自 prompt／CLI 原文：' + seq);
  }
  assert.ok(flat(sceneData).filter((s) => s.types === undefined).some((s) => s.id.includes('<N>')),
    '前置：legacy CLI 里确实有 <N> 原文（否则本用例无鉴别力）');
  assert.ok(!text.html.includes('&lt;'), 'text 态是纯文本载体，不得做 HTML 转义（须与 CLI 原文逐字一致）');
});

/* ── S2 壳落地（A2） ───────────────────────────────────────────── */

test('A2 复用冻结面 130 条 implemented／0 pending（红点：base-render 新增契约面）', () => {
  assert.equal(SPEC_FROZEN_SURFACE.length, 130);
  assert.equal(SPEC_FROZEN_SURFACE.filter((entry) => entry.status === 'pending').length, 0);
  assert.equal(SPEC_FROZEN_SURFACE.filter((entry) => entry.status === 'implemented').length, 130);
});

test('A2 file 态：完整文档 ＋ 436 卡／54 子功能／1308 复制按钮（红点：壳结构改动）', () => {
  assert.match(file.html, /^<!DOCTYPE html>/);
  assert.match(file.html, /<meta charset="utf-8">/);
  assert.match(file.html, /<\/html>\s*$/);
  assert.equal(count(file.html, 'data-scene-id='), 436);
  assert.equal(count(file.html, 'data-subgroup-id='), 54);
  assert.equal(count(file.html, 'data-action-id='), 1308);
  assert.equal(file.mode, 'file');
});

test('P-5 inline 态：只取 <section> 片段 ＋ <style> 落点钉死（红点：inline 返回整页／丢样式）', () => {
  assert.equal(inline.html.indexOf('<style>'), 0, '<style> 必须落在片段最前');
  assert.equal(count(inline.html, '<style>'), 1);
  assert.ok(inline.html.indexOf('<style>') < inline.html.indexOf('<section'));
  assert.ok(inline.html.includes('id="ilife-help-shell"'));
  assert.ok(!inline.html.includes('<!DOCTYPE'));
  assert.ok(!inline.html.includes('<head>') && !inline.html.includes('</head>'));
  assert.ok(!inline.html.includes('<html') && !inline.html.includes('<body'));
  assert.ok(inline.html.trimEnd().endsWith('</script>'), 'helpers 必须在片段最后');
});

test('三态同源：file／inline 的 436 个 data-scene-id 逐字同序；text 覆盖同一 436 个 id（红点：三态各派生一份数据）', () => {
  const ids = (html) => [...html.matchAll(/data-scene-id="([^"]*)"/g)].map((m) => m[1]);
  assert.deepEqual(ids(inline.html), ids(file.html));
  assert.equal(ids(file.html).length, 436);
  for (const scene of flat(sceneData)) assert.ok(text.html.includes(scene.id), 'text 缺场景：' + scene.id);
  assert.ok(!/<(section|style|script|div|article|details|span|button)\b/.test(text.html));
  assert.deepEqual([...HELP_CENTER_MODES], ['file', 'inline', 'text']);
  assert.equal(renderHelpCenterHtml({ updatedAt }).mode, 'file', '缺省交付形态 = file（P-5）');
  assert.throws(() => renderHelpCenterHtml({ mode: 'bogus' }), (err) => err.code === 'bad-input');
});

/* ── S3 三守卫 ─────────────────────────────────────────────────── */

test('守卫① 6/6 冻结标记逐个残留 0（红点：任一标记泄漏进产物）', () => {
  const markers = Object.values(TEMPLATE_MARKERS);
  assert.equal(markers.length, 6);
  assert.deepEqual(markers.slice().sort(), ['<!--CHARTS-HELPERS-->', '<!--CONTENT-->', '<!--INJECT-DATA-->',
    '<!--NO-SHARED-->', '<!--SHARED-CSS-->', '<!--SHARED-HELPERS-->']);
  for (const html of [file.html, inline.html]) {
    for (const marker of markers) assert.equal(count(html, marker), 0, '标记残留：' + marker);
  }
});

test('守卫① 泛化 `<!--[A-Z0-9-]+-->` 残留 0（红点：新标记泄漏，旧 5 字面量口径会静默通过）', () => {
  const residue = [...file.html.matchAll(/<!--[A-Z0-9-]+-->/g)].map((m) => m[0]);
  assert.deepEqual(residue, []);
  assert.deepEqual([...inline.html.matchAll(/<!--[A-Z0-9-]+-->/g)].map((m) => m[0]), []);
});

test('守卫① report.markers 六键（计数与 filled 口径钉死）（红点：填充器报告口径漂移）', () => {
  const report = file.report.markers;
  assert.deepEqual(report.map((m) => m.key),
    ['injectData', 'content', 'sharedHelpers', 'sharedCss', 'chartsHelpers', 'noShared']);
  const byKey = Object.fromEntries(report.map((m) => [m.key, m]));
  for (const key of ['injectData', 'sharedCss', 'sharedHelpers']) {
    assert.equal(byKey[key].count, 1, key + ' 必须恰 1 次');
    assert.equal(byKey[key].filled, true, key + ' 必须已填充');
  }
  for (const key of ['content', 'chartsHelpers', 'noShared']) {
    assert.equal(byKey[key].count, 0, key + ' 必须 0 次');
    assert.equal(byKey[key].filled, false, key + ' 不得填充');
  }
});

test('守卫② id 唯一：数据层 436/436 ＋ 子功能 54/54（红点：id 派生规则碰撞）', () => {
  const ids = flat(sceneData).map((s) => s.id);
  assert.equal(new Set(ids).size, 436);
  const subgroupIds = sceneData.groups.flatMap((g) => g.subgroups.map((s) => s.id));
  assert.equal(new Set(subgroupIds).size, 54);
  assert.ok(subgroupIds.every((id, i, all) => all.indexOf(id) === i));
});

test('守卫② id 唯一：HTML 层 data-scene-id 436/436 ＋ 元素 id 全唯一（红点：壳内 id 派生用数据里的重复值）', () => {
  const sceneIds = [...file.html.matchAll(/data-scene-id="([^"]*)"/g)].map((m) => m[1]);
  assert.equal(sceneIds.length, 436);
  assert.equal(new Set(sceneIds).size, 436);
  const elementIds = [...file.html.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(elementIds.length > 0);
  assert.equal(new Set(elementIds).size, elementIds.length, 'HTML id 重复：'
    + JSON.stringify(elementIds.filter((x, i) => elementIds.indexOf(x) !== i)));
});

test('守卫② 人为重复 id → 抛 `duplicate-id`（红点：壳不再校验唯一性）', () => {
  const scene = (id) => ({ id, title: 'T', wake_word: 'W', status: '', prompt_template: 'P' });
  const dup = {
    skill_name: 'x',
    title: 'y',
    groups: [{ id: 'g', label: 'G', subgroups: [{ id: 'g_1', label: 'S', scenes: [scene('same'), scene('same')] }] }],
  };
  assert.throws(
    () => renderHelpShell({ sceneData: dup, assets: helpCenterAssets() }),
    (err) => err.code === 'duplicate-id',
  );
});

test('守卫③ copyText 单实现：COPY_RUNTIME_JS === buildSharedHelpersJs()（红点：技能侧自产第二套运行时）', () => {
  assert.equal(COPY_RUNTIME_JS, buildSharedHelpersJs());
  assert.equal(helpCenterAssets().sharedHelpersJs, COPY_RUNTIME_JS);
  assert.equal(helpCenterAssets().sharedCssText.length > 0, true);
});

test('守卫③ 剥掉 helpers 块后全文 `navigator.clipboard`／`execCommand`／`onclick=` 命中 0（红点：内联 onclick／自写复制）', () => {
  for (const [label, html] of [['file', file.html], ['inline', inline.html]]) {
    const stripped = stripHelpers(html);
    for (const needle of ['navigator.clipboard', 'execCommand', 'onclick=']) {
      assert.equal(count(stripped, needle), 0, label + ' 剥离 helpers 后仍含 ' + needle);
    }
    assert.equal(count(html, 'navigator.clipboard'), 1, label + ' 全文只允许 helpers 里 1 处');
    assert.equal(count(html, 'execCommand'), 1, label + ' 全文只允许 helpers 里 1 处');
  }
});

test('守卫③ 技能侧零复制实现：helpCenter.ts 源码不含复制通道（红点：技能侧自写 execCommand／onclick）', () => {
  for (const needle of ['navigator.clipboard', 'execCommand', 'onclick=', 'document.createElement']) {
    assert.equal(count(SRC_HELP_CENTER, needle), 0, 'helpCenter.ts 不得出现 ' + needle);
  }
  assert.ok(SRC_HELP_CENTER.includes("from './copy.js'"), '页面运行时必须取 copy.ts 的冻结常量');
  assert.ok(SRC_HELP_CENTER.includes('renderHelpShell'), '壳必须走 base-paint 冻结入口');
});
