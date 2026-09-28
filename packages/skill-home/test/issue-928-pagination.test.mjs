// #928 · 分页截断：大数据下两查询默认即 <256KB，大声失败变成功交付。
//
// 真链（隔离家目录）：批量 120 件（ distinct 位置＋ distinct 标签）→
//   home.tag.query 缺省 100/120 截断、q 过滤、非法 limit exit 2；
//   home.location.query 缺省 60/120 截断、q 过滤、非法 limit exit 2。
// 断言：exit 0、delivery.bytes <262144、total 为全量、items 为本页、页含显式未尽说明（不静默丢）。
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

describe('#928 查标签分页', () => {
  it('缺省截断：100/120，落盘 <256KB，页写清未尽', () => {
    const env = runOk('home.tag.query', {}, 'tag default');
    assert.equal(env.data.items.length, 100);
    assert.equal(env.data.total, 120);
    assert.ok(env.delivery.bytes < MAX_BYTES, 'bytes=' + env.delivery.bytes);
    const html = readFileSync(env.delivery.path, 'utf8');
    assert.ok(html.includes('共120个标签，本页前100个'), '缺分页导语');
    assert.ok(html.includes('还有20个没显示'), '缺未尽数');
  });
  it('q 过滤：命中 9 行即全量，不挂未尽', () => {
    const env = runOk('home.tag.query', { q: '压测标00' }, 'tag q');
    assert.equal(env.data.total, 9);
    assert.equal(env.data.items.length, 9);
    assert.ok(!readFileSync(env.delivery.path, 'utf8').includes('没显示'), '小结果不该挂未尽');
  });
  it('limit=5 即 5 行全量 120；非法 limit exit 2', () => {
    const env = runOk('home.tag.query', { limit: 5 }, 'tag limit5');
    assert.equal(env.data.items.length, 5);
    assert.equal(env.data.total, 120);
    const err = runFail('home.tag.query', { limit: 9999 }, 2, 'tag limit9999');
    assert.match(err, /limit 须为 1~300/);
  });
});

describe('#928 查位置分页', () => {
  it('缺省截断：60/120，落盘 <256KB，页写清未尽', () => {
    const env = runOk('home.location.query', {}, 'loc default');
    assert.equal(env.data.total, 120);
    assert.equal(env.data.items.length, 60);
    assert.ok(env.delivery.bytes < MAX_BYTES, 'bytes=' + env.delivery.bytes);
    const html = readFileSync(env.delivery.path, 'utf8');
    assert.ok(html.includes('共120个位置，本页只看前60个'), '缺分页导语');
    assert.ok(html.includes('还有60个没显示'), '缺未尽数');
  });
  it('q 过滤：命中即全量，不挂未尽', () => {
    const env = runOk('home.location.query', { q: '压测位/点00' }, 'loc q');
    assert.equal(env.data.total, 9);
    assert.equal(env.data.items.length, 9);
    assert.ok(!readFileSync(env.delivery.path, 'utf8').includes('没显示'), '小结果不该挂未尽');
  });
  it('非法 limit exit 2', () => {
    const err = runFail('home.location.query', { limit: 9999 }, 2, 'loc limit9999');
    assert.match(err, /limit 须为 1~80/);
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
  it('同大信封紧凑更小；分页真页复制区已换紧凑', () => {
    const env = bigEnv();
    const stdBytes = Buffer.byteLength(R.homeCopyArea({ data: { envelope: env } }), 'utf8');
    const cmpBytes = Buffer.byteLength(R.homeCompactCopyArea({ data: { envelope: env } }), 'utf8');
    assert.ok(cmpBytes < stdBytes, 'compact ' + cmpBytes + ' 应小于 standard ' + stdBytes);
    const loc = runOk('home.location.query', {}, 'compact 真页');
    const html = readFileSync(loc.delivery.path, 'utf8');
    assert.ok(html.includes('id="' + C.HMCP_PAYLOAD_ID + '"'), '位置页复制区未换紧凑');
    assert.ok(loc.delivery.bytes < MAX_BYTES, 'bytes=' + loc.delivery.bytes);
  });
});
