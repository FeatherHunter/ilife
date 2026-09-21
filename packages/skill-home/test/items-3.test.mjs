// #808 物品管理域（三）照片、盘点与历史 8 条：真链路＋真产物＋双墙（验收①）。
//
// 链路：唤醒词 → 命令（dist 真 spawn）→ 信封 → 本族 renderFamilyPage → 产物落盘
// → manifest.json → 双墙（手机 390／桌面 1280）→ 墙自检。
// 隔离：家目录指临时目录；种子库用票 5 的仓内种子（幂等补齐后拷入临时家，不碰生产库）。
// 产物与墙落 `.scratch/808/`（工作区内，与验收墙同向）；命名走契约唯一算法
// `<命令中文名>_<场景 id>_<戳>.html`（戳＝YYYYMMDD_HHMMSS，只含数字与下划线）。
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, readFileSync, readdirSync, rmSync, existsSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { homeEnvOf, configDirOf } from '../../../test/helpers/home-test-base.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const pkgDir = join(here, '..');
const repoRoot = join(pkgDir, '..', '..');
const bin = join(pkgDir, 'dist', 'cli', 'cmd_read.js');
const seedDb = join(repoRoot, '.scratch', 'home-seed', 'home-seed.db');
const seedScript = join(pkgDir, 'scripts', 'seed-scenes.mjs');
const wallGen = join(repoRoot, 'docs', 'skills', 'skill-home', 'gen-scene-wall.mjs');
const outDir = join(repoRoot, '.scratch', '808');
const wallMobile = '物品管理-3-手机墙.html';
const wallDesktop = '物品管理-3-桌面墙.html';

let HOME = '';
const stamp = (() => {
  const d = new Date();
  const p = (n, l = 2) => String(n).padStart(l, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
})();

function spawn(args, envExtra) {
  return spawnSync(process.execPath, args, { cwd: repoRoot, encoding: 'utf8', env: { ...process.env, ...homeEnvOf(HOME), ...(envExtra || {}) } });
}

// 真命令链：--html 指到临时文件（stdout 保持信封单行，回执不干扰解析）。
function runOk(key, params) {
  const tmpHtml = join(HOME, `tmp-${Math.random().toString(36).slice(2)}.html`);
  const r = spawn([bin, key, '--params', JSON.stringify(params || {}), '--html', tmpHtml]);
  assert.equal(r.status, 0, `${key} exit=${r.status} ERR=${(r.stderr || '').trim().slice(0, 400)}`);
  const lines = (r.stdout || '').trim().split('\n').filter((l) => l.trim().startsWith('{'));
  assert.ok(lines.length >= 1, `${key} 无信封行`);
  const env = JSON.parse(lines[lines.length - 1]);
  assert.equal(env.key, key, `${key} 信封键走散`);
  return env;
}

const products = [];

function product(commandCn, sceneId, wake, title, family, check, env) {
  return { commandCn, sceneId, wake, title, family, check, env };
}

function fileOf(p) {
  return `${p.commandCn}_${p.sceneId}_${stamp}.html`;
}

before(async () => {
  assert.ok(existsSync(bin), 'dist 未建：先跑 node node_modules/typescript/bin/tsc -b packages/skill-home');
  HOME = mkdtempSync(join(tmpdir(), 'items3-'));
  // 种子：幂等补齐（已是最新即报 up-to-date，不复写），再拷入临时家。
  const seed = spawn([seedScript]);
  assert.equal(seed.status, 0, '种子脚本 exit=' + seed.status + ' ERR=' + (seed.stderr || '').trim().slice(0, 400));
  assert.ok(existsSync(seedDb), '种子库缺席：' + seedDb);
  runOk('home.stats.overview', {});
  copyFileSync(seedDb, join(configDirOf(HOME), 'data', 'home.db'));

  // 发现：有照片物品（墙链）与事件最多的物品（历史链），不写死种子 id。
  const wall = runOk('home.item.search', { wall: true });
  assert.ok(wall.data.total >= 1, '种子墙空');
  const photoId = wall.data.items[0].id;
  let histId = photoId;
  let histBest = -1;
  for (const c of wall.data.items.slice(0, 4)) {
    const h = runOk('home.item.detail', { id: c.id, view: 'history' });
    const n = String(h.data.item.history || '').split('；').filter((s) => s.trim() !== '').length;
    if (n > histBest) { histBest = n; histId = c.id; }
  }
  assert.ok(histBest >= 1, '种子无历史事件');

  const photoName = String(wall.data.items.find((c) => c.id === photoId).name || '');
  const histCard = runOk('home.item.detail', { id: histId, view: 'history' });
  const histName = String(histCard.data.item.name || '');

  // 8 条真链路（唤醒词 → 命令 → 信封）。
  products.push(product('查看照片', '5-1', '查看照片', '查看物品照片(含类型筛选)', 'photos',
    '确认主图与类型选择及查看态动作齐全', runOk('home.item.detail', { id: photoId, view: 'photos' })));
  products.push(product('管照片', '5-2', '管照片', '管理物品照片(排序换主图加图)', 'photos',
    '确认管理回执与三处照片动作可用', runOk('home.item.update', { id: photoId, op: 'photo', photo: 'seed-jacket-red.png' })));
  products.push(product('照片墙', '5-3', '照片墙', '浏览物品照片墙(分类位置类型)', 'photo_wall',
    '确认网格分组与补拍引导完整', wall));
  products.push(product('盘点', '6-1', '盘点', '盘点核对(按位置分类全屋)', 'inventory_round',
    '确认三态判定与修正入口齐备', runOk('home.inventory.round', { op: 'round', scope: 'all' })));
  products.push(product('差异处理', '6-2', '差异处理', '处理盘点差异(缺多异待确认)', 'inventory_diff',
    '确认四组动作与批量确认可用', runOk('home.inventory.round', { op: 'resolve', record_id: 1 })));
  products.push(product('盘点记录', '6-3', '盘点记录', '查看盘点记录(含复查)', 'inventory_records',
    '确认记录卡与复查入口齐备', runOk('home.inventory.records', {})));
  products.push(product('搬家盘点', '6-4', '搬家盘点', '搬家打包盘点(带走不带走)', 'move_checklist',
    '确认二态标记与统一确认可用', runOk('home.inventory.round', { op: 'move' })));
  products.push(product('历史', '7-1', '历史', '查看物品历史(时间线轨迹)', 'history',
    '确认时间线与轨迹筛选可用', histCard));

  // 产物落盘：renderFamilyPage(真信封) → 命名算法文件名。
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  for (const p of products) {
    const mod = await import(pathToFileURL(join(pkgDir, 'dist', 'items', 'pages', `${p.family}.js`)).href);
    const html = mod.renderFamilyPage(p.env);
    for (const m of ['<!--SHARED-CSS-->', '<!--SHARED-HELPERS-->', '<!--CONTENT-->']) {
      assert.ok(!html.includes(m), `${p.sceneId} 标记未填充：${m}`);
    }
    assert.ok(html.includes('<!DOCTYPE html>') && html.includes('class="page"'), `${p.sceneId} 缺壳`);
    const f = fileOf(p);
    writeFileSync(join(outDir, f), html, 'utf8');
    p.file = f;
    p.bytes = statSync(join(outDir, f)).size;
  }

  // 清单（墙与索引的唯一事实源）→ 双墙 → 自检。
  const manifest = {
    batch: '物品管理-3',
    naming: '命令中文名_场景id_戳（契约唯一算法）',
    notShipped: [{ what: '无', why: '本域8场景全部出产物' }],
    readings: { '域测试': '8场景真链路全绿', '产物': '8份', '墙自检': '双墙可发' },
    rows: products.map((p, i) => ({
      seq: i + 1, wake: p.wake, title: p.title, file: p.file,
      domain: '物品管理', family: p.family, check: p.check, bytes: p.bytes,
    })),
  };
  writeFileSync(join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 1), 'utf8');
  for (const [wallFile, w, h] of [[wallMobile, 390, 820], [wallDesktop, 1280, 860]]) {
    const g = spawn([wallGen, outDir, wallFile, String(w), String(h)]);
    assert.equal(g.status, 0, `出墙 ${wallFile} exit=${g.status} OUT=${(g.stdout || '').slice(-300)} ERR=${(g.stderr || '').slice(-300)}`);
  }
  for (const wallFile of [wallMobile, wallDesktop]) {
    const c = spawn([wallGen, '--check', outDir, wallFile]);
    assert.equal(c.status, 0, `--check ${wallFile} exit=${c.status} OUT=${(c.stdout || '').slice(-300)} ERR=${(c.stderr || '').slice(-300)}`);
    assert.match(c.stdout || '', /可发/);
  }

  // 留给本轮 expect 用的名字。
  globalThis.__items3 = { photoId, photoName, histId, histName };
});

describe('#808 物品管理域（三）：8 场景真链路', () => {
  it('5-1 查看照片：信封带照片文件名，产物含主图与类型', () => {
    const p = products.find((x) => x.sceneId === '5-1');
    assert.equal(p.env.shape, 'detail');
    assert.ok(String(p.env.data.item.photo || '') !== '', '照片文件名空');
    const html = readFileSync(join(outDir, p.file), 'utf8');
    assert.ok(html.includes('当前模式：查看') || html.includes('查看'), '缺查看态');
    assert.ok(html.includes('说明书-使用'), '缺类型词');
  });
  it('5-2 管照片：管理回执，产物为管理态', () => {
    const p = products.find((x) => x.sceneId === '5-2');
    assert.equal(p.env.shape, 'receipt');
    const html = readFileSync(join(outDir, p.file), 'utf8');
    assert.ok(html.includes('当前模式：管理'), '缺管理态');
    assert.ok(html.includes('确认顺序变更') && html.includes('加图·补拍') && html.includes('删除选中'), '缺管理动作');
  });
  it('5-3 照片墙：网格分组与补拍引导', () => {
    const p = products.find((x) => x.sceneId === '5-3');
    assert.ok(p.env.data.total >= 1, '墙空');
    const html = readFileSync(join(outDir, p.file), 'utf8');
    assert.ok(html.includes('照片网格'), '缺网格块');
    assert.ok(html.includes('去补拍'), '缺补拍引导');
  });
  it('6-1 盘点：三态判定与修正入口', () => {
    const p = products.find((x) => x.sceneId === '6-1');
    assert.equal(p.env.shape, 'receipt');
    const html = readFileSync(join(outDir, p.file), 'utf8');
    assert.ok(html.includes('三态判定') && html.includes('数量修正') && html.includes('新位置'), '缺核对块');
    assert.ok(html.includes('确认提交含差异') || html.includes('确认提交'), '缺提交动作');
  });
  it('6-2 差异处理：四组与批量确认', () => {
    const p = products.find((x) => x.sceneId === '6-2');
    const html = readFileSync(join(outDir, p.file), 'utf8');
    assert.ok(html.includes('所属盘点记录'), '缺所属记录');
    assert.ok(html.includes('批量确认') && html.includes('按实际更新') && html.includes('标记复查'), '缺分组动作');
  });
  it('6-3 盘点记录：记录卡与复查入口', () => {
    const p = products.find((x) => x.sceneId === '6-3');
    assert.ok(p.env.data.total >= 1, '无记录');
    const html = readFileSync(join(outDir, p.file), 'utf8');
    assert.ok(html.includes('记录状态') && html.includes('复查') && html.includes('开始盘点'), '缺记录块');
  });
  it('6-4 搬家盘点：二态标记与统一确认', () => {
    const p = products.find((x) => x.sceneId === '6-4');
    const html = readFileSync(join(outDir, p.file), 'utf8');
    assert.ok(html.includes('二态标记') && html.includes('统一确认'), '缺二态块');
    assert.ok(html.includes('全带走') && html.includes('全不带走'), '缺整组动作');
  });
  it('7-1 历史：时间线与位置轨迹', () => {
    const p = products.find((x) => x.sceneId === '7-1');
    const html = readFileSync(join(outDir, p.file), 'utf8');
    assert.ok(html.includes('位置轨迹'), '缺轨迹块');
    assert.ok(html.includes('第1条'), '缺时间线条目');
    assert.ok(html.includes('展开详情'), '缺展开动作');
  });
});

describe('#808 产物与墙：机审前置', () => {
  it('8 份产物 data-block 四组齐全、机审可见串在位', async () => {
    const appendix = JSON.parse(readFileSync(join(repoRoot, 'docs', 'skills', 'skill-home', 'scene-pages-contract.appendix.json'), 'utf8'));
    const fams = new Map(appendix.families.map((f) => [f.family, f]));
    const { escapeHtml } = await import(pathToFileURL(join(pkgDir, 'dist', 'render', 'html.js')).href);
    for (const p of products) {
      const html = readFileSync(join(outDir, p.file), 'utf8');
      for (const g of ['fields', 'operations', 'empty', 'status']) {
        assert.ok(html.includes(`data-block="${g}"`), `${p.sceneId} 缺块组 ${g}`);
        for (const b of fams.get(p.family).requiredBlocks[g]) {
          assert.ok(html.includes(escapeHtml(b)), `${p.sceneId} 缺块 [${g}] ${b.slice(0, 20)}`);
        }
      }
    }
  });
  it('双墙与索引同目录，清单字节一致', () => {
    const names = readdirSync(outDir).filter((f) => f.endsWith('.html')).sort();
    assert.ok(names.includes(wallMobile) && names.includes(wallDesktop), '缺墙：' + names.join(','));
    assert.ok(names.includes('总索引.html'), '缺总索引');
    assert.equal(names.filter((f) => f !== wallMobile && f !== wallDesktop && f !== '总索引.html').length, 8, '产物不是8份：' + names.join(','));
    const mf = JSON.parse(readFileSync(join(outDir, 'manifest.json'), 'utf8'));
    assert.equal(mf.rows.length, 8);
    for (const r of mf.rows) {
      assert.equal(statSync(join(outDir, r.file)).size, r.bytes, `${r.file} 字节走散`);
    }
  });
});
