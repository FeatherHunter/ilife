#!/usr/bin/env node
/** #156 · 场景 04「运动」现状页面样张取证（AFK 席）。
 *
 * 目的：给**模板融合设计席**留一份当前产物——本图各页面族今天真跑出来的整页 HTML，
 * 逐族一张，落 `.scratch/t156-samples/*.html`（`.scratch/` 已 ignore，**不进版本库**）。
 *
 * 照抄的三件（模板优先，不另起炉灶）：
 *   `packages/skill-calorie/test/exercise-receipt-264.test.mjs`（临时库怎么建、真 CLI 怎么跑、信封怎么读）
 *   `packages/skill-calorie/test/exercise-records-342.test.mjs`（记录级明细页 ＋ 备注筛选）
 *   `packages/skill-calorie/test/exercise-routes-265.test.mjs`（冻结表 `main_prompt.cli` 逐字取 ＋
 *   `calorie-cmd-read <key> --params '<json>'` 的解析）
 *
 * 逐词参数**一律从冻结表现取**（`dist/triggers/scene-04-exercise.js` 的 `main_prompt.cli`），
 * 本件不另抄一份参数：票面词改了，样张跟着改（口径同 #265 的 D2④ 同源）。
 *
 * 跑法（持锁）：
 *   node tooling/run-locked.mjs --ticket 156-samples --run-id <标识> -- \
 *     node docs/skills/skill-calorie/t156-现状取样.mjs
 *
 * 前置：`packages/skill-calorie/dist/` 已是可跑状态。本席**不重建 dist**（树上有多席在途的
 * 生成物，重建会覆写他人在途件），只核对并登记 `src` 与 `dist` 的新旧关系（末段 `STALE` 行）。
 *
 * 只写一处：`.scratch/t156-samples/`（样张 ＋ 本件自己的临时工作区 `_work/`）；源码／测试／
 * 生成物／冻结表一律只读。临时库**不落系统 temp**：取样当时 C: 只剩 0.01 GB，`mkdtemp` 即 ENOSPC。
 * 末行打机读摘要 `RESULT: n/n`（成功张数／总张数）。
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..', '..');
const PKG = join(REPO, 'packages', 'skill-calorie');
const BIN = join(PKG, 'dist', 'cli', 'cmd_read.js');
const DIST_ROOT = join(PKG, 'dist');
const SRC_ROOT = join(PKG, 'src');
const OUT_DIR = join(REPO, '.scratch', 't156-samples');
const WORK_ROOT = join(OUT_DIR, '_work');
const DB_FILENAME = 'calorie_data.db';
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';

/* ── 样张表：一「族」一张；词与参数都按冻结表现取 ─────────────────────────────
 * `mode`：add／update／remove＝写后回执三张（各自临时库）；read＝读类（共用一份已播种数据）。
 * 「运动汇总」取窗口词 `看本周运动`：冻结表把它描述为「看本周运动汇总」，
 * 而 `看今日运动` 现指记录级明细（#342），故今日窗口另作一张（`records-today.html`）留证。 */
const SAMPLES = [
  { file: 'add-receipt.html', family: '写后回执 · 新增', wake: '记运动', mode: 'add' },
  { file: 'update-receipt.html', family: '写后回执 · 修改', wake: '改运动记录', mode: 'update' },
  { file: 'remove-receipt.html', family: '写后回执 · 删除', wake: '删运动记录', mode: 'remove' },
  { file: 'records.html', family: '记录级明细', wake: '看运动记录（有备注）', mode: 'read' },
  { file: 'distribution.html', family: '类型分布', wake: '看运动类型分布', mode: 'read' },
  { file: 'trend.html', family: '趋势', wake: '看运动趋势', mode: 'read' },
  { file: 'recap.html', family: '复盘', wake: '运动复盘（本周）', mode: 'read' },
  { file: 'strength.html', family: '力量总览', wake: '看力量训练总览', mode: 'read' },
  { file: 'cardio.html', family: '有氧总览', wake: '看有氧训练总览', mode: 'read' },
  { file: 'goal.html', family: '对照目标', wake: '看今日运动（vs 目标）', mode: 'read' },
  { file: 'summary.html', family: '运动汇总', wake: '看本周运动', mode: 'read' },
  { file: 'records-today.html', family: '记录级明细 · 今日窗口', wake: '看今日运动', mode: 'read' },
];

/* ── 小工具 ─────────────────────────────────────────────────────────────── */

function argValue(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : null;
}

const shiftISO = (iso, delta) =>
  new Date(Date.parse(iso + 'T12:00:00Z') + delta * 86400000).toISOString().slice(0, 10);

const TODAY = argValue('--today') ?? process.env['CALORIE_TODAY'] ?? new Date().toISOString().slice(0, 10);

/** 建临时库（照抄 #264 的 `mkDir`：先 `openDb` 建出终态 schema，CLI 再开同一路径）。
 *  落点改到本件自己的临时工作区（`.scratch/t156-samples/_work/`，D: 盘）。 */
function mkDbDir(tag, openDb) {
  const dir = mkdtempSync(join(WORK_ROOT, tag + '-'));
  const db = openDb(join(dir, DB_FILENAME));
  db.close();
  return dir;
}

/** 真 CLI 跑一条命令（照抄 #264 的 `runCli`：key ＋ `--params` ＋ `--html`，库路径走 SKILLS_DB_PATH）。 */
function runCli(dir, key, params, outPath) {
  const args = [BIN, key];
  if (params !== undefined) args.push('--params', JSON.stringify(params));
  args.push('--html', outPath);
  const r = spawnSync(NODE_BIN, args, {
    encoding: 'utf8',
    env: { ...process.env, SKILLS_DB_PATH: dir, CALORIE_TODAY: TODAY },
  });
  const stdout = String(r.stdout || '').trim();
  return {
    status: r.status,
    stderr: String(r.stderr || '').trim(),
    envelope: stdout.startsWith('{') ? JSON.parse(stdout) : null,
    stdout: stdout.slice(0, 400),
    argv: NODE_BIN + ' ' + args.join(' '),
  };
}

/** 冻结表的 `main_prompt.cli` → `{ key, params }`（`calorie-cmd-read <key> --params '<json>'`）。 */
function parseRoutedCli(cli) {
  const m = String(cli).match(/^calorie-cmd-read\s+(\S+)(?:\s+--params\s+'(.*)')?$/s);
  if (!m) throw new Error('冻结表 cli 不是唯一出口形态：' + cli);
  return { key: m[1], params: m[2] === undefined ? undefined : JSON.parse(m[2]) };
}

/** 冻结表里的 `<日期>`／`<开始日期>`／`<结束日期>` 占位换成真日期。 */
function fillDates(params) {
  if (params === undefined) return undefined;
  const map = { '<日期>': TODAY, '<开始日期>': shiftISO(TODAY, -6), '<结束日期>': TODAY };
  const walk = (v) => {
    if (typeof v === 'string') return map[v] ?? v;
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]));
    return v;
  };
  return walk(params);
}

/* ── 读类样张共用的播种数据（一次播种，全部读命令共用这一库） ─────────────── */
const SEEDS = [
  { type: '卧推', calories: 150, minutes: 30, category: '力量', loadKg: 60, reps: 10, note: '夜练', date: shiftISO(TODAY, -1) },
  { type: '户外跑', calories: 300, minutes: 30, category: '有氧', distance: 5, date: shiftISO(TODAY, -2) },
  { type: '慢跑', calories: 320, minutes: 30, note: '夜跑', date: shiftISO(TODAY, -3) },
  { type: '步行', calories: 80, minutes: 20, category: '日常', steps: 3000, note: '通勤', date: shiftISO(TODAY, -4) },
  { type: '卧推', calories: 160, minutes: 30, category: '力量', loadKg: 62.5, reps: 8, note: '第二次', date: shiftISO(TODAY, -5) },
  { type: '户外跑', calories: 350, minutes: 35, category: '有氧', distance: 6, note: '晨跑', date: TODAY },
];

/** 播种：写词逐条跑（真 CLI）；另给 `daily_goal.exercise_goal` 落一个目标值。
 *  该列**没有** CLI 设值入口（全仓只有读它的 `render/planPlate.ts`），故直连临时库写这一格，
 *  否则 `看…（vs 目标）` 按 `missing-data` 拒绝出页（`planPlate.ts:214`）。 */
function seed(dir, frozenAdd, openDb, discardDir) {
  for (let i = 0; i < SEEDS.length; i += 1) {
    const r = runCli(dir, frozenAdd.key, SEEDS[i], join(discardDir, 'seed-' + i + '.html'));
    if (r.status !== 0) throw new Error('播种第 ' + i + ' 条 exit ' + r.status + '：' + r.stderr.slice(-300));
  }
  const db = openDb(join(dir, DB_FILENAME));
  db.exec('INSERT OR IGNORE INTO daily_goal (id) VALUES (1)');
  db.prepare('UPDATE daily_goal SET exercise_goal = ? WHERE id = 1').run(500);
  db.close();
}

/* ── 产物读数（写说明用的机械事实，不做审美判断） ─────────────────────────── */

const deTag = (s) => s.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const pick = (html, re) => {
  const m = html.match(re);
  return m ? deTag(m[1]) : null;
};

/** 结构标签：按出现位置排序的「版块标题」——写说明时逐张照抄，不做解释。 */
const BLOCK_PATTERNS = [
  [/<caption[^>]*>([\s\S]*?)<\/caption>/g, 'caption'],
  [/<h2[^>]*>([\s\S]*?)<\/h2>/g, 'h2'],
  [/<h3[^>]*>([\s\S]*?)<\/h3>/g, 'h3'],
  [/<summary[^>]*>([\s\S]*?)<\/summary>/g, 'summary'],
  [/<div class="[^"]*disclosure-summary[^"]*"[^>]*>([\s\S]*?)<\/div>/g, '折叠'],
  [/<div class="[^"]*kpi-card-label[^"]*"[^>]*>([\s\S]*?)<\/div>/g, 'KPI'],
  [/<div class="[^"]*copy-menu-label[^"]*"[^>]*>([\s\S]*?)<\/div>/g, '复制区'],
  [/<div class="[^"]*eyebrow[^"]*"[^>]*>([\s\S]*?)<\/div>/g, '眉标'],
];

function blocksOf(html) {
  const hits = [];
  for (const [re, kind] of BLOCK_PATTERNS) {
    for (const m of html.matchAll(re)) {
      const text = deTag(m[1]);
      if (text) hits.push({ at: m.index, label: kind + '：' + text });
    }
  }
  const seen = new Set();
  return hits.sort((a, b) => a.at - b.at).map((h) => h.label).filter((l) => !seen.has(l) && seen.add(l)).slice(0, 40);
}

function factsOf(html) {
  const count = (re) => [...html.matchAll(re)].length;
  const style = html.match(/<style>([\s\S]*?)<\/style>/);
  const script = html.match(/<script>([\s\S]*?)<\/script>/);
  const classes = [...new Set([...html.matchAll(/<div class="([^"]+)"/g)].map((m) => m[1]))];
  return {
    bytes: Buffer.byteLength(html, 'utf8'),
    title: pick(html, /<title>([\s\S]*?)<\/title>/),
    h1: pick(html, /<h1[^>]*>([\s\S]*?)<\/h1>/),
    eyebrow: pick(html, /<(?:div|p|span) class="[^"]*eyebrow[^"]*"[^>]*>([\s\S]*?)<\/(?:div|p|span)>/),
    sections: [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)].map((m) => deTag(m[1])),
    tables: count(/<table/g),
    rows: count(/<tr/g),
    svg: count(/<svg/g),
    details: count(/<details/g),
    print: /@media\s*print|window\.print/.test(html),
    anchors: count(/<a\s[^>]*href="#/g),
    copyFmt: [...html.matchAll(/data-fmt="([^"]+)"/g)].map((m) => m[1]),
    copyLog: html.includes('ilife-copy-log'),
    styleBytes: style ? Buffer.byteLength(style[1], 'utf8') : 0,
    scriptBytes: script ? Buffer.byteLength(script[1], 'utf8') : 0,
    leadClasses: classes.slice(0, 18),
  };
}

/** `src` 比 `dist` 新的件（只登记，不重建；exercise 相关的件不在此列才算 dist 对本题够用）。 */
function staleSources() {
  const out = [];
  const walk = (dir, rel) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      const r = rel ? rel + '/' + e.name : e.name;
      if (e.isDirectory()) walk(p, r);
      else if (e.name.endsWith('.ts')) {
        const d = join(DIST_ROOT, r.replace(/\.ts$/, '.js'));
        if (!existsSync(d)) out.push(r + '（dist 缺件）');
        else if (statSync(p).mtimeMs > statSync(d).mtimeMs) out.push(r);
      }
    }
  };
  walk(SRC_ROOT, '');
  return out;
}

/* ── 主流程 ─────────────────────────────────────────────────────────────── */

const { openDb } = await import(pathToFileURL(join(DIST_ROOT, 'index.js')).href);
const { SCENE_04_EXERCISE } = await import(pathToFileURL(join(DIST_ROOT, 'triggers', 'scene-04-exercise.js')).href);

const frozenOf = (wake) => {
  const hit = SCENE_04_EXERCISE.filter((t) => t.wake_word === wake);
  if (hit.length !== 1) throw new Error('冻结表里「' + wake + '」应恰 1 条，实测 ' + hit.length);
  return { ...parseRoutedCli(hit[0].main_prompt.cli), name: hit[0].name, template: hit[0].html_template };
};

mkdirSync(OUT_DIR, { recursive: true });
rmSync(WORK_ROOT, { recursive: true, force: true });   // 只清本件自己的工作区（上一轮残留）
mkdirSync(WORK_ROOT, { recursive: true });
const workDir = mkdtempSync(join(WORK_ROOT, 'run-'));
const discardDir = join(workDir, 'discard');
mkdirSync(discardDir, { recursive: true });

const ADD_FROZEN = frozenOf('记运动');
const dataDir = mkDbDir('read', openDb);
seed(dataDir, ADD_FROZEN, openDb, discardDir);

const results = [];
for (const [i, s] of SAMPLES.entries()) {
  const seq = String(i + 1).padStart(2, '0');
  const frozen = frozenOf(s.wake);
  const rawPath = join(workDir, s.file);
  let dir = dataDir;
  let params = fillDates(frozen.params);
  let note = '';
  try {
    if (s.mode === 'add' || s.mode === 'update' || s.mode === 'remove') {
      dir = mkDbDir(s.mode, openDb);
      if (s.mode !== 'add') {
        const seedOut = join(discardDir, s.mode + '-seed.html');
        const seeded = runCli(dir, ADD_FROZEN.key, ADD_FROZEN.params, seedOut);
        if (seeded.status !== 0) throw new Error('种子 exit ' + seeded.status + '：' + seeded.stderr.slice(-300));
        const id = seeded.envelope?.data?.receipt?.recordId;
        if (id !== undefined && params && params.id !== undefined && params.id !== id) {
          params = { ...params, id };
          note = '（票面 id=' + frozen.params.id + ' 换成刚种下的真 id=' + id + '）';
        }
      }
    }
    const ran = runCli(dir, frozen.key, params, rawPath);
    const html = existsSync(rawPath) ? readFileSync(rawPath, 'utf8') : null;
    const ok = ran.status === 0 && html !== null;
    if (ok) copyFileSync(rawPath, join(OUT_DIR, s.file));
    results.push({
      seq, file: s.file, family: s.family, wake: s.wake, key: frozen.key,
      template: frozen.template, params, exit: ran.status, ok, note,
      envelopeOutput: ran.envelope?.data?.output ?? null,
      deliveredMatchesSample: ran.envelope?.data?.output === rawPath,
      stderr: ran.stderr.slice(-400), stdout: ran.stdout,
      cli: 'calorie-cmd-read ' + frozen.key + (params === undefined ? '' : " --params '" + JSON.stringify(params) + "'"),
      argv: ran.argv, facts: html === null ? null : factsOf(html),
      samplePath: join(OUT_DIR, s.file),
    });
  } catch (err) {
    results.push({ seq, file: s.file, family: s.family, wake: s.wake, key: frozen.key, ok: false, exit: null, stderr: String(err.message), facts: null, samplePath: join(OUT_DIR, s.file) });
  }
}

const okCount = results.filter((r) => r.ok).length;
const stale = staleSources();

console.log('=== #156 场景 04「运动」现状样张 ===');
console.log('取样日 CALORIE_TODAY=' + TODAY + '；CLI=' + BIN + '（mtime ' + statSync(BIN).mtime.toISOString() + '）');
console.log('样张目录=' + OUT_DIR + '；临时库=' + dataDir + '（读类共用，种子 ' + SEEDS.length + ' 条 ＋ exercise_goal=500）');
console.log('');
for (const r of results) {
  const f = r.facts;
  console.log('SAMPLE ' + r.seq + ' ' + r.family + ' | 唤醒词「' + r.wake + '」| ' + r.file + ' | exit=' + r.exit + ' | ' + (f ? f.bytes + ' 字节' : '无产物'));
  console.log('  cmd: ' + (r.cli ?? '—') + (r.note ? ' ' + r.note : ''));
  if (!r.ok) { console.log('  FAIL: ' + (r.stderr || '').split('\n').slice(-3).join(' / ')); continue; }
  console.log('  装置: title=' + JSON.stringify(f.title) + '; h1=' + JSON.stringify(f.h1) + '; eyebrow=' + JSON.stringify(f.eyebrow));
  console.log('  版块: ' + (f.sections.length ? f.sections.join(' | ') : '（无 h2）'));
  console.log('  读数: tables=' + f.tables + ' rows=' + f.rows + ' svg=' + f.svg + ' details=' + f.details
    + ' print=' + (f.print ? 1 : 0) + ' 锚点导航=' + f.anchors + ' 复制菜单=' + (f.copyFmt.join(',') || '无')
    + ' 复制日志按钮=' + (f.copyLog ? 1 : 0) + ' style=' + f.styleBytes + 'B script=' + f.scriptBytes + 'B');
  console.log('  交付路径与信封一致=' + r.deliveredMatchesSample + '；样张=' + r.samplePath);
}
console.log('');
console.log('STALE（src 比 dist 新，本席只登记不重建）: ' + (stale.length ? stale.join('、') : '无'));

writeFileSync(join(OUT_DIR, '_facts.json'), JSON.stringify({
  ticket: '156-samples', today: TODAY, cli: BIN, cliMtime: statSync(BIN).mtime.toISOString(),
  staleSources: stale, seeds: SEEDS, exerciseGoal: 500, results,
}, null, 2) + '\n', 'utf8');

console.log('RESULT: ' + okCount + '/' + SAMPLES.length);
process.exitCode = okCount === SAMPLES.length ? 0 : 1;
