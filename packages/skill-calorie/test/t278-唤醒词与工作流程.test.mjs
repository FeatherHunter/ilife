/** #278 · 场景 02 饮食「唤醒词 → 命令 → 工作流程」接线锁（判据逐条机器化）。
 *
 * 本票要的三件可查：
 *  ① 70 句逐条可查：冻结唤醒词表 `scene-02-diet.ts` 的**每一条词**都能在 `SKILL.md` 生成表里查到，
 *     且那一行的「命令」列与路由层 `ALL_ROUTES` 记的 `cli` **逐字相同**；
 *  ② 表由构建期生成、不许两处手工维护：从「生成源」各删一条（冻结表／HELP 资产／路由）→
 *     生成器必抛；手改产物里那一行 → 重跑生成器必把它改回来（见 `docs/skills/skill-calorie/t278-block.mjs`）；
 *  ③ 示例不写死日期：`SKILL.md` 的示例行里没有 `YYYY-MM-DD` 字面日期，占位符都有登记值
 *     （登记处 `docs/research/t81-seed.mjs` 的 `PLACEHOLDER_SUBSTITUTIONS`）。
 *
 * 运行：先 `node node_modules/typescript/bin/tsc -b`（换源码后加 `--force`），再
 * `node --test packages/skill-calorie/test/t278-唤醒词与工作流程.test.mjs`
 */
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { test } from 'node:test';
import { configTestBase } from './helpers/config-test.mjs';

// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
configTestBase();

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const ROOT = join(PKG, '..', '..');
const at = (p) => pathToFileURL(p).href;
const SKILL = readFileSync(join(PKG, 'SKILL.md'), 'utf8');
const SEED_SRC = readFileSync(join(ROOT, 'docs', 'research', 't81-seed.mjs'), 'utf8');

const HELP = await import(at(join(PKG, 'dist', 'triggers', 'wake-assets.js')));
const { ALL_ROUTES } = await import(at(join(PKG, 'dist', 'triggers', 'routing.js')));
const { SCENE_02_DIET } = await import(at(join(PKG, 'dist', 'triggers', 'scene-02-diet.js')));
const GEN = await import(at(join(PKG, 'scripts', 'build-help.mjs')));

const FROZEN = SCENE_02_DIET.map((t) => t.wake_word);
const SCENES = GEN.dietScenes(HELP.WAKE_GROUPS);
const ROWS = GEN.buildDietRows({ scenes: SCENES, routes: ALL_ROUTES });

/** 从产物 `SKILL.md` 里读表（判据读的是交付物，不是生成器自述）。 */
function parseDietTable(text) {
  const head = '### 场景 02 饮食 · 逐条唤醒词 → 命令 → 工作流程';
  const i = text.indexOf(head);
  assert.ok(i >= 0, 'SKILL.md 缺「场景 02 饮食」逐词表标题');
  const out = [];
  let inTable = false;
  for (const ln of text.slice(i).split('\n')) {
    if (ln.startsWith('### ') && out.length > 0) break;
    if (!ln.startsWith('| ')) { if (inTable && out.length > 0) break; continue; }
    const cells = ln.split('|').slice(1, -1).map((c) => c.trim());
    if (cells[0] === '唤醒词') { inTable = true; continue; }
    if (/^-+$/.test(cells[0])) continue;
    if (cells.length !== 3) continue;
    out.push({ wake: cells[0], cmd: cells[1].replace(/^`/, '').replace(/`$/, ''), flow: cells[2] });
  }
  return out;
}

const TABLE = parseDietTable(SKILL);
const firstExec = new Map();
for (const r of ALL_ROUTES) if (r.kind === 'exec' && !firstExec.has(r.wakeWord)) firstExec.set(r.wakeWord, r);

test('① 冻结唤醒词表 70 条，且两处来源逐词双向差集为 0', () => {
  assert.equal(FROZEN.length, 70, '冻结唤醒词表条数');
  assert.equal(SCENES.length, 70, 'HELP 资产「饮食」组场景条数');
  const assetWords = SCENES.map((s) => s.wake_word);
  assert.deepEqual(assetWords.filter((w) => !FROZEN.includes(w)), [], 'HELP 资产多出的词');
  assert.deepEqual(FROZEN.filter((w) => !assetWords.includes(w)), [], '冻结表多出的词');
});

test('① 70/70 都能查到，命令列与路由层逐字一致', () => {
  assert.equal(TABLE.length, FROZEN.length, '产物表行数 != 冻结表条数');
  const byWake = new Map(TABLE.map((r) => [r.wake, r]));
  const missing = FROZEN.filter((w) => !byWake.has(w));
  assert.deepEqual(missing, [], '产物表里查不到的词');
  const diff = [];
  for (const w of FROZEN) {
    const route = firstExec.get(w);
    assert.ok(route !== undefined, '没有可执行路由的词：' + w);
    if (byWake.get(w).cmd !== route.cli) diff.push(w + '\n  表：' + byWake.get(w).cmd + '\n  路由：' + route.cli);
  }
  assert.deepEqual(diff, [], '命令列与路由层不一致的行');
  assert.equal(ROWS.length, 70, '生成器逐词行数');
});

test('① 表里每条词都归一类流程，三类的条数由生成器当刻算出', () => {
  const kinds = new Set(['结果：跑这条命令 → 结果型 HTML 落盘', '回执：跑这条命令 → 写后回执页落盘', '过程：先出预检确认页 → 用户确认 → 跑这条命令']);
  const bad = TABLE.filter((r) => !kinds.has(r.flow));
  assert.deepEqual(bad.map((r) => r.wake), [], '流程列不是三类之一的行');
  const n = (t) => ROWS.filter((r) => r.flow === t).length;
  const selfLine = SKILL.split('\n').find((l) => l.startsWith('本表 70 行'));
  assert.ok(selfLine, '缺表的自述行');
  assert.ok(selfLine.includes('结果 ' + n('结果') + ' 条'), '自述行的结果条数 != 当刻算出');
  assert.ok(selfLine.includes('回执 ' + n('回执') + ' 条'), '自述行的回执条数 != 当刻算出');
  assert.ok(selfLine.includes('过程 ' + n('过程') + ' 条'), '自述行的过程条数 != 当刻算出');
  assert.equal(n('结果') + n('回执') + n('过程'), 70, '三类条数之和 != 70');
});

test('② 生成源任一侧少一条 ⇒ 生成器抛（不静默少一行）', () => {
  const noRoute = ALL_ROUTES.filter((r) => r.wakeWord !== FROZEN[0]);
  assert.throws(() => GEN.buildDietRows({ scenes: SCENES, routes: noRoute }), /没有可执行的命令/,
    '路由层少一条时应抛');

  const fewerScenes = SCENES.filter((s) => s.wake_word !== FROZEN[0]);
  assert.throws(() => GEN.buildDietRows({ scenes: fewerScenes, routes: ALL_ROUTES }), /两处对不上/,
    'HELP 资产少一条时应抛');

  const extraScenes = SCENES.concat([{ id: 'x', title: 'x', wake_word: '不存在的新词', status: '', prompt_template: '', types: ['结果'] }]);
  assert.throws(() => GEN.buildDietRows({ scenes: extraScenes, routes: ALL_ROUTES }), /两处对不上/,
    'HELP 资产多一条时应抛');

  const noGroup = [{ id: 'nope', icon: '', label: '', subgroups: [] }];
  assert.throws(() => GEN.dietScenes(noGroup), /缺「饮食」分组/, 'HELP 资产缺饮食组时应抛');

  const row = ROWS[0];
  assert.throws(() => GEN.buildDietRows({
    scenes: SCENES, routes: ALL_ROUTES.map((r) => (r.wakeWord === row.wake ? { ...r, cli: '' } : r)),
  }), /缺命令原文/, '路由缺 cli 时应抛');
});

test('② 代表唤醒词取饮食场景自己的词，不退回命令名', () => {
  const diet = GEN.dietRepresentatives(ALL_ROUTES, FROZEN);
  const dietKeys = new Set(ROWS.map((r) => r.key));
  assert.ok(dietKeys.size > 0, '饮食场景没有覆盖任何命令');
  for (const k of dietKeys) {
    const rep = diet.get(k);
    assert.ok(typeof rep === 'string' && rep.length > 0, '饮食场景的命令缺代表词：' + k);
    assert.ok(FROZEN.includes(rep), '代表词不在饮食场景里：' + k + ' → ' + rep);
    assert.notEqual(rep, k, '代表词退回了命令名：' + k);
  }
  // 产物那一列逐条核：饮食命令在速查表里出现时，首列必须是它自己那条词
  for (const k of dietKeys) {
    const line = SKILL.split('\n').find((l) => l.includes('| ' + k + ' |'));
    assert.ok(line, '速查表缺这条命令：' + k);
    assert.equal(line.split('|')[1].trim(), diet.get(k), '速查表首列不是它自己那条词：' + k);
  }
});

test('③ 示例里没有写死的 YYYY-MM-DD 日期，占位符都在 t81-seed 登记过', () => {
  const block = SKILL.slice(SKILL.indexOf(GEN.START), SKILL.indexOf(GEN.END)).replace(/<!--[\s\S]*?-->/g, '');
  const bad = block.split('\n').filter((l) => l.startsWith('| ') && /\b\d{4}-\d{2}-\d{2}\b/.test(l));
  assert.deepEqual(bad, [], '示例行里还有写死的日期');
  const registered = new Set([...SEED_SRC.matchAll(/\['(<[^<>]+>)',/g)].map((m) => m[1]));
  const used = new Set([...block.matchAll(/<[^<>]+>/g)].map((m) => m[0]));
  const missing = [...used].filter((p) => !registered.has(p));
  assert.deepEqual(missing, [], '占位符没有在 docs/research/t81-seed.mjs 登记替换值');
  assert.ok(used.size > 0, '示例里一个占位符都没有（示例可能整表缺失）');
});

test('③ 生成器把日期换成登记过的占位符：按出现次序取，同值不并组', () => {
  assert.equal(GEN.dateFreeExample('x --params \'{"date":"2026-09-05"}\''), 'x --params \'{"date":"<日期>"}\'');
  assert.equal(
    GEN.dateFreeExample('x --params \'{"a":"2026-09-05","b":"2026-09-05"}\''),
    'x --params \'{"a":"<开始日期>","b":"<结束日期>"}\'',
    '两处日期（哪怕同值）＝两段对比的起止，各得各的占位符',
  );
  assert.equal(
    GEN.dateFreeExample('x --params \'{"date1":"2026-09-05","date2":"2026-09-07"}\''),
    'x --params \'{"date1":"<开始日期>","date2":"<结束日期>"}\'',
  );
  assert.equal(
    GEN.dateFreeExample('x --params \'{"a":"2026-09-05","b":"2026-09-05","c":"2026-09-07","d":"2026-09-07"}\''),
    'x --params \'{"a":"<开始日期>","b":"<结束日期>","c":"<对比开始日期>","d":"<对比结束日期>"}\'',
    '两段对比的四个位置各得各的占位符，不许把同一个日期铺满四处',
  );
  assert.equal(GEN.dateFreeExample('x --params \'{"a":"今日"}\''), 'x --params \'{"a":"今日"}\'', '无日期不动');
  assert.throws(() => GEN.dateFreeExample('x --params \'{"a":"2026-09-01","b":"2026-09-02","c":"2026-09-03","d":"2026-09-04","e":"2026-09-05"}\''),
    /没有对应的占位符组/, '日期个数没有对应组时应抛');
  for (const p of GEN.EXAMPLE_PLACEHOLDERS) {
    assert.ok(SEED_SRC.includes("'" + p + "'"), '登记的占位符缺替换值：' + p);
  }
});

test('③ 占位符按名分组：组里每个名字都在 t81-seed 登记过，个数↔组一一对上', () => {
  // 组名与登记表的键逐字同：登记表加了名字而这里没加（或反之）即红。
  for (const [g, picks] of Object.entries(GEN.DATE_PLACEHOLDER_GROUPS)) {
    assert.ok(picks.length > 0, '空组：' + g);
    for (const p of picks) {
      assert.ok(SEED_SRC.includes("'" + p + "'"), '组「' + g + '」里的名字没在 t81-seed 登记：' + p);
      assert.ok(GEN.EXAMPLE_PLACEHOLDERS.includes(p), '组「' + g + '」里的名字不在 EXAMPLE_PLACEHOLDERS：' + p);
    }
  }
  assert.deepEqual(GEN.DATE_PLACEHOLDER_GROUPS.单日期, ['<日期>']);
  assert.deepEqual(GEN.DATE_PLACEHOLDER_GROUPS.区间, ['<开始日期>', '<结束日期>']);
  assert.deepEqual(GEN.DATE_PLACEHOLDER_GROUPS.对比, ['<对比开始日期>', '<对比结束日期>']);
  assert.deepEqual(GEN.placeholderGroupFor(1), GEN.DATE_PLACEHOLDER_GROUPS.单日期, '1 个日期＝单日期组');
  assert.deepEqual(GEN.placeholderGroupFor(2), GEN.DATE_PLACEHOLDER_GROUPS.区间, '2 个日期＝区间组');
  assert.deepEqual(GEN.placeholderGroupFor(4),
    [...GEN.DATE_PLACEHOLDER_GROUPS.区间, ...GEN.DATE_PLACEHOLDER_GROUPS.对比],
    '4 个位置＝主段区间对在前、对比段对比对在后');
  assert.throws(() => GEN.placeholderGroupFor(3), /没有对应的占位符组/, '3 个日期没有对应组时应抛');
  // 四个位置各得各的名字，同一份日期不许铺满四处；前两个位置＝区间对、后两个＝对比对。
  const four = GEN.dateFreeExample('x --params \'{"a":"2026-09-05","b":"2026-09-05","c":"2026-09-07","d":"2026-09-07"}\'');
  assert.deepEqual([...new Set([...four.matchAll(/<[^<>]+>/g)].map((m) => m[0]))].length, 4, '四个位置重了名字：' + four);
  assert.ok(four.includes('"a":"<开始日期>","b":"<结束日期>"'), '前两个位置不是区间对：' + four);
  assert.ok(four.includes('"c":"<对比开始日期>","d":"<对比结束日期>"'), '后两个位置不是对比对：' + four);
});

test('③ 产物新鲜：AUTO 块 == 生成器输出', () => {
  assert.equal(GEN.renderSkillMd(SKILL), SKILL, 'SKILL.md 的 AUTO 块不是生成器当刻输出');
});

test('④ 三类流程的步骤与判据写清了，且字数对得上当刻表', () => {
  const sec = SKILL.slice(SKILL.indexOf('## 场景 02 饮食工作流程'));
  assert.ok(sec.length > 0, '缺「场景 02 饮食工作流程」一节');
  for (const t of ['**结果**', '**回执**', '**过程**']) {
    assert.ok(sec.includes(t), '这一节缺流程说明：' + t);
  }
  for (const c of ['①', '②', '③', '④']) assert.ok(sec.includes(c), '这一节缺交付判据：' + c);
  assert.ok(sec.includes('`pnpm help:build`'), '这一节没写表的出处');
  assert.ok(/不许两处手工维护|谁都不手改|构建期/.test(sec), '这一节没写「不许手改」');
});
