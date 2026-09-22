// 票 #805 · 脚手架装配契约测试（验收命令见票面）。
//
// 断三件事（46 族逐族）：
// ① 生成的骨架能被**真命令链**渲染（spawn 真 `home-cmd-read`，不是只跑 lint）；
// ② 带齐契约要求的块位（四组 `data-block`＋每块 `data-need` 原文在位）；
// ③ 三方对账（页模块／登记表／契约附录走散即红），两层解析现场复核。
//
// 前提：`node node_modules/typescript/bin/tsc -b packages/skill-home`
// （页模块经 `dist/<域>/pages/<族>.js` 进入本用例）。
// 隔离：家目录指临时目录（同 `cli.test.mjs` 的家目录通道），不碰生产库。
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, existsSync } from 'node:fs';
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
  assert.equal(r.status, 0, label + ' exit=' + r.status + ' ERR=' + (r.stderr || '').trim().slice(0, 300));
  return JSON.parse(r.stdout.trim().split('\n').pop());
}

let CID = 0;
let IDA = 0;
let IDB = 0;
let IDC = 0;
let BACKUP_ZIP = '';

before(() => {
  assert.ok(existsSync(bin), 'dist 未建：先跑 node node_modules/typescript/bin/tsc -b packages/skill-home');
  HOME = mkdtempSync(join(tmpdir(), 'scaffold-'));
  runOk('home.stats.overview', {}, 'seed overview');
  const cats = runOk('home.tag.query', { kind: 'categories' }, 'seed categories').data.items;
  CID = cats.find((c) => String(c.name).startsWith('分类:')).count;
  runOk('home.item.add', { name: '骨架A', category_id: CID, location: '客厅/冰箱' }, 'seed addA');
  runOk('home.item.add', { name: '骨架B', category_id: CID, location: '卧室/衣柜' }, 'seed addB');
  runOk('home.item.add', { name: '骨架C', category_id: CID, location: '书房/书架' }, 'seed addC');
  const items = runOk('home.item.search', {}, 'seed search').data.items;
  IDA = items.find((x) => x.name === '骨架A').id;
  IDB = items.find((x) => x.name === '骨架B').id;
  IDC = items.find((x) => x.name === '骨架C').id;
  runOk('home.shopping.write', { op: 'list-add', name: '鸡蛋', quantity: 2 }, 'seed shopping');
  runOk('home.care.write', { kind: 'member', name: '妈妈' }, 'seed member');
  runOk('home.inventory.round', { op: 'round', scope: 'all' }, 'seed round');
  runOk('home.care.write', { kind: 'backup' }, 'seed backup');
  const walk = (d, acc = []) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p, acc);
      else if (e.name.endsWith('.zip')) acc.push(e.name);
    }
    return acc;
  };
  const zips = walk(join(HOME, '.ilife'));
  assert.ok(zips.length >= 1, '种子备份未落盘');
  BACKUP_ZIP = zips.sort().pop();
});

// 每族真链入参＝附录代表场景的预设＋必需槽位（id／目标／文件）。
function paramsFor(domain, family, rep) {
  const p = { ...(rep.preset || {}) };
  if (rep.key === 'home.item.detail') return { ...p, id: IDA };
  if (rep.key === 'home.item.update') {
    if (p.op === 'move') return { ...p, id: IDA, new_location: '卧室/衣柜' };
    if (p.op === 'merge') return { ...p, id: IDA, target: IDB, sources: String(IDC) };
    if (p.op === 'relate') return { ...p, id: IDA, related: IDB };
    if (p.op === 'photo') return { ...p, id: IDA, photo: 'photo1.jpg' };
    return { ...p, id: IDA };
  }
  if (rep.key === 'home.item.add') return { ...p, name: '骨架D', category_id: CID, location: '客厅/桌' };
  if (rep.key === 'home.inventory.round' && p.op === 'resolve') return { ...p, id: 1 };
  if (rep.key === 'home.location.write' && p.op === 'fixed') return { ...p, item_id: IDA, location: '客厅/冰箱' };
  if (rep.key === 'home.location.write') return { ...p, action: 'add', path: '阳台/柜子' };
  if (rep.key === 'home.trip.manage' && p.mode === 'pack') return { ...p, ids: [] };
  return p;
}

describe('#805 脚手架：生成器与登记表齐套', () => {
  // 家族文件字节比对（`new-scene-page.mjs --check` 全量）是单次门：仅脚手架重出时刻有效。
  // 域票填内容后骨架与落盘必然分叉（票 #866 裁决 Q3），故此处不再断言全量 --check；
  // 常驻门是本块的登记表字节同一＋下块的 46 族三方对账＋真链渲染。手动单次核验跑：
  // `node packages/skill-home/scripts/new-scene-page.mjs --check`（填内容后红是预期）。
  it('登记表与附录字节同一（生成物，常驻门）', async () => {
    const { loadAppendix, generateRegistry } = await import(
      pathToFileURL(join(pkgDir, 'scripts', 'lib', 'scene-page-scaffold.mjs')).href);
    const appendix = loadAppendix();
    assert.equal(appendix.families.length, 46);
    const g = generateRegistry(appendix, false);
    const disk = readFileSync(g.file, 'utf8');
    assert.equal(disk, g.text, '登记表与附录分叉：只许重跑登记表派生，不许手改生成物');
  });

  it('46 族模板与页模块文件齐（8 域目录）', async () => {
    const { PAGE_BLOCKS } = await import(pathToFileURL(join(pkgDir, 'scripts', 'lib', 'page-blocks.mjs')).href);
    assert.equal(Object.keys(PAGE_BLOCKS).length, 46);
    for (const f of appendix.families) {
      assert.ok(existsSync(join(pkgDir, 'templates', f.domain, f.family + '.html')), '缺模板 ' + f.domain + '/' + f.family);
      assert.ok(existsSync(join(pkgDir, 'src', f.domain, 'pages', f.family + '.ts')), '缺页模块 ' + f.domain + '/' + f.family);
    }
  });
});

describe('#805 脚手架：46 族逐族真链装配', () => {
  const byId = new Map(appendix.scenarios.map((s) => [s.id, s]));
  for (const fam of appendix.families) {
    const rep = byId.get(fam.scenarios[0]);
    it(fam.domain + '/' + fam.family + '（' + rep.key + ' ' + fam.scenarios[0] + '）', async () => {
      // ① 真命令链（导入恢复走预告＋确认两步，其余一步）
      let env;
      if (fam.family === 'import_restore') {
        runOk(rep.key, { kind: 'import-preview', file: BACKUP_ZIP }, 'import preview');
        env = runOk(rep.key, { kind: 'import', file: BACKUP_ZIP, confirm: true }, 'import confirm');
      } else {
        env = runOk(rep.key, paramsFor(fam.domain, fam.family, rep), '真链 ' + fam.family);
      }
      assert.equal(env.key, rep.key);
      // ② 两层解析现场复核（契约 L1：同一预设只到一族）
      const { resolvePageFamily } = await import(pathToFileURL(join(pkgDir, 'dist', 'render', 'pageFamilies.js')).href);
      assert.equal(resolvePageFamily(rep.key, rep.preset || {}), fam.family);
      // ③ 页模块装配＋三方对账
      const page = await import(pathToFileURL(join(pkgDir, 'dist', fam.domain, 'pages', fam.family + '.js')).href);
      const { PAGE_BLOCKS, blocksFor } = await import(pathToFileURL(join(pkgDir, 'scripts', 'lib', 'page-blocks.mjs')).href);
      const { escapeHtml } = await import(pathToFileURL(join(pkgDir, 'dist', 'render', 'html.js')).href);
      assert.equal(page.FAMILY, fam.family);
      assert.deepEqual([...page.PAGE_META.scenarios], fam.scenarios);
      assert.equal(page.PAGE_META.domain, fam.domain);
      assert.deepEqual(page.REQUIRED_BLOCKS, fam.requiredBlocks);
      assert.deepEqual(blocksFor(fam.family).requiredBlocks, fam.requiredBlocks);
      assert.ok(PAGE_BLOCKS[fam.family]);
      const html = page.renderFamilyPage(env);
      // ④ 契约块位齐（四组 data-block＋每块原文＋壳标记已填充）
      for (const m of ['<!--CONTENT-->', '<!--SHARED-CSS-->', '<!--SHARED-HELPERS-->']) {
        assert.ok(!html.includes(m), '标记未填充：' + m);
      }
      assert.ok(html.includes('<!DOCTYPE html>') && html.includes('<html lang="zh-CN">'));
      assert.ok(html.includes('class="page"') && /<h1[^>]*>.+?<\/h1>/.test(html) && html.includes('class="cmd"'));
      for (const g of ['fields', 'operations', 'empty', 'status']) {
        assert.ok(html.includes('data-block="' + g + '"'), '缺块组：' + g);
        for (const b of fam.requiredBlocks[g]) {
          assert.ok(html.includes(escapeHtml(b)), '缺块 [' + g + '] ' + b.slice(0, 24));
        }
      }
      // ⑤ 页面功能门：内联脚本必须能解析，且带 data-t 的按钮必须真的绑上了处理
      //    （#817 收口现场踩过三次同类：畸形标签让复选框链路恒空、少一个分号让整段脚本不解析、
      //     整族 18 页渲染了按钮却没写 <script>——三种都是「页看着在、点了没反应」，
      //     而三个判据件与七席评分席都查不出来，故把这条钉死在这里。）
      //    整段脚本是一行拼出来的，没有换行，ASI 不会补分号：`}` 后面直接跟 `var` 就会整段不解析。
      const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
      scripts.forEach((s, i) => {
        assert.doesNotThrow(() => new Function(s), fam.family + ' 内联脚本#' + (i + 1) + ' 解析失败（整段脚本不解析＝页上按钮与勾选全死）');
      });
      const dtBtns = (html.match(/<button\b[^>]*\bdata-t=/gi) || []).length;
      if (dtBtns > 0) {
        const js = scripts.join('\n');
        const withOnclick = (html.match(/<button\b[^>]*\bdata-t=[^>]*\bonclick=/gi) || []).length;
        assert.ok(
          /\[data-t\]/.test(js) || /dataset\.t\b/.test(js) || withOnclick === dtBtns,
          fam.family + ' 有 ' + dtBtns + ' 颗 data-t 按钮却没绑处理函数（点了没反应）',
        );
      }
    });
  }
});
