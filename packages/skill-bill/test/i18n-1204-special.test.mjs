// #1204 特殊收支五件（write/scene-{borrow,lend,refund,reimburse-done,repay}.ts）：词条层＋语言链的接线证明。
//
// 口径 honesty（先写清楚再断言）：这五型的在线采集页走 SAY 原型（\`sayWords.ts\`，16 份数据），
// 场景件里的 fields／cards／prompt／chips／flow.* 是 dormant 回落支（与记分期 receipt.* 同性质）——
// 页面里 \`<div class="say-page">\` 就是证据。故「en 整页无中文」在本票做不到（槽位标签来自 SAY 数据表），
// 本文件只钉三件真能断言的：262 条词条可求值、五件工厂按语言取词、sceneFor 的 zh 身份／en 现算分支；
// 另外用 CLI 取两条页文件，证明渲染期语言上下文确实传到 deferred 闭包（SAY 自己的运行期文案中英各一）。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { recordCollectDoc } from '../dist/write/collect.js';
import { SCENES, sceneFor } from '../dist/write/scene.js';
import { sceneBorrow } from '../dist/write/scene-borrow.js';
import { sceneLend } from '../dist/write/scene-lend.js';
import { sceneRefund } from '../dist/write/scene-refund.js';
import { sceneReimburseDone } from '../dist/write/scene-reimburse-done.js';
import { sceneRepay } from '../dist/write/scene-repay.js';
import { resolve } from '../../base-entries/dist/index.js';
import { SKILL_BILL_CATALOG } from '../dist/entries/index.js';
import { billEnv } from './helpers/config-base.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const bin = join(here, '..', 'dist', 'cli', 'cmd_read.js');

/** 本票五件的 kind 与词条条数（迁移器读数：262＝54＋54＋51＋51＋52）。 */
const FILES = [
  { kind: 'borrow', prefix: 'skill-bill.write-scene-borrow.', count: 54, zhFamily: '特殊收支族', enFamily: 'Special income and expense' },
  { kind: 'lend', prefix: 'skill-bill.write-scene-lend.', count: 54, zhFamily: '特殊收支族', enFamily: 'Special income and expense' },
  { kind: 'refund', prefix: 'skill-bill.write-scene-refund.', count: 51, zhFamily: '特殊收支族', enFamily: 'Special income and expense' },
  { kind: 'reimburse-done', prefix: 'skill-bill.write-scene-reimburse-done.', count: 51, zhFamily: '特殊收支族', enFamily: 'Special income and expense' },
  { kind: 'repay', prefix: 'skill-bill.write-scene-repay.', count: 52, zhFamily: '特殊收支族', enFamily: 'Special income and expense' },
];

const FACTORIES = {
  borrow: sceneBorrow,
  lend: sceneLend,
  refund: sceneRefund,
  'reimburse-done': sceneReimburseDone,
  repay: sceneRepay,
};

/** 占位符一律给一个非空样例（占位符集合本身由 check-i18n-params 门盯，这里只管「求值不抛、不留 {pN}」）。 */
const SAMPLE = Object.fromEntries(Array.from({ length: 13 }, (_, i) => ['p' + i, '样例' + i]));

function collect(kind, language) {
  return recordCollectDoc({
    key: 'bill.record.add',
    params: { kind },
    slots: [],
    missing: [],
    source: 'test',
    actionAt: '2026-10-20 12:00:00',
    today: '2026-10-20',
    recent: [],
    language,
  });
}

function cli(db, args) {
  return spawnSync(process.execPath, [bin, ...args], { cwd: here, encoding: 'utf8', env: billEnv(db) });
}

describe('#1204 特殊收支五件：词条＋语言链', () => {
  it('词条 zh／en 同 key（4115 条＝各迁移票合入后总键数；#1316 补 help-lookupPage.c022 ＋1，逐票增量见 tooling/i18n-ticket-scope.json）且英文列无空串', () => {
    const zhKeys = Object.keys(SKILL_BILL_CATALOG.zh).sort();
    const enKeys = Object.keys(SKILL_BILL_CATALOG.en).sort();
    assert.deepEqual(enKeys, zhKeys);
    assert.equal(zhKeys.length, 4115);
    for (const k of enKeys) assert.ok(SKILL_BILL_CATALOG.en[k].length > 0, '英文缺译：' + k);
  });

  it('五件 262 条逐件落位（条数与迁移器读数一致）', () => {
    let total = 0;
    for (const f of FILES) {
      const mine = Object.keys(SKILL_BILL_CATALOG.zh).filter((k) => k.startsWith(f.prefix));
      assert.equal(mine.length, f.count, f.kind + ' 条数不对');
      total += mine.length;
    }
    assert.equal(total, 262);
  });

  it('五件工厂按语言取词：family 中英各一，源格标签走词条', () => {
    for (const f of FILES) {
      const factory = FACTORIES[f.kind];
      assert.equal(factory('zh').family, f.zhFamily, f.kind + ' 的 zh family 不对');
      assert.equal(factory('en').family, f.enFamily, f.kind + ' 的 en family 不对');
      assert.equal(factory('en').kind, f.kind);
    }
    assert.equal(resolve(SKILL_BILL_CATALOG, 'zh', 'skill-bill.write-scene-borrow.c001'), '向谁借');
    assert.equal(resolve(SKILL_BILL_CATALOG, 'en', 'skill-bill.write-scene-borrow.c001'), 'Borrowed from');
    assert.equal(resolve(SKILL_BILL_CATALOG, 'zh', 'skill-bill.write-scene-refund.c001'), '原支出编号');
    assert.equal(resolve(SKILL_BILL_CATALOG, 'en', 'skill-bill.write-scene-refund.c001'), 'Original expense ID');
    assert.equal(resolve(SKILL_BILL_CATALOG, 'en', 'skill-bill.write-scene-repay.c001'), 'Borrowing ID');
    assert.equal(resolve(SKILL_BILL_CATALOG, 'en', 'skill-bill.write-scene-reimburse-done.c001'), 'Pending reimbursement ID');
  });

  it('落点表 16 行不动：五 kind 的 zh 仍是表里那一行静态件，en 现算', () => {
    assert.equal(SCENES.length, 16);
    for (const f of FILES) {
      const row = SCENES.find((s) => s.kind === f.kind);
      assert.strictEqual(sceneFor({ key: 'bill.record.add', kind: f.kind }, 'zh'), row, f.kind + ' 的 zh 不是静态件');
      const enScene = sceneFor({ key: 'bill.record.add', kind: f.kind }, 'en');
      assert.equal(enScene.family, f.enFamily, f.kind + ' 的 en family 不对');
      assert.equal(enScene.kind, f.kind);
    }
  });

  it('全键可求值：262 键中英都非空、且不留未填占位符', () => {
    for (const f of FILES) {
      for (const k of Object.keys(SKILL_BILL_CATALOG.zh).filter((key) => key.startsWith(f.prefix))) {
        const names = [...SKILL_BILL_CATALOG.zh[k].matchAll(/\{(p\d+)\}/g)].map((x) => x[1]);
        const params = Object.fromEntries(names.map((n) => [n, SAMPLE[n]]));
        const zh = resolve(SKILL_BILL_CATALOG, 'zh', k, params);
        const en = resolve(SKILL_BILL_CATALOG, 'en', k, params);
        assert.ok(zh.length > 0, 'zh 空串：' + k);
        assert.ok(en.length > 0, 'en 空串：' + k);
        assert.ok(!/\{p\d+\}/.test(zh) && !/\{p\d+\}/.test(en), '占位符未填：' + k);
      }
    }
  });

  it('采集页是 SAY 原型（dormant 支证据）：五 kind 都出 say-page', () => {
    for (const f of FILES) {
      assert.ok(collect(f.kind, 'zh').includes('<div class="say-page">'), f.kind + ' 的采集页不是 SAY 版式');
    }
  });

  it('CLI 链路：渲染期语言上下文传到 deferred 闭包（页文件运行期文案中英各一）', () => {
    const db = mkdtempSync(join(tmpdir(), 'bill1204sp-'));
    const base = ['bill.record.add', '--params', JSON.stringify({ kind: 'borrow' })];
    const zh = cli(db, base);
    assert.equal(zh.status, 0, 'zh stderr: ' + zh.stderr);
    const en = cli(db, [...base, '--language', 'en']);
    assert.equal(en.status, 0, 'en stderr: ' + en.stderr);
    const zhPath = JSON.parse(zh.stdout).delivery.path;
    const enPath = JSON.parse(en.stdout).delivery.path;
    assert.ok(readFileSync(zhPath, 'utf8').includes('已复制 ✓'), '中文页缺中文运行期文案');
    assert.ok(readFileSync(enPath, 'utf8').includes('Copied ✓'), '英文页缺英文运行期文案');
    const bad = cli(db, [...base, '--language', 'zz']);
    assert.notEqual(bad.status, 0, '未识别语言应非 0');
  });
});
