// #928 · 不设体积上限：位置／标签两页默认即全量，不再截断。
//
// 真链（隔离家目录）：批量 120 件（distinct 位置＋distinct 标签）→
//   home.tag.query 缺省 120/120 全量、q 过滤、limit=5 才截、非法 limit exit 2；
//   home.location.query 缺省 120/120 全量、q 过滤、limit=50 才截、非法 limit exit 2；
//   3000 节点合成信封照印不误（旧的 256KB 门已撤除）。
//
// 前提：`node node_modules/typescript/bin/tsc -b packages/skill-home`。
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homeEnvOf } from '../../../test/helpers/home-test-base.mjs';
import { pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pkgDir = join(here, '..');
const bin = join(pkgDir, 'dist', 'cli', 'cmd_read.js');
const MAX_BYTES = 256 * 1024;

let HOME = '';
const run = (key, params) => spawnSync(process.execPath, [bin, key, '--params', JSON.stringify(params ?? {})], { encoding: 'utf8', env: homeEnvOf(HOME) });
function runOk(key, params, label) {
  const r = run(key, params);
  assert.equal(r.status, 0, label + ' exit=' + r.status + ' ERR=' + String(r.stderr ?? '').slice(0, 300));
  return JSON.parse(String(r.stdout).trim().split('\n').pop());
}
function runFail(key, params, code, label) {
  const r = run(key, params);
  assert.equal(r.status, code, label + ' exit=' + r.status + ' OUT=' + String(r.stdout ?? '').slice(0, 200) + ' ERR=' + String(r.stderr ?? '').slice(0, 200));
  return String(r.stderr ?? '');
}
const pad3 = (n) => String(n).padStart(3, '0');

before(() => {
  assert.ok(existsSync(bin), 'dist 未建：先跑 node node_modules/typescript/bin/tsc -b packages/skill-home');
  HOME = mkdtempSync(join(tmpdir(), 'issue928-'));
  runOk('home.stats.overview', {}, 'init');
  const cats = runOk('home.tag.query', { kind: 'categories' }, 'seed cats').data.items;
  const hit = cats.find((c) => String(c.name).startsWith('分类:'));
  assert.ok(hit, '种子分类不在位');
  const cid = hit.count;
  const items = [];
  for (let i = 1; i <= 120; i++) {
    items.push({ name: '压测物' + pad3(i), category_id: cid, location: '压测位/点' + pad3(i), tags: '压测标' + pad3(i) });
  }
  const receipt = runOk('home.item.add', { op: 'batch', items }, 'batch 120');
  assert.match(receipt.data.message, /120/);
});

describe('#928 查标签：不给 limit 即全量（不设体积上限）', () => {
  it('缺省全量：120 个标签全在页内，不挂未尽', () => {
    const env = runOk('home.tag.query', {}, 'tag default');
    assert.equal(env.data.items.length, 120);
    assert.equal(env.data.total, 120);
    const html = readFileSync(env.delivery.path, 'utf8');
    assert.equal(html.split('<p class="fp-v">').length - 1, 120, '缺省应印全量行');
    assert.ok(!html.includes('没显示'), '全量就不该挂未尽');
  });
  it('q 过滤：命中 9 行即全量，不挂未尽', () => {
    const env = runOk('home.tag.query', { q: '压测标00' }, 'tag q');
    assert.equal(env.data.total, 9);
    assert.equal(env.data.items.length, 9);
    assert.ok(!readFileSync(env.delivery.path, 'utf8').includes('没显示'), '小结果不该挂未尽');
  });
  it('limit=5 才截：5 行＋写明还有 115；非法 limit exit 2', () => {
    const env = runOk('home.tag.query', { limit: 5 }, 'tag limit5');
    assert.equal(env.data.items.length, 5);
    assert.equal(env.data.total, 120);
    const html = readFileSync(env.delivery.path, 'utf8');
    assert.ok(html.includes('按 limit 只印前5个'), '缺 limit 说明');
    assert.ok(html.includes('还有115个没显示'), '缺未尽数');
    const err = runFail('home.tag.query', { limit: 99999999 }, 2, 'tag limit 越界');
    assert.match(err, /limit 须为 1~100000/);
  });
});

describe('#928 查位置：不给 limit 即全量（不设体积上限）', () => {
  it('缺省全量：120 个位置全在页内，不挂「没显示」', () => {
    const env = runOk('home.location.query', {}, 'loc default');
    assert.equal(env.data.total, 120);
    assert.equal(env.data.items.length, 120);
    const html = readFileSync(env.delivery.path, 'utf8');
    assert.equal(html.split('class="trow"').length - 1, 120, '缺省应印全量行');
    assert.ok(!html.includes('没显示'), '全量就不该挂未尽');
  });
  it('limit=50 才截：50 行＋写明还有 70', () => {
    const env = runOk('home.location.query', { limit: 50 }, 'loc limit50');
    assert.equal(env.data.items.length, 50);
    assert.equal(env.data.total, 120);
    const html = readFileSync(env.delivery.path, 'utf8');
    assert.ok(html.includes('本页按 limit 只印前50个'), '缺 limit 说明');
    assert.ok(html.includes('还有70个没显示'), '缺未尽数');
  });
  it('q 过滤：命中即全量，不挂未尽', () => {
    const env = runOk('home.location.query', { q: '压测位/点00' }, 'loc q');
    assert.equal(env.data.total, 9);
    assert.equal(env.data.items.length, 9);
    assert.ok(!readFileSync(env.delivery.path, 'utf8').includes('没显示'), '小结果不该挂未尽');
  });
  it('非法 limit exit 2', () => {
    const err = runFail('home.location.query', { limit: 99999999 }, 2, 'loc limit 越界');
    assert.match(err, /limit 须为 1~100000/);
  });
  it('改名/删除按钮走 data-copy-kind：路径一行只写一次，提示词点击时现拼', () => {
    const env = runOk('home.location.query', { limit: 3 }, 'loc kind');
    const html = readFileSync(env.delivery.path, 'utf8');
    assert.ok(html.includes('data-copy-kind="rename"') && html.includes('data-copy-kind="delete"'), '缺 kind 标记');
    // 提示词只在页内脚本里现拼（表单预览那处是既有脚本），行属性里一个都不许有。
    assert.equal(html.split('data-copy="请加载「居家管家」技能，帮我改名位置').length - 1, 0, '行属性不该印改名提示词');
    assert.equal(html.split('data-copy="请加载「居家管家」技能，帮我删除位置').length - 1, 0, '行属性不该印删除提示词');
    assert.ok(html.includes("k.getAttribute('data-copy-kind')==='rename'"), '页内脚本未接 kind 分支');
  });
  it('不设体积上限：3000 个位置照印不误，一行不少、不抛', async () => {
    const R = await import(pathToFileURL(join(pkgDir, 'dist', 'render', 'index.js')).href);
    const mod = await import(pathToFileURL(join(pkgDir, 'dist', 'space', 'pages', 'location_manage.js')).href);
    const nodes = Array.from({ length: 3000 }, (_, i) => ({
      kind: 'location_node', path: '压测长路径层/子层' + String(i).padStart(4, '0') + '/再一层/最末层',
      name: '最末层' + String(i).padStart(4, '0'), depth: 4, count: 3, empty: false,
    }));
    const env = R.buildHomeEnvelope('home.location.query', { items: nodes, total: 3000 });
    const html = mod.renderFamilyPage(env);
    assert.equal(html.split('class="trow"').length - 1, 3000, '一行都不许少');
    assert.ok(!html.includes('没显示'), '没给 limit 就不该有未尽说明');
    assert.ok(R.estimateBytes(html) > 256 * 1024, '这一页本就该超过旧的 256KB 门（它已撤除）');
  });
});

describe('#928 紧凑复制区（一份 JSON 点取，不走三份 data-t）', () => {
  let R = null;
  let C = null;
  before(async () => {
    R = await import(pathToFileURL(join(pkgDir, 'dist', 'render', 'index.js')).href);
    C = await import(pathToFileURL(join(pkgDir, 'dist', 'render', 'copyArea.js')).href);
  });
  // 300 行合成信封（无库，直构；引号专测转义：标准块 data-t 必出 &quot;，紧凑块须无）。
  const bigEnv = () => R.buildHomeEnvelope('home.tag.query', {
    items: Array.from({ length: 300 }, (_, i) => ({ name: 't"' + i, count: i })),
    total: 300,
  });
  const unesc = (s) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  const payloadOf = (html) => {
    const m = html.match(new RegExp('<script type="application/json" id="' + C.HMCP_PAYLOAD_ID + '">(.*?)</script>'));
    assert.ok(m, '紧凑载荷 script 不在位');
    return JSON.parse(m[1]);
  };
  it('类名/菜单键/aria 与标准块一致（公共层改名即红）', () => {
    const env = bigEnv();
    const std = R.homeCopyArea({ data: { envelope: env } });
    const cmp = R.homeCompactCopyArea({ data: { envelope: env } });
    for (const t of ['ilife-block-copy-block', 'ilife-action-bar', 'ilife-action-row', 'ilife-action-row-ghost',
      'ilife-copy-menu-wrap', 'ilife-copy-btn', 'ilife-copy-btn-ghost', 'ilife-copy-menu',
      'ilife-copy-menu-item', 'ilife-copy-menu-label']) {
      assert.ok(std.includes(t), '标准块缺类 ' + t);
      assert.ok(cmp.includes(t), '紧凑块缺类 ' + t);
    }
    for (const k of ['data-fmt="text"', 'data-fmt="json"', 'data-fmt="csv"']) {
      assert.ok(std.includes(k) && cmp.includes(k), '菜单键缺 ' + k);
    }
    assert.ok(cmp.includes('aria-label="复制数据（点开选格式）"'), '开合 aria 走散');
    assert.ok(!cmp.includes('data-t='), '紧凑块不许带 data-t 载荷');
  });
  it('载荷 round-trip：三格式与标准块解码后逐字一致', () => {
    const env = bigEnv();
    const std = R.homeCopyArea({ data: { envelope: env } });
    assert.ok(std.includes('&quot;'), '引号用例未起效（标准块应有转义）');
    const p = payloadOf(R.homeCompactCopyArea({ data: { envelope: env } }));
    assert.deepEqual(Object.keys(p).sort(), ['csv', 'json', 'text']);
    // 标准块三个 data-t 按菜单序即 text/json/csv：解码后须与载荷逐字同。
    const stdTexts = [...std.matchAll(/data-fmt="(?:text|json|csv)" data-t="([\s\S]*?)"><span/g)].map((m) => unesc(m[1]));
    assert.equal(stdTexts.length, 3, '标准块三项 data-t 不全');
    assert.equal(p.text, stdTexts[0]);
    assert.equal(p.json, stdTexts[1]);
    assert.equal(p.csv, stdTexts[2]);
    assert.ok(p.json.includes('"t\\"0"'), '引号应以 JSON 原样在载荷里，不走 &quot;');
  });
  it('同大信封紧凑更小；位置页复制区已换紧凑', () => {
    const env = bigEnv();
    const stdBytes = Buffer.byteLength(R.homeCopyArea({ data: { envelope: env } }), 'utf8');
    const cmpBytes = Buffer.byteLength(R.homeCompactCopyArea({ data: { envelope: env } }), 'utf8');
    assert.ok(cmpBytes < stdBytes, 'compact ' + cmpBytes + ' 应小于 standard ' + stdBytes);
    const loc = runOk('home.location.query', {}, 'compact 真页');
    const html = readFileSync(loc.delivery.path, 'utf8');
    assert.ok(html.includes('id="' + C.HMCP_PAYLOAD_ID + '"'), '位置页复制区未换紧凑');
  });
  it('页内脚本可编译（字符串拼 JS 必须锁语法）', async () => {
    const vm = await import('node:vm');
    const env = bigEnv();
    const html = R.homeCompactCopyArea({ data: { envelope: env } });
    const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    assert.ok(scripts.length > 0, '内联脚本不在位');
    for (const s of scripts) new vm.Script(s);
    // 位置页整页的两段页内脚本（复制取值＋改名/删除现拼）也要能编译。
    const loc = runOk('home.location.query', { limit: 3 }, 'script 真页');
    const page = readFileSync(loc.delivery.path, 'utf8');
    for (const s of [...page.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1])) new vm.Script(s);
  });
});
