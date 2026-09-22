#!/usr/bin/env node
/** #884 批量几何门的静态面测试（无浏览器可跑）。
 *
 * 为什么测静态面：名单核对（缺页／多页／缺表／多表／漂移）是结构事实，不开浏览器；
 * 浏览器对位仍由既有门负责（#879 已实证），批量件只汇总它的退出码与机器输出。
 * 判据恒绿是最坏的失效（私厨 22 页零表全绿实测），所以每个反例都是**正控** ——
 * 判据必须真能红，红必须点名（#879 测试件头同一条硬话）。
 * 浏览器真跑（正例／变异／回归）见本票验收证据，不入单元测试。
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { describe, it } from 'node:test';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BATCH = join(dirname(fileURLToPath(import.meta.url)), '..', 'scripts', 'check-two-col-batch.mjs');

/** 最小真页：类名与 `renderDataTable` 同源（caption 可无，列档走 `cell-<align>`）。 */
const page = (tables) => '<!doctype html><html><head><meta charset="utf-8"></head><body>'
  + tables.map((t) => '<div class="ilife-block ilife-block-data-table">'
    + '<table class="ilife-block-data-table-table">'
    + (t.caption ? '<caption class="ilife-block-data-table-caption">' + t.caption + '</caption>' : '')
    + '<thead><tr>' + t.cols.map((c) => '<th scope="col" class="ilife-block-data-table-cell-'
    + c.align + '">' + c.label + '</th>').join('') + '</tr></thead>'
    + '<tbody><tr>' + t.cols.map((c) => '<td class="ilife-block-data-table-cell-'
    + c.align + '" data-label="' + c.label + '">v</td>').join('') + '</tr></tbody>'
    + '</table></div>').join('') + '</body></html>';

const TWO_COL = [{ label: '待办', align: 'left' }, { label: '怎么做', align: 'left' }];

function freshDir(files) {
  const dir = mkdtempSync(join(tmpdir(), 't884-'));
  for (const [name, html] of Object.entries(files)) writeFileSync(join(dir, name), html, 'utf8');
  return dir;
}
function run(args) {
  const r = spawnSync(process.execPath, [BATCH, ...args], { encoding: 'utf8', timeout: 60000 });
  return { exit: r.status, out: String(r.stdout ?? '') + String(r.stderr ?? '') };
}
const FULL = {
  '有表页.html': page([{ caption: '对照', cols: TWO_COL }]),
  '无表页.html': page([]),
};

describe('#884 批量几何门：名单核对（静态，无浏览器）', () => {
  it('① 正例：名单相符 → exit 0 且逐页逐表上报（含零表页，不跳过）', () => {
    const dir = freshDir(FULL);
    const mpath = join(dir, 'roster.json');
    assert.equal(run(['--write-manifest', mpath, '--dir', dir]).exit, 0);
    const manifest = JSON.parse(readFileSync(mpath, 'utf8'));
    const label = Object.keys(manifest.batches)[0];
    assert.equal(manifest.batches[label].pages['有表页.html'].tables[0].id, '对照');
    const r = run(['--manifest', mpath, '--no-browser']);
    assert.equal(r.exit, 0, r.out);
    assert.match(r.out, /批量全绿/, r.out);
    assert.match(r.out, /有表页\.html 表1「对照」/, r.out);
    assert.match(r.out, /无表页\.html 无表/, r.out);
  });

  it('② 正控：删一表 → exit 1 且点名缺表', () => {
    const dir = freshDir(FULL);
    const mpath = join(dir, 'roster.json');
    assert.equal(run(['--write-manifest', mpath, '--dir', dir]).exit, 0);
    writeFileSync(join(dir, '有表页.html'), page([]), 'utf8');
    const r = run(['--manifest', mpath, '--no-browser']);
    assert.equal(r.exit, 1, r.out);
    assert.match(r.out, /缺表「对照」/, r.out);
  });

  it('③ 正控：加一表 → exit 1 且点名多表', () => {
    const dir = freshDir(FULL);
    const mpath = join(dir, 'roster.json');
    assert.equal(run(['--write-manifest', mpath, '--dir', dir]).exit, 0);
    writeFileSync(join(dir, '有表页.html'),
      page([{ caption: '对照', cols: TWO_COL }, { caption: '新增', cols: TWO_COL }]), 'utf8');
    const r = run(['--manifest', mpath, '--no-browser']);
    assert.equal(r.exit, 1, r.out);
    assert.match(r.out, /多表「新增」/, r.out);
  });

  it('④ 正控：改一列对齐档 → exit 1 且点名漂移', () => {
    const dir = freshDir(FULL);
    const mpath = join(dir, 'roster.json');
    assert.equal(run(['--write-manifest', mpath, '--dir', dir]).exit, 0);
    writeFileSync(join(dir, '有表页.html'),
      page([{ caption: '对照', cols: [{ label: '待办', align: 'left' }, { label: '怎么做', align: 'right' }] }]), 'utf8');
    const r = run(['--manifest', mpath, '--no-browser']);
    assert.equal(r.exit, 1, r.out);
    assert.match(r.out, /表「对照」漂移/, r.out);
  });

  it('⑤ 正控：多一页 → exit 1 且点名多页', () => {
    const dir = freshDir(FULL);
    const mpath = join(dir, 'roster.json');
    assert.equal(run(['--write-manifest', mpath, '--dir', dir]).exit, 0);
    writeFileSync(join(dir, '多出来.html'), page([]), 'utf8');
    const r = run(['--manifest', mpath, '--no-browser']);
    assert.equal(r.exit, 1, r.out);
    assert.match(r.out, /多出来\.html.*多页/, r.out);
  });

  it('⑤b 正控：缺一页 → exit 1 且点名缺页', () => {
    const dir = freshDir(FULL);
    const mpath = join(dir, 'roster.json');
    assert.equal(run(['--write-manifest', mpath, '--dir', dir]).exit, 0);
    rmSync(join(dir, '无表页.html'));
    const r = run(['--manifest', mpath, '--no-browser']);
    assert.equal(r.exit, 1, r.out);
    assert.match(r.out, /无表页\.html.*缺页/, r.out);
  });

  it('⑥ round-trip：合法变更后重冻名单 → 回绿', () => {
    const dir = freshDir(FULL);
    const mpath = join(dir, 'roster.json');
    assert.equal(run(['--write-manifest', mpath, '--dir', dir]).exit, 0);
    writeFileSync(join(dir, '有表页.html'),
      page([{ caption: '对照', cols: TWO_COL }, { caption: '新增', cols: TWO_COL }]), 'utf8');
    assert.equal(run(['--manifest', mpath, '--no-browser']).exit, 1);
    assert.equal(run(['--write-manifest', mpath, '--dir', dir]).exit, 0);
    const r = run(['--manifest', mpath, '--no-browser']);
    assert.equal(r.exit, 0, r.out);
  });

  it('⑦ exit 2：名单不存在／写名单目录不存在（零参数回退默认名单，不在此断）', () => {
    const dir = freshDir(FULL);
    assert.equal(run(['--manifest', join(dir, '没有.json'), '--no-browser']).exit, 2);
    assert.equal(run(['--write-manifest', join(dir, 'r.json'), '--dir', join(dir, '没有')]).exit, 2);
  });
});
