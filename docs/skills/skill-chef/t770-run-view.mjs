#!/usr/bin/env node
/** #770 查看域批量驱动：8 卡逐卡真跑 → 结果型 HTML → 册子片段。
 *
 * 用法（均在仓根跑）：
 *   node tooling/run-locked.mjs --ticket 770 -- node docs/skills/skill-chef/t770-run-view.mjs
 *     → 打印 8 行 `卡 → exit=0 → 产物绝对路径`，`缺卡 0` 且 exit 0
 *   node tooling/run-locked.mjs --ticket 770 -- node docs/skills/skill-chef/t770-run-view.mjs --mutate <卡id>
 *     → 反例：把该卡的数据源改坏（删菜），该行必须 exit≠0 并点名该卡（不许返空页冒充）
 *   node tooling/run-locked.mjs --ticket 770 -- node docs/skills/skill-chef/t770-run-view.mjs --check
 *     → 判据：片段行数＝本票卡数 ＋ 质量门全绿 ＋ vision 审查缺陷 0（或逐条已改），缺一即红
 *
 * 数据一律走票 17 沙箱：副本 `.scratch/t770/chef_data.db`（不存在即先跑 t840-沙箱.mjs）。
 * 真库只读：本脚本只读副本，不写任何库。
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = resolve(import.meta.dirname, '..', '..', '..');
const SCRATCH = join(ROOT, '.scratch', 't770');
const DBPATH = join(SCRATCH, 'chef_data.db');
const OUTDIR = join(SCRATCH, 'pages');
const FRAG = join(ROOT, 'docs', 'skills', 'skill-chef', 't770-册子片段.json');
const VISION = join(ROOT, 'docs', 'skills', 'skill-chef', 't770-vision.json');
const LF = String.fromCharCode(10);

const argOf = (n) => { const i = process.argv.indexOf(n); return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : ''; };
const has = (n) => process.argv.includes(n);

/* 卡专属断言（返空页冒充即红）：每卡产物必须含菜名 ＋ 本卡标记。 */
const CARD_MARK = {
  view_full_recipe: '食材（',
  view_for_beginner: '新手关键成功点',
  view_recipe_with_substitution: 'section-substitution',
  view_ingredients_only: 'section-ingredients',
  view_ingredients_grouped: 'section-ingredients',
  view_steps_only: 'section-steps',
  view_nutrition_only: 'section-nutrition',
  view_background_only: 'section-background',
};

function ensureDb() {
  if (existsSync(DBPATH)) return;
  const r = spawnSync(process.execPath, [join(ROOT, 'docs', 'skills', 'skill-chef', 't840-沙箱.mjs'), '--ticket', '770'], { stdio: 'inherit' });
  if (r.status !== 0 || !existsSync(DBPATH)) { console.error('副本库没建起来：' + DBPATH); process.exit(2); }
}

async function loadDist() {
  const D = (p) => pathToFileURL(join(ROOT, 'packages', 'skill-chef', 'dist', p)).href;
  const fetch = await import(D('fetch/db.js'));
  const view = await import(D('view/run.js'));
  const page = await import(D('view/page.js'));
  return { fetch, view, page };
}

async function main() {
  ensureDb();
  const { fetch, view, page } = await loadDist();
  const CARDS = page.VIEW_CARDS;

  if (has('--check')) return check(CARDS);
  if (has('--mutate')) return mutate(argOf('--mutate'), CARDS, { fetch, view, page });

  mkdirSync(OUTDIR, { recursive: true });
  const h = fetch.openChefDb(DBPATH);
  let name = '';
  try {
    const list = fetch.listRecipes(h);
    if (!list.length) { console.error('缺卡 8：副本库无菜谱'); process.exit(1); }
    name = list[0].name;
  } finally { fetch.closeChefDb(h); }

  const rows = [];
  for (const c of CARDS) {
    const hh = fetch.openChefDb(DBPATH);
    try {
      const data = view.runRecipeView(hh, { name });
      const html = page.buildViewHtml(c.id, data.item);
      if (!html.includes(name)) { console.error(c.id + ' exit=1：产物缺菜名（空页冒充）'); process.exit(1); }
      if (!html.includes(CARD_MARK[c.id])) { console.error(c.id + ' exit=1：产物缺本卡标记 ' + CARD_MARK[c.id]); process.exit(1); }
      const abs = join(OUTDIR, c.id + '.html');
      writeFileSync(abs, html, 'utf8');
      const bytes = Buffer.byteLength(html, 'utf8');
      const sha = createHash('sha256').update(html, 'utf8').digest('hex');
      rows.push({ 卡id: c.id, 唤醒词: c.wake, 命令: 'chef.recipe.view', 参数: { name }, 产物绝对路径: abs, exit: 0, bytes, sha256: sha });
      console.log(c.id + ' → exit=0 → ' + abs);
    } catch (e) {
      console.error(c.id + ' → exit=1 → ' + (e.message ?? e));
      process.exit(1);
    } finally { fetch.closeChefDb(hh); }
  }
  writeFileSync(FRAG, JSON.stringify(rows, null, 2) + LF, 'utf8');
  console.log('缺卡 0');
}

async function mutate(cardId, CARDS, { fetch, view, page }) {
  if (!CARD_MARK[cardId]) { console.error('未知卡：' + cardId); process.exit(2); }
  // 反例：复制副本并删掉菜（数据源改坏），该卡必须失败并点名该卡。
  const bad = join(SCRATCH, 'mutate-' + cardId + '.db');
  copyFileSync(DBPATH, bad);
  const hb = fetch.openChefDb(bad);
  try {
    const list = fetch.listRecipes(hb);
    const target = list[0]?.name ?? '辣椒炒肉';
    hb.db.prepare('DELETE FROM recipes WHERE name = ?').run(target);
    let failed = false;
    try {
      const data = view.runRecipeView(hb, { name: target });
      const html = page.buildViewHtml(cardId, data.item);
      if (!html.includes(target)) failed = true;
    } catch (e) {
      failed = true;
      console.log(cardId + ' → exit=1 → ' + (e.message ?? e));
    }
    if (!failed) { console.error(cardId + ' 反例未红：数据源已坏仍返页（空页冒充）'); process.exit(1); }
  } finally { fetch.closeChefDb(hb); }
}

async function check(CARDS) {
  let red = 0;
  // ① 片段行数＝本票卡数
  if (!existsSync(FRAG)) { console.error('片段缺失：' + FRAG); red = 1; }
  else {
    const rows = JSON.parse(readFileSync(FRAG, 'utf8'));
    console.log('片段行数=' + rows.length + ' 本票卡数=' + CARDS.length);
    if (rows.length !== CARDS.length) { console.error('片段行数不对'); red = 1; }
  }
  // ② 质量门
  const g = spawnSync(process.execPath, [join(ROOT, 'docs', 'skills', 'skill-chef', 't768-质量门.mjs'), OUTDIR, '--no-browser'], { stdio: 'inherit' });
  if (g.status !== 0) { console.error('质量门红'); red = 1; }
  // ③ vision 审查
  if (!existsSync(VISION)) { console.error('vision 审查未做（缺 t770-vision.json）'); red = 1; }
  else {
    const v = JSON.parse(readFileSync(VISION, 'utf8'));
    console.log('vision 审查缺陷 ' + v.open + '（已改 ' + (v.fixed ?? 0) + '）');
    if (v.open !== 0) { console.error('vision 缺陷未清'); red = 1; }
  }
  process.exit(red);
}

await main();
