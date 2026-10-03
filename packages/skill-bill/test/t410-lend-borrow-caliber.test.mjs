// t410 第一刀护栏：scene-lend／scene-borrow 采集页按判地三段（**D1＝B 终裁，负责人 2026-10-04**）。
// 判据链：`proto/say-collect/x15-记借出-采集-v2.3.html`／`x17-记借入-采集-v2.3.html` 是 #1078 那 24 格里
// verdict＝satisfied 的两格（判地已由负责人批准）；产物 vs 判地逐像素 ＝ 0（390×844，0／411450，页高 1055）；
// 判地那页只有「还缺什么／已替你填好的／下一步怎么说」三段、**没有**老页那条口径行。
// ⇒ 断言按判地改到新页：三段与本场景 specifics 须上屏；`标签流转`（口径行新串）与
// `借贷走标签流转`（旧串）都不许上屏。口径行声明仍在 `scene-lend.ts:60`／`scene-borrow.ts:61`
// （信息没丢，只是采集页不再出那一行块位）。只断言呈现，不碰行为。
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

describe('t410 第一刀 · 借贷采集页按判地三段（口径行不在新页）', () => {
  it('记借出采集页：判地三段都在，口径行新旧串都不上屏', () => {
    const html = collectHtml({ kind: 'lend' }, 'lend-collect.html');
    for (const seg of ['还缺什么', '已替你填好的', '下一步怎么说']) {
      assert.ok(html.includes(seg), '判地三段之一须上屏：' + seg);
    }
    assert.ok(html.includes('借给谁'), '本场景 specifics 须上屏：借给谁');
    assert.ok(!html.includes('标签流转'), '判地那页没有口径行 ⇒ 口径行新串不许上屏');
    assert.ok(!html.includes('借贷走标签流转'), '旧串须消失');
  });
  it('记借入采集页：与借出对称（判地三段 ＋ 向谁借）', () => {
    const html = collectHtml({ kind: 'borrow' }, 'borrow-collect.html');
    for (const seg of ['还缺什么', '已替你填好的', '下一步怎么说']) {
      assert.ok(html.includes(seg), '判地三段之一须上屏：' + seg);
    }
    assert.ok(html.includes('向谁借'), '本场景 specifics 须上屏：向谁借');
    assert.ok(!html.includes('标签流转'), '判地那页没有口径行 ⇒ 口径行新串不许上屏');
    assert.ok(!html.includes('借贷走标签流转'), '旧串须消失');
  });
});
