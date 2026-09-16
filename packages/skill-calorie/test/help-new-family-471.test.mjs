/** #471 · `list:'new'` 族（新词）在 HELP 两个面上的逐词判据。
 *
 * 票面（#471 裁定 B）：数据源不动——`buildHelpSceneData()` 仍只收 `SceneTrigger`；另起一节
 * 「新词别名」把 `new` 族按「词 → 命令」列出来，并在查找面（`help-lookup.ts`）登记。
 *
 * 七组判据（**逐词，不抽样**；条数一律从声明件派生，本件不写一个条数）：
 *   ① 派生对账：`src/**\/*.ts` 里 `list: 'new'` 的逐行记录 ↔ 生成物 `NEW_KEY_ROUTES` 逐条相同；
 *   ② 节面：`buildHelpNewAliases()` ↔ 同一批记录逐条投影，节标题里的条数＝现算（不是字面量）；
 *   ③ `text` 态：节标题 ＋ 逐词一行「词 · 命令名」，且 4 空格场景行数与尖括号集 `{<N>}`（#88 D-3）不动；
 *   ④ `file` 态：节块恰 1 处 ＋ 逐词在册；**场景面不动**（新词不进 `groups`／不是任何场景的 id 或唤醒词）；
 *   ⑤ 查找面（内进程）：逐词 `searchHelp`／`lookupWake` 首命中＝这条词**自己**的键与 CLI；
 *   ⑥ 真出口：逐词 `calorie.help.lookup` → `exit 0` ＋ 首条键／CLI 逐字等于声明件那一行；
 *   ⑦ 兜底收窄（宁缺勿错）：含已登记整词的查询不许被「含目标就合成 `定营养目标`」顶掉；
 *      ＋ 变异自证（夹具改坏必红）。
 *
 * 运行（持锁，票 471）：
 *   node tooling/run-locked.mjs --ticket 471 -- node node_modules/typescript/bin/tsc -b packages/skill-calorie
 *   node tooling/run-locked.mjs --ticket 471 -- node --test packages/skill-calorie/test/help-new-family-471.test.mjs
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import { NEW_KEY_ROUTES } from '../dist/triggers/routing.js';
import { HELP_LOOKUP, TRIGGERS, lookupWake, searchHelp } from '../dist/triggers/index.js';
import {
  HELP_NEW_ALIASES_META_ID, HELP_NEW_ALIASES_META_TITLE, buildHelpNewAliases, buildHelpSceneData,
  helpNewAliasesMetaBlock, newAliasesTitle, renderHelpCenterHtml, renderNewAliasesHtml,
} from '../dist/photo/helpCenter.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const SRC = join(PKG, 'src');
const BIN = join(PKG, 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';

/** 派生化：**声明件扫描**（与票面 `git grep -n "list: 'new'"` 同一口径，逐行一条记录）。
 *  识别形 ＝ 生成器认的那套（`scripts/gen-routes.mjs`）：行首是 `{ list: 'new', …` 的对象字面，
 *  按名取字段（字段序不依赖）。散文中提到的 `list:'new'`（无空格）不会落进来。 */
const DECL_LINE = /^\s*\{\s*list: 'new',/;
function declaredNewRecords() {
  const files = [];
  (function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.ts')) files.push(full);
    }
  })(SRC);
  const out = [];
  for (const file of files.sort()) {
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      if (!DECL_LINE.test(line)) return;
      const clip = /cli: '(.*)' \},?\s*$/.exec(line);
      assert.ok(clip, '声明行的 cli 字段认不出：' + file + ':' + String(i + 1));
      out.push({
        wakeWord: /wakeWord: '([^']+)'/.exec(line)[1],
        scene: /scene: '([^']+)'/.exec(line)[1],
        key: /key: '([^']+)'/.exec(line)[1],
        cli: clip[1].split("\\'").join("'"),
        at: file.slice(SRC.length + 1) + ':' + String(i + 1),
      });
    });
  }
  return out;
}

const DECLARED = declaredNewRecords();
/** 同一批记录的**按词索引**（生成物侧）。 */
const BY_WORD = new Map(NEW_KEY_ROUTES.map((route) => [route.wakeWord, route]));
const WORDS = DECLARED.map((rec) => rec.wakeWord);

/** 夹具判据（变异自证用）：词表逐条都要在给定节文本里成对出现（词 ＋ 键）。 */
function assertSectionCovers(html, rows) {
  for (const row of rows) {
    assert.ok(html.includes('>' + row.wakeWord + '</b>'), '节缺词：' + row.wakeWord);
    assert.ok(html.includes('>' + row.key + '</code>'), '节缺键：' + row.key);
  }
}

/** `escapeHtml` 同口径（`meta_blocks[].html` 原样透传，节自负转义）。 */
function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function runLookup(word, dbDir) {
  return spawnSync(NODE_BIN, [BIN, 'calorie.help.lookup', '--params', JSON.stringify({ q: word })], {
    encoding: 'utf8', env: { ...process.env, SKILLS_DB_PATH: dbDir }, maxBuffer: 1 << 30,
  });
}

/* ── ① 派生对账（不写条数） ───────────────────────────────────────────────── */

test('#471 ① 声明件 `list: \'new\'` 逐行 ↔ 生成物 `NEW_KEY_ROUTES` 逐条相同', () => {
  assert.ok(DECLARED.length > 0, '声明件里一条 `list: \'new\'` 都没有：判据失效');
  assert.equal(WORDS.length, new Set(WORDS).size, '同一唤醒词在 `list: \'new\'` 里出现两次');
  assert.equal(NEW_KEY_ROUTES.length, DECLARED.length,
    '生成物条数 ≠ 声明件条数（改了声明件要重跑 pnpm gen）');
  for (const rec of DECLARED) {
    const route = BY_WORD.get(rec.wakeWord);
    assert.ok(route, '生成物缺这条词：' + rec.wakeWord + '（' + rec.at + '）');
    assert.equal(route.key, rec.key, rec.wakeWord + ' 的键走散');
    assert.equal(route.cli, rec.cli, rec.wakeWord + ' 的 CLI 走散');
    assert.equal(route.scene, rec.scene, rec.wakeWord + ' 的场景走散');
    assert.equal(route.kind, 'exec', rec.wakeWord + ' 不是 exec 记录');
  }
  // 与 SoT 冻结表的关系：这族词**不在** `TRIGGERS` 里（正因为不在，才进不了速查台场景面）。
  const frozen = new Set(TRIGGERS.map((t) => t.wake_word));
  for (const word of WORDS) assert.equal(frozen.has(word), false, '新词混进了冻结词表：' + word);
});

/* ── ② 节面 ──────────────────────────────────────────────────────────────── */

test('#471 ② 新词别名节逐条派生：词／键／CLI ↔ 记录；标题条数现算', () => {
  const aliases = buildHelpNewAliases();
  assert.deepEqual(aliases, NEW_KEY_ROUTES.map((r) => ({ wakeWord: r.wakeWord, key: r.key, cli: r.cli })),
    '节的内容必须逐条＝生成物投影');
  assert.equal(aliases.length, DECLARED.length, '节条数 ≠ 声明件条数');
  assert.equal(HELP_NEW_ALIASES_META_ID, 'new-word-aliases');
  const block = helpNewAliasesMetaBlock();
  assert.equal(block.title, newAliasesTitle(DECLARED.length), '标题条数必须现算（不得嵌死）');
  assert.equal(block.title, HELP_NEW_ALIASES_META_TITLE + '（' + String(DECLARED.length) + ' 条）');
  // 转义后的原样落地：`<照片路径>` 这类占位符必须转义（文里不得出现裸标签）。
  assertSectionCovers(block.html, DECLARED);
  assert.equal(block.html.includes('<照片路径>'), false, '节里出现未转义的占位符＝破壳');
  const withAngle = DECLARED.filter((rec) => rec.cli.includes('<'));
  assert.ok(withAngle.length > 0, '前置自证：族里得有带尖括号占位符的 CLI（否则下面这条无鉴别力）');
  for (const rec of withAngle) {
    assert.ok(block.html.includes(esc(rec.cli)), rec.wakeWord + ' 的 CLI 没进节（转义形态）：' + rec.cli);
  }
});

/* ── ③ text 态 ───────────────────────────────────────────────────────────── */

test('#471 ③ text 态：节标题＋逐词一行「词 · 命令名」；场景行与尖括号集不动', () => {
  const text = renderHelpCenterHtml({ mode: 'text' }).html;
  const lines = text.split('\n');
  assert.ok(lines.includes('[' + newAliasesTitle(DECLARED.length) + ']'), 'text 缺节标题');
  for (const rec of DECLARED) {
    assert.ok(lines.includes('  ' + rec.wakeWord + ' · ' + rec.key), 'text 缺行：' + rec.wakeWord);
  }
  // 场景行（4 空格）＝场景面自己的条数，与本票无关（本节一律 2 空格缩进）。
  const sceneLines = lines.filter((line) => line.startsWith('    '));
  const sceneCount = buildHelpSceneData().groups.flatMap((g) => g.subgroups.flatMap((s) => s.scenes)).length;
  assert.equal(sceneLines.length, sceneCount, 'text 的 4 空格场景行数 ≠ 场景面条数（本节污染了场景序）');
  // #88 D-3 冻结口径不破：text 态尖括号集恒 {<N>}（所以本节只发命令名、不发 CLI）。
  assert.deepEqual([...new Set([...text.matchAll(/<[^<>]*>/g)].map((m) => m[0]))], ['<N>']);
  assert.equal(text.includes('可执行命令'), false, 'text 态不得出现 CLI 字段名（#106 口径）');
});

/* ── ④ file 态 ＋ 场景面不动 ──────────────────────────────────────────────── */

test('#471 ④ file 态：节块恰 1 ＋ 逐词在册；新词不进场景面（数据源不动）', () => {
  const data = buildHelpSceneData();
  const scenes = data.groups.flatMap((g) => g.subgroups.flatMap((s) => s.scenes));
  assert.equal(scenes.length, TRIGGERS.length,
    '场景数 ≠ 冻结词表条数（取数面被改动了：一条记录一个场景是既定口径）');
  const sceneIds = new Set(scenes.map((s) => s.id));
  const sceneWords = new Set(scenes.map((s) => s.wake_word));
  for (const rec of DECLARED) {
    assert.equal(sceneIds.has(rec.key), false, '新词的命令键进了场景面：' + rec.key);
    assert.equal(sceneWords.has(rec.wakeWord), false, '新词进了场景面：' + rec.wakeWord);
  }
  const file = renderHelpCenterHtml({ mode: 'file' }).html;
  assert.equal(file.split('data-meta-id="' + HELP_NEW_ALIASES_META_ID + '"').length - 1, 1, 'file 缺节块');
  assert.equal(file.split('data-new-alias="').length - 1, DECLARED.length, 'file 节里逐词条数不对');
  for (const rec of DECLARED) assert.ok(file.includes('data-new-alias="' + rec.wakeWord + '"'), 'file 缺词：' + rec.wakeWord);
  const inline = renderHelpCenterHtml({ mode: 'inline' }).html;
  assert.equal(inline.split('data-meta-id="' + HELP_NEW_ALIASES_META_ID + '"').length - 1, 1, 'inline 缺节块');
});

/* ── ⑤ 查找面（内进程，逐词） ─────────────────────────────────────────────── */

test('#471 ⑤ 逐词 searchHelp／lookupWake 首命中＝自己的键与 CLI', () => {
  for (const rec of DECLARED) {
    const hits = searchHelp(TRIGGERS, rec.wakeWord);
    assert.ok(hits.length >= 1, rec.wakeWord + ' searchHelp 无命中');
    assert.equal(hits[0].key, rec.key, rec.wakeWord + ' 首条键不是自己的：' + String(hits[0].key));
    assert.equal(hits[0].cli, rec.cli, rec.wakeWord + ' 首条 CLI 不是自己的：' + hits[0].cli);
    const lookup = lookupWake(HELP_LOOKUP, rec.wakeWord);
    assert.ok(lookup.length >= 1, rec.wakeWord + ' HELP_LOOKUP 无命中');
    assert.equal(lookup[0].key, rec.key, rec.wakeWord + ' 速查表首条键不是自己的');
    assert.equal(lookup[0].cli, rec.cli, rec.wakeWord + ' 速查表首条 CLI 不是自己的');
    assert.equal(lookup[0].scene, rec.scene, rec.wakeWord + ' 速查表首条场景不是声明的那个');
  }
});

/* ── ⑥ 真出口（逐词，全量） ───────────────────────────────────────────────── */

test('#471 ⑥ 逐词 calorie.help.lookup 真出口：一律 exit 0 且首条＝自己那行', () => {
  const dir = join(tmpdir(), 't471-help-' + String(process.pid));
  mkdirSync(dir, { recursive: true });
  const dist = {};
  const wrong = [];
  for (const rec of DECLARED) {
    const r = runLookup(rec.wakeWord, dir);
    dist[r.status] = (dist[r.status] ?? 0) + 1;
    assert.equal(r.status, 0, rec.wakeWord + ' exit ' + String(r.status) + ' ' + String(r.stderr).trim());
    const env = JSON.parse(String(r.stdout));
    const first = env.data.items[0];
    assert.ok(env.data.total >= 1, rec.wakeWord + ' 无命中');
    if (String(first.key) !== rec.key || String(first.cli) !== rec.cli) {
      wrong.push(rec.wakeWord + ' → ' + String(first.key) + ' / ' + String(first.cli));
    }
  }
  assert.deepEqual(wrong, [], '这些词首条不是自己的命令（错位命中）');
  assert.deepEqual(dist, { 0: DECLARED.length }, '逐词 exit 分布不是「全 0」：' + JSON.stringify(dist));
});

/* ── ⑦ 兜底收窄（宁缺勿错）＋ 变异自证 ─────────────────────────────────────── */

test('#471 ⑦ 兜底收窄：含已登记整词的查询不许被「含目标就合成」顶掉', () => {
  // 正面基线：没被登记词认领的查询，兜底照旧给一条可执行首条（这是 #43 的既有行为，不许一并削掉）。
  const base = searchHelp(TRIGGERS, '给我看目标');
  assert.ok(base.length >= 1 && base[0].cli.startsWith('calorie-cmd-read calorie.'), '兜底正面基线失效');
  // 四个点名词：首条必须是自己的键（现状它们一律落到写词 `定营养目标`）。
  for (const word of ['看运动目标', '看目标配置', '看目标状态', '看目标预检']) {
    const rec = BY_WORD.get(word);
    assert.ok(rec, word + ' 不在 new 族（判据失效）');
    const hits = searchHelp(TRIGGERS, word);
    assert.equal(hits[0].key, rec.key, word + ' 首条不是自己的键：' + String(hits[0].key));
    assert.equal(hits.some((h) => h.cli === base[0].cli), false, word + ' 仍拿到兜底合成那条');
  }
  // 含已登记整词的更长查询：宁缺勿错——不给兜底答案。这两条是**收窄本身**的鉴别探针：
  // 它们只含派生表里的整词（`看目标预检`／`看运动目标`），手写 `WAKE_TABLE` 那三条对不上，
  // 故若把 `isRegisteredQuery` 那道闸去掉，兜底就会顶上来（必红）。
  for (const probe of ['看目标预检表', '看运动目标明细']) {
    const hits = searchHelp(TRIGGERS, probe);
    assert.equal(hits.some((h) => h.cli === base[0].cli), false, probe + ' 仍被兜底顶掉（收窄失效）');
  }
});

test('#471 ⑦ 变异自证：节少一条／别名少一条必红（夹具级）', () => {
  const aliases = buildHelpNewAliases();
  const rows = DECLARED.map((rec) => ({ wakeWord: rec.wakeWord, key: rec.key }));
  const full = renderNewAliasesHtml(aliases);
  assertSectionCovers(full, rows); // 正面：全量过
  // 变异一：把取数面改回「只收场景」（模拟 `isSceneTrigger` 过滤）——族里绝大多数词会掉出节。
  const sceneOnly = renderNewAliasesHtml(aliases.filter((a) => a.key.startsWith('calorie.view.')));
  assert.throws(() => assertSectionCovers(sceneOnly, rows), /节缺词/);
  // 变异二：别名表少一条（词掉了）——夹具侧同一判据必须报。
  const droppedWord = aliases[0].wakeWord;
  const missingWord = renderNewAliasesHtml(aliases.filter((a) => a.wakeWord !== droppedWord));
  assert.throws(() => assertSectionCovers(missingWord, rows), /节缺词/);
  // 对称面：真的少了一条时，判据对**剩下的**那批不再报（免得判据只是「永远抛」）。
  assertSectionCovers(renderNewAliasesHtml(aliases.slice(1)), rows.filter((r) => r.wakeWord !== droppedWord));
});
