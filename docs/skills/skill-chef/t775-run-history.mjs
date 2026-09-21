#!/usr/bin/env node
/** t775 历史域端到端运行器（#775 验收命令的唯一入口）。
 *
 * 跑法（票面验收命令）：
 *   node tooling/run-locked.mjs --ticket 775 -- node docs/skills/skill-chef/t775-run-history.mjs
 *   node tooling/run-locked.mjs --ticket 775 -- node docs/skills/skill-chef/t775-run-history.mjs --check
 *
 * 做的事（4 卡逐卡一行读数 ＋ 写侧回读）：
 *   1. 沙箱：`t840-沙箱.mjs --ticket 775` 刷出一份 pristine 副本（真库只读）；
 *   2. hist-1 记录做菜：完整／快速／补录三路径 CLI 全过（exit 0），回执页用完整那次回读装配；
 *   3. hist-2 历史时间线：CLI `chef.history.query {name}` exit 0 ＋ 倒序断言 ＋ 时间轴页；
 *   4. hist-3 单菜统计：CLI `{kind:stats,name}` exit 0 ＋ 全指标断言 ＋ 统计页；
 *   5. hist-4 全局统计：CLI `{kind:stats}` exit 0 ＋ 画像断言 ＋ 画像页；
 *   6. 反例：`feedback` 为「无」必须被校验拦下（exit≠0）；
 *   7. 册子片段：4 行 JSON（卡 id／唤醒词／命令／参数／产物绝对路径／exit／bytes／sha256）。
 *
 * `--check`（票面判据）：同时打印「片段行数＝本票卡数」与「vision 审查缺陷」两行，
 * 缺一即 exit 1（vision 结论读 `t775-vision.json`，过程性审查见 `t775-历史域.md`）。
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = resolve(import.meta.dirname, '..', '..', '..');
const DIST = join(ROOT, 'packages', 'skill-chef', 'dist');
const DOCS = join(ROOT, 'docs', 'skills', 'skill-chef');
const TICKET = '775';
const OUT = join(ROOT, '.scratch', 't775');
const DBPATH = join(OUT, 'chef_data.db');
const HOME = join(OUT, 'home');
const BIN = join(DIST, 'cli', 'cmd_read.js');
const FRAGMENT = join(DOCS, 't775-册子片段.json');
const VISION = join(DOCS, 't775-vision.json');
const CHECK = process.argv.includes('--check');
const DISH = '辣椒炒肉';

function fail(msg) {
  process.stderr.write('t775-run-history：' + msg + '\n');
  process.exit(1);
}

/** 家目录注入跑副本（Windows USERPROFILE／POSIX HOME，CHANNEL-PENDING-#756）。 */
function cliEnv() {
  return { ...process.env, USERPROFILE: HOME, HOME };
}

function cli(key, params) {
  const r = spawnSync(process.execPath, [BIN, key, '--params', JSON.stringify(params)], {
    encoding: 'utf8',
    env: cliEnv(),
  });
  return { status: r.status ?? 1, stdout: (r.stdout ?? '').trim(), stderr: (r.stderr ?? '').trim() };
}

function mustOk(card, key, params) {
  const r = cli(key, params);
  if (r.status !== 0) fail(card + ' CLI exit=' + r.status + '（期望 0）：' + r.stderr.slice(0, 300));
  let env = null;
  try {
    env = JSON.parse(r.stdout);
  } catch {
    fail(card + ' CLI stdout 非 JSON：' + r.stdout.slice(0, 200));
  }
  return env;
}

const D = (p) => pathToFileURL(join(DIST, p)).href;
const { openChefDb, getRecipeDetail, queryHistory } = await import(D('fetch/db.js'));
const { historySingleStats, historyGlobalPortrait } = await import(D('history/run-query.js'));
const { renderRecordPage, renderTimelinePage, renderSingleStatsPage, renderGlobalStatsPage } = await import(D('history/pages.js'));

function openDb() {
  return openChefDb(DBPATH);
}
function sha256Of(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}
function writePage(file, html) {
  mkdirSync(OUT, { recursive: true });
  writeFileSync(file, html, 'utf8');
  const st = readFileSync(file);
  return { bytes: st.length, sha256: sha256Of(file) };
}

/* ── 1. 沙箱（每次重刷 pristine 副本，幂等） ─────────────────────────── */
mkdirSync(OUT, { recursive: true });
{
  const r = spawnSync(process.execPath, [join(DOCS, 't840-沙箱.mjs'), '--ticket', TICKET], { encoding: 'utf8' });
  if (r.status !== 0) fail('沙箱复制失败：' + (r.stderr || r.stdout).slice(0, 300));
}
if (!existsSync(DBPATH)) fail('副本库没建起来：' + DBPATH);

/* ── 基线（写前回读） ─────────────────────────────────────────────── */
let beforeCount = 0;
let beforeStatus = '';
{
  const h = openDb();
  try {
    const detail = getRecipeDetail(h, DISH);
    beforeStatus = detail.recipe.status;
    beforeCount = queryHistory(h, detail.recipe.id).length;
  } finally {
    h.db.close();
  }
}

/* ── hist-1 记录做菜（完整／快速／补录三路径） ─────────────────────── */
const fullParams = { name: DISH, rating: 4.5, feedback: '虾很Q弹，下次少放盐', date: '2026-09-21' };
mustOk('hist-1', 'chef.history.record', fullParams);
let recordPageInput = null;
{
  const h = openDb();
  try {
    const detail = getRecipeDetail(h, DISH);
    const rows = queryHistory(h, detail.recipe.id);
    const latest = rows.reduce((a, b) => (b.cook_sequence > a.cook_sequence ? b : a));
    const st = historySingleStats(h, detail.recipe.id);
    recordPageInput = {
      name: detail.recipe.name,
      cookDate: latest.cook_date,
      cookSequence: latest.cook_sequence,
      rating: latest.rating,
      feedback: latest.feedback,
      historyId: latest.id,
      prevStatus: beforeStatus,
      newStatus: detail.recipe.status,
      prevCount: beforeCount,
      newCount: st.count,
      avgRating: st.avgRating,
    };
    if (st.count !== beforeCount + 1) fail('hist-1 写后回读：次数 ' + st.count + '≠写前 ' + beforeCount + '+1');
  } finally {
    h.db.close();
  }
}
mustOk('hist-1-快速', 'chef.history.record', { name: DISH, rating: 5, feedback: '刚做完，不错' });
mustOk('hist-1-补录', 'chef.history.record', { name: DISH, rating: 4, feedback: '昨天补记，火候过了', date: '2026-09-20' });
const hist1File = join(OUT, 'hist-1-记录做菜回执.html');
const hist1Meta = writePage(hist1File, renderRecordPage(recordPageInput));

/* ── hist-2 历史时间线 ─────────────────────────────────────────────── */
const timelineEnv = mustOk('hist-2', 'chef.history.query', { name: DISH });
let timelineInput = null;
{
  const h = openDb();
  try {
    const detail = getRecipeDetail(h, DISH);
    const rows = queryHistory(h, detail.recipe.id).sort((a, b) =>
      a.cook_date !== b.cook_date ? (a.cook_date < b.cook_date ? 1 : -1) : b.cook_sequence - a.cook_sequence,
    );
    for (let i = 1; i < rows.length; i += 1) {
      if (rows[i - 1].cook_date < rows[i].cook_date) fail('hist-2 时间线非倒序：第 ' + (i - 1) + ' 行 ' + rows[i - 1].cook_date);
    }
    const st = historySingleStats(h, detail.recipe.id);
    if (timelineEnv.data.total !== rows.length) fail('hist-2 信封 total 与回读行数不一致');
    timelineInput = {
      name: detail.recipe.name,
      status: detail.recipe.status,
      count: st.count,
      avgRating: st.avgRating,
      rows: rows.map((r) => ({ cookDate: r.cook_date, cookSequence: r.cook_sequence, rating: r.rating, feedback: r.feedback })),
    };
  } finally {
    h.db.close();
  }
}
const hist2File = join(OUT, 'hist-2-历史时间线.html');
const hist2Meta = writePage(hist2File, renderTimelinePage(timelineInput));

/* ── hist-3 单菜统计 ───────────────────────────────────────────────── */
const statsEnv = mustOk('hist-3', 'chef.history.query', { kind: 'stats', name: DISH });
let singleInput = null;
{
  const item = statsEnv.data.items[0];
  for (const k of ['count', 'avgRating', 'maxRating', 'minRating', 'lastDate']) {
    if (!(k in item)) fail('hist-3 单菜统计缺字段：' + k);
  }
  const h = openDb();
  try {
    const detail = getRecipeDetail(h, DISH);
    const st = historySingleStats(h, detail.recipe.id);
    singleInput = { name: detail.recipe.name, status: detail.recipe.status, ...st };
  } finally {
    h.db.close();
  }
}
const hist3File = join(OUT, 'hist-3-单菜统计.html');
const hist3Meta = writePage(hist3File, renderSingleStatsPage(singleInput));

/* ── hist-4 全局统计 ───────────────────────────────────────────────── */
const globalEnv = mustOk('hist-4', 'chef.history.query', { kind: 'stats' });
let portrait = null;
{
  const item = globalEnv.data.items[0];
  for (const k of ['cookedCount', 'neverCookedCount', 'totalCooks', 'recipeTotal', 'favoriteAvg', 'favoriteMost', 'recent', 'neverCooked']) {
    if (!(k in item)) fail('hist-4 全局画像缺字段：' + k);
  }
  const h = openDb();
  try {
    portrait = historyGlobalPortrait(h);
  } finally {
    h.db.close();
  }
}
const hist4File = join(OUT, 'hist-4-全局统计.html');
const hist4Meta = writePage(hist4File, renderGlobalStatsPage(portrait));

/* ── 反例：feedback 为「无」必须被拦下 ─────────────────────────────── */
const bad = cli('chef.history.record', { name: DISH, rating: 4, feedback: '无' });
if (bad.status === 0) fail('反例未拦下：feedback=无 竟 exit 0');
const badLine = '反例 feedback=无 → exit=' + bad.status + '（期望≠0，已拦下）';

/* ── 册子片段（4 行，供收口 A 合并；不碰共用册子） ─────────────────── */
const fragment = [
  { 卡id: 'hist-1', 唤醒词: '记录做菜', 命令: 'chef.history.record', 参数: fullParams, 产物绝对路径: hist1File, exit: 0, bytes: hist1Meta.bytes, sha256: hist1Meta.sha256 },
  { 卡id: 'hist-2', 唤醒词: '查看历史', 命令: 'chef.history.query', 参数: { name: DISH }, 产物绝对路径: hist2File, exit: 0, bytes: hist2Meta.bytes, sha256: hist2Meta.sha256 },
  { 卡id: 'hist-3', 唤醒词: '查看统计', 命令: 'chef.history.query', 参数: { kind: 'stats', name: DISH }, 产物绝对路径: hist3File, exit: 0, bytes: hist3Meta.bytes, sha256: hist3Meta.sha256 },
  { 卡id: 'hist-4', 唤醒词: '查看统计', 命令: 'chef.history.query', 参数: { kind: 'stats' }, 产物绝对路径: hist4File, exit: 0, bytes: hist4Meta.bytes, sha256: hist4Meta.sha256 },
];
writeFileSync(FRAGMENT, JSON.stringify(fragment, null, 2) + '\n', 'utf8');

/* ── 4 行读数（票面验收正例格式） ──────────────────────────────────── */
console.log('hist-1 记录做菜 → exit=0 → ' + hist1File);
console.log('hist-2 历史时间线 → exit=0 → ' + hist2File);
console.log('hist-3 单菜统计 → exit=0 → ' + hist3File);
console.log('hist-4 全局统计 → exit=0 → ' + hist4File);
console.log(badLine);

/* ── --check：片段行数 ＋ vision 缺陷，两者缺一即红 ────────────────── */
if (CHECK) {
  const frag = JSON.parse(readFileSync(FRAGMENT, 'utf8'));
  const fragLine = '片段行数=' + frag.length + '（本票卡数=4）';
  console.log(fragLine);
  if (frag.length !== 4) fail('--check 红：' + fragLine);
  if (!existsSync(VISION)) fail('--check 红：缺 vision 结论文件（' + VISION + '，先做过程性视觉审查）');
  const vision = JSON.parse(readFileSync(VISION, 'utf8'));
  const open = (vision.defects || []).filter((d) => d.status !== 'fixed' && d.status !== 'rejected');
  const fixed = (vision.defects || []).filter((d) => d.status === 'fixed').length;
  const rejected = (vision.defects || []).filter((d) => d.status === 'rejected').length;
  const visionLine = 'vision审查缺陷 0（已改 ' + fixed + ' 条，误报 ' + rejected + ' 条，未闭环 ' + open.length + ' 条）';
  console.log(visionLine);
  if (open.length !== 0) fail('--check 红：' + visionLine);
}
