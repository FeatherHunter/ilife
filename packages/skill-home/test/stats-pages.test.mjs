// #811 · 统计总览域用例（SM4-1～SM4-4）：真命令链 → 页族装配 → 三件判据。
//
// 跑法（仓根，经排队）：
//   node tooling/run-locked.mjs --ticket 811 --max-wait-ms 600000 -- node --test packages/skill-home/test/stats-pages.test.mjs
// 前提：`node node_modules/typescript/bin/tsc -b packages/skill-home`（页模块走 dist）。
// 隔离：家目录指临时目录，不碰生产库与种子源。
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pkgDir = join(here, '..');
const repoRoot = join(pkgDir, '..', '..');
const bin = join(pkgDir, 'dist', 'cli', 'cmd_read.js');
const appendix = JSON.parse(readFileSync(join(repoRoot, 'docs', 'skills', 'skill-home', 'scene-pages-contract.appendix.json'), 'utf8'));

let HOME = '';
const homeEnv = () => ({ ...process.env, USERPROFILE: HOME, HOME });
function run(key, params) {
  const a = params === undefined ? [key] : [key, '--params', JSON.stringify(params)];
  return spawnSync(process.execPath, [bin, ...a], { encoding: 'utf8', env: homeEnv() });
}
function runOk(key, params, label) {
  const r = run(key, params);
  assert.equal(r.status, 0, label + ' exit=' + r.status + ' ERR=' + (r.stderr || '').trim().slice(0, 300));
  const lines = (r.stdout || '').split('\n').map((s) => s.trim()).filter(Boolean);
  return JSON.parse(lines[lines.length - 1]);
}
function stamp(d = new Date()) {
  const p = (x) => String(x).padStart(2, '0');
  return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '_' + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds());
}
function ymd(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const p = (x) => String(x).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

const FAMS = ['overview', 'idle', 'expiring', 'inventory_stat'];
const STAMP = stamp();

before(async () => {
  assert.ok(existsSync(bin), 'dist 未建：先跑 node node_modules/typescript/bin/tsc -b packages/skill-home');
  HOME = mkdtempSync(join(tmpdir(), 'stats811-'));
  runOk('home.stats.overview', {}, 'seed overview');
  const cats = runOk('home.tag.query', { kind: 'categories' }, 'seed categories').data.items;
  const cid = cats.find((c) => String(c.name).startsWith('分类:')).count;
  runOk('home.item.add', { name: '用例牛奶', category_id: cid, location: '客厅/冰箱', expiration_date: ymd(5) }, 'seed exp-future');
  runOk('home.item.add', { name: '用例雨衣', category_id: cid, location: '阳台/柜子', expiration_date: ymd(-3) }, 'seed exp-past');
  runOk('home.item.add', { name: '用例扳手', category_id: cid, location: '书房/抽屉' }, 'seed plain');
  runOk('home.inventory.round', { op: 'round', scope: 'all' }, 'seed round');
  // #865：闲置判据改按 `coalesce(last_accessed_at, created_at)` 算（老 idle.py 口径），
  // 刚录入、从没用过的件不再算闲置——本用例要把种子件真置成闲置（回拨最后一次使用日）。
  const { DatabaseSync } = await import('node:sqlite');
  const db = new DatabaseSync(join(HOME, '.ilife', 'data', 'home.db'));
  try {
    const cut = new Date();
    cut.setDate(cut.getDate() - 120);
    db.prepare("UPDATE items SET last_accessed_at=? WHERE name LIKE '用例%'").run(cut.toISOString());
  } finally {
    db.close();
  }
});

function paramsFor(family) {
  if (family === 'overview') return { kind: 'summary' };
  if (family === 'idle') return { kind: 'idle', days: 90 };
  if (family === 'expiring') return { kind: 'expiring', days: 30 };
  return { kind: 'inventory' };
}
function keyFor(family) {
  return family === 'idle' || family === 'expiring' ? 'home.stats.alert' : 'home.stats.overview';
}

describe('#811 统计总览域：真链与两层解析', () => {
  for (const fam of FAMS) {
    it(fam + ' 真链 exit 0 且形状正确', () => {
      const env = runOk(keyFor(fam), paramsFor(fam), '真链 ' + fam);
      assert.equal(env.key, keyFor(fam));
      assert.ok(env.delivery && typeof env.delivery.path === 'string' && env.delivery.path.endsWith('.html'));
    });
  }
  it('两层解析命中四族', async () => {
    const { resolvePageFamily } = await import(pathToFileURL(join(pkgDir, 'dist', 'render', 'pageFamilies.js')).href);
    assert.equal(resolvePageFamily('home.stats.overview', { kind: 'summary' }), 'overview');
    assert.equal(resolvePageFamily('home.stats.alert', { kind: 'idle' }), 'idle');
    assert.equal(resolvePageFamily('home.stats.alert', { kind: 'expiring' }), 'expiring');
    assert.equal(resolvePageFamily('home.stats.overview', { kind: 'inventory' }), 'inventory_stat');
  });
  it('REQUIRED_BLOCKS 与附录逐族一致', async () => {
    for (const fam of FAMS) {
      const page = await import(pathToFileURL(join(pkgDir, 'dist', 'stats', 'pages', fam + '.js')).href);
      const want = appendix.families.find((f) => f.family === fam).requiredBlocks;
      assert.deepEqual(page.REQUIRED_BLOCKS, want);
      assert.deepEqual([...page.PAGE_META.scenarios], appendix.families.find((f) => f.family === fam).scenarios);
    }
  });
});

describe('#811 统计总览域：装配产物与三件判据', () => {
  let dir = '';
  it('四族装配出产物（块位齐，空态真空态双路径）', async () => {
    dir = mkdtempSync(join(tmpdir(), 'stats811prod-'));
    const { escapeHtml } = await import(pathToFileURL(join(pkgDir, 'dist', 'render', 'html.js')).href);
    const cases = [
      ['overview', 'SM4-1', '统物品'],
      ['idle', 'SM4-2', '查闲置'],
      ['expiring', 'SM4-3', '查过期'],
      ['inventory_stat', 'SM4-4', '盘点统计'],
    ];
    for (const [fam, sid, cn] of cases) {
      const env = runOk(keyFor(fam), paramsFor(fam), '装配真链 ' + fam);
      const page = await import(pathToFileURL(join(pkgDir, 'dist', 'stats', 'pages', fam + '.js')).href);
      const html = page.renderFamilyPage(env);
      for (const m of ['<!--CONTENT-->', '<!--SHARED-CSS-->', '<!--SHARED-HELPERS-->']) {
        assert.ok(!html.includes(m), fam + ' 标记未填充：' + m);
      }
      assert.ok(html.includes('<!DOCTYPE html>') && html.includes('<h1>'));
      const famRow = appendix.families.find((f) => f.family === fam);
      for (const g of ['fields', 'operations', 'empty', 'status']) {
        assert.ok(html.includes('data-block="' + g + '"'), fam + ' 缺块组：' + g);
        for (const b of famRow.requiredBlocks[g]) assert.ok(html.includes(escapeHtml(b)), fam + ' 缺块 [' + g + '] ' + b.slice(0, 20));
      }
      writeFileSync(join(dir, cn + '_' + sid + '_' + STAMP + '.html'), html, 'utf8');
    }
    // 空态真路径：新库总览必现空态引导
    const home2 = mkdtempSync(join(tmpdir(), 'stats811empty-'));
    const r = spawnSync(process.execPath, [bin, 'home.stats.overview', '--params', JSON.stringify({ kind: 'summary' })],
      { encoding: 'utf8', env: { ...process.env, USERPROFILE: home2, HOME: home2 } });
    assert.equal(r.status, 0);
    const lines = (r.stdout || '').split('\n').map((s) => s.trim()).filter(Boolean);
    const env0 = JSON.parse(lines[lines.length - 1]);
    const page0 = await import(pathToFileURL(join(pkgDir, 'dist', 'stats', 'pages', 'overview.js')).href);
    assert.ok(page0.renderFamilyPage(env0).includes('还没有物品'));
    // 闲置真路径：用例库 3 件全闲置
    const idleEnv = runOk('home.stats.alert', { kind: 'idle', days: 90 }, '闲置计数');
    assert.ok(idleEnv.data.total >= 3);
    const expEnv = runOk('home.stats.alert', { kind: 'expiring', days: 30 }, '过期计数');
    assert.ok(expEnv.data.total >= 2);
  });
  it('分隔符判据 exit 0', () => {
    const r = spawnSync(process.execPath, [join(pkgDir, 'scripts', 'audit-separators.mjs'), '--dir', dir, '--quiet'], { encoding: 'utf8' });
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /RESULT: 4\/4/);
  });
  it('结构块判据 exit 0', () => {
    const r = spawnSync(process.execPath,
      [join(pkgDir, 'scripts', 'audit-page-blocks.mjs'), '--dir', dir, '--blocks', join(pkgDir, 'scripts', 'page-blocks.json')],
      { encoding: 'utf8' });
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /RESULT: 4\/4/);
  });
  it('双端判据 exit 0（无浏览器时跳过）', async () => {
    const cands = [process.env.DSH_BROWSER,
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].filter(Boolean);
    const { existsSync: ex } = await import('node:fs');
    if (!cands.some((p) => { try { return ex(p); } catch { return false; } })) {
      console.log('    # 跳过：本机无 Chrome／Edge');
      return;
    }
    const r = spawnSync(process.execPath, [join(pkgDir, 'scripts', 'audit-responsive.mjs'), '--dir', dir], { encoding: 'utf8' });
    assert.equal(r.status, 0, r.stdout + r.stderr);
  });
});
