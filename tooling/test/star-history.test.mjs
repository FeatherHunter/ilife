// 票 #12 自证：星标历史的「聚合 → 补零 → 绘图」三步不许悄悄改口径。
//
// 咬三处：
//   ① 聚合只按 UTC 日分组、忽略坏时间戳、total 是累计值；
//   ② 零星日补零幂等（首行已是 0 就不重复补），空输入保持空；
//   ③ 绘图是确定性的（同输入同字节），且仓库里提交的两张 SVG 就是当前数据画出来的——
//      数据改了忘记重画 SVG 会在这里变红（等于给 docs 产物加一道门禁）。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { aggregateByDay, withZeroStart } from '../star-history.mjs';
import { buildSvg, monotonePath } from '../generate-star-history-svg.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const DATA = JSON.parse(fs.readFileSync(join(ROOT, 'docs', 'star-history.json'), 'utf8'));

describe('票 #12 星标历史数据与图表', () => {
  it('按 UTC 日聚合成累计曲线，坏时间戳跳过', () => {
    const days = aggregateByDay([
      '2026-09-06T14:43:53Z',
      '2026-09-06T23:59:59Z',
      '2026-09-07T00:00:00Z',
      'not-a-date',
      '',
    ]);
    assert.deepEqual(days, [
      { date: '2026-09-06', total: 2, daily: 2 },
      { date: '2026-09-07', total: 3, daily: 1 },
    ]);
    assert.deepEqual(aggregateByDay([]), []);
    assert.deepEqual(aggregateByDay(undefined), []);
  });

  it('零星日补零：首日前一天补一行 0，幂等，空数组保持空', () => {
    const days = aggregateByDay(['2026-09-06T14:43:53Z', '2026-09-08T01:00:00Z']);
    const zeroed = withZeroStart(days);
    assert.deepEqual(zeroed[0], { date: '2026-09-05', total: 0, daily: 0 });
    assert.deepEqual(withZeroStart(zeroed), zeroed, '补零须幂等');
    assert.deepEqual(withZeroStart([]), []);
  });

  it('绘图确定性：同输入同字节，深浅主题不同，曲线不含 NaN', () => {
    const dark = buildSvg(DATA, 'dark');
    assert.equal(buildSvg(DATA, 'dark'), dark, '同输入必须逐字节相同（否则每日 Action 会噪声提交）');
    const light = buildSvg(DATA, 'light');
    assert.notEqual(light, dark, '深浅两套主题应是不同 SVG');
    assert.ok(dark.includes('<svg') && dark.includes('Star History'), 'SVG 结构缺失');
    assert.ok(!dark.includes('NaN'), 'SVG 里出现 NaN');
    assert.ok(monotonePath([[0, 0], [10, 5], [20, 10]]).startsWith('M '), '单调插值须输出路径');
  });

  it('提交的两张 SVG 与 docs/star-history.json 一致（改数据必须重画）', () => {
    assert.equal(
      fs.readFileSync(join(ROOT, 'docs', 'star-history-dark.svg'), 'utf8'),
      buildSvg(DATA, 'dark'),
      'docs/star-history-dark.svg 与数据不一致：跑 node tooling/generate-star-history-svg.mjs',
    );
    assert.equal(
      fs.readFileSync(join(ROOT, 'docs', 'star-history-light.svg'), 'utf8'),
      buildSvg(DATA, 'light'),
      'docs/star-history-light.svg 与数据不一致：跑 node tooling/generate-star-history-svg.mjs',
    );
  });

  it('数据自洽：日期升序、daily 累加等于最后一天 total', () => {
    let running = 0;
    let prev = '';
    for (const row of DATA) {
      assert.match(row.date, /^\d{4}-\d{2}-\d{2}$/, '日期格式必须是 YYYY-MM-DD');
      assert.ok(row.date > prev, '日期必须严格升序：' + row.date);
      assert.ok(Number.isInteger(row.daily) && row.daily >= 0, 'daily 必须是非负整数：' + row.date);
      running += row.daily;
      assert.equal(row.total, running, 'total 必须是累计值：' + row.date);
      prev = row.date;
    }
    assert.ok(DATA.length >= 2, '至少要有零星行与一天真实数据');
    assert.equal(DATA[0].total, 0, '首行须是零星起点');
  });
});
