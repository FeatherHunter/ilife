/** 票 #803 · 三件判据脚本的门禁测试（骨架自证：判据真在查，且改坏必红）。
 *
 * 全部用临时目录里的最小夹具自包含跑，不依赖 `.scratch` 与 dist：
 * - 分隔符：干净页 exit 0（但节点命中＞0：`.cmd` 行的命令键是 R7 真命中）／
 *   版式位塞 `·` 即 exit 1 并点名；
 * - 结构块：齐全 exit 0 ／ 摘掉 `h1` 即 exit 1 并点名到（文件＋块）；
 * - 双端：干净页 exit 0 ／ 定宽 1200px＋20px 按钮即 exit 1 且读数里有 `overflow+` 与
 *   `touch<`。本机无 Chrome／Edge 时该组跳过（判据件本身缺浏览器 exit 2，不静默变绿）。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPTS = join(HERE, '..', 'scripts');
const SEP = join(SCRIPTS, 'audit-separators.mjs');
const RESP = join(SCRIPTS, 'audit-responsive.mjs');
const BLOCKS = join(SCRIPTS, 'audit-page-blocks.mjs');
const CONTRACT = join(SCRIPTS, 'page-blocks.json');
const APPENDIX = join(HERE, '..', '..', '..', 'docs', 'skills', 'skill-home', 'scene-pages-contract.appendix.json');

function run(script, args) {
  const r = spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });
  return { status: r.status, out: String(r.stdout || '') + String(r.stderr || '') };
}

const CLEAN = '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8">'
  + '<title>查物品</title><style>.page{max-width:720px}</style></head>'
  + '<body><div class="page"><h1>查物品</h1>'
  + '<p class="cmd">home-cmd-read home.item.search</p>'
  + '<div class="content">客厅/冰箱</div></div></body></html>';
const DEBT_SEP = CLEAN.replace('</h1>', '</h1><p><span class="badge">在家 · 备用</span></p>');
const DEBT_RESP = CLEAN.replace('</h1>',
  '</h1><div style="width:1200px">定宽一千二百像素的行</div><button style="height:20px">小按钮</button>');
/** 双端夹具必须带 viewport（否则移动档按缺省 980 排，名义 390 量到的是 980 版面；
 *  补 viewport 是票 2 契约的事，夹具里先按未来页面的样子给）。 */
const withViewport = (html) => html.replace('<meta charset="utf-8">',
  '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">');
const BAD_BLOCKS = CLEAN.replace(/<h1>[\s\S]*?<\/h1>/, '');

function seed(files) {
  const d = mkdtempSync(join(tmpdir(), 'home-audit-'));
  for (const [name, html] of Object.entries(files)) writeFileSync(join(d, name), html, 'utf8');
  return d;
}

function hasBrowser() {
  const cands = [process.env.DSH_BROWSER,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome', '/usr/bin/chromium',
  ].filter((p) => typeof p === 'string' && p.length > 0);
  return cands.some((p) => existsSync(p));
}

describe('判据件 audit-separators（文案与分隔符）', () => {
  it('干净页 exit 0，但节点命中＞0（.cmd 行是 R7 真命中，不是假绿）', () => {
    const d = seed({ 'clean.html': CLEAN });
    const r = run(SEP, ['--dir', d, '--quiet']);
    assert.equal(r.status, 0, r.out);
    assert.match(r.out, /RESULT: 1\/1/);
    assert.match(r.out, /标识符[1-9]/);
  });
  it('版式位塞一处 · 即 exit 1 并点名文件', () => {
    const d = seed({ 'clean.html': CLEAN, 'debt.html': DEBT_SEP });
    const r = run(SEP, ['--dir', d, '--quiet']);
    assert.equal(r.status, 1, r.out);
    assert.match(r.out, /debt\.html\(1\)/);
    assert.match(r.out, /FAIL/);
  });
  it('用法错 exit 2', () => {
    const r = run(SEP, []);
    assert.equal(r.status, 2, r.out);
  });
});

describe('判据件 audit-page-blocks（结构块）', () => {
  it('块齐 exit 0', () => {
    const d = seed({ 'a.html': CLEAN });
    const r = run(BLOCKS, ['--dir', d, '--blocks', CONTRACT]);
    assert.equal(r.status, 0, r.out);
    assert.match(r.out, /PASS/);
  });
  it('摘掉 h1 即 exit 1 并点名到（文件＋块 id）', () => {
    const d = seed({ 'a.html': CLEAN, 'bad.html': BAD_BLOCKS });
    const r = run(BLOCKS, ['--dir', d, '--blocks', CONTRACT]);
    assert.equal(r.status, 1, r.out);
    assert.match(r.out, /bad\.html/);
    assert.match(r.out, /缺块 \[page-title\]/);
  });
  it('合同读不动 exit 2', () => {
    const d = seed({ 'a.html': CLEAN });
    const r = run(BLOCKS, ['--dir', d, '--blocks', join(d, '没有.json')]);
    assert.equal(r.status, 2, r.out);
  });
});

describe('判据件 audit-responsive（双端与触摸）', { skip: !hasBrowser() }, () => {
  it('干净页 exit 0（逐页读数照打）', () => {
    const d = seed({ 'clean.html': withViewport(CLEAN) });
    const r = run(RESP, ['--dir', d]);
    assert.equal(r.status, 0, r.out);
    assert.match(r.out, /RESULT: 1\/1/);
    assert.match(r.out, /溢出/);
  });
  it('定宽块＋小按钮即 exit 1，读数点名 overflow 与 touch', () => {
    const d = seed({ 'clean.html': withViewport(CLEAN), 'debt.html': withViewport(DEBT_RESP) });
    const r = run(RESP, ['--dir', d]);
    assert.equal(r.status, 1, r.out);
    assert.match(r.out, /overflow\+/);
    assert.match(r.out, /touch</);
  });
});

describe('结构合同 pages[]（领域半段：附录 46 族派生）', () => {
  const GROUP_ORDER = ['fields', 'operations', 'empty', 'status'];
  function loadBoth() {
    const appendix = JSON.parse(readFileSync(APPENDIX, 'utf8'));
    const contract = JSON.parse(readFileSync(CONTRACT, 'utf8'));
    return { appendix, contract };
  }
  it('pages[] 与附录逐族对账（46 族，块值原文一致，走散即红）', () => {
    const { appendix, contract } = loadBoth();
    assert.equal(contract.version, 1);
    assert.equal(contract.pages.length, appendix.families.length);
    for (const f of appendix.families) {
      const entry = contract.pages.find((p) => p.family === f.family);
      assert.ok(entry, '合同缺族：' + f.family);
      const ids = appendix.scenarios.filter((s) => s.family === f.family).map((s) => s.id);
      assert.deepEqual(entry.scenarios, ids);
      const want = [];
      for (const g of GROUP_ORDER) want.push(...f.requiredBlocks[g].map((v, i) => ({ id: `${f.family}:${g}:${i}`, value: v })));
      assert.deepEqual(entry.blocks.map((b) => ({ id: b.id, value: b.value })), want);
      assert.ok(entry.blocks.every((b) => b.kind === 'substr'));
    }
  });
  /** 用合同自己的 detail 块拼装配形页：文件名带场景 id 段 `_2-2_` 即命中该族 29 块＋默认 7 块。 */
  function detailGoodHtml() {
    const { contract } = loadBoth();
    const entry = contract.pages.find((p) => p.family === 'detail');
    const lis = entry.blocks.map((b) => `<li>${b.value}</li>`).join('');
    return CLEAN.replace('</div></body>', `<ul>${lis}</ul></div></body>`);
  }
  it('场景页齐全 exit 0（36/36），无场景页只走默认 7 块（pattern 不误伤）', () => {
    const d = seed({ '看物品_2-2_20260921T000000.html': detailGoodHtml(), '通用页.html': CLEAN });
    const r = run(BLOCKS, ['--dir', d, '--blocks', CONTRACT]);
    assert.equal(r.status, 0, r.out);
    assert.match(r.out, /RESULT: 2\/2/);
    assert.match(r.out, /36\/36/);
    assert.match(r.out, /7\/7/);
  });
  it('摘掉一处必需块即 exit 1 并点名到（文件＋块 id）', () => {
    // 取 fields:0（值短且不被其它块包含，见注释：若附录增删致此假设失效，本例会红，届时换块）
    const { contract } = loadBoth();
    const entry = contract.pages.find((p) => p.family === 'detail');
    const victim = entry.blocks.find((b) => b.id === 'detail:fields:0');
    const bad = detailGoodHtml().split(victim.value).join('【已摘除】');
    assert.ok(!bad.includes(victim.value));
    const d = seed({ '看物品_2-2_20260921T000001.html': bad });
    const r = run(BLOCKS, ['--dir', d, '--blocks', CONTRACT]);
    assert.equal(r.status, 1, r.out);
    assert.match(r.out, /看物品_2-2_20260921T000001\.html/);
    assert.match(r.out, /缺块 \[detail:fields:0\]/);
  });
});
