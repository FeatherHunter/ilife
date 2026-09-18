#!/usr/bin/env node
/**
 * #478 判据：「改运动记录」「删运动记录」两条写词的入口可执行（示例参数不再是一个不可达的常量 id）。
 *
 * 判据分四组（真假由本脚本判；每组各给读数行）：
 *  ① 入口形状：两处定义地（冻结表 `main_prompt.cli`／`data_source` 与路由声明 `cli`）都没有
 *     「字面 `"id":1`」，且各自带占位符 `"<记录号>"`；`fill_hints` 写明记录号从哪来。
 *  ② 不可达正例仍阻断：把占位符原样（不填）递进真出口 → 非 0 退出、**不落盘**、提示参数问题。
 *  ③ 端到端可跑：从**真实种子库**取一个真实记录号 → 真出口 exit 0 ＋ 产物是完整文档 ＋
 *     库内那一行确实被改／被软删（读数取自库，不取自产物自述）。
 *  ④ 既有门禁同源：本件只判上面三组；39 条词的整链锁归 `exercise-accept-267.test.mjs`。
 *
 * 用法：node --test packages/skill-calorie/test/exercise-id-entry-478.test.mjs
 * 变异自证（判据读 `dist/`，变异后必须 `pnpm build` 再跑）：
 *   T478_MUT=1 node --test packages/skill-calorie/test/exercise-id-entry-478.test.mjs
 *   ⇒ ① 组与 ③ 组必红（把两条词的 `cli` 当成「字面常量 id」的旧形态来判）。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdtempSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { calorieConfigDir, configTestBase, freezeClock } from './helpers/config-test.mjs';
// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
process.env.ILIFE_CONFIG_DIR = configTestBase();

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const DIST = join(PKG, 'dist');
const BIN = join(DIST, 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const TODAY = '2026-09-07';
const DAY = 86400000;
const MUT = process.env.T478_MUT === '1';

/** 变异：把两条词的期望形状判成「字面常量 id:1」（旧形态）⇒ ① 组必红。 */
const MUT_EXPECT = '"id":1';
const EXPECT = MUT ? MUT_EXPECT : '"id":"<记录号>"';

const { openDb, DB_FILENAME } = await import(pathToFileURL(join(DIST, 'index.js')).href);
const { SCENE_04_EXERCISE } = await import(pathToFileURL(join(DIST, 'triggers', 'scene-04-exercise.js')).href);
const { EXERCISE_ROUTES } = await import(pathToFileURL(join(DIST, 'exercise', 'routes.js')).href);
const { assertDocPage } = await import(pathToFileURL(join(HERE, 'doc-page-assert.mjs')).href);

const WORDS = ['改运动记录', '删运动记录'];
const rows = (word) => SCENE_04_EXERCISE.filter((t) => t.wake_word === word);
const routeOf = (word) => EXERCISE_ROUTES.filter((r) => r.wakeWord === word);

/** 一条读数行（机器可读摘要；复核只读这一行）。 */
function say(group, text) { console.log(`[${group}] ${text}`); }

const isoAt = (i) => new Date(Date.parse(TODAY + 'T12:00:00Z') - i * DAY).toISOString().slice(0, 10);

/** 满种子库：每天 3 条，跨 400 天（与 #267 同形；真库零接触，库一律落系统临时根）。 */
function seedDir(tag, days) {
  const dir = mkdtempSync(join(tmpdir(), tag + '-'));
  const db = openDb(join(dir, DB_FILENAME));
  db.prepare("INSERT OR REPLACE INTO user_profile (id, age, gender, height_cm, activity_level) VALUES (1, 30, 'male', 175, 'moderate')").run();
  const ins = db.prepare('INSERT INTO exercise_log (id, date, exercise_type, duration_minutes, calories_burned, category, note) VALUES (?,?,?,?,?,?,?)');
  let id = 0;
  for (let i = 0; i < days; i += 1) {
    for (const row of [['慢跑', 30, 320, '有氧', i % 3 === 0 ? '夜跑' : null], ['卧推', 25, 150, '力量', null], ['步行', 20, 80, '日常', null]]) {
      id += 1;
      ins.run(id, isoAt(i), ...row);
    }
  }
  db.close();
  return dir;
}

/** 真出口跑一次：库路径经 `SKILLS_DB_PATH` 指向本词的独立副本（真库零接触）。 */
function runWord(seed, word, cli, tag) {
  const dir = mkdtempSync(join(tmpdir(), tag + '-'));
  copyFileSync(join(seed, DB_FILENAME), join(dir, DB_FILENAME));
  const toks = tokenize(cli);
  const r = spawnSync(NODE_BIN, [BIN, ...toks.slice(1)], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, ILIFE_CONFIG_DIR: calorieConfigDir(dir), ...freezeClock(TODAY) },
  });
  const outDir = join(dir, 'calorie_html');
  const landed = existsSync(outDir) ? readdirSync(outDir).filter((f) => f.endsWith('.html')) : [];
  const env = (() => { try { return JSON.parse(String(r.stdout).trim().split(/\r?\n/).pop()); } catch { return null; } })();
  const out = env?.data?.output ?? null;
  return {
    word, dir, status: r.status, env, out, landed,
    stderrTail: String(r.stderr || '').trim().split(/\r?\n/).filter(Boolean).slice(-1)[0] ?? '',
    bytes: typeof out === 'string' && existsSync(out) ? statSync(out).size : null,
    html: typeof out === 'string' && existsSync(out) ? readFileSync(out, 'utf8') : '',
  };
}

/** 命令原文 → argv（首个 token 是 `calorie-cmd-read` 本身，由 `dist/cli/cmd_read.js` 顶替）。 */
function tokenize(cli) {
  const out = []; let cur = ''; let q = null;
  for (const ch of String(cli)) {
    if (q) { if (ch === q) q = null; else cur += ch; }
    else if (ch === "'" || ch === '"') q = ch;
    else if (ch === ' ') { if (cur) { out.push(cur); cur = ''; } } else cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}

/** 占位符填充：`<日期>` 补真日期，记录号占位符补真记录号（不给即原样，按不可达正例跑）。
 *  注意冻结表里的 `cli` 是**带转义的原文**（`{\"id\":\"<记录号>\"}`），所以占位符按两种引号形态都换。 */
function fill(cli, recordId) {
  let s = String(cli).replaceAll('<日期>', isoAt(3)).replaceAll('<开始日期>', isoAt(200)).replaceAll('<结束日期>', TODAY);
  if (recordId !== undefined && recordId !== null) {
    s = s.replaceAll('\\"<记录号>\\"', '\\"' + recordId + '\\"').replaceAll('"<记录号>"', '"' + recordId + '"');
  }
  return s;
}

function maxLiveId(seed) {
  const db = openDb(join(seed, DB_FILENAME));
  try {
    const r = db.prepare('SELECT MAX(id) AS id FROM exercise_log WHERE COALESCE(is_deleted, 0) = 0').get();
    return r === undefined || r.id === null ? null : String(r.id);
  } finally { db.close(); }
}

function rowById(seed, id) {
  const db = openDb(join(seed, DB_FILENAME));
  try { return db.prepare('SELECT * FROM exercise_log WHERE id = ?').get(Number(id)); } finally { db.close(); }
}

/* ── ① 入口形状（两处定义地） ───────────────────────────────────────────── */

test('#478 G1 两条词的示例参数不是不可达的常量 id（冻结表 ＋ 路由声明两处同形）', () => {
  const readings = [];
  for (const word of WORDS) {
    const frozen = rows(word);
    assert.equal(frozen.length, 1, word + ' 冻结表应恰好 1 条');
    const t = frozen[0];
    const decl = routeOf(word);
    assert.equal(decl.length, 1, word + ' 路由声明应恰好 1 条');
    assert.ok(t.main_prompt.cli.includes(EXPECT), word + ' 冻结表 cli 不是期望的示例参数形状：' + t.main_prompt.cli);
    assert.equal(t.main_prompt.cli, t.data_source, word + ' 冻结表 cli 与 data_source 不同形');
    assert.ok(decl[0].cli.includes(EXPECT), word + ' 路由声明 cli 与冻结表不同形：' + decl[0].cli);
    assert.equal(t.fill_hints.length, 1, word + ' 缺「记录号从哪来」的说明（fill_hints）');
    assert.ok(/calorie\.view\.exercise-records/.test(t.fill_hints[0]), word + ' fill_hints 没写清记录号从哪来：' + t.fill_hints[0]);
    readings.push(word + ' 形状=占位符 说明=有');
  }
  say('G1', readings.join('｜') + '（两处定义地逐条同形，无字面 id:1）');
});

/* ── ② 不可达正例仍阻断 ─────────────────────────────────────────────────── */

test('#478 G2 占位符原样（没填记录号）递进真出口：阻断、不落盘、不编产物', () => {
  const seed = seedDir('t478-g2', 3);
  const readings = [];
  for (const word of WORDS) {
    const cli = fill(rows(word)[0].main_prompt.cli);
    const rec = runWord(seed, word, cli, 't478-g2-run');
    assert.notEqual(rec.status, 0, word + ' 未填记录号时必须阻断，实得 exit 0');
    assert.equal(rec.out, null, word + ' 阻断时不得给产物路径');
    assert.equal(rec.landed.length, 0, word + ' 阻断时不得落盘：' + rec.landed.join(','));
    readings.push(word + ' exit=' + rec.status + ' 落盘=0 提示=' + rec.stderrTail);
  }
  say('G2', readings.join('｜'));
});

/* ── ③ 端到端可跑（真记录号） ───────────────────────────────────────────── */

test('#478 G3 取真记录号后两条词都跑得通：exit 0 ＋ 完整文档 ＋ 库内那一行确实动了', () => {
  const seed = seedDir('t478-g3', 400);
  const recordId = maxLiveId(seed);
  assert.ok(recordId !== null && Number(recordId) > 0, '种子库里没有可用记录号');
  const readings = [];

  /* 两条词各跑在**自己那份工作副本**上（真出口写的是 `SKILLS_DB_PATH` 指的那份），
   * 于是「改」看改后值、「删」看软删标志——读数取自工作副本，不取自产物自述。 */
  const upd = runWord(seed, '改运动记录', fill(rows('改运动记录')[0].main_prompt.cli, recordId), 't478-g3-upd');
  assert.equal(upd.status, 0, '改运动记录 真跑失败：' + upd.stderrTail);
  assert.ok(typeof upd.out === 'string' && existsSync(upd.out), '改运动记录 产物路径不存在');
  assertDocPage(upd.html, '改运动记录');
  assert.ok(upd.bytes !== null && upd.bytes > 4096, '改运动记录 产物太小（片段？）：' + upd.bytes);
  const before = rowById(seed, recordId);
  const after = rowById(upd.dir, recordId);
  assert.notEqual(after.duration_minutes, before.duration_minutes, '改运动记录 跑完工作副本里时长没变');
  assert.equal(after.duration_minutes, 40, '改运动记录 时长没落到命令给的 40：' + after.duration_minutes);
  readings.push('改运动记录 记录号=' + recordId + ' 时长 ' + before.duration_minutes + '→' + after.duration_minutes
    + ' 字节=' + upd.bytes + ' 形状=完整文档');

  const rem = runWord(seed, '删运动记录', fill(rows('删运动记录')[0].main_prompt.cli, recordId), 't478-g3-rem');
  assert.equal(rem.status, 0, '删运动记录 真跑失败：' + rem.stderrTail);
  assert.ok(typeof rem.out === 'string' && existsSync(rem.out), '删运动记录 产物路径不存在');
  assertDocPage(rem.html, '删运动记录');
  assert.ok(rem.bytes !== null && rem.bytes > 4096, '删运动记录 产物太小（片段？）：' + rem.bytes);
  const removed = rowById(rem.dir, recordId);
  assert.equal(removed.is_deleted, 1, '删运动记录 跑完工作副本里该行没被软删');
  readings.push('删运动记录 记录号=' + recordId + ' is_deleted=1（软删） 字节=' + rem.bytes + ' 形状=完整文档');

  say('G3', readings.join('｜'));
});
