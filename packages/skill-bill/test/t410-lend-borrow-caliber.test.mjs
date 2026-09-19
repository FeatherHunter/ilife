// t410 第一刀护栏：scene-lend／scene-borrow 口径句对称去内部话。
// 待裁定 4 已裁：“借贷走标签流转”与记借入同句，只改一半拆散对称，且属同类内部话。
// 两件同改 `标签流转：…`，借出／借入各自 specifics 不动；只断言呈现，不碰行为。
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { billEnv } from './helpers/config-base.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const bin = join(here, '..', 'dist', 'cli', 'cmd_read.js');

let DB = '';
let HTML = '';
before(() => {
  DB = mkdtempSync(join(tmpdir(), 't410caliber-db-'));
  HTML = mkdtempSync(join(tmpdir(), 't410caliber-html-'));
});

function collectHtml(params, name) {
  const file = join(HTML, name);
  const r = spawnSync(process.execPath, [bin, 'bill.record.add', '--params', JSON.stringify(params), '--html', file],
    { encoding: 'utf8', env: billEnv(DB) });
  assert.equal(r.status, 0, name + ' CLI exit 非 0：' + (r.stderr || '').slice(-300));
  return readFileSync(file, 'utf8');
}

describe('t410 第一刀 · 借贷口径句对称去内部话', () => {
  it('记借出采集页用新口径句，旧串消失', () => {
    const html = collectHtml({ kind: 'lend' }, 'lend-collect.html');
    assert.ok(html.includes('标签流转：这一笔写「#借出 #借给（对象） #未还」'), '新口径句须上屏');
    assert.ok(!html.includes('借贷走标签流转'), '旧串须消失');
  });
  it('记借入采集页用新口径句，旧串消失（与借出对称）', () => {
    const html = collectHtml({ kind: 'borrow' }, 'borrow-collect.html');
    assert.ok(html.includes('标签流转：这一笔写「#借入 #向（对象）借 #未还」'), '新口径句须上屏');
    assert.ok(!html.includes('借贷走标签流转'), '旧串须消失');
  });
});
