// #815 · 家庭协作域写侧用例（借出／借入／归还／催还各跑一次真命令链）。
//
// 只经真 spawn 跑 `home-cmd-read`（不直调函数），家目录指临时目录（与
// `cli.test.mjs` 同一隔离通道），不碰生产库。断四件事：
// ① 四个写操作真链 exit 0 且回执文案对（借出／借入登记、已归还、借用清单）；
// ② 每份回执带落盘 `delivery`（绝对路径存在、字节数等于实测）；
// ③ 两页装配把真 envelope 渲染成整页（四组 data-block 与必需块原文在位）；
// ④ 改坏路由必须变红（未知词无命中、未知键 UNKNOWN、四词路由双锁）。
//
// 前提：`node node_modules/typescript/bin/tsc -b packages/skill-home`
// （页模块经 `dist/family/pages/*.js` 进入本用例）。
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, basename, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { homeEnvOf, isRealHome } from '../../../test/helpers/home-test-base.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const pkgDir = join(here, '..');
const bin = join(pkgDir, 'dist', 'cli', 'cmd_read.js');

let HOME = '';
const P = (o) => JSON.stringify(o);
function run(key, params) {
  return spawnSync(process.execPath, [bin, key, '--params', P(params || {})], { encoding: 'utf8', env: homeEnvOf(HOME) });
}
function runOk(key, params, label) {
  const r = run(key, params);
  assert.equal(r.status, 0, label + ' exit=' + r.status + ' ERR=' + (r.stderr || '').trim().slice(0, 300));
  const env = JSON.parse(String(r.stdout));
  assert.equal(env.key, key);
  return env;
}
function assertDelivery(env, label) {
  assert.ok(env.delivery, label + ' 缺 delivery 回执');
  assert.equal(env.delivery.mode, 'file');
  assert.ok(resolve(env.delivery.path) === env.delivery.path, label + ' delivery.path 须为绝对路径');
  assert.ok(existsSync(env.delivery.path), label + ' 回执路径须存在：' + env.delivery.path);
  assert.equal(env.delivery.bytes, statSync(env.delivery.path).size, label + ' bytes 须等于实测');
}

let CID = 0;
let DRILL = 0;

before(() => {
  assert.ok(existsSync(bin), 'dist 未建：先跑 node node_modules/typescript/bin/tsc -b packages/skill-home');
  HOME = mkdtempSync(join(tmpdir(), 'family815-'));
  assert.ok(!isRealHome(HOME), '测试缺隔离：HOME 落在真实家目录');
  runOk('home.stats.overview', {}, 'seed overview');
  const cats = runOk('home.tag.query', { kind: 'categories' }, 'seed categories').data.items;
  CID = cats.find((c) => String(c.name).startsWith('分类:')).count;
  runOk('home.item.add', { name: '电钻', category_id: CID, location: '客厅/工具柜' }, 'seed drill');
  runOk('home.item.add', { name: '绘本', category_id: CID, location: '儿童房/书桌' }, 'seed book');
  DRILL = runOk('home.item.search', { name: '电钻' }, 'seed search').data.items[0].id;
  runOk('home.care.write', { kind: 'member', name: '妈妈' }, 'seed member 妈妈');
  runOk('home.care.write', { kind: 'member', name: '邻居王阿姨' }, 'seed member 王阿姨');
});

describe('#815 借用四写操作真链', () => {
  it('借出：库内物品登记', () => {
    const env = runOk('home.care.write', { kind: 'borrow', op: 'borrow', item_id: DRILL, member: '邻居王阿姨', date: '2026-09-01' }, '借出');
    assert.match(env.data.message, /已借用登记/);
    assertDelivery(env, '借出');
    assert.match(basename(env.delivery.path), /^借用_\d{8}_\d{6}(-\d+)?(_\d+)?\.html$/);
  });

  it('借入：库外物品名登记（无 item_id）', () => {
    const env = runOk('home.care.write', { kind: 'borrow', op: 'borrow', member: '妈妈', date: '2026-09-10' }, '借入');
    assert.match(env.data.message, /已借用登记/);
    assertDelivery(env, '借入');
  });

  it('归还：确认归还回执', () => {
    const env = runOk('home.care.write', { kind: 'borrow', op: 'return', item_id: DRILL, member: '邻居王阿姨', date: '2026-09-15' }, '归还');
    assert.match(env.data.message, /已归还/);
    assertDelivery(env, '归还');
  });

  it('催还：读侧借用清单可达', () => {
    const env = runOk('home.care.query', { kind: 'borrow' }, '催还清单');
    assert.ok(Array.isArray(env.data.items) && env.data.items.length >= 3, '三笔登记须在清单里');
    assertDelivery(env, '催还');
  });
});

describe('#815 家人档案读写真链', () => {
  it('查家人档案', () => {
    const env = runOk('home.care.query', { kind: 'member' }, '查家人档案');
    assert.ok(env.data.items.some((x) => x.name === '妈妈'), '种子成员须在列表里');
    assertDelivery(env, '查家人档案');
    assert.match(basename(env.delivery.path), /^家人档案_\d{8}_\d{6}(-\d+)?(_\d+)?\.html$/);
  });

  it('加家人档案', () => {
    const env = runOk('home.care.write', { kind: 'member', name: '孩子' }, '加家人档案');
    assert.match(env.data.message, /已登记家人/);
    assertDelivery(env, '加家人档案');
  });
});

describe('#815 两页装配（真 envelope → 必需块在位）', () => {
  it('family_borrow：双分区＋超期＋催还＋登记表单', async () => {
    const env = runOk('home.care.query', { kind: 'borrow' }, '借用清单');
    const page = await import(pathToFileURL(join(pkgDir, 'dist', 'family', 'pages', 'family_borrow.js')).href);
    assert.equal(page.FAMILY, 'family_borrow');
    assert.deepEqual([...page.PAGE_META.scenarios], ['SM7-1']);
    const html = page.renderFamilyPage(env);
    for (const m of ['<!--CONTENT-->', '<!--SHARED-CSS-->', '<!--SHARED-HELPERS-->']) {
      assert.ok(!html.includes(m), '标记未填充：' + m);
    }
    for (const g of ['fields', 'operations', 'empty', 'status']) {
      assert.ok(html.includes('data-block="' + g + '"'), '缺块组：' + g);
      for (const b of page.REQUIRED_BLOCKS[g]) assert.ok(html.includes(b), '缺块 [' + g + '] ' + b.slice(0, 20));
    }
    for (const s of ['借出区', '借入区', '超期件数', '登记表单', '确认归还', '复制催还文案', '确认登记', '超期提醒']) {
      assert.ok(html.includes(s), '缺结构：' + s);
    }
  });

  it('family_borrow：写回执形态可渲染', async () => {
    const env = runOk('home.care.write', { kind: 'borrow', op: 'return', item_id: DRILL, member: '妈妈', date: '2026-09-16' }, '归还回执');
    const page = await import(pathToFileURL(join(pkgDir, 'dist', 'family', 'pages', 'family_borrow.js')).href);
    const html = page.renderFamilyPage(env);
    assert.ok(html.includes('已归还'), '回执文案须进页');
    assert.ok(html.includes('登记表单'), '回执页仍带登记表单');
  });

  it('family_borrow：渲染器单元（合成输入覆盖借入分区与超期 pill）', async () => {
    const page = await import(pathToFileURL(join(pkgDir, 'dist', 'family', 'pages', 'family_borrow.js')).href);
    const past = new Date();
    past.setDate(past.getDate() - 3);
    const due = past.toISOString().slice(0, 10);
    const env = {
      version: '0.1.0', skill: 'home', shape: 'list', key: 'home.care.query',
      data: {
        items: [
          { name: '借用妈妈', direction: '借入', item_name: '露营帐篷', due_date: due, days_borrowed: '5' },
          { name: '借用邻居王阿姨', direction: '借出', item_name: '电钻', returned_at: '2026-09-15' },
        ],
        total: 2,
      },
    };
    const html = page.renderFamilyPage(env);
    assert.ok(html.includes('借入区') && html.includes('露营帐篷'), '借入分区须列出借入行');
    assert.ok(html.includes('已超期'), '过期约定须标已超期');
    assert.ok(html.includes('已归还'), '归还行须标已归还');
  });

  it('family_members：成员列表＋归属勾选＋总数＋添加表单', async () => {
    const env = runOk('home.care.query', { kind: 'member' }, '家人档案清单');
    const page = await import(pathToFileURL(join(pkgDir, 'dist', 'family', 'pages', 'family_members.js')).href);
    assert.equal(page.FAMILY, 'family_members');
    assert.deepEqual([...page.PAGE_META.scenarios], ['SM7-2']);
    const html = page.renderFamilyPage(env);
    for (const g of ['fields', 'operations', 'empty', 'status']) {
      assert.ok(html.includes('data-block="' + g + '"'), '缺块组：' + g);
      for (const b of page.REQUIRED_BLOCKS[g]) assert.ok(html.includes(b), '缺块 [' + g + '] ' + b.slice(0, 20));
    }
    for (const s of ['成员列表', '物品归属勾选', '物品总数', '添加成员表单', '移除成员', '确认标记归属', '确认添加', '妈妈']) {
      assert.ok(html.includes(s), '缺结构：' + s);
    }
  });
});

describe('#815 路由双锁（改坏必须变红）', () => {
  it('四词各走各的键与预设', async () => {
    const { routeWakeword } = await import(pathToFileURL(join(pkgDir, 'dist', 'policy', 'wakewords.js')).href);
    const { resolvePageFamily, UNKNOWN_FAMILY } = await import(pathToFileURL(join(pkgDir, 'dist', 'render', 'pageFamilies.js')).href);
    const r1 = routeWakeword('借出登记', {});
    assert.equal(r1.key, 'home.care.write');
    assert.equal(resolvePageFamily(r1.key, r1.params), 'family_borrow');
    const r2 = routeWakeword('借入登记', {});
    assert.equal(r2.key, 'home.care.write');
    const r3 = routeWakeword('归还确认', {});
    assert.equal(r3.key, 'home.care.write');
    assert.equal(r3.params.op, 'return');
    const r4 = routeWakeword('催还提醒', {});
    assert.equal(r4.key, 'home.care.query');
    assert.equal(resolvePageFamily(r4.key, r4.params), 'family_borrow');
    assert.equal(resolvePageFamily('home.care.query', { kind: 'member' }), 'family_members');
    assert.equal(resolvePageFamily('home.care.write', { kind: 'member', name: '妈妈' }), 'family_members');
    assert.equal(resolvePageFamily('home.nope', {}), UNKNOWN_FAMILY);
  });

  it('未知唤醒词无命中（门真会红）', async () => {
    const { routeWakeword } = await import(pathToFileURL(join(pkgDir, 'dist', 'policy', 'wakewords.js')).href);
    assert.throws(() => routeWakeword('这句根本不是唤醒词七七七', {}), /无命中/);
  });
});
