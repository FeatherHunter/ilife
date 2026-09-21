/** #368 · 卡路里场景 08 身体细节 · **索引表与 HELP 卡片**（框架级）的机器门。
 *
 * 票面（权威 `gh issue view 368`；设计正本 `docs/skills/skill-calorie/t169-设计定稿.md` 票 16）：
 *   ① 索引表里「写词 → 预检页命令」的映射**逐条在（7 条）**；负向＝删掉一条映射 → ①必红；
 *   ② 照其中一条**照抄执行** → `exit 0` ＋落盘整页；
 *   ③ HELP 产物里身体 **13 条卡片的命令字段值 == 注册表命令名（13/13）**；
 *   ④ `SKILL.md` 身体段**首列不出现命令名冒充唤醒词**、**页面入口行标明自己是入口**。
 *
 * 期望值来源只认两份权威源：`src/body/commands.ts`（键与代表唤醒词）＋生成物注册表 `dist/cli/keys.js`
 * （`CALORIE_COMBOS`）。不拿本实现自己的输出当期望值。
 *
 * 运行：先 `node node_modules/typescript/bin/tsc -b packages/skill-calorie`，再
 *      `node --test packages/skill-calorie/test/t368-索引卡片.test.mjs`
 * 末行机器可读摘要：`RESULT: n/m`。
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import { CALORIE_COMBOS } from '../dist/cli/keys.js';
import { BODY_COMMANDS } from '../dist/body/commands.js';
import {
  HELP_COMMAND_FIELD_LABEL, HELP_COMMAND_FIELD_NAME, HELP_FLOW_FIELD_LABEL, HELP_FLOW_FIELD_NAME,
  buildHelpSceneData, helpSceneCommand,
} from '../dist/photo/helpCenter.js';
import { routesFor } from '../dist/triggers/routing.js';
import { calorieConfigDir, configTestBase } from './helpers/config-test.mjs';
import { homeEnvOf } from '../../../test/helpers/home-test-base.mjs';
// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
configTestBase();

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG_DIR = join(HERE, '..');
const SKILL_MD = join(PKG_DIR, 'SKILL.md');
const WORKFLOW_MD = join(PKG_DIR, 'workflows', '08-身体细节.md');
const BIN = join(PKG_DIR, 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';

/** 13 条身体唤醒词（t169 §一 13 条词表逐字；顺序＝那张表的顺序）。 */
const BODY_13_WORDS = ['记体脂（皮褶钳）', '记体脂（外部测量）', '记围度', '补记体脂', '补记围度', '看体脂', '看体脂趋势',
  '看围度', '看围度趋势', '对比体脂', '对比围度', '删体脂', '删围度'];

/** 索引表 7 条映射的唤醒词（5 条写词 ＋ 2 条页面入口行）。 */
const INDEX_7_WORDS = ['记体脂（皮褶钳）', '记体脂（外部测量）', '补记体脂', '记围度', '补记围度', '看体脂向导', '看围度向导'];

/** 身体域 10 个键（`src/body/commands.ts` 声明的键集，注册表里必须逐个在）。 */
const BODY_KEYS = ['calorie.body.composition-add', 'calorie.body.composition-remove', 'calorie.body.measure-add',
  'calorie.body.measure-remove', 'calorie.view.body-composition', 'calorie.view.body-measure',
  'calorie.view.composition-wizard', 'calorie.view.measure-wizard',
  'calorie.view.body-composition-compare', 'calorie.view.body-measure-compare'];

/** 索引表行：表头含 `#`／`唤醒词…`／`预检页命令…` 三列（**按列名定位**，不按位次）。
 *
 *  判据：表格**恰 7 行**且每行「预检页命令」格是一条可跑的 CLI；「唤醒词」格是写词或页面入口行；
 *  返回 `{ rows, problems }`——`problems` 非空即红（负向对照靠它：删一行 → 行数 6 → 必红）。 */
export function parseIndexTable(text) {
  const problems = [];
  const rows = [];
  const lines = text.split('\n');
  let nCol = -1, wakeCol = -1, pageCol = -1, writeCol = -1;
  let start = -1;
  for (let i = 0; i < lines.length; i += 1) {
    if (!lines[i].startsWith('| ')) continue;
    const cells = lines[i].split('|').map((c) => c.trim());
    if (!cells.includes('#')) continue;
    const at = (p) => cells.findIndex((c) => c.startsWith(p));
    const w = at('唤醒词');
    const p2 = at('预检页命令');
    if (w < 0 || p2 < 0) continue;         // 这张表不是索引表（还有别的 `#` 表：13 条落点表等）
    nCol = cells.indexOf('#');
    wakeCol = w;
    pageCol = p2;
    writeCol = at('会改数据库的命令');
    start = i + 2;
    break;
  }
  if (start < 0) return { rows, problems: ['索引表表头缺失（须含 `#`／`唤醒词`／`预检页命令` 三列）'] };
  for (let i = start; i < lines.length; i += 1) {
    const cells = lines[i].split('|').map((c) => c.trim());
    if (cells.length <= Math.max(nCol, wakeCol, pageCol)) break;
    if (!/^\d+$/.test(cells[nCol])) break;             // 表格结束（首列不是序号即出表）
    const wakeRaw = cells[wakeCol];
    // 页面入口行以「页面入口」标注（判据④的机械依据在这里读）
    const entry = wakeRaw.includes('页面入口');
    const wake = wakeRaw.replace(/\*+页面入口\*+[：:，,]?/g, '').replace(/`/g, '').trim();
    const pageCli = cells[pageCol].replace(/`/g, '').trim();
    rows.push({ n: Number(cells[nCol]), wake, entry, pageCli, writeKey: (cells[writeCol] ?? '').replace(/`/g, '').trim() });
  }
  if (rows.length !== 7) problems.push('索引表映射条数 ' + rows.length + ' ≠ 7');
  for (const r of rows) {
    if (!r.pageCli.startsWith('calorie-cmd-read calorie.')) {
      problems.push('第 ' + r.n + ' 行「预检页命令」不是可跑 CLI：' + JSON.stringify(r.pageCli));
    }
    if (r.wake === '') problems.push('第 ' + r.n + ' 行唤醒词为空');
  }
  return { rows, problems };
}

function readSkill() {
  assert.ok(existsSync(SKILL_MD), 'SKILL.md 缺失：' + SKILL_MD);
  return readFileSync(SKILL_MD, 'utf8');
}

/** `SKILL.md` 身体段（本节起、到下一个 `## ` 标题止）。 */
function bodySection(text) {
  const start = text.indexOf('## 场景 08 身体细节');
  assert.ok(start >= 0, 'SKILL.md 缺「场景 08 身体细节」一节');
  const rest = text.slice(start + 1);
  const end = rest.indexOf('\n## ');
  return end < 0 ? rest : rest.slice(0, end);
}

let pass = 0;
let total = 0;
/** 计分包装：`fn` 可为 async（测试运行器会等它 resolve 再判）。 */
function check(name, fn) {
  test(name, async () => {
    total += 1;
    await fn();
    pass += 1;
    console.log('PASS ' + name);
  });
}

/* ── ① 索引表：写词 → 预检页命令 7 条逐条在（SKILL.md 与 workflows/08 两处同源） ── */

check('① SKILL.md 身体段索引表恰 7 条，每条都是可跑 CLI（红点：删一行映射）', () => {
  const { rows, problems } = parseIndexTable(bodySection(readSkill()));
  assert.deepEqual(problems, [], '索引表结构问题：' + JSON.stringify(problems));
  assert.deepEqual(rows.map((r) => r.n), [1, 2, 3, 4, 5, 6, 7], '序号须连续 1..7');
  assert.deepEqual(rows.map((r) => r.wake).sort(), [...INDEX_7_WORDS].sort(), '7 条映射的唤醒词逐条对上');
  // 「预检页命令」列的值必须是注册表里的键（照抄即跑）
  for (const r of rows) {
    const key = r.pageCli.replace(/^calorie-cmd-read /, '').split(' ')[0];
    assert.ok(CALORIE_COMBOS[key] !== undefined, '第 ' + r.n + ' 行预检页命令不是注册表里的键：' + key);
  }
  // 5 条写词行必须指向**它自己那条写命令**的预检页（源＝wizardPlate 的 WIZARD_WRITE_KEYS）
  const pageOf = new Map();
  for (const key of BODY_KEYS) {
    const hit = CALORIE_COMBOS[key];
    if (hit !== undefined) pageOf.set(key, key);
  }
  const byWord = new Map(rows.map((r) => [r.wake, r]));
  for (const word of ['记体脂（皮褶钳）', '记体脂（外部测量）', '补记体脂']) {
    assert.equal(byWord.get(word).pageCli, 'calorie-cmd-read calorie.view.composition-wizard', word + ' 的预检页命令');
  }
  for (const word of ['记围度', '补记围度']) {
    assert.equal(byWord.get(word).pageCli, 'calorie-cmd-read calorie.view.measure-wizard', word + ' 的预检页命令');
  }
});

check('① workflows/08-身体细节.md 索引表与 SKILL.md 同形同数（两处不许走散）', () => {
  assert.ok(existsSync(WORKFLOW_MD), '索引表资产缺失：' + WORKFLOW_MD);
  const doc = readFileSync(WORKFLOW_MD, 'utf8');
  const { rows, problems } = parseIndexTable(doc);
  assert.deepEqual(problems, [], '资产里的索引表结构问题：' + JSON.stringify(problems));
  const skill = parseIndexTable(bodySection(readSkill()));
  assert.deepEqual(rows.map((r) => [r.n, r.wake, r.pageCli]),
    skill.rows.map((r) => [r.n, r.wake, r.pageCli]), '两处索引表逐行相同');
  // 「页面入口」标注只要求 SKILL.md（判据④的落点）；资产里允许用「入口一览」一节讲同一件事。
  assert.equal(skill.rows.filter((r) => r.entry).length, 2, 'SKILL.md 两行入口标注');
  assert.ok(doc.includes('页面入口'), '资产须说明哪两行是页面入口');
});

check('① 负向对照：删掉一条映射 → ①必红（夹具＝同文本去掉第 5 行）', () => {
  const text = bodySection(readSkill());
  const lines = text.split('\n');
  const at = lines.findIndex((l) => l.includes('| 5 | `补记围度`'));
  assert.ok(at > 0, '前置：夹具要删的那一行没找到');
  const mutated = lines.filter((_, i) => i !== at).join('\n');
  const { rows, problems } = parseIndexTable(mutated);
  assert.equal(rows.length, 6, '删一条后应只剩 6 条');
  assert.ok(problems.some((p) => p.includes('≠ 7')), '删一条必须被报出：' + JSON.stringify(problems));
  // 还原必绿（同一文本原样解析回 7 条）
  assert.equal(parseIndexTable(text).rows.length, 7, '还原后必须仍是 7 条');
  assert.deepEqual(parseIndexTable(text).problems, []);
});

check('① 7 条映射逐条在：8 条写词/入口词都能在路由面命中（负向的正面基线）', () => {
  for (const word of INDEX_7_WORDS) {
    const hits = routesFor(word);
    assert.ok(hits.length > 0, '路由面无此词：' + word);
  }
});

/* ── ② 照抄执行：索引表里一条 → exit 0 ＋落盘整页（六项读数） ── */

/** 索引表里挑一条跑：取第 4 行（`记围度` → 围度预检确认页），空库照开页（#366 口径）。 */
check('② 照索引表一条照抄执行 → exit 0 ＋落盘整页（六项读数）', async () => {
  const { rows } = parseIndexTable(bodySection(readSkill()));
  const row = rows.find((r) => r.wake === '记围度');
  assert.ok(row !== undefined, '索引表缺「记围度」行');
  const dir = mkdtempSync(join(tmpdir(), 't368-'));
  // 建库：走本包 `openDb`（与 wizard-86 同法；空库照开页＝不预置记录）
  const { openDb } = await import('../dist/index.js');
  openDb(join(dir, 'calorie_data.db')).close();
  const argv = row.pageCli.split(' ').slice(1);          // 去掉 `calorie-cmd-read` 前缀换成 CLI 路径
  const out = join(dir, 't368-precheck.html');
  const run = spawnSync(NODE_BIN, [BIN, ...argv, '--html', out], {
    encoding: 'utf8', env: { ...process.env, ...homeEnvOf(calorieConfigDir(dir))},
  });
  assert.equal(run.status, 0, '照抄执行未过：exit=' + run.status + ' stderr=' + run.stderr.slice(-300));
  const env = JSON.parse(run.stdout.trim());
  assert.equal(env.key, 'calorie.view.measure-wizard', 'envelope key 逐字');
  // 六项读数（t169 §一 判据口径：退出码／doctype／charset／内联样式 ≥2KB／无外链／回执路径可读）
  // 注：styleBytes 是**当刻构建**的共享样式字节数（随各席在途的公共层改动浮动），故只判「≥ 2 KB 下限」，
  // 不把某个具体数字钉成期望值（钉了就会被他席的正常推进弄红）。
  const html = readFileSync(out, 'utf8');
  const cssBytes = Buffer.byteLength((html.match(/<style[^>]*>[\s\S]*?<\/style>/g) || []).join(''), 'utf8');
  // 「无外链」＝不从仓外加载资源（排除 `xmlns` 命名空间声明与注释；外链形态＝ src/href 指向 http(s):// 或 //）
  const noComment = html.replace(/<!--[\s\S]*?-->/g, '').replace(/xmlns(:\w+)?="[^"]*"/g, '');
  const external = (noComment.match(/(?:src|href)\s*=\s*["']?(?:https?:)?\/\//gi) || []);
  console.log('T368-READINGS ② exit=' + run.status + ' key=' + env.key
    + ' doctype=' + (html.startsWith('<!doctype html>') ? 1 : 0)
    + ' charset=' + (html.includes('charset') ? 1 : 0)
    + ' styleBytes=' + cssBytes
    + ' external=' + external.length
    + ' pathOk=' + (existsSync(env.data.output) ? 1 : 0));
  assert.ok(html.startsWith('<!doctype html>'), '首行不是 doctype');
  assert.ok(html.includes('charset'), '缺 charset');
  assert.ok(cssBytes >= 2048, '内联样式 < 2KB：' + cssBytes);
  assert.deepEqual(external, [], '页面从仓外加载资源：' + JSON.stringify(external.slice(0, 3)));
  assert.ok(existsSync(env.data.output), '回执给的绝对路径不可读：' + env.data.output);
});

/* ── ③ HELP 产物：身体 13 条卡片的命令字段值 == 注册表命令名（13/13） ── */

check('③ HELP 产物身体 13 条卡片的命令字段值 == 注册表命令名（13/13）', () => {
  const scenes = buildHelpSceneData().groups.flatMap((g) => g.subgroups.flatMap((s) => s.scenes));
  const bodyScenes = scenes.filter((s) => BODY_13_WORDS.includes(s.wake_word));
  assert.equal(bodyScenes.length, 13, '身体卡片条数＝13');
  assert.deepEqual(bodyScenes.map((s) => s.wake_word).sort(), [...BODY_13_WORDS].sort(), '13 条词逐条对上');
  let ok = 0;
  for (const scene of bodyScenes) {
    const fields = scene.editable_fields ?? [];
    const cmdField = fields.find((f) => f.name === HELP_COMMAND_FIELD_NAME);
    assert.ok(cmdField !== undefined, scene.wake_word + ' 缺「命令」字段');
    assert.equal(cmdField.label, HELP_COMMAND_FIELD_LABEL, scene.wake_word + ' 命令字段文案');
    // 期望值＝路由层该唤醒词的首条 exec 路由的**键**（＝注册表命令名），不取本实现输出
    const want = helpSceneCommand(scene.wake_word);
    assert.ok(want !== null && CALORIE_COMBOS[want] !== undefined,
      scene.wake_word + ' 的注册表命令名取不到：' + String(want));
    assert.equal(cmdField.value, want, scene.wake_word + ' 命令字段值 ≠ 注册表命令名');
    assert.ok(/^calorie\.[a-z0-9-]+\.[a-z0-9-]+$/.test(cmdField.value), '命令名形状不对：' + cmdField.value);
    if (cmdField.value === want) ok += 1;
  }
  console.log('T368-READINGS ③ 命令字段==注册表命令名 ' + ok + '/13');
  assert.equal(ok, 13, '13 条必须逐条相等');
});

check('③ HELP 卡片「工作流程」栏在册（与卡片分组同源，不另立流程表）', () => {
  const groups = buildHelpSceneData().groups;
  const body = groups.find((g) => g.id === 'body_detail');
  assert.ok(body !== undefined, '缺「身体细节」分组');
  const subgroupNames = new Set(body.subgroups.map((s) => s.label));
  for (const sg of body.subgroups) {
    for (const scene of sg.scenes) {
      const fields = scene.editable_fields ?? [];
      const flow = fields.find((f) => f.name === HELP_FLOW_FIELD_NAME);
      assert.ok(flow !== undefined, scene.wake_word + ' 缺「工作流程」栏');
      assert.equal(flow.label, HELP_FLOW_FIELD_LABEL, scene.wake_word + ' 工作流程栏文案');
      assert.equal(flow.value, sg.label, scene.wake_word + ' 工作流程值须＝该卡所属子功能名');
      assert.ok(subgroupNames.has(flow.value), '流程值不在分组名单里：' + flow.value);
    }
  }
  const words = body.subgroups.flatMap((s) => s.scenes.map((x) => x.wake_word));
  assert.equal(words.length, 13, '身体分组卡片 13 条');
});

/* ── ④ SKILL.md 身体段：首列不出现命令名冒充唤醒词；页面入口行标明自己是入口 ── */

check('④ 身体段表格首列不出现命令名冒充唤醒词（红点：把命令名当唤醒词写进首列）', () => {
  const section = bodySection(readSkill());
  const tableRows = section.split('\n').filter((l) => l.startsWith('| ') && /^\| *\d+ *\|/.test(l));
  assert.equal(tableRows.length, 7, '索引表 7 行（逐行体检首列）');
  for (const line of tableRows) {
    const first = line.split('|')[2].trim();
    assert.equal(/^`?calorie\./.test(first), false, '首列是命令名（冒充唤醒词）：' + line);
    assert.equal(/^calorie-/.test(first), false, '首列是命令名：' + line);
  }
  // 非索引表的行（入口一览等）也扫一遍：身体段里 `| ` 起的表格首列同样不许是命令名
  for (const line of section.split('\n').filter((l) => l.startsWith('| #'))) {
    assert.equal(line.includes('calorie.'), false, '身体段标题行不该含命令名：' + line);
  }
});

check('④ 页面入口行标明自己是入口（索引表第 6、7 行，恰 2 条）', () => {
  const { rows } = parseIndexTable(bodySection(readSkill()));
  const entryRows = rows.filter((r) => r.entry);
  assert.equal(entryRows.length, 2, '页面入口行恰 2 条');
  assert.deepEqual(entryRows.map((r) => r.wake).sort(), ['看体脂向导', '看围度向导'], '入口行是两条向导词');
  for (const r of entryRows) {
    assert.equal(r.writeKey, '—（页本身不改库）', '入口行的「会改数据库的命令」必须写明不改库');
  }
  // 反向：5 条写词行**不许**被标成页面入口（那是另一类行）
  assert.equal(rows.filter((r) => !r.entry).length, 5, '写词行恰 5 条');
});

check('④ 速查表两行向导的代表唤醒词列已退回命令名（#367 交棒的两行陈旧回绿）', () => {
  const text = readSkill();
  for (const key of ['calorie.view.composition-wizard', 'calorie.view.measure-wizard']) {
    assert.ok(text.includes('| ' + key + ' | ' + key + ' |'), '速查表该行应退回列命令名：' + key);
    assert.equal(text.includes('| 看体脂向导 |' + key), false, '不得再列自造入口词：' + key);
    assert.equal(text.includes('| 看围度向导 |' + key), false, '不得再列自造入口词：' + key);
  }
});

/* ── ⑤ 判据自证（本门自己的鉴别力）+ 摘要 ── */

check('⑤ 判据自证：合成夹具上「缺行必报／命令名冒充唤醒词必报」', () => {
  const good = ['| # | 唤醒词 | 预检页命令（照抄即跑） | 会改数据库的命令 | 从哪一步走 |',
    '|---|---|---|---|---|',
    '| 1 | `记围度` | `calorie-cmd-read calorie.view.measure-wizard` | `calorie.body.measure-add` | x |'];
  // 合成夹具：只 1 行 → 行数问题必报
  const short = parseIndexTable(good.join('\n'));
  assert.deepEqual(short.rows.length, 1);
  assert.ok(short.problems.some((p) => p.includes('≠ 7')), '缺行必报');
  // 合成夹具：首列写命令名 → ④ 的判据必红
  const badFirst = good.slice(0, 2).concat(['| 1 | calorie.body.measure-add | `calorie-cmd-read calorie.view.measure-wizard` | — | x |']);
  const bad = parseIndexTable(badFirst.join('\n'));
  assert.equal(/^`?calorie\./.test(bad.rows[0].wake), true, '夹具确实把命令名写进了首列');
  // 合成夹具：预检页格不是 CLI → 必报
  const badCell = good.slice(0, 2).concat(['| 1 | `记围度` | 围度预检页 | — | x |']);
  assert.ok(parseIndexTable(badCell.join('\n')).problems.some((p) => p.includes('不是可跑 CLI')), '非 CLI 必报');
  console.log('T368-SELFTEST short=' + short.rows.length + ' badFirst=1 badCell=1');
});

test('T368-SUMMARY', () => {
  console.log('RESULT: ' + pass + '/' + total + ' 通过（票面判据 ①②③④ ＋ 自证⑤）');
  assert.equal(pass, total, '有判据未通过');
});
