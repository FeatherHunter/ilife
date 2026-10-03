// t418 查询视觉锁：桌面表与内容列同宽（共享样式，仍服务还有数据表的域）＋ 查询列表／详情走票据纸。
// #1071 起查询域重建为票据纸（12 个场景页）：列表页不再出数据表、详情页不再出字段表与 kv 列表，
// 故「列表仍一张表」「详情包 kv 壳」这两条断的是票据纸之前那版的 DOM——已按新产物改断。
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
  it('列表页走票据纸壳：一张纸 ＋ 一枚明细卡，不再出数据表', () => {
    const text = page('bill.record.search', { q: 't418午饭' }, 't418-list');
    assert.equal(text.split('<section class="ilife-block-sheet is-ticket">').length - 1, 1, '整页恰一张票据纸');
    assert.equal(text.split('<table class="ilife-block-data-table-table">').length - 1, 0, '票据纸列表不再出数据表');
    assert.equal(text.split('<ol class="ilife-ticket-entries">').length - 1, 1, '明细卡一枚');
  });
});

describe('t418 P2 · 详情移动键值列表（与字段表同源，只转形状）', () => {
  it('详情页：落点键值行六行 ＋ 明细卡，值逐字来自数据源', () => {
    const id = JSON.parse(run(['bill.record.search', '--params', P({ q: 't418午饭' })]).stdout).data.items[0].id;
    assert.ok(typeof id === 'number' && id > 0, '应取到 id');
    const file = join(OUT, 't418-detail.html');
    const r = run(['bill.record.detail', '--params', P({ id }), '--html', file]);
    assert.equal(r.status, 0, '详情应 exit 0：' + r.stderr);
    const text = readFileSync(file, 'utf8');
    assert.equal(text.split('<div class="ilife-block-ledger-row">').length - 1, 6, '落点键值行六行（编号／账户／账本／币种／创建时间／状态）');
    assert.ok(text.includes('>编号<') && text.includes('>#' + id + '<'), '编号行与数据源一致');
    assert.ok(text.includes('t418午饭'), '备注在明细卡里');
    assert.equal(text.split('<ol class="ilife-ticket-entries">').length - 1, 1, '明细卡一枚');
  });
});
