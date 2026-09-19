// t418 查询视觉整改锁（t403-P1／P2）：桌面表与内容列同宽＋详情移动键值列表。
// 只断言呈现结构，不碰行为与口径；红线：只读临时库，只往临时目录写 --html 产物。
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assembleDocPage } from '../dist/shared/docPage.js';
import { billEnv } from './helpers/config-base.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const bin = join(here, '..', 'dist', 'cli', 'cmd_read.js');
const NODE = [process.env.npm_node_execpath, 'node', process.execPath]
  .filter(Boolean)
  .find((c) => {
    const p = spawnSync(c, ['--version'], { encoding: 'utf8' });
    return p.status === 0 && /^v\d+/.test((p.stdout || '').trim());
  }) ?? process.execPath;

let DB = '';
let OUT = '';
const P = (o) => JSON.stringify(o);
function run(args) {
  return spawnSync(NODE, [bin, ...args], { cwd: here, encoding: 'utf8', env: billEnv(DB) });
}
function page(key, params, name) {
  const file = join(OUT, name + '.html');
  const r = run([key, '--params', P(params), '--html', file]);
  assert.equal(r.status, 0, key + ' ' + P(params) + ' 应 exit 0：' + r.stderr);
  assert.ok(existsSync(file), '产物应落盘：' + file);
  return readFileSync(file, 'utf8');
}

before(() => {
  DB = mkdtempSync(join(tmpdir(), 't418-db-'));
  OUT = mkdtempSync(join(tmpdir(), 't418-html-'));
  assert.equal(run(['bill.record.add', '--params', P({ category: '餐饮/外卖/午餐', amount: -35, time: '2026-09-06 12:00:00', note: 't418午饭', account: '支付宝', ledger: '生活' })]).status, 0);
});

describe('t418 P1 · 桌面端数据表与内容列同宽（只 1200px 以上生效）', () => {
  it('共享样式含表格全宽规则，且仍在 1200 媒体查询里', () => {
    const html = assembleDocPage({ docTitle: 't', title: 't', eyebrow: '', subtitle: '', content: '<p>x</p>' });
    assert.ok(html.includes('.ilife-block-page-shell .ilife-block-data-table { max-width: none; }'), '表格全宽规则不见了');
    const media = html.indexOf('@media (min-width:1200px)');
    assert.ok(media >= 0 && html.indexOf('max-width: none;', media) > media, '全宽规则须在 1200 媒体查询里（手机端不动）');
  });
  it('列表页表格仍是一张（规则只改呈现，不改结构）', () => {
    const text = page('bill.record.search', { q: 't418午饭' }, 't418-list');
    assert.equal(text.split('<table class="ilife-block-data-table-table">').length - 1, 1, '列表页仍一张表');
  });
});

describe('t418 P2 · 详情移动键值列表（与字段表同源，只转形状）', () => {
  it('详情页表格包 kv-table 壳＋键值列表 10 对，且原表 11 行不动', () => {
    const s = page('bill.record.search', { q: 't418午饭' }, 't418-id');
    const id = JSON.parse(run(['bill.record.search', '--params', P({ q: 't418午饭' })]).stdout).data.items[0].id;
    assert.ok(typeof id === 'number' && id > 0, '应取到 id');
    void s;
    const file = join(OUT, 't418-detail.html');
    const r = run(['bill.record.detail', '--params', P({ id }), '--html', file]);
    assert.equal(r.status, 0, '详情应 exit 0：' + r.stderr);
    const text = readFileSync(file, 'utf8');
    assert.ok(text.includes('<div class="ilife-query-kv-table">'), '表格须包 kv-table 壳（移动端藏它）');
    assert.ok(text.includes('<dl class="ilife-query-kv-list">'), '键值列表须在（移动端替表格）');
    assert.equal(text.split('<dt>').length - 1, 10, '键值列表十行（与字段表同数）');
    assert.equal(text.split('<tr>').length - 1, 11, '原表仍表头一行＋字段十行');
    assert.ok(text.includes('<dt>编号</dt><dd>' + id + '</dd>'), '键值对与数据源一致');
    assert.ok(text.includes('<dt>备注</dt><dd>t418午饭</dd>'), '备注键值对一致');
  });
  it('共享样式含 kv 显隐规则（桌面藏列表、640 藏表格）', () => {
    const html = assembleDocPage({ docTitle: 't', title: 't', eyebrow: '', subtitle: '', content: '<p>x</p>' });
    assert.ok(html.includes('.ilife-query-kv-list { display: none; }'), '桌面藏列表规则不见了');
    assert.ok(html.includes('.ilife-query-kv-table { display: none; }'), '640 藏表格规则不见了');
    assert.ok(html.includes('@media (max-width:640px)'), '640 断点不见了');
  });
});
