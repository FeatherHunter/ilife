/** #893 字号下限用例：**正文类 ≥12px**（PAGE_LIMITS.textMinPx）——390 档窄屏也不许压到 11。
 *
 *  运行：先 `node node_modules/typescript/bin/tsc -b packages/skill-schedule --force`（用例读 `dist/**`），
 *  再 `node --test --test-concurrency=1 packages/skill-schedule/test/t893-字号下限.test.mjs`。
 *
 *  测的是**样式产出里的字号字面量**（`analyzePartsCss()`／`pagePartsCss()` 拼出的 `font-size: Npx`）：
 *  分析域那一族（差异标签／差异读数／雷达轴名／红黄框徽标）走 `FS_TINY` 一处常量，热力矩阵那一族
 *  （行首日期／行尾合计）走基线 12px、窄屏覆盖不许压回 11px。
 *  `.heat-ticks`（小时刻度 11px）不在判据里：判分引擎的 `minFontPxNoSvg` 只看正文类，本件如实放行、
 *  不顺带改它（#893 票面已登记）。
 *
 *  「改坏必红」：把 `FS_TINY` 改回 11 → 分析域那一条红；把窄屏覆盖加回
 *  `.heat-day, .heat-sum { font-size: 11px; }` → 热力矩阵那一条红。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { analyzePartsCss } from '../dist/analyze/analyzeParts.js';
import { pagePartsCss } from '../dist/shared/pageParts.js';

/** 文本里全部 `font-size: Npx`（含 SVG 的 `fill` 旁写法：`font-size: 12px` 同形）。 */
function fontSizesOf(css) {
  return [...css.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)].map((m) => Number(m[1]));
}

describe('#893 正文类字号下限 12px（窄屏同限）', () => {
  it('分析域族级件：全部字号 ≥12（FS_TINY 一处常量管 4 处选择器）', () => {
    const css = analyzePartsCss();
    assert.ok(!/font-size:\s*11px/.test(css), '样式里不许再出现 11px（差异标签／读数／雷达轴名／框徽标都在此限）');
    for (const n of fontSizesOf(css)) {
      assert.ok(n >= 12, '分析域字号 ' + n + 'px < 下限 12px');
    }
  });

  it('热力矩阵：行首日期与行尾合计在基线与窄屏两档都 ≥12', () => {
    const css = pagePartsCss();
    assert.ok(/\.heat-day \{[^}]*font-size: 12px/.test(css), '基线 .heat-day 须是 12px');
    assert.ok(/\.heat-sum \{[^}]*font-size: 12px/.test(css), '基线 .heat-sum 须是 12px');
    assert.ok(!/\.heat-day,\s*\.heat-sum\s*\{\s*font-size:\s*11px/.test(css),
      '窄屏覆盖不许把 heat-day／heat-sum 压回 11px（#893：删掉该覆盖、继承基线 12px）');
  });

  it('放行登记：全串里 <12 的字号只许是 .heat-ticks（小时刻度，非正文类）', () => {
    const css = pagePartsCss();
    const smallLines = css.split('\n').filter((line) => {
      const m = line.match(/font-size:\s*(\d+(?:\.\d+)?)px/);
      return m !== null && Number(m[1]) < 12;
    });
    assert.ok(smallLines.length > 0, '须有一条已知的例外行（否则本断言恒真）');
    for (const line of smallLines) {
      assert.ok(line.includes('.heat-ticks'), '小于 12px 的字号只许出现在 .heat-ticks 行，实得：' + line.trim());
    }
  });
});
