// 票 #1238 自证回路：翻页口径（夹取＋页码直达）住口径源头，与 planManual 同一处。
// 读编译产物（tsc -b 之后再跑）。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
const { clampSpread, spreadOfPage } = await import('../dist/manual-plan.js');

const scenes = (n) =>
  Array.from({ length: n }, (_, i) => ({ key: 's' + (i + 1), title: '场景' + (i + 1), state: 'written' }));

describe('#1238 翻页口径', () => {
  it('越界跨页被夹到首末（5 页 3 跨页）', () => {
    assert.equal(clampSpread(scenes(5), -1), 0);
    assert.equal(clampSpread(scenes(5), 0), 0);
    assert.equal(clampSpread(scenes(5), 2), 2);
    assert.equal(clampSpread(scenes(5), 9), 2);
  });

  it('空书恒看第 0 跨页', () => {
    assert.equal(clampSpread([], 5), 0);
    assert.equal(spreadOfPage([], 3), 0);
  });

  it('页码直达跨页（5 页：1/2→0，3/4→1，5→2；越界页码先夹）', () => {
    assert.equal(spreadOfPage(scenes(5), 1), 0);
    assert.equal(spreadOfPage(scenes(5), 2), 0);
    assert.equal(spreadOfPage(scenes(5), 3), 1);
    assert.equal(spreadOfPage(scenes(5), 4), 1);
    assert.equal(spreadOfPage(scenes(5), 5), 2);
    assert.equal(spreadOfPage(scenes(5), 0), 0);
    assert.equal(spreadOfPage(scenes(5), 99), 2);
  });
});
