#!/usr/bin/env node
// #339 · 场景 03（体重）58 条唤醒词「真出口」程序锁。
//
// 口径出处（地图 #154 本轮裁定 4，`.scratch/t154/map154-now.md:94` 逐字）：
//   「固定种子库」上，有数据那段就出结果页；**没有那段数据时给可读的缺失阻断、不落盘——这也算跑得通**，
//   不是缺陷。真坏掉的样子只有四种：报错／白页／空页／路径不是绝对路径／产物打不开。
//   ⇒ 本文件把「跑得通」钉成四格断言（地图判定三档第 ① 档）：① 命令形态合法 ② 落盘 ③ 回执给绝对路径
//     ④ 字节如实；缺失阻断（exit 恰为 4 ＋ 非空可读 stderr）记为通过并逐条打印。
//
// 数据基线：`docs/research/t81-seed.mjs`（`seedFull`／`SEED_TODAY`／`PLACEHOLDER_SUBSTITUTIONS`／`createHarness`）。
//   不另造种子库：判据在两个脚本间漂移就没意义了（该文件头注释写明这条理由）。
//   逐条命令取自冻结表 `dist/triggers/scene-03-weight.js` 的 `SCENE_03_WEIGHT`，**不手抄命令**。
//   装配照 `createHarness` 的跑法（模板库逐条复制 ＋ `SKILLS_DB_PATH`／`CALORIE_PHOTOS_DIR`／`CALORIE_TODAY`）；
//   不用它的 `runCli`，因为那条路不返回 `data.output` 与实测字节，而本锁两格都要。
//
// 只读仓：产物一律落系统 tmp，不改仓内任何文件。
// 跑法：node --test packages/skill-calorie/test/weight-wake-58-339.test.mjs
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const CLI = join(ROOT, 'packages', 'skill-calorie', 'dist', 'cli', 'cmd_read.js');
const EXPECTED = 58;
const jsonEscape = (s) => JSON.stringify(String(s)).slice(1, -1);

const seed = await import(pathToFileURL(join(ROOT, 'docs', 'research', 't81-seed.mjs')).href);
const dist = await import(pathToFileURL(join(ROOT, 'packages', 'skill-calorie', 'dist', 'index.js')).href);
const frozen = await import(pathToFileURL(join(ROOT, 'packages', 'skill-calorie', 'dist', 'triggers', 'scene-03-weight.js')).href);
const { seedFull, SEED_TODAY, PLACEHOLDER_SUBSTITUTIONS, SINGLE_COMMAND_RE, createHarness } = seed;
const { openDb, DB_FILENAME } = dist;

/** 逐条命令只从冻结表读；按 order 排序（同 order 的多条按表内次序）。 */
const items = [...frozen.SCENE_03_WEIGHT].sort((a, b) => a.order - b.order);

/** 种子库装配（`createHarness`）里的模板库：逐条真跑都从它复制一份，写命令互不污染。 */
function templateDbPath(workDir) {
  const direct = join(workDir, 'tpl', DB_FILENAME);
  if (existsSync(direct)) return direct;
  for (const e of readdirSync(workDir, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    const cand = join(workDir, e.name, DB_FILENAME);
    if (existsSync(cand)) return cand;
  }
  throw new Error('种子库装配里找不到模板库（createHarness 布局变了？）：' + workDir);
}

/** 占位符 → 真实值（与种子库同一张表；值在 JSON 字符串内，须 JSON 转义）。 */
function effective(cli) {
  let out = String(cli);
  for (const [ph, real] of PLACEHOLDER_SUBSTITUTIONS) {
    if (real === null || real === undefined || !out.includes(ph)) continue;
    out = out.split(ph).join(jsonEscape(real));
  }
  return out;
}

/** 剥脚本／样式／注释／标签后的可见文本（空页判据用）；产物正文不对外打印。 */
function visibleText(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&[a-z#0-9]+;/gi, 'x')
    .replace(/\s+/g, ' ')
    .trim();
}

let harness = null;
let template = null;
const cache = new Map();

function runOne(item, seq) {
  const cli = item.main_prompt && item.main_prompt.cli ? item.main_prompt.cli : '';
  const row = {
    seq, order: item.order, wake: item.wake_word, key: item.key, cli,
    exit: null, output: null, abs: false, exists: false, bytes: -1, textLen: -1,
    blocked: null, verdict: null, detail: '',
  };
  const head = `唤醒词「${row.wake}」(${row.key})\n命令原文: ${cli}\n`;
  if (!SINGLE_COMMAND_RE.test(cli)) {
    row.verdict = '真坏';
    row.detail = head + `出口形态非法（期望 ${SINGLE_COMMAND_RE}）`;
    return row;
  }
  const parsed = /^calorie-cmd-read (\S+)(?: --params '(.*)')?$/.exec(effective(cli));
  const runDir = join(harness.workDir, 'run-' + seq);
  mkdirSync(runDir, { recursive: true });
  copyFileSync(template, join(runDir, DB_FILENAME));
  const argv = [CLI, parsed[1]];
  if (parsed[2] !== undefined) argv.push('--params', parsed[2]);
  const r = spawnSync(process.execPath, argv, {
    encoding: 'utf8',
    env: { ...process.env, SKILLS_DB_PATH: runDir, CALORIE_PHOTOS_DIR: join(harness.workDir, 'photos'), CALORIE_TODAY: SEED_TODAY },
  });
  const stderr = String(r.stderr || '').trim().split(harness.workDir).join('<tmp>');
  const tail = stderr.slice(-200);
  row.exit = r.status;

  // 缺失阻断：exit 恰为 4 ＋ 有可读消息 —— 照裁定 4，这也是「跑得通」的一半，不是缺陷。
  if (r.status !== 0) {
    if (r.status === 4 && stderr.length > 0) { row.verdict = '缺失阻断'; row.blocked = tail; return row; }
    row.verdict = '真坏';
    row.detail = head + `退出码 ${r.status}（非 0 非 4＝报错）\nstderr 末尾 200 字: ${tail || '(空)'}`;
    return row;
  }

  let env = null;
  try { env = JSON.parse(String(r.stdout || '').trim()); } catch { env = null; }
  const out = env && env.data ? env.data.output : null;
  if (typeof out !== 'string' || out.length === 0) {
    row.verdict = '真坏';
    row.detail = head + `exit 0 但回执里没有 data.output\nstderr 末尾 200 字: ${tail || '(空)'}`;
    return row;
  }
  row.output = out;
  row.abs = isAbsolute(out);
  if (!row.abs) { row.verdict = '真坏'; row.detail = head + `回执不是绝对路径: ${out}`; return row; }
  let buf = null;
  try { buf = readFileSync(out); } catch (e) { row.verdict = '真坏'; row.detail = head + `产物打不开: ${out}（${e && e.code}）`; return row; }
  row.exists = true;
  row.bytes = statSync(out).size;
  if (row.bytes === 0) { row.verdict = '真坏'; row.detail = head + `白页：产物 0 字节（${out}）`; return row; }
  if (buf.length !== row.bytes) { row.verdict = '真坏'; row.detail = head + `字节链断裂：stat=${row.bytes} read=${buf.length}`; return row; }
  row.textLen = visibleText(buf.toString('utf8')).length;
  if (row.textLen === 0) { row.verdict = '真坏'; row.detail = head + `空页：剥标签后无可见文本（${row.bytes} 字节，${out}）`; return row; }
  row.verdict = 'OK';
  row.detail = `唤醒词「${row.wake}」命令 ${cli} exit 0 字节 ${row.bytes} 路径 ${out}`;
  return row;
}

/** 每条只真跑一次（用例之间共用读数；汇总那条也用同一批读数）。 */
function rowOf(i) {
  if (!cache.has(i)) {
    const row = runOne(items[i], i + 1);
    cache.set(i, row);
    const tag = row.verdict === 'OK' ? 'OK ' : row.verdict === '缺失阻断' ? 'BLK' : 'BAD';
    console.log(`${tag} ${String(row.seq).padStart(2)} ${row.wake} exit=${row.exit} abs=${row.abs} bytes=${row.bytes}${row.blocked ? ` :: ${row.blocked}` : ''}${row.output ? ' ' + row.output : ''}`);
  }
  return cache.get(i);
}

describe('#339 · 场景 03 体重 58 条唤醒词真出口', () => {
  before(() => {
    assert.equal(frozen.SCENE_03_WEIGHT.length, EXPECTED, `冻结表 SCENE_03_WEIGHT 期望 ${EXPECTED} 条，实际 ${frozen.SCENE_03_WEIGHT.length} 条`);
    assert.equal(items.length, EXPECTED);
    harness = createHarness();
    template = templateDbPath(harness.workDir);
    // 再核一次判定基线：种子库装配确实是「开库 ＋ seedFull」出来的，不是空库（空库跑什么都是 exit 4）。
    const checkDir = join(harness.workDir, 'seed-check');
    mkdirSync(checkDir, { recursive: true });
    const db = openDb(join(checkDir, DB_FILENAME));
    seedFull(db);
    const n = db.prepare('SELECT COUNT(*) AS n FROM weight_log').get().n;
    db.close();
    rmSync(checkDir, { recursive: true, force: true });
    assert.ok(n > 300, `种子库体重史只有 ${n} 行，判定基线不成立`);
    console.log(`种子库装配: ${harness.workDir}（SEED_TODAY=${SEED_TODAY}，体重史 ${n} 行）`);
  });

  after(() => { rmSync(join(harness.workDir, 'seed-check'), { recursive: true, force: true }); });

  it('冻结表条数是 58（少一条＝锁被跳过）', () => {
    assert.equal(frozen.SCENE_03_WEIGHT.length, EXPECTED);
    assert.equal(items.length, EXPECTED);
  });

  items.forEach((item, i) => {
    it(`${String(item.order).padStart(2, '0')}｜${item.wake_word}｜${item.key}`, () => {
      const row = rowOf(i);
      if (row.verdict === '真坏') assert.fail(row.detail);
      assert.ok(row.verdict === 'OK' || row.verdict === '缺失阻断', `未知判定 ${row.verdict}\n${row.detail}`);
      if (row.verdict === '缺失阻断') {
        assert.ok(row.exit === 4 && String(row.blocked || '').length > 0, `${row.wake} 缺失阻断须 exit=4 ＋ 有可读消息\n${row.detail}`);
        return;
      }
      // 四格：① 形态合法（runOne 开头已判）② 落盘 ③ 绝对路径 ④ 字节如实
      assert.ok(row.exists, `未落盘\n${row.detail}`);
      assert.ok(row.abs, `回执非绝对路径\n${row.detail}`);
      assert.ok(row.bytes > 0, `字节不实（实测 ${row.bytes}）\n${row.detail}`);
      assert.ok(row.textLen > 0, `空页（可见文本 ${row.textLen} 字）\n${row.detail}`);
    });
  });

  it('汇总读数 RESULT: n/58', () => {
    const rows = items.map((_, i) => rowOf(i));
    const ok = rows.filter((r) => r.verdict === 'OK').length;
    const blk = rows.filter((r) => r.verdict === '缺失阻断');
    const bad = rows.filter((r) => r.verdict === '真坏');
    console.log(`RESULT: ${ok + blk.length}/58（OK ${ok} ＋ 缺失阻断 ${blk.length} ＋ 真坏 ${bad.length}）`);
    for (const r of blk) console.log(`缺失阻断 ${r.wake}(${r.key}): ${r.blocked}`);
    for (const r of bad) console.log(`真坏 ${r.wake}(${r.key}): ${r.detail}`);
    assert.equal(bad.length, 0, `真坏 ${bad.length} 条：${bad.map((r) => r.wake).join('、')}`);
    assert.equal(ok + blk.length, EXPECTED);
  });
});
