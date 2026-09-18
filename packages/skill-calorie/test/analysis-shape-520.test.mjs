/** #517 · 场景 10 样板页的形状判据（`calorie.view.deficit`＝「21-查热量缺口」／「22-看热量缺口」
 *  同一产物的两个别名，见 `src/analysis/routes.ts:173,176`）。
 *
 * 本件量的是**形状**（基准件 `t516-场景10-视觉整改基准.md` §一 的 J2／J8／J9 与 §三 的六种形状），
 * 取数、字段与口径另由 `analysis-deficit-385.test.mjs` 守着——两件不重复断言同一件事。
 * 用合成数据直调装配件（不依赖 CLI／库／盘），每条断言对着一处**可源码级改坏**的形状：
 *   ① 三条恒出（页内导航／口径说明行／来源脚注） ② 页内导航与区块 id 双向自洽
 *   ③ 结论条只用页里已有的数 ④ 徽章列／状态徽章／堆叠条接上 ⑤ 可见文本零并列分隔符
 *   ⑥ 宽屏页宽由包内既有页面壳件给（本票「宽屏余量」裁定 (a)）
 *
 * 运行：先 pnpm build（或 node node_modules/typescript/bin/tsc -b），再 node packages/skill-calorie/test/analysis-shape-520.test.mjs
 */
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { buildDeficitDoc } from '../dist/render/trendDocs.js';
import { assertDocPage } from './doc-page-assert.mjs';
import { configTestBase } from './helpers/config-test.mjs';

// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
process.env.ILIFE_CONFIG_DIR = configTestBase();

const TARGET_DEF = 300;

/** 合成数据：四天，三态（达标／偏低／超量）各出得来，目标缺口 = TARGET_DEF。 */
function sample() {
  return {
    summary: {
      avgIntake: 433, avgBurn: 600, avgExerciseBurn: 100, avgDeficit: 167,
      weeklyDeficit: 500, predictedLossKg: 0.06, trend: 'loss',
    },
    target: { intake: 1800, tdee: 500, weeklyDeficitPerDay: TARGET_DEF },
    series: [
      { date: '2026-09-01', intake: 200, burn: 600, deficit: 400, weekday: '周二' },
      { date: '2026-09-02', intake: 450, burn: 600, deficit: 150, weekday: '周三' },
      { date: '2026-09-03', intake: 650, burn: 600, deficit: -50, weekday: '周四' },
      { date: '2026-09-04', intake: 300, burn: 600, deficit: 350, weekday: '周五' },
    ],
    meta: { start: '2026-09-01', end: '2026-09-04', days: 4, weekdayCount: 3, weekendCount: 1 },
  };
}

const html = buildDeficitDoc(sample());
/** 形状计数一律在**剥掉样式段与脚本段**的 DOM 串上做：类名在 CSS 里也出现（`.ilife-block-toc{…}`），
 *  在整串上数是数不准的（数出来的是「样式声明 ＋ 元素」的混合，改坏了也可能照样 ≥1）。 */
const dom = html.replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ');
const count = (needle) => dom.split(needle).length - 1;

/** 可见文本（口径与 `scripts/audit-separators.mjs` 同源：剥样式段／脚本段／注释／全部标签）。 */
function visible(text) {
  return text.replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ').replace(/<[^>]*>/g, ' ');
}

test('#517 ① 三条恒出：页内导航 ＋ 口径说明行 ＋ 来源脚注（J9）', () => {
  assertDocPage(html, 'buildDeficitDoc(形状)');
  assert.ok(count('ilife-block-toc') >= 1, '缺页内导航（ilife-block-toc）');
  assert.ok(count('ilife-block-caliber') >= 2, '口径说明行／来源脚注都走 ilife-block-caliber，至少两条');
  assert.ok(visible(html).includes('📊 数据来源：'), '缺来源脚注那一行');
  assert.equal(count('ilife-block-conclusion'), 1, '结论条应恰好一条（`renderConclusionBar`）');
});

test('#517 ② 页内导航与区块 id 双向自洽（J8：多一个孤儿锚点即红）', () => {
  const hrefs = [...html.matchAll(/<a href="#([^"]+)">([^<]*)<\/a>/g)].map((m) => m[1]);
  const ids = [...html.matchAll(/<section id="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(hrefs.length >= 2, '导航项至少 2 项，实得 ' + hrefs.length);
  assert.deepEqual([...hrefs].sort(), [...ids].sort(), '导航 href 与区块 id 必须一一对应（双向，不许有孤儿）');
  assert.equal(new Set(hrefs).size, hrefs.length, '导航项 id 不许重复');
});

test('#517 ③ 结论条只用页里已有的数，且不吃新增口径', () => {
  const text = (html.match(/ilife-block-conclusion">([^<]*)</) || [])[1] || '';
  assert.ok(text.length > 0, '结论条是空的');
  for (const needle of ['+167', '+500', '0.06']) {
    assert.ok(text.includes(needle), '结论句少了页里已有的数 ' + needle + '：' + text);
  }
  // 这三个数各自还有别的落点（KPI 卡）⇒ 结论句没有引入页里没有的读数
  assert.ok(dom.includes('>+167<'), '页里没有日均缺口 +167 的其它落点，结论句等于新算了一个数');
  assert.ok(dom.includes('周缺口 500 卡'), '页里没有周缺口 500 的其它落点（理论减重卡详情）');
  assert.ok(dom.includes('>0.06<'), '页里没有理论减重 0.06 的其它落点');
});

test('#517 ④ 形状件接上：徽章列／状态徽章／堆叠条／键值行（J2）', () => {
  const chips = [...html.matchAll(/ilife-block-chip">([^<]*)</g)].map((m) => m[1]);
  for (const needle of ['卡路里', '热量缺口', '趋势分析']) {
    assert.ok(chips.includes(needle), '页头胶囊缺 ' + needle + '：' + chips.join('|'));
  }
  // 状态维度改走徽章列（票面 ⑤）：三态各一天，零天的那态也印出来
  for (const needle of ['达标 2 天', '偏低 1 天', '超量 1 天']) {
    assert.ok(chips.includes(needle), '状态徽章缺 ' + needle + '：' + chips.join('|'));
  }
  // 状态徽章（`renderKpiCard` 的 status 槽，闭集 STATUS_KINDS）
  const badge = (dom.match(/ilife-status-badge[^"]*"[^>]*>([^<]*)</) || [])[1];
  assert.ok(['达标', '偏低', '超量'].includes(badge), '日均缺口卡应挂状态徽章，实得：' + badge);
  // 消耗构成改走堆叠条（票面 ⑥）
  const dist = [...dom.matchAll(/dist-row-name">([^<]*)</g)].map((m) => m[1]);
  assert.deepEqual(dist, ['日常消耗', '运动'], '日均消耗的加法分解应落两条分布条');
  assert.equal([...dom.matchAll(/dist-row-fill"/g)].length, 2, '分布条应各有填充段');
  // 明细表：五列（目标列已上浮）、列表行三行
  assert.deepEqual([...dom.matchAll(/<th scope="col"[^>]*>([^<]*)</g)].map((m) => m[1]),
    ['日期', '摄入', '消耗', '缺口', '状态'], '明细表列头');
  assert.ok(!dom.includes('>目标</th>'), '目标列不该再占一列');
  assert.equal([...dom.matchAll(/ilife-block-list-rows-row"/g)].length, 3, '合计三行');
});

test('#517 ⑤ 可见文本零并列分隔符（J1 的页内影子）', () => {
  const vis = visible(html);
  for (const ch of ['·', '；', '~', '｜', '、']) {
    assert.ok(!vis.includes(ch), '可见文本里出现并列分隔符「' + ch + '」');
  }
  // 口径行的段间竖线只活在版式里：产物文本里没有该字符，但有逐段 span
  assert.ok(count('ilife-block-caliber">') >= 2, '口径行没产出');
  assert.ok(/ilife-block-caliber">\s*<span>/.test(html), '口径行的分段没落成 span（分隔应由版式承担）');
});

test('#517 ⑥ 页头三件：head 标题／眉标／H1 与宽屏页宽（宽屏余量裁定 (a)）', () => {
  assert.ok(html.includes('<title>卡路里 热量缺口</title>'), 'head 标题应两段不拿「·」串');
  const eyebrow = (html.match(/page-shell-eyebrow">([^<]*)</) || [])[1];
  assert.equal(eyebrow, '趋势分析', '眉标只写一个归属词（D02）');
  const h1 = (html.match(/page-shell-title">([^<]*)</) || [])[1];
  assert.equal(h1, '热量缺口 2026-09-01 至 2026-09-04', 'H1 的区间写「至」（R6），且不带归属词');
  // 宽屏余量的裁定 (a)：加宽内容列，走**包内既有**页面壳件 `pageChromeCss(1120)`（不新增公共层件）
  assert.ok(html.includes('.ilife-block-page-shell{box-sizing:border-box;max-width:1120px'), '页面壳宽度没走 pageChromeCss(1120)');
});

test('#517 ⑦ 零序列兜底：导航项跟着少一项，不留孤儿锚点', () => {
  const empty = { ...sample(), series: [] };
  const h = buildDeficitDoc(empty);
  assertDocPage(h, 'buildDeficitDoc(零序列)');
  const hrefs = [...h.matchAll(/<a href="#([^"]+)">[^<]*<\/a>/g)].map((m) => m[1]);
  const ids = [...h.matchAll(/<section id="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual([...hrefs].sort(), [...ids].sort(), '零序列时导航 href 与区块 id 仍须一一对应');
  assert.ok(!hrefs.includes('sec-chart'), '零序列不该有图区块的导航项');
  assert.ok(h.includes('ilife-empty'), '零序列的明细表应走空态块');
});
