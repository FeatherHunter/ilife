// #816 · 开始使用域 4 条真页面的域验收（只跑自己这份，全量留给收口票）。
//
// 断四件事（每族 đều 真命令链）：
// ① 真链 exit 0 且 envelope 的 key／shape 对（导入恢复走预告＋确认两步）；
// ② 两层解析＋产物命名现场复核（契约 L1／命名函数，不猜）；
// ③ 页模块装配：三方对账（页模块／登记表／附录）＋四组 data-block＋每块原文在位＋壳标记无残留；
// ④ 默认落盘回执：delivery.path 存在且文件名通式 `<命令中文名>_<场景 id>_<戳>.html`。
//
// 前提：`node node_modules/typescript/bin/tsc -b packages/skill-home`。
// 隔离：家目录指临时目录（照 scaffold.test.mjs），不碰生产库。
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, existsSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, basename } from 'node:path';
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
let BACKUP_ZIP = '';

before(() => {
  assert.ok(existsSync(bin), 'dist 未建：先跑 node node_modules/typescript/bin/tsc -b packages/skill-home');
  HOME = mkdtempSync(join(tmpdir(), 'setup816-'));
  runOk('home.stats.overview', {}, 'seed overview');
  const cats = runOk('home.tag.query', { kind: 'categories' }, 'seed categories').data.items;
  CID = cats.find((c) => String(c.name).startsWith('分类:')).count;
  runOk('home.item.add', { name: '开箱A', category_id: CID, location: '客厅/冰箱' }, 'seed addA');
  runOk('home.item.add', { name: '开箱B', category_id: CID, location: '卧室/衣柜' }, 'seed addB');
  runOk('home.care.write', { kind: 'member', name: '妈妈' }, 'seed member');
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

async function renderOf(domain, family) {
  return (await import(pathToFileURL(join(pkgDir, 'dist', domain, 'pages', family + '.js')).href));
}

async function checkBlocks(t, domain, family, env, sceneId) {
  const fam = appendix.families.find((f) => f.domain === domain && f.family === family);
  assert.ok(fam, '附录缺族 ' + domain + '/' + family);
  const page = await renderOf(domain, family);
  const { blocksFor } = await import(pathToFileURL(join(pkgDir, 'scripts', 'lib', 'page-blocks.mjs')).href);
  const { escapeHtml } = await import(pathToFileURL(join(pkgDir, 'dist', 'render', 'html.js')).href);
  const { resolvePageFamily } = await import(pathToFileURL(join(pkgDir, 'dist', 'render', 'pageFamilies.js')).href);
  const { resolveSceneStem } = await import(pathToFileURL(join(pkgDir, 'dist', 'render', 'sceneNaming.js')).href);
  assert.equal(page.FAMILY, family);
  assert.deepEqual([...page.PAGE_META.scenarios], fam.scenarios);
  assert.deepEqual(page.REQUIRED_BLOCKS, fam.requiredBlocks);
  assert.deepEqual(blocksFor(family).requiredBlocks, fam.requiredBlocks);
  const html = page.renderFamilyPage(env);
  for (const m of ['<!--CONTENT-->', '<!--SHARED-CSS-->', '<!--SHARED-HELPERS-->']) {
    assert.ok(!html.includes(m), family + ' 标记未填充：' + m);
  }
  assert.ok(html.includes('<!DOCTYPE html>') && html.includes('class="page"'));
  for (const g of ['fields', 'operations', 'empty', 'status']) {
    assert.ok(html.includes('data-block="' + g + '"'), family + ' 缺块组：' + g);
    for (const b of fam.requiredBlocks[g]) {
      assert.ok(html.includes(escapeHtml(b)), family + ' 缺块 [' + g + '] ' + String(b).slice(0, 24));
    }
  }
  return html;
}

function checkDelivery(env, stemRe, label) {
  assert.ok(env.delivery && env.delivery.mode === 'file', label + ' 缺默认落盘回执');
  assert.ok(existsSync(env.delivery.path), label + ' 回执路径不存在：' + env.delivery.path);
  assert.match(basename(env.delivery.path), stemRe, label + ' 文件名通式不对：' + basename(env.delivery.path));
}

describe('#816 SM8-1 首次使用：真链＋真页', () => {
  it('init 回执 → 向导页（幂等可重试）', async (t) => {
    const env = runOk('home.care.write', { kind: 'init' }, 'SM8-1 真链');
    assert.equal(env.key, 'home.care.write');
    assert.equal(env.shape, 'receipt');
    assert.match(String(env.data.message), /已初始化/);
    const { resolvePageFamily } = await import(pathToFileURL(join(pkgDir, 'dist', 'render', 'pageFamilies.js')).href);
    assert.equal(resolvePageFamily('home.care.write', { kind: 'init' }), 'first_use_wizard');
    const { resolveSceneStem } = await import(pathToFileURL(join(pkgDir, 'dist', 'render', 'sceneNaming.js')).href);
    assert.equal(resolveSceneStem('home.care.write', { kind: 'init' }), '首次使用_SM8-1');
    await checkBlocks(t, 'setup', 'first_use_wizard', env, 'SM8-1');
    checkDelivery(env, /^首次使用_SM8-1_\d{8}_\d{6}(_\d+)?\.html$/, 'SM8-1');
  });
});

describe('#816 SM8-2 查异常：真链＋真页', () => {
  it('lint 列表 → 健康页（勾选复制修复引导）', async (t) => {
    const env = runOk('home.care.query', { kind: 'lint' }, 'SM8-2 真链');
    assert.equal(env.key, 'home.care.query');
    assert.equal(env.shape, 'list');
    assert.ok(Array.isArray(env.data.items) && env.data.items.length > 0, '种子库应有检查项');
    const { resolvePageFamily } = await import(pathToFileURL(join(pkgDir, 'dist', 'render', 'pageFamilies.js')).href);
    assert.equal(resolvePageFamily('home.care.query', { kind: 'lint' }), 'health_report');
    const { resolveSceneStem } = await import(pathToFileURL(join(pkgDir, 'dist', 'render', 'sceneNaming.js')).href);
    assert.equal(resolveSceneStem('home.care.query', { kind: 'lint' }), '查异常_SM8-2');
    await checkBlocks(t, 'setup', 'health_report', env, 'SM8-2');
    checkDelivery(env, /^查异常_SM8-2_\d{8}_\d{6}(_\d+)?\.html$/, 'SM8-2');
  });
});

describe('#816 SM8-3 备份导出：真链＋真页', () => {
  it('backup 回执 → 回执页（含历史与保留份数）', async (t) => {
    const env = runOk('home.care.write', { kind: 'backup' }, 'SM8-3 真链');
    assert.equal(env.key, 'home.care.write');
    assert.match(String(env.data.message), /已备份/);
    await checkBlocks(t, 'setup', 'backup_receipt', env, 'SM8-3');
    checkDelivery(env, /^备份导出_SM8-3_\d{8}_\d{6}(_\d+)?\.html$/, 'SM8-3');
  });

  it('backup-list 查询 → 同一族历史页（宿主行）', async (t) => {
    const env = runOk('home.care.query', { kind: 'backup-list' }, 'SM8-3 查询真链');
    assert.equal(env.key, 'home.care.query');
    const { resolvePageFamily } = await import(pathToFileURL(join(pkgDir, 'dist', 'render', 'pageFamilies.js')).href);
    assert.equal(resolvePageFamily('home.care.query', { kind: 'backup-list' }), 'backup_receipt');
    const { resolveSceneStem } = await import(pathToFileURL(join(pkgDir, 'dist', 'render', 'sceneNaming.js')).href);
    assert.equal(resolveSceneStem('home.care.query', { kind: 'backup-list' }), '备份导出_SM8-3');
    await checkBlocks(t, 'setup', 'backup_receipt', env, 'SM8-3');
  });
});

describe('#816 SM8-4 导入恢复：真链两步＋真页', () => {
  it('预告 → 确认 → 导入页（恢复前自备份）', async (t) => {
    const prev = runOk('home.care.write', { kind: 'import-preview', file: BACKUP_ZIP }, 'SM8-4 预告');
    assert.match(String(prev.data.message), /预告通过/);
    await checkBlocks(t, 'setup', 'import_restore', prev, 'SM8-4');
    const env = runOk('home.care.write', { kind: 'import', file: BACKUP_ZIP, confirm: true }, 'SM8-4 确认');
    assert.match(String(env.data.message), /已从备份恢复/);
    const { resolvePageFamily } = await import(pathToFileURL(join(pkgDir, 'dist', 'render', 'pageFamilies.js')).href);
    assert.equal(resolvePageFamily('home.care.write', { kind: 'import' }), 'import_restore');
    const { resolveSceneStem } = await import(pathToFileURL(join(pkgDir, 'dist', 'render', 'sceneNaming.js')).href);
    assert.equal(resolveSceneStem('home.care.write', { kind: 'import' }), '导入恢复_SM8-4');
    await checkBlocks(t, 'setup', 'import_restore', env, 'SM8-4');
    checkDelivery(env, /^导入恢复_SM8-4_\d{8}_\d{6}(_\d+)?\.html$/, 'SM8-4');
  });
});
