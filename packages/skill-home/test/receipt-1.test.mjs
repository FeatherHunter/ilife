// 票据凭证域（一）·购买记录与保修保养 10 条真链装配测试（#813）。
//
// 断三件事（10 场景逐个，真命令链，非 lint）：
// ① 10 条场景经真 `home-cmd-read` 逐条 exit 0（查 4＋写 1＋查 1＋写 4），
//    命名与落盘由 #801 链路保证（本件只断回执形状与关键字段）；
// ② 两族页模块三方对账（页模块／登记表／契约附录走散即红，两层解析现场复核）；
// ③ 页模块装配含必需块原文（`data-need` 属性命中）且可见层无拉丁字母
//   （`audit-separators` 英文裸词进红的回归钉）。
//
// 前提：`node node_modules/typescript/bin/tsc -b packages/skill-home`
// （页模块经 `dist/receipt/pages/*.js` 进入本用例）。
// 隔离：家目录指临时目录（同 `scaffold.test.mjs` 的家目录通道），不碰生产库。
// 本件不写 `.scratch/813/`（产物与墙由生成脚本另行落盘，见域对账文档）。
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, existsSync, readFileSync } from 'node:fs';
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
  return spawnSync(process.execPath, [bin, key, '--params', JSON.stringify(params || {})], { encoding: 'utf8', env: homeEnv() });
}
function runOk(key, params, label) {
  const r = run(key, params);
  assert.equal(r.status, 0, label + ' exit=' + r.status + ' ERR=' + (r.stderr || '').trim().slice(0, 500));
  return JSON.parse(String(r.stdout).trim().split('\n').pop());
}

let IDA = 0;
let IDB = 0;
let WID = 0;
let WID2 = 0;
const ENVS = new Map();

before(() => {
  assert.ok(existsSync(bin), 'dist 未建：先跑 node node_modules/typescript/bin/tsc -b packages/skill-home');
  HOME = mkdtempSync(join(tmpdir(), 'receipt1-'));
  runOk('home.stats.overview', {}, 'seed overview');
  const cats = runOk('home.tag.query', { kind: 'categories' }, 'seed categories').data.items;
  const cid = cats.find((c) => String(c.name).startsWith('分类:')).count;
  runOk('home.item.add', { name: '收据甲', category_id: cid, location: '客厅/桌' }, 'seed addA');
  runOk('home.item.add', { name: '收据乙', category_id: cid, location: '卧室/柜' }, 'seed addB');
  const items = runOk('home.item.search', {}, 'seed search').data.items;
  IDA = items.find((x) => x.name === '收据甲').id;
  IDB = items.find((x) => x.name === '收据乙').id;
  // 10 条真链（顺序有依赖：先查空态，再写，再查有数；保修写需物品，维修保养需保修单）
  ENVS.set('SM6-1', runOk('home.ticket.query', { kind: 'purchase' }, 'SM6-1 查购买记录'));
  ENVS.set('SM6-2', runOk('home.ticket.query', { kind: 'purchase', range: 'last-month' }, 'SM6-2 查上月购买'));
  ENVS.set('SM6-3', runOk('home.ticket.query', { kind: 'purchase', range: 'year' }, 'SM6-3 查今年花费'));
  ENVS.set('SM6-4', runOk('home.ticket.query', { kind: 'purchase', range: 'return', item_id: IDA }, 'SM6-4 查退货窗口'));
  ENVS.set('SM6-5', runOk('home.ticket.write', { kind: 'purchase', op: 'add', item_id: IDA, date: '2026-09-10', price: 199.5, channel: '京东' }, 'SM6-5 登记购买记录'));
  ENVS.set('SM6-6', runOk('home.ticket.query', { kind: 'warranty' }, 'SM6-6 查保修状态空态'));
  ENVS.set('SM6-7', runOk('home.ticket.write', { kind: 'warranty', op: 'register', item_id: IDA, start_date: '2026-01-01', duration_days: 365 }, 'SM6-7 登记保修'));
  const wlist = runOk('home.ticket.query', { kind: 'warranty' }, 'wlist 取保修单');
  const m = String(wlist.data.items?.[0]?.name || '').match(/#(\d+)/);
  assert.ok(m, '保修单未落盘，取不到单号');
  WID = Number(m[1]);
  ENVS.set('SM6-8', runOk('home.ticket.write', { kind: 'warranty', op: 'repair', warranty_id: WID, date: '2026-09-15', cost: 50 }, 'SM6-8 记录维修'));
  ENVS.set('SM6-9', runOk('home.ticket.write', { kind: 'warranty', op: 'cycle', item_id: IDB, start_date: '2026-09-01', duration_days: 90 }, 'SM6-9 设置保养周期'));
  const wlist2 = runOk('home.ticket.query', { kind: 'warranty' }, 'wlist2 取保养单');
  assert.ok((wlist2.data.items || []).length >= 2, '保养单未落盘');
  // 保养单是后建的那一张（单号较大者）
  const ids = (wlist2.data.items || []).map((x) => Number(String(x.name || '').match(/#(\d+)/)?.[1] || 0)).filter((n) => n > 0);
  WID2 = Math.max(...ids);
  assert.ok(WID2 !== WID, '保养单号应与保修单号不同');
  ENVS.set('SM6-10', runOk('home.ticket.write', { kind: 'warranty', op: 'maintain', warranty_id: WID2, date: '2026-09-16' }, 'SM6-10 执行保养'));
});

describe('#813 票据凭证（一）：10 条真链回执形状', () => {
  it('SM6-1 查购买记录 list 形', () => {
    const e = ENVS.get('SM6-1');
    assert.equal(e.key, 'home.ticket.query');
    assert.equal(e.shape, 'list');
    assert.ok(Array.isArray(e.data.items));
  });
  it('SM6-2 查上月购买 list 形（range 预设）', () => {
    const e = ENVS.get('SM6-2');
    assert.equal(e.key, 'home.ticket.query');
    assert.equal(e.shape, 'list');
  });
  it('SM6-3 查今年花费 list 形（含年度统计行）', () => {
    const e = ENVS.get('SM6-3');
    assert.equal(e.key, 'home.ticket.query');
    assert.equal(e.shape, 'list');
    assert.ok((e.data.items || []).length >= 1);
  });
  it('SM6-4 查退货窗口 list 形（须带物品）', () => {
    const e = ENVS.get('SM6-4');
    assert.equal(e.key, 'home.ticket.query');
    assert.equal(e.shape, 'list');
  });
  it('SM6-5 登记购买记录 receipt 形（含单号回执语义）', () => {
    const e = ENVS.get('SM6-5');
    assert.equal(e.key, 'home.ticket.write');
    assert.equal(e.shape, 'receipt');
    assert.match(String(e.data.message || ''), /已登记购买/);
  });
  it('SM6-6 查保修状态 list 形', () => {
    const e = ENVS.get('SM6-6');
    assert.equal(e.key, 'home.ticket.query');
    assert.equal(e.shape, 'list');
  });
  it('SM6-7 登记保修 receipt 形（含到期推算回执语义）', () => {
    const e = ENVS.get('SM6-7');
    assert.equal(e.shape, 'receipt');
    assert.match(String(e.data.message || ''), /已登记保修/);
  });
  it('SM6-8 记录维修 receipt 形（进服务事件）', () => {
    const e = ENVS.get('SM6-8');
    assert.equal(e.shape, 'receipt');
    assert.match(String(e.data.message || ''), /已记录维修/);
  });
  it('SM6-9 设置保养周期 receipt 形（含下次推算回执语义）', () => {
    const e = ENVS.get('SM6-9');
    assert.equal(e.shape, 'receipt');
    assert.match(String(e.data.message || ''), /已设置保养周期/);
  });
  it('SM6-10 执行保养 receipt 形（刷新下次日）', () => {
    const e = ENVS.get('SM6-10');
    assert.equal(e.shape, 'receipt');
    assert.match(String(e.data.message || ''), /已执行保养/);
  });
});

describe('#813 票据凭证（一）：两族装配与三方对账', () => {
  const byId = new Map(appendix.scenarios.map((s) => [s.id, s]));
  const fams = appendix.families.filter((f) => f.domain === 'receipt' && ['purchase_records', 'warranty'].includes(f.family));
  it('两族三方对账（页模块／登记表／附录一致）', async () => {
    assert.equal(fams.length, 2);
    const { PAGE_BLOCKS, blocksFor } = await import(pathToFileURL(join(pkgDir, 'scripts', 'lib', 'page-blocks.mjs')).href);
    for (const fam of fams) {
      const page = await import(pathToFileURL(join(pkgDir, 'dist', 'receipt', 'pages', fam.family + '.js')).href);
      assert.equal(page.FAMILY, fam.family);
      assert.deepEqual([...page.PAGE_META.scenarios], fam.scenarios);
      assert.equal(page.PAGE_META.domain, 'receipt');
      assert.deepEqual(page.REQUIRED_BLOCKS, fam.requiredBlocks);
      assert.deepEqual(blocksFor(fam.family).requiredBlocks, fam.requiredBlocks);
      assert.ok(PAGE_BLOCKS[fam.family]);
    }
  });
  for (const sid of ['SM6-1', 'SM6-2', 'SM6-3', 'SM6-4', 'SM6-5', 'SM6-6', 'SM6-7', 'SM6-8', 'SM6-9', 'SM6-10']) {
    it(sid + ' 装配含必需块原文且可见层无拉丁字母', async () => {
      const rep = byId.get(sid);
      const famName = ['SM6-1', 'SM6-2', 'SM6-3', 'SM6-4', 'SM6-5'].includes(sid) ? 'purchase_records' : 'warranty';
      const page = await import(pathToFileURL(join(pkgDir, 'dist', 'receipt', 'pages', famName + '.js')).href);
      const { escapeHtml } = await import(pathToFileURL(join(pkgDir, 'dist', 'render', 'html.js')).href);
      const env = ENVS.get(sid);
      assert.ok(env, '缺 envelope ' + sid);
      // 两层解析现场复核（同一预设只到一族）
      const { resolvePageFamily } = await import(pathToFileURL(join(pkgDir, 'dist', 'render', 'pageFamilies.js')).href);
      assert.equal(resolvePageFamily(rep.key, rep.preset || {}), famName);
      const html = page.renderFamilyPage(env);
      for (const m of ['<!--CONTENT-->', '<!--SHARED-CSS-->', '<!--SHARED-HELPERS-->']) {
        assert.ok(!html.includes(m), '标记未填充：' + m);
      }
      assert.ok(html.includes('<!DOCTYPE html>') && html.includes('<html lang="zh-CN">'));
      // 必需块原文在 data-need 属性里（结构判据查原文包含即命中）
      const fam = fams.find((f) => f.family === famName);
      for (const g of ['fields', 'operations', 'empty', 'status']) {
        assert.ok(html.includes('data-block="' + g + '"'), sid + ' 缺块组：' + g);
        for (const b of fam.requiredBlocks[g]) {
          assert.ok(html.includes('data-need="' + escapeHtml(b) + '"'), sid + ' 缺块 [' + g + '] ' + b.slice(0, 24));
        }
      }
      // 可见层无拉丁字母（机审英文裸词的回归钉：剥标签后逐行查字母）
      const visible = html
        .replace(/<title>[\s\S]*?<\/title>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/data-t="[^"]*"/g, '')
        .replace(/<pre[\s\S]*?<\/pre>/gi, '')
        .replace(/<p class="cmd">[\s\S]*?<\/p>/gi, '')
        .replace(/<[^>]+>/g, '\n')
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => s.replace(/20\d\d-\d\d-\d\d|\d\d:\d\d|\d+\.\d{2}/g, ''))
        .filter((s) => /[A-Za-z]/.test(s));
      assert.deepEqual(visible, [], sid + ' 可见层含拉丁字母：' + visible.slice(0, 3).join('｜'));
    });
  }
});
