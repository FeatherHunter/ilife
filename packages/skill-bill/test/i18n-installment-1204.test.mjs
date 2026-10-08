// #1204 首迁件（write/scene-installment.ts）：词条层＋语言链的接线证明。
//
// 口径 honesty（先写清楚再断言）：记分期采集页线上走 SAY 原型（`sayWords.ts`，#1203 策略件）
// ＋回执页走 `receiptPaper.ts`（本批后续件），本件迁入的 28 条里只有 word／kind／family
// 与 fallback 分支（sections／form／prompt）在本件直连；receipt.* 八字段是模板演进后
// 留下的死 spec（`template-installment.ts` 的 `receiptPage` 只透传 word／kind 给票据纸）。
// 故页级英文证明只到「链路不断、中文逐字节不变」；英文整页上屏随 SAY／票据纸迁移票。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { recordCollectDoc } from '../dist/write/collect.js';
import { SCENES, sceneFor } from '../dist/write/scene.js';
import { sceneInstallment } from '../dist/write/scene-installment.js';
import { SKILL_BILL_CATALOG } from '../dist/entries/index.js';
import { billEnv } from './helpers/config-base.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const bin = join(here, '..', 'dist', 'cli', 'cmd_read.js');

function collectZh() {
  return recordCollectDoc({
    key: 'bill.record.add',
    params: { kind: 'installment' },
    slots: [],
    missing: [],
    source: 'test',
    actionAt: '2026-09-14 12:00:00',
    today: '2026-09-14',
    recent: [],
  });
}

function cli(db, args) {
  return spawnSync(process.execPath, [bin, ...args], { cwd: here, encoding: 'utf8', env: billEnv(db) });
}

describe('#1204 记分期首迁：词条＋语言链', () => {
  it('词条 zh／en 同 key（28 条）且英文列无空串', () => {
    const zhKeys = Object.keys(SKILL_BILL_CATALOG.zh).sort();
    const enKeys = Object.keys(SKILL_BILL_CATALOG.en).sort();
    assert.deepEqual(enKeys, zhKeys);
    assert.equal(zhKeys.length, 28);
    for (const k of enKeys) assert.ok(SKILL_BILL_CATALOG.en[k].length > 0, '英文缺译：' + k);
  });

  it('工厂函数按语言取值（直连字段的抽查）：family 中英各一', () => {
    assert.equal(sceneInstallment('zh').family, '特殊收支族');
    assert.equal(sceneInstallment('en').family, 'Special income and expense');
    assert.equal(sceneInstallment().family, '特殊收支族');
  });

  it('落点表 16 行不动：默认取件仍是表里那一行静态件，en 现算', () => {
    const row = SCENES.find((s) => s.kind === 'installment');
    assert.equal(SCENES.length, 16);
    assert.strictEqual(sceneFor({ key: 'bill.record.add', kind: 'installment' }), row);
    const enScene = sceneFor({ key: 'bill.record.add', kind: 'installment' }, 'en');
    assert.equal(enScene.family, 'Special income and expense');
    assert.equal(enScene.kind, 'installment');
  });

  it('默认中文页可渲染（含分期三格中文名 tracer）', () => {
    const html = collectZh();
    assert.ok(html.includes('总额'), '中文页应有「总额」');
  });

  it('CLI 链路：--language zh／en 都 exit 0（英文页整页随 SAY／票据纸票）', () => {
    const db = mkdtempSync(join(tmpdir(), 'bill1204-'));
    const base = ['bill.record.add', '--params', JSON.stringify({ kind: 'installment' })];
    const zh = cli(db, base);
    assert.equal(zh.status, 0, 'zh stderr: ' + zh.stderr);
    const en = cli(db, [...base, '--language', 'en']);
    assert.equal(en.status, 0, 'en stderr: ' + en.stderr);
    const bad = cli(db, [...base, '--language', 'zz']);
    assert.notEqual(bad.status, 0, '未识别语言应非 0');
  });
});
