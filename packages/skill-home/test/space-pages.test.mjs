// 票 #809 · 空间与位置域 4 场景真页面（验收命令见票面①）。
//
// 逐条真命令链（spawn 真 `home-cmd-read`，隔离家目录，不碰生产库）：
//   管位置（SM2-1）    home.location.write {op:'manage', action:'add'}
//   固定位（SM2-2）    home.location.write {op:'fixed', item_id, fixed_location}
//   收纳建议（SM2-3）  home.location.query {mode:'suggest', category_id}
//   空间视图（SM2-4）  home.location.query {mode:'space'}（＋path 下钻断言）
// 每条 envelopes → 对应 `renderFamilyPage` 装配 → 产物落 `.scratch/809/`（文件名主体走
// `resolveSceneStem` 单一算法，戳固定 `809` 保证可复现）＋ `manifest.json`（墙与链路页的清单）。
// 空态分支（空库）不断言产物文件，只断言 render 字符串含空态文案（目录保持 4 产物干净）。
//
// 前提：`node node_modules/typescript/bin/tsc -b packages/skill-home`
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pkgDir = join(here, '..');
const repoRoot = join(pkgDir, '..', '..');
const bin = join(pkgDir, 'dist', 'cli', 'cmd_read.js');
const outDir = join(repoRoot, '.scratch', '809');
const STAMP = '809';

let HOME = '';
const homeEnv = () => ({ ...process.env, USERPROFILE: HOME, HOME });
function run(key, params) {
  return spawnSync(process.execPath, [bin, key, '--params', JSON.stringify(params || {})], { encoding: 'utf8', env: homeEnv() });
}
function runOk(key, params, label) {
  const r = run(key, params);
  assert.equal(r.status, 0, label + ' exit=' + r.status + ' ERR=' + (r.stderr || '').trim().slice(0, 300));
  return JSON.parse(r.stdout.trim().split('\n').pop());
}

let CID1 = 0; let CID2 = 0; let CID3 = 0; let CID4 = 0;
let KEY_ID = 0;
const ids = {};

async function modules() {
  const stem = await import(pathToFileURL(join(pkgDir, 'dist', 'render', 'sceneNaming.js')).href);
  const fam = await import(pathToFileURL(join(pkgDir, 'dist', 'render', 'pageFamilies.js')).href);
  const html = await import(pathToFileURL(join(pkgDir, 'dist', 'render', 'html.js')).href);
  const blocks = await import(pathToFileURL(join(pkgDir, 'scripts', 'lib', 'page-blocks.mjs')).href);
  return { ...stem, ...fam, ...html, ...blocks };
}
let M = null;

function seedAdd(name, cid, location) {
  runOk('home.item.add', { name, category_id: cid, location }, 'add ' + name);
}

function refreshIds(label) {
  const items = runOk('home.item.search', {}, label).data.items;
  for (const it of items) ids[it.name] = it.id;
}

before(async () => {
  assert.ok((await import('node:fs')).existsSync(bin), 'dist 未建：先跑 tsc -b packages/skill-home');
  M = await modules();
  HOME = mkdtempSync(join(tmpdir(), 'space809-'));
  runOk('home.stats.overview', {}, 'init');
  const cats = runOk('home.tag.query', { kind: 'categories' }, 'cats').data.items;
  CID1 = cats[0].count; CID2 = cats[1].count; CID3 = cats[2].count; CID4 = cats[3].count;
  // 同类同位置 ×3（强证据）＋分位置一件（收纳推荐体）
  seedAdd('大扳手', CID1, '工具间/抽屉');
  seedAdd('小扳手', CID1, '工具间/抽屉');
  seedAdd('尖嘴钳', CID1, '工具间/抽屉');
  seedAdd('螺丝刀', CID1, '阳台/柜子');
  // 固定位一对（在位／不在位）
  seedAdd('钥匙', CID1, '玄关/抽屉');
  seedAdd('充电器', CID1, '客厅/电视柜');
  refreshIds('ids');
  runOk('home.location.write', { op: 'fixed', item_id: ids['钥匙'], fixed_location: '玄关/抽屉' }, 'fix key');
  runOk('home.location.write', { op: 'fixed', item_id: ids['充电器'], fixed_location: '玄关/抽屉' }, 'fix charger');
  KEY_ID = ids['钥匙'];
  // 三级路径（下钻）＋分 shelters
  seedAdd('厚被子', CID2, '卧室/衣柜/顶层');
  seedAdd('雨伞', CID3, '玄关/柜子');
  seedAdd('雨衣', CID3, '阳台/架子');
  seedAdd('备用伞', CID3, '书房/角落');
  // 废弃态（无依据态证据：活跃位置为空）
  seedAdd('旧遥控器', CID4, '储物间/箱子');
  seedAdd('新遥控器', CID4, '书房/桌子');
  refreshIds('ids2');
  runOk('home.item.update', { id: ids['旧遥控器'], op: 'status', location_status: '已废弃' }, 'retire');
  // 相似碰撞（flattened 等价：两种写法同一位置）
  runOk('home.location.write', { op: 'manage', action: 'add', path: '卧室/东南角/小冰箱上' }, 'sim a');
  runOk('home.location.write', { op: 'manage', action: 'add', path: '卧室东南角/小冰箱上' }, 'sim b');
  // 批量证据（访问计数：详情即＋1）
  runOk('home.item.detail', { id: ids['大扳手'] }, 'touch a');
  runOk('home.item.detail', { id: ids['螺丝刀'] }, 'touch b');
  mkdirSync(outDir, { recursive: true });
});

function fileName(stem) {
  return stem + '_' + STAMP + '.html';
}

/** 产物通用断言：骨架机检 7 条＋本族必需块逐条（与 audit-page-blocks 同口径）。 */
function assertProduct(html, family, label) {
  for (const m of ['<!--CONTENT-->', '<!--SHARED-CSS-->', '<!--SHARED-HELPERS-->']) {
    assert.ok(!html.includes(m), label + ' 标记未填充：' + m);
  }
  assert.ok(html.includes('<!DOCTYPE html>') && html.includes('<html lang="zh-CN">'), label + ' 文档壳');
  // #920：版面根接了页面级移动端配方，根类串由 `class="page"` 变成 `class="page ilife-page-ui"`。
  assert.ok(html.includes('class="page ilife-page-ui"') && /<h1[^>]*>.+?<\/h1>/.test(html) && html.includes('class="cmd"'), label + ' 壳三件');
  assert.ok(/<style>[^<]*\.page\{/.test(html), label + ' 样式已内联');
  for (const g of ['fields', 'operations', 'empty', 'status']) {
    assert.ok(html.includes('data-block="' + g + '"'), label + ' 缺块组：' + g);
  }
  const wants = M.blocksFor(family).requiredBlocks;
  for (const g of Object.keys(wants)) {
    for (const b of wants[g]) {
      assert.ok(html.includes(M.escapeHtml(b)), label + ' 缺块 [' + g + '] ' + b.slice(0, 20));
    }
  }
  // 无共用描边类（本页自有样式，不借 badge/item-head/stat 壳；分隔符无处可藏）。
  assert.ok(!html.includes('class="item-head') && !html.includes('class="badge')
    && !html.includes('class="stat'), label + ' 不许借版式位类名');
}

async function assemble(family, env) {
  const page = await import(pathToFileURL(join(pkgDir, 'dist', 'space', 'pages', family + '.js')).href);
  assert.equal(page.FAMILY, family);
  return page.renderFamilyPage(env);
}

const MANIFEST_ROWS = [];

describe('#809 空间与位置：4 条真链装配＋产物', () => {
  it('管位置（write manage/add → 位置树＋相似组＋表单）', async () => {
    const params = { op: 'manage', action: 'add', path: '书房/书架/顶层' };
    const env = runOk('home.location.write', params, '管位置');
    assert.equal(env.key, 'home.location.write');
    assert.equal(env.shape, 'receipt');
    assert.equal(M.resolvePageFamily(env.key, { op: 'manage' }), 'location_manage');
    const stem = M.resolveSceneStem(env.key, params);
    assert.equal(stem, '管位置');
    const detail = env.data.detail;
    assert.ok(detail.nodes.length >= 10, '树节点数 nodes=' + detail.nodes.length);
    assert.ok(detail.similar_groups.length >= 1, '相似组应含预置碰撞');
    const html = await assemble('location_manage', env);
    assertProduct(html, 'location_manage', '管位置');
    assert.ok(html.includes('工具间') && html.includes('确认合并') && html.includes('新建位置'), '管位置 真内容');
    const file = fileName(stem);
    writeFileSync(join(outDir, file), html, 'utf8');
    MANIFEST_ROWS.push({
      seq: 1, wake: '管位置', file, domain: 'space', family: 'location_manage',
      title: '管理位置体系（查看/新建/改名/合并/规范化）',
      prompt: '请加载「居家管家」技能，帮我管理位置体系（唤醒词：管位置）',
      command: "home-cmd-read home.location.write --params '" + JSON.stringify(params) + "'",
      check: '确认相似位置检测的阈值与合并语义',
    });
  });

  it('固定位（write fixed → 清单＋在位对照＋表单）', async () => {
    const params = { op: 'fixed', item_id: KEY_ID, fixed_location: '玄关/抽屉' };
    const env = runOk('home.location.write', params, '固定位');
    assert.equal(env.key, 'home.location.write');
    assert.equal(M.resolvePageFamily(env.key, { op: 'fixed' }), 'fixed_spot');
    const stem = M.resolveSceneStem(env.key, params);
    assert.equal(stem, '固定位');
    const items = env.data.detail.fixed_items;
    assert.equal(items.length, 2);
    assert.ok(items.some((e) => e.name === '钥匙' && e.warn === false), '钥匙应在位');
    assert.ok(items.some((e) => e.name === '充电器' && e.warn === true), '充电器应告警');
    const html = await assemble('fixed_spot', env);
    assertProduct(html, 'fixed_spot', '固定位');
    assert.ok(html.includes('钥匙') && html.includes('不在固定位') && html.includes('在固定位') && html.includes('解除'), '固定位 真内容');
    const file = fileName(stem);
    writeFileSync(join(outDir, file), html, 'utf8');
    MANIFEST_ROWS.push({
      seq: 2, wake: '固定位', file, domain: 'space', family: 'fixed_spot',
      title: '设置固定位（常用件锚定）',
      prompt: '请加载「居家管家」技能，帮我设置固定位（唤醒词：固定位）',
      command: "home-cmd-read home.location.write --params '" + JSON.stringify(params) + "'",
      check: '确认固定位归位置写类收口还是物品写类',
    });
  });

  it('收纳建议（query suggest → 推荐＋理由＋备选）', async () => {
    const params = { mode: 'suggest', category_id: CID1 };
    const env = runOk('home.location.query', params, '收纳建议');
    assert.equal(env.key, 'home.location.query');
    assert.equal(M.resolvePageFamily(env.key, params), 'suggest_storage');
    const stem = M.resolveSceneStem(env.key, params);
    assert.equal(stem, '收纳建议');
    const recs = env.data.items;
    assert.equal(recs.length, 6);
    const strong = recs.find((r) => r.item.name === '螺丝刀');
    assert.ok(strong && strong.recommend && strong.recommend.location === '工具间/抽屉', '螺丝刀应强推荐工具间抽屉');
    const keep = recs.find((r) => r.item.name === '大扳手');
    assert.ok(keep && keep.keep && keep.recommend === null, '大扳手应保持现状');
    // 备选空态（同类同位置无处可备，只断言不落产物）
    const lone = runOk('home.location.query', { mode: 'suggest', category_id: CID2 }, 'lone-cat');
    const quilt = lone.data.items.find((r) => r.item.name === '厚被子');
    assert.ok(quilt && quilt.keep && quilt.alternates.length === 0, '厚被子应保持现状且无备选');
    // 批量口径（找没固定位的常用件）与无依据口径（废弃件）只断言不落产物
    const batch = runOk('home.location.query', { mode: 'suggest', batch: true }, 'batch');
    assert.ok(batch.data.items.length >= 2, '批量应含访问过的无固定位件 batch=' + batch.data.items.length);
    const retired = runOk('home.location.query', { mode: 'suggest', category_id: CID4 }, 'retired-cat');
    const noBasis = retired.data.items.find((r) => r.item.name === '旧遥控器');
    assert.ok(noBasis && noBasis.recommend === null && noBasis.keep === null, '废弃件应无依据');
    const html = await assemble('suggest_storage', env);
    assertProduct(html, 'suggest_storage', '收纳建议');
    assert.ok(html.includes('推荐安放处') && html.includes('工具间/抽屉') && html.includes('采纳'), '收纳建议 真内容');
    assert.ok(!html.includes('通用列表'), '收纳建议 不得压成通用列表');
    const file = fileName(stem);
    writeFileSync(join(outDir, file), html, 'utf8');
    MANIFEST_ROWS.push({
      seq: 3, wake: '收纳建议', file, domain: 'space', family: 'suggest_storage',
      title: '收纳位置建议（AI 推荐）',
      prompt: '请加载「居家管家」技能，帮我推荐收纳位置（唤醒词：收纳建议）',
      command: "home-cmd-read home.location.query --params '" + JSON.stringify(params) + "'",
      check: '确认推荐依据字段（常用位置与关联物品）从哪来',
    });
  });

  it('空间视图（query space → 面包屑＋下钻＋本层物品）', async () => {
    const params = { mode: 'space' };
    const env = runOk('home.location.query', params, '空间视图');
    assert.equal(env.key, 'home.location.query');
    assert.equal(M.resolvePageFamily(env.key, params), 'space_view');
    const stem = M.resolveSceneStem(env.key, params);
    assert.equal(stem, '空间视图');
    const view = env.data.items[0];
    assert.equal(view.kind, 'space_view');
    assert.ok(view.children.some((c) => c.name === '工具间'), '顶层应含工具间');
    // 下钻到叶子层：面包屑两段＋本层物品三件
    const drill = runOk('home.location.query', { mode: 'space', path: '工具间/抽屉' }, 'drill');
    const dv = drill.data.items[0];
    assert.deepEqual(dv.crumbs.map((c) => c.name), ['工具间', '抽屉']);
    assert.equal(dv.items.length, 3);
    const html = await assemble('space_view', env);
    assertProduct(html, 'space_view', '空间视图');
    assert.ok(html.includes('全屋') && html.includes('下一层') && html.includes('工具间'), '空间视图 真内容');
    assert.ok(!html.includes('通用列表'), '空间视图 不得压成通用列表');
    const file = fileName(stem);
    writeFileSync(join(outDir, file), html, 'utf8');
    MANIFEST_ROWS.push({
      seq: 4, wake: '空间视图', file, domain: 'space', family: 'space_view',
      title: '空间视图浏览（位置树下钻）',
      prompt: '请加载「居家管家」技能，帮我浏览空间视图（唤醒词：空间视图）',
      command: "home-cmd-read home.location.query --params '" + JSON.stringify(params) + "'",
      check: '确认下钻层级与面包屑口径',
    });
  });

  it('空态分支（空库 render，不断言产物文件）', async () => {
    const emptyHome = mkdtempSync(join(tmpdir(), 'space809-empty-'));
    const emptyEnv = { ...process.env, USERPROFILE: emptyHome, HOME: emptyHome };
    const runE = (key, params) => {
      const r = spawnSync(process.execPath, [bin, key, '--params', JSON.stringify(params || {})], { encoding: 'utf8', env: emptyEnv });
      assert.equal(r.status, 0, '空库 ' + key);
      return JSON.parse(r.stdout.trim().split('\n').pop());
    };
    runE('home.stats.overview', {});
    const cats = runE('home.tag.query', { kind: 'categories' }).data.items;
    const spaceTop = runE('home.location.query', { mode: 'space' });
    const spaceHtml = await assemble('space_view', spaceTop);
    assert.ok(spaceHtml.includes('这里还没有东西'), '全屋空态');
    const manageEmpty = runE('home.location.query', { mode: 'manage' });
    const manageHtml = await assemble('location_manage', manageEmpty);
    assert.ok(manageHtml.includes('还没有位置'), '管位置空态');
    const suggestEmpty = runE('home.location.query', { mode: 'suggest', category_id: cats[0].count });
    const suggestHtml = await assemble('suggest_storage', suggestEmpty);
    assert.ok(suggestHtml.includes('没有可建议的物品'), '收纳建议空态');
  });

  it('清单 manifest.json（墙与链路页的唯一输入）', async () => {
    assert.equal(MANIFEST_ROWS.length, 4);
    const manifest = {
      batch: '空间与位置域',
      naming: '文件名主体走 resolveSceneStem 单一算法，戳固定 809 保证可复现',
      notShipped: [],
      readings: {},
      rows: MANIFEST_ROWS,
    };
    writeFileSync(join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
    const back = JSON.parse(readFileSync(join(outDir, 'manifest.json'), 'utf8'));
    assert.equal(back.rows.length, 4);
    for (const r of back.rows) {
      assert.ok(readFileSync(join(outDir, r.file), 'utf8').length > 1000, r.file + ' 非空');
    }
  });
});
