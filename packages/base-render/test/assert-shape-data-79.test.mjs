// #79 R-8（红 S3-②／G-4）· `assertShapeData` 首条直测（正例＋反例）。
//
// 背景：此前 `assertShapeData` 在全仓测试面零命中（仅 src 内被 createEnvelope／parseEnvelope 间接调用），
// 交付报告表 A 第 3 行仍判「有」（口径：sibling 覆盖即锁住）。本文件把它直测钉死，落进 `pnpm test` glob。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { assertShapeData } from 'base-link-core';

describe('#79 assertShapeData 直测（正例＋反例）', () => {
  it('正例：6 形状合法 data 全不抛', () => {
    assert.doesNotThrow(() => assertShapeData('list', { items: [], total: 0 }));
    assert.doesNotThrow(() => assertShapeData('detail', { item: { id: 'x' } }));
    assert.doesNotThrow(() => assertShapeData('stat', { metrics: { done: 3 } }));
    assert.doesNotThrow(() => assertShapeData('receipt', { ok: true, message: 'ok' }));
    assert.doesNotThrow(() => assertShapeData('analysis', { summary: 's' }));
    assert.doesNotThrow(() => assertShapeData('fallback', { reason: 'r', degraded: true }));
  });

  it('反例：缺字段／错类型即抛（不返空）', () => {
    assert.throws(() => assertShapeData('list', {}), /items/);
    assert.throws(() => assertShapeData('list', { items: [], total: 'x' }), /total/);
    assert.throws(() => assertShapeData('detail', { item: null }), /item/);
    assert.throws(() => assertShapeData('stat', { metrics: { done: 'x' } }), /metrics/);
    assert.throws(() => assertShapeData('receipt', { ok: true }), /ok\/message/);
    assert.throws(() => assertShapeData('analysis', { summary: '' }), /summary/);
    assert.throws(() => assertShapeData('fallback', { reason: 'r', degraded: false }), /degraded/);
  });
});
