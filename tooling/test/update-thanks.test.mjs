import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  ZH_START,
  ZH_END,
  EN_START,
  EN_END,
  isSkippedLogin,
  rosesFor,
  itemsOf,
  totalOf,
  orderedLogins,
  renderRow,
  renderTable,
  applyTable,
} from '../update-thanks.mjs';

// tooling/update-thanks.mjs 的靶向测试（致谢表对齐票其一）。
// 跑法：node --test tooling/test/update-thanks.test.mjs
// 判据与 dsh-prompt scripts/check-thanks.mjs 同源，REPO 换成 ilife。

const rec = (over = {}) => ({
  issues: [],
  prs: [],
  discussions: [],
  comments: [],
  lastActive: '',
  ...over,
});

describe('rosesFor', () => {
  const cases = [
    [0, ''],
    [1, '🌹'],
    [9, '🌹🌹🌹🌹🌹🌹🌹🌹🌹'],
    [10, '💐'],
    [11, '💐🌹'],
    [100, '🏆'],
    [123, '🏆💐💐🌹🌹🌹'],
    [1000, '👑'],
    [10000, '💎'],
  ];
  for (const [total, want] of cases) {
    it('rosesFor(' + total + ')', () => {
      assert.equal(rosesFor(total), want);
    });
  }
});

describe('isSkippedLogin', () => {
  it('跳过维护者本人、ghost、机器人与空值', () => {
    assert.equal(isSkippedLogin('FeatherHunter'), true);
    assert.equal(isSkippedLogin('ghost'), true);
    assert.equal(isSkippedLogin('dependabot'), true);
    assert.equal(isSkippedLogin('github-actions[bot]'), true);
    assert.equal(isSkippedLogin(''), true);
    assert.equal(isSkippedLogin(null), true);
  });
  it('普通登录名不过滤', () => {
    assert.equal(isSkippedLogin('someone'), false);
  });
});

describe('orderedLogins', () => {
  it('总数多的在前', () => {
    const authors = {
      b: rec({ issues: [{ n: 1, at: '2026-01-01T00:00:00Z' }], lastActive: '2026-01-01T00:00:00Z' }),
      a: rec({ issues: [{ n: 1, at: '2026-01-01T00:00:00Z' }, { n: 2, at: '2026-01-02T00:00:00Z' }], lastActive: '2026-01-02T00:00:00Z' }),
    };
    assert.deepEqual(orderedLogins(authors), ['a', 'b']);
  });
  it('同分看 lastActive，晚者在前', () => {
    const authors = {
      a: rec({ issues: [{ n: 1, at: '2026-01-01T00:00:00Z' }], lastActive: '2026-01-01T00:00:00Z' }),
      b: rec({ issues: [{ n: 2, at: '2026-02-01T00:00:00Z' }], lastActive: '2026-02-01T00:00:00Z' }),
    };
    assert.deepEqual(orderedLogins(authors), ['b', 'a']);
  });
  it('总数与时间都相同按登录名字典序', () => {
    const authors = {
      b: rec({ issues: [{ n: 2, at: '2026-01-01T00:00:00Z' }], lastActive: '2026-01-01T00:00:00Z' }),
      a: rec({ issues: [{ n: 1, at: '2026-01-01T00:00:00Z' }], lastActive: '2026-01-01T00:00:00Z' }),
    };
    assert.deepEqual(orderedLogins(authors), ['a', 'b']);
  });
});

describe('renderRow/renderTable', () => {
  const authors = {
    alice: rec({ issues: [{ n: 7, at: '2026-03-02T00:00:00Z' }, { n: 3, at: '2026-03-01T00:00:00Z' }], lastActive: '2026-03-02T00:00:00Z' }),
  };
  it('行格式三列，链接按号升序', () => {
    assert.equal(
      renderRow('alice', authors.alice),
      '| [@alice](https://github.com/alice) | 🌹🌹 | [#3](https://github.com/FeatherHunter/ilife/issues/3) [#7](https://github.com/FeatherHunter/ilife/issues/7) |',
    );
  });
  it('中文表头三列，空数据只剩表头两行', () => {
    assert.equal(renderTable({}, true), '| 贡献者 | 致敬 | 贡献 |' + '\n' + '| --- | --- | --- |');
  });
  it('英文表头三列', () => {
    assert.ok(renderTable({}, false).startsWith('| Contributor | Tribute | Contributions |'));
  });
});

describe('itemsOf/totalOf', () => {
  it('总数等于四类之和', () => {
    const r = rec({
      issues: [{ n: 1, at: '2026-01-01T00:00:00Z' }],
      prs: [{ n: 2, at: '2026-01-02T00:00:00Z' }],
      discussions: [{ n: 5, at: '2026-01-03T00:00:00Z' }],
      comments: [{ n: 1, thread: 'issue', at: '2026-01-04T00:00:00Z' }],
      lastActive: '2026-01-04T00:00:00Z',
    });
    assert.equal(totalOf(r), 4);
    assert.equal(itemsOf(r).length, 4);
  });
});

describe('applyTable', () => {
  it('只换标记之间并保留前后正文', () => {
    const text = ['前言', ZH_START, '旧表', ZH_END, '后记'].join('\n');
    const r = applyTable(text, ZH_START, ZH_END, '新表');
    assert.equal(r.changed, true);
    assert.equal(r.text, ['前言', ZH_START, '新表', ZH_END, '后记'].join('\n'));
  });
  it('内容一致时 changed 为 false', () => {
    const text = ['前言', EN_START, '表', EN_END, '后记'].join('\n');
    assert.equal(applyTable(text, EN_START, EN_END, '表').changed, false);
  });
  it('找不到完整标记抛错不静默跳过', () => {
    assert.throws(() => applyTable('没有标记', ZH_START, ZH_END, '表'), /找不到完整的表格标记/);
  });
});
