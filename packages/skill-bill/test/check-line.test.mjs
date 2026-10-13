import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CHECK_ID_HEAD, CHECK_ID_LIMIT, checkIdText } from '../dist/query/checkLine.js';

// #1269／#1279：对账行编号段口径（用户 2026-10-13 裁定「甲」：小集逐号列全，大集只列前几个＋写总个数）。
describe('对账行编号段 checkIdText', () => {
  it('空集回空串（零行由各页自己写「共 0 笔」）', () => {
    assert.equal(checkIdText([]), '');
  });

  it('小集（≤20）逐号列全，顿号分隔', () => {
    assert.equal(checkIdText([6991, 6992]), '6991、6992');
    assert.equal(checkIdText(['7', '8', '9']), '7、8、9');
    const twenty = Array.from({ length: CHECK_ID_LIMIT }, (_, i) => i + 1);
    assert.equal(checkIdText(twenty).split('、').length, CHECK_ID_LIMIT);
    assert.ok(!checkIdText(twenty).includes('等'));
  });

  it('过界（21 起）只列前 8 个＋「等 N 个」', () => {
    const twentyOne = Array.from({ length: CHECK_ID_LIMIT + 1 }, (_, i) => i + 1);
    const text = checkIdText(twentyOne);
    assert.equal(text.split('、').length, CHECK_ID_HEAD);
    assert.ok(text.endsWith(' 等 21 个'));
  });

  it('4175 条时编号段只有两百来字节（改前是 28,683 字节的一行数字墙）', () => {
    const many = Array.from({ length: 4175 }, (_, i) => 7000 + i);
    const text = checkIdText(many);
    assert.equal(text.split('、').length, CHECK_ID_HEAD);
    assert.ok(text.endsWith(' 等 4175 个'));
    assert.ok(Buffer.byteLength(text, 'utf8') < 100);
  });
});
