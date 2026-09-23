/** #471 · 「新词别名」（`list:'new'` 族）的**查找面**：`searchHelp`／`lookupWake`／`calorie.help.lookup` 真出口。
 *
 * 速查台上那一节（`meta_blocks` ＋ text 段的投影）已按用户 2026-09-24 裁定下线——用户对那 72 条「补口词」
 * 的裁定是「不单独上页」（页面上只剩一份 HELP HTML，查单条走 `calorie.help.lookup`）。故本文件只留**查找面**：
 * ① 声明件扫描；⑤ 逐词 `searchHelp`／`lookupWake` 首命中＝自己的键与 CLI；⑥ 逐词真出口 exit 0；⑦ 兜底收窄。
 *
 * 运行：先 `pnpm build`，再 `node --test packages/skill-calorie/test/help-new-family-471.test.mjs`
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
import { buildHelpSceneData } from '../dist/photo/helpScene.js';
import { calorieConfigDir, configTestBase } from './helpers/config-test.mjs';
import { homeEnvOf } from '../../../test/helpers/home-test-base.mjs';
// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
configTestBase();

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
    encoding: 'utf8', env: { ...process.env, ...homeEnvOf(calorieConfigDir(dbDir))}, maxBuffer: 1 << 30,
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
