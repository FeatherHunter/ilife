// 手册书排版（#1193）：场景表 → 页／跨页／纸／书签。
// 读的是编译产物（tsc -b 之后再跑），与 config-panel-*/health-* 同一套写法。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
const { planManual } = await import('../dist/manual-plan.js');

const scenes = (n, pending = 0) =>
  Array.from({ length: n }, (_, i) => ({
    key: 's' + (i + 1),
    title: '场景' + (i + 1),
    state: i < n - pending ? 'written' : 'pending',
  }));
const tabs = (plan) => plan.sheets.map((s) => s.facing + (s.side === 'left' ? 'L' : 'R') + '@' + s.tabOffset.toFixed(1));

describe('#1193 手册书排版', () => {
  it('4 个场景：4 页 / 2 跨页 / 3 张纸；静止书签 1L 2R 4R，翻完 1L 3L 4R（与定稿原型逐字一致）', () => {
    const first = planManual(scenes(4), 0);
    assert.equal(first.pageCount, 4);
    assert.equal(first.spreadCount, 2);
    assert.equal(first.sheets.length, 3);
    assert.deepEqual(tabs(first), ['1L@5.5', '2R@12.6', '4R@19.7']);
    assert.deepEqual(first.pages.map((p) => p.page + p.side), ['1left', '2right']);

    const last = planManual(scenes(4), 1);
    assert.deepEqual(tabs(last), ['1L@5.5', '3L@12.6', '4R@19.7']);
    assert.deepEqual(last.pages.map((p) => p.page + p.side), ['3left', '4right']);
  });

  it('4 个已写 + 4 个待定：8 页 / 4 跨页 / 5 张纸；待定页在末跨页上标出来', () => {
    const plan = planManual(scenes(8, 4), 3);
    assert.equal(plan.pageCount, 8);
    assert.equal(plan.spreadCount, 4);
    assert.equal(plan.sheets.length, 5);
    assert.deepEqual(plan.pages.map((p) => p.page + ':' + p.state), ['7:pending', '8:pending']);
    assert.deepEqual(tabs(plan), ['1L@5.5', '3L@12.6', '5L@19.7', '7L@26.8', '8R@33.9']);
  });

  it('8 个已写 + 2 个待定：10 页 / 5 跨页 / 6 张纸', () => {
    const plan = planManual(scenes(10, 2), 0);
    assert.equal(plan.pageCount, 10);
    assert.equal(plan.spreadCount, 5);
    assert.equal(plan.sheets.length, 6);
    assert.deepEqual(tabs(plan), ['1L@5.5', '2R@12.6', '4R@19.7', '6R@26.8', '8R@33.9', '10R@41.0']);
  });

  it('奇数页：3 个场景 → 3 页 / 2 跨页 / 2 张纸，最后一跨页只有一页', () => {
    const plan = planManual(scenes(3), 1);
    assert.equal(plan.spreadCount, 2);
    assert.equal(plan.sheets.length, 2);
    assert.deepEqual(plan.pages.map((p) => p.page), [3]);
    assert.deepEqual(tabs(plan), ['1L@5.5', '3L@12.6']);
  });

  it('退化情形：0 个场景 = 一跨页空书；1 个场景 = 1 页 1 张纸', () => {
    const none = planManual([], 0);
    assert.equal(none.pageCount, 0);
    assert.equal(none.spreadCount, 1);
    assert.equal(none.sheets.length, 0);
    assert.deepEqual(none.pages, []);

    const one = planManual(scenes(1), 0);
    assert.equal(one.sheets.length, 1);
    assert.deepEqual(tabs(one), ['1L@5.5']);
  });

  it('书签随纸数等比收窄：≤6 张纸仍是 5.9%，7 张起变小，24 页仍在 3% 上限内', () => {
    const at6 = planManual(scenes(10), 0); // 6 张纸
    assert.equal(at6.tab.width.toFixed(2), '5.90');
    assert.equal(at6.tab.overflow, false);

    const at7 = planManual(scenes(12), 0); // 7 张纸
    assert.equal(at7.tab.width.toFixed(2), '5.35');
    assert.ok(at7.tab.height < 5.4);

    const at12 = planManual(scenes(22), 0); // 12 张纸：收窄后刚好还在 3% 上限内
    assert.equal(at12.tab.width.toFixed(2), '3.23');
    assert.equal(at12.tab.overflow, false);

    const at13 = planManual(scenes(24), 0); // 13 张纸：算出来 2.99%，跌破下限，标记出来
    assert.equal(at13.tab.width.toFixed(2), '2.99');
    assert.equal(at13.tab.overflow, true);
  });

  it('最外那枚书签永远停在中缝到纸边的 49% 以内（缩到下限之前）', () => {
    for (const n of [4, 6, 8, 10, 12, 16, 20, 24]) {
      const plan = planManual(scenes(n), 0);
      const outermost = plan.sheets[plan.sheets.length - 1];
      assert.ok(outermost.tabOffset + plan.tab.width <= 49.0001, n + ' 页时最外缘 ' + (outermost.tabOffset + plan.tab.width).toFixed(2));
    }
  });

  it('越界的跨页号被夹住，不会算出空页', () => {
    assert.equal(planManual(scenes(4), 9).spread, 1);
    assert.equal(planManual(scenes(4), -3).spread, 0);
    assert.deepEqual(planManual(scenes(4), 9).pages.map((p) => p.page), [3, 4]);
  });
});
