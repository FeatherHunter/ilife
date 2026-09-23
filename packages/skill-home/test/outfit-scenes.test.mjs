// #810 · 穿搭出行域 5 条真页面（真命令链＋真装配＋产物落盘＋清单）。
//
// 运行（仓根，一律经排队，只跑自己这份）：
//   node tooling/run-locked.mjs --ticket 810 --max-wait-ms 600000 -- node --test packages/skill-home/test/outfit-scenes.test.mjs
// 前提：`node node_modules/typescript/bin/tsc -b packages/skill-home`（页模块经 dist 进入本用例）。
// 隔离：家目录指临时目录（同 cli.test.mjs 的家目录通道），生产库与生产产物目录一律不碰。
// 产物：`.scratch/810/`（5 份真产物＋manifest.json，bytes 现算）；墙与链路页随后由
// 票 7 生成器产出（`gen-scene-wall`／`gen-chain-page`），见 `docs/skills/skill-home/scene-outfit.md`。
//
// 文件名说明：写集写的是 `outfit.test.mjs`，实际落 `outfit-scenes.test.mjs`——
// 票面验收 glob 是 `<域>-*.test.mjs`（`outfit.test.mjs` 匹配不上），以验收为准，见说明件。
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, basename, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { configDirOf, homeEnvOf } from '../../../test/helpers/home-test-base.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const pkgDir = join(here, '..');
const repoRoot = join(pkgDir, '..', '..');
const bin = join(pkgDir, 'dist', 'cli', 'cmd_read.js');
const outDir = join(repoRoot, '.scratch', '810');
const appendix = JSON.parse(readFileSync(join(repoRoot, 'docs', 'skills', 'skill-home', 'scene-pages-contract.appendix.json'), 'utf8'));

let HOME = '';
const P = (o) => JSON.stringify(o);
function run(key, params, extra) {
  return spawnSync(process.execPath, [bin, key, '--params', P(params || {}), ...(extra || [])], {
    encoding: 'utf8', env: { ...process.env, ...homeEnvOf(HOME) },
  });
}
function runOk(key, params, label, extra) {
  const r = run(key, params, extra);
  assert.equal(r.status, 0, label + ' exit=' + r.status + ' ERR=' + String(r.stderr || '').trim().slice(0, 400));
  const env = JSON.parse(String(r.stdout).trim().split('\n').pop());
  assert.equal(env.key, key);
  return env;
}
const stampOf = () => {
  const d = new Date();
  const p = (n, l = 2) => String(n).padStart(l, '0');
  return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '_' + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds());
};
const STEM = (cn) => new RegExp('^' + cn + '_\\d{8}_\\d{6}(_\\d+)?\\.html$');

const CLOTHES = [
  { name: '白色棉短袖-衣', location: '卧室/衣柜', tags: '夏季,常穿', count: 50 },
  { name: '白色运动鞋-鞋', location: '玄关/鞋柜', tags: '常穿,运动', count: 45 },
  { name: '牛仔外套-衣', location: '卧室/衣柜', tags: '春秋,常穿,薄外套', count: 40 },
  { name: '速干短袖-衣', location: '卧室/衣柜', tags: '夏季,运动', count: 35 },
  { name: '薄风衣-衣', location: '卧室/衣柜', tags: '春秋,薄外衣', count: 30 },
  { name: '黑色皮鞋-鞋', location: '玄关/鞋柜', tags: '正式', count: 20 },
  { name: '灰色羽绒服-衣', location: '阳台/收纳箱', tags: '冬季,已收纳', count: 10 },
  { name: '羊毛大衣-衣', location: '阳台/收纳箱', tags: '冬季', count: 5 },
  { name: '旧款风衣-衣', location: '阳台/收纳箱', tags: '春秋', count: 2, idleDays: 210 },
  { name: '压箱毛衣-衣', location: '卧室/衣柜', tags: '冬季', count: 1, idleDays: 190 },
  { name: '旅行洗漱包', location: '卧室/行李箱', tags: '旅行', count: 3 },
  { name: '登机箱', location: '玄关/鞋柜', tags: '旅行', count: 3 },
];

let CID = 0;
const IDS = new Map();
let STAMP = '';

async function backdate() {
  const { openHomeDb, closeHomeDb } = await import(pathToFileURL(join(pkgDir, 'dist', 'fetch', 'db.js')).href);
  const dbPath = join(configDirOf(HOME), 'data', 'home.db');
  assert.ok(existsSync(dbPath), '隔离库须存在：' + dbPath);
  const h = openHomeDb(dbPath);
  try {
    for (const c of CLOTHES) {
      const row = h.db.prepare('SELECT id FROM items WHERE name=?').get(c.name);
      assert.ok(row, '种子须在库：' + c.name);
      h.db.prepare('UPDATE items SET access_count=? WHERE id=?').run(c.count, row.id);
      if (c.idleDays) {
        const cut = new Date(Date.now() - c.idleDays * 86400000).toISOString();
        h.db.prepare('UPDATE items SET last_accessed_at=? WHERE id=?').run(cut, row.id);
      }
      IDS.set(c.name, row.id);
    }
  } finally {
    closeHomeDb(h);
  }
}

function render(family, env) {
  return import(pathToFileURL(join(pkgDir, 'dist', 'outfit', 'pages', family + '.js')).href)
    .then((m) => m.renderFamilyPage(env));
}

function writeProduct(file, html) {
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, file), html, 'utf8');
  return statSync(join(outDir, file)).size;
}

function assertShell(html, family, blocks) {
  assert.ok(html.includes('<!DOCTYPE html>') && html.includes('<html lang="zh-CN">'), family + ' 壳');
  assert.ok(/<h1[^>]*>.+?<\/h1>/.test(html), family + ' 有标题');
  assert.ok(html.includes('class="cmd"'), family + ' 有命令原文行');
  assert.ok(html.includes('name="viewport"'), family + ' 有视口（双端）');
  for (const m of ['<!--CONTENT-->', '<!--SHARED-CSS-->', '<!--SHARED-HELPERS-->']) {
    assert.ok(!html.includes(m), family + ' 标记未填充：' + m);
  }
  for (const g of ['fields', 'operations', 'empty', 'status']) {
    assert.ok(html.includes('data-block="' + g + '"'), family + ' 缺块组：' + g);
  }
  for (const b of blocks) assert.ok(html.includes(b), family + ' 缺块：' + b.slice(0, 20));
}

const blocksOf = (family) => {
  const f = appendix.families.find((x) => x.family === family);
  assert.ok(f, '附录须有族：' + family);
  return [...f.requiredBlocks.fields, ...f.requiredBlocks.operations, ...f.requiredBlocks.empty, ...f.requiredBlocks.status];
};

before(() => {
  assert.ok(existsSync(bin), 'dist 未建：先跑 tsc -b packages/skill-home');
  HOME = join(tmpdir(), 'home810-') + String(process.pid);
  mkdirSync(HOME, { recursive: true });
  runOk('home.stats.overview', {}, 'seed overview');
  const cats = runOk('home.tag.query', { kind: 'categories' }, 'seed categories').data.items;
  CID = cats.find((c) => String(c.name).startsWith('分类:')).count;
  for (const c of CLOTHES) {
    runOk('home.item.add', { name: c.name, category_id: CID, location: c.location, tags: c.tags }, 'seed ' + c.name);
  }
  STAMP = stampOf();
});

describe('#810 穿搭出行域：5 条真链＋真产物', () => {
  it('SM3-1 穿什么：拼贴卡（槽位＋风格＋理由＋备选横滑）', async () => {
    await backdate();
    const env = runOk('home.outfit.pick', {}, 'SM3-1 真链');
    assert.match(basename(env.delivery.path), STEM('穿什么'), '默认落盘命名逐字');
    assert.equal(env.delivery.bytes, statSync(env.delivery.path).size, '回执字节＝实测');
    const html = await render('outfit_picker', env);
    assertShell(html, 'outfit_picker', blocksOf('outfit_picker'));
    for (const s of ['今日这一套', '备选组合', '上一套', '换一套', '今天穿这套', '外套', '内搭', '鞋', '牛仔外套-衣', '白色棉短袖-衣', '白色运动鞋-鞋']) {
      assert.ok(html.includes(s), 'SM3-1 缺内容：' + s);
    }
    assert.ok(html.includes('衣橱缺口'), 'SM3-1 下装缺口诚实提示（种子无下装）');
    const bytes = writeProduct('穿什么_' + STAMP + '.html', html);
    assert.ok(bytes > 2000, '产物非空壳：' + bytes);
  });

  it('SM3-2 衣橱分析：构成分布＋闲置清单', async () => {
    const env = runOk('home.outfit.pick', { kind: 'wardrobe' }, 'SM3-2 真链');
    assert.match(basename(env.delivery.path), STEM('衣橱分析'), '默认落盘命名逐字');
    const html = await render('wardrobe_analyze', env);
    assertShell(html, 'wardrobe_analyze', blocksOf('wardrobe_analyze'));
    for (const s of ['衣橱构成', '闲置清单', '智能建议', '外套', '内搭', '标记废弃', '送人', '先不处理', '加入购物清单', '旧款风衣-衣', '压箱毛衣-衣', '估算']) {
      assert.ok(html.includes(s), 'SM3-2 缺内容：' + s);
    }
    const bytes = writeProduct('衣橱分析_' + STAMP + '.html', html);
    assert.ok(bytes > 2000, '产物非空壳：' + bytes);
  });

  it('SM3-3 换季：季节清单＋收纳位置下拉', async () => {
    const env = runOk('home.outfit.pick', { kind: 'season', season: '冬季', action: '收纳' }, 'SM3-3 真链');
    assert.match(basename(env.delivery.path), STEM('换季'), '默认落盘命名逐字');
    const html = await render('wardrobe_season', env);
    assertShell(html, 'wardrobe_season', blocksOf('wardrobe_season'));
    for (const s of ['目标位置', '冬季衣物清单', '全选切换', '确认收纳', '羊毛大衣-衣', '压箱毛衣-衣']) {
      assert.ok(html.includes(s), 'SM3-3 缺内容：' + s);
    }
    const bytes = writeProduct('换季_' + STAMP + '.html', html);
    assert.ok(bytes > 2000, '产物非空壳：' + bytes);
  });

  it('SM3-4 带物品／归物品：同一族 mode 分流', async () => {
    const pack = runOk('home.trip.manage', { mode: 'pack', ids: [IDS.get('旅行洗漱包'), IDS.get('登机箱')] }, 'SM3-4 带出');
    assert.match(basename(pack.delivery.path), STEM('出行清单'), '默认落盘命名逐字');
    const html = await render('travel_trip', pack);
    assertShell(html, 'travel_trip', blocksOf('travel_trip'));
    for (const s of ['出发核对', '确认带出', '旅行洗漱包', '登机箱', '已装']) {
      assert.ok(html.includes(s), 'SM3-4 缺内容：' + s);
    }
    const bytes = writeProduct('出行清单_' + STAMP + '.html', html);
    assert.ok(bytes > 2000, '产物非空壳：' + bytes);
    const ret = runOk('home.trip.manage', { mode: 'return' }, 'SM3-4 归位');
    assert.match(basename(ret.delivery.path), STEM('出行清单'), '归位同宿主场景名');
    assert.match(String(ret.data.message), /已归位：2 件/, '归位 2 件');
    const html2 = await render('travel_trip', ret);
    assert.ok(html2.includes('归位确认'), '归位视图切换');
  });

  it('SM3-5 旅行穿搭：逐日计划＋冲突＋行李', async () => {
    const env = runOk('home.outfit.pick', { kind: 'trip-plan', days: 3, destination: '海边' }, 'SM3-5 真链');
    assert.match(basename(env.delivery.path), STEM('旅行穿搭'), '默认落盘命名逐字');
    const html = await render('trip_outfit_plan', env);
    assertShell(html, 'trip_outfit_plan', blocksOf('trip_outfit_plan'));
    // 断言的意思是「每日计划里天数与温度位都在」；#817 收口把温度占位说明句「按季节估算」改成
    // 值位写「—」（温度无外部来源，值位不写说明句），故改查温度位本身，不再钉那句占位话。
    for (const s of ['每日穿搭', '第1天', '第2天', '第3天', '冲突提示', '行李汇总', '采纳这天', '生成行李清单', '海边']) {
      assert.ok(html.includes(s), 'SM3-5 缺内容：' + s);
    }
    assert.ok(html.includes('of-temp'), 'SM3-5 温度位缺席');
    const bytes = writeProduct('旅行穿搭_' + STAMP + '.html', html);
    assert.ok(bytes > 2000, '产物非空壳：' + bytes);
  });

  it('空态：空库不抛，走真空态', async () => {
    const fresh = join(tmpdir(), 'home810empty-') + String(process.pid);
    mkdirSync(fresh, { recursive: true });
    const r = spawnSync(process.execPath, [bin, 'home.outfit.pick', '--params', P({})], {
      encoding: 'utf8', env: { ...process.env, ...homeEnvOf(fresh) },
    });
    assert.equal(r.status, 0, '空库 exit 0');
    const env = JSON.parse(String(r.stdout).trim().split('\n').pop());
    const html = await render('outfit_picker', env);
    assert.ok(html.includes('衣橱还没有可搭配的衣物'), '真空态在位');
    const w = await render('wardrobe_season', env);
    assert.ok(w.includes('没有带') && w.includes('标签的在家衣物'), '换季空态在位');
  });

  it('契约：两层解析＋必需块三方一致', async () => {
    const { resolvePageFamily } = await import(pathToFileURL(join(pkgDir, 'dist', 'render', 'pageFamilies.js')).href);
    assert.equal(resolvePageFamily('home.outfit.pick', {}), 'outfit_picker');
    assert.equal(resolvePageFamily('home.outfit.pick', { kind: 'wardrobe' }), 'wardrobe_analyze');
    assert.equal(resolvePageFamily('home.outfit.pick', { kind: 'season' }), 'wardrobe_season');
    assert.equal(resolvePageFamily('home.trip.manage', { mode: 'pack' }), 'travel_trip');
    assert.equal(resolvePageFamily('home.trip.manage', { mode: 'return' }), 'travel_trip');
    assert.equal(resolvePageFamily('home.outfit.pick', { kind: 'trip-plan' }), 'trip_outfit_plan');
    const { blocksFor } = await import(pathToFileURL(join(pkgDir, 'scripts', 'lib', 'page-blocks.mjs')).href);
    for (const f of appendix.families.filter((x) => x.domain === 'outfit')) {
      const page = await import(pathToFileURL(join(pkgDir, 'dist', 'outfit', 'pages', f.family + '.js')).href);
      assert.equal(page.FAMILY, f.family);
      assert.deepEqual(page.PAGE_META.scenarios, f.scenarios);
      assert.deepEqual(page.REQUIRED_BLOCKS, f.requiredBlocks);
      assert.deepEqual(blocksFor(f.family).requiredBlocks, f.requiredBlocks);
    }
  });

  it('清单：manifest.json 5 行＋字节现算', () => {
    // 只认本轮戳；旧轮产物是本票自己的过期件，清掉，保持目录即交付态。
    for (const f of readdirSync(outDir).filter((f) => f.endsWith('.html') && !f.includes(STAMP))) {
      unlinkSync(join(outDir, f));
    }
    const files = readdirSync(outDir).filter((f) => f.endsWith('.html')).sort();
    assert.equal(files.length, 5, '5 份产物：' + files.join(','));
    const rows = [
      { seq: 1, wake: '穿什么', file: files.find((f) => f.startsWith('穿什么_')), domain: 'outfit', family: 'outfit_picker', kind: '混合', title: '今日穿搭推荐', prompt: '帮我推荐今日穿搭（唤醒词：穿什么），场合与天气选填', command: 'home.outfit.pick', check: '拼贴卡槽位是否齐全，风格标签与推荐理由是否在，备选组合能否横滑切换' },
      { seq: 2, wake: '衣橱分析', file: files.find((f) => f.startsWith('衣橱分析_')), domain: 'outfit', family: 'wardrobe_analyze', kind: '混合', title: '衣橱闲置分析', prompt: '帮我做衣橱分析（唤醒词：衣橱分析），看构成分布与闲置清单', command: 'home.outfit.pick', check: '构成分布条数是否与数量对上，闲置清单是否诚实标注估算，智能建议一句话是否在' },
      { seq: 3, wake: '换季', file: files.find((f) => f.startsWith('换季_')), domain: 'outfit', family: 'wardrobe_season', kind: '采集＋回执', title: '换季收纳', prompt: '帮我做换季收纳（唤醒词：换季），季节与收纳拿出操作必填', command: 'home.outfit.pick', check: '季节衣物清单是否只含当季，收纳位置下拉是否有候选项，全选与确认收纳是否在' },
      { seq: 4, wake: '带物品／归物品', file: files.find((f) => f.startsWith('出行清单_')), domain: 'outfit', family: 'travel_trip', kind: '混合', title: '出行带物清单', prompt: '帮我做出行带物清单（唤醒词：带物品），行程类型天数与带出归位操作必填', command: 'home.trip.manage', check: '清单卡片是否有名称数量位置理由，确认带出与确认归位是否区分，进度是否在' },
      { seq: 5, wake: '旅行穿搭', file: files.find((f) => f.startsWith('旅行穿搭_')), domain: 'outfit', family: 'trip_outfit_plan', kind: '混合', title: '旅行穿搭计划', prompt: '帮我做旅行穿搭计划（唤醒词：旅行穿搭），目的地与天数必填', command: 'home.outfit.pick', check: '每日计划是否有天数温度组合，冲突提示与行李汇总是否在，采纳后复制是否在' },
    ];
    for (const r of rows) assert.ok(r.file, '产物须存在：seq ' + r.seq);
    const manifest = {
      batch: '810 穿搭出行域', madeAt: new Date().toISOString().slice(0, 10),
      naming: '文件名只从本清单 file 字段读；生成器不算名、不裁规则',
      notShipped: [], readings: { 产物: '5 份真命令链产物（种子经 `home.item.add` 真链录入）' },
      rows: rows.map((r) => ({ ...r, bytes: statSync(join(outDir, r.file)).size })),
    };
    writeFileSync(join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 1), 'utf8');
    assert.equal(manifest.rows.length, 5);
  });
});
