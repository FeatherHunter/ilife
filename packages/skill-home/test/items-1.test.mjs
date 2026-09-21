// #806 · 物品管理域（一）录入与查找 10 条：各出真页面。
//
// 真命令链（spawn 真 `home-cmd-read`，隔离家目录，不碰生产库）逐条跑通 10 条场景，
// 经 `dist/items/pages/<族>.js` 装配成本域真页面，落 `.scratch/806/` 10 份产物＋
// `manifest.json`（文件名 `<命令中文名>_<场景编号>_<戳>`，戳钉死可复现）。
// 墙与三判据不在本件内断（票面验收命令各走各的），本件只断：壳完整、三标记已填充、
// 场景数据在位、空态行为、清单字节对得上。
//
// 前提：`node node_modules/typescript/bin/tsc -b packages/skill-home`。
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, basename } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { homeEnvOf } from '../../../test/helpers/home-test-base.mjs';

const HERE_DIR = fileURLToPath(new URL('.', import.meta.url));
const PKG_DIR = join(HERE_DIR, '..');
const REPO_ROOT = join(PKG_DIR, '..', '..');
const BIN = join(PKG_DIR, 'dist', 'cli', 'cmd_read.js');
const OUT_DIR = join(REPO_ROOT, '.scratch', '806');
const STAMP = '20260921_000000';

let HOME = '';
let CID = 0;
let CATNAME = '';
let IDA = 0;
const ENVS = {};

function run(key, params) {
  return spawnSync(process.execPath, [BIN, key, '--params', JSON.stringify(params || {})], {
    encoding: 'utf8', env: homeEnvOf(HOME),
  });
}

function runOk(key, params, label) {
  const r = run(key, params);
  assert.equal(r.status, 0, label + ' exit=' + r.status + ' ERR=' + (r.stderr || '').trim().slice(0, 300));
  return JSON.parse(r.stdout.trim().split('\n').pop());
}

async function render(family, env) {
  const page = await import(pathToFileURL(join(PKG_DIR, 'dist', 'items', 'pages', family + '.js')).href);
  return page.renderFamilyPage(env);
}

const SCENARIOS = [
  { id: '1-1', wake: '录物品', cn: '录物品', family: 'add_form', key: 'home.item.add', params: { name: '探针杯', loc: '客厅/桌' }, check: '录入表单十二个字段都在，本次名称与件数对得上' },
  { id: '1-2', wake: '拍物品', cn: '拍物品', family: 'add_form', key: 'home.item.add', params: { name: '探针碗', loc: '厨房/柜', photo: '1' }, check: '拍照录入与单条同页，照片随存有交代' },
  { id: '1-3', wake: '批量录入', cn: '批量录入', family: 'add_form', key: 'home.item.add', params: { op: 'batch' }, check: '批量件数与全部确认对得上' },
  { id: '1-4', wake: '补录', cn: '补录', family: 'add_form', key: 'home.item.add', params: { name: '旧物壶', loc: '阳台/架', op: 'backfill', backfill_date: '2025-01-01' }, check: '补录日期有处可填，回执字段齐全' },
  { id: '2-1', wake: '查物品', cn: '查物品', family: 'search_list', key: 'home.item.search', params: { name: '探针' }, check: '结果卡片字段全，未命中指去录入' },
  { id: '2-2', wake: '看物品', cn: '看物品', family: 'detail', key: 'home.item.detail', params: { by: 'idA' }, check: '详情字段与快捷操作齐，历史有空态' },
  { id: '2-3', wake: '紧急定位', cn: '紧急定位', family: 'locate', key: 'home.item.search', params: { name: '探针', locate: true }, check: '置顶卡片字段全，空态指去扩大寻找' },
  { id: '2-4', wake: '筛选浏览', cn: '筛选浏览', family: 'browse', key: 'home.item.search', params: { browse: true }, check: '分组与排序控件在列表上方，切换可用' },
  { id: '2-5', wake: '拍照找物品', cn: '拍照找物品', family: 'search_list', key: 'home.item.search', params: { name: '探针', photo: true }, check: '拍照找物品与查物品同表，照片交代在备注' },
  { id: '2-6', wake: '查重复', cn: '查重复', family: 'duplicates', key: 'home.item.search', params: { dupes: true }, check: '重复分组独立成页，合并建议可复制' },
];

function paramsFor(sc) {
  const p = { ...(sc.params || {}) };
  if (sc.id === '1-1' || sc.id === '1-4') return { ...p, name: p.name, category_id: CID, location: p.loc };
  if (sc.id === '1-2') return { name: p.name, category_id: CID, location: p.loc, photo: p.photo };
  if (sc.id === '1-3') {
    return {
      op: 'batch',
      items: [
        { name: '批量勺', category_id: CID, location: '厨房/屉' },
        { name: '批量叉', category_id: CID, location: '厨房/屉' },
      ],
    };
  }
  if (sc.id === '2-2') return { id: IDA };
  const { loc: _drop, by: _drop2, ...rest } = p;
  return rest;
}

before(async () => {
  assert.ok(existsSync(BIN), 'dist 未建：先跑 node node_modules/typescript/bin/tsc -b packages/skill-home');
  HOME = mkdtempSync(join(tmpdir(), 'items1-'));
  runOk('home.stats.overview', {}, 'seed overview');
  const cats = runOk('home.tag.query', { kind: 'categories' }, 'seed categories').data.items;
  const hit = cats.find((c) => String(c.name).startsWith('分类:'));
  CID = hit.count;
  CATNAME = String(hit.name).replace(/^分类:/, '');
  for (const sc of SCENARIOS) {
    if (sc.id === '2-2') continue;
    const env = runOk(sc.key, paramsFor(sc), '真链 ' + sc.id + sc.wake);
    assert.equal(env.key, sc.key);
    ENVS[sc.id] = env;
  }
  const items = runOk('home.item.search', {}, 'seed search').data.items;
  IDA = items.find((x) => x.name === '探针杯').id;
  // 2-2 依赖探针杯的 id：先跑其余九条拿到库，再补跑 2-2（顺序不影响其它产物）。
  ENVS['2-2'] = runOk('home.item.detail', { id: IDA }, '真链 2-2看物品');
  // 双子杯（查重复的同名组）在断言前补录：不影响已产出的回执类产物。
  runOk('home.item.add', { name: '双子杯', category_id: CID, location: '客厅/桌' }, 'seed 双子杯甲');
  runOk('home.item.add', { name: '双子杯', category_id: CID, location: '卧室/柜' }, 'seed 双子杯乙');
  ENVS['2-6'] = runOk('home.item.search', { dupes: true }, '真链 2-6查重复');
  mkdirSync(OUT_DIR, { recursive: true });
  const rows = [];
  let seq = 0;
  for (const sc of SCENARIOS) {
    seq += 1;
    const file = sc.cn + '_' + sc.id + '_' + STAMP + '.html';
    const html = await render(sc.family, ENVS[sc.id]);
    writeFileSync(join(OUT_DIR, file), html, 'utf8');
    const bytes = Buffer.byteLength(html, 'utf8');
    rows.push({
      seq, wake: sc.wake, file, domain: '物品管理', family: sc.family,
      title: sc.wake, kind: sc.family === 'add_form' ? '采集加回执' : '查看',
      command: sc.key, cli: 'home-cmd-read ' + sc.key + " --params '" + JSON.stringify(paramsFor(sc)) + "'",
      check: sc.check, bytes,
    });
  }
  const manifest = {
    batch: '物品管理域一录入与查找',
    naming: '文件名通式：<命令中文名>_<场景编号>_<戳>，戳钉死可复现',
    notShipped: [],
    rows,
  };
  writeFileSync(join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 1), 'utf8');
});

function read(file) {
  return readFileSync(join(OUT_DIR, file), 'utf8');
}

describe('#806 物品管理域（一）：10 条真链与产物', () => {
  it('10 份产物与清单齐，字节对得上，清单不带签名', () => {
    const mf = JSON.parse(read('manifest.json'));
    assert.equal(mf.rows.length, 10);
    assert.notEqual(read('manifest.json').charCodeAt(0), 0xfeff);
    for (const r of mf.rows) {
      const html = read(r.file);
      assert.equal(Buffer.byteLength(html, 'utf8'), r.bytes, r.file + ' 字节对不上');
    }
  });

  it('壳完整：十份都有文档头与标题与命令原文，三标记无残留', () => {
    const mf = JSON.parse(read('manifest.json'));
    for (const r of mf.rows) {
      const html = read(r.file);
      assert.ok(html.includes('<!DOCTYPE html>'), r.file);
      assert.ok(html.includes('<html lang="zh-CN">'), r.file);
      assert.ok(html.includes('class="page"'), r.file);
      assert.ok(/<h1[^>]*>.+?<\/h1>/.test(html), r.file);
      assert.ok(html.includes('class="cmd"'), r.file);
      for (const m of ['<!--CONTENT-->', '<!--SHARED-CSS-->', '<!--SHARED-HELPERS-->']) {
        assert.ok(!html.includes(m), r.file + ' 标记未填充 ' + m);
      }
    }
  });

  it('1-1 单条录入：回执与本次名称在位', () => {
    const html = read('录物品_1-1_' + STAMP + '.html');
    assert.ok(html.includes('已录物品'), '回执缺席');
    assert.ok(html.includes('探针杯'), '本次名称缺席');
  });

  it('1-2 拍照录入：回执在位且拍照分流有交代', () => {
    const html = read('拍物品_1-2_' + STAMP + '.html');
    assert.ok(html.includes('已录物品'), '回执缺席');
    assert.ok(html.includes('照片随本次一起存'), '拍照分流缺席');
  });

  it('1-3 批量录入：件数与全部确认对得上', () => {
    const html = read('批量录入_1-3_' + STAMP + '.html');
    assert.ok(html.includes('已批量录入'), '回执缺席');
    // 断言的意思是「件数在页上有处可查」；#817 收口按「同一事实不说两遍」删掉了与回执、数量行
    // 重复的「本次共 2 件」半句，故改查件数本身，不再钉那句老文案。
    assert.ok(/2\s*件/.test(html), '件数缺席');
    assert.ok(html.includes('全部确认'), '全部确认缺席');
  });

  it('1-4 补录：补录日期有处可填', () => {
    const html = read('补录_1-4_' + STAMP + '.html');
    assert.ok(html.includes('已录物品'), '回执缺席');
    // 旧断言查的是占位残句「补录场景在此填写」；#817 收口按复核意见把它换成完整日期示例，断言同步。
    assert.ok(html.includes('录入日期（补录）') && html.includes('YYYY-MM-DD'), '补录位缺席');
  });

  it('2-1 查物品：结果与摘要在位', () => {
    const html = read('查物品_2-1_' + STAMP + '.html');
    assert.ok(html.includes('探针杯'), '结果缺席');
    assert.ok(html.includes('共 2 件'), '摘要缺席');
    assert.ok(html.includes('本地筛选'), '筛选框缺席');
  });

  it('2-1 空态：无命中指去录入（真链空结果）', async () => {
    const env = runOk('home.item.search', { name: '絕無此物' }, '真链空结果');
    assert.equal(env.data.items.length, 0);
    const html = await render('search_list', env);
    assert.ok(html.includes('没有命中'), '空态缺席');
    assert.ok(html.includes('录入新物品'), '未命中引导缺席');
  });

  it('2-2 看物品：底细与快捷操作在位', () => {
    const html = read('看物品_2-2_' + STAMP + '.html');
    assert.ok(html.includes('探针杯'), '名称缺席');
    assert.ok(html.includes('快捷操作'), '快捷操作缺席');
    assert.ok(html.includes('暂无记录'), '历史空态缺席');
  });

  it('2-3 紧急定位：置顶卡片在位', () => {
    const html = read('紧急定位_2-3_' + STAMP + '.html');
    assert.ok(html.includes('置顶'), '置顶缺席');
    assert.ok(html.includes('探针杯'), '首件缺席');
    assert.ok(html.includes('扩大寻找'), '扩大寻找缺席');
  });

  it('2-4 筛选浏览：分组与计数在位', () => {
    const html = read('筛选浏览_2-4_' + STAMP + '.html');
    assert.ok(html.includes(CATNAME), '当前分组缺席：' + CATNAME);
    assert.ok(html.includes('计数'), '计数缺席');
    // 断言的意思是「分组浏览有真的分组切换入口」；#817 收口把页上那句排序声称删了（页上没有排序
    // 控件），并把「全部」按钮从空转改成真切回全部分组，故改查这个真入口，不钉那句老文案。
    assert.ok(html.includes('showGroup(-1)'), '全部分组入口缺席');
  });

  it('2-5 拍照找物品：与查物品同表', () => {
    const html = read('拍照找物品_2-5_' + STAMP + '.html');
    assert.ok(html.includes('探针杯'), '结果缺席');
    assert.ok(html.includes('拍照找物品'), '拍照位缺席');
  });

  it('2-6 查重复：同名归组在位', () => {
    const html = read('查重复_2-6_' + STAMP + '.html');
    assert.ok(html.includes('双子杯'), '重复组缺席');
    assert.ok(html.includes('组内件数'), '组内件数缺席');
    assert.ok(html.includes('复制合并建议'), '合并建议缺席');
  });

  it('文件名通式逐字：<命令中文名>_<场景编号>_<戳>', () => {
    const mf = JSON.parse(read('manifest.json'));
    for (const r of mf.rows) {
      assert.match(basename(r.file), /^(.+)_(.+)_(\d{8}_\d{6})\.html$/, r.file);
    }
  });
});
