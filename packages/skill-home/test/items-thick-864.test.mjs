// 票 #864 · 物品管理域（二）回执加厚测试。
//
// 四条缺口逐条有数据位：更新快照（3-2／3-3／3-4／3-8）、合并来源清单（3-5）、
// 关联关系类型（3-7）、标签与分类明细（4-1／4-2／4-3）。
// 全部跑真命令链（spawn 真 `home-cmd-read`，隔离家目录，不碰生产库），
// 消息一句话保持不变（前缀分流兼容），页装配写真数据。
//
// 跑法（仓根，经排队，一件事一持锁）：
//   node tooling/run-locked.mjs --ticket 864 --max-wait-ms 600000 -- node --test packages/skill-home/test/items-thick-864.test.mjs
//
// 前提：`node node_modules/typescript/bin/tsc -b packages/skill-home`
// （页模块经 `dist/<域>/pages/<族>.js` 进入本用例）。
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pkgDir = join(here, '..');
const bin = join(pkgDir, 'dist', 'cli', 'cmd_read.js');

let HOME = '';
const homeEnv = () => ({ ...process.env, USERPROFILE: HOME, HOME });
function run(key, params) {
  return spawnSync(process.execPath, [bin, key, '--params', JSON.stringify(params || {})], { encoding: 'utf8', env: homeEnv() });
}
function runOk(key, params, label) {
  const r = run(key, params);
  assert.equal(r.status, 0, label + ' exit=' + r.status + ' ERR=' + (r.stderr || '').trim().slice(0, 400));
  return JSON.parse(r.stdout.trim().split('\n').pop());
}
async function pageOf(family) {
  return import(pathToFileURL(join(pkgDir, 'dist', 'items', 'pages', family + '.js')).href);
}

let CID = 0;
let IDA = 0;
let IDB = 0;
const ENVS = {};

before(() => {
  assert.ok(true, 'dist 未建时先跑 node node_modules/typescript/bin/tsc -b packages/skill-home');
  HOME = mkdtempSync(join(tmpdir(), 'thick864-'));
  runOk('home.stats.overview', {}, 'seed overview');
  const cats = runOk('home.tag.query', { kind: 'categories' }, 'seed categories').data.items;
  CID = cats.find((c) => String(c.name).startsWith('分类:')).count;
  runOk('home.item.add', { name: '厚甲', category_id: CID, location: '客厅/储物柜' }, 'seed addA');
  runOk('home.item.add', { name: '厚乙', category_id: CID, location: '卧室/衣柜' }, 'seed addB');
  const items = runOk('home.item.search', {}, 'seed search').data.items;
  IDA = items.find((x) => x.name === '厚甲').id;
  IDB = items.find((x) => x.name === '厚乙').id;
  runOk('home.item.update', { id: IDA, op: 'tags', tags: '常用,常用品' }, 'seed tags');
  ENVS.move = runOk('home.item.update', { id: IDA, op: 'move', new_location: '书房/书架' }, '真链 move');
  ENVS.qty = runOk('home.item.update', { id: IDA, op: 'qty', plus: 2 }, '真链 qty');
  ENVS.status = runOk('home.item.update', { id: IDA, op: 'status', status: '备用' }, '真链 status');
  ENVS.tags = runOk('home.item.update', { id: IDA, op: 'tags', tags: '常用,出差' }, '真链 tags');
  ENVS.relate = runOk('home.item.update', { id: IDA, op: 'relate', related: IDB, relation: '配件' }, '真链 relate');
  ENVS.relateDefault = runOk('home.item.update', { id: IDA, op: 'relate', related: IDB }, '真链 relate 缺省');
  ENVS.tidy = runOk('home.tag.write', { op: 'tidy' }, '真链 tidy');
  ENVS.overview = runOk('home.tag.write', { op: 'overview' }, '真链 overview');
  ENVS.category = runOk('home.tag.write', { op: 'category' }, '真链 category');
  ENVS.merge = runOk('home.item.update', { id: IDA, op: 'merge', target: IDA, sources: String(IDB) }, '真链 merge');
});

describe('#864 缺口一：更新回执带物品快照（3-2／3-3／3-4／3-8）', () => {
  it('move 消息不变且快照与变更前后写真', () => {
    assert.equal(ENVS.move.data.message, '已移动：' + IDA + '→书房/书架');
    assert.equal(ENVS.move.data.detail.snapshot.name, '厚甲');
    assert.equal(ENVS.move.data.detail.change.before_location, '客厅/储物柜');
    assert.equal(ENVS.move.data.detail.change.after_location, '书房/书架');
  });
  it('qty 消息不变且数量前后写真', () => {
    assert.equal(ENVS.qty.data.message, '已变更数量：' + IDA);
    assert.equal(ENVS.qty.data.detail.change.before_quantity, 1);
    assert.equal(ENVS.qty.data.detail.change.after_quantity, 3);
  });
  it('status 消息不变且快照状态写真', () => {
    assert.equal(ENVS.status.data.message, '已变更状态：' + IDA + '→备用');
    assert.equal(ENVS.status.data.detail.snapshot.locations[0].status, '备用');
  });
  it('tags 消息不变且去除新增写真', () => {
    assert.equal(ENVS.tags.data.message, '已更新标签：' + IDA);
    assert.deepEqual(ENVS.tags.data.detail.change.removed, ['常用品']);
    assert.deepEqual(ENVS.tags.data.detail.change.added, ['出差']);
  });
  it('receipt 页写真快照（名称与位置分段与标签）', async () => {
    const html = (await pageOf('receipt')).renderFamilyPage(ENVS.move);
    assert.ok(html.includes('厚甲') && html.includes('客厅') && html.includes('书房'));
  });
});

describe('#864 缺口二：合并带来源清单（3-5）', () => {
  it('merge 消息前缀不变且来源写真', () => {
    assert.ok(String(ENVS.merge.data.message).startsWith('已合并到 ' + IDA + '：+'));
    assert.ok(ENVS.merge.data.detail.sources.some((s) => s.id === IDB && s.name === '厚乙'));
  });
  it('confirm 页写真来源条目', async () => {
    const html = (await pageOf('confirm')).renderFamilyPage(ENVS.merge);
    assert.ok(html.includes('厚乙') && html.includes('编号 ' + IDB));
  });
});

describe('#864 缺口三：关联带关系类型（3-7）', () => {
  it('relate 消息不变且类型写真', () => {
    assert.equal(ENVS.relate.data.message, '已关联：' + IDA + '×' + IDB);
    assert.equal(ENVS.relate.data.detail.relation, '配件');
    assert.equal(ENVS.relate.data.detail.peer.name, '厚乙');
  });
  it('relate 缺省为常用搭配', () => {
    assert.equal(ENVS.relateDefault.data.detail.relation, '常用搭配');
  });
  it('relations 页写真类型与对方名称', async () => {
    const html = (await pageOf('relations')).renderFamilyPage(ENVS.relate);
    assert.ok(html.includes('配件') && html.includes('厚乙'));
  });
});

describe('#864 缺口四：标签与分类明细（4-1／4-2／4-3）', () => {
  it('overview 逐标签写真件数与使用次数', () => {
    assert.ok(String(ENVS.overview.data.message).startsWith('标签总览：'));
    const hit = ENVS.overview.data.detail.tags.find((t) => t.name === '常用');
    assert.ok(hit && typeof hit.items === 'number' && typeof hit.uses === 'number');
    assert.ok(Array.isArray(ENVS.overview.data.detail.unused));
  });
  it('tidy 逐对写真相似度数值', () => {
    assert.ok(ENVS.tidy.data.detail.pairs.every((p) => typeof p.similarity === 'number'));
  });
  it('category 树写真层级与计数', () => {
    assert.ok(String(ENVS.category.data.message).startsWith('分类树：'));
    assert.equal(ENVS.category.data.detail.tree.length, 8);
    assert.ok(ENVS.category.data.detail.tree.every((n) => typeof n.items === 'number' && typeof n.quantity === 'number'));
  });
  it('tag_manage 与 category_manage 页写真数据', async () => {
    assert.ok((await pageOf('tag_manage')).renderFamilyPage(ENVS.overview).includes('常用'));
    assert.ok((await pageOf('category_manage')).renderFamilyPage(ENVS.category).includes('食物与饮品'));
  });
});
