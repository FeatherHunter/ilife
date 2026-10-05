// 票 1170 · 最小接线门禁：七目标批量 targets + 电话表 + 面板直通包络。
//
// 先构建再跑：node node_modules/typescript/bin/tsc -b packages/plugin-manager
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BATCH_PREFIX, MANAGER_TARGET_KEY, UPDATE_TARGETS, targetFor } from '../dist/update-targets.js';
import { buildBatchTargets, getBatchHost, resetBatchHostForTests, runningVersionOf } from '../dist/update-batch.js';
import { managerCallAdapter } from '../dist/update-dialog.js';
import { buildUpdatePhoneTable } from '../dist/index.js';

describe('1170 七目标表', () => {
  it('七项：总管在前 + 六单品，键稳定', () => {
    assert.equal(BATCH_PREFIX, 'life');
    assert.equal(MANAGER_TARGET_KEY, 'life-pack');
    assert.deepEqual(UPDATE_TARGETS.map((t) => t.key), ['life-pack', 'bill', 'calorie', 'memo', 'schedule', 'home', 'chef']);
    assert.equal(UPDATE_TARGETS[0].packageName, 'dsh-life-pack');
  });
  it('七前缀互异（串台铁律）', () => {
    const prefixes = UPDATE_TARGETS.map((t) => t.phonePrefix);
    assert.equal(new Set(prefixes).size, 7);
  });
  it('缺席包不在表里', () => {
    assert.equal(targetFor('dsh-not-installed'), undefined);
  });
  it('运行版本读不到回占位不抛', () => {
    assert.equal(runningVersionOf('dsh-not-installed-1170'), '0.0.0');
  });
});

describe('1170 批量宿主', () => {
  it('targets 照抄七前缀，selfKey 排最后', async () => {
    resetBatchHostForTests();
    const batch = await getBatchHost({});
    assert.equal(batch.targets.length, 7);
    assert.equal(batch.targets[batch.targets.length - 1].key, 'life-pack');
    assert.deepEqual(buildBatchTargets().map((t) => t.prefix), UPDATE_TARGETS.map((t) => t.phonePrefix));
    assert.equal(batch.phoneNames.status, 'life.batchStatus');
    assert.equal(batch.phoneNames.check, 'life.batchCheck');
  });
  it('一次登记 33 个电话：批量 5 + 七目标各 4 单电话', async () => {
    resetBatchHostForTests();
    const batch = await getBatchHost({});
    const names = Object.keys(batch.handlers);
    assert.equal(names.length, 5 + 7 * 4);
    assert.ok(names.includes('life.batchStatus'));
    assert.ok(names.includes('ilife-bill.updateStatus'));
    assert.ok(names.includes('ilife-life-pack.updateStatus'));
  });
  it('电话表：roots 照旧，未知方法回 bad-request（变异红证据）', async () => {
    const table = buildUpdatePhoneTable({});
    const roots = await table.call('ilife-manager.roots', {});
    assert.equal(roots.ok, true);
    const bad = await table.call('no.such.phone', {});
    assert.equal(bad.ok, false);
    assert.equal(bad.error.code, 'bad-request');
  });
});

describe('1170 面板直通包络', () => {
  it('上游回包原样透传（含失败 errorKind 与 diag）', async () => {
    const raw = { ok: false, error: 'install-failed', errorKind: 'install-failed', diag: { route: 'cli' } };
    const call = managerCallAdapter(async () => ({ ok: true, value: raw }));
    assert.equal(await call('life.batchStatus', {}), raw);
  });
  it('宿主级失败转上游失败形（errorKind 同码）', async () => {
    const call = managerCallAdapter(async () => ({ ok: false, error: { code: 'bad-request', message: 'x', details: {} } }));
    assert.deepEqual(await call('nope', {}), { ok: false, error: 'bad-request', errorKind: 'bad-request' });
  });
  it('连接缺席与传输抛错回 manager-unreachable', async () => {
    assert.deepEqual(await managerCallAdapter(null)('life.batchStatus', {}), { ok: false, error: 'manager-unreachable', errorKind: 'manager-unreachable' });
    const throwing = managerCallAdapter(async () => { throw new Error('down'); });
    assert.deepEqual(await throwing('life.batchStatus', {}), { ok: false, error: 'manager-unreachable', errorKind: 'manager-unreachable' });
  });
});
